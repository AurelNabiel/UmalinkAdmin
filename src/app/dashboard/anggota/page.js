'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { ROLES, DIVISIONS, divisionLabel } from '@/lib/constants';
import Select from '@/components/Select';

const ROLE_COLOR = {
  superadmin: '#7C4DFF', admin: '#5B5FEF', petugas: '#F59E0B', anggota: '#64748b',
};
const DIV_COLOR = {
  dance_cover: '#5B5FEF', kasei: '#22C55E', manga: '#F59E0B', '': '#94a3b8',
};

export default function AnggotaPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [noEmail, setNoEmail] = useState(false);
  const [rpcErr, setRpcErr] = useState('');
  const [q, setQ] = useState('');
  const [fRole, setFRole] = useState('');
  const [fDiv, setFDiv] = useState('__any');
  const [view, setView] = useState('grid');
  const [edit, setEdit] = useState(null);

  useEffect(() => {
    try { const v = localStorage.getItem('umalink_anggota_view'); if (v) setView(v); } catch {}
  }, []);
  function setViewPersist(v) {
    setView(v);
    try { localStorage.setItem('umalink_anggota_view', v); } catch {}
  }

  async function load() {
    setErr('');
    const { data, error } = await supabase.rpc('admin_list_members');
    if (!error && data) { setRows(data); setNoEmail(false); setRpcErr(''); return; }
    setRpcErr(error ? `${error.code || ''} ${error.message || ''}`.trim() : 'RPC kosong');
    const { data: profs, error: e2 } = await supabase
      .from('profiles')
      .select('id, full_name, role, division, nim, phone, jabatan, avatar_url, created_at')
      .order('full_name', { ascending: true });
    if (e2) { setErr(e2.message); return; }
    setRows((profs || []).map((p) => ({ ...p, email: null })));
    setNoEmail(true);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((m) => {
      const hay = `${m.full_name || ''} ${m.email || ''} ${m.nim || ''}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (fRole && m.role !== fRole) return false;
      if (fDiv !== '__any' && (m.division || '') !== fDiv) return false;
      return true;
    });
  }, [rows, q, fRole, fDiv]);

  function exportCSV() {
    const head = ['Nama', 'Email', 'NIM', 'Role', 'Divisi', 'Jabatan', 'Telepon'];
    const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [head.join(',')];
    filtered.forEach((m) => lines.push([
      m.full_name, m.email || '', m.nim || '', m.role, divisionLabel(m.division), m.jabatan || '', m.phone || '',
    ].map(esc).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `anggota-umalink-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function printTable() {
    const esc = (s) => String(s ?? '-').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const info = [];
    if (fRole) info.push(`Role: ${fRole}`);
    if (fDiv !== '__any') info.push(`Divisi: ${divisionLabel(fDiv)}`);
    if (q) info.push(`Cari: "${q}"`);
    const rowsHtml = filtered.map((m, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(m.full_name)}</td>
      <td>${esc(m.email || '-')}</td>
      <td class="c">${esc(m.nim || '-')}</td>
      <td class="c"><span class="tag">${esc(m.role)}</span></td>
      <td>${esc(divisionLabel(m.division))}</td>
      <td>${esc(m.jabatan || '-')}</td>
      <td>${esc(m.phone || '-')}</td>
    </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Daftar Anggota Umalink</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;padding:28px;font-size:12px}
        .head{display:flex;align-items:center;gap:12px;margin-bottom:4px}
        .logo{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#5B5FEF,#7C4DFF,#22D3EE)}
        h1{font-size:20px;margin:0;color:#3F43D6}
        .sub{color:#64748b;margin:2px 0 16px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        thead th{background:#5B5FEF;color:#fff;text-align:left;padding:8px 9px;font-weight:600}
        thead th:first-child{border-top-left-radius:8px} thead th:last-child{border-top-right-radius:8px}
        td{border-bottom:1px solid #e9eef5;padding:7px 9px;vertical-align:top}
        tbody tr:nth-child(even){background:#f8fafc}
        .c{text-align:center}
        .tag{background:#EEF2FF;color:#4338CA;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:600}
        .foot{margin-top:16px;color:#94a3b8;font-size:10px;display:flex;justify-content:space-between}
        @media print{body{padding:10px}}
      </style></head><body>
      <div class="head"><div class="logo"></div><h1>Daftar Anggota — Umalink</h1></div>
      <div class="sub">${filtered.length} anggota${info.length ? ' · ' + info.join(' · ') : ''}</div>
      <table>
        <thead><tr>
          <th class="c">No</th><th>Nama</th><th>Email</th><th class="c">NIM</th>
          <th class="c">Role</th><th>Divisi</th><th>Jabatan</th><th>Telepon</th>
        </tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="8" style="color:#999;text-align:center;padding:16px">Tidak ada data.</td></tr>'}</tbody>
      </table>
      <div class="foot"><span>Dicetak ${new Date().toLocaleString('id-ID')}</span><span>Umalink</span></div>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!rows) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input className="input max-w-xs flex-1 min-w-[160px]" placeholder="Cari nama / email / NIM…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={fRole} onChange={setFRole} className="w-40"
            options={[['', 'Semua role'], ...ROLES.map((r) => [r, r])]} />
          <Select value={fDiv} onChange={setFDiv} className="w-40"
            options={[['__any', 'Semua divisi'], ...DIVISIONS]} />
          {(q || fRole || fDiv !== '__any') && (
            <button onClick={() => { setQ(''); setFRole(''); setFDiv('__any'); }} className="btn-ghost py-2">Reset</button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-400">{filtered.length}/{rows.length}</span>
            {/* Toggle tampilan */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setViewPersist('grid')}
                className={`px-2.5 py-2 ${view === 'grid' ? 'bg-brand text-white' : 'bg-white text-slate-500'}`} title="Kartu">
                <Icon.grid width={16} height={16} />
              </button>
              <button onClick={() => setViewPersist('list')}
                className={`px-2.5 py-2 ${view === 'list' ? 'bg-brand text-white' : 'bg-white text-slate-500'}`} title="List">
                <Icon.list width={16} height={16} />
              </button>
            </div>
            <button onClick={exportCSV} className="btn-ghost py-2">CSV</button>
            <button onClick={printTable} className="btn-brand py-2">Cetak / PDF</button>
          </div>
        </div>
        {noEmail && (
          <p className="text-xs text-amber-600 mt-2">
            Email tidak tampil (fungsi admin gagal, pakai fallback).{rpcErr ? ` Error: ${rpcErr}` : ''}
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">Tidak ada yang cocok.</div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((m) => <MemberCard key={m.id} m={m} onClick={() => setEdit(m)} />)}
        </div>
      ) : (
        <div className="card p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="py-2.5 pr-3">Nama</th><th className="py-2.5 pr-3">Email</th>
              <th className="py-2.5 pr-3">NIM</th><th className="py-2.5 pr-3">Role</th>
              <th className="py-2.5 pr-3">Divisi</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar m={m} size={30} />
                      <span className="font-medium">{m.full_name || '-'}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-slate-500">{m.email || '—'}</td>
                  <td className="py-2 pr-3">{m.nim || '—'}</td>
                  <td className="py-2 pr-3"><Badge text={m.role} color={ROLE_COLOR[m.role]} /></td>
                  <td className="py-2 pr-3"><Badge text={divisionLabel(m.division)} color={DIV_COLOR[m.division || '']} /></td>
                  <td className="py-2"><button onClick={() => setEdit(m)} className="text-brand text-xs font-semibold hover:underline">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <EditModal
          m={edit}
          onClose={() => setEdit(null)}
          onSaved={(upd) => {
            setRows((rs) => rs.map((x) => (x.id === upd.id ? { ...x, ...upd } : x)));
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}

function Avatar({ m, size = 44 }) {
  const initial = (m.full_name || '?').trim().charAt(0).toUpperCase();
  if (m.avatar_url) {
    return <img src={m.avatar_url} alt="" className="rounded-full object-cover shrink-0"
                style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full grid place-items-center text-white font-bold shrink-0"
         style={{ width: size, height: size, fontSize: size * 0.4, background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }}>
      {initial}
    </div>
  );
}

function Badge({ text, color }) {
  return <span className="badge" style={{ background: (color || '#64748b') + '1a', color: color || '#64748b' }}>{text}</span>;
}

function MemberCard({ m, onClick }) {
  return (
    <button onClick={onClick}
      className="card p-5 flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition">
      <Avatar m={m} size={64} />
      <div className="font-semibold mt-3 truncate w-full">{m.full_name || 'Tanpa nama'}</div>
      {m.nim && <div className="text-xs text-slate-400">{m.nim}</div>}
      <div className="flex flex-wrap gap-1.5 justify-center mt-2">
        <Badge text={divisionLabel(m.division)} color={DIV_COLOR[m.division || '']} />
        <Badge text={m.role} color={ROLE_COLOR[m.role]} />
      </div>
    </button>
  );
}

function EditModal({ m, onClose, onSaved }) {
  const [nim, setNim] = useState(m.nim || '');
  const [role, setRole] = useState(m.role);
  const [division, setDivision] = useState(m.division || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true); setErr('');
    const { error } = await supabase.rpc('admin_provision_member', {
      p_id: m.id, p_full_name: '', p_role: role, p_division: division || null, p_nim: nim.trim(),
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved({ id: m.id, nim: nim.trim(), role, division: division || null });
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-sm p-6 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center mb-4">
          <Avatar m={m} size={72} />
          <div className="font-bold text-lg mt-3">{m.full_name || 'Tanpa nama'}</div>
          {m.email && <div className="text-xs text-slate-400">{m.email}</div>}
        </div>

        <label className="text-sm font-medium">NIM</label>
        <input className="input mt-1 mb-3" value={nim} onChange={(e) => setNim(e.target.value)} placeholder="NIM" />

        <label className="text-sm font-medium">Role</label>
        <div className="mt-1 mb-3"><Select value={role} onChange={setRole} options={ROLES.map((r) => [r, r])} /></div>

        <label className="text-sm font-medium">Divisi</label>
        <div className="mt-1 mb-4"><Select value={division} onChange={setDivision} options={DIVISIONS} /></div>

        {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Batal</button>
          <button onClick={save} disabled={busy} className="btn-brand flex-1">{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </div>
    </div>
  );
}
