// TypeScript interfaces for contribution data
export interface ContributionDay {
  date: string;
  count: number;
  color: string;
}

export interface ContributionData {
  username: string;
  total: number;
  streak: number;
  startDate: string;
  endDate: string;
  days: ContributionDay[];
}
