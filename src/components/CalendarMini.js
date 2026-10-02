'use client';

import { useMemo, useState } from 'react';

const DOW = ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'];
const MON = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Kalender bulanan: menandai tanggal yang punya kegiatan, bisa pilih tanggal.
export default function CalendarMini({ marked = new Set(), selected = null, onSelect }) {
  const base = selected ? new Date(selected) : new Date();
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1));
  const todayKey = key(new Date());

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = first.getDay(); // 0=Minggu
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < start; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(view.getFullYear(), view.getMonth(), d));
    return arr;
  }, [view]);

  function move(delta) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">{MON[view.getMonth()]} {view.getFullYear()}</div>
        <div className="flex gap-1">
          <button onClick={() => move(-1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500">‹</button>
          <button onClick={() => move(1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 grid place-items-center text-slate-500">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => <div key={d} className="text-[11px] text-slate-400 font-medium py-1">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = key(d);
          const has = marked.has(k);
          const isSel = selected === k;
          const isToday = todayKey === k;
          return (
            <button key={i} onClick={() => onSelect && onSelect(isSel ? null : k)}
              className={`relative h-9 rounded-lg text-sm transition grid place-items-center
                ${isSel ? 'bg-brand text-white font-semibold'
                  : has ? 'bg-brand-light/60 text-brand-dark font-medium hover:bg-brand-light'
                  : 'hover:bg-slate-100 text-slate-600'}
                ${isToday && !isSel ? 'ring-1 ring-brand/40' : ''}`}>
              {d.getDate()}
              {has && !isSel && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>
      {selected && (
        <button onClick={() => onSelect && onSelect(null)} className="mt-2 text-xs text-brand font-medium hover:underline">
          Tampilkan semua tanggal
        </button>
      )}
    </div>
  );
}

export { key as dateKey };
