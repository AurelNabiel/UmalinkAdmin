'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { DIVISIONS, METHODS, divisionLabel } from '@/lib/constants';
import ActivityQrModal from '@/components/ActivityQrModal';
import RosterModal from '@/components/RosterModal';
import ActivityDetailModal from '@/components/ActivityDetailModal';
import CalendarMini, { dateKey } from '@/components/CalendarMini';
import Select from '@/components/Select';

const BG = ['#EEF2FF', '#FFF4E6', '#E8F8EF', '#FDE8F0', '#F0EBFF', '#FEF9E7'];
const PAL = ['#5B5FEF', '#F97316', '#22C55E', '#EC4899', '#8B5CF6', '#EAB308'];

function dayInfo(a) {
  const now = new Date(), start = new Date(a.start_time), end = a.end_time ? new Date(a.end_time) : start;
  if (now >= start && now <= end) return 'Berlangsung';
  if (now < start) { const d = Math.ceil((start - now) / 86400000); return d <= 0 ? 'Hari ini' : `${d} hari lagi`; }
  return 'Selesai';
}

export default function KegiatanPage() {
  const [list, setList] = useState(null);
  const [hadir, setHadir] = useState({});
  const [totalMembers, setTotalMembers] = useState(0);
  const [divCounts, setDivCounts] = useState({});
  const [msg, setMsg] = useState(null);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState('');
  const [selDate, setSelDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [qr, setQr] = useState(null);
  const [roster, setRoster] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ title: '', desc: '', date: today, from: '', to: '', method: 'any', div: '' });

  async function load() {
    const [a, att, pr] = await Promise.all([
      supabase.from('activities').select('*').order('start_time', { ascending: false }),
      supabase.from('attendances').select('activity_id, status'),
      supabase.from('profiles').select('division'),
    ]);
    setList(a.data || []);
    const h = {};
    (att.data || []).forEach((r) => { if (r.status === 'hadir') h[r.activity_id] = (h[r.activity_id] || 0) + 1; });
    setHadir(h);
    const dc = {};
    (pr.data || []).forEach((p) => { const k = p.division || ''; dc[k] = (dc[k] || 0) + 1; });
    setDivCounts(dc);
    setTotalMembers((pr.data || []).length);
  }
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id)); load(); }, []);

  async function add() {
    if (!f.title || !f.date || !f.from || !f.to) { setMsg(['err', 'Judul, tanggal, jam mulai & selesai wajib.']); return; }
    const start = new Date(`${f.date}T${f.from}`);
    let end = new Date(`${f.date}T${f.to}`);
    if (end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000);
    const { error } = await supabase.from('activities').insert({
      title: f.title, description: f.desc || null,
      start_time: start.toISOString(), end_time: end.toISOString(),
      method: f.method, division: f.div || null, created_by: me,
    });
    if (error) { setMsg(['err', error.message]); return; }
    setMsg(['ok', 'Tersimpan.']);
    setF({ title: '', desc: '', date: today, from: '', to: '', method: 'any', div: '' });
    setShowForm(false); load();
  }
  async function del(id) {
    if (!confirm('Hapus kegiatan ini?')) return;
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setDetail(null); load();
  }

  const marked = useMemo(() => new Set((list || []).map((a) => dateKey(new Date(a.start_time)))), [list]);
  const shown = useMemo(() => (list || []).filter((a) => {
    if (q && !(a.title || '').toLowerCase().includes(q.toLowerCase())) return false;
    if (selDate && dateKey(new Date(a.start_time)) !== selDate) return false;
    return true;
  }), [list, q, selDate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold">Kegiatan</h2>
        <input className="input max-w-xs" placeholder="Cari kegiatan…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setShowForm((s) => !s)} className="btn-brand py-2 ml-auto">{showForm ? 'Tutup' : '+ Kegiatan Baru'}</button>
      </div>

      {showForm && (
        <div className="card p-5">
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input" placeholder="Judul" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <input className="input" placeholder="Deskripsi (opsional)" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
            <div><label className="text-xs text-slate-500">Tanggal</label><input type="date" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-slate-500">Jam mulai</label><input type="time" className="input" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500">Jam selesai</label><input type="time" className="input" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
            </div>
            <div><label className="text-xs text-slate-500">Metode absensi</label>
              <Select value={f.method} onChange={(v) => setF({ ...f, method: v })} options={METHODS} className="mt-0.5" /></div>
            <div><label className="text-xs text-slate-500">Divisi</label>
              <Select value={f.div} onChange={(v) => setF({ ...f, div: v })} options={DIVISIONS} className="mt-0.5" /></div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={add} className="btn-brand">Simpan</button>
            {msg && <span className={`text-sm ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg[1]}</span>}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!list ? <Spinner /> : shown.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">{selDate ? 'Tidak ada kegiatan pada tanggal ini.' : 'Belum ada kegiatan.'}</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {shown.map((a, i) => (
                <button key={a.id} onClick={() => setDetail(a)} className="rounded-3xl p-5 shadow-soft text-left hover:-translate-y-0.5 transition" style={{ background: BG[i % BG.length] }}>
                  <div className="flex items-center justify-between">
                    <span className="badge" style={{ background: '#ffffffaa', color: PAL[i % PAL.length] }}>{divisionLabel(a.division)}</span>
                    <span className="text-xs text-slate-500">{dayInfo(a)}</span>
                  </div>
                  <div className="font-bold text-lg mt-3">{a.title}</div>
                  <div className="text-sm text-slate-500 mt-1 line-clamp-2">{a.description || 'Tidak ada deskripsi'}</div>
                  <div className="text-xs text-slate-400 mt-3">Ketuk untuk detail & absen</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <CalendarMini marked={marked} selected={selDate} onSelect={setSelDate} />
        </div>
      </div>

      {detail && (
        <ActivityDetailModal a={detail} hadir={hadir[detail.id] || 0}
          total={detail.division ? (divCounts[detail.division] || 0) : totalMembers}
          onClose={() => setDetail(null)}
          onAbsen={() => { setRoster(detail); setDetail(null); }}
          onQr={() => { setQr(detail); setDetail(null); }}
          onDelete={() => del(detail.id)} />
      )}
      {qr && <ActivityQrModal activityId={qr.id} title={qr.title} onClose={() => setQr(null)} />}
      {roster && <RosterModal activityId={roster.id} title={roster.title} onClose={() => setRoster(null)} />}
    </div>
  );
}
