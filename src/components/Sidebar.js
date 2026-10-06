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
  ['/dashboard/poin', 'Poin & Sertifikat', 'star'],
  ['/dashboard/merch', 'Merch', 'gift'],
  ['/dashboard/penukaran', 'Penukaran', 'swap'],
  ['/dashboard/kas', 'Uang Kas', 'wallet'],
  ['/dashboard/audit', 'Audit Log', 'clock'],
];

export default function Sidebar({ open, onClose, onLogout, canAdmin = true }) {
  const path = usePathname();
  // Bendahara non-admin hanya melihat menu Kas.
  const items = canAdmin ? NAV : NAV.filter(([href]) => href === '/dashboard/kas');
  return (
    <>
      {/* overlay mobile */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 z-20 md:hidden transition ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />
      <aside
        className={`fixed md:sticky top-0 z-30 h-screen w-64 shrink-0 bg-white border-r border-slate-100
                    flex flex-col transition-transform md:translate-x-0
                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100">
          <img src="/umalink-logo.png" alt="Umalink" className="w-9 h-9 rounded-xl object-cover" />
          <div className="leading-tight">
            <div className="font-bold">Umalink</div>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
                  ${active
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'}`}
              >
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
