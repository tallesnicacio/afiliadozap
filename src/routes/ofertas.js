const express = require('express');
const router  = express.Router();
const { getDb } = require('../db/database');
const { sincronizarParaCache } = require('../services/sheets');

// GET /api/ofertas
router.get('/', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  const ofertas = status
    ? db.prepare('SELECT * FROM ofertas_cache WHERE status = ? ORDER BY criado_em DESC').all(status)
    : db.prepare('SELECT * FROM ofertas_cache ORDER BY criado_em DESC').all();
  res.json({ total: ofertas.length, ofertas });
});

// POST /api/ofertas — cadastro manual
router.post('/', (req, res) => {
  const { plataforma, nome_produto, link_afiliado, preco_original, preco_oferta, desconto_pct, categoria, imagem_url, cupom, validade } = req.body;
  if (!nome_produto || !link_afiliado) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome_produto, link_afiliado' });
  }
  const db = getDb();
  try {
    const result = db.prepare(`
      INSERT INTO ofertas_cache
        (plataforma, nome_produto, link_afiliado, preco_original, preco_oferta, desconto_pct, categoria, imagem_url, cupom, validade, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo')
    `).run(
      plataforma ?? null, nome_produto, link_afiliado,
      preco_original ?? null, preco_oferta ?? null, desconto_pct ?? null,
      categoria ?? null, imagem_url ?? null, cupom ?? null, validade ?? null
    );
    const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(oferta);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Link afiliado já cadastrado' });
    throw err;
  }
});

// PUT /api/ofertas/:id — edição manual
router.put('/:id', (req, res) => {
  const db = getDb();
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(req.params.id);
  if (!oferta) return res.status(404).json({ error: 'Oferta não encontrada' });

  const { plataforma, nome_produto, link_afiliado, preco_original, preco_oferta, desconto_pct, categoria, imagem_url, cupom, validade, status } = req.body;
  db.prepare(`
    UPDATE ofertas_cache SET
      plataforma = ?, nome_produto = ?, link_afiliado = ?,
      preco_original = ?, preco_oferta = ?, desconto_pct = ?,
      categoria = ?, imagem_url = ?, cupom = ?, validade = ?,
      status = ?, copy_gerada = NULL,
      atualizado_em = datetime('now','localtime')
    WHERE id = ?
  `).run(
    plataforma ?? oferta.plataforma,
    nome_produto ?? oferta.nome_produto,
    link_afiliado ?? oferta.link_afiliado,
    preco_original ?? oferta.preco_original,
    preco_oferta ?? oferta.preco_oferta,
    desconto_pct ?? oferta.desconto_pct,
    categoria ?? oferta.categoria,
    imagem_url ?? oferta.imagem_url,
    cupom ?? oferta.cupom,
    validade ?? oferta.validade,
    status ?? oferta.status,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(req.params.id));
});

// DELETE /api/ofertas/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM ofertas_cache WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Oferta não encontrada' });
  res.json({ message: 'Oferta removida' });
});

// POST /api/ofertas/sync — importar do Google Sheets
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
