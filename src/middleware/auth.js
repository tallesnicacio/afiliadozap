const crypto = require('crypto');
const config = require('../config');

// Token gerado uma vez ao subir o servidor — derivado da senha para ser determinístico
const SECRET_TOKEN = crypto
  .createHmac('sha256', config.dashboard.password)
  .update('afiliadozap-token-v1')
  .digest('hex');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token && token === SECRET_TOKEN) return next();
  res.status(401).json({ error: 'Não autorizado' });
}

module.exports = { authMiddleware, SECRET_TOKEN };
