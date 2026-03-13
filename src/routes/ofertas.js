const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { sincronizarParaCache } = require('../services/sheets');

// GET /api/ofertas
router.get('/', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  const query = status
    ? 'SELECT * FROM ofertas_cache WHERE status = ? ORDER BY criado_em DESC'
    : 'SELECT * FROM ofertas_cache ORDER BY criado_em DESC';
  const ofertas = status
    ? db.prepare(query).all(status)
    : db.prepare(query).all();
  res.json({ total: ofertas.length, ofertas });
});

// POST /api/ofertas/sync
router.post('/sync', async (req, res) => {
  try {
    const db = getDb();
    const resultado = await sincronizarParaCache(db);
    res.json({ message: 'Sincronização concluída', ...resultado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
