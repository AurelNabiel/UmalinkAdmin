'use client';

export function Spinner({ label = 'Memuat…' }) {
  return (
    <div className="flex items-center gap-3 text-slate-400 py-10 justify-center">
      <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-brand animate-spin" />
      {label}
    </div>
  );
}

export function Empty({ children }) {
  return (
    <div className="card p-8 text-center text-slate-400">{children}</div>
  );
}

export function ErrorBox({ children }) {
  return (
    <div className="card p-4 text-red-600 bg-red-50 border-red-100">{children}</div>
  );
}

// Kartu statistik berwarna dengan gradien & ikon.
export function StatCard({ label, value, icon: I, from, to }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-soft relative overflow-hidden"
         style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/15" />
      {I && (
        <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center mb-3 relative">
          <I width={20} height={20} />
        </div>
      )}
      <div className="text-3xl font-extrabold relative">{value}</div>
      <div className="text-sm text-white/85 mt-0.5 relative">{label}</div>
    </div>
  );
}

export function Section({ title, action, children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const label = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
  return <span className={`badge ${map[status] || 'bg-slate-100 text-slate-600'}`}>{label[status] || status}</span>;
}
