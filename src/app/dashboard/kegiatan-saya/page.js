'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { divisionLabel } from '@/lib/constants';

function timeInfo(a) {
  const now = new Date(), s = new Date(a.start_time), e = a.end_time ? new Date(a.end_time) : s;
  if (now >= s && now <= e) return { label: 'Berlangsung', color: '#22C55E' };
  if (now < s) {
    const d = Math.ceil((s - now) / 86400000);
    return { label: d <= 0 ? 'Hari ini' : `${d} hari lagi`, color: '#5B5FEF' };
  }
  return { label: 'Selesai', color: '#94A3B8' };
}
function fmtJam(d) {
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function KegiatanSayaPage() {
  const [acts, setActs] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    const { data: prof } = await supabase.from('profiles').select('division').eq('id', uid).maybeSingle();
    const myDiv = prof?.division || null;
    const { data, error } = await supabase.from('activities').select('*').order('start_time', { ascending: false }).limit(100);
    if (error) { setErr(error.message); return; }
    const filtered = (data || []).filter((a) => a.division == null || a.division === myDiv);
    setActs(filtered);
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const now = new Date();
    const up = (acts || []).filter((a) => new Date(a.end_time || a.start_time) >= now)
      .sort((x, y) => new Date(x.start_time) - new Date(y.start_time));
    const past = (acts || []).filter((a) => new Date(a.end_time || a.start_time) < now);
    return { up, past };
  }, [acts]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!acts) return <Spinner />;
  if (acts.length === 0) {
    return <div className="card p-10 text-center text-slate-400">Belum ada kegiatan.</div>;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {groups.up.length > 0 && (
        <Section title="Akan datang">
          {groups.up.map((a) => <ActCard key={a.id} a={a} />)}
        </Section>
      )}
      {groups.past.length > 0 && (
        <Section title="Selesai">
          {groups.past.map((a) => <ActCard key={a.id} a={a} />)}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-500 text-sm mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ActCard({ a }) {
  const t = timeInfo(a);
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-brand-light grid place-items-center shrink-0">
        <Icon.calendar width={20} height={20} color="#5B5FEF" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold truncate">{a.title}</div>
        <div className="text-xs text-slate-400 truncate">
          {divisionLabel(a.division)} · {fmtJam(a.start_time)}
        </div>
        {a.description && <div className="text-xs text-slate-500 mt-0.5 truncate">{a.description}</div>}
      </div>
      <span className="badge shrink-0" style={{ background: t.color + '1a', color: t.color }}>{t.label}</span>
    </div>
  );
}
