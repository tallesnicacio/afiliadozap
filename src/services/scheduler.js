const cron = require('node-cron');
const { getDb } = require('../db/database');
const { gerarCopy } = require('./openai');
const { sendOferta } = require('./evolution');
const { randomDelay } = require('../utils/delay');
const config = require('../config');
const logger = require('../utils/logger');

const DIAS_MAP = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 0 };

let rodando = false;

function getDiaAtual() {
  return new Date().getDay(); // 0=dom, 1=seg...
}

function getHoraAtual() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function dentroFaixaHorario(db) {
  const faixas = db.prepare('SELECT * FROM config_horarios WHERE ativo = 1').all();
  const horaAtual = getHoraAtual();
  return faixas.some(f => horaAtual >= f.hora_inicio && horaAtual <= f.hora_fim);
}

function contarEnviosUltimaHora(db, grupo_id) {
  const resultado = db.prepare(`
    SELECT COUNT(*) as total FROM logs_envio
    WHERE grupo_id = ? AND status = 'enviado'
    AND enviado_em >= datetime('now', '-1 hour', 'localtime')
  `).get(grupo_id);
  return resultado.total;
}

function registrarLog(db, { oferta_id, grupo_id, grupo_nome, status, mensagem, erro }) {
  db.prepare(`
    INSERT INTO logs_envio (oferta_id, grupo_id, grupo_nome, status, mensagem, erro)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(oferta_id ?? null, grupo_id ?? null, grupo_nome ?? null, status, mensagem ?? null, erro ?? null);
}

async function processarAgendamento(db, agendamento) {
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(agendamento.oferta_id);
  const grupo  = db.prepare('SELECT * FROM grupos WHERE id = ?').get(agendamento.grupo_id);

  if (!oferta || !grupo) {
    logger.warn('Agendamento com oferta ou grupo inválido', { id: agendamento.id });
    return;
  }

  if (!grupo.ativo) {
    logger.info('Grupo inativo, pulando', { grupo: grupo.nome });
    return;
  }

  // Verifica limite de mensagens por hora
  const enviosUltimaHora = contarEnviosUltimaHora(db, grupo.id);
  if (enviosUltimaHora >= config.antiban.maxMsgsPerHour) {
    logger.warn('Limite de mensagens/hora atingido', { grupo: grupo.nome, envios: enviosUltimaHora });
    registrarLog(db, {
      oferta_id: oferta.id, grupo_id: grupo.id, grupo_nome: grupo.nome,
      status: 'pulado', mensagem: `Limite de ${config.antiban.maxMsgsPerHour} msgs/hora atingido`,
    });
    return;
  }

  // Gera ou recupera copy do cache
  let copy = oferta.copy_gerada;
  if (!copy) {
    try {
      copy = await gerarCopy(oferta);
      db.prepare(`UPDATE ofertas_cache SET copy_gerada = ?, atualizado_em = datetime('now','localtime') WHERE id = ?`)
        .run(copy, oferta.id);
    } catch (err) {
      logger.error('Erro ao gerar copy', { produto: oferta.nome_produto, err: err.message });
      registrarLog(db, {
        oferta_id: oferta.id, grupo_id: grupo.id, grupo_nome: grupo.nome,
        status: 'erro', erro: `Falha ao gerar copy: ${err.message}`,
      });
      return;
    }
  }

  // Envia via Evolution API
  try {
    logger.info('Enviando oferta', { produto: oferta.nome_produto, grupo: grupo.nome });
    await sendOferta(grupo, oferta, copy);

    db.prepare(`UPDATE agendamentos SET status = 'enviado', enviado_em = datetime('now','localtime') WHERE id = ?`)
      .run(agendamento.id);

    registrarLog(db, {
      oferta_id: oferta.id, grupo_id: grupo.id, grupo_nome: grupo.nome,
      status: 'enviado', mensagem: copy,
    });

    logger.info('Enviado com sucesso', { produto: oferta.nome_produto, grupo: grupo.nome });
  } catch (err) {
    logger.error('Erro ao enviar', { grupo: grupo.nome, err: err.message });
    db.prepare(`UPDATE agendamentos SET status = 'erro' WHERE id = ?`).run(agendamento.id);
    registrarLog(db, {
      oferta_id: oferta.id, grupo_id: grupo.id, grupo_nome: grupo.nome,
      status: 'erro', erro: err.message,
    });
  }
}

async function verificarAgendamentos() {
  if (rodando) return; // evita sobreposição de execuções
  rodando = true;

  const db = getDb();

  try {
    if (!dentroFaixaHorario(db)) return;

    const horaAtual  = getHoraAtual();
    const diaAtual   = getDiaAtual();

    // Busca agendamentos pendentes para o horário atual
    const agendamentos = db.prepare(`
      SELECT * FROM agendamentos
      WHERE status = 'pendente' AND horario = ?
    `).all(horaAtual);

    if (agendamentos.length === 0) return;

    // Filtra pelo dia da semana
    const agendamentosDoDia = agendamentos.filter(a => {
      const dias = a.dias_semana.split(',').map(d => DIAS_MAP[d.trim()]);
      return dias.includes(diaAtual);
    });

    if (agendamentosDoDia.length === 0) return;

    logger.info(`Scheduler: ${agendamentosDoDia.length} agendamento(s) para ${horaAtual}`);

    for (const agendamento of agendamentosDoDia) {
      await processarAgendamento(db, agendamento);

      // Anti-ban: delay entre cada envio
      if (agendamentosDoDia.indexOf(agendamento) < agendamentosDoDia.length - 1) {
        const delay = Math.floor(Math.random() * (config.antiban.maxDelayMs - config.antiban.minDelayMs)) + config.antiban.minDelayMs;
        logger.info(`Anti-ban: aguardando ${(delay / 1000).toFixed(0)}s antes do próximo envio`);
        await randomDelay();
      }
    }
  } catch (err) {
    logger.error('Erro no scheduler', { err: err.message });
  } finally {
    rodando = false;
  }
}

function iniciarScheduler() {
  // Roda a cada minuto
  cron.schedule('* * * * *', verificarAgendamentos);
  logger.info('Scheduler iniciado (verifica a cada minuto)');
}

module.exports = { iniciarScheduler, verificarAgendamentos, processarAgendamento };
