'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner, ErrorBox } from '@/components/ui';
import { Icon } from '@/components/Icons';
import { divisionLabel, fmtDate } from '@/lib/constants';
import Select from '@/components/Select';

export default function PoinPage() {
  const [tab, setTab] = useState('beri');
  const [members, setMembers] = useState(null);
  const [claims, setClaims] = useState([]);
  const [target, setTarget] = useState(100);
  const [org, setOrg] = useState('Umalink');
  const [templates, setTemplates] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [mo, ac, cl, tp, sg] = await Promise.all([
      supabase.rpc('admin_points_overview'),
      supabase.rpc('achievement_get'),
      supabase.rpc('admin_list_claims'),
      supabase.rpc('doc_templates_get'),
      supabase.rpc('signatures_list'),
    ]);
    if (mo.error) { setErr(mo.error.message); return; }
    setMembers(mo.data || []);
    if (ac.data && ac.data[0]) { setTarget(ac.data[0].point_target); setOrg(ac.data[0].org_name); }
    setClaims(cl.data || []);
    setTemplates(tp.data || []);
    setSignatures(sg.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (err) return <ErrorBox>{err}</ErrorBox>;
  if (!members) return <Spinner />;

  const pending = claims.filter((c) => c.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {[['beri', 'Beri Poin'], ['anggota', 'Poin Anggota'], ['klaim', `Klaim Sertifikat${pending ? ` (${pending})` : ''}`], ['template', 'Template & TTD'], ['target', 'Target & Pengaturan']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition
              ${tab === k ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'beri' && <BeriPoin members={members} onDone={load} />}
      {tab === 'anggota' && <PoinAnggota members={members} target={target} />}
      {tab === 'klaim' && <KlaimTab claims={claims} org={org} templates={templates} signatures={signatures} onDone={load} />}
      {tab === 'template' && <TemplateTab templates={templates} signatures={signatures} onDone={load} />}
      {tab === 'target' && <TargetTab target={target} org={org} onDone={load} />}
    </div>
  );
}

/* ---------- Beri Poin ---------- */
function BeriPoin({ members, onDone }) {
  const [uid, setUid] = useState('');
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit() {
    if (!uid) { setMsg(['err', 'Pilih anggota.']); return; }
    const p = parseInt(points, 10);
    if (!p) { setMsg(['err', 'Poin tidak boleh 0.']); return; }
    setBusy(true);
    const { error } = await supabase.rpc('admin_award_points', { p_user_id: uid, p_points: p, p_note: note || null });
    setBusy(false);
    if (error) { setMsg(['err', error.message]); return; }
    setMsg(['ok', 'Poin ditambahkan & anggota diberi notifikasi.']);
    setNote(''); onDone();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold mb-4">Beri Poin ke Anggota</h3>
        <label className="text-sm font-medium">Anggota</label>
        <div className="mt-1 mb-3">
          <Select value={uid} onChange={setUid} placeholder="Pilih anggota…"
            options={members.map((m) => [m.user_id, `${m.full_name || '-'}${m.nim ? ` (${m.nim})` : ''}`])} />
        </div>
        <label className="text-sm font-medium">Jumlah poin</label>
        <div className="flex gap-2 mt-1 mb-3">
          {[5, 10, 25, 50].map((v) => (
            <button key={v} onClick={() => setPoints(v)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${Number(points) === v ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200'}`}>+{v}</button>
          ))}
          <input type="number" className="input w-24" value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>
        <label className="text-sm font-medium">Keterangan (opsional)</label>
        <input className="input mt-1 mb-4" placeholder="mis. Panitia acara, kontribusi…" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={submit} disabled={busy} className="btn-brand w-full">{busy ? 'Menyimpan…' : 'Tambah Poin'}</button>
        {msg && <p className={`text-sm mt-2 ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg[1]}</p>}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">Peringkat Poin</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {members.slice(0, 15).map((m, i) => (
            <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
              <div className="w-6 text-center text-sm font-bold text-slate-400">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{m.full_name || '-'}</div>
                <div className="text-xs text-slate-400">{divisionLabel(m.division)}</div>
              </div>
              <div className="font-bold text-brand">{m.points}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Poin Anggota (tabel + progress) ---------- */
function PoinAnggota({ members, target }) {
  const [q, setQ] = useState('');
  const shown = members.filter((m) => `${m.full_name || ''} ${m.nim || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="font-semibold">Poin Keaktifan Anggota</h3>
        <input className="input max-w-xs" placeholder="Cari anggota…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-2">
        {shown.map((m) => {
          const pct = target > 0 ? Math.min(Math.round((m.points / target) * 100), 100) : 0;
          const reached = target > 0 && m.points >= target;
          return (
            <div key={m.user_id} className="p-3 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{m.full_name || '-'} <span className="text-xs text-slate-400">· {divisionLabel(m.division)}</span></div>
                <div className="text-sm font-bold" style={{ color: reached ? '#22C55E' : '#5B5FEF' }}>{m.points}{target > 0 ? `/${target}` : ''}</div>
              </div>
              {target > 0 && (
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: reached ? '#22C55E' : '#5B5FEF' }} />
                </div>
              )}
              {reached && <div className="text-xs text-green-600 mt-1">Anda telah Memenuhi target silahkan klaim sertifikat</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Klaim Sertifikat ---------- */
const KIND = { surat_keaktifan: 'Surat Keaktifan', sertifikat: 'Sertifikat' };
function KlaimTab({ claims, org, templates, signatures, onDone }) {
  async function decide(id, status) {
    let note = null;
    if (status === 'rejected') note = prompt('Alasan menolak (opsional):') || '';
    const { error } = await supabase.rpc('decide_claim', { p_id: id, p_status: status, p_note: note });
    if (error) { alert('Gagal: ' + error.message); return; }
    onDone();
  }
  function cetak(c) {
    const tpl = (templates || []).find((t) => t.kind === c.kind) || { mode: 'default' };
    const sig = (signatures || []).find((s) => s.id === tpl.signature_id) || null;
    const html = renderDoc(c, org, tpl, sig);
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
  }
  const STATUS = {
    pending: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
    issued: { label: 'Disetujui', cls: 'bg-green-100 text-green-700' },
    rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
  };
  const pending = claims.filter((c) => c.status === 'pending').length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div>
          <h3 className="font-semibold">Klaim Surat & Sertifikat</h3>
          <p className="text-xs text-slate-400">Setujui pengajuan, lalu cetak dari format Docs organisasi.</p>
        </div>
        {pending > 0 && <span className="badge bg-amber-100 text-amber-700">{pending} menunggu</span>}
      </div>

      {claims.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Belum ada pengajuan klaim.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {claims.map((c) => {
            const st = STATUS[c.status] || STATUS.pending;
            const initial = (c.full_name || '?').trim().charAt(0).toUpperCase();
            return (
              <div key={c.id} className="flex items-center gap-3 py-3 flex-wrap">
                <div className="w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold shrink-0"
                     style={{ background: 'linear-gradient(135deg,#5B5FEF,#22D3EE)' }}>{initial}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{c.full_name || '-'}
                    <span className="text-xs text-slate-400 font-normal"> · {KIND[c.kind] || c.kind}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {c.nim || '—'}{c.division ? ` · ${divisionLabel(c.division)}` : ''} · <span className="text-brand font-semibold">{c.points_at_claim} poin</span> · {fmtDate(c.created_at)}
                  </div>
                </div>
                <span className={`badge shrink-0 ${st.cls}`}>{st.label}</span>
                <div className="flex gap-1.5 shrink-0">
                  {c.status === 'pending' ? (
                    <>
                      <button onClick={() => decide(c.id, 'issued')} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-green-50 text-green-700 hover:bg-green-100">Setujui</button>
                      <button onClick={() => decide(c.id, 'rejected')} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-50 text-red-600 hover:bg-red-100">Tolak</button>
                    </>
                  ) : c.status === 'issued' ? (
                    <button onClick={() => cetak(c)} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-brand text-white hover:bg-brand-dark">Cetak</button>
                  ) : (
                    <span className="text-xs text-slate-400 max-w-[140px] truncate">{c.note || 'Ditolak'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Target & Pengaturan ---------- */
function TargetTab({ target, org, onDone }) {
  const [t, setT] = useState(target);
  const [o, setO] = useState(org);
  const [saved, setSaved] = useState(false);
  async function save() {
    const { error } = await supabase.rpc('achievement_set', { p_target: parseInt(t, 10) || 0, p_org: o || null });
    if (error) { alert('Gagal: ' + error.message); return; }
    setSaved(true); setTimeout(() => setSaved(false), 1500); onDone();
  }
  return (
    <div className="card p-5 max-w-md">
      <h3 className="font-semibold mb-4">Target Poin & Sertifikat</h3>
      <label className="text-sm font-medium">Target poin untuk klaim sertifikat</label>
      <input type="number" min="0" className="input mt-1 mb-1" value={t} onChange={(e) => setT(e.target.value)} />
      <p className="text-xs text-slate-400 mb-4">Anggota bisa mengajukan surat keaktifan/sertifikat setelah poin ≥ target. (0 = nonaktif)</p>
      <label className="text-sm font-medium">Nama organisasi (di sertifikat)</label>
      <input className="input mt-1 mb-4" value={o} onChange={(e) => setO(e.target.value)} />
      <button onClick={save} className="btn-brand">Simpan</button>
      {saved && <span className="text-sm text-green-700 ml-3">Tersimpan.</span>}
    </div>
  );
}

function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function tgl() { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); }
const DOT = '.'.repeat(30);
function logoUrl() { try { return window.location.origin + '/umalink-logo.png'; } catch (e) { return '/umalink-logo.png'; } }

// Link font + script yang MENUNGGU font selesai dimuat sebelum print
// (kalau tidak, 'Dancing Script'/'Montserrat' belum siap saat window.print()).
const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet">`;
const PRINT_BOOT = `<script>window.addEventListener('load',function(){var go=function(){setTimeout(function(){window.print()},120)};try{if(document.fonts&&document.fonts.ready){Promise.all([document.fonts.load("700 60px 'Dancing Script'"),document.fonts.load("800 40px 'Montserrat'")]).catch(function(){}).then(function(){document.fonts.ready.then(go).catch(go)})}else{setTimeout(go,900)}}catch(e){setTimeout(go,900)}})</script>`;

// Kop surat standar (logo + nama organisasi). Dipakai default surat & placeholder {{kop}}.
function kopHTML(org) {
  return `<div class="kop">
    <img src="${logoUrl()}" alt=""/>
    <div class="kt">
      <div class="o">${esc(org || 'UMADO')}</div>
      <div class="s">Unsada Manga Anime Dorama Ongaku</div>
      <div class="a">Universitas Darma Persada &middot; Jakarta</div>
    </div>
  </div>
  <div class="kopline"></div>`;
}
const KOP_CSS = `.kop{display:flex;align-items:center;gap:16px;border-bottom:4px solid #1b3a6b;padding-bottom:10px}
    .kop img{width:76px;height:76px;object-fit:contain}
    .kop .kt{flex:1;text-align:center}
    .kop .kt .o{font-size:20pt;font-weight:bold;letter-spacing:1px;color:#1b3a6b;text-transform:uppercase;line-height:1.1}
    .kop .kt .s{font-size:11pt;margin-top:2px}
    .kop .kt .a{font-size:9.5pt;color:#555;margin-top:2px}
    .kopline{height:1px;background:#1b3a6b;margin-top:2px;margin-bottom:22px}`;

/* ---------- Surat Keterangan Keaktifan (A4 portrait) — acuan: dokumen UMADO ---------- */
function suratHTML(c, org) {
  const nama = esc(c.full_name || DOT);
  const nim = esc(c.nim || DOT);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Surat Keterangan Keaktifan — ${nama}</title>
    <style>
      @page{size:A4 portrait;margin:0}
      *{box-sizing:border-box}
      body{margin:0;font-family:'Times New Roman',Georgia,serif;color:#111;font-size:12pt;line-height:1.6}
      .page{width:210mm;min-height:297mm;padding:20mm 24mm}
      ${KOP_CSS}
      h1{text-align:center;font-size:14pt;letter-spacing:.5px;text-decoration:underline;text-transform:uppercase;margin:0}
      .no{text-align:center;font-size:11pt;margin:3px 0 22px}
      p{margin:12px 0;text-align:justify}
      table.ident{border-collapse:collapse;margin:6px 0 6px 26px}
      table.ident td{padding:2px 0;vertical-align:top}
      table.ident td.k{width:150px}
      table.ident td.s{width:16px}
      .sign{margin-top:30px;width:58%;margin-left:auto;text-align:center}
      .sign .ttl{text-align:center}
      .sp{height:78px}
      .nm{font-weight:bold;text-decoration:underline}
    </style></head><body>
    <div class="page">
      ${kopHTML(org)}

      <h1>Surat Keterangan Keaktifan Anggota</h1>
      <div class="no">Nomor: ...../SK-UMADO/2026</div>

      <p style="margin-top:0">Yang bertanda tangan di bawah ini:</p>
      <table class="ident">
        <tr><td class="k">Nama</td><td class="s">:</td><td>${DOT}</td></tr>
        <tr><td class="k">Jabatan</td><td class="s">:</td><td>${DOT}</td></tr>
        <tr><td class="k">Periode</td><td class="s">:</td><td>2025/2026</td></tr>
      </table>

      <p>Dengan ini menerangkan bahwa:</p>
      <table class="ident">
        <tr><td class="k">Nama</td><td class="s">:</td><td><b>${nama}</b></td></tr>
        <tr><td class="k">NIM</td><td class="s">:</td><td>${nim}</td></tr>
        <tr><td class="k">Program Studi</td><td class="s">:</td><td>${DOT}</td></tr>
        <tr><td class="k">Fakultas</td><td class="s">:</td><td>${DOT}</td></tr>
      </table>

      <p>Adalah benar merupakan <b>Anggota Aktif ${esc(org || 'UMADO')}</b> (Unsada Manga Anime Dorama Ongaku)
      Universitas Darma Persada pada Periode Kepengurusan 2025/2026.</p>

      <p>Selama menjadi anggota, yang bersangkutan telah berpartisipasi secara aktif dalam
      kegiatan organisasi sesuai dengan program kerja, serta ketentuan yang berlaku di lingkungan organisasi.</p>

      <p>Surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya. Apabila di kemudian hari
      terdapat kekeliruan, akan dilakukan perbaikan sebagaimana mestinya.</p>

      <div class="sign">
        <div class="ttl">Jakarta, ${tgl()}</div>
        <div class="ttl">Ketua ${esc(org || 'UMADO')}</div>
        <div class="sp"></div>
        <div class="nm">( ${DOT} )</div>
      </div>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
}

/* ---------- Sertifikat Penghargaan (A4 landscape) — acuan: desain navy & gold ---------- */
function sertifikatHTML(c, org) {
  const nama = esc(c.full_name || '-');
  const orgName = esc(org || 'UMADO');
  const initial = (c.full_name || org || 'U').trim().charAt(0).toUpperCase();
  const body = `Diberikan sebagai bentuk penghargaan atas partisipasi aktif dan kontribusi
    dalam kegiatan organisasi ${orgName} dengan total ${c.points_at_claim} poin keaktifan
    selama periode kepengurusan. Semoga dedikasi yang telah diberikan menjadi teladan dan
    terus memberikan manfaat bagi organisasi.`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Sertifikat — ${nama}</title>
    ${FONT_LINKS}
    <style>
      @page{size:A4 landscape;margin:0}
      *{box-sizing:border-box}
      body{margin:0;font-family:'Montserrat',Arial,sans-serif}
      .cert{position:relative;width:297mm;height:210mm;background:#fff;overflow:hidden}
      .cert svg.bg{position:absolute;inset:0;width:100%;height:100%}
      .content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
               justify-content:flex-start;text-align:center;padding:26mm 34mm 20mm}
      .logos{display:flex;gap:18px;justify-content:center;align-items:center;margin-bottom:10px}
      .logo{width:70px;height:70px;border-radius:50%;display:grid;place-items:center;
            font-weight:800;font-size:26px;color:#fff;background:#1b3a6b;border:3px solid #d6a420}
      .logo.alt{background:#fff;color:#d6a420;border-color:#1b3a6b;font-size:30px}
      .title{font-size:52px;font-weight:800;letter-spacing:12px;color:#141414;margin:6px 0 0}
      .subtitle{font-size:16px;font-weight:700;letter-spacing:2px;color:#222;margin-top:2px}
      .pill{margin-top:16px;background:#1b3a6b;color:#fff;font-weight:700;font-size:13px;
            letter-spacing:.5px;padding:9px 26px;border-radius:30px}
      .name{font-family:'Dancing Script',cursive;font-size:62px;color:#2f6fb5;margin:20px 0 6px;line-height:1}
      .body{max-width:640px;color:#555;font-size:13.5px;line-height:1.7;margin-top:4px}
      .signs{display:flex;gap:120px;margin-top:auto;padding-top:18px}
      .sign{text-align:center}
      .sign .ln{width:150px;height:2px;background:#2f6fb5;margin:0 auto 8px}
      .sign .lb{font-weight:700;font-size:14px;color:#141414}
    </style></head><body>
    <div class="cert">
      <svg class="bg" viewBox="0 0 1123 794" preserveAspectRatio="none">
        <polygon points="0,0 340,0 0,340" fill="#1b3a6b"/>
        <polygon points="0,0 150,0 0,150" fill="#d6a420"/>
        <polygon points="1123,0 783,0 1123,340" fill="#d6a420"/>
        <polygon points="1123,0 973,0 1123,150" fill="#1b3a6b"/>
        <polygon points="0,794 340,794 0,454" fill="#d6a420"/>
        <polygon points="0,794 150,794 0,644" fill="#1b3a6b"/>
        <polygon points="1123,794 783,794 1123,454" fill="#1b3a6b"/>
        <polygon points="1123,794 973,794 1123,644" fill="#d6a420"/>
      </svg>
      <div class="content">
        <div class="logos">
          <div class="logo">${esc(initial)}</div>
          <div class="logo alt">&#9733;</div>
        </div>
        <div class="title">SERTIFIKAT</div>
        <div class="subtitle">Untuk Penghargaan</div>
        <div class="pill">Sertifikat ini Dipersembahkan Untuk</div>
        <div class="name">${nama}</div>
        <div class="body">${body}</div>
        <div class="signs">
          <div class="sign"><div class="ln"></div><div class="lb">Tanda Tangan</div></div>
          <div class="sign"><div class="ln"></div><div class="lb">Tanda Tangan</div></div>
        </div>
      </div>
    </div>
    ${PRINT_BOOT}</body></html>`;
}

/* ============================================================
   RENDER DOKUMEN — mode default | image | html, dengan tanda tangan
   ============================================================ */
const CANVAS = { sertifikat: { w: 1123, h: 794 }, surat_keaktifan: { w: 794, h: 1123 } };

function certBody(c, org) {
  return `Diberikan sebagai bentuk penghargaan atas partisipasi aktif dan kontribusi dalam kegiatan organisasi ${esc(org || 'UMADO')} dengan total ${c.points_at_claim} poin keaktifan selama periode kepengurusan.`;
}

function defaultLayout(kind) {
  if (kind === 'sertifikat') return {
    name: { show: true, x: 50, y: 46, w: 80, size: 60, color: '#2f6fb5', align: 'center', font: 'script' },
    body: { show: true, x: 50, y: 60, w: 60, size: 15, color: '#555555', align: 'center', font: 'sans' },
    date: { show: false, x: 72, y: 74, w: 40, size: 14, color: '#333333', align: 'center', font: 'sans' },
    sign: { show: true, x: 50, y: 86, w: 16 },
  };
  return {
    name: { show: true, x: 50, y: 40, w: 70, size: 22, color: '#111111', align: 'center', font: 'sans' },
    body: { show: false, x: 50, y: 60, w: 70, size: 13, color: '#333333', align: 'justify', font: 'sans' },
    date: { show: true, x: 70, y: 78, w: 45, size: 14, color: '#111111', align: 'center', font: 'sans' },
    sign: { show: true, x: 70, y: 87, w: 20 },
  };
}

function docData(c, org) {
  return {
    nama: c.full_name || '-', nim: c.nim || '', divisi: divisionLabel(c.division),
    poin: String(c.points_at_claim ?? ''), tanggal: tgl(), org: org || 'UMADO',
  };
}

// Markup overlay (dipakai pratinjau & cetak). Ukuran px pada kanvas 96dpi = A4 pas.
function imageDocMarkup(kind, tpl, c, org, sig) {
  const { w, h } = CANVAS[kind] || CANVAS.sertifikat;
  const L = { ...defaultLayout(kind), ...(tpl.layout || {}) };
  const content = {
    name: esc(c.full_name || '-'),
    body: esc(kind === 'sertifikat' ? certBody(c, org) : ''),
    date: `Jakarta, ${esc(tgl())}`,
  };
  const field = (key, text) => {
    const f = L[key]; if (!f || !f.show || !text) return '';
    return `<div class="f ${f.font === 'script' ? 'script' : 'sans'}" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;text-align:${f.align};font-size:${f.size}px;color:${f.color};line-height:1.5">${text}</div>`;
  };
  const sg = L.sign || {};
  const signBlock = (sg.show === false) ? '' : `<div class="f sg" style="left:${sg.x}%;top:${sg.y}%;width:${sg.w}%;text-align:center">
      ${sig?.image_url ? `<img src="${esc(sig.image_url)}" alt=""/>` : ''}
      ${sig?.signer_name ? `<div class="sn">${esc(sig.signer_name)}</div>` : ''}
      ${sig?.role_title ? `<div class="sr">${esc(sig.role_title)}</div>` : (sig?.label ? `<div class="sr">${esc(sig.label)}</div>` : '')}
    </div>`;
  const css = `@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Montserrat:wght@600;700;800&display=swap');
    .doc{position:relative;width:${w}px;height:${h}px;overflow:hidden;background:#fff}
    .doc .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .doc .f{position:absolute;transform:translate(-50%,-50%)}
    .doc .script{font-family:'Dancing Script',cursive}
    .doc .sans{font-family:'Montserrat',Arial,sans-serif}
    .doc .sg img{display:block;width:100%;object-fit:contain;max-height:120px;margin:0 auto}
    .doc .sg .sn{font-weight:700;border-top:2px solid #333;margin-top:4px;padding-top:4px;font-family:'Montserrat',Arial,sans-serif}
    .doc .sg .sr{font-size:13px;color:#444;font-family:'Montserrat',Arial,sans-serif}`;
  const body = `<div class="doc">
    ${tpl.bg_url ? `<img class="bg" src="${esc(tpl.bg_url)}" alt=""/>` : ''}
    ${field('name', content.name)}
    ${field('body', content.body)}
    ${field('date', content.date)}
    ${signBlock}
  </div>`;
  return { css, body, w, h };
}

function imageDocPage(kind, tpl, c, org, sig) {
  const { css, body } = imageDocMarkup(kind, tpl, c, org, sig);
  const size = kind === 'sertifikat' ? 'A4 landscape' : 'A4 portrait';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.full_name || 'Dokumen')}</title>
    ${FONT_LINKS}
    <style>@page{size:${size};margin:0}*{box-sizing:border-box}body{margin:0}${css}</style></head>
    <body>${body}${PRINT_BOOT}</body></html>`;
}

function fillPlaceholders(tplHtml, c, org, sig) {
  const d = docData(c, org);
  const img = sig?.image_url ? `<img src="${esc(sig.image_url)}" style="height:70px;object-fit:contain;display:block"/>` : '';
  const ttd = `<div>${img}<div style="font-weight:bold;border-top:1px solid #333;display:inline-block;padding-top:3px;margin-top:3px">${esc(sig?.signer_name || '')}</div>${sig?.role_title ? `<div>${esc(sig.role_title)}</div>` : ''}</div>`;
  const kop = `<div style="display:flex;align-items:center;gap:16px;border-bottom:4px solid #1b3a6b;padding-bottom:10px">
    <img src="${logoUrl()}" style="width:76px;height:76px;object-fit:contain"/>
    <div style="flex:1;text-align:center">
      <div style="font-size:20pt;font-weight:bold;letter-spacing:1px;color:#1b3a6b;text-transform:uppercase;line-height:1.1">${esc(d.org)}</div>
      <div style="font-size:11pt;margin-top:2px">Unsada Manga Anime Dorama Ongaku</div>
      <div style="font-size:9.5pt;color:#555;margin-top:2px">Universitas Darma Persada &middot; Jakarta</div>
    </div>
  </div>
  <div style="height:1px;background:#1b3a6b;margin:2px 0 22px"></div>`;
  const map = {
    nama: esc(d.nama), nim: esc(d.nim), divisi: esc(d.divisi), poin: esc(d.poin),
    tanggal: esc(d.tanggal), org: esc(d.org), kop,
    ttd_nama: esc(sig?.signer_name || ''), ttd_jabatan: esc(sig?.role_title || ''),
    ttd_label: esc(sig?.label || ''), ttd_img: img, ttd,
  };
  return (tplHtml || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in map ? map[k] : m));
}

function htmlDocPage(tpl, c, org, sig) {
  let h = fillPlaceholders(tpl.html, c, org, sig);
  if (!/<html/i.test(h)) {
    h = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:18mm}body{font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:1.55;color:#111}img{max-width:100%}</style></head><body>${h}</body></html>`;
  }
  const scr = `<script>window.onload=()=>setTimeout(()=>window.print(),400)</script>`;
  return /<\/body>/i.test(h) ? h.replace(/<\/body>/i, scr + '</body>') : h + scr;
}

function renderDoc(c, org, tpl, sig) {
  if (tpl.mode === 'image' && tpl.bg_url) return imageDocPage(c.kind, tpl, c, org, sig);
  if (tpl.mode === 'html' && (tpl.html || '').trim()) return htmlDocPage(tpl, c, org, sig);
  return c.kind === 'surat_keaktifan' ? suratHTML(c, org) : sertifikatHTML(c, org);
}

/* ============================================================
   TAB: TEMPLATE & TANDA TANGAN
   ============================================================ */
const KIND_LABEL = { surat_keaktifan: 'Surat Keaktifan', sertifikat: 'Sertifikat' };
const SAMPLE_CLAIM = (kind) => ({ full_name: 'Aurelio Nabiel Rizqullah', nim: '2023110097', division: '', points_at_claim: 120, kind });
const SAMPLE_SURAT_HTML = `{{kop}}
<h2 style="text-align:center;text-transform:uppercase;text-decoration:underline;margin:0">Surat Keterangan Keaktifan Anggota</h2>
<div style="text-align:center;margin:3px 0 20px">Nomor: ...../SK-UMADO/2026</div>
<p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
<p style="margin-left:24px">Nama : <b>{{nama}}</b><br/>NIM : {{nim}}<br/>Divisi : {{divisi}}</p>
<p style="text-align:justify">Adalah benar merupakan <b>Anggota Aktif {{org}}</b> dengan {{poin}} poin keaktifan pada periode kepengurusan 2025/2026, dan telah berpartisipasi aktif dalam kegiatan organisasi.</p>
<p>Surat ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
<div style="width:58%;margin-left:auto;margin-top:34px;text-align:center">
  <div>Jakarta, {{tanggal}}</div>
  <div style="margin-top:6px">{{ttd}}</div>
</div>`;

async function uploadAsset(file, folder) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('doc-assets').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from('doc-assets').getPublicUrl(path).data.publicUrl;
}

function TemplateTab({ templates, signatures, onDone }) {
  const [kind, setKind] = useState('sertifikat');
  const tpl = templates.find((t) => t.kind === kind) || { kind, mode: 'default', layout: {} };
  return (
    <div className="space-y-5">
      <div className="card p-4 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-500">Dokumen:</span>
        {Object.entries(KIND_LABEL).map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${kind === k ? 'bg-brand text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      <TemplateEditor key={kind} tpl={tpl} signatures={signatures} onDone={onDone} />
      <SignatureManager signatures={signatures} onDone={onDone} />
    </div>
  );
}

function TemplateEditor({ tpl, signatures, onDone }) {
  const [mode, setMode] = useState(tpl.mode || 'default');
  const [bgUrl, setBgUrl] = useState(tpl.bg_url || '');
  const [html, setHtml] = useState(tpl.html || '');
  const [layout, setLayout] = useState({ ...defaultLayout(tpl.kind), ...(tpl.layout || {}) });
  const [sigId, setSigId] = useState(tpl.signature_id || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function onUploadBg(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setMsg(null);
    try { const url = await uploadAsset(file, 'templates'); setBgUrl(url); setMode('image'); }
    catch (err) { setMsg(['err', 'Gagal upload: ' + err.message]); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('doc_template_set', {
      p_kind: tpl.kind, p_mode: mode, p_bg_url: mode === 'image' ? (bgUrl || null) : null,
      p_html: mode === 'html' ? html : null, p_layout: layout, p_signature_id: sigId || null,
    });
    setBusy(false);
    if (error) { setMsg(['err', error.message]); return; }
    setMsg(['ok', 'Template tersimpan.']); onDone();
  }

  const sig = signatures.find((s) => s.id === sigId) || null;
  const prev = imageDocMarkup(tpl.kind, { bg_url: bgUrl, layout }, SAMPLE_CLAIM(tpl.kind), 'UMADO', sig);
  const pw = 520; const k = pw / prev.w;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Template {KIND_LABEL[tpl.kind]}</h3>
        <div className="flex gap-1.5">
          {[['default', 'Bawaan'], ['image', 'Gambar latar'], ['html', 'HTML']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${mode === m ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-200'}`}>{l}</button>
          ))}
        </div>
      </div>

      {mode === 'default' && (
        <p className="text-sm text-slate-500">Memakai desain bawaan sistem. Pilih <b>Gambar latar</b> untuk unggah desain sendiri, atau <b>HTML</b> untuk template teks.</p>
      )}

      {mode === 'image' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div>
              <label className="btn-ghost cursor-pointer inline-flex">
                {busy ? 'Mengunggah…' : (bgUrl ? 'Ganti gambar latar' : 'Upload gambar latar (PNG/JPG)')}
                <input type="file" accept="image/*" className="hidden" onChange={onUploadBg} />
              </label>
              <p className="text-xs text-slate-400 mt-1">Ukuran ideal {tpl.kind === 'sertifikat' ? 'A4 landscape (±1123×794px)' : 'A4 portrait (±794×1123px)'}.</p>
            </div>
            <LayoutEditor kind={tpl.kind} layout={layout} onChange={setLayout} />
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-2">Pratinjau (contoh data)</div>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100" style={{ width: pw, maxWidth: '100%' }}>
              <div style={{ width: pw, height: prev.h * k, overflow: 'hidden' }}>
                <div style={{ transform: `scale(${k})`, transformOrigin: 'top left' }}
                     dangerouslySetInnerHTML={{ __html: `<style>${prev.css}</style>${prev.body}` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'html' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setHtml(SAMPLE_SURAT_HTML)} className="btn-ghost text-xs py-1.5">Muat contoh</button>
            <span className="text-xs text-slate-400">Placeholder: {'{{kop}} {{nama}} {{nim}} {{divisi}} {{poin}} {{tanggal}} {{org}} {{ttd}}'}</span>
          </div>
          <textarea className="input font-mono text-xs h-72 w-full" value={html} onChange={(e) => setHtml(e.target.value)} placeholder="Tempel HTML template di sini…" />
        </div>
      )}

      <div className="pt-3 border-t border-slate-100">
        <label className="text-sm font-medium">Tanda tangan untuk dokumen ini</label>
        <div className="mt-1 max-w-xs">
          <Select value={sigId} onChange={setSigId} placeholder="— tanpa tanda tangan —"
            options={[['', '— tanpa tanda tangan —'], ...signatures.map((s) => [s.id, `${s.label}${s.signer_name ? ` · ${s.signer_name}` : ''}`])]} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-brand">{busy ? 'Menyimpan…' : 'Simpan Template'}</button>
        {msg && <span className={`text-sm ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg[1]}</span>}
      </div>
    </div>
  );
}

function LayoutEditor({ kind, layout, onChange }) {
  const upd = (key, patch) => onChange({ ...layout, [key]: { ...layout[key], ...patch } });
  const fields = kind === 'sertifikat'
    ? [['name', 'Nama'], ['body', 'Isi / penghargaan'], ['date', 'Tanggal']]
    : [['name', 'Nama'], ['date', 'Tanggal'], ['body', 'Paragraf']];
  return (
    <div className="space-y-3">
      {fields.map(([key, label]) => {
        const f = layout[key] || {};
        return (
          <div key={key} className="rounded-xl border border-slate-100 p-3">
            <label className="flex items-center justify-between text-sm font-medium">
              {label}
              <input type="checkbox" checked={!!f.show} onChange={(e) => upd(key, { show: e.target.checked })} />
            </label>
            {f.show && (
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <Num label="X %" v={f.x} on={(v) => upd(key, { x: v })} />
                <Num label="Y %" v={f.y} on={(v) => upd(key, { y: v })} />
                <Num label="Lebar %" v={f.w} on={(v) => upd(key, { w: v })} />
                <Num label="Ukuran px" v={f.size} on={(v) => upd(key, { size: v })} />
                <label className="flex items-center gap-1">Warna
                  <input type="color" value={f.color || '#000000'} onChange={(e) => upd(key, { color: e.target.value })} className="w-8 h-7 p-0 border rounded" />
                </label>
                <label className="flex items-center gap-1">Rata
                  <select value={f.align || 'center'} onChange={(e) => upd(key, { align: e.target.value })} className="input py-1 text-xs">
                    <option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option><option value="justify">Justify</option>
                  </select>
                </label>
              </div>
            )}
          </div>
        );
      })}
      <div className="rounded-xl border border-slate-100 p-3">
        <label className="flex items-center justify-between text-sm font-medium">Tanda tangan
          <input type="checkbox" checked={layout.sign?.show !== false} onChange={(e) => upd('sign', { show: e.target.checked })} />
        </label>
        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <Num label="X %" v={layout.sign?.x} on={(v) => upd('sign', { x: v })} />
          <Num label="Y %" v={layout.sign?.y} on={(v) => upd('sign', { y: v })} />
          <Num label="Lebar %" v={layout.sign?.w} on={(v) => upd('sign', { w: v })} />
        </div>
      </div>
    </div>
  );
}

function Num({ label, v, on }) {
  return (
    <label className="flex items-center gap-1">{label}
      <input type="number" value={v ?? 0} onChange={(e) => on(parseFloat(e.target.value) || 0)} className="input py-1 text-xs w-full" />
    </label>
  );
}

function SignatureManager({ signatures, onDone }) {
  const [f, setF] = useState({ label: '', signer_name: '', role_title: '', nim: '' });
  const [file, setFile] = useState(null);
  const [prev, setPrev] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function pick(e) {
    const x = e.target.files?.[0]; if (!x) return;
    setFile(x); setPrev(URL.createObjectURL(x));
  }
  async function add() {
    if (!file) { setMsg(['err', 'Pilih file tanda tangan dulu.']); return; }
    setBusy(true); setMsg(null);
    try {
      const url = await uploadAsset(file, 'signatures');
      const { error } = await supabase.rpc('signature_add', {
        p_label: f.label || 'Tanda Tangan', p_signer_name: f.signer_name || null,
        p_role_title: f.role_title || null, p_nim: f.nim || null, p_image_url: url,
      });
      if (error) throw error;
      setF({ label: '', signer_name: '', role_title: '', nim: '' }); setFile(null); setPrev('');
      setMsg(['ok', 'Tanda tangan disimpan.']); onDone();
    } catch (err) { setMsg(['err', err.message]); } finally { setBusy(false); }
  }
  async function del(id) {
    if (!confirm('Hapus tanda tangan ini?')) return;
    const { error } = await supabase.rpc('signature_delete', { p_id: id });
    if (error) { alert(error.message); return; }
    onDone();
  }
  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-1">Tanda Tangan Digital</h3>
      <p className="text-xs text-slate-400 mb-4">Upload PNG transparan. Pilih tanda tangan per dokumen di panel template di atas.</p>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <label className="btn-ghost cursor-pointer inline-flex">
            {file ? 'Ganti file…' : 'Pilih file PNG…'}
            <input type="file" accept="image/png,image/*" className="hidden" onChange={pick} />
          </label>
          {prev && <div className="rounded-xl border border-slate-200 p-3 bg-slate-100"><img src={prev} alt="" className="max-h-24 mx-auto object-contain" /></div>}
          <input className="input" placeholder="Label (mis. Ketua UMADO)" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
          <input className="input" placeholder="Nama penandatangan" value={f.signer_name} onChange={(e) => setF({ ...f, signer_name: e.target.value })} />
          <input className="input" placeholder="Jabatan (mis. Ketua Umum)" value={f.role_title} onChange={(e) => setF({ ...f, role_title: e.target.value })} />
          <input className="input" placeholder="NIM (opsional)" value={f.nim} onChange={(e) => setF({ ...f, nim: e.target.value })} />
          <button onClick={add} disabled={busy} className="btn-brand w-full">{busy ? 'Menyimpan…' : 'Simpan Tanda Tangan'}</button>
          {msg && <p className={`text-sm ${msg[0] === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{msg[1]}</p>}
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-2">Tersimpan ({signatures.length})</div>
          {signatures.length === 0 ? <p className="text-sm text-slate-400">Belum ada.</p> : (
            <div className="space-y-2">
              {signatures.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100">
                  <img src={s.image_url} alt="" className="h-10 w-16 object-contain bg-slate-50 rounded" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.label}</div>
                    <div className="text-xs text-slate-400 truncate">{s.signer_name || '-'}{s.role_title ? ` · ${s.role_title}` : ''}</div>
                  </div>
                  <button onClick={() => del(s.id)} className="text-red-500 text-xs hover:underline">Hapus</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
