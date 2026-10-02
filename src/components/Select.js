'use client';

import { useEffect, useRef, useState } from 'react';

// Dropdown kustom bertema. options: array of [value,label] atau {value,label}.
// onChange menerima value langsung (bukan event).
export default function Select({ value, onChange, options = [], placeholder = 'Pilih…', className = '' }) {
  const norm = options.map((o) => (Array.isArray(o) ? { value: o[0], label: o[1] } : o));
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const cur = norm.find((o) => String(o.value) === String(value));

  function toggle() {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setUp(window.innerHeight - r.bottom < 260); // buka ke atas bila ruang bawah sempit
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={toggle}
        className={`w-full flex items-center justify-between gap-2 border rounded-xl px-3 py-2 text-sm bg-white text-left transition
          ${open ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200 hover:border-indigo-200'}`}>
        <span className={`truncate ${cur ? 'text-slate-800' : 'text-slate-400'}`}>{cur ? cur.label : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B5FEF" strokeWidth="2.5"
             strokeLinecap="round" strokeLinejoin="round"
             className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={`absolute z-50 w-full bg-white border border-slate-100 rounded-xl shadow-soft p-1 max-h-60 overflow-auto
                         ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {norm.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Tidak ada pilihan</div>}
          {norm.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <button key={String(o.value)} type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition
                  ${active ? 'bg-brand text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                <span className="truncate">{o.label}</span>
                {active && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
