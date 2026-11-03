'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAsync, AsyncBlock, ListSkeleton } from '@/components/async';
import { divisionLabel, fmtDate } from '@/lib/constants';

const TABS = [['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak']];

export default function IzinPage() {
  const [status, setStatus] = useState('pending');
  const list = useAsync(() => supabase.rpc('admin_list_leaves', { p_status: status }), [status]);

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition
              ${status === k ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {l}
          </button>
        ))}
      </div>

      <AsyncBlock state={list} skeleton={<ListSkeleton rows={3} />}>
        {(rows) =>
          rows.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              {status === 'pending' ? 'Tidak ada pengajuan menunggu.' : 'Belum ada data.'}
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((l) => <Card key={l.id} l={l} editable={status === 'pending'} onDone={list.reload} />)}
            </div>
          )
        }
      </AsyncBlock>
    </div>
  );
}

function Card({ l, editable, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function decide(decision) {
    let note = null;
    if (decision === 'rejected') {
      note = prompt('Alasan menolak (opsional):') ?? null;
    }
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('decide_leave', { p_id: l.id, p_status: decision, p_note: note });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone();
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{l.full_name || 'Anggota'}</span>
            <span className="badge bg-slate-100 text-slate-600">{divisionLabel(l.division)}</span>
            <span className="badge bg-indigo-50 text-indigo-600 capitalize">{l.kind}</span>
          </div>
          <div className="text-sm text-slate-700 mt-1">{l.activity_title}</div>
          {l.start_time && <div className="text-[12px] text-slate-400">Mulai {fmtDate(l.start_time)}</div>}
          {l.reason && <p className="text-sm text-slate-600 mt-2">{l.reason}</p>}
          {l.proof_url && (
            <a href={l.proof_url} target="_blank" rel="noreferrer"
              className="text-sm text-brand font-semibold inline-block mt-1">Lihat bukti →</a>
          )}
          {l.note && <p className="text-[12px] text-slate-400 mt-1">Catatan: {l.note}</p>}
        </div>
        {editable && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => decide('rejected')} disabled={busy}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100">Tolak</button>
            <button onClick={() => decide('approved')} disabled={busy} className="btn-brand py-1.5 text-xs">
              {busy ? '…' : 'Setujui'}
            </button>
          </div>
        )}
      </div>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  );
}
