'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { fmtIDR, fmtDate } from '@/lib/constants';

const BILL = {
  lunas: { label: 'Lunas', color: '#22C55E', bg: '#DCFCE7' },
  belum: { label: 'Belum', color: '#F59E0B', bg: '#FEF3C7' },
  bebas: { label: 'Bebas', color: '#64748B', bg: '#F1F5F9' },
};

export default function MemberRingkasan() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    const [sum, bills, ach, prof] = await Promise.all([
      supabase.rpc('my_dues_summary'),
      supabase.rpc('my_bills'),
      supabase.rpc('my_achievement'),
      uid ? supabase.from('profiles').select('full_name').eq('id', uid).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (sum.error) { setErr(sum.error.message); return; }
    setData({
      summary: (sum.data && sum.data[0]) || { belum: 0, jumlah_belum: 0, total_lunas: 0, target: 0, reached: false },
      bills: bills.data || [],
      ach: (ach.data && ach.data[0]) || { earned: 0, target: 0, reached: false },
      name: prof.data?.full_name || 'Anggota',
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!data) return <Spinner />;

  const { summary, bills, ach, name } = data;
  const duesPct = summary.target > 0 ? Math.min(Math.round((summary.total_lunas / summary.target) * 100), 100) : 0;
  const achPct = ach.target > 0 ? Math.min(Math.round((ach.earned / ach.target) * 100), 100) : 0;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Hero tagihan */}
      <div className="rounded-2xl p-5 sm:p-6 text-white shadow-soft relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg,#5B5FEF,#7C4DFF,#22D3EE)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/15" />
        <div className="relative">
          <div className="text-sm text-white/85">Halo, {name} 👋</div>
          <div className="text-xs text-white/70 mt-3">Total tagihan belum dibayar</div>
          <div className="text-4xl font-extrabold mt-1">{fmtIDR(summary.belum)}</div>
          <div className="flex gap-2.5 mt-4 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              {summary.jumlah_belum} tagihan menunggu
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              {fmtIDR(summary.total_lunas)} sudah dibayar
            </span>
          </div>
          {summary.target > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/85 mb-1">
                <span>Target kas</span>
                <span className="font-semibold">{fmtIDR(summary.total_lunas)} / {fmtIDR(summary.target)}</span>
              </div>
              <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white" style={{ width: `${duesPct}%` }} />
              </div>
              {summary.reached && <div className="text-xs mt-1.5">✓ Target tercapai - kamu tidak ditagih lagi.</div>}
            </div>
          )}
        </div>
      </div>

      {/* Keaktifan ringkas */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Poin Keaktifan</h3>
          <Link href="/dashboard/keaktifan" className="text-xs text-brand font-medium hover:underline">Keaktifan & Sertifikat →</Link>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-slate-500">Poin kamu</div>
          <div className="text-sm font-bold" style={{ color: ach.reached ? '#22C55E' : '#5B5FEF' }}>
            {ach.earned}{ach.target > 0 ? ` / ${ach.target}` : ''}
          </div>
        </div>
        {ach.target > 0 && (
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
            <div className="h-full rounded-full" style={{ width: `${achPct}%`, background: ach.reached ? '#22C55E' : '#5B5FEF' }} />
          </div>
        )}
        {ach.reached && <div className="text-xs text-green-600 mt-2">✓ Kamu bisa mengajukan surat keaktifan / sertifikat.</div>}
      </div>

      {/* Rincian tagihan */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: '#E8E9FF', color: '#5B5FEF' }}>
            <Icon.wallet width={18} height={18} />
          </div>
          <h3 className="font-semibold">Rincian Tagihan Iuran</h3>
        </div>
        {bills.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Belum ada tagihan iuran.</p>
        ) : (
          <div className="space-y-2">
            {bills.map((b) => {
              const st = BILL[b.status] || BILL.belum;
              return (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{b.period_title}</div>
                    <div className="text-xs text-slate-400">
                      {b.status === 'lunas' && b.paid_at ? `Dibayar ${fmtDate(b.paid_at)}` : fmtDate(b.created_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{b.status === 'bebas' ? 'Bebas' : fmtIDR(b.amount)}</div>
                    <span className="badge mt-0.5" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">Pembayaran dikonfirmasi oleh bendahara. Hubungi bendahara untuk membayar.</p>
      </div>
    </div>
  );
}
