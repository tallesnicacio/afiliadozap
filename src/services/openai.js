const OpenAI = require('openai');
const config = require('../config');
const logger = require('../utils/logger');

const client = new OpenAI({ apiKey: config.openai.apiKey });

function buildPrompt(oferta) {
  const cupomLinha = oferta.cupom ? `Cupom: ${oferta.cupom}` : 'Cupom: nenhum';
  return `Você é um copywriter especialista em grupos de achados e ofertas no WhatsApp.
Gere uma mensagem curta e persuasiva para o seguinte produto:

Produto: ${oferta.nome_produto}
Plataforma: ${oferta.plataforma || 'Loja Online'}
Preço original: R$ ${Number(oferta.preco_original).toFixed(2)}
Preço oferta: R$ ${Number(oferta.preco_oferta).toFixed(2)}
Desconto: ${oferta.desconto_pct}%
${cupomLinha}
Link: ${oferta.link_afiliado}

Regras:
- Use emojis moderadamente (3-5 por mensagem)
- Comece com uma frase de impacto ou urgência
- Destaque o desconto e o preço final
- Inclua o cupom (se houver) de forma clara
- Termine com o link
- Máximo 500 caracteres
- Tom: informal, empolgado mas não exagerado
- NÃO use hashtags`;
}

async function gerarCopy(oferta) {
  logger.info('Gerando copy via OpenAI', { produto: oferta.nome_produto, model: config.openai.model });

  const response = await client.chat.completions.create({
    model: config.openai.model,
    messages: [{ role: 'user', content: buildPrompt(oferta) }],
    max_tokens: 300,
    temperature: 0.8,
  });

  const copy = response.choices[0].message.content.trim();
  logger.info('Copy gerada', { produto: oferta.nome_produto, chars: copy.length });
  return copy;
}

async function gerarVariacoes(oferta, quantidade = 2) {
  const promises = Array.from({ length: quantidade }, () => gerarCopy(oferta));
  return Promise.all(promises);
}

module.exports = { gerarCopy, gerarVariacoes };
