'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox, StatusBadge } from '@/components/ui';
import { fmtDate } from '@/lib/constants';

export default function PenukaranPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    const { data, error } = await supabase.rpc('admin_list_redemptions');
    if (error) { setErr(error.message); return; }
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  async function decide(id, approve) {
    let note = null;
    if (!approve) { note = prompt('Alasan menolak (opsional):') || ''; }
    const { error } = await supabase.rpc('decide_redemption', { p_id: id, p_approve: approve, p_note: note });
    if (error) { alert('Gagal: ' + error.message); return; }
    load();
  }

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!rows) return <Spinner />;

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
  };
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Semua'], ['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition
              ${filter === k ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {l} <span className="opacity-70">({counts[k]})</span>
          </button>
        ))}
      </div>

      <div className="card p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="py-2.5 pr-3">Anggota</th><th className="py-2.5 pr-3">Merch</th>
            <th className="py-2.5 pr-3">Poin</th><th className="py-2.5 pr-3">Tanggal</th>
            <th className="py-2.5 pr-3">Status</th><th></th>
          </tr></thead>
          <tbody>
            {shown.length === 0 && <tr><td className="py-3 text-slate-400">Tidak ada data.</td></tr>}
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="py-2 pr-3">
                  <div className="font-medium">{r.full_name || '-'}</div>
                  {r.nim && <div className="text-xs text-slate-400">{r.nim}</div>}
                </td>
                <td className="py-2 pr-3">{r.reward_name}</td>
                <td className="py-2 pr-3 font-semibold text-brand">{r.poin_spent}</td>
                <td className="py-2 pr-3 text-slate-500">{fmtDate(r.created_at)}</td>
                <td className="py-2 pr-3"><StatusBadge status={r.status} /></td>
                <td className="py-2 whitespace-nowrap">
                  {r.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button onClick={() => decide(r.id, true)} className="text-xs font-semibold text-green-700 hover:underline">Setujui</button>
                      <button onClick={() => decide(r.id, false)} className="text-xs font-semibold text-red-600 hover:underline">Tolak</button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{r.note || '—'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
