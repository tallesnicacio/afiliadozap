const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// GET /api/agendamentos
router.get('/', (req, res) => {
  const db = getDb();
  const agendamentos = db.prepare(`
    SELECT a.*, o.nome_produto, o.plataforma, g.nome as grupo_nome
    FROM agendamentos a
    JOIN ofertas_cache o ON a.oferta_id = o.id
    JOIN grupos g ON a.grupo_id = g.id
    ORDER BY a.horario
  `).all();
  res.json({ total: agendamentos.length, agendamentos });
});

// POST /api/agendamentos
router.post('/', (req, res) => {
  const { oferta_id, grupo_id, horario, dias_semana } = req.body;
  if (!oferta_id || !grupo_id || !horario) {
    return res.status(400).json({ error: 'Campos obrigatórios: oferta_id, grupo_id, horario' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO agendamentos (oferta_id, grupo_id, horario, dias_semana)
    VALUES (?, ?, ?, ?)
  `).run(oferta_id, grupo_id, horario, dias_semana || 'seg,ter,qua,qui,sex');

  const agendamento = db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(agendamento);
});

// DELETE /api/agendamentos/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM agendamentos WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
  res.json({ message: 'Agendamento removido' });
});

module.exports = router;
