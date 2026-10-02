'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { divisionLabel, fmtIDR } from '@/lib/constants';
import ActivityQrModal from '@/components/ActivityQrModal';
import RosterModal from '@/components/RosterModal';
import ActivityDetailModal from '@/components/ActivityDetailModal';
import CalendarMini, { dateKey } from '@/components/CalendarMini';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const PAL = ['#5B5FEF', '#F97316', '#22C55E', '#EC4899', '#8B5CF6', '#EAB308'];
const BG = ['#EEF2FF', '#FFF4E6', '#E8F8EF', '#FDE8F0', '#F0EBFF', '#FEF9E7'];

function timeInfo(a) {
  const now = new Date(), s = new Date(a.start_time), e = a.end_time ? new Date(a.end_time) : s;
  if (now >= s && now <= e) return { label: 'Berlangsung', state: 'live' };
  if (now < s) { const d = Math.ceil((s - now) / 86400000); return { label: d <= 0 ? 'Hari ini' : `${d} hari lagi`, state: 'up' }; }
  return { label: 'Selesai', state: 'done' };
}
const PRIOC = { low: '#22C55E', medium: '#F59E0B', high: '#EF4444' };

export default function RingkasanPage() {
  const [acts, setActs] = useState(null);
  const [hadir, setHadir] = useState({});
  const [totalMembers, setTotalMembers] = useState(0);
  const [divCounts, setDivCounts] = useState({});
  const [cash, setCash] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [err, setErr] = useState('');
  const [view, setView] = useState('grid');
  const [selDate, setSelDate] = useState(null);
  const [detail, setDetail] = useState(null);
  const [qr, setQr] = useState(null);
  const [roster, setRoster] = useState(null);

  useEffect(() => {
    (async () => {
      const [a, att, pr, co, tk] = await Promise.all([
        supabase.from('activities').select('*').order('start_time', { ascending: false }).limit(60),
        supabase.from('attendances').select('activity_id, status'),
        supabase.from('profiles').select('division'),
        supabase.rpc('cash_overview'),
        supabase.from('tasks').select('*').order('deadline', { ascending: true }).limit(6),
      ]);
      if (a.error) { setErr(a.error.message); return; }
      setActs(a.data || []);
      const h = {};
      (att.data || []).forEach((r) => { if (r.status === 'hadir') h[r.activity_id] = (h[r.activity_id] || 0) + 1; });
      setHadir(h);
      const dc = {};
      (pr.data || []).forEach((p) => { const k = p.division || ''; dc[k] = (dc[k] || 0) + 1; });
      setDivCounts(dc);
      setTotalMembers((pr.data || []).length);
      if (!co.error && co.data && co.data[0]) setCash(co.data[0]);
      setTasks(tk.data || []);
    })();
  }, []);

  const marked = useMemo(() => new Set((acts || []).map((a) => dateKey(new Date(a.start_time)))), [acts]);
  const shown = useMemo(() => {
    if (!acts) return [];
    if (!selDate) return acts;
    return acts.filter((a) => dateKey(new Date(a.start_time)) === selDate);
  }, [acts, selDate]);

  const stats = useMemo(() => {
    let live = 0, up = 0;
    (acts || []).forEach((a) => { const t = timeInfo(a); if (t.state === 'live') live++; else if (t.state === 'up') up++; });
    return { total: (acts || []).length, live, up };
  }, [acts]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!acts) return <Spinner />;

  const now = new Date();
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* ===== Kolom utama ===== */}
      <div className="lg:col-span-2 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Kegiatan</h2>
          <span className="text-sm text-slate-400">
            {selDate ? new Date(selDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : `${MONTHS[now.getMonth()]} ${now.getFullYear()}`}
          </span>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <Stat value={stats.live} label="Berlangsung" />
          <Dot /><Stat value={stats.up} label="Mendatang" />
          <Dot /><Stat value={stats.total} label="Total" />
          <Dot /><Stat value={totalMembers} label="Anggota" />
          <div className="ml-auto flex rounded-xl border border-slate-200 overflow-hidden">
            <button onClick={() => setView('list')} className={`px-2.5 py-2 ${view === 'list' ? 'bg-brand text-white' : 'bg-white text-slate-500'}`}><Icon.list width={16} height={16} /></button>
            <button onClick={() => setView('grid')} className={`px-2.5 py-2 ${view === 'grid' ? 'bg-brand text-white' : 'bg-white text-slate-500'}`}><Icon.grid width={16} height={16} /></button>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            {selDate ? 'Tidak ada kegiatan pada tanggal ini.' : 'Belum ada kegiatan.'}
          </div>
        ) : view === 'grid' ? (
          <div className="grid sm:grid-cols-2 gap-5">
            {shown.map((a, i) => <MiniCard key={a.id} a={a} i={i} onClick={() => setDetail(a)} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((a) => (
              <button key={a.id} onClick={() => setDetail(a)} className="card p-4 w-full flex items-center gap-4 text-left hover:shadow-md transition">
                <div className="w-11 h-11 rounded-xl bg-brand-light grid place-items-center shrink-0"><Icon.calendar width={20} height={20} color="#5B5FEF" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{a.title}</div>
                  <div className="text-xs text-slate-400 truncate">{divisionLabel(a.division)} · {a.description || '—'}</div>
                </div>
                <span className="badge bg-slate-100 text-slate-500">{timeInfo(a).label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== Kolom kanan: Kalender + Kas + Tugas ===== */}
      <div className="lg:col-span-1 space-y-5">
        <CalendarMini marked={marked} selected={selDate} onSelect={setSelDate} />

        {/* Kas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Kas</h2>
            <Link href="/dashboard/kas" className="text-xs text-brand font-medium hover:underline">Kelola</Link>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-soft relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg,#5B5FEF,#7C4DFF,#22D3EE)' }}>
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15" />
            <div className="text-xs text-white/80 relative">Saldo Kas</div>
            <div className="text-2xl font-extrabold relative mt-1">{cash ? fmtIDR(cash.saldo) : '—'}</div>
            {cash && (
              <div className="flex gap-2 mt-3 relative">
                <div className="flex-1 rounded-lg bg-white/15 px-3 py-1.5">
                  <div className="text-[11px] text-white/70">Belum tertagih</div>
                  <div className="text-sm font-bold">{fmtIDR(cash.tagihan_belum)}</div>
                </div>
                <div className="flex-1 rounded-lg bg-white/15 px-3 py-1.5">
                  <div className="text-[11px] text-white/70">Nunggak</div>
                  <div className="text-sm font-bold">{cash.anggota_nunggak} org</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tugas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Tugas Terbaru</h2>
            <Link href="/dashboard/tugas" className="text-xs text-brand font-medium hover:underline">Semua</Link>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="card p-5 text-center text-slate-400 text-sm">Belum ada tugas.</div>
            ) : tasks.map((t) => {
              const overdue = t.deadline && new Date(t.deadline) < new Date();
              return (
                <div key={t.id} className="card p-3.5 flex items-center gap-3">
                  <span className="w-2 h-9 rounded-full shrink-0" style={{ background: PRIOC[t.priority] || '#94a3b8' }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    <div className={`text-xs ${overdue ? 'text-red-600' : 'text-slate-400'}`}>
                      {t.deadline ? (overdue ? 'Lewat · ' : 'Deadline · ') + new Date(t.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Tanpa deadline'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {detail && (
        <ActivityDetailModal a={detail} hadir={hadir[detail.id] || 0}
          total={detail.division ? (divCounts[detail.division] || 0) : totalMembers}
          onClose={() => setDetail(null)}
          onAbsen={() => { setRoster(detail); setDetail(null); }}
          onQr={() => { setQr(detail); setDetail(null); }} />
      )}
      {qr && <ActivityQrModal activityId={qr.id} title={qr.title} onClose={() => setQr(null)} />}
      {roster && <RosterModal activityId={roster.id} title={roster.title} onClose={() => setRoster(null)} />}
    </div>
  );
}

function Stat({ value, label }) {
  return <div><div className="text-2xl font-extrabold leading-none">{value}</div><div className="text-xs text-slate-400 mt-1">{label}</div></div>;
}
function Dot() { return <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />; }

function MiniCard({ a, i, onClick }) {
  const t = timeInfo(a);
  return (
    <button onClick={onClick} className="rounded-3xl p-5 shadow-soft text-left hover:-translate-y-0.5 transition" style={{ background: BG[i % BG.length] }}>
      <div className="flex items-center justify-between">
        <span className="badge" style={{ background: '#ffffffaa', color: PAL[i % PAL.length] }}>{divisionLabel(a.division)}</span>
        <span className="text-xs text-slate-500">{t.label}</span>
      </div>
      <div className="font-bold text-lg mt-3">{a.title}</div>
      <div className="text-sm text-slate-500 mt-1 line-clamp-2">{a.description || 'Tidak ada deskripsi'}</div>
      <div className="text-xs text-slate-400 mt-3">Ketuk untuk detail & absen</div>
    </button>
  );
}
