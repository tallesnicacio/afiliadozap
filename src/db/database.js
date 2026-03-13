const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const logger = require('../utils/logger');

const DB_PATH = path.join(__dirname, '../../data/afiliados.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    logger.info('Banco de dados conectado', { path: DB_PATH });
  }
  return db;
}

module.exports = { getDb };
