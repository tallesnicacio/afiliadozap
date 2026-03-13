const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { gerarCopy, gerarVariacoes } = require('../services/openai');

// POST /api/copy/gerar
router.post('/gerar', async (req, res) => {
  const { oferta_id, forcar } = req.body;
  if (!oferta_id) return res.status(400).json({ error: 'Campo obrigatório: oferta_id' });

  const db = getDb();
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(oferta_id);
  if (!oferta) return res.status(404).json({ error: 'Oferta não encontrada' });

  // Retorna cache se já gerou e não forçou regerar
  if (oferta.copy_gerada && !forcar) {
    return res.json({ oferta_id, copy: oferta.copy_gerada, cache: true });
  }

  try {
    const copy = await gerarCopy(oferta);
    db.prepare(`UPDATE ofertas_cache SET copy_gerada = ?, atualizado_em = datetime('now','localtime') WHERE id = ?`)
      .run(copy, oferta_id);
    res.json({ oferta_id, copy, cache: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/copy/preview
router.post('/preview', async (req, res) => {
  const { oferta_id } = req.body;
  if (!oferta_id) return res.status(400).json({ error: 'Campo obrigatório: oferta_id' });

  const db = getDb();
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(oferta_id);
  if (!oferta) return res.status(404).json({ error: 'Oferta não encontrada' });

  try {
    // Gera nova (sem salvar) para preview
    const copy = await gerarCopy(oferta);
    res.json({ oferta_id, produto: oferta.nome_produto, preview: copy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/copy/variacoes
router.post('/variacoes', async (req, res) => {
  const { oferta_id, quantidade } = req.body;
  if (!oferta_id) return res.status(400).json({ error: 'Campo obrigatório: oferta_id' });

  const db = getDb();
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(oferta_id);
  if (!oferta) return res.status(404).json({ error: 'Oferta não encontrada' });

  try {
    const variacoes = await gerarVariacoes(oferta, quantidade || 2);
    res.json({ oferta_id, produto: oferta.nome_produto, variacoes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
