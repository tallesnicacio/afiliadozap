const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const config = require('../config');

const EVO_URL     = config.evolution.url;
const EVO_KEY     = config.evolution.apiKey;
const EVO_INST    = config.evolution.instance;
const EVO_HEADERS = { 'Content-Type': 'application/json', apikey: EVO_KEY };

// GET /api/grupos
router.get('/', (req, res) => {
  const db = getDb();
  const grupos = db.prepare('SELECT * FROM grupos ORDER BY criado_em DESC').all();
  res.json({ total: grupos.length, grupos });
});

// POST /api/grupos
router.post('/', (req, res) => {
  const { nome, jid } = req.body;
  if (!nome || !jid) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, jid' });
  }

  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO grupos (nome, jid) VALUES (?, ?)').run(nome, jid);
    const grupo = db.prepare('SELECT * FROM grupos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(grupo);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'JID já cadastrado' });
    }
    throw err;
  }
});

// PATCH /api/grupos/:id/toggle — ativar/desativar
router.patch('/:id/toggle', (req, res) => {
  const db = getDb();
  const grupo = db.prepare('SELECT * FROM grupos WHERE id = ?').get(req.params.id);
  if (!grupo) return res.status(404).json({ error: 'Grupo não encontrado' });

  db.prepare('UPDATE grupos SET ativo = ? WHERE id = ?').run(grupo.ativo ? 0 : 1, grupo.id);
  res.json({ id: grupo.id, ativo: !grupo.ativo });
});

// DELETE /api/grupos/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM grupos WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Grupo não encontrado' });
  res.json({ message: 'Grupo removido' });
});

// GET /api/grupos/whatsapp/grupos — lista grupos do WhatsApp via Evolution API (com nomes)
router.get('/whatsapp/grupos', async (req, res) => {
  try {
    // 1. Pega todos os chats e filtra os grupos (@g.us)
    const chatsRes = await fetch(`${EVO_URL}/chat/findChats/${EVO_INST}`, { headers: EVO_HEADERS });
    const chats = await chatsRes.json();
    if (!Array.isArray(chats)) return res.status(502).json({ error: 'Resposta inesperada da Evolution API', chats });

    const jids = chats.map(c => c.id).filter(id => id?.endsWith('@g.us'));

    // 2. Busca metadados (nome, tamanho) de cada grupo em paralelo (máx 10 por vez)
    const chunks = [];
    for (let i = 0; i < jids.length; i += 10) chunks.push(jids.slice(i, i + 10));

    const grupos = [];
    for (const chunk of chunks) {
      const results = await Promise.all(chunk.map(async jid => {
        try {
          const r = await fetch(`${EVO_URL}/group/findGroupInfos/${EVO_INST}?groupJid=${encodeURIComponent(jid)}`, { headers: EVO_HEADERS });
          const g = await r.json();
          return { jid: g.id || jid, nome: g.subject || null, participantes: g.size || null, descricao: g.desc || null };
        } catch {
          return { jid, nome: null, participantes: null, descricao: null };
        }
      }));
      grupos.push(...results);
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 300)); // evita rate limit
      }
    }

    grupos.sort((a, b) => {
      if (a.nome && !b.nome) return -1;
      if (!a.nome && b.nome) return 1;
      return (a.nome || a.jid).localeCompare(b.nome || b.jid, 'pt-BR');
    });
    res.json({ total: grupos.length, grupos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grupos/whatsapp/contatos — lista contatos/chats via Evolution API
router.get('/whatsapp/contatos', async (req, res) => {
  try {
    const r = await fetch(`${EVO_URL}/chat/findChats/${EVO_INST}`, { headers: EVO_HEADERS });
    const data = await r.json();
    if (!Array.isArray(data)) return res.status(502).json({ error: 'Resposta inesperada da Evolution API', data });
    const contatos = data
      .filter(c => !c.id?.endsWith('@g.us')) // apenas contatos individuais
      .map(c => ({
        jid: c.id,
        nome: c.name || c.pushName || c.id,
        ultimo_msg: c.updatedAt || null,
      }))
      .sort((a, b) => (b.ultimo_msg || '').localeCompare(a.ultimo_msg || ''));
    res.json({ total: contatos.length, contatos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
