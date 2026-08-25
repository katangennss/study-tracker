// Schema uses ISO day_of_week: 1 = Monday ... 7 = Sunday.
export function isoDayOfWeek(date: Date): number {
  const jsDay = date.getDay(); // 0 = Sunday ... 6 = Saturday
  return ((jsDay + 6) % 7) + 1;
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatTime(t: string): string {
  return t.slice(0, 5);
}
