'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { DIVISIONS, PRIOS, fmtDate } from '@/lib/constants';
import Select from '@/components/Select';
import CalendarMini, { dateKey } from '@/components/CalendarMini';

const PRIO = {
  low: { label: 'Rendah', bg: '#E8F8EF', bar: '#22C55E', text: '#15803D' },
  medium: { label: 'Sedang', bg: '#FFF4E6', bar: '#F59E0B', text: '#C2410C' },
  high: { label: 'Tinggi', bg: '#FDE8F0', bar: '#EF4444', text: '#BE185D' },
};

export default function TugasPage() {
  const router = useRouter();
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState(null);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState('');
  const [selDate, setSelDate] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ title: '', desc: '', prio: 'medium', dl: '', div: '' });

  async function load() {
    const { data } = await supabase.rpc('admin_tasks_with_counts');
    setList(data || []);
  }
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id)); load(); }, []);

  async function add() {
    if (!f.title) { setMsg(['err', 'Judul wajib.']); return; }
    let qy = supabase.from('profiles').select('id');
    if (f.div !== '__all' && f.div !== '') qy = qy.eq('division', f.div);
    if (f.div === '') qy = qy.is('division', null);
    const { data: members, error: mErr } = await qy;
    if (mErr) { setMsg(['err', mErr.message]); return; }
    const ids = (members || []).map((m) => m.id);
    if (ids.length === 0) { setMsg(['err', 'Tidak ada anggota pada pilihan ini.']); return; }

    const { data: ins, error } = await supabase.from('tasks').insert({
      title: f.title, description: f.desc || null, priority: f.prio,
      deadline: f.dl ? new Date(f.dl).toISOString() : null, created_by: me,
    }).select('id').single();
    if (error) { setMsg(['err', error.message]); return; }
    const { error: aErr } = await supabase.from('task_assignees').insert(ids.map((uid) => ({ task_id: ins.id, user_id: uid })));
    if (aErr) setMsg(['err', 'Tugas dibuat, assignee gagal: ' + aErr.message]);
    else setMsg(['ok', `Tersimpan untuk ${ids.length} anggota.`]);
    setF({ title: '', desc: '', prio: 'medium', dl: '', div: '' });
    setShowForm(false); load();
  }

  const marked = useMemo(() => new Set((list || []).filter((t) => t.deadline).map((t) => dateKey(new Date(t.deadline)))), [list]);
  const shown = useMemo(() => (list || []).filter((t) => {
    if (q && !(t.title || '').toLowerCase().includes(q.toLowerCase())) return false;
    if (selDate && !(t.deadline && dateKey(new Date(t.deadline)) === selDate)) return false;
    return true;
  }), [list, q, selDate]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-bold">Tugas</h2>
        <input className="input max-w-xs" placeholder="Cari tugas…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => setShowForm((s) => !s)} className="btn-brand py-2 ml-auto">{showForm ? 'Tutup' : '+ Tugas Baru'}</button>
      </div>

      {showForm && (
        <div className="card p-5">
          <div className="grid md:grid-cols-2 gap-3">
            <input className="input" placeholder="Judul" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
            <input className="input" placeholder="Deskripsi (opsional)" value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} />
            <div><label className="text-xs text-slate-500">Prioritas</label>
              <Select value={f.prio} onChange={(v) => setF({ ...f, prio: v })} options={PRIOS} className="mt-0.5" /></div>
            <div><label className="text-xs text-slate-500">Deadline (opsional)</label><input type="datetime-local" className="input" value={f.dl} onChange={(e) => setF({ ...f, dl: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="text-xs text-slate-500">Tugaskan ke</label>
              <Select value={f.div} onChange={(v) => setF({ ...f, div: v })} options={[...DIVISIONS, ['__all', 'Semua anggota']]} className="mt-0.5" /></div>
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
            <div className="card p-8 text-center text-slate-400">{selDate ? 'Tidak ada tugas dengan deadline tanggal ini.' : 'Belum ada tugas.'}</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {shown.map((t) => {
                const p = PRIO[t.priority] || PRIO.medium;
                const overdue = t.deadline && new Date(t.deadline) < new Date();
                const pct = t.assignee_count > 0 ? Math.round((t.submitted_count / t.assignee_count) * 100) : 0;
                return (
                  <button key={t.id} onClick={() => router.push(`/dashboard/tugas/${t.id}`)}
                    className="rounded-3xl p-5 shadow-soft text-left hover:-translate-y-0.5 transition" style={{ background: p.bg }}>
                    <div className="flex items-center justify-between">
                      <span className="badge" style={{ background: '#ffffffaa', color: p.text }}>Prioritas {p.label}</span>
                      {t.approved_count > 0 && <span className="badge bg-green-100 text-green-700">{t.approved_count} disetujui</span>}
                    </div>
                    <div className="font-bold text-lg mt-3">{t.title}</div>
                    {t.description && <div className="text-sm text-slate-500 line-clamp-1 mt-0.5">{t.description}</div>}
                    <div className="flex items-center gap-2 text-xs mt-3">
                      <Icon.clock width={14} height={14} color={overdue ? '#EF4444' : p.bar} />
                      <span className={overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                        {t.deadline ? (overdue ? 'Lewat · ' : 'Deadline · ') + fmtDate(t.deadline) : 'Tanpa deadline'}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Pengumpulan</span><span className="font-semibold">{t.submitted_count}/{t.assignee_count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/70 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.bar }} />
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-3">Ketuk untuk review</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <CalendarMini marked={marked} selected={selDate} onSelect={setSelDate} />
        </div>
      </div>
    </div>
  );
}
