// Mona Mayhem Battle Page JS
const p1 = document.getElementById('player1');
const p2 = document.getElementById('player2');
const btn = document.getElementById('battle');
const results = document.getElementById('results');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');

function showError(msg, invalidInputs) {
  errorDiv.textContent = msg;
  errorDiv.classList.add('is-active');
  document.body.classList.add('has-error');
  // Clear previous input-error states
  [p1, p2].forEach(function(el) {
    el.classList.remove('input-error');
    el.removeAttribute('aria-invalid');
  });
  // Mark and focus the first invalid input
  if (Array.isArray(invalidInputs) && invalidInputs.length > 0) {
    invalidInputs.forEach(function(el) {
      el.classList.add('input-error');
      el.setAttribute('aria-invalid', 'true');
    });
    invalidInputs[0].focus({ preventScroll: true });
  }
}
function clearError() {
  errorDiv.textContent = '';
  errorDiv.classList.remove('is-active');
  document.body.classList.remove('has-error');
  [p1, p2].forEach(function(el) {
    el.classList.remove('input-error');
    el.removeAttribute('aria-invalid');
  });
}
function showLoading(show) {
  loadingDiv.style.display = show ? '' : 'none';
  document.body.setAttribute('aria-busy', show ? 'true' : 'false');
}

const MS_PER_DAY = 86400000;

function buildDaysFromWeeks(raw) {
  const weeks = Array.isArray(raw?.weeks) ? raw.weeks : [];
  const colors = Array.isArray(raw?.colors_full) ? raw.colors_full : [];
  const days = [];
  for (const week of weeks) {
    if (!week?.first_day || !Array.isArray(week.contribution_days)) continue;
    const weekStartMs = Date.parse(week.first_day);
    if (Number.isNaN(weekStartMs)) continue;
    for (let i = 0; i < week.contribution_days.length; i++) {
      const day = week.contribution_days[i];
      const date = new Date(weekStartMs + i * MS_PER_DAY).toISOString().slice(0, 10);
      const count = typeof day?.count === 'number' ? day.count : 0;
      const level = typeof day?.level === 'number' ? day.level : 0;
      days.push({
        date,
        count,
        color: colors[level] || '#222',
      });
    }
  }
  return days;
}

function computeStreak(days) {
  let max = 0;
  let cur = 0;
  for (const day of days) {
    if (day.count > 0) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

function normalizeContribData(raw, fallbackUsername) {
  if (!raw || typeof raw !== 'object') {
    return { username: fallbackUsername || '', total: 0, streak: 0, startDate: '', endDate: '', days: [] };
  }
  const days = Array.isArray(raw.days) ? raw.days : buildDaysFromWeeks(raw);
  const total = typeof raw.total === 'number'
    ? raw.total
    : (typeof raw.total_contributions === 'number'
      ? raw.total_contributions
      : days.reduce((sum, day) => sum + (typeof day.count === 'number' ? day.count : 0), 0));
  const streak = typeof raw.streak === 'number' ? raw.streak : computeStreak(days);
  const startDate = raw.startDate || raw.from || days[0]?.date || '';
  const endDate = raw.endDate || raw.to || days[days.length - 1]?.date || '';
  return {
    username: raw.username || fallbackUsername || '',
    total,
    streak,
    startDate,
    endDate,
    days,
  };
}

/**
 * @typedef {Object} ContributionDay
 * @property {string} date
 * @property {number} count
 * @property {string} color
 *
 * @typedef {Object} ContributionData
 * @property {string} username
 * @property {number} total
 * @property {number} streak
 * @property {string} startDate
 * @property {string} endDate
 * @property {ContributionDay[]} days
 */
function getAstroCid() {
  if (typeof document === 'undefined') return null;
  const body = document.body;
  if (!body) return null;
  const names = body.getAttributeNames ? body.getAttributeNames() : Array.from(body.attributes).map(a => a.name);
  for (const name of names) {
    if (name.startsWith('data-astro-cid')) return { name, value: body.getAttribute(name) };
  }
  const fallback = document.querySelector('.battle-container');
  if (fallback) {
    for (const n of fallback.getAttributeNames()) {
      if (n.startsWith('data-astro-cid')) return { name: n, value: fallback.getAttribute(n) };
    }
  }
  return null;
}

function buildGridElement(contribs) {
  const cid = getAstroCid();
  const container = document.createElement('div');
  container.className = 'contrib-grid';
  if (cid) container.setAttribute(cid.name, cid.value);
  (contribs.days || []).forEach(function(day) {
    const cell = document.createElement('div');
    cell.className = 'contrib-cell';
    if (cid) cell.setAttribute(cid.name, cid.value);
    cell.style.background = day.color || '#222';
    cell.title = day.date + ': ' + day.count;
    container.appendChild(cell);
  });
  return container;
}

function buildStatsElement(contribs) {
  const cid = getAstroCid();
  const el = document.createElement('div');
  if (cid) el.setAttribute(cid.name, cid.value);
  const strong = document.createElement('strong');
  strong.textContent = contribs.username || '';
  el.appendChild(strong);
  el.appendChild(document.createElement('br'));
  el.insertAdjacentHTML('beforeend', 'Total: ' + (contribs.total || 0) + '<br>Streak: ' + (contribs.streak || 0) + '<br>' + (contribs.startDate || '') + ' to ' + (contribs.endDate || ''));
  return el;
}

function buildPlayerElement(contribs) {
  const cid = getAstroCid();
  const player = document.createElement('div');
  player.className = 'player';
  if (cid) player.setAttribute(cid.name, cid.value);
  const statsEl = buildStatsElement(contribs);
  const gridEl = buildGridElement(contribs);
  player.appendChild(statsEl);
  player.appendChild(gridEl);
  return player;
}

async function battle() {
  clearError();
  results.innerHTML = '';
  const u1 = p1.value.trim();
  const u2 = p2.value.trim();
  if (!u1 || !u2) {
    const invalid = [];
    if (!u1) invalid.push(p1);
    if (!u2) invalid.push(p2);
    showError('Please provide both GitHub usernames.', invalid);
    return;
  }
  showLoading(true);
  try {
    const [r1, r2] = await Promise.all([
      fetch(`/api/contributions/${encodeURIComponent(u1)}`, { cache: 'no-store' }),
      fetch(`/api/contributions/${encodeURIComponent(u2)}`, { cache: 'no-store' })
    ]);
    if (!r1.ok || !r2.ok) {
      showError('Failed to fetch contribution data.');
      showLoading(false);
      return;
    }
    const [c1, c2] = await Promise.all([r1.json(), r2.json()]);
    const n1 = normalizeContribData(c1, u1);
    const n2 = normalizeContribData(c2, u2);
    // Build DOM nodes with Astro scope attribute so scoped CSS applies
    results.innerHTML = '';
    const playerEl1 = buildPlayerElement(n1);
    const vsEl = document.createElement('div');
    vsEl.className = 'vs-badge';
    const cid = getAstroCid();
    if (cid) vsEl.setAttribute(cid.name, cid.value);
    vsEl.textContent = 'VS';
    const playerEl2 = buildPlayerElement(n2);
    results.appendChild(playerEl1);
    results.appendChild(vsEl);
    results.appendChild(playerEl2);
  } catch (e) {
    showError('Error: ' + e.message);
  }
  showLoading(false);
}

btn.addEventListener('click', battle);
[p1, p2].forEach(input => input.addEventListener('keydown', e => {
  if (e.key === 'Enter') battle();
}));
