'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAsync, AsyncBlock, ListSkeleton } from '@/components/async';
import { fmtDate } from '@/lib/constants';

export default function KomentarPage() {
  const acts = useAsync(
    () => supabase.from('activities').select('id, title, start_time')
      .order('start_time', { ascending: false }).limit(100),
    [],
  );
  const [actId, setActId] = useState('');

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <label className="text-sm font-medium text-slate-600">Pilih kegiatan</label>
        <AsyncBlock state={acts} skeleton={<div className="skeleton h-10 rounded-xl mt-2" />}>
          {(rows) => (
            <select className="input mt-2" value={actId} onChange={(e) => setActId(e.target.value)}>
              <option value="">— pilih kegiatan —</option>
              {rows.map((a) => <option key={a.id} value={a.id}>{a.title} · {fmtDate(a.start_time)}</option>)}
            </select>
          )}
        </AsyncBlock>
      </div>

      {actId ? <Thread activityId={actId} /> : (
        <div className="card p-10 text-center text-slate-400">Pilih kegiatan untuk melihat & memoderasi komentar.</div>
      )}
    </div>
  );
}

function Thread({ activityId }) {
  const thread = useAsync(() => supabase.rpc('comments_list', { p_activity_id: activityId }), [activityId]);

  async function del(id) {
    if (!confirm('Hapus komentar ini?')) return;
    const { error } = await supabase.from('activity_comments').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    thread.reload();
  }

  return (
    <AsyncBlock state={thread} skeleton={<ListSkeleton rows={3} />}>
      {(rows) =>
        rows.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Belum ada komentar pada kegiatan ini.</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-slate-400">{rows.length} komentar</div>
            {rows.map((c) => (
              <div key={c.id} className="card p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full grid place-items-center text-white font-bold shrink-0"
                     style={{ background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }}>
                  {(c.full_name || '?').trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.full_name || 'Anggota'}</span>
                    <span className="text-[11px] text-slate-400">{fmtDate(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                </div>
                <button onClick={() => del(c.id)}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 shrink-0">
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )
      }
    </AsyncBlock>
  );
}
