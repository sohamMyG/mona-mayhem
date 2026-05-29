import type { APIRoute } from 'astro';

export const prerender = false;

// TODO: Implement the GET handler for fetching GitHub contribution data
// Endpoint: https://github.com/{username}.contribs
import { promises as fs } from 'fs';
import path from 'path';

const mapContributionData = (raw: any, username: string) => {
  if (raw && Array.isArray(raw.days)) {
    return {
      username: raw.username || username,
      total: typeof raw.total === 'number' ? raw.total : 0,
      streak: typeof raw.streak === 'number' ? raw.streak : 0,
      startDate: raw.startDate || '',
      endDate: raw.endDate || '',
      days: raw.days,
    };
  }

  const weeks = Array.isArray(raw?.weeks) ? raw.weeks : [];
  const colors = Array.isArray(raw?.colors_full) ? raw.colors_full : [];
  const days = [];

  for (const week of weeks) {
    if (!week?.first_day || !Array.isArray(week.contribution_days)) continue;
    const weekStartMs = Date.parse(week.first_day);
    if (Number.isNaN(weekStartMs)) continue;
    for (let i = 0; i < week.contribution_days.length; i++) {
      const day = week.contribution_days[i];
      const date = new Date(weekStartMs + i * 86400000).toISOString().slice(0, 10);
      const count = typeof day?.count === 'number' ? day.count : 0;
      const level = typeof day?.level === 'number' ? day.level : 0;
      days.push({
        date,
        count,
        color: colors[level] || '#222',
      });
    }
  }

  let maxStreak = 0;
  let cur = 0;
  for (const day of days) {
    if (day.count > 0) {
      cur++;
      if (cur > maxStreak) maxStreak = cur;
    } else {
      cur = 0;
    }
  }

  return {
    username,
    total: typeof raw?.total_contributions === 'number' ? raw.total_contributions : 0,
    streak: maxStreak,
    startDate: days[0]?.date || raw?.from || '',
    endDate: days[days.length - 1]?.date || raw?.to || '',
    days,
  };
};

export const GET: APIRoute = async ({ params }) => {
  const username = params?.username;
  if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9-]{1,39}$/.test(username)) {
    return new Response(JSON.stringify({ error: 'Invalid username' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cacheDir = path.resolve(process.cwd(), 'cache');
  const cacheFile = path.join(cacheDir, `${username}.json`);
  const CACHE_TTL = 1000 * 60 * 60; // 1 hour

  try {
    await fs.mkdir(cacheDir, { recursive: true });
    // Check cache
    let cached = null;
    try {
      const stat = await fs.stat(cacheFile);
      if (Date.now() - stat.mtimeMs < CACHE_TTL) {
        const data = await fs.readFile(cacheFile, 'utf-8');
        cached = JSON.parse(data);
        const mapped = mapContributionData(cached, username);
        if (!cached?.days || !Array.isArray(cached.days)) {
          await fs.writeFile(cacheFile, JSON.stringify(mapped), 'utf-8');
        }
        return new Response(JSON.stringify(mapped), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      console.error('Cache read error for ' + cacheFile, e);
    }
    // Fetch from GitHub
    const res = await fetch(`https://github.com/${username}.contribs`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'GitHub fetch failed', status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const ctype = res.headers.get('content-type') || '';
    let json;
    if (ctype.includes('application/json')) {
      try {
        json = await res.json();
      } catch (parseErr) {
        console.error('Failed to parse JSON from upstream for', username, parseErr);
        return new Response(JSON.stringify({ error: 'Invalid upstream JSON' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    } else {
      console.error('Upstream did not return JSON for', username, 'content-type:', ctype);
      return new Response(JSON.stringify({ error: 'Upstream did not return JSON', status: res.status }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }
    const mapped = mapContributionData(json, username);
    await fs.writeFile(cacheFile, JSON.stringify(mapped), 'utf-8');
    return new Response(JSON.stringify(mapped), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Contribution API error for', username, err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
