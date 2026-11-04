'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';

async function uploadImage(file) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `carousel/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('doc-assets').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from('doc-assets').getPublicUrl(path).data.publicUrl;
}

function TextPreview({ title, subtitle }) {
  return (
    <div className="w-full h-full p-4 flex flex-col justify-center text-white"
         style={{ background: 'linear-gradient(135deg,#5B5FEF,#7C4DFF)' }}>
      <div className="font-extrabold text-base leading-tight">{title || 'Judul slide'}</div>
      {subtitle && <div className="text-xs text-white/90 mt-1">{subtitle}</div>}
    </div>
  );
}

export default function CarouselPage() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('carousel_list_all');
    if (error) { setErr(error.message); return; }
    setErr(''); setItems(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!items) return <Spinner />;

  return (
    <div className="space-y-6">
      <AddCard nextOrder={items.length} onDone={load} />
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Slide Tersimpan</h3>
          <span className="text-sm text-slate-400">{items.length} slide</span>
        </div>
        {items.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Belum ada slide. Tambahkan di atas.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((it) => <ItemCard key={it.id} item={it} onDone={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function AddCard({ nextOrder, onDone }) {
  const [type, setType] = useState('image'); // image | text
  const [file, setFile] = useState(null);
  const [prev, setPrev] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function pick(e) {
    const x = e.target.files?.[0]; if (!x) return;
    setFile(x); setPrev(URL.createObjectURL(x));
  }
  async function add() {
    if (type === 'image' && !file) { setMsg(['err', 'Pilih gambar dulu.']); return; }
    if (type === 'text' && !title.trim()) { setMsg(['err', 'Isi judul untuk slide teks.']); return; }
    setBusy(true); setMsg(null);
    try {
      let url = null;
      if (type === 'image' && file) url = await uploadImage(file);
      const { error } = await supabase.rpc('carousel_add', {
        p_image_url: url, p_title: title || null, p_subtitle: subtitle || null,
        p_link_url: link || null, p_sort: nextOrder,
      });
      if (error) throw error;
      setFile(null); setPrev(''); setTitle(''); setSubtitle(''); setLink('');
      setMsg(['ok', 'Slide ditambahkan.']); onDone();
    } catch (e) { setMsg(['err', e.message]); } finally { setBusy(false); }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <h3 className="font-semibold">Tambah Slide / Berita</h3>
        <div className="flex gap-1.5">
          {[['image', 'Gambar'], ['text', 'Teks saja']].map(([k, l]) => (
            <button key={k} onClick={() => setType(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${type === k ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200'}`}>{l}</button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        {type === 'image'
          ? 'Gambar rasio ±16:7 (mis. 1200×525px). Judul & subjudul opsional, tampil sebagai overlay.'
          : 'Slide berlatar gradien dengan judul & subjudul (tanpa gambar).'}
      </p>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-2.5">
          {type === 'image' && (
            <label className="btn-ghost cursor-pointer inline-flex">
              {file ? 'Ganti gambar…' : 'Pilih gambar…'}
              <input type="file" accept="image/*" className="hidden" onChange={pick} />
            </label>
          )}
          <input className="input" placeholder={type === 'text' ? 'Judul (wajib)' : 'Judul (opsional)'} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input" placeholder="Subjudul (opsional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          <input className="input" placeholder="Link berita (https://…) - opsional" value={link} onChange={(e) => setLink(e.target.value)} />
          <button onClick={add} disabled={busy} className="btn-brand w-full">{busy ? 'Menyimpan…' : 'Tambah Slide'}</button>
          {msg && <p className={`text-sm ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg[1]}</p>}
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-2">Pratinjau</div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 overflow-hidden" style={{ aspectRatio: '16/7' }}>
            {type === 'image'
              ? (prev ? <img src={prev} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full grid place-items-center text-slate-400 text-sm">Belum ada gambar</div>)
              : <TextPreview title={title} subtitle={subtitle} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onDone }) {
  const [title, setTitle] = useState(item.title || '');
  const [subtitle, setSubtitle] = useState(item.subtitle || '');
  const [link, setLink] = useState(item.link_url || '');
  const [sort, setSort] = useState(item.sort_order);
  const [active, setActive] = useState(item.active);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function persist(patch = {}) {
    const { error } = await supabase.rpc('carousel_update', {
      p_id: item.id, p_image_url: null,
      p_title: title || null, p_subtitle: subtitle || null, p_link_url: link || null,
      p_sort: parseInt(sort, 10) || 0, p_active: active, ...patch,
    });
    if (error) throw error;
  }
  async function save() {
    setBusy(true);
    try { await persist(); setSaved(true); setTimeout(() => setSaved(false), 1500); onDone(); }
    catch (e) { alert('Gagal: ' + e.message); } finally { setBusy(false); }
  }
  async function del() {
    if (!confirm('Hapus slide ini?')) return;
    const { error } = await supabase.rpc('carousel_delete', { p_id: item.id });
    if (error) { alert(error.message); return; }
    onDone();
  }
  async function toggleActive(v) {
    setActive(v);
    try { await persist({ p_active: v }); onDone(); }
    catch (e) { alert(e.message); setActive(!v); }
  }
  async function replaceImage(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    try { const url = await uploadImage(f); await persist({ p_image_url: url }); onDone(); }
    catch (err) { alert('Gagal: ' + err.message); } finally { setBusy(false); }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: '16/7' }}>
        {item.image_url
          ? <img src={item.image_url} alt="" className="w-full h-full object-cover" />
          : <TextPreview title={title} subtitle={subtitle} />}
      </div>
      <input className="input" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className="input" placeholder="Subjudul" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      <input className="input" placeholder="Link (https://…)" value={link} onChange={(e) => setLink(e.target.value)} />
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm flex items-center gap-2">Urutan
          <input type="number" className="input py-1 w-20" value={sort} onChange={(e) => setSort(e.target.value)} />
        </label>
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(e) => toggleActive(e.target.checked)} /> Aktif
        </label>
        {item.image_url && (
          <label className="btn-ghost cursor-pointer text-xs py-1.5">
            Ganti gambar
            <input type="file" accept="image/*" className="hidden" onChange={replaceImage} />
          </label>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={del} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100">Hapus</button>
          <button onClick={save} disabled={busy} className="btn-brand py-1.5 text-xs">{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
        {saved && <span className="text-xs text-green-700 w-full">Tersimpan.</span>}
      </div>
    </div>
  );
}
