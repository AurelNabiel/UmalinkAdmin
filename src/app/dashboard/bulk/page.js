'use client';

import { useState } from 'react';
import { supabase, SUPABASE_URL } from '@/lib/supabaseClient';
import { ROLES, DIVISIONS } from '@/lib/constants';
import { Icon } from '@/components/Icons';
import Select from '@/components/Select';

function emptyRow() {
  return { email: '', password: '', full_name: '', role: 'anggota', division: '' };
}
function randomPass(len = 8) {
  const c = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

export default function BulkPage() {
  const [rows, setRows] = useState([emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);
  const [showPw, setShowPw] = useState(true);

  function update(i, field, val) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  }
  function addRow() { setRows((r) => [...r, emptyRow()]); }
  function removeRow(i) { setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r)); }
  function fillPasswords() {
    setRows((r) => r.map((row) => (row.password ? row : { ...row, password: randomPass() })));
  }
  function clearAll() { setRows([emptyRow()]); setResult(null); setErr(''); }

  async function submit() {
    setErr(''); setResult(null);
    const valid = rows
      .map((r) => ({ ...r, email: r.email.trim(), full_name: r.full_name.trim() }))
      .filter((r) => r.email && r.password);
    if (!valid.length) { setErr('Isi minimal satu baris dengan email & password.'); return; }
    const bad = valid.find((r) => r.password.length < 6);
    if (bad) { setErr(`Password untuk ${bad.email} kurang dari 6 karakter.`); return; }

    setBusy(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/bulk-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.session.access_token },
        body: JSON.stringify({ users: valid }),
      });
      const j = await res.json();
      if (!res.ok) setErr(j.error || 'Gagal');
      else setResult(j);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const okByEmail = {};
  (result?.results || []).forEach((r) => { okByEmail[r.email] = r; });
  const readyCount = rows.filter((r) => r.email.trim() && r.password).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Hero */}
      <div className="rounded-2xl p-5 sm:p-6 text-white shadow-soft relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg,#5B5FEF,#7C4DFF,#22D3EE)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/15" />
        <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center shrink-0">
            <Icon.users width={24} height={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold">Daftarkan Anggota</h2>
            <p className="text-sm text-white/85 mt-0.5">
              Tambah beberapa anggota sekaligus. Email langsung aktif — anggota bisa login seketika.
            </p>
          </div>
        </div>
        <div className="relative flex gap-2.5 mt-4 flex-wrap">
          <Chip>{rows.length} baris</Chip>
          <Chip>{readyCount} siap didaftarkan</Chip>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={fillPasswords} className="btn-ghost py-2 text-sm">
          <Icon.star width={15} height={15} /> Isi password acak
        </button>
        <button onClick={clearAll} className="btn-ghost py-2 text-sm">
          <Icon.trash width={15} height={15} /> Kosongkan
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
          Tampilkan password
        </label>
      </div>

      {/* Ringkasan hasil */}
      {result && (
        <div className="card p-4 flex items-center gap-3 border-l-4" style={{ borderLeftColor: '#22C55E' }}>
          <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <Icon.check width={18} height={18} />
          </div>
          <div className="text-sm">
            <span className="font-semibold text-green-700">Berhasil {result.berhasil} dari {result.total}.</span>
            {result.berhasil < result.total && <span className="text-slate-500"> Periksa baris bertanda merah di bawah.</span>}
          </div>
        </div>
      )}

      {/* Kartu anggota */}
      <div className="space-y-3">
        {rows.map((row, i) => {
          const res = okByEmail[row.email.trim()];
          const initial = (row.full_name || row.email || '?').trim().charAt(0).toUpperCase();
          return (
            <div key={i}
                 className={`card p-4 sm:p-5 transition ${res ? (res.ok ? 'ring-1 ring-green-200' : 'ring-1 ring-red-200') : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold shrink-0"
                     style={{ background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }}>{initial}</div>
                {res && (
                  <span className={`badge ${res.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {res.ok ? (res.warning || 'Dibuat') : 'Gagal'}
                  </span>
                )}
                <button onClick={() => removeRow(i)}
                        className="ml-auto w-8 h-8 rounded-lg grid place-items-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                        title="Hapus baris">
                  <Icon.trash width={16} height={16} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Email</Label>
                  <input className="input" type="email" placeholder="nama@email.com"
                         value={row.email} onChange={(e) => update(i, 'email', e.target.value)} />
                  {res && !res.ok && <p className="text-xs text-red-600 mt-1">{res.error}</p>}
                </div>

                <div>
                  <Label>Password</Label>
                  <div className="flex gap-1.5">
                    <input className="input" type={showPw ? 'text' : 'password'} placeholder="min. 6 karakter"
                           value={row.password} onChange={(e) => update(i, 'password', e.target.value)} />
                    <button type="button" title="Acak" onClick={() => update(i, 'password', randomPass())}
                            className="shrink-0 w-10 rounded-xl bg-brand-light text-brand hover:bg-brand hover:text-white transition grid place-items-center">
                      <Icon.swap width={16} height={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Nama Lengkap</Label>
                  <input className="input" placeholder="Nama anggota"
                         value={row.full_name} onChange={(e) => update(i, 'full_name', e.target.value)} />
                </div>

                <div>
                  <Label>Role</Label>
                  <Select value={row.role} onChange={(v) => update(i, 'role', v)}
                          options={ROLES.filter((r) => r !== 'superadmin').map((r) => [r, r])} />
                </div>

                <div>
                  <Label>Divisi</Label>
                  <Select value={row.division} onChange={(v) => update(i, 'division', v)} options={DIVISIONS} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tambah baris */}
      <button onClick={addRow}
              className="w-full rounded-2xl border-2 border-dashed border-slate-200 hover:border-brand/50 hover:bg-brand-light/40 transition py-4 text-sm font-semibold text-brand flex items-center justify-center gap-2">
        <span className="text-lg leading-none">+</span> Tambah Anggota
      </button>

      {/* Action bar */}
      <div className="card p-4 flex items-center gap-3 flex-wrap sticky bottom-4">
        <button onClick={submit} disabled={busy || readyCount === 0} className="btn-brand">
          {busy ? 'Memproses…' : `Daftarkan ${readyCount} anggota`}
        </button>
        {err && <span className="text-sm text-red-600">{err}</span>}
        <p className="text-xs text-slate-400 ml-auto hidden sm:block">
          Tips: “Isi password acak” mengisi semua password kosong sekaligus.
        </p>
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
      {children}
    </span>
  );
}
function Label({ children }) {
  return <label className="block text-xs font-medium text-slate-500 mb-1">{children}</label>;
}
