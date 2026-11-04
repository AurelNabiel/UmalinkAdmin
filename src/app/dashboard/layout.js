'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';

const TITLES = {
  '/dashboard': 'Ringkasan',
  '/dashboard/anggota': 'Kelola Anggota',
  '/dashboard/bulk': 'Bulk Register',
  '/dashboard/kegiatan': 'Kelola Kegiatan',
  '/dashboard/tugas': 'Kelola Tugas',
  '/dashboard/pengumuman': 'Pengumuman',
  '/dashboard/izin': 'Persetujuan Izin',
  '/dashboard/rsvp': 'Konfirmasi Hadir (RSVP)',
  '/dashboard/galeri': 'Galeri Dokumentasi',
  '/dashboard/komentar': 'Moderasi Komentar',
  '/dashboard/merch': 'Kelola Merch',
  '/dashboard/penukaran': 'Penukaran Poin',
  '/dashboard/poin': 'Poin & Sertifikat',
  '/dashboard/kas': 'Uang Kas',
  '/dashboard/carousel': 'Carousel & Berita',
  '/dashboard/pengaturan': 'Pengaturan',
  '/dashboard/audit': 'Audit Log',
  '/dashboard/tugas-saya': 'Tugas Saya',
  '/dashboard/kegiatan-saya': 'Kegiatan',
  '/dashboard/keaktifan': 'Keaktifan & Sertifikat',
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace('/login'); return; }
      const uid = data.session.user.id;
      const { data: prof } = await supabase
        .from('profiles').select('full_name, role, is_treasurer').eq('id', uid).maybeSingle();
      if (!prof) {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }
      const isAdmin = ['admin', 'superadmin'].includes(prof.role);
      const isTreasurer = prof.is_treasurer === true;
      if (active) {
        setMe({ ...prof, email: data.session.user.email, canAdmin: isAdmin, isTreasurer });
        setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  // Anggota/bendahara hanya boleh membuka halaman yang diizinkan.
  useEffect(() => {
    if (checking || !me || me.canAdmin) return;
    const allowed = ['/dashboard', '/dashboard/tugas-saya', '/dashboard/kegiatan-saya', '/dashboard/keaktifan'];
    if (me.isTreasurer) allowed.push('/dashboard/kas');
    const ok = allowed.some((r) => path === r || path.startsWith(r + '/'));
    if (!ok) router.replace('/dashboard');
  }, [path, checking, me, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (checking) {
    return <LoadingScreen tagline="Menyiapkan panel pengurus…" />;
  }

  const title = TITLES[path] || (path.startsWith('/dashboard/tugas/') ? 'Review Tugas' : 'Dashboard');

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} onLogout={logout} canAdmin={me?.canAdmin === true} isTreasurer={me?.isTreasurer === true} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/70 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(true)}>
              <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
              <span className="block w-5 h-0.5 bg-slate-700 mb-1" />
              <span className="block w-5 h-0.5 bg-slate-700" />
            </button>
            <img src="/umalink-logo.png" alt="Umalink" className="md:hidden w-8 h-8 rounded-lg object-cover" />
            <div className="flex items-center gap-2.5">
              <span className="hidden md:block w-1.5 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,#5B5FEF,#22D3EE)' }} />
              <h1 className="text-lg font-bold tracking-tight">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-sm font-semibold">{me?.full_name || 'Admin'}</div>
              <div className="text-[11px] text-slate-400 capitalize">{me?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full grid place-items-center text-white font-bold ring-2 ring-white shadow-md"
                 style={{ background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }}>
              {(me?.full_name || 'A').trim().charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <main key={path} className="flex-1 p-4 md:p-6 animate-fade-up">{children}</main>
      </div>
    </div>
  );
}
