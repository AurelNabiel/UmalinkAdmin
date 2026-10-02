'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui';

const STATUSES = ['hadir', 'izin', 'sakit', 'alpha'];
const SC = { hadir: '#22C55E', izin: '#F59E0B', sakit: '#3B82F6', alpha: '#EF4444', pending: '#94a3b8' };

// Absensi kegiatan dari dashboard: lihat roster + tandai manual.
export default function RosterModal({ activityId, title, onClose }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('activity_roster', { p_activity_id: activityId });
    setRows(data || []);
  }, [activityId]);
  useEffect(() => { load(); }, [load]);

  async function mark(userId, status) {
    setBusyId(userId);
    const { error } = await supabase.rpc('mark_attendance_manual', {
      p_activity_id: activityId, p_user_id: userId, p_status: status,
    });
    setBusyId(null);
    if (error) { alert('Gagal: ' + error.message); return; }
    load();
  }

  const counts = useMemo(() => {
    const c = { hadir: 0, izin: 0, sakit: 0, alpha: 0, belum: 0 };
    (rows || []).forEach((r) => { if (r.status) c[r.status] = (c[r.status] || 0) + 1; else c.belum++; });
    return c;
  }, [rows]);

  const shown = (rows || []).filter((r) => (r.full_name || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg">Absensi — {title}</h3>
              <div className="flex gap-2 mt-2 flex-wrap text-xs">
                {['hadir', 'izin', 'sakit', 'alpha'].map((s) => (
                  <span key={s} className="badge" style={{ background: SC[s] + '1a', color: SC[s] }}>{s} {counts[s]}</span>
                ))}
                <span className="badge bg-slate-100 text-slate-500">belum {counts.belum}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
          </div>
          <input className="input mt-3" placeholder="Cari anggota…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="overflow-y-auto p-3">
          {!rows ? <Spinner /> : shown.length === 0 ? (
            <p className="text-sm text-slate-400 p-4 text-center">Tidak ada anggota.</p>
          ) : shown.map((r) => (
            <div key={r.member_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{r.full_name || '-'}</div>
                <div className="text-xs" style={{ color: SC[r.status] || '#94a3b8' }}>{r.status || 'belum absen'}</div>
              </div>
              <div className="flex gap-1">
                {STATUSES.map((s) => (
                  <button key={s} disabled={busyId === r.member_id} onClick={() => mark(r.member_id, s)}
                    title={s}
                    className={`w-7 h-7 rounded-lg text-[10px] font-bold uppercase transition
                      ${r.status === s ? 'text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                    style={r.status === s ? { background: SC[s] } : {}}>
                    {s[0]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
