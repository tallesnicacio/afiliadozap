const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

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

module.exports = router;
