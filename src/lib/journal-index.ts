/** Counts describe records, not attachment totals; a mixed record can match both media types. */
export interface JournalIndexMonth {
  month: string;
  count: number;
  photos: number;
  videos: number;
  texts: number;
}

export interface JournalIndex {
  scope: "mine" | "public";
  timeZone: "Asia/Shanghai";
  months: JournalIndexMonth[];
  availableYears: number[];
  total: number;
  photos: number;
  videos: number;
  texts: number;
}
