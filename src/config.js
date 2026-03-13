require('dotenv').config();

module.exports = {
  server: {
    port: parseInt(process.env.PORT) || 3500,
    env: process.env.NODE_ENV || 'development',
  },

  sheets: {
    id: process.env.GOOGLE_SHEETS_ID,
    credentialsPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './credentials.json',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  evolution: {
    url: process.env.EVOLUTION_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY,
    instance: process.env.EVOLUTION_INSTANCE,
  },

  dashboard: {
    password: process.env.DASHBOARD_PASSWORD || 'afiliadozap123',
  },

  antiban: {
    minDelayMs: parseInt(process.env.MIN_DELAY_MS) || 30000,
    maxDelayMs: parseInt(process.env.MAX_DELAY_MS) || 60000,
    maxMsgsPerHour: parseInt(process.env.MAX_MSGS_PER_HOUR) || 20,
  },
};
