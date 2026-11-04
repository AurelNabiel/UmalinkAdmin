'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAsync, AsyncBlock, ListSkeleton } from '@/components/async';
import { Skeleton } from '@/components/ui';
import { fmtDate } from '@/lib/constants';

export default function GaleriPage() {
  const acts = useAsync(() => supabase.rpc('gallery_overview'), []);
  const [sel, setSel] = useState(null);

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-5">
      {/* Daftar kegiatan */}
      <div>
        <h3 className="font-semibold mb-3">Kegiatan</h3>
        <AsyncBlock state={acts} skeleton={<ListSkeleton rows={5} />}>
          {(rows) =>
            rows.length === 0 ? (
              <div className="card p-6 text-center text-slate-400">Belum ada kegiatan.</div>
            ) : (
              <div className="space-y-2">
                {rows.map((a) => {
                  const active = sel?.activity_id === a.activity_id;
                  return (
                    <button key={a.activity_id} onClick={() => setSel(a)}
                      className={`w-full text-left card p-3 transition ${active ? 'ring-2 ring-brand' : 'hover:bg-slate-50'}`}>
                      <div className="font-medium text-sm truncate">{a.title}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[12px] text-slate-400">{a.start_time ? fmtDate(a.start_time) : '-'}</span>
                        <span className={`badge ${a.photo_count > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {a.photo_count} foto
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )
          }
        </AsyncBlock>
      </div>

      {/* Panel foto */}
      <div>
        {!sel ? (
          <div className="card p-10 text-center text-slate-400">Pilih kegiatan untuk mengelola fotonya.</div>
        ) : (
          <PhotoPanel activity={sel} onChanged={acts.reload} />
        )}
      </div>
    </div>
  );
}

function PhotoPanel({ activity, onChanged }) {
  const photos = useAsync(
    () => supabase.from('activity_photos').select('id, url, caption, created_at')
      .eq('activity_id', activity.activity_id).order('created_at', { ascending: false }),
    [activity.activity_id],
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `gallery/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from('gallery').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const url = supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.rpc('gallery_add', { p_activity_id: activity.activity_id, p_url: url, p_caption: null });
      if (error) throw error;
      photos.reload(); onChanged();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  }

  async function del(id) {
    if (!confirm('Hapus foto ini?')) return;
    const { error } = await supabase.rpc('gallery_delete', { p_id: id });
    if (error) { alert(error.message); return; }
    photos.reload(); onChanged();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="font-semibold truncate">{activity.title}</h3>
        <label className="btn-brand cursor-pointer text-sm">
          {busy ? 'Mengunggah…' : 'Unggah Foto'}
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={busy} />
        </label>
      </div>
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
      <AsyncBlock state={photos} skeleton={<Skeleton className="h-40 rounded-2xl" />}>
        {(list) =>
          list.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Belum ada foto.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {list.map((p) => (
                <div key={p.id} className="group relative rounded-xl overflow-hidden bg-slate-100 aspect-square">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => del(p.id)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/55 text-white text-xs grid place-items-center opacity-0 group-hover:opacity-100 transition">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )
        }
      </AsyncBlock>
    </div>
  );
}
