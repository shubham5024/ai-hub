// ── Static helpers — no server needed, GitHub Pages compatible ──

function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderDeepText(text) {
  const lines = text.split('\n');
  let html = '', buf = '';
  const flush = () => { if (buf.trim()) { html += `<pre>${escHtml(buf)}</pre>`; } buf = ''; };
  for (const line of lines) {
    if (line.startsWith('  ') || line.startsWith('\t')) {
      buf += (buf ? '\n' : '') + line;
    } else {
      flush();
      html += line.trim() ? `<p>${escHtml(line)}</p>` : '<br/>';
    }
  }
  flush();
  return html;
}

function getReadinessColor(pct) {
  if (pct >= 80) return '#34D399';
  if (pct >= 50) return '#FB923C';
  if (pct >= 20) return '#FBBF24';
  return '#F87171';
}

function getReadinessLabel(pct) {
  if (pct >= 80) return '🟢 Interview Ready';
  if (pct >= 50) return '🟡 Getting there';
  if (pct >= 20) return '🟠 Needs work';
  return '🔴 Just beginning';
}

// ── LocalStorage persistence ────────────────────────────────────
const Store = {
  _key: 'ai_prep_progress',
  _scores_key: 'ai_prep_scores',

  // Topic status: 'mastered' | 'reviewing' | undefined
  getProgress() {
    try { return JSON.parse(localStorage.getItem(this._key) || '{}'); } catch { return {}; }
  },
  setProgress(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },
  setTopicStatus(topicId, status) {
    const p = this.getProgress();
    if (status === 'none') { delete p[topicId]; } else { p[topicId] = status; }
    this.setProgress(p);
  },

  // Drill scores: key = "topicId::qIdx" → { score, date }
  getScores() {
    try { return JSON.parse(localStorage.getItem(this._scores_key) || '{}'); } catch { return {}; }
  },
  setScore(topicId, qIdx, score, qText) {
    const s = this.getScores();
    s[`${topicId}::${qIdx}`] = { score, date: new Date().toISOString().slice(0, 10), q: qText };
    localStorage.setItem(this._scores_key, JSON.stringify(s));
  },
  getTodayScores() {
    const today = new Date().toISOString().slice(0, 10);
    const all   = this.getScores();
    const out   = {};
    Object.entries(all).forEach(([k, v]) => {
      if (v.date === today) out[k] = v.score;
    });
    return out;
  },
  getAllScores() {
    const all = this.getScores();
    const out = {};
    Object.entries(all).forEach(([k, v]) => { out[k] = v.score; });
    return out;
  },
  getDailyActivity() {
    const all  = this.getScores();
    const days = {};
    Object.values(all).forEach(v => {
      if (!days[v.date]) days[v.date] = { total: 0, sumScore: 0 };
      days[v.date].total++;
      days[v.date].sumScore += v.score;
    });
    return Object.entries(days)
      .map(([day, d]) => ({ day, total_reviewed: d.total, avg_score: +(d.sumScore / d.total).toFixed(2) }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
  getStreak() {
    const daily = this.getDailyActivity();
    const today = new Date();
    let streak  = 0;
    for (let i = 0; i < 365; i++) {
      const d   = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = daily.find(x => x.day === key);
      if (row && row.total_reviewed >= 5) { streak++; } else if (i > 0) break;
    }
    return streak;
  },
  getWeakSpots() {
    const all = this.getScores();
    const agg = {};
    Object.entries(all).forEach(([k, v]) => {
      if (!agg[k]) agg[k] = { sum: 0, count: 0, q: v.q || '' };
      agg[k].sum   += v.score;
      agg[k].count++;
    });
    return Object.entries(agg)
      .map(([k, v]) => ({
        key: k, avg_score: +(v.sum / v.count).toFixed(1),
        attempts: v.count, question_text: v.q,
        topic_id: k.split('::')[0], question_index: +k.split('::')[1]
      }))
      .filter(x => x.avg_score < 3)
      .sort((a, b) => a.avg_score - b.avg_score)
      .slice(0, 10);
  }
};

// ── Navbar renderer ─────────────────────────────────────────────
function renderNavbar(activePage) {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  // Read progress for the pill
  const p       = Store.getProgress();
  const mastered = Object.values(p).filter(v => v === 'mastered').length;
  const total    = window.TOTAL_TOPICS || 0;
  const pct      = total ? Math.round(mastered / total * 100) : 0;

  const BASE = window.BASE_PATH || '';

  nav.innerHTML = `
    <div class="navbar-brand">🎯 AI Prep Hub</div>
    <div class="navbar-links">
      <a href="${BASE}index.html"      class="nav-link ${activePage === 'home'      ? 'active' : ''}">🏠 Study</a>
      <a href="${BASE}questions.html"  class="nav-link ${activePage === 'questions' ? 'active' : ''}">❓ Drill</a>
      <a href="${BASE}dashboard.html"  class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
    </div>
    <div class="nav-progress-pill">
      <span><strong>${mastered}</strong>/${total} mastered</span>
      <div class="nav-mini-bar"><div class="nav-mini-fill" style="width:${pct}%"></div></div>
      <span><strong>${pct}%</strong></span>
    </div>`;
}
