'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { fmtDate } from '@/lib/constants';

const KIND = { surat_keaktifan: 'Surat Keaktifan', sertifikat: 'Sertifikat' };
const CLAIM_STATUS = {
  pending: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  issued: { label: 'Disetujui', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
};

export default function KeaktifanPage() {
  const [ach, setAch] = useState(null);
  const [claims, setClaims] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const [a, c] = await Promise.all([
      supabase.rpc('my_achievement'),
      supabase.rpc('my_claims'),
    ]);
    if (a.error) { setErr(a.error.message); return; }
    setAch((a.data && a.data[0]) || { earned: 0, target: 0, reached: false });
    setClaims(c.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function claim(kind) {
    setBusy(kind);
    const { error } = await supabase.rpc('claim_certificate', { p_kind: kind });
    setBusy('');
    if (error) { alert('Gagal: ' + error.message); return; }
    load();
  }

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!ach) return <Spinner />;

  const pct = ach.target > 0 ? Math.min(Math.round((ach.earned / ach.target) * 100), 100) : 0;
  const hasActive = (kind) => claims.some((c) => c.kind === kind && (c.status === 'pending' || c.status === 'issued'));

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Hero poin */}
      <div className="rounded-2xl p-5 sm:p-6 text-white shadow-soft relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg,#5B5FEF,#7C4DFF,#22D3EE)' }}>
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/15" />
        <div className="relative">
          <div className="w-11 h-11 rounded-xl bg-white/20 grid place-items-center mb-3">
            <Icon.star width={22} height={22} />
          </div>
          <div className="text-xs text-white/75">Poin keaktifan</div>
          <div className="text-4xl font-extrabold mt-1">
            {ach.earned}{ach.target > 0 && <span className="text-xl text-white/70"> / {ach.target}</span>}
          </div>
          {ach.target > 0 && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs mt-1.5 text-white/85">
                {ach.reached ? '✓ Target tercapai — kamu bisa mengajukan surat & sertifikat.' : `${ach.target - ach.earned} poin lagi menuju target.`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ajukan klaim */}
      <div className="grid sm:grid-cols-2 gap-4">
        {Object.entries(KIND).map(([kind, label]) => {
          const active = hasActive(kind);
          const disabled = !ach.reached || active || busy === kind;
          return (
            <div key={kind} className="card p-5">
              <div className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: '#E8E9FF', color: '#5B5FEF' }}>
                <Icon.star width={20} height={20} />
              </div>
              <div className="font-semibold">{label}</div>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {active ? 'Pengajuan sedang diproses pengurus.' : ach.reached ? 'Kamu memenuhi syarat untuk mengajukan.' : 'Capai target poin dulu untuk mengajukan.'}
              </p>
              <button onClick={() => claim(kind)} disabled={disabled}
                className={`w-full py-2 rounded-xl text-sm font-semibold transition ${disabled ? 'bg-slate-100 text-slate-400' : 'btn-brand'}`}>
                {busy === kind ? 'Mengajukan…' : active ? 'Sudah diajukan' : 'Ajukan'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Riwayat klaim */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">Riwayat Pengajuan</h3>
        {claims.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Belum ada pengajuan.</p>
        ) : (
          <div className="space-y-2">
            {claims.map((c) => {
              const st = CLAIM_STATUS[c.status] || CLAIM_STATUS.pending;
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{KIND[c.kind] || c.kind}</div>
                    <div className="text-xs text-slate-400">{c.points_at_claim} poin · {fmtDate(c.created_at)}</div>
                    {c.status === 'rejected' && c.note && <div className="text-xs text-red-600 mt-0.5">Alasan: {c.note}</div>}
                  </div>
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
