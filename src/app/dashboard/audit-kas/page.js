'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { fmtIDR, fmtDate } from '@/lib/constants';

// Audit khusus keuangan/kas — terpisah dari audit kegiatan.
export default function AuditKasPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_audit_log', {
      p_area: 'keuangan', p_search: q || null, p_limit: 300,
    });
    if (error) { setErr(error.message); return; }
    setErr(''); setRows(data || []);
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, load]);

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-2 flex-wrap">
        <div className="font-semibold">Audit Kas</div>
        <input className="input max-w-xs ml-auto" placeholder="Cari aksi / nama…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {err ? <ErrorBox>{err}</ErrorBox> : !rows ? <Spinner /> : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Aktivitas Keuangan</h3>
            <span className="text-sm text-slate-400">{rows.length} catatan</span>
          </div>
          {rows.length === 0 ? <p className="text-sm text-slate-400">Belum ada aktivitas.</p> : (
            <div className="relative pl-5">
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200" />
              {rows.map((r) => (
                <div key={r.id} className="relative mb-4">
                  <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-sm">
                      <span className="font-medium">{r.action}</span>
                      {r.detail && <span className="text-slate-400"> · {r.detail}</span>}
                    </div>
                    {r.amount != null && <div className="text-sm font-semibold text-green-700">{fmtIDR(r.amount)}</div>}
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
