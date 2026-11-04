'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAsync, AsyncBlock } from '@/components/async';

export default function PengaturanPage() {
  const cur = useAsync(
    () => supabase.from('app_settings').select('admin_contact').maybeSingle(),
    [],
  );

  return (
    <div className="max-w-xl">
      <AsyncBlock state={cur}>
        {(row) => <ContactForm initial={row?.admin_contact || ''} onSaved={cur.reload} />}
      </AsyncBlock>
    </div>
  );
}

function ContactForm({ initial, onSaved }) {
  const [wa, setWa] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function save() {
    const clean = wa.replace(/[^0-9]/g, '');
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('set_admin_contact', { p_contact: clean });
    setBusy(false);
    if (error) { setMsg(['err', error.message]); return; }
    setWa(clean);
    setMsg(['ok', 'Kontak admin disimpan.']);
    onSaved();
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1">Kontak Admin (Pendaftaran & Reset)</h3>
      <p className="text-xs text-slate-400 mb-4">
        Nomor WhatsApp ini ditampilkan di halaman login aplikasi untuk anggota yang
        ingin mendaftar atau lupa password. Format internasional tanpa “+”, mis.{' '}
        <span className="font-mono">628123456789</span>.
      </p>
      <label className="text-sm font-medium text-slate-600">Nomor WhatsApp</label>
      <input
        className="input mt-1.5"
        inputMode="numeric"
        placeholder="628123456789"
        value={wa}
        onChange={(e) => setWa(e.target.value)}
      />
      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} disabled={busy} className="btn-brand">
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
        {wa.replace(/[^0-9]/g, '') && (
          <a
            href={`https://wa.me/${wa.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand font-semibold"
          >
            Tes buka WhatsApp →
          </a>
        )}
        {msg && (
          <span className={`text-sm ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>
            {msg[1]}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-4">
        Kosongkan lalu simpan untuk menghapus nomor (login hanya menampilkan teks arahan).
      </p>
    </div>
  );
}
