'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { fmtDate } from '@/lib/constants';

const AREAS = [
  ['', 'Semua', '#5B5FEF'],
  ['keuangan', 'Keuangan', '#22C55E'],
  ['anggota', 'Anggota', '#3B82F6'],
  ['kegiatan', 'Kegiatan', '#22D3EE'],
  ['tugas', 'Tugas', '#F59E0B'],
  ['merch', 'Merch', '#EC4899'],
  ['poin', 'Poin', '#8B5CF6'],
];

const areaColor = (a) => (AREAS.find((x) => x[0] === a)?.[2]) || '#64748b';
const areaLabel = (a) => (AREAS.find((x) => x[0] === a)?.[1]) || a;

export default function AuditPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [area, setArea] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    const { data, error } = await supabase.rpc('admin_audit_log', {
      p_area: area || null, p_search: q || null, p_limit: 300,
    });
    if (error) { setErr(error.message); return; }
    setErr(''); setRows(data || []);
  }, [area, q]);

  useEffect(() => { load(); }, [area]); // eslint-disable-line
  // debounce search
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {AREAS.map(([v, l, c]) => (
            <button key={v} onClick={() => setArea(v)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition border
                ${area === v ? 'text-white shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              style={area === v ? { background: c, borderColor: c } : {}}>
              {l}
            </button>
          ))}
          <input className="input max-w-xs ml-auto" placeholder="Cari aksi / nama / detail…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {err ? <ErrorBox>{err}</ErrorBox> : !rows ? <Spinner /> : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Aktivitas</h3>
            <span className="text-sm text-slate-400">{rows.length} catatan</span>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada aktivitas.</p>
          ) : (
            <div className="relative pl-5">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
              {rows.map((r) => (
                <div key={r.id} className="relative mb-4">
                  <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white"
                       style={{ background: areaColor(r.area) }} />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <span className="badge mr-2" style={{ background: areaColor(r.area) + '1a', color: areaColor(r.area) }}>
                        {areaLabel(r.area)}
                      </span>
                      <span className="font-medium">{r.action}</span>
                      {r.detail && <span className="text-slate-400"> · {r.detail}</span>}
                    </div>
                    {r.amount != null && <div className="text-sm font-semibold text-slate-600">{r.amount}</div>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{r.actor_name || 'Sistem'} · {fmtDate(r.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
