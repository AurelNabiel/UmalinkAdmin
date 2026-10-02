export const ROLES = ['anggota', 'petugas', 'admin', 'superadmin'];

export const DIVISIONS = [
  ['', 'Umum'],
  ['dance_cover', 'Dance Cover'],
  ['kasei', 'Kasei'],
  ['manga', 'Manga'],
];

export const METHODS = [
  ['any', 'Semua'],
  ['qr', 'QR'],
  ['location', 'Lokasi'],
  ['manual', 'Manual'],
];

export const PRIOS = [
  ['low', 'Rendah'],
  ['medium', 'Sedang'],
  ['high', 'Tinggi'],
];

export function divisionLabel(v) {
  const f = DIVISIONS.find((d) => d[0] === (v || ''));
  return f ? f[1] : 'Umum';
}

export function fmtIDR(n) {
  const v = Number(n || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(v);
}

export function fmtDate(s) {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return s;
  }
}
