'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAsync, AsyncBlock, ListSkeleton } from '@/components/async';
import { DIVISIONS, divisionLabel, fmtDate } from '@/lib/constants';

export default function PengumumanPage() {
  const list = useAsync(() => supabase.rpc('announcements_list'), []);

  return (
    <div className="space-y-6">
      <ComposeCard onDone={list.reload} />
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Pengumuman Terkirim</h3>
          {list.data && <span className="text-sm text-slate-400">{list.data.length} pengumuman</span>}
        </div>
        <AsyncBlock state={list} skeleton={<ListSkeleton rows={3} />}>
          {(rows) =>
            rows.length === 0 ? (
              <div className="card p-8 text-center text-slate-400">Belum ada pengumuman.</div>
            ) : (
              <div className="space-y-3">
                {rows.map((a) => <Item key={a.id} a={a} onDone={list.reload} />)}
              </div>
            )
          }
        </AsyncBlock>
      </div>
    </div>
  );
}

function ComposeCard({ onDone }) {
  const [div, setDiv] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit() {
    if (!title.trim()) { setMsg(['err', 'Judul wajib diisi.']); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.rpc('announcement_add', {
        p_division: div || null, p_title: title.trim(), p_body: body.trim() || null,
      });
      if (error) throw error;
      setTitle(''); setBody('');
      setMsg(['ok', 'Pengumuman terkirim & notifikasi dikirim ke anggota.']);
      onDone();
    } catch (e) { setMsg(['err', e.message]); } finally { setBusy(false); }
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1">Buat Pengumuman</h3>
      <p className="text-xs text-slate-400 mb-4">
        Pilih "Umum" untuk semua divisi, atau divisi tertentu. Anggota dalam cakupan otomatis dapat notifikasi.
      </p>
      <div className="grid lg:grid-cols-[200px_1fr] gap-3">
        <select className="input" value={div} onChange={(e) => setDiv(e.target.value)}>
          {DIVISIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" placeholder="Judul pengumuman" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <textarea className="input mt-3 min-h-[96px]" placeholder="Isi (opsional)" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex items-center gap-3 mt-3">
        <button onClick={submit} disabled={busy} className="btn-brand">{busy ? 'Mengirim…' : 'Kirim Pengumuman'}</button>
        {msg && <span className={`text-sm ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg[1]}</span>}
      </div>
    </div>
  );
}

function Item({ a, onDone }) {
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!confirm('Hapus pengumuman ini?')) return;
    setBusy(true);
    const { error } = await supabase.rpc('announcement_delete', { p_id: a.id });
    setBusy(false);
    if (error) { alert(error.message); return; }
    onDone();
  }
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{a.title}</span>
            <span className="badge bg-indigo-50 text-indigo-600">{divisionLabel(a.division)}</span>
          </div>
          {a.body && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.body}</p>}
          <div className="text-[12px] text-slate-400 mt-2">{a.by_name || 'Pengurus'} · {fmtDate(a.created_at)}</div>
        </div>
        <button onClick={del} disabled={busy}
          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 shrink-0">
          {busy ? '…' : 'Hapus'}
        </button>
      </div>
    </div>
  );
}
