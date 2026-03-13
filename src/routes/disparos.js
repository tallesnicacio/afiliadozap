const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { processarAgendamento } = require('../services/scheduler');
const { gerarCopy } = require('../services/openai');
const { sendOferta } = require('../services/evolution');
const logger = require('../utils/logger');

// GET /api/logs
router.get('/logs', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 50;
  const logs = db.prepare('SELECT * FROM logs_envio ORDER BY enviado_em DESC LIMIT ?').all(limit);
  res.json({ total: logs.length, logs });
});

// POST /api/disparar — disparo manual imediato (sem agendamento)
router.post('/disparar', async (req, res) => {
  const { oferta_id, grupo_id } = req.body;
  if (!oferta_id || !grupo_id) {
    return res.status(400).json({ error: 'Campos obrigatórios: oferta_id, grupo_id' });
  }

  const db = getDb();
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(oferta_id);
  const grupo  = db.prepare('SELECT * FROM grupos WHERE id = ?').get(grupo_id);

  if (!oferta) return res.status(404).json({ error: 'Oferta não encontrada' });
  if (!grupo)  return res.status(404).json({ error: 'Grupo não encontrado' });

  try {
    // Gera ou usa copy em cache
    let copy = oferta.copy_gerada;
    if (!copy) {
      copy = await gerarCopy(oferta);
      db.prepare(`UPDATE ofertas_cache SET copy_gerada = ?, atualizado_em = datetime('now','localtime') WHERE id = ?`)
        .run(copy, oferta_id);
    }

    await sendOferta(grupo, oferta, copy);

    db.prepare(`
      INSERT INTO logs_envio (oferta_id, grupo_id, grupo_nome, status, mensagem)
      VALUES (?, ?, ?, 'enviado', ?)
    `).run(oferta.id, grupo.id, grupo.nome, copy);

    logger.info('Disparo manual realizado', { produto: oferta.nome_produto, grupo: grupo.nome });
    res.json({ message: 'Enviado com sucesso', produto: oferta.nome_produto, grupo: grupo.nome, copy });
  } catch (err) {
    logger.error('Erro no disparo manual', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/disparar/agendamento/:id — força execução de um agendamento específico
router.post('/disparar/agendamento/:id', async (req, res) => {
  const db = getDb();
  const agendamento = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(req.params.id);
  if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado' });

  try {
    await processarAgendamento(db, agendamento);
    res.json({ message: 'Agendamento processado', id: agendamento.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
