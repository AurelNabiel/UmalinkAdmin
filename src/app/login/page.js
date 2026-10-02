'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, configOk } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
      else setReady(true);
    });
  }, [router]);

  async function doLogin(e) {
    e.preventDefault();
    setErr('');
    if (!configOk()) {
      setErr('Kredensial Supabase belum diisi di .env.local');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(), password: pass,
    });
    if (error) { setErr(error.message); setBusy(false); return; }
    const { data: prof } = await supabase
      .from('profiles').select('role, is_treasurer').eq('id', data.user.id).maybeSingle();
    const allowed = prof && (['admin', 'superadmin'].includes(prof.role) || prof.is_treasurer === true);
    if (!allowed) {
      await supabase.auth.signOut();
      setErr('Akun ini tidak punya akses dashboard (admin/bendahara).');
      setBusy(false);
      return;
    }
    router.replace('/dashboard');
  }

  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-slate-400">Memuat…</div>;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Panel kiri dekoratif */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg,#5B5FEF 0%,#7C4DFF 55%,#22D3EE 120%)' }}>
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute bottom-10 -left-16 w-72 h-72 rounded-full bg-white/10" />
        <div className="flex items-center gap-3 relative">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur grid place-items-center font-black">U</div>
          <span className="text-xl font-bold">Umalink</span>
        </div>
        <div className="relative">
          <h1 className="text-4xl font-black leading-tight">Dashboard<br/>Pengurus</h1>
          <p className="mt-3 text-white/80 max-w-sm">Kelola anggota, kegiatan, tugas, merch, dan penukaran poin dalam satu tempat.</p>
        </div>
        <p className="relative text-white/60 text-sm">© {new Date().getFullYear()} Umalink</p>
      </div>

      {/* Form */}
      <div className="grid place-items-center p-6">
        <form onSubmit={doLogin} className="w-full max-w-sm card p-7 animate-fade-up">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl" style={{ background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }} />
            <span className="font-bold">Umalink</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Masuk</h2>
          <p className="text-sm text-slate-500 mb-5">Khusus akun admin / superadmin.</p>

          <label className="block text-sm font-medium mb-1">Email</label>
          <input className="input mb-3" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} required />
          <label className="block text-sm font-medium mb-1">Password</label>
          <input className="input mb-5" type="password" value={pass}
                 onChange={(e) => setPass(e.target.value)} required />

          <button className="btn-brand w-full" disabled={busy}>
            {busy ? 'Memproses…' : 'Masuk'}
          </button>
          {err && <p className="text-sm text-red-600 mt-3">{err}</p>}
        </form>
      </div>
    </div>
  );
}
