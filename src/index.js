require('dotenv').config();
const path    = require('path');
const express = require('express');
const config  = require('./config');
const logger  = require('./utils/logger');
const { runMigrations } = require('./db/migrations');
const { authMiddleware } = require('./middleware/auth');

const app = express();
app.use(express.json());

// Migrations
runMigrations();

// Scheduler
const { iniciarScheduler } = require('./services/scheduler');
iniciarScheduler();

// Auth (público)
app.use('/api/auth', require('./routes/auth'));

// Health (público)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.server.env, ts: new Date().toISOString() });
});

// Rotas protegidas
app.use('/api/ofertas',      authMiddleware, require('./routes/ofertas'));
app.use('/api/grupos',       authMiddleware, require('./routes/grupos'));
app.use('/api/agendamentos', authMiddleware, require('./routes/agendamentos'));
app.use('/api/copy',         authMiddleware, require('./routes/copy'));
app.use('/api',              authMiddleware, require('./routes/disparos'));

// Frontend estático
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Erro não tratado', { err: err.message, stack: err.stack });
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(config.server.port, () => {
  logger.info(`AfiliadoZap rodando na porta ${config.server.port}`, {
    env: config.server.env,
    evolution: config.evolution.url,
  });
});
