const cron = require('node-cron');
const { getDb } = require('../db/database');
const { gerarCopy } = require('./openai');
const { sendOferta, ensureConnected } = require('./evolution');
const { randomDelay } = require('../utils/delay');
const config = require('../config');
const logger = require('../utils/logger');

const DIAS_MAP = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, dom: 0 };

let rodando = false;

function getHoraAtual() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getDiaAtual() {
  return new Date().getDay();
}

function getDataHoje() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function dentroFaixaHorario(db) {
  const faixas = db.prepare('SELECT * FROM config_horarios WHERE ativo = 1').all();
  const hora = getHoraAtual();
  return faixas.some(f => hora >= f.hora_inicio && hora <= f.hora_fim);
}

function foiEnviadoHoje(db, agendamento_id, grupo_id) {
  const hoje = getDataHoje();
  const result = db.prepare(`
    SELECT COUNT(*) as total FROM logs_envio
    WHERE grupo_id = ? AND status = 'enviado'
    AND date(enviado_em) = ?
    AND mensagem LIKE '%agendamento_id:' || ?
  `).get(grupo_id, hoje, agendamento_id);

  // Fallback simples: checa por oferta_id + grupo_id hoje
  if (result.total === 0) {
    const ag = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(agendamento_id);
    const r2 = db.prepare(`
      SELECT COUNT(*) as total FROM logs_envio
      WHERE oferta_id = ? AND grupo_id = ? AND status = 'enviado'
      AND date(enviado_em) = ?
    `).get(ag?.oferta_id, grupo_id, hoje);
    return r2.total > 0;
  }
  return result.total > 0;
}

function contarEnviosUltimaHora(db, grupo_id) {
  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM logs_envio
    WHERE grupo_id = ? AND status = 'enviado'
    AND enviado_em >= datetime('now', '-1 hour', 'localtime')
  `).get(grupo_id);
  return total;
}

function registrarLog(db, { agendamento_id, oferta_id, grupo_id, grupo_nome, status, mensagem, erro }) {
  db.prepare(`
    INSERT INTO logs_envio (oferta_id, grupo_id, grupo_nome, status, mensagem, erro)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    oferta_id ?? null,
    grupo_id ?? null,
    grupo_nome ?? null,
    status,
    mensagem ? `${mensagem}\nagendamento_id:${agendamento_id}` : null,
    erro ?? null
  );
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

  // Verifica limite msgs/hora
  const enviosUltimaHora = contarEnviosUltimaHora(db, grupo.id);
  if (enviosUltimaHora >= config.antiban.maxMsgsPerHour) {
    logger.warn('Limite msgs/hora atingido', { grupo: grupo.nome, envios: enviosUltimaHora });
    return;
  }

  // Gera ou usa copy em cache
  let copy = oferta.copy_gerada;
  if (!copy) {
    try {
      copy = await gerarCopy(oferta);
      db.prepare(`UPDATE ofertas_cache SET copy_gerada = ?, atualizado_em = datetime('now','localtime') WHERE id = ?`)
        .run(copy, oferta.id);
    } catch (err) {
      logger.error('Erro ao gerar copy', { produto: oferta.nome_produto, err: err.message });
      registrarLog(db, {
        agendamento_id: agendamento.id, oferta_id: oferta.id,
        grupo_id: grupo.id, grupo_nome: grupo.nome,
        status: 'erro', erro: `Falha ao gerar copy: ${err.message}`,
      });
      return;
    }
  }

  // Envia
  try {
    logger.info('Enviando oferta', { produto: oferta.nome_produto, grupo: grupo.nome });
    await sendOferta(grupo, oferta, copy);

    // Agendamentos recorrentes: mantém status 'pendente', controla por log
    db.prepare(`UPDATE agendamentos SET enviado_em = datetime('now','localtime') WHERE id = ?`)
      .run(agendamento.id);

    registrarLog(db, {
      agendamento_id: agendamento.id, oferta_id: oferta.id,
      grupo_id: grupo.id, grupo_nome: grupo.nome,
      status: 'enviado', mensagem: copy,
    });

    logger.info('Enviado com sucesso', { produto: oferta.nome_produto, grupo: grupo.nome });
  } catch (err) {
    logger.error('Erro ao enviar', { grupo: grupo.nome, err: err.message });
    registrarLog(db, {
      agendamento_id: agendamento.id, oferta_id: oferta.id,
      grupo_id: grupo.id, grupo_nome: grupo.nome,
      status: 'erro', erro: err.message,
    });
  }
}

async function verificarAgendamentos() {
  if (rodando) return;
  rodando = true;

  const db = getDb();
  try {
    if (!dentroFaixaHorario(db)) return;

    const horaAtual = getHoraAtual();
    const diaAtual  = getDiaAtual();

    const agendamentos = db.prepare(`
      SELECT * FROM agendamentos WHERE horario = ?
    `).all(horaAtual);

    if (agendamentos.length === 0) return;

    // Filtra pelo dia da semana e se já foi enviado hoje
    const pendentes = agendamentos.filter(a => {
      const dias = a.dias_semana.split(',').map(d => DIAS_MAP[d.trim()]);
      if (!dias.includes(diaAtual)) return false;
      if (foiEnviadoHoje(db, a.id, a.grupo_id)) return false;
      return true;
    });

    if (pendentes.length === 0) return;

    logger.info(`Scheduler: ${pendentes.length} agendamento(s) para ${horaAtual}`);

    // Verifica conexão antes de enviar
    await ensureConnected();

    for (let i = 0; i < pendentes.length; i++) {
      await processarAgendamento(db, pendentes[i]);
      if (i < pendentes.length - 1) {
        const delay = Math.floor(Math.random() * (config.antiban.maxDelayMs - config.antiban.minDelayMs)) + config.antiban.minDelayMs;
        logger.info(`Anti-ban: aguardando ${(delay / 1000).toFixed(0)}s`);
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
  cron.schedule('* * * * *', verificarAgendamentos);
  logger.info('Scheduler iniciado (verifica a cada minuto)');
}

module.exports = { iniciarScheduler, verificarAgendamentos, processarAgendamento };
