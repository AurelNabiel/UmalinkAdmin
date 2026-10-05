'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { DIVISIONS, fmtIDR, fmtDate, divisionLabel } from '@/lib/constants';

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function KasPage() {
  const [tab, setTab] = useState('ringkasan');
  const [ov, setOv] = useState(null);
  const [tx, setTx] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [err, setErr] = useState('');

  const loadAll = useCallback(async () => {
    const [o, t, p] = await Promise.all([
      supabase.rpc('cash_overview'),
      supabase.rpc('cash_list_transactions', { p_limit: 500 }),
      supabase.rpc('cash_list_periods'),
    ]);
    if (o.error) { setErr(o.error.message); return; }
    setOv((o.data && o.data[0]) || {});
    setTx(t.data || []);
    setPeriods(p.data || []);
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!ov) return <Spinner />;

  const TABS = [
    ['ringkasan', 'Ringkasan', 'grid'],
    ['iuran', 'Iuran', 'wallet'],
    ['transaksi', 'Transaksi', 'swap'],
    ['laporan', 'Laporan', 'upload'],
    ['pengaturan', 'Pengaturan', 'check'],
  ];

  return (
    <div className="space-y-6">
      {/* Hero saldo + mini */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl p-6 text-white shadow-soft relative overflow-hidden lg:col-span-1"
             style={{ background: 'linear-gradient(135deg,#5B5FEF,#7C4DFF,#22D3EE)' }}>
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/15" />
          <div className="w-11 h-11 rounded-xl bg-white/20 grid place-items-center mb-3 relative">
            <Icon.wallet width={22} height={22} />
          </div>
          <div className="text-sm text-white/80 relative">Saldo Kas Saat Ini</div>
          <div className="text-3xl font-extrabold relative mt-1">{fmtIDR(ov.saldo)}</div>
        </div>
        <MiniStat label="Total Masuk" value={fmtIDR(ov.total_masuk)} color="#22C55E" up />
        <MiniStat label="Total Keluar" value={fmtIDR(ov.total_keluar)} color="#EF4444" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(([k, l, ic]) => {
          const I = Icon[ic];
          return (
            <button key={k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition
                ${tab === k ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              <I width={15} height={15} /> {l}
            </button>
          );
        })}
      </div>

      {tab === 'ringkasan' && <RingkasanTab ov={ov} tx={tx} periods={periods} onGo={setTab} />}
      {tab === 'iuran' && <IuranTab onChanged={loadAll} />}
      {tab === 'transaksi' && <TransaksiTab tx={tx} onChanged={loadAll} />}
      {tab === 'laporan' && <LaporanTab tx={tx} />}
      {tab === 'pengaturan' && <PengaturanTab />}
    </div>
  );
}

function MiniStat({ label, value, color, up }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: color + '1a', color }}>
        <Icon.swap width={20} height={20} />
      </div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-xl font-extrabold" style={{ color }}>{up ? '+' : '−'} {value}</div>
      </div>
    </div>
  );
}

/* ====================== RINGKASAN ====================== */
function RingkasanTab({ ov, tx, periods, onGo }) {
  // tren 6 bulan terakhir
  const chart = useMemo(() => {
    const now = new Date();
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ key, name: MONTHS[d.getMonth()], Masuk: 0, Keluar: 0 });
    }
    const idx = Object.fromEntries(out.map((o, i) => [o.key, i]));
    tx.forEach((t) => {
      const key = (t.created_at || '').slice(0, 7);
      if (key in idx) out[idx[key]][t.type === 'masuk' ? 'Masuk' : 'Keluar'] += t.amount;
    });
    return out;
  }, [tx]);

  const latest = periods[0];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="card p-5 lg:col-span-2">
        <h3 className="font-semibold mb-4">Arus Kas 6 Bulan</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chart} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                     tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
              <Tooltip formatter={(v) => fmtIDR(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Masuk" fill="#22C55E" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Keluar" fill="#EF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Iuran Terbaru</h3>
          {!latest ? (
            <p className="text-sm text-slate-400">Belum ada periode iuran.</p>
          ) : (
            <>
              <div className="font-medium text-sm">{latest.title}</div>
              <div className="text-xs text-slate-400 mb-2">Terkumpul {fmtIDR(latest.terkumpul)}</div>
              <Progress done={latest.lunas} total={latest.jumlah} />
              <div className="text-xs text-slate-500 mt-1">Lunas {latest.lunas} dari {latest.jumlah} anggota</div>
            </>
          )}
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm">
            <span className="text-amber-700 font-semibold">{fmtIDR(ov.tagihan_belum)}</span>
            <span className="text-amber-600"> belum tertagih · {ov.anggota_nunggak} anggota</span>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Aksi Cepat</h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickBtn label="Catat uang" onClick={() => onGo('transaksi')} color="#5B5FEF" />
            <QuickBtn label="Tagih iuran" onClick={() => onGo('iuran')} color="#22C55E" />
            <QuickBtn label="Laporan" onClick={() => onGo('laporan')} color="#F59E0B" />
            <QuickBtn label="Pengaturan" onClick={() => onGo('pengaturan')} color="#EC4899" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Progress({ done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all"
           style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#22C55E,#16A34A)' }} />
    </div>
  );
}
function QuickBtn({ label, onClick, color }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition text-sm font-medium text-left">
      <span className="w-2 h-7 rounded-full" style={{ background: color }} />{label}
    </button>
  );
}

/* ====================== IURAN ====================== */
function IuranTab({ onChanged }) {
  const [periods, setPeriods] = useState(null);
  const [sel, setSel] = useState(null);
  const [bills, setBills] = useState(null);
  const [def, setDef] = useState(5000);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const loadPeriods = useCallback(async () => {
    const { data } = await supabase.rpc('cash_list_periods');
    setPeriods(data || []);
  }, []);
  useEffect(() => {
    loadPeriods();
    supabase.rpc('cash_get_settings').then(({ data }) => { if (data && data[0]) setDef(data[0].default_dues); });
  }, [loadPeriods]);

  async function loadBills(pid) {
    setSel(pid); setBills(null);
    const { data } = await supabase.rpc('cash_list_bills', { p_period_id: pid });
    setBills(data || []);
  }
  async function createPeriod() {
    if (!title.trim()) { alert('Isi judul periode (mis. "Minggu 1 Okt")'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('cash_create_period', {
      p_title: title.trim(), p_amount: amount === '' ? null : parseInt(amount, 10),
    });
    setBusy(false);
    if (error) { alert('Gagal: ' + error.message); return; }
    setTitle(''); setAmount(''); loadPeriods(); onChanged();
  }
  async function delPeriod(pid) {
    if (!confirm('Hapus periode ini beserta semua tagihannya?')) return;
    const { error } = await supabase.rpc('cash_delete_period', { p_id: pid });
    if (error) { alert(error.message); return; }
    if (sel === pid) { setSel(null); setBills(null); }
    loadPeriods(); onChanged();
  }

  const shown = (bills || []).filter((b) =>
    `${b.full_name || ''} ${b.nim || ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-1">Tagih Iuran Baru</h3>
          <p className="text-xs text-slate-400 mb-3">Default {fmtIDR(def)}. Minggu libur? Lewati saja.</p>
          <input className="input mb-2" placeholder='Judul (mis. "Minggu 1 Okt")' value={title} onChange={(e) => setTitle(e.target.value)} />
          <input type="number" min="0" className="input mb-3" placeholder={`Nominal (default ${def})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={createPeriod} disabled={busy} className="btn-brand w-full">
            {busy ? 'Membuat…' : 'Buat & Tagih'}
          </button>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Periode</h3>
          {!periods ? <Spinner /> : periods.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada.</p>
          ) : (
            <div className="space-y-2">
              {periods.map((p) => (
                <div key={p.id}
                  className={`p-3 rounded-xl border cursor-pointer transition ${sel === p.id ? 'border-brand bg-brand-light/40' : 'border-slate-100 hover:bg-slate-50'}`}
                  onClick={() => loadBills(p.id)}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{p.title}</div>
                    <button onClick={(e) => { e.stopPropagation(); delPeriod(p.id); }} className="text-red-500 text-xs hover:underline">Hapus</button>
                  </div>
                  <div className="mt-1.5"><Progress done={p.lunas} total={p.jumlah} /></div>
                  <div className="text-xs text-slate-400 mt-1">{fmtIDR(p.amount)} · {p.lunas}/{p.jumlah} lunas</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="font-semibold">Tagihan {sel ? '' : '— pilih periode'}</h3>
            {sel && <input className="input max-w-[200px]" placeholder="Cari anggota…" value={q} onChange={(e) => setQ(e.target.value)} />}
          </div>
          {!sel ? (
            <p className="text-sm text-slate-400">Pilih periode untuk menandai pembayaran.</p>
          ) : !bills ? <Spinner /> : (
            <>
              <div className="flex gap-2 flex-wrap mb-4 text-xs">
                <span className="badge bg-green-100 text-green-700">Lunas {bills.filter((b) => b.status === 'lunas').length}</span>
                <span className="badge bg-amber-100 text-amber-700">Belum {bills.filter((b) => b.status === 'belum').length}</span>
                <span className="badge bg-slate-100 text-slate-500">Bebas {bills.filter((b) => b.status === 'bebas').length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {shown.map((b) => <BillCard key={b.id} b={b} onDone={() => { loadBills(sel); loadPeriods(); onChanged(); }} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const BILL_STATUS = {
  lunas: { label: 'Lunas', color: '#22C55E', bg: '#E8F8EF' },
  belum: { label: 'Belum', color: '#F59E0B', bg: '#FFF7E6' },
  bebas: { label: 'Bebas', color: '#64748B', bg: '#F1F5F9' },
};

function BillCard({ b, onDone }) {
  const [amount, setAmount] = useState(b.amount);
  const [busy, setBusy] = useState(false);
  async function set(status) {
    setBusy(true);
    const { error } = await supabase.rpc('cash_update_bill', {
      p_bill_id: b.id, p_amount: parseInt(amount, 10) || 0, p_status: status, p_note: b.note || null,
    });
    setBusy(false);
    if (error) { alert('Gagal: ' + error.message); return; }
    onDone();
  }
  const st = BILL_STATUS[b.status] || BILL_STATUS.belum;
  const initial = (b.full_name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-100 p-4" style={{ background: st.bg + '80' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full grid place-items-center text-white font-bold shrink-0"
             style={{ background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }}>{initial}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{b.full_name || '-'}</div>
          <div className="text-xs text-slate-400 truncate">{b.nim || '—'}{b.division ? ` · ${divisionLabel(b.division)}` : ''}</div>
        </div>
        <span className="badge shrink-0" style={{ background: '#fff', color: st.color }}>{st.label}</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-slate-400">Rp</span>
        <input type="number" min="0" className="input py-1.5 flex-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-3">
        {['lunas', 'belum', 'bebas'].map((s) => {
          const active = b.status === s;
          const c = BILL_STATUS[s];
          return (
            <button key={s} disabled={busy} onClick={() => set(s)}
              className="py-1.5 rounded-xl text-xs font-semibold capitalize transition border"
              style={active
                ? { background: c.color, color: '#fff', borderColor: c.color }
                : { background: '#fff', color: c.color, borderColor: '#e2e8f0' }}>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ====================== TRANSAKSI ====================== */
function TransaksiTab({ tx, onChanged }) {
  const [f, setF] = useState({ type: 'keluar', amount: '', category: '', note: '', proof: '' });
  async function add() {
    const amt = parseInt(f.amount, 10);
    if (!amt || amt <= 0) { alert('Nominal harus > 0'); return; }
    const { error } = await supabase.rpc('cash_add_transaction', {
      p_type: f.type, p_amount: amt, p_category: f.category || null, p_note: f.note || null, p_proof_url: f.proof || null,
    });
    if (error) { alert('Gagal: ' + error.message); return; }
    setF({ type: 'keluar', amount: '', category: '', note: '', proof: '' }); onChanged();
  }
  async function del(id) {
    if (!confirm('Hapus transaksi ini?')) return;
    const { error } = await supabase.rpc('cash_delete_transaction', { p_id: id });
    if (error) { alert(error.message); return; }
    onChanged();
  }
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="card p-5 lg:col-span-1 h-fit">
        <h3 className="font-semibold mb-3">Catat Transaksi</h3>
        <div className="space-y-2.5">
          <div className="flex gap-2">
            {['masuk', 'keluar'].map((t) => (
              <button key={t} onClick={() => setF({ ...f, type: t })}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition
                  ${f.type === t ? (t === 'masuk' ? 'bg-green-600 text-white' : 'bg-red-500 text-white') : 'bg-slate-100 text-slate-600'}`}>{t}</button>
            ))}
          </div>
          <input type="number" min="1" className="input" placeholder="Nominal (Rp)" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <input className="input" placeholder="Kategori (mis. konsumsi)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <input className="input" placeholder="Catatan (opsional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <input className="input" placeholder="Link bukti (opsional)" value={f.proof} onChange={(e) => setF({ ...f, proof: e.target.value })} />
          <button onClick={add} className="btn-brand w-full">Simpan</button>
        </div>
      </div>
      <div className="card p-5 lg:col-span-2 overflow-x-auto">
        <h3 className="font-semibold mb-3">Buku Kas</h3>
        {tx.length === 0 ? <p className="text-sm text-slate-400">Belum ada transaksi.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">Keterangan</th><th className="py-2 pr-3 text-right">Nominal</th><th></th>
            </tr></thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                  <td className="py-2 pr-3">
                    <div>{t.category || (t.from_iuran ? 'Iuran' : '-')}{t.from_iuran && <span className="badge bg-brand-light text-brand-dark ml-2">iuran</span>}</div>
                    {t.note && <div className="text-xs text-slate-400">{t.note}</div>}
                    {t.proof_url && <a href={t.proof_url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">bukti</a>}
                  </td>
                  <td className={`py-2 pr-3 text-right font-semibold whitespace-nowrap ${t.type === 'masuk' ? 'text-green-700' : 'text-red-600'}`}>{t.type === 'masuk' ? '+' : '−'} {fmtIDR(t.amount)}</td>
                  <td className="py-2">{!t.from_iuran && <button onClick={() => del(t.id)} className="text-red-500 text-xs hover:underline">Hapus</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ====================== LAPORAN ====================== */
function LaporanTab({ tx }) {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [rep, setRep] = useState(null);

  const [y, m] = month.split('-').map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 1);
  const rows = useMemo(() =>
    tx.filter((t) => { const d = new Date(t.created_at); return d >= from && d < to; }),
    [tx, month]); // eslint-disable-line

  useEffect(() => {
    supabase.rpc('cash_report', { p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data }) => setRep((data && data[0]) || null));
  }, [month]); // eslint-disable-line

  const label = `${MONTHS[m - 1]} ${y}`;

  function exportCSV() {
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = ['Tanggal,Tipe,Kategori,Catatan,Nominal'];
    rows.forEach((t) => lines.push([fmtDate(t.created_at), t.type, t.category || (t.from_iuran ? 'Iuran' : ''), t.note || '', (t.type === 'masuk' ? '' : '-') + t.amount].map(esc).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `laporan-kas-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function printPDF() {
    const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const trs = rows.map((t) => `<tr>
      <td>${fmtDate(t.created_at)}</td>
      <td>${esc(t.category || (t.from_iuran ? 'Iuran' : '-'))}${t.note ? ` <span style="color:#888">(${esc(t.note)})</span>` : ''}</td>
      <td style="text-align:right;color:${t.type === 'masuk' ? '#16a34a' : '#dc2626'}">${t.type === 'masuk' ? '+' : '−'} ${fmtIDR(t.amount)}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Laporan Kas ${label}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e293b;padding:28px;font-size:12px}
        h1{color:#3F43D6;margin:0 0 2px}.sub{color:#64748b;margin-bottom:16px}
        .cards{display:flex;gap:10px;margin-bottom:16px}
        .c{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px}
        .c .l{color:#64748b;font-size:11px}.c .v{font-size:15px;font-weight:700}
        table{width:100%;border-collapse:collapse}th{background:#5B5FEF;color:#fff;text-align:left;padding:7px}
        td{border-bottom:1px solid #eee;padding:6px 7px}
        .foot{margin-top:18px;color:#94a3b8;font-size:10px}
      </style></head><body>
      <h1>Laporan Kas — Umalink</h1>
      <div class="sub">Periode: ${label}</div>
      <div class="cards">
        <div class="c"><div class="l">Saldo Awal</div><div class="v">${fmtIDR(rep?.saldo_awal)}</div></div>
        <div class="c"><div class="l">Pemasukan</div><div class="v" style="color:#16a34a">${fmtIDR(rep?.masuk)}</div></div>
        <div class="c"><div class="l">Pengeluaran</div><div class="v" style="color:#dc2626">${fmtIDR(rep?.keluar)}</div></div>
        <div class="c"><div class="l">Saldo Akhir</div><div class="v" style="color:#5B5FEF">${fmtIDR(rep?.saldo_akhir)}</div></div>
      </div>
      <table><thead><tr><th>Tanggal</th><th>Keterangan</th><th style="text-align:right">Nominal</th></tr></thead>
      <tbody>${trs || '<tr><td colspan="3" style="color:#999">Tidak ada transaksi.</td></tr>'}</tbody></table>
      <div class="foot">Dicetak ${new Date().toLocaleString('id-ID')} · Umalink</div>
      <script>window.onload=()=>{window.print()}</script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">Bulan</label>
        <input type="month" className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="ml-auto flex gap-2">
          <button onClick={exportCSV} className="btn-ghost py-2">Export CSV</button>
          <button onClick={printPDF} className="btn-brand py-2">Cetak / PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <RepCard label="Saldo Awal" value={fmtIDR(rep?.saldo_awal)} color="#64748b" />
        <RepCard label="Pemasukan" value={fmtIDR(rep?.masuk)} color="#22C55E" />
        <RepCard label="Pengeluaran" value={fmtIDR(rep?.keluar)} color="#EF4444" />
        <RepCard label="Saldo Akhir" value={fmtIDR(rep?.saldo_akhir)} color="#5B5FEF" />
      </div>

      <div className="card p-5 overflow-x-auto">
        <h3 className="font-semibold mb-3">Rincian — {label}</h3>
        {rows.length === 0 ? <p className="text-sm text-slate-400">Tidak ada transaksi di bulan ini.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2 pr-3">Tanggal</th><th className="py-2 pr-3">Keterangan</th><th className="py-2 pr-3 text-right">Nominal</th>
            </tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-slate-50">
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                  <td className="py-2 pr-3">{t.category || (t.from_iuran ? 'Iuran' : '-')}{t.note && <span className="text-slate-400"> ({t.note})</span>}</td>
                  <td className={`py-2 pr-3 text-right font-semibold ${t.type === 'masuk' ? 'text-green-700' : 'text-red-600'}`}>{t.type === 'masuk' ? '+' : '−'} {fmtIDR(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
function RepCard({ label, value, color }) {
  return (
    <div className="card p-4 border-l-4" style={{ borderLeftColor: color }}>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-extrabold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

/* ====================== PENGATURAN ====================== */
function PengaturanTab() {
  const [def, setDef] = useState(5000);
  const [disabled, setDisabled] = useState([]);
  const [saved, setSaved] = useState(false);
  const [members, setMembers] = useState(null);
  useEffect(() => {
    supabase.rpc('cash_get_settings').then(({ data }) => { if (data && data[0]) { setDef(data[0].default_dues); setDisabled(data[0].disabled_divisions || []); } });
    supabase.from('profiles').select('id, full_name, is_treasurer').order('full_name').then(({ data }) => setMembers(data || []));
  }, []);
  function toggleDiv(v) { setDisabled((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v])); }
  async function save() {
    const { error } = await supabase.rpc('cash_set_settings', { p_default_dues: parseInt(def, 10) || 0, p_disabled_divisions: disabled });
    if (error) { alert('Gagal: ' + error.message); return; }
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }
  async function toggleTreasurer(id, flag) {
    const { error } = await supabase.rpc('set_treasurer', { p_user_id: id, p_flag: flag });
    if (error) { alert('Gagal: ' + error.message + ' (hanya admin)'); return; }
    setMembers((mm) => mm.map((x) => (x.id === id ? { ...x, is_treasurer: flag } : x)));
  }
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold mb-4">Pengaturan Iuran</h3>
        <label className="text-sm font-medium">Iuran default per periode (Rp)</label>
        <input type="number" min="0" className="input mt-1 mb-4" value={def} onChange={(e) => setDef(e.target.value)} />
        <label className="text-sm font-medium">Nonaktifkan iuran untuk divisi</label>
        <div className="mt-2 space-y-2">
          {DIVISIONS.filter(([v]) => v !== '').map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={disabled.includes(v)} onChange={() => toggleDiv(v)} />
              {l} {disabled.includes(v) && <span className="text-xs text-red-500">(tidak ditagih)</span>}
            </label>
          ))}
        </div>
        <button onClick={save} className="btn-brand mt-5">Simpan Pengaturan</button>
        {saved && <span className="text-sm text-green-700 ml-3">Tersimpan.</span>}
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-1">Bendahara</h3>
        <p className="text-xs text-slate-400 mb-4">Beri akses kelola kas (hanya admin yang bisa mengubah).</p>
        {!members ? <Spinner /> : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {members.map((m) => (
              <label key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span>{m.full_name || '-'}</span>
                <input type="checkbox" checked={!!m.is_treasurer} onChange={(e) => toggleTreasurer(m.id, e.target.checked)} />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
