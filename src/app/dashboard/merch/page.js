'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui';
import { Icon } from '@/components/Icons';

export default function MerchPage() {
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState(null);
  const [f, setF] = useState({ name: '', desc: '', cost: 50, stock: '', img: '' });
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);

  async function load() {
    const { data } = await supabase.from('rewards').select('*').order('cost_poin', { ascending: true });
    setList(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const cost = parseInt(f.cost, 10);
    if (!f.name || !cost || cost < 1) { setMsg(['err', 'Nama & harga poin wajib.']); return; }
    const { error } = await supabase.from('rewards').insert({
      name: f.name, description: f.desc || null, cost_poin: cost,
      stock: f.stock === '' ? null : parseInt(f.stock, 10),
      image_url: f.img || null, active: true,
    });
    if (error) { setMsg(['err', error.message]); return; }
    setMsg(['ok', 'Tersimpan.']);
    setF({ name: '', desc: '', cost: 50, stock: '', img: '' });
    load();
  }
  async function toggle(id, active) {
    const { error } = await supabase.from('rewards').update({ active }).eq('id', id);
    if (error) alert(error.message); else load();
  }
  async function del(id) {
    if (!confirm('Hapus merch ini?')) return;
    const { error } = await supabase.from('rewards').delete().eq('id', id);
    if (error) alert(error.message); else load();
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="card p-5 lg:col-span-1 h-fit">
        <h3 className="font-semibold mb-4">Merch Baru</h3>
        <div className="space-y-2.5">
          <input className="input" placeholder="Nama merch" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <textarea className="input" placeholder="Deskripsi (opsional)" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
          <label className="text-xs text-slate-500">Harga (poin)</label>
          <input type="number" min="1" className="input" value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} />
          <label className="text-xs text-slate-500">Stok (kosong = tak terbatas)</label>
          <input type="number" min="0" className="input" placeholder="∞" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
          <label className="text-xs text-slate-500">URL gambar (opsional)</label>
          <input className="input" placeholder="https://…" value={f.img} onChange={(e) => setF({ ...f, img: e.target.value })} />
          <button onClick={add} className="btn-brand w-full">Simpan</button>
          {msg && <p className={`text-sm ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg[1]}</p>}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card p-3 mb-4 flex items-center gap-2">
          <input className="input" placeholder="Cari merch…" value={q} onChange={(e) => setQ(e.target.value)} />
          {list && <span className="text-sm text-slate-400 whitespace-nowrap px-2">{list.length} item</span>}
        </div>
        {!list ? <Spinner /> : list.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">Belum ada merch.</div>
        ) : (() => {
          const shown = list.filter((r) => (`${r.name} ${r.description || ''}`).toLowerCase().includes(q.toLowerCase()));
          if (shown.length === 0) return <div className="card p-8 text-center text-slate-400">Tidak ada yang cocok.</div>;
          return (
          <div className="grid sm:grid-cols-2 gap-4">
            {shown.map((r) => (
              <div key={r.id} className={`card p-4 ${!r.active ? 'opacity-60' : ''}`}>
                <div className="flex gap-3 cursor-pointer" onClick={() => setView(r)}>
                  <div className="w-16 h-16 rounded-xl bg-brand-light grid place-items-center overflow-hidden shrink-0">
                    {r.image_url
                      ? <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                      : <Icon.gift width={24} height={24} color="#5B5FEF" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{r.name}</div>
                    {r.description && <div className="text-xs text-slate-400 line-clamp-2">{r.description}</div>}
                    <div className="flex items-center gap-2 mt-1.5 text-sm">
                      <span className="inline-flex items-center gap-1 font-bold text-brand">
                        <Icon.star width={14} height={14} color="#F59E0B" />{r.cost_poin}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{r.stock == null ? 'Stok ∞' : `Stok ${r.stock}`}</span>
                      {!r.active && <span className="badge bg-slate-100 text-slate-500">nonaktif</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => setView(r)} className="btn-ghost py-1.5 text-xs flex-1">Lihat</button>
                  <button onClick={() => toggle(r.id, !r.active)} className="btn-ghost py-1.5 text-xs flex-1">
                    {r.active ? 'Nonaktif' : 'Aktif'}
                  </button>
                  <button onClick={() => del(r.id)} className="py-1.5 px-3 text-xs rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100">
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
          );
        })()}
      </div>

      {view && <MerchView r={view} onClose={() => setView(null)} />}
    </div>
  );
}

function MerchView({ r, onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-soft max-w-md w-full overflow-hidden animate-fade-up"
           onClick={(e) => e.stopPropagation()}>
        <div className="h-48 bg-brand-light grid place-items-center overflow-hidden">
          {r.image_url
            ? <img src={r.image_url} alt="" className="w-full h-full object-cover" />
            : <Icon.gift width={56} height={56} color="#5B5FEF" />}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold">{r.name}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
          </div>
          {r.description && <p className="text-sm text-slate-500 mt-1">{r.description}</p>}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Info label="Harga" value={`${r.cost_poin} poin`} />
            <Info label="Stok" value={r.stock == null ? '∞' : String(r.stock)} />
            <Info label="Status" value={r.active ? 'Aktif' : 'Nonaktif'} />
          </div>
          <button onClick={onClose} className="btn-brand w-full mt-5">Tutup</button>
        </div>
      </div>
    </div>
  );
}
function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-bold text-sm mt-0.5">{value}</div>
    </div>
  );
}
