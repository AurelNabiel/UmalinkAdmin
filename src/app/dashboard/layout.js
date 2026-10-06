'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';

const TITLES = {
  '/dashboard': 'Ringkasan',
  '/dashboard/anggota': 'Kelola Anggota',
  '/dashboard/bulk': 'Bulk Register',
  '/dashboard/kegiatan': 'Kelola Kegiatan',
  '/dashboard/tugas': 'Kelola Tugas',
  '/dashboard/merch': 'Kelola Merch',
  '/dashboard/penukaran': 'Penukaran Poin',
  '/dashboard/poin': 'Poin & Sertifikat',
  '/dashboard/kas': 'Uang Kas',
  '/dashboard/audit': 'Audit Log',
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const prevPath = useRef(path);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/login'); return; }
      const uid = data.session.user.id;
      const { data: prof } = await supabase
        .from('profiles').select('full_name, role, is_treasurer').eq('id', uid).maybeSingle();
      const isAdmin = prof && ['admin', 'superadmin'].includes(prof.role);
      const isTreasurer = prof?.is_treasurer === true;
      if (!prof || (!isAdmin && !isTreasurer)) {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }
      // Bendahara non-admin diarahkan ke halaman Kas.
      if (!isAdmin && path === '/dashboard') { router.replace('/dashboard/kas'); }
      if (active) {
        setMe({ ...prof, email: data.session.user.email, canAdmin: isAdmin });
        setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  // Overlay transisi singkat tiap pindah halaman.
  useEffect(() => {
    if (checking) return;
    if (prevPath.current !== path) {
      prevPath.current = path;
      setRouteLoading(true);
      const t = setTimeout(() => setRouteLoading(false), 650);
      return () => clearTimeout(t);
    }
  }, [path, checking]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (checking) {
    return <LoadingScreen tagline="Menyiapkan panel pengurus…" />;
  }

  return (
    <div className="flex min-h-screen">
      <AnimatePresence>
        {routeLoading && <LoadingScreen key="route-loading" />}
      </AnimatePresence>
      <Sidebar open={open} onClose={() => setOpen(false)} onLogout={logout} canAdmin={me?.canAdmin !== false} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 h-16 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(true)}>
              <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
              <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
              <span className="block w-5 h-0.5 bg-slate-700" />
            </button>
            <img src="/umalink-logo.png" alt="Umalink" className="md:hidden w-8 h-8 object-cover" />
            <h1 className="text-lg font-bold">{TITLES[path] || (path.startsWith('/dashboard/tugas/') ? 'Review Tugas' : 'Dashboard')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-sm font-semibold">{me?.full_name || 'Admin'}</div>
              <div className="text-[11px] text-slate-400 capitalize">{me?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full grid place-items-center text-white font-bold"
                 style={{ background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }}>
              {(me?.full_name || 'A').trim().charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
