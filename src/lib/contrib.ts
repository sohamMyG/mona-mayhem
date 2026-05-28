export type RawWeek = {
  index: number;
  first_day: string;
  contribution_days: { weekday: number; count: number; level: number }[];
};

export type RawContrib = {
  schema?: string;
  generated_at?: string;
  from?: string;
  to?: string;
  range_days?: number;
  total_contributions?: number;
  private_contributions_included?: boolean;
  colors_full?: string[];
  weeks?: RawWeek[];
  days?: { date: string; count: number; color: string }[];
};

export type Day = { date: string; count: number; color: string };

export type MappedContrib = {
  username: string;
  total: number;
  streak: number;
  startDate: string;
  endDate: string;
  days: Day[];
};

export function mapContributionData(raw: any, username: string): MappedContrib {
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

  const weeks: RawWeek[] = Array.isArray(raw?.weeks) ? raw.weeks : [];
  const colors: string[] = Array.isArray(raw?.colors_full) ? raw.colors_full : [];
  const days: Day[] = [];

  for (const week of weeks) {
    if (!week?.first_day || !Array.isArray(week.contribution_days)) continue;
    const weekStartMs = Date.parse(week.first_day);
    if (Number.isNaN(weekStartMs)) continue;
    for (let i = 0; i < week.contribution_days.length; i++) {
      const day = week.contribution_days[i];
      const date = new Date(weekStartMs + i * 86400000).toISOString().slice(0, 10);
      const count = typeof day?.count === 'number' ? day.count : 0;
      const level = typeof day?.level === 'number' ? day.level : 0;
      days.push({ date, count, color: colors[level] || '#222' });
    }
  }

  let maxStreak = 0;
  let cur = 0;
  for (const d of days) {
    if (d.count > 0) {
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
}
