'use client';

import { supabase } from '@/lib/supabaseClient';
import { useAsync, AsyncBlock, ListSkeleton } from '@/components/async';
import { Skeleton } from '@/components/ui';
import { fmtDate } from '@/lib/constants';

export default function RsvpPage() {
  const nowIso = new Date().toISOString();
  const acts = useAsync(
    () => supabase.from('activities').select('id, title, start_time').gte('end_time', nowIso)
      .order('start_time', { ascending: true }).limit(50),
    [],
  );

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Ringkasan konfirmasi kehadiran (RSVP) anggota untuk kegiatan mendatang - untuk estimasi jumlah hadir.
      </p>
      <AsyncBlock state={acts} skeleton={<ListSkeleton rows={4} />}>
        {(rows) =>
          rows.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">Belum ada kegiatan mendatang.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((a) => <Row key={a.id} a={a} />)}
            </div>
          )
        }
      </AsyncBlock>
    </div>
  );
}

function Row({ a }) {
  const sum = useAsync(() => supabase.rpc('activity_rsvp_summary', { p_activity_id: a.id }), [a.id]);
  const s = Array.isArray(sum.data) ? sum.data[0] : sum.data;

  return (
    <div className="card p-4">
      <div className="font-semibold truncate">{a.title}</div>
      <div className="text-[12px] text-slate-400 mb-3">Mulai {fmtDate(a.start_time)}</div>
      {sum.loading && sum.data == null ? (
        <Skeleton className="h-14 rounded-xl" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Pill label="Hadir" n={s?.hadir ?? 0} tone="bg-green-50 text-green-700" />
          <Pill label="Mungkin" n={s?.mungkin ?? 0} tone="bg-amber-50 text-amber-700" />
          <Pill label="Tidak" n={s?.tidak ?? 0} tone="bg-red-50 text-red-600" />
        </div>
      )}
    </div>
  );
}

function Pill({ label, n, tone }) {
  return (
    <div className={`rounded-xl py-2 text-center ${tone}`}>
      <div className="text-xl font-extrabold leading-none">{n}</div>
      <div className="text-[11px] mt-1">{label}</div>
    </div>
  );
}
