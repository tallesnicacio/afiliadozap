const express = require('express');
const router  = express.Router();
const config  = require('../config');
const { SECRET_TOKEN } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== config.dashboard.password) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }
  res.json({ token: SECRET_TOKEN });
});

module.exports = router;
