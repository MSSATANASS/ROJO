// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');
const Database = require('better-sqlite3'); // npm i better-sqlite3
const logger = require('./logger');
const pinoHttp = require('pino-http');

const app = express();

// --- Environment Variable Validation ---
const REQUIRED_ENV = ['COINBASE_API_KEY', 'COINBASE_WEBHOOK_SECRET', 'GM_API_KEY', 'FRONTEND_ORIGIN'];
for (const variable of REQUIRED_ENV) {
  if (!process.env[variable]) {
    logger.warn(`Environment variable ${variable} is not set.`);
  }
}

app.use(cors({
  // Disallow '*' in production. Fail-safe by not setting a default.
  // The request will be blocked by CORS if the origin is not on the allow-list.
  origin: process.env.FRONTEND_ORIGIN
}));

// --- Core Middleware ---
app.use(pinoHttp({ logger })); // Add structured request logging
app.use(express.json({ limit: '20kb' }));


// Rate limiting simple
// For production, consider a more robust library like 'express-rate-limit'
const rateLimitWindowMs = 60 * 1000;
// Use environment variable for max requests, with a sensible default.
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10) || 60;
const ipCounters = new Map();
setInterval(() => ipCounters.clear(), rateLimitWindowMs);

function ipRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const c = ipCounters.get(ip) || 0;
  if (c > rateLimitMax) return res.status(429).json({ error: 'Too many requests' });
  ipCounters.set(ip, c + 1);
  next();
}
app.use(ipRateLimit);

// DB (SQLite simple)
const DB_FILE = process.env.DB_FILE || 'rojo.db';
const db = new Database(DB_FILE);
db.prepare(`CREATE TABLE IF NOT EXISTS charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  charge_id TEXT,
  hosted_url TEXT,
  name TEXT,
  description TEXT,
  amount TEXT,
  currency TEXT,
  metadata TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`).run();

// ENV
const COINBASE_API_KEY = process.env.COINBASE_API_KEY;
const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_WEBHOOK_SECRET; // shared secret from Coinbase Commerce
const GM_API_KEY = process.env.GM_API_KEY; // generative AI

// UTIL: insert charge record
function saveChargeRow(obj) {
  const stmt = db.prepare(`INSERT INTO charges (charge_id, hosted_url, name, description, amount, currency, metadata, status) VALUES (?,?,?,?,?,?,?,?)`);
  stmt.run(obj.charge_id, obj.hosted_url, obj.name, obj.description, obj.amount, obj.currency, JSON.stringify(obj.metadata||{}), obj.status||'pending');
}

// Endpoint: create-charge
app.post('/create-charge', async (req, res, next) => {
  try {
    const { name, description, amount, currency } = req.body;
    if(!name || !amount) return res.status(400).json({ error: 'Missing name or amount' });

    // sanitize basic
    if(Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

    const body = {
      name: String(name).slice(0,120),
      description: String(description || '').slice(0,400),
      local_price: { amount: String(amount), currency: String(currency || 'USD') },
      pricing_type: 'fixed_price',
      metadata: { product: 'AuraKit', name }
    };

    const r = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if(!r.ok) {
      const txt = await r.text();
      logger.error({ detail: txt }, 'Coinbase create charge API error');
      return res.status(502).json({ error: 'Coinbase API error' }); // 502 Bad Gateway is more appropriate
    }

    const data = await r.json();
    const hosted_url = data.data.hosted_url;
    const charge_id = data.data.id;

    // save minimal to DB
    saveChargeRow({ charge_id, hosted_url, name: body.name, description: body.description, amount: body.local_price.amount, currency: body.local_price.currency, metadata: body.metadata, status: 'pending' });

    return res.json({ hosted_url, charge: data.data });
  } catch (err) {
    next(err); // Pass error to the centralized handler
  }
});

// Webhook: Coinbase Commerce signature verification
// Coinbase sends raw JSON; verification uses HMAC SHA256 with webhook shared secret and raw body
app.post('/coinbase-webhook', bodyParser.raw({ type: 'application/json' }), (req, res, next) => {
  try {
    const signature = req.get('X-CC-Webhook-Signature') || '';
    const payload = req.body; // This is a Buffer

    if (!COINBASE_WEBHOOK_SECRET) {
      logger.error('Webhook secret is not configured. Cannot verify payload.');
      return res.status(500).send('Webhook secret not configured');
    }

    const hmac = crypto.createHmac('sha256', COINBASE_WEBHOOK_SECRET);
    const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
    const receivedSignature = Buffer.from(signature, 'utf8');

    if (!crypto.timingSafeEqual(digest, receivedSignature)) {
      return res.status(400).send('invalid signature');
    }

    const parsed = JSON.parse(payload.toString());
    const eventType = parsed.event?.type;
    const chargeId = parsed.event?.data?.id;
    req.log.info({ eventType, chargeId }, 'Coinbase webhook received');

    // update DB status if charge confirmed/resolved
    if(eventType === 'charge:confirmed' || eventType === 'charge:resolved') {
      const stmt = db.prepare('UPDATE charges SET status = ? WHERE charge_id = ?');
      stmt.run('confirmed', chargeId);
      // Here you could trigger sending an email or mark order in Shopify if you saved metadata linking them
    }

    res.status(200).send('ok');
  } catch (err) {
    next(err); // Pass error to the centralized handler
  }
});

// AI suggest endpoint (server-side)
app.post('/ai-suggest', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if(!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Example for Google Gemini (Generative Language), update if you use OpenAI
    const model = process.env.AI_MODEL_NAME || 'gemini-1.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GM_API_KEY}`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    // Using native fetch available in Node.js 18+
    const r = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if(!r.ok) {
      const txt = await r.text();
      logger.error({ detail: txt }, 'Generative AI API error');
      return res.status(502).json({ error: 'AI API error' });
    }

    const result = await r.json();
    const suggestion = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ suggestion: suggestion.trim(), raw: result });
  } catch (err) {
    next(err); // Pass error to the centralized handler
  }
});

// Serve static for simple testing (optional)
app.use(express.static(path.join(__dirname, 'public')));

// --- Error Handling Middleware ---
// Optional: fallthrough for 404 Not Found
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Custom error handler.
app.use((err, req, res, next) => {
  logger.error(err, 'An unhandled error occurred');
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));