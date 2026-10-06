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
  if (pct >= 80) return '#3ECF8E';
  if (pct >= 50) return '#F97B3D';
  if (pct >= 20) return '#F5C842';
  return '#F56565';
}

// ══════════════════════════════════════════════════════════════════
// STORE — localStorage schema
//
// ai_prep_progress         → { topicId: 'mastered'|'reviewing' }
//
// ai_prep_questions        → { "topicId::qIdx": {
//   learnCount, doneCount, revisedCount,
//   lastAction: 'learn'|'done'|'revised'|null,
//   lastDate, chapter, chapter_title, section_id, section_num, q
// }}
//
// ai_prep_daily_YYYY-MM-DD → [
//   { topicId, qIdx, action:'learn'|'done'|'revised',
//     chapter, chapter_title, section_id, section_num, q, ts }
// ]  ← append-only, every tap recorded
// ══════════════════════════════════════════════════════════════════

const Store = {
  _prog_key: 'ai_prep_progress',
  _q_key:    'ai_prep_questions',

  // ── Topic mastered/reviewing ────────────────────────────────
  getProgress() {
    try { return JSON.parse(localStorage.getItem(this._prog_key) || '{}'); } catch { return {}; }
  },
  setProgress(data) { localStorage.setItem(this._prog_key, JSON.stringify(data)); },
  setTopicStatus(topicId, status) {
    const p = this.getProgress();
    if (status === 'none') { delete p[topicId]; } else { p[topicId] = status; }
    this.setProgress(p);
  },

  // ── Question actions ────────────────────────────────────────
  getQuestions() {
    try { return JSON.parse(localStorage.getItem(this._q_key) || '{}'); } catch { return {}; }
  },
  saveQuestions(data) { localStorage.setItem(this._q_key, JSON.stringify(data)); },

  // action = 'learn' | 'done' | 'revised'
  // meta   = { q, chapter, chapter_title, section_id, section_num }
  markQuestion(topicId, qIdx, action, meta) {
    const qs  = this.getQuestions();
    const key = `${topicId}::${qIdx}`;
    if (!qs[key]) {
      qs[key] = {
        learnCount: 0, doneCount: 0, revisedCount: 0,
        lastAction: null, lastDate: null,
        chapter: meta.chapter || 0, chapter_title: meta.chapter_title || '',
        section_id: meta.section_id || '', section_num: meta.section_num || '',
        q: meta.q || ''
      };
    }
    if (action === 'learn')   qs[key].learnCount++;
    if (action === 'done')    qs[key].doneCount++;
    if (action === 'revised') qs[key].revisedCount++;
    qs[key].lastAction = action;
    qs[key].lastDate   = new Date().toISOString().slice(0, 10);
    qs[key].chapter       = meta.chapter       || qs[key].chapter;
    qs[key].chapter_title = meta.chapter_title || qs[key].chapter_title;
    qs[key].q             = meta.q             || qs[key].q;
    this.saveQuestions(qs);
    this._appendDailyLog(topicId, qIdx, action, meta);
  },

  _appendDailyLog(topicId, qIdx, action, meta) {
    const today = new Date().toISOString().slice(0, 10);
    const key   = `ai_prep_daily_${today}`;
    let log = [];
    try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
    log.push({
      topicId, qIdx, action,
      chapter:       meta.chapter       || 0,
      chapter_title: meta.chapter_title || '',
      section_id:    meta.section_id    || '',
      section_num:   meta.section_num   || '',
      q:             meta.q             || '',
      ts:            new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(log));
  },

  getDayLog(date) {
    try { return JSON.parse(localStorage.getItem(`ai_prep_daily_${date}`) || '[]'); } catch { return []; }
  },

  // Last action per question today: { "topicId::qIdx": 'learn'|'done'|'revised' }
  getTodayActions() {
    const log = this.getDayLog(new Date().toISOString().slice(0, 10));
    const out = {};
    log.forEach(e => { out[`${e.topicId}::${e.qIdx}`] = e.action; });
    return out;
  },

  // 90-day summaries oldest→newest
  // { date, learn, done, revised, total, byChapter:{ch:{learn,done,revised,title}} }
  getDailySummaries(days = 90) {
    const today  = new Date();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d    = new Date(today);
      d.setDate(today.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      const log  = this.getDayLog(date);
      if (!log.length) {
        result.push({ date, learn: 0, done: 0, revised: 0, total: 0, byChapter: {} });
        continue;
      }
      // Count unique q+action combos
      const seen = new Set();
      const byChapter = {};
      let learn = 0, done = 0, revised = 0;
      log.forEach(e => {
        const ukey = `${e.topicId}::${e.qIdx}::${e.action}`;
        const ch   = e.chapter || 0;
        if (!byChapter[ch]) byChapter[ch] = { learn: 0, done: 0, revised: 0, title: e.chapter_title || 'General' };
        if (!seen.has(ukey)) {
          seen.add(ukey);
          if (e.action === 'learn')   { learn++;   byChapter[ch].learn++;   }
          if (e.action === 'done')    { done++;    byChapter[ch].done++;    }
          if (e.action === 'revised') { revised++; byChapter[ch].revised++; }
        }
      });
      result.push({ date, learn, done, revised, total: learn + done + revised, byChapter });
    }
    return result;
  },

  // Streak = consecutive days with ≥5 "done" actions
  getStreak() {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const log  = this.getDayLog(d.toISOString().slice(0, 10));
      const doneU = new Set(log.filter(e => e.action === 'done').map(e => `${e.topicId}::${e.qIdx}`)).size;
      if (doneU >= 5) { streak++; } else if (i > 0) break;
    }
    return streak;
  },

  // Most revised = needs most attention
  getMostRevised() {
    const qs = this.getQuestions();
    return Object.entries(qs)
      .filter(([, v]) => v.revisedCount > 0)
      .map(([k, v]) => ({
        key: k, revisedCount: v.revisedCount, doneCount: v.doneCount, learnCount: v.learnCount,
        q: v.q, chapter_title: v.chapter_title,
        topic_id: k.split('::')[0], qIdx: +k.split('::')[1]
      }))
      .sort((a, b) => b.revisedCount - a.revisedCount)
      .slice(0, 15);
  },

  // All-time totals per question (for counters on drill page)
  getQCounts() {
    const qs = this.getQuestions();
    const out = {};
    Object.entries(qs).forEach(([k, v]) => {
      out[k] = { learn: v.learnCount, done: v.doneCount, revised: v.revisedCount, reset: v.resetCount || 0, last: v.lastAction };
    });
    return out;
  },

  // ── Notes ──────────────────────────────────────────────────
  _notes_key: 'ai_prep_notes',
  getNotes() {
    try { return JSON.parse(localStorage.getItem(this._notes_key) || '{}'); } catch { return {}; }
  },
  saveNote(key, text) {
    const notes = this.getNotes();
    if (text.trim() === '') { delete notes[key]; } else { notes[key] = { text, updatedAt: new Date().toISOString() }; }
    localStorage.setItem(this._notes_key, JSON.stringify(notes));
  },
  getNote(key) {
    return this.getNotes()[key] || null;
  }
};

// ── Notes Modal ──────────────────────────────────────────────────
function initNotesModal() {
  if (document.getElementById('notes-modal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
    <div id="notes-modal" style="
      display:none; position:fixed; inset:0; z-index:1000;
      background:rgba(0,0,0,0.65); align-items:center; justify-content:center;">
      <div style="
        background:#1E1C16; border:1px solid #F5C842; border-radius:12px;
        width:min(560px,92vw); max-height:80vh; display:flex; flex-direction:column;
        box-shadow:0 8px 40px rgba(0,0,0,0.7);">
        <div style="padding:16px 20px; border-bottom:1px solid #2E2B22; display:flex; align-items:center; gap:10px;">
          <span style="font-size:16px;">📝</span>
          <div style="flex:1">
            <div id="notes-modal-title" style="font-size:13px;font-weight:700;color:#F0EBE0;"></div>
            <div id="notes-modal-sub" style="font-size:10.5px;color:#8A867A;margin-top:2px;"></div>
          </div>
          <div id="notes-modal-status" style="font-size:10px;color:#8A867A;"></div>
          <button onclick="closeNotesModal()" style="
            background:transparent;border:none;color:#8A867A;font-size:18px;
            cursor:pointer;padding:2px 6px;line-height:1;">×</button>
        </div>
        <textarea id="notes-modal-input" placeholder="Type your notes here… auto-saved as you type." style="
          flex:1; min-height:220px; background:#15130E; border:none; outline:none;
          color:#F0EBE0; font-size:13.5px; font-family:'Inter',sans-serif;
          line-height:1.8; padding:18px 20px; resize:vertical;
          border-radius:0 0 12px 12px;"></textarea>
      </div>
    </div>`;
  document.body.appendChild(el);

  // Auto-save on input with 500ms debounce
  let _debounce;
  document.getElementById('notes-modal-input').addEventListener('input', function() {
    const status = document.getElementById('notes-modal-status');
    status.textContent = 'saving…';
    clearTimeout(_debounce);
    _debounce = setTimeout(() => {
      const key = this.dataset.noteKey;
      if (key) {
        Store.saveNote(key, this.value);
        status.textContent = '✓ saved';
        // Update note indicator on button
        const nb = document.getElementById('nb-' + key.replace('::', '-'));
        if (nb) nb.classList.toggle('has-note', this.value.trim() !== '');
      }
    }, 500);
  });

  // Close on backdrop click
  document.getElementById('notes-modal').addEventListener('click', function(e) {
    if (e.target === this) closeNotesModal();
  });
}

function openNotesModal(key, questionText, subText) {
  initNotesModal();
  const modal    = document.getElementById('notes-modal');
  const textarea = document.getElementById('notes-modal-input');
  const title    = document.getElementById('notes-modal-title');
  const sub      = document.getElementById('notes-modal-sub');
  const status   = document.getElementById('notes-modal-status');

  textarea.dataset.noteKey = key;
  title.textContent  = questionText || 'Note';
  sub.textContent    = subText || '';
  status.textContent = '';

  const existing = Store.getNote(key);
  textarea.value = existing ? existing.text : '';

  modal.style.display = 'flex';
  setTimeout(() => textarea.focus(), 50);
}

function closeNotesModal() {
  const modal = document.getElementById('notes-modal');
  if (modal) modal.style.display = 'none';
}

// Close on Escape key
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNotesModal(); });

// ── Navbar ───────────────────────────────────────────────────────
function renderNavbar(activePage) {
  const nav = document.getElementById('navbar');
  if (!nav) return;

  const p        = Store.getProgress();
  const mastered = Object.values(p).filter(v => v === 'mastered').length;
  const total    = window.TOTAL_TOPICS || 0;
  const pct      = total ? Math.round(mastered / total * 100) : 0;

  const today    = new Date().toISOString().slice(0, 10);
  const log      = Store.getDayLog(today);
  const doneU    = new Set(log.filter(e => e.action === 'done').map(e => `${e.topicId}::${e.qIdx}`)).size;
  const revU     = new Set(log.filter(e => e.action === 'revised').map(e => `${e.topicId}::${e.qIdx}`)).size;
  const learnU   = new Set(log.filter(e => e.action === 'learn').map(e => `${e.topicId}::${e.qIdx}`)).size;

  const BASE = window.BASE_PATH || '';

  nav.innerHTML = `
    <div class="navbar-brand">🎯 AI Prep Hub</div>
    <div class="navbar-links">
      <a href="${BASE}index.html"     class="nav-link ${activePage === 'home'      ? 'active' : ''}">🏠 Study</a>
      <a href="${BASE}questions.html" class="nav-link ${activePage === 'questions' ? 'active' : ''}">📖 Drill</a>
      <a href="${BASE}dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">📊 Dashboard</a>
      <a href="${BASE}notes.html"     class="nav-link ${activePage === 'notes'     ? 'active' : ''}">📝 Notes</a>
    </div>
    <div class="nav-progress-pill">
      <span title="Learned today"  style="color:var(--blue)">📖 <strong>${learnU}</strong></span>
      <span title="Done today"     style="color:var(--green)">✅ <strong>${doneU}</strong></span>
      <span title="Revised today"  style="color:var(--orange)">🔁 <strong>${revU}</strong></span>
      <span style="color:var(--border)">│</span>
      <strong style="color:var(--gold)">${pct}%</strong>
      <div class="nav-mini-bar"><div class="nav-mini-fill" style="width:${pct}%"></div></div>
    </div>`;
}
