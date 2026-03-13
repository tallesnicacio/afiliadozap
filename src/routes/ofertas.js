const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/ofertas
router.get('/', (req, res) => {
  const db = getDb();
  const ofertas = db.prepare('SELECT * FROM ofertas_cache ORDER BY criado_em DESC').all();
  res.json({ total: ofertas.length, ofertas });
});

// POST /api/ofertas/sync — por enquanto retorna placeholder (Sheets ainda não integrado)
router.post('/sync', (req, res) => {
  res.json({ message: 'Integração Google Sheets pendente (Fase 3). Use as ofertas mock por enquanto.' });
});

module.exports = router;
