import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, RefreshCw, Upload } from "lucide-react";
import { qrPayApi } from "@/lib/serverApi";
import { formatUzs, METAL_GOLD } from "@/lib/qrPay";

// Admin: Humo / Uzcard QR payments (approved design, 2026-10-02).
// Not linked in nav — visit /admin-qr-payments as an admin. Every action goes
// through qrPayApi, which re-checks the admin role on the server.
//
// Approve = "I saw this exact amount with this code arrive in my bank app".
// It activates the student's subscription for one billing period.

const EMERALD = {
  background: "linear-gradient(180deg, #3D9F7F 0%, #21765C 46%, #145942 54%, #1F7158 100%)",
  color: "#F0FBF6",
  border: "1px solid rgba(160,232,205,0.38)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -2px 6px rgba(0,0,0,0.28)",
};

const TABS = [
  { id: "pending", label: "Kutilmoqda" },
  { id: "approved", label: "Tasdiqlangan" },
  { id: "rejected", label: "Rad etilgan" },
  { id: "awaiting_receipt", label: "Chek yuborilmagan" },
];

const ERRORS = {
  has_active_card_subscription: "Bu o‘quvchida faol karta (Dodo) obunasi bor. Uni qo‘lda hal qiling.",
  no_receipt_yet: "Chek hali yuborilmagan.",
  already_reviewed: "Bu to‘lov allaqachon ko‘rib chiqilgan.",
  qr_url_must_be_https: "QR rasm havolasi https:// bilan boshlanishi kerak.",
  forbidden: "Faqat admin uchun.",
};

const PRICE_FIELDS = [
  ["price_uzs_learner_monthly", "Learner · oylik"],
  ["price_uzs_learner_yearly", "Learner · yillik"],
  ["price_uzs_vip_monthly", "VIP · oylik"],
  ["price_uzs_vip_yearly", "VIP · yillik"],
];

const input = "w-full rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-300/60";

function Settings({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    qrPayApi("getSettings").then((res) => {
      setS(res.settings || { qr_enabled: false });
      setReady(!!res.config?.ready);
      if (!res.config?.ready) setOpen(true);
    }).catch((e) => setMsg(ERRORS[e.code] || e.message));
  }, []);

  const set = (k, v) => setS((prev) => ({ ...prev, [k]: v }));

  const uploadQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("qr_image_url", file_url);
    } catch (err) {
      setMsg(err.message);
    }
    setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await qrPayApi("saveSettings", { settings: s });
      setS(res.settings);
      setReady(!!res.config?.ready);
      setMsg(res.config?.ready ? "Saqlandi. QR to‘lov ishlayapti." : "Saqlandi. QR to‘lov hali o‘chiq: yoqing, QR rasm va barcha narxlarni kiriting.");
      onSaved?.();
    } catch (e) {
      setMsg(ERRORS[e.code] || e.message);
    }
    setBusy(false);
  };

  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.03]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-3">
          <span className="text-sm font-bold">Sozlamalar: QR, narxlar, Telegram</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ready ? "bg-violet-500/20 text-violet-200" : "bg-[rgba(214,180,108,0.15)] text-[#E9DDBC]"}`}>
            {ready ? "Faol" : "Sozlanmagan"}
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && s && (
        <div className="grid gap-5 border-t border-white/10 px-5 py-5 md:grid-cols-[240px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl bg-[#F4F1EA]">
              {s.qr_image_url
                ? <img src={s.qr_image_url} alt="To‘lov QR kodi" className="h-full w-full object-contain" />
                : <span className="px-4 text-center text-xs font-bold text-[#3D3A4D]">QR rasm yuklanmagan</span>}
            </div>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3.5 text-[13px] font-bold">
              <Upload className="h-4 w-4" /> QR rasmini yuklash
              <input type="file" accept="image/*" onChange={uploadQr} className="sr-only" />
            </label>
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={!!s.qr_enabled} onChange={(e) => set("qr_enabled", e.target.checked)} className="h-5 w-5 accent-violet-500" />
              QR to‘lovni yoqish
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRICE_FIELDS.map(([k, label]) => (
                <label key={k} className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                  {label} (so‘m)
                  <input type="number" min="0" inputMode="numeric" value={s[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={input} />
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                Qabul qiluvchi nomi
                <input value={s.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                Telegram (@siz)
                <input value={s.telegram_handle || ""} onChange={(e) => set("telegram_handle", e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                Odatda necha soatda faollashtirasiz
                <input type="number" min="0" value={s.activation_hours ?? ""} onChange={(e) => set("activation_hours", e.target.value)} className={input} />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={save} disabled={busy} style={METAL_GOLD} className="min-h-[44px] rounded-xl px-5 text-sm font-extrabold disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
              </button>
              {msg && <span className="text-xs text-white/70">{msg}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminQrPayments() {
  const [isAdmin, setIsAdmin] = useState(null);
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState("");

  const load = useCallback(async (status = tab) => {
    setLoading(true);
    setError("");
    try {
      const res = await qrPayApi("adminList", { status });
      setRows(res.payments || []);
    } catch (e) {
      setError(ERRORS[e.code] || e.message);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    base44.auth.me()
      .then((me) => setIsAdmin(me?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => { if (isAdmin) load(tab); }, [isAdmin, tab, load]);

  const viewReceipt = async (p) => {
    // Open the tab synchronously so pop-up blockers allow it, then point it
    // at a 5-minute signed URL for the private receipt.
    const win = window.open("", "_blank");
    try {
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: p.receipt_uri, expires_in: 300 });
      if (win) win.location.href = res.signed_url;
    } catch (e) {
      if (win) win.close();
      setError(e.message);
    }
  };

  const decide = async (p, decision, adminNote = "") => {
    setBusyId(p.id);
    setError("");
    try {
      await qrPayApi("review", { payment_id: p.id, decision, note: adminNote });
      setRows((prev) => prev.filter((r) => r.id !== p.id));
      setRejecting(null);
      setNote("");
    } catch (e) {
      setError(ERRORS[e.code] || e.message);
    }
    setBusyId("");
  };

  if (isAdmin === null) return <div className="flex min-h-screen items-center justify-center bg-[#0B0C1E]"><Loader2 className="h-6 w-6 animate-spin text-violet-300" /></div>;
  if (isAdmin === false) return <div className="p-8 text-center text-muted-foreground">This page is for admins only.</div>;

  const cols = "grid grid-cols-[1.6fr_1fr_1fr_0.9fr_0.8fr_1.5fr] items-center gap-4";

  return (
    <div className="min-h-screen bg-[#0B0C1E] px-4 py-8 text-white sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-white/55">ADMIN · FAQAT SIZ KO‘RASIZ</p>
            <h1 className="text-[28px] font-bold">QR to‘lovlar — tasdiqlash kutilmoqda</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tb) => (
              <button key={tb.id} type="button" aria-pressed={tab === tb.id} onClick={() => setTab(tb.id)}
                className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-bold ${tab === tb.id ? "bg-white text-[#0B0A1A]" : "border border-white/15 text-white/75"}`}>
                {tb.label}{tab === tb.id && !loading ? ` · ${rows.length}` : ""}
              </button>
            ))}
            <button type="button" onClick={() => load(tab)} aria-label="Yangilash" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/75">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <Settings onSaved={() => load(tab)} />

        {error && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <div className="overflow-x-auto rounded-[18px] border border-white/10">
          <div className="min-w-[900px]">
            <div className={`${cols} bg-white/[0.04] px-5 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white/55`}>
              <span>FOYDALANUVCHI</span><span>REJA</span><span>SUMMA</span><span>KOD</span><span>CHEK</span><span>AMAL</span>
            </div>
            {loading && <div className="flex justify-center border-t border-white/[0.08] py-10"><Loader2 className="h-5 w-5 animate-spin text-violet-300" /></div>}
            {!loading && rows.length === 0 && (
              <p className="border-t border-white/[0.08] px-5 py-10 text-center text-sm text-white/50">Hozircha bo‘sh.</p>
            )}
            {!loading && rows.map((p) => (
              <div key={p.id} className={`${cols} border-t border-white/[0.08] px-5 py-4 text-sm`}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-bold">{p.user_name || "—"}</span>
                  <span className="truncate text-xs text-white/55">
                    {p.user_email} · {new Date(p.submitted_at || p.created_date).toLocaleString()}
                  </span>
                </div>
                <span className="capitalize">{p.plan === "vip" ? "VIP" : "Learner"} · {p.billing_cycle === "yearly" ? "Yillik" : "Oylik"}</span>
                <span className="font-bold">{formatUzs(p.amount_uzs)} so‘m</span>
                <span className="font-mono font-bold">{p.payment_code}</span>
                {p.receipt_uri
                  ? <button type="button" onClick={() => viewReceipt(p)} className="min-h-[40px] rounded-[10px] border border-white/15 bg-white/[0.05] text-[13px] font-bold">Ko‘rish</button>
                  : <span className="text-xs text-white/40">—</span>}
                <div className="flex gap-2">
                  {(p.status === "pending" || p.status === "awaiting_receipt") ? (
                    <>
                      {p.status === "pending" && (
                        <button type="button" disabled={busyId === p.id} onClick={() => decide(p, "approve")} style={EMERALD}
                          className="min-h-[40px] flex-1 rounded-[10px] text-[13px] font-extrabold disabled:opacity-60">
                          {busyId === p.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Tasdiqlash"}
                        </button>
                      )}
                      <button type="button" disabled={busyId === p.id} onClick={() => { setRejecting(p); setNote(""); }}
                        className="min-h-[40px] flex-1 rounded-[10px] border border-[rgba(255,138,122,0.55)] text-[13px] font-bold text-[#FFB4A8] disabled:opacity-60">
                        Rad etish
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-white/55">
                      {p.reviewed_by ? `${p.reviewed_by}` : ""}{p.admin_note ? ` · “${p.admin_note}”` : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(214,180,108,0.30)] bg-[rgba(214,180,108,0.07)] px-[18px] py-4 text-[13px] leading-6 text-[#E9DDBC]">
          <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#D6B46C]" />
          <span>Tasdiqlashdan oldin: bank ilovangizda shu summa va izohda shu kod bilan tushum borligini tekshiring. “Tasdiqlash” obunani faollashtiradi. Chek rasmi o‘zi dalil emas — faqat bankdagi tushum dalil.</span>
        </div>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-[#11122A] p-6">
            <h2 id="reject-title" className="text-lg font-bold">{rejecting.payment_code} — rad etish</h2>
            <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
              O‘quvchiga ko‘rinadigan sabab (ixtiyoriy)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className={input} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejecting(null)} className="min-h-[40px] rounded-xl border border-white/15 px-4 text-sm font-bold">Bekor qilish</button>
              <button type="button" onClick={() => decide(rejecting, "reject", note)} disabled={busyId === rejecting.id}
                className="min-h-[40px] rounded-xl border border-[rgba(255,138,122,0.55)] px-4 text-sm font-bold text-[#FFB4A8]">
                Rad etish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
