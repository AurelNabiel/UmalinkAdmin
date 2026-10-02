'use client';

import { divisionLabel } from '@/lib/constants';
import { METHODS } from '@/lib/constants';

const DOW = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MON = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;

function statusInfo(a) {
  const now = new Date(), s = new Date(a.start_time), e = a.end_time ? new Date(a.end_time) : s;
  if (now >= s && now <= e) return ['Berlangsung', '#22C55E'];
  if (now < s) return ['Mendatang', '#F59E0B'];
  return ['Selesai', '#94a3b8'];
}

// Detail kegiatan + aksi (Absen / QR / Hapus).
export default function ActivityDetailModal({ a, hadir, total, onClose, onAbsen, onQr, onDelete }) {
  const s = new Date(a.start_time);
  const e = a.end_time ? new Date(a.end_time) : null;
  const tgl = `${DOW[s.getDay()]}, ${s.getDate()} ${MON[s.getMonth()]} ${s.getFullYear()}`;
  const jam = e ? `${hhmm(s)}–${hhmm(e)}` : hhmm(s);
  const [stLabel, stColor] = statusInfo(a);
  const allowsQr = a.method === 'qr' || a.method === 'any';
  const pct = total > 0 ? Math.min(Math.round(((hadir || 0) / total) * 100), 100) : 0;
  const metode = METHODS.find((m) => m[0] === a.method)?.[1] || a.method;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-md p-6 animate-fade-up" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="badge bg-brand-light text-brand-dark">{divisionLabel(a.division)}</span>
            <h3 className="text-xl font-bold mt-2">{a.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {a.description && <p className="text-sm text-slate-600 mt-3">{a.description}</p>}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <Info label="Tanggal" value={tgl} />
          <Info label="Waktu" value={jam} />
          <Info label="Metode absen" value={metode} />
          <Info label="Status" value={stLabel} color={stColor} />
        </div>

        {total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Kehadiran</span><span className="font-semibold">{hadir || 0}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#5B5FEF' }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-5">
          <button onClick={onAbsen} className="btn-brand flex-1">Absen</button>
          {allowsQr && <button onClick={onQr} className="btn-ghost flex-1">Tampilkan QR</button>}
          {onDelete && (
            <button onClick={onDelete} className="py-2.5 px-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100">Hapus</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, color }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-semibold text-sm mt-0.5" style={color ? { color } : {}}>{value}</div>
    </div>
  );
}
