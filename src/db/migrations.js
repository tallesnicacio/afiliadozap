const { getDb } = require('./database');
const logger = require('../utils/logger');

function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS grupos (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT NOT NULL,
      jid        TEXT NOT NULL UNIQUE,
      ativo      INTEGER NOT NULL DEFAULT 1,
      criado_em  DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS ofertas_cache (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      plataforma      TEXT,
      nome_produto    TEXT NOT NULL,
      link_afiliado   TEXT NOT NULL UNIQUE,
      preco_original  REAL,
      preco_oferta    REAL,
      desconto_pct    INTEGER,
      categoria       TEXT,
      imagem_url      TEXT,
      cupom           TEXT,
      validade        TEXT,
      status          TEXT NOT NULL DEFAULT 'ativo',
      copy_gerada     TEXT,
      criado_em       DATETIME NOT NULL DEFAULT (datetime('now', 'localtime')),
      atualizado_em   DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      oferta_id   INTEGER NOT NULL REFERENCES ofertas_cache(id) ON DELETE CASCADE,
      grupo_id    INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
      horario     TEXT NOT NULL,
      dias_semana TEXT NOT NULL DEFAULT 'seg,ter,qua,qui,sex',
      status      TEXT NOT NULL DEFAULT 'pendente',
      enviado_em  DATETIME,
      criado_em   DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS config_horarios (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_faixa    TEXT NOT NULL,
      hora_inicio   TEXT NOT NULL,
      hora_fim      TEXT NOT NULL,
      intervalo_min INTEGER NOT NULL DEFAULT 30,
      max_por_faixa INTEGER NOT NULL DEFAULT 5,
      ativo         INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS logs_envio (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      oferta_id   INTEGER,
      grupo_id    INTEGER,
      grupo_nome  TEXT,
      status      TEXT NOT NULL,
      mensagem    TEXT,
      erro        TEXT,
      enviado_em  DATETIME NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Seed de faixas de horário padrão
  const { total } = db.prepare('SELECT COUNT(*) as total FROM config_horarios').get();
  if (total === 0) {
    const insert = db.prepare(`
      INSERT INTO config_horarios (nome_faixa, hora_inicio, hora_fim, intervalo_min, max_por_faixa)
      VALUES (?, ?, ?, ?, ?)
    `);
    insert.run('Manhã',  '08:00', '12:00', 30, 5);
    insert.run('Tarde',  '14:00', '18:00', 30, 5);
    insert.run('Noite',  '19:00', '22:00', 30, 5);
    logger.info('Faixas de horário padrão criadas (Manhã, Tarde, Noite)');
  }

  // Seed de ofertas mock para desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    const { total: totalOfertas } = db.prepare('SELECT COUNT(*) as total FROM ofertas_cache').get();
    if (totalOfertas === 0) {
      const ins = db.prepare(`
        INSERT INTO ofertas_cache (plataforma, nome_produto, link_afiliado, preco_original, preco_oferta, desconto_pct, categoria, cupom, validade)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      ins.run('Shopee',        'Fone Bluetooth TWS',                 'https://s.shopee.com.br/mock1', 89.90,  39.90,  56, 'Eletrônicos', 'SHOPEE10',  '2026-04-01');
      ins.run('Amazon',        'Suporte Celular Veicular Magnético', 'https://amzn.to/mock2',         59.90,  24.90,  58, 'Acessórios',  null,        '2026-04-15');
      ins.run('Mercado Livre', 'Tênis Running Nike Air Zoom',        'https://mercadolivre.com/mock3',349.90, 199.90, 43, 'Moda',        'MELI15',    '2026-03-31');
      logger.info('Ofertas mock inseridas para desenvolvimento');
    }
  }

  logger.info('Migrations executadas com sucesso');
}

module.exports = { runMigrations };
