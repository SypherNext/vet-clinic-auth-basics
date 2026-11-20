// Small helpers that turn values into words for pages and emails.

// 1800000 -> "30 minutes", 86400000 -> "24 hours"
export function formatDuration(ms) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60 || minutes % 60 !== 0) return plural(minutes, 'minute');
  return plural(minutes / 60, 'hour');
}

// plural(1, 'try', 'tries') -> "1 try", plural(3, 'try', 'tries') -> "3 tries"
export function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

// 1762300800000 -> "2026-11-05 09:00" in the server's local time zone
export function formatTime(ms) {
  if (ms === null || ms === undefined) return '';
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
