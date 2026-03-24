const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store — replace with a DB for persistence
let entries = [];

// Broadcast to all connected WebSocket clients
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// POST /api/report — receive new competitor intel
app.post('/api/report', (req, res) => {
  const required = [
    'strategic_headline',
    'what_they_are_building',
    'team_growth_signals',
    'competitive_threat_level',
    'threat_rationale',
    'recommended_action',
    'key_skills_emerging',
    'top_job_titles',
  ];

  for (const field of required) {
    if (req.body[field] === undefined) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  const entry = {
    id: Date.now(),
    received_at: new Date().toISOString(),
    ...req.body,
  };

  entries.unshift(entry); // newest first
  broadcast({ type: 'new_entry', entry });
  res.status(201).json({ success: true, id: entry.id });
});

// GET /api/reports — return all stored reports
app.get('/api/reports', (req, res) => {
  res.json(entries);
});

// DELETE /api/reports — clear all reports
app.delete('/api/reports', (req, res) => {
  entries = [];
  broadcast({ type: 'clear' });
  res.json({ success: true });
});

wss.on('connection', ws => {
  // Send current state to new client
  ws.send(JSON.stringify({ type: 'init', entries }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Competitor Moves Dashboard running at http://localhost:${PORT}`);
});
