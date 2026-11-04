'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spinner, ErrorBox, Skeleton } from '@/components/ui';

/**
 * Hook pemuatan data per-bagian. Tiap blok memuat sendiri - halaman (shell,
 * header, form) tampil instan, hanya bagian data yang menampilkan skeleton.
 *
 *   const s = useAsync(() => supabase.rpc('x'), [deps]);
 *   <AsyncBlock state={s}>{(data) => ...}</AsyncBlock>
 */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fn();
      // Dukung bentuk {data,error} dari supabase maupun nilai langsung.
      if (res && typeof res === 'object' && ('data' in res || 'error' in res)) {
        if (res.error) throw res.error;
        setData(res.data ?? []);
      } else {
        setData(res);
      }
      setErr('');
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, err, loading, reload: run };
}

/** Skeleton generik beberapa baris (untuk daftar/tabel). */
export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 animate-fade-up">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

/**
 * Membungkus satu bagian: skeleton saat memuat, ErrorBox saat gagal (dengan
 * tombol coba lagi), lalu render children(data). Bagian lain tidak terblokir.
 */
export function AsyncBlock({ state, children, skeleton = null }) {
  if (state.loading && state.data == null) return skeleton || <Spinner />;
  if (state.err) {
    return (
      <div className="space-y-2">
        <ErrorBox>{state.err}</ErrorBox>
        <button onClick={state.reload} className="btn-ghost text-sm">Coba lagi</button>
      </div>
    );
  }
  return children(state.data ?? []);
}
