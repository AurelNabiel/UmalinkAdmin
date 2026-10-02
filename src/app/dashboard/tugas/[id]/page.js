'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { divisionLabel, fmtDate } from '@/lib/constants';

const PRIO = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' };
const SC = {
  submitted: ['Menunggu', '#F59E0B', 'bg-amber-100 text-amber-700'],
  approved: ['Disetujui', '#22C55E', 'bg-green-100 text-green-700'],
  revisi: ['Revisi', '#3B82F6', 'bg-blue-100 text-blue-700'],
  ditolak: ['Ditolak', '#EF4444', 'bg-red-100 text-red-700'],
};

export default function TaskReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([
      supabase.from('tasks').select('*').eq('id', id).maybeSingle(),
      supabase.rpc('admin_task_submissions', { p_task_id: id }),
    ]);
    if (t.error) { setErr(t.error.message); return; }
    if (s.error) { setErr(s.error.message); return; }
    setTask(t.data);
    setRows(s.data || []);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function review(subId, status) {
    let note = null;
    if (status === 'revisi' || status === 'ditolak') note = prompt(status === 'revisi' ? 'Catatan revisi:' : 'Alasan menolak:') || '';
    const { error } = await supabase.rpc('review_submission', { p_id: subId, p_status: status, p_note: note });
    if (error) { alert('Gagal: ' + error.message); return; }
    load();
  }

  const counts = useMemo(() => {
    const c = { all: (rows || []).length, submitted: 0, approved: 0, revisi: 0, ditolak: 0, belum: 0 };
    (rows || []).forEach((r) => { if (r.status) c[r.status] = (c[r.status] || 0) + 1; else c.belum++; });
    return c;
  }, [rows]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!rows || !task) return <Spinner />;

  const shown = rows.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'belum') return !r.status;
    return r.status === filter;
  });
  const overdue = task.deadline && new Date(task.deadline) < new Date();

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/dashboard/tugas')} className="text-sm text-brand font-medium hover:underline">← Kembali ke daftar tugas</button>

      {/* Header tugas */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="badge bg-brand-light text-brand-dark">Prioritas {PRIO[task.priority] || task.priority}</span>
            <h2 className="text-xl font-bold mt-2">{task.title}</h2>
            {task.description && <p className="text-sm text-slate-500 mt-1">{task.description}</p>}
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Deadline</div>
            <div className={`text-sm font-semibold ${overdue ? 'text-red-600' : ''}`}>{task.deadline ? fmtDate(task.deadline) : 'Tanpa deadline'}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap text-xs">
          <span className="badge bg-slate-100 text-slate-600">Ditugaskan {counts.all}</span>
          <span className="badge bg-green-100 text-green-700">Disetujui {counts.approved}</span>
          <span className="badge bg-amber-100 text-amber-700">Menunggu {counts.submitted}</span>
          <span className="badge bg-blue-100 text-blue-700">Revisi {counts.revisi}</span>
          <span className="badge bg-slate-100 text-slate-500">Belum kumpul {counts.belum}</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Semua'], ['submitted', 'Menunggu'], ['approved', 'Disetujui'], ['revisi', 'Revisi'], ['ditolak', 'Ditolak'], ['belum', 'Belum kumpul']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition
              ${filter === k ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {l} <span className="opacity-70">({counts[k] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Daftar pengumpul */}
      {shown.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">Tidak ada.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {shown.map((r) => {
            const [label, color, cls] = SC[r.status] || ['Belum kumpul', '#94a3b8', 'bg-slate-100 text-slate-500'];
            return (
              <div key={r.user_id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{r.full_name || '-'}</div>
                    <div className="text-xs text-slate-400">{r.nim || ''}{r.division ? ` · ${divisionLabel(r.division)}` : ''}</div>
                  </div>
                  <span className={`badge ${cls} shrink-0`}>{label}</span>
                </div>

                {r.status ? (
                  <>
                    {r.notes && <p className="text-sm text-slate-600 mt-2">“{r.notes}”</p>}
                    {r.attachment_url ? (
                      <a href={r.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-brand font-medium mt-2 hover:underline break-all">🔗 Buka link tugas</a>
                    ) : <p className="text-xs text-slate-400 mt-2">Tanpa lampiran.</p>}
                    {r.review_note && <p className="text-xs text-slate-500 mt-1">Catatan: {r.review_note}</p>}
                    <div className="text-xs text-slate-400 mt-1">Dikumpulkan {fmtDate(r.submitted_at)}</div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button onClick={() => review(r.submission_id, 'approved')} className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-green-50 text-green-700 hover:bg-green-100">Setujui</button>
                      <button onClick={() => review(r.submission_id, 'revisi')} className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100">Revisi</button>
                      <button onClick={() => review(r.submission_id, 'ditolak')} className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100">Tolak</button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 mt-2">Belum mengumpulkan.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
