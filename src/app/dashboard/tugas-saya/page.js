'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { fmtDate } from '@/lib/constants';

const PRIOC = { low: '#22C55E', medium: '#F59E0B', high: '#EF4444' };
const STATUS = {
  none: { label: 'Belum dikumpulkan', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Terkumpul', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Disetujui', cls: 'bg-green-100 text-green-700' },
  revisi: { label: 'Perlu revisi', cls: 'bg-amber-100 text-amber-700' },
  ditolak: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
};

export default function TugasSayaPage() {
  const [uid, setUid] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const id = u.user?.id;
    setUid(id);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_assignees!inner(user_id), task_submissions(status, user_id, notes, attachment_url, review_note)')
      .eq('task_assignees.user_id', id)
      .order('deadline', { ascending: true });
    if (error) { setErr(error.message); return; }
    setTasks(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!tasks) return <Spinner />;

  if (tasks.length === 0) {
    return <div className="card p-10 text-center text-slate-400">Belum ada tugas untukmu. 🎉</div>;
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {tasks.map((t) => <TaskCard key={t.id} task={t} uid={uid} onDone={load} />)}
    </div>
  );
}

function TaskCard({ task, uid, onDone }) {
  const sub = (task.task_submissions || []).find((s) => s.user_id === uid);
  const status = sub?.status || 'none';
  const st = STATUS[status] || STATUS.none;
  const overdue = task.deadline && new Date(task.deadline) < new Date() && status === 'none';
  const canSubmit = status === 'none' || status === 'revisi' || status === 'ditolak' || status === 'rejected';

  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(sub?.notes || '');
  const [link, setLink] = useState(sub?.attachment_url || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.from('task_submissions').upsert({
      task_id: task.id, user_id: uid, notes: notes || null, attachment_url: link || null,
      status: 'submitted', submitted_at: new Date().toISOString(), review_note: null, reviewed_at: null,
    }, { onConflict: 'task_id,user_id' });
    setBusy(false);
    if (error) { setMsg(['err', error.message]); return; }
    setOpen(false); onDone();
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="w-2 h-10 rounded-full shrink-0 mt-0.5" style={{ background: PRIOC[task.priority] || '#94a3b8' }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold">{task.title}</div>
            <span className={`badge shrink-0 ${st.cls}`}>{st.label}</span>
          </div>
          {task.description && <p className="text-sm text-slate-500 mt-1">{task.description}</p>}
          <div className={`text-xs mt-2 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
            {task.deadline
              ? (overdue ? 'Terlambat · ' : 'Deadline · ') + fmtDate(task.deadline)
              : 'Tanpa deadline'}
          </div>
          {(status === 'revisi' || status === 'rejected' || status === 'ditolak') && sub?.review_note && (
            <div className="mt-2 text-xs bg-amber-50 border border-amber-100 rounded-lg p-2 text-amber-700">
              Catatan reviewer: {sub.review_note}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {sub?.attachment_url && (
              <a href={sub.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">Lihat lampiran</a>
            )}
            {canSubmit && (
              <button onClick={() => setOpen((o) => !o)} className="btn-brand py-1.5 text-xs">
                {status === 'none' ? 'Kumpulkan' : 'Kumpulkan ulang'}
              </button>
            )}
          </div>

          {open && (
            <div className="mt-3 space-y-2 pt-3 border-t border-slate-100">
              <textarea className="input text-sm" rows={2} placeholder="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <input className="input text-sm" placeholder="Link lampiran (Drive, dsb.) - opsional" value={link} onChange={(e) => setLink(e.target.value)} />
              <div className="flex items-center gap-2">
                <button onClick={submit} disabled={busy} className="btn-brand py-1.5 text-xs">{busy ? 'Mengirim…' : 'Kirim'}</button>
                <button onClick={() => setOpen(false)} className="btn-ghost py-1.5 text-xs">Batal</button>
                {msg && <span className="text-xs text-red-600">{msg[1]}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
