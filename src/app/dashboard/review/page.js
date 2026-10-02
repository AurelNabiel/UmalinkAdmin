'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { fmtDate } from '@/lib/constants';

const STATUS = {
  submitted: ['Menunggu', 'bg-amber-100 text-amber-700'],
  approved: ['Disetujui', 'bg-green-100 text-green-700'],
  revisi: ['Revisi', 'bg-blue-100 text-blue-700'],
  ditolak: ['Ditolak', 'bg-red-100 text-red-700'],
};

export default function ReviewPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('submitted');
  const [q, setQ] = useState('');

  async function load() {
    setErr('');
    const { data, error } = await supabase.rpc('admin_list_submissions');
    if (error) { setErr(error.message); return; }
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  async function review(id, status) {
    let note = null;
    if (status === 'revisi' || status === 'ditolak') {
      note = prompt(status === 'revisi' ? 'Catatan revisi:' : 'Alasan menolak:') || '';
    }
    const { error } = await supabase.rpc('review_submission', { p_id: id, p_status: status, p_note: note });
    if (error) { alert('Gagal: ' + error.message); return; }
    load();
  }

  const counts = useMemo(() => {
    const c = { all: 0, submitted: 0, approved: 0, revisi: 0, ditolak: 0 };
    (rows || []).forEach((r) => { c.all++; c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!rows) return <Spinner />;

  const byStatus = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const shown = q
    ? byStatus.filter((r) => `${r.full_name || ''} ${r.task_title || ''} ${r.nim || ''}`.toLowerCase().includes(q.toLowerCase()))
    : byStatus;

  return (
    <div className="space-y-4">
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        {[['submitted', 'Menunggu'], ['all', 'Semua'], ['approved', 'Disetujui'], ['revisi', 'Revisi'], ['ditolak', 'Ditolak']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition
              ${filter === k ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {l} <span className="opacity-70">({counts[k] ?? 0})</span>
          </button>
        ))}
        <input className="input max-w-xs ml-auto" placeholder="Cari nama / tugas / NIM…"
               value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">Tidak ada pengumpulan.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {shown.map((s) => {
            const [label, cls] = STATUS[s.status] || ['-', 'bg-slate-100 text-slate-600'];
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.task_title}</div>
                    <div className="text-sm text-slate-500">
                      {s.full_name || '-'}{s.nim ? ` · ${s.nim}` : ''}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{fmtDate(s.submitted_at)}</div>
                  </div>
                  <span className={`badge ${cls} shrink-0`}>{label}</span>
                </div>

                {s.notes && <p className="text-sm text-slate-600 mt-2">“{s.notes}”</p>}

                {s.attachment_url ? (
                  <a href={s.attachment_url} target="_blank" rel="noreferrer"
                     className="inline-flex items-center gap-1 text-sm text-brand font-medium mt-2 hover:underline break-all">
                    🔗 Buka link tugas
                  </a>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">Tidak ada lampiran.</p>
                )}

                {s.review_note && (
                  <p className="text-xs text-slate-500 mt-2">Catatan review: {s.review_note}</p>
                )}

                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => review(s.id, 'approved')}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-green-50 text-green-700 hover:bg-green-100">
                    Setujui
                  </button>
                  <button onClick={() => review(s.id, 'revisi')}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100">
                    Revisi
                  </button>
                  <button onClick={() => review(s.id, 'ditolak')}
                    className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100">
                    Tolak
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
