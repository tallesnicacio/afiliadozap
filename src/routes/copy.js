const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

function gerarCopyMock(oferta) {
  const emojis = ['🔥', '⚡', '🛒', '💥', '🎯'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const cupomTexto = oferta.cupom ? `\n🎟️ Cupom: ${oferta.cupom}\n` : '';

  return `${emoji} Oferta imperdível!

${oferta.nome_produto} por apenas R$ ${oferta.preco_oferta?.toFixed(2).replace('.', ',')}!
Era R$ ${oferta.preco_original?.toFixed(2).replace('.', ',')} — ${oferta.desconto_pct}% OFF 😱
${cupomTexto}
Corre que acaba rápido 👇
${oferta.link_afiliado}`.trim();
}

// POST /api/copy/gerar
router.post('/gerar', (req, res) => {
  const { oferta_id } = req.body;
  if (!oferta_id) return res.status(400).json({ error: 'Campo obrigatório: oferta_id' });

  const db = getDb();
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(oferta_id);
  if (!oferta) return res.status(404).json({ error: 'Oferta não encontrada' });

  const copy = gerarCopyMock(oferta);

  // Salva no cache
  db.prepare('UPDATE ofertas_cache SET copy_gerada = ?, atualizado_em = datetime("now","localtime") WHERE id = ?')
    .run(copy, oferta_id);

  res.json({ oferta_id, copy, modo: 'mock — OpenAI será integrado na Fase 4' });
});

// POST /api/copy/preview
router.post('/preview', (req, res) => {
  const { oferta_id } = req.body;
  if (!oferta_id) return res.status(400).json({ error: 'Campo obrigatório: oferta_id' });

  const db = getDb();
  const oferta = db.prepare('SELECT * FROM ofertas_cache WHERE id = ?').get(oferta_id);
  if (!oferta) return res.status(404).json({ error: 'Oferta não encontrada' });

  const copy = oferta.copy_gerada || gerarCopyMock(oferta);
  res.json({ oferta_id, produto: oferta.nome_produto, preview: copy });
});

module.exports = router;
