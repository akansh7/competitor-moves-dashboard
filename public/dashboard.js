/* ── WebSocket connection ─────────────────────────────────── */
const WS_URL = `ws://${location.host}`;
let ws;
let reconnectTimer;

function connect() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    setStatus(true);
    clearTimeout(reconnectTimer);
  };

  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.type === 'init') {
      renderAll(msg.entries);
    } else if (msg.type === 'new_entry') {
      prependEntry(msg.entry);
      updateStats();
    } else if (msg.type === 'clear') {
      renderAll([]);
    }
  };

  ws.onclose = () => {
    setStatus(false);
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onerror = () => ws.close();
}

function setStatus(connected) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = 'status-dot' + (connected ? ' connected' : '');
  txt.textContent = connected ? 'Live' : 'Reconnecting…';
}

/* ── Rendering ────────────────────────────────────────────── */
const feed = document.getElementById('feed');

function renderAll(entries) {
  feed.innerHTML = '';
  if (entries.length === 0) {
    feed.appendChild(makeEmptyState());
  } else {
    entries.forEach(e => feed.appendChild(makeCard(e)));
  }
  updateStats(entries);
}

function prependEntry(entry) {
  const empty = document.getElementById('emptyState');
  if (empty) empty.remove();
  feed.insertBefore(makeCard(entry), feed.firstChild);
}

function makeEmptyState() {
  const el = document.createElement('div');
  el.className = 'empty-state';
  el.id = 'emptyState';
  el.innerHTML = `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" stroke-width="2"/>
      <path d="M20 28h24M20 36h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="48" cy="16" r="8" fill="url(#eGrad2)" stroke="white" stroke-width="2"/>
      <path d="M48 12v4l2 2" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      <defs>
        <linearGradient id="eGrad2" x1="40" y1="8" x2="56" y2="24" gradientUnits="userSpaceOnUse">
          <stop stop-color="#6366f1"/><stop offset="1" stop-color="#8b5cf6"/>
        </linearGradient>
      </defs>
    </svg>
    <h3>No intel yet</h3>
    <p>POST a report to <code>/api/report</code> and it will appear here instantly.</p>
    <button class="btn-primary" onclick="showApiDocs()">View API Docs</button>
  `;
  return el;
}

function makeCard(entry) {
  const threat = entry.competitive_threat_level || 'Unknown';
  const card = document.createElement('div');
  card.className = `report-card threat-${threat}`;
  card.dataset.threat = threat.toLowerCase();

  const skills = Array.isArray(entry.key_skills_emerging) ? entry.key_skills_emerging : [];
  const titles = Array.isArray(entry.top_job_titles) ? entry.top_job_titles : [];

  card.innerHTML = `
    <div class="card-header">
      <div class="card-headline">${esc(entry.strategic_headline)}</div>
      <div class="card-meta">
        <span class="threat-badge ${threat}">${threat} Threat</span>
        <span class="card-time">${formatTime(entry.received_at)}</span>
      </div>
    </div>

    <div class="card-body">
      <div class="card-section">
        <div class="section-label">What They're Building</div>
        <div class="section-text">${esc(entry.what_they_are_building)}</div>
      </div>

      <div class="card-section">
        <div class="section-label">Team Growth Signals</div>
        <div class="section-text">${esc(entry.team_growth_signals)}</div>
      </div>

      <div class="card-section full-width">
        <div class="section-label">Threat Rationale</div>
        <div class="rationale-box">${esc(entry.threat_rationale)}</div>
      </div>

      <div class="card-section full-width">
        <div class="section-label">Recommended Action</div>
        <div class="action-box">
          <svg class="action-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/>
          </svg>
          <div class="section-text">${esc(entry.recommended_action)}</div>
        </div>
      </div>

      ${skills.length > 0 ? `
      <div class="card-section">
        <div class="section-label">Key Skills Emerging</div>
        <div class="tags">
          ${skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      ${titles.length > 0 ? `
      <div class="card-section">
        <div class="section-label">Top Job Titles</div>
        <div class="tags">
          ${titles.map(t => `<span class="tag job">${esc(t)}</span>`).join('')}
        </div>
      </div>
      ` : ''}
    </div>
  `;

  return card;
}

/* ── Stats ────────────────────────────────────────────────── */
function updateStats(entries) {
  const cards = entries
    ? entries
    : [...feed.querySelectorAll('.report-card')].map(c => ({ competitive_threat_level: capitalize(c.dataset.threat) }));

  const total = cards.length;
  const high   = cards.filter(e => (e.competitive_threat_level || '').toLowerCase() === 'high').length;
  const medium = cards.filter(e => (e.competitive_threat_level || '').toLowerCase() === 'medium').length;
  const low    = cards.filter(e => (e.competitive_threat_level || '').toLowerCase() === 'low').length;

  document.getElementById('totalPill').textContent = `${total} report${total !== 1 ? 's' : ''}`;
  document.getElementById('statTotal').textContent  = total;
  document.getElementById('statHigh').textContent   = high;
  document.getElementById('statMedium').textContent = medium;
  document.getElementById('statLow').textContent    = low;

  const statsRow = document.getElementById('statsRow');
  statsRow.style.display = total > 0 ? 'grid' : 'none';
}

/* ── Modal ────────────────────────────────────────────────── */
function showApiDocs() {
  document.getElementById('modalOverlay').classList.add('open');
}

function hideApiDocs() {
  document.getElementById('modalOverlay').classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideApiDocs();
});

/* ── Clear all ────────────────────────────────────────────── */
async function clearAll() {
  if (!confirm('Clear all reports?')) return;
  await fetch('/api/reports', { method: 'DELETE' });
}

/* ── Helpers ──────────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ── Init ─────────────────────────────────────────────────── */
connect();
