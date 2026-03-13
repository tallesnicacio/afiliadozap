require('dotenv').config();
const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const { runMigrations } = require('./db/migrations');

const app = express();
app.use(express.json());

// Migrations
runMigrations();

// Rotas
app.use('/api/ofertas',       require('./routes/ofertas'));
app.use('/api/grupos',        require('./routes/grupos'));
app.use('/api/agendamentos',  require('./routes/agendamentos'));
app.use('/api/copy',          require('./routes/copy'));
app.use('/api',               require('./routes/disparos'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: config.server.env, ts: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
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
