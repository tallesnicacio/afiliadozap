const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/logs
router.get('/logs', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 50;
  const logs = db.prepare('SELECT * FROM logs_envio ORDER BY enviado_em DESC LIMIT ?').all(limit);
  res.json({ total: logs.length, logs });
});

// POST /api/disparar — disparo manual imediato (placeholder — Fase 5 implementa de verdade)
router.post('/disparar', (req, res) => {
  res.json({ message: 'Disparo manual será implementado na Fase 5 (Evolution API + scheduler).' });
});

module.exports = router;
