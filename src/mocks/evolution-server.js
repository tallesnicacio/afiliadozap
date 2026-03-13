/**
 * Mock da Evolution API — roda na porta 8080
 * Simula os endpoints de envio do WhatsApp sem precisar de servidor real.
 * Use: node src/mocks/evolution-server.js
 */

require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.EVOLUTION_MOCK_PORT) || 8081;
let msgCount = 0;

// ─── helpers visuais ────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';
const MAGENTA= '\x1b[35m';
const DIM    = '\x1b[2m';

function timestamp() {
  return new Date().toLocaleTimeString('pt-BR');
}

function printMessage({ instance, number, type, text, mediaType, caption }) {
  msgCount++;
  const border = '─'.repeat(60);
  console.log(`\n${CYAN}${border}${RESET}`);
  console.log(`${BOLD}${GREEN}📨  MENSAGEM #${msgCount} INTERCEPTADA${RESET}  ${DIM}[${timestamp()}]${RESET}`);
  console.log(`${CYAN}${border}${RESET}`);
  console.log(`${BOLD}  Instância:${RESET} ${YELLOW}${instance}${RESET}`);
  console.log(`${BOLD}  Para:     ${RESET} ${YELLOW}${number}${RESET}`);
  console.log(`${BOLD}  Tipo:     ${RESET} ${MAGENTA}${type}${RESET}`);
  if (type === 'media') {
    console.log(`${BOLD}  Mídia:    ${RESET} ${mediaType}`);
    console.log(`${BOLD}  Legenda:${RESET}`);
    const lines = (caption || '').split('\n');
    lines.forEach(l => console.log(`  ${DIM}│${RESET} ${l}`));
  } else {
    console.log(`${BOLD}  Texto:${RESET}`);
    const lines = (text || '').split('\n');
    lines.forEach(l => console.log(`  ${DIM}│${RESET} ${l}`));
  }
  console.log(`${CYAN}${border}${RESET}\n`);
}

// ─── endpoints ──────────────────────────────────────────────────────────────

// POST /message/sendText/:instance
app.post('/message/sendText/:instance', (req, res) => {
  const { instance } = req.params;
  const { number, text } = req.body;

  if (!number || !text) {
    return res.status(400).json({ error: 'Campos obrigatórios: number, text' });
  }

  printMessage({ instance, number, type: 'text', text });

  res.json({
    key: { remoteJid: number, id: `MOCK${Date.now()}` },
    status: 'PENDING',
    message: { conversation: text },
  });
});

// POST /message/sendMedia/:instance
app.post('/message/sendMedia/:instance', (req, res) => {
  const { instance } = req.params;
  const { number, mediatype, media, caption } = req.body;

  if (!number || !media) {
    return res.status(400).json({ error: 'Campos obrigatórios: number, media' });
  }

  printMessage({ instance, number, type: 'media', mediaType: mediatype, caption });
  console.log(`  ${DIM}URL da mídia: ${media}${RESET}\n`);

  res.json({
    key: { remoteJid: number, id: `MOCK${Date.now()}` },
    status: 'PENDING',
    message: { imageMessage: { caption } },
  });
});

// GET /instance/fetchInstances — checagem de saúde
app.get('/instance/fetchInstances', (req, res) => {
  res.json([{ instance: { instanceName: process.env.EVOLUTION_INSTANCE || 'afiliadozap', status: 'open' } }]);
});

// ─── start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const border = '═'.repeat(50);
  console.log(`\n${CYAN}${border}${RESET}`);
  console.log(`${BOLD}${GREEN}  🟢  Evolution API MOCK rodando${RESET}`);
  console.log(`${BOLD}     Porta: ${YELLOW}${PORT}${RESET}`);
  console.log(`${BOLD}     Instância: ${YELLOW}${process.env.EVOLUTION_INSTANCE || 'afiliadozap'}${RESET}`);
  console.log(`${CYAN}${border}${RESET}`);
  console.log(`${DIM}  Aguardando mensagens... (Ctrl+C para parar)${RESET}\n`);
});
