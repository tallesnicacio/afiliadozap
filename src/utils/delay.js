const config = require('../config');

function randomDelay(minMs, maxMs) {
  const min = minMs ?? config.antiban.minDelayMs;
  const max = maxMs ?? config.antiban.maxDelayMs;
  const ms = Math.floor(Math.random() * (max - min)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { randomDelay };
