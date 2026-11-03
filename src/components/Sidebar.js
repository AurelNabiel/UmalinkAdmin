'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icons';

const NAV = [
  ['/dashboard', 'Ringkasan', 'grid'],
  ['/dashboard/anggota', 'Anggota', 'users'],
  ['/dashboard/bulk', 'Bulk Register', 'upload'],
  ['/dashboard/kegiatan', 'Kegiatan', 'calendar'],
  ['/dashboard/tugas', 'Tugas', 'check'],
  ['/dashboard/pengumuman', 'Pengumuman', 'list'],
  ['/dashboard/izin', 'Izin', 'clock'],
  ['/dashboard/rsvp', 'RSVP', 'users'],
  ['/dashboard/galeri', 'Galeri', 'grid'],
  ['/dashboard/komentar', 'Komentar', 'list'],
  ['/dashboard/poin', 'Poin & Sertifikat', 'star'],
  ['/dashboard/merch', 'Merch', 'gift'],
  ['/dashboard/penukaran', 'Penukaran', 'swap'],
  ['/dashboard/kas', 'Uang Kas', 'wallet'],
  ['/dashboard/carousel', 'Carousel', 'grid'],
  ['/dashboard/audit', 'Audit Log', 'clock'],
];

// Menu untuk anggota (hanya yang bisa mereka akses di aplikasi).
const MEMBER_NAV = [
  ['/dashboard', 'Ringkasan', 'grid'],
  ['/dashboard/tugas-saya', 'Tugas', 'check'],
  ['/dashboard/kegiatan-saya', 'Kegiatan', 'calendar'],
  ['/dashboard/keaktifan', 'Keaktifan & Sertifikat', 'star'],
];

export default function Sidebar({ open, onClose, onLogout, canAdmin = true, isTreasurer = false }) {
  const path = usePathname();
  let items;
  if (canAdmin) {
    items = NAV;
  } else {
    items = [...MEMBER_NAV];
    if (isTreasurer) items.push(['/dashboard/kas', 'Uang Kas', 'wallet']);
  }
  return (
    <>
      {/* overlay mobile */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 z-20 md:hidden transition ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen w-64 shrink-0 bg-white/85 backdrop-blur-xl border-r border-slate-200/70
                    flex flex-col transition-transform md:translate-x-0
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-200/70">
          <img src="/umalink-logo.png" alt="Umalink" className="w-9 h-9 rounded-xl object-cover shadow-sm" />
          <div className="leading-tight">
            <div className="font-bold tracking-tight">Umalink</div>
            <div className="text-[11px] text-slate-400">Panel Pengurus</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map(([href, label, ic]) => {
            const active = path === href || (href !== '/dashboard' && path.startsWith(href + '/'));
            const I = Icon[ic];
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'text-white shadow-md shadow-brand/30'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'}`}
                style={active ? { backgroundImage: 'linear-gradient(135deg,#5B5FEF,#4A4FE6)' } : undefined}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white/70" />}
                <I width={18} height={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button onClick={onLogout}
          className="m-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition">
          <Icon.logout width={18} height={18} />
          Keluar
        </button>
      </aside>
    </>
  );
}
