'use client';

import { useState } from 'react';
import { supabase, SUPABASE_URL } from '@/lib/supabaseClient';
import { ROLES, DIVISIONS } from '@/lib/constants';
import Select from '@/components/Select';

function emptyRow() {
  return { email: '', password: '', full_name: '', role: 'anggota', division: '' };
}
function randomPass(len = 8) {
  const c = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: len }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

export default function BulkPage() {
  const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null);

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

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="font-semibold">Daftarkan Anggota</h3>
            <p className="text-sm text-slate-500">Isi tiap baris. Email langsung aktif, anggota bisa langsung login.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fillPasswords} className="btn-ghost py-2">Isi password acak</button>
            <button onClick={clearAll} className="btn-ghost py-2">Kosongkan</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2 pr-2 font-medium w-8">#</th>
                <th className="pb-2 pr-2 font-medium">Email</th>
                <th className="pb-2 pr-2 font-medium">Password</th>
                <th className="pb-2 pr-2 font-medium">Nama</th>
                <th className="pb-2 pr-2 font-medium">Role</th>
                <th className="pb-2 pr-2 font-medium">Divisi</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const res = okByEmail[row.email.trim()];
                return (
                  <tr key={i} className="align-top">
                    <td className="py-1 pr-2 text-slate-400 pt-3">{i + 1}</td>
                    <td className="py-1 pr-2">
                      <input className="input py-1.5" type="email" placeholder="nama@email.com"
                             value={row.email} onChange={(e) => update(i, 'email', e.target.value)} />
                      {res && (
                        <span className={`text-[11px] ${res.ok ? 'text-green-600' : 'text-red-600'}`}>
                          {res.ok ? (res.warning || '✓ dibuat') : res.error}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex gap-1">
                        <input className="input py-1.5" placeholder="min 6 karakter"
                               value={row.password} onChange={(e) => update(i, 'password', e.target.value)} />
                        <button type="button" title="Acak"
                                onClick={() => update(i, 'password', randomPass())}
                                className="shrink-0 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs">⟳</button>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <input className="input py-1.5" placeholder="Nama"
                             value={row.full_name} onChange={(e) => update(i, 'full_name', e.target.value)} />
                    </td>
                    <td className="py-1 pr-2 min-w-[130px]">
                      <Select value={row.role} onChange={(v) => update(i, 'role', v)}
                        options={ROLES.filter((r) => r !== 'superadmin').map((r) => [r, r])} />
                    </td>
                    <td className="py-1 pr-2 min-w-[130px]">
                      <Select value={row.division} onChange={(v) => update(i, 'division', v)} options={DIVISIONS} />
                    </td>
                    <td className="py-1 pt-2">
                      <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 text-lg leading-none">×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button onClick={addRow} className="mt-3 text-sm text-brand font-semibold hover:underline">+ Tambah baris</button>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100">
          <button onClick={submit} disabled={busy} className="btn-brand">
            {busy ? 'Memproses…' : `Daftarkan ${rows.filter((r) => r.email.trim() && r.password).length} anggota`}
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
          {result && <span className="text-sm text-green-700 font-semibold">Berhasil {result.berhasil}/{result.total}.</span>}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Tips: pakai “Isi password acak” untuk mengisi semua password kosong sekaligus, lalu bagikan ke anggota.
      </p>
    </div>
  );
}
