const config = require('../config');
const logger = require('../utils/logger');

const BASE_URL  = config.evolution.url;
const API_KEY   = config.evolution.apiKey;
const INSTANCE  = config.evolution.instance;

const headers = {
  'Content-Type': 'application/json',
  'apikey': API_KEY,
};

async function sendText(jid, text) {
  const url = `${BASE_URL}/message/sendText/${INSTANCE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: jid, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API erro ${res.status}: ${body}`);
  }

  const data = await res.json();
  logger.info('Mensagem de texto enviada', { jid, messageId: data?.key?.id });
  return data;
}

async function sendMedia(jid, mediaUrl, caption, mediatype = 'image') {
  const url = `${BASE_URL}/message/sendMedia/${INSTANCE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ number: jid, mediatype, media: mediaUrl, caption }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Evolution API erro ${res.status}: ${body}`);
  }

  const data = await res.json();
  logger.info('Mensagem com mídia enviada', { jid, mediatype, messageId: data?.key?.id });
  return data;
}

async function sendOferta(grupo, oferta, copy) {
  if (oferta.imagem_url) {
    return sendMedia(grupo.jid, oferta.imagem_url, copy);
  }
  return sendText(grupo.jid, copy);
}

module.exports = { sendText, sendMedia, sendOferta };
