function toCSV(rows) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replaceAll('"', '""');
    if (/[",\n]/.test(s)) return '"' + s + '"';
    return s;
  };
  const header = Object.keys(rows[0] ?? { timestamp: '', query: '', url: '' });
  const lines = [header.join(',')];
  for (const r of rows) lines.push(header.map((h) => esc(r[h])).join(','));
  return lines.join('\n');
}

export class ClickLogger {
  constructor() {
    this.events = [];
    this.sessionId = Math.random().toString(36).slice(2, 10);
    this.startedAt = new Date().toISOString();
  }
  log({ query, url }) {
    this.events.push({
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      query,
      url,
    });
  }
  getCount() { return this.events.length; }
  getCSVBlob() {
    const csv = toCSV(this.events);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }
  downloadCSV(filename = `click_logs_${this.sessionId}.csv`) {
    const blob = this.getCSVBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
