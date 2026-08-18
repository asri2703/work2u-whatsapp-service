/**
 * Work2U WhatsApp Service (Multi-Session)
 * Each Work2U workspace gets its own WhatsApp session.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'work2u_default_change_me';
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const AUTH_BASE = process.env.AUTH_PATH || './auth';
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT) || 30;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth middleware
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Session manager: workspace_id -> { client, qrData, status, messages }
const sessions = new Map();

function authPathFor(wsId) {
  return path.join(AUTH_BASE, wsId);
}

async function createSession(wsId) {
  if (sessions.has(wsId)) {
    const s = sessions.get(wsId);
    if (s.status === 'ready' || s.status === 'qr') return s;
    try { await s.client.destroy(); } catch (e) {}
    sessions.delete(wsId);
  }

  const sessionDir = authPathFor(wsId);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const session = {
    wsId: wsId,
    client: null,
    qrData: null,
    status: 'initializing',
    messages: [],
    rateMap: new Map()
  };

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionDir, clientId: wsId }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-accelerated-2d-canvas','--no-first-run','--no-zygote','--single-process','--disable-gpu']
    }
  });

  client.on('qr', async (qr) => {
    console.log('QR received for', wsId);
    session.status = 'qr';
    session.qrData = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
  });

  client.on('authenticated', () => {
    console.log('Authenticated', wsId);
    session.status = 'authenticated';
    session.qrData = null;
  });

  client.on('auth_failure', (msg) => {
    console.error('Auth failure', wsId, msg);
    session.status = 'auth_failed';
  });

  client.on('ready', () => {
    console.log('Ready', wsId);
    session.status = 'ready';
  });

  client.on('disconnected', (reason) => {
    console.log('Disconnected', wsId, reason);
    session.status = 'disconnected';
    session.qrData = null;
    sessions.delete(wsId);
    setTimeout(() => createSession(wsId), 5000);
  });

  client.on('message', async (msg) => {
    if (msg.fromMe) return;
    const msgData = {
      id: msg.id._serialized,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      timestamp: msg.timestamp,
      type: msg.type,
      fromMe: false,
      hasMedia: msg.hasMedia
    };
    session.messages.push(msgData);
    if (session.messages.length > 500) session.messages = session.messages.slice(-500);
    if (WEBHOOK_URL) {
      try {
        await axios.post(WEBHOOK_URL, {
          event: 'message_received',
          workspace_id: wsId,
          data: msgData,
          secret: WEBHOOK_SECRET
        }, { timeout: 5000 });
      } catch (e) {
        console.error('Webhook error:', e.message);
      }
    }
  });

  session.client = client;
  sessions.set(wsId, session);

  try {
    await client.initialize();
  } catch (e) {
    console.error('Init error for', wsId, e.message);
    session.status = 'init_failed';
  }

  return session;
}

function checkRate(session, phone) {
  const now = Date.now();
  const minute = 60 * 1000;
  if (!session.rateMap.has(phone)) session.rateMap.set(phone, []);
  const ts = session.rateMap.get(phone).filter(function(t) { return now - t < minute; });
  session.rateMap.set(phone, ts);
  if (ts.length >= RATE_LIMIT) return false;
  ts.push(now);
  return true;
}

// ===== ROUTES =====

app.get('/health', function(req, res) {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    sessions: Array.from(sessions.entries()).map(function(e) {
      return { workspace_id: e[0], status: e[1].status };
    })
  });
});

app.get('/api/sessions', auth, function(req, res) {
  const list = Array.from(sessions.entries()).map(function(e) {
    return {
      workspace_id: e[0],
      status: e[1].status,
      messages_count: e[1].messages.length,
      has_qr: !!e[1].qrData
    };
  });
  res.json({ sessions: list, total: list.length });
});

app.get('/api/sessions/:wsId/qr', auth, async function(req, res) {
  const wsId = req.params.wsId;
  let session = sessions.get(wsId);
  if (!session) {
    session = await createSession(wsId);
    let attempts = 0;
    while (!session.qrData && session.status !== 'ready' && attempts < 10) {
      await new Promise(function(r) { setTimeout(r, 1000); });
      attempts++;
    }
  }
  res.json({
    workspace_id: wsId,
    status: session.status,
    qr: session.qrData,
    connected: session.status === 'ready'
  });
});

app.get('/api/sessions/:wsId/status', auth, async function(req, res) {
  const wsId = req.params.wsId;
  let session = sessions.get(wsId);
  if (!session) {
    session = await createSession(wsId);
  }
  res.json({
    workspace_id: wsId,
    status: session.status,
    connected: session.status === 'ready',
    messages_count: session.messages.length
  });
});

app.post('/api/sessions/:wsId/messages/send', auth, async function(req, res) {
  const wsId = req.params.wsId;
  const session = sessions.get(wsId);
  if (!session) return res.status(404).json({ error: 'Session not found. Get QR first.' });
  if (session.status !== 'ready') return res.status(503).json({ error: 'WhatsApp not ready', status: session.status });

  const phone = req.body && req.body.phone;
  const message = req.body && req.body.message;
  if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });

  if (!checkRate(session, phone)) {
    return res.status(429).json({ error: 'Rate limit exceeded', limit_per_minute: RATE_LIMIT });
  }

  const formattedPhone = phone.replace(/[^\d]/g, '') + '@c.us';

  try {
    const result = await session.client.sendMessage(formattedPhone, message);
    res.json({
      success: true,
      id: result.id._serialized,
      timestamp: result.timestamp
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sessions/:wsId/messages/send-bulk', auth, async function(req, res) {
  const wsId = req.params.wsId;
  const session = sessions.get(wsId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (session.status !== 'ready') return res.status(503).json({ error: 'WhatsApp not ready' });

  const phones = req.body && req.body.phones;
  const message = req.body && req.body.message;
  if (!Array.isArray(phones) || !message) return res.status(400).json({ error: 'phones[] and message required' });

  const results = [];
  for (const phone of phones) {
    try {
      if (!checkRate(session, phone)) {
        results.push({ phone: phone, success: false, error: 'rate_limit' });
        continue;
      }
      await session.client.sendMessage(phone.replace(/[^\d]/g, '') + '@c.us', message);
      results.push({ phone: phone, success: true });
      await new Promise(function(r) { setTimeout(r, 2000); });
    } catch (e) {
      results.push({ phone: phone, success: false, error: e.message });
    }
  }
  res.json({ results });
});

app.get('/api/sessions/:wsId/messages', auth, function(req, res) {
  const wsId = req.params.wsId;
  const session = sessions.get(wsId);
  if (!session) return res.json([]);

  const limit = parseInt(req.query.limit) || 50;
  const phone = req.query.phone;
  
  let filtered = session.messages;
  if (phone) {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    filtered = session.messages.filter(function(m) {
      return m.from.includes(cleanPhone) || m.to.includes(cleanPhone);
    });
  }
  res.json(filtered.slice(-limit));
});

app.post('/api/sessions/:wsId/disconnect', auth, async function(req, res) {
  const wsId = req.params.wsId;
  const session = sessions.get(wsId);
  if (session) {
    try {
      await session.client.logout();
      await session.client.destroy();
    } catch (e) {}
    sessions.delete(wsId);
  }
  res.json({ success: true });
});

app.post('/api/disconnect-all', auth, async function(req, res) {
  for (const session of sessions.values()) {
    try {
      await session.client.logout();
      await session.client.destroy();
    } catch (e) {}
  }
  sessions.clear();
  res.json({ success: true });
});

app.use(function(req, res) { res.status(404).json({ error: 'Not found' }); });

app.listen(PORT, function() {
  console.log('Work2U WhatsApp Service on port ' + PORT);
  console.log('API Key: ' + (API_KEY === 'work2u_default_change_me' ? 'CHANGE IT!' : 'configured'));
  console.log('Webhook: ' + (WEBHOOK_URL || 'disabled'));
  if (!fs.existsSync(AUTH_BASE)) fs.mkdirSync(AUTH_BASE, { recursive: true });
});

process.on('SIGTERM', async function() {
  console.log('Shutting down...');
  for (const session of sessions.values()) {
    try { await session.client.destroy(); } catch (e) {}
  }
  process.exit(0);
});
