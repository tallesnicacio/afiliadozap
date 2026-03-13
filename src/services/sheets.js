const { google } = require('googleapis');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

const SHEET_NAME = 'ofertas';
const COLUNAS = [
  'plataforma', 'nome_produto', 'link_afiliado',
  'preco_original', 'preco_oferta', 'desconto_pct',
  'categoria', 'imagem_url', 'cupom', 'validade', 'status',
];

async function getAuthClient() {
  const keyPath = path.resolve(config.sheets.credentialsPath);
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return auth.getClient();
}

async function lerOfertas() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheets.id,
    range: `${SHEET_NAME}!A2:K`,
  });

  const rows = res.data.values || [];

  return rows
    .filter(row => row.length >= 3)
    .map(row => ({
      plataforma:     row[0]  || null,
      nome_produto:   row[1]  || '',
      link_afiliado:  row[2]  || '',
      preco_original: parseFloat(row[3]) || null,
      preco_oferta:   parseFloat(row[4]) || null,
      desconto_pct:   parseInt(row[5])   || null,
      categoria:      row[6]  || null,
      imagem_url:     row[7]  || null,
      cupom:          row[8]  || null,
      validade:       row[9]  || null,
      status:         row[10] || 'ativo',
    }))
    .filter(o => o.status === 'ativo' && o.link_afiliado);
}

async function sincronizarParaCache(db) {
  logger.info('Iniciando sincronização do Google Sheets...');

  const ofertas = await lerOfertas();

  if (ofertas.length === 0) {
    logger.warn('Nenhuma oferta ativa encontrada na planilha');
    return { inseridas: 0, atualizadas: 0, total: 0 };
  }

  const upsert = db.prepare(`
    INSERT INTO ofertas_cache
      (plataforma, nome_produto, link_afiliado, preco_original, preco_oferta,
       desconto_pct, categoria, imagem_url, cupom, validade, status, atualizado_em)
    VALUES
      (@plataforma, @nome_produto, @link_afiliado, @preco_original, @preco_oferta,
       @desconto_pct, @categoria, @imagem_url, @cupom, @validade, @status, datetime('now','localtime'))
    ON CONFLICT(link_afiliado) DO UPDATE SET
      plataforma    = excluded.plataforma,
      nome_produto  = excluded.nome_produto,
      preco_original= excluded.preco_original,
      preco_oferta  = excluded.preco_oferta,
      desconto_pct  = excluded.desconto_pct,
      categoria     = excluded.categoria,
      imagem_url    = excluded.imagem_url,
      cupom         = excluded.cupom,
      validade      = excluded.validade,
      status        = excluded.status,
      atualizado_em = datetime('now','localtime')
  `);

  // Adiciona constraint UNIQUE em link_afiliado se não existir
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_ofertas_link ON ofertas_cache(link_afiliado)');
  } catch (_) {}

  let inseridas = 0;
  let atualizadas = 0;

  db.exec('BEGIN');
  try {
    for (const oferta of ofertas) {
      const existe = db.prepare('SELECT id FROM ofertas_cache WHERE link_afiliado = ?').get(oferta.link_afiliado);
      upsert.run(oferta);
      if (existe) atualizadas++; else inseridas++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  logger.info('Sincronização concluída', { inseridas, atualizadas, total: ofertas.length });
  return { inseridas, atualizadas, total: ofertas.length };
}

module.exports = { lerOfertas, sincronizarParaCache };
