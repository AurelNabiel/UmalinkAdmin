'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabaseClient';

// Menampilkan QR kegiatan yang berotasi (±60 dtk). Anggota memindainya di app
// (menu "Pindai QR Kegiatan") untuk menandai kehadirannya sendiri.
export default function ActivityQrModal({ activityId, title, onClose }) {
  const [img, setImg] = useState('');
  const [err, setErr] = useState('');
  const [count, setCount] = useState(60);
  const timer = useRef(null);

  async function refresh() {
    try {
      const { data, error } = await supabase.rpc('issue_activity_qr', { p_activity_id: activityId });
      if (error) throw error;
      const url = await QRCode.toDataURL(data, { width: 320, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } });
      setImg(url); setErr(''); setCount(60);
    } catch (e) {
      setErr(e.message || 'Gagal membuat QR');
    }
  }

  useEffect(() => {
    refresh();
    timer.current = setInterval(() => {
      setCount((c) => { if (c <= 1) { refresh(); return 60; } return c - 1; });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [activityId]); // eslint-disable-line

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-soft w-full max-w-sm p-6 text-center animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-lg text-left">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <p className="text-sm text-slate-500 mb-4 text-left">Minta anggota memindai QR ini di aplikasi untuk absen.</p>
        <div className="grid place-items-center">
          {err ? <div className="w-72 h-72 grid place-items-center text-red-600 text-sm">{err}</div>
            : img ? <img src={img} alt="QR" className="w-72 h-72 rounded-xl border border-slate-100" />
            : <div className="w-72 h-72 grid place-items-center text-slate-400">Memuat…</div>}
        </div>
        <div className="text-sm text-brand font-semibold mt-3">Berganti dalam {count} detik</div>
        <button onClick={refresh} className="btn-ghost w-full mt-3">Perbarui sekarang</button>
      </div>
    </div>
  );
}
