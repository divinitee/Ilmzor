import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, ChevronDown, ChevronUp, Download, Loader2, RefreshCw, Send, Upload } from "lucide-react";
import { qrPayApi } from "@/lib/serverApi";
import { formatUzs, METAL_GOLD } from "@/lib/qrPay";
import jsQR from "jsqr";
import { qrArtSvg } from "@/lib/qrArt";
import { PLAN_THEME, planKey } from "@/lib/planTheme";
import { PlanDot } from "@/components/payments/MemberCard";

// Read the text out of an uploaded QR image, so the checkout can redraw it in
// each plan's style. Tries the image at a few sizes, and both colourings.
async function decodeQrFile(file) {
  const bitmap = await createImageBitmap(file);
  try {
    for (const max of [900, 600, 1400, 400]) {
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const hit = jsQR(data, w, h, { inversionAttempts: "attemptBoth" });
      if (hit?.data) return hit.data;
    }
  } finally {
    bitmap.close?.();
  }
  return "";
}

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
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "awaiting_receipt", label: "No receipt yet" },
];

const ERRORS = {
  has_active_card_subscription: "This student already has an active card (Dodo) subscription. Sort it out manually.",
  no_receipt_yet: "No receipt has been sent yet.",
  already_reviewed: "This payment has already been reviewed.",
  qr_url_must_be_https: "The QR image link must start with https://.",
  forbidden: "Admins only.",
  bot_token_missing: "The bot token (VIRORA_payment_BOT_tg) isn't in Base44 Secrets yet.",
  bot_token_invalid: "The bot token doesn't work. Get a new one from BotFather and update it in Secrets.",
  set_webhook_failed: "Couldn't set the Telegram webhook. Try again.",
  bad_qr_payload: "Invalid QR text (one line, max 1000 characters).",
};

// Every payment as a CSV, for your own spreadsheet copy of the records.
const CSV_COLS = [
  ["payment_code", "Code"], ["status", "Status"], ["user_name", "Name"], ["user_email", "Email"],
  ["plan", "Plan"], ["billing_cycle", "Cycle"], ["amount_uzs", "Amount (UZS)"],
  ["created_date", "Created"], ["submitted_at", "Receipt sent"], ["reviewed_at", "Reviewed"],
  ["reviewed_by", "Reviewed by"], ["admin_note", "Note"], ["user_id", "User ID"], ["id", "Payment ID"],
];
function downloadCsv(rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    // Neutralise spreadsheet formulas in user-supplied text.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = [CSV_COLS.map(([, h]) => cell(h)).join(",")];
  for (const r of rows) lines.push(CSV_COLS.map(([k]) => cell(r[k])).join(","));
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `virora-qr-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function TelegramPanel({ tgState, setTgState }) {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);
  const [msg, setMsg] = useState("");

  const connect = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await qrPayApi("tgSetup");
      setLink({ code: res.link_code, bot: res.bot_username });
      setTgState(res.telegram);
    } catch (e) {
      setMsg(ERRORS[e.code] || e.message);
    }
    setBusy(false);
  };
  const unlink = async () => {
    setBusy(true);
    try {
      const res = await qrPayApi("tgUnlink");
      setTgState(res.telegram);
      setLink(null);
    } catch (e) {
      setMsg(ERRORS[e.code] || e.message);
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Send className="h-4 w-4 text-violet-300" /> Telegram bot: approve receipts as they arrive
        </div>
        {tgState?.linked ? (
          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold text-violet-200">
            Connected{tgState.bot_username ? ` · @${tgState.bot_username}` : ""}
          </span>
        ) : (
          <span className="rounded-full bg-[rgba(214,180,108,0.15)] px-2.5 py-0.5 text-[11px] font-bold text-[#E9DDBC]">Not connected</span>
        )}
      </div>
      {!tgState?.token_set && (
        <p className="text-xs leading-5 text-white/65">
          First save the token from BotFather in Base44 → Settings → Secrets as <code className="font-mono">VIRORA_payment_BOT_tg</code>.
        </p>
      )}
      {link && (
        <div className="flex flex-col gap-2 rounded-xl border border-[rgba(214,180,108,0.40)] bg-[rgba(139,92,246,0.10)] p-3 text-sm">
          <span>Tap this within 15 minutes (the bot opens, then press “Start”):</span>
          <a href={`https://t.me/${link.bot}?start=${link.code}`} target="_blank" rel="noopener noreferrer"
            style={METAL_GOLD} className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-extrabold">
            <Send className="h-4 w-4" /> Open @{link.bot}
          </a>
          <span className="text-xs text-white/60">Or send the bot this code: <b className="font-mono">{link.code}</b></span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {tgState?.token_set && (
          <button type="button" onClick={connect} disabled={busy}
            className="min-h-[40px] rounded-xl border border-white/15 bg-white/[0.05] px-4 text-[13px] font-bold disabled:opacity-60">
            {tgState?.linked ? "Reconnect" : "Connect bot"}
          </button>
        )}
        {tgState?.linked && (
          <button type="button" onClick={unlink} disabled={busy}
            className="min-h-[40px] rounded-xl border border-white/15 px-4 text-[13px] font-bold text-white/70 disabled:opacity-60">
            Disconnect
          </button>
        )}
        {msg && <span className="text-xs text-rose-200">{msg}</span>}
      </div>
    </div>
  );
}

const PRICE_FIELDS = [
  ["price_uzs_learner_monthly", "Learner · monthly"],
  ["price_uzs_learner_yearly", "Learner · yearly"],
  ["price_uzs_vip_monthly", "VIP · monthly"],
  ["price_uzs_vip_yearly", "VIP · yearly"],
];

const input = "w-full rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-300/60";

function Settings({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [tgState, setTgState] = useState(null);

  useEffect(() => {
    qrPayApi("getSettings").then((res) => {
      setS(res.settings || { qr_enabled: false });
      setReady(!!res.config?.ready);
      setTgState(res.telegram || null);
      if (!res.config?.ready) setOpen(true);
    }).catch((e) => setMsg(ERRORS[e.code] || e.message));
  }, []);

  const [decodeMsg, setDecodeMsg] = useState("");
  const [showPayload, setShowPayload] = useState(false);
  const set = (k, v) => setS((prev) => ({ ...prev, [k]: v }));

  // Upload the QR image AND read the payment text inside it. The text is what
  // the checkout redraws in purple (Learner) and gold (VIP).
  const uploadQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setDecodeMsg("");
    try {
      const payload = await decodeQrFile(file).catch(() => "");
      if (payload) {
        set("qr_payload", payload);
        setDecodeMsg(/^000201/.test(payload)
          ? "QR read ✓ The checkout will draw it in each plan's colours. Don't forget to Save."
          : "QR read, but it doesn't look like a bank payment QR. Double-check it.");
      } else {
        // Never keep the OLD QR's text next to a NEW image: they'd pay different people.
        set("qr_payload", "");
        setDecodeMsg("Couldn't read the text inside the QR. Upload a clearer image or paste the text manually. For now the plain image will be shown.");
        setShowPayload(true);
      }
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
      setMsg(res.config?.ready ? "Saved. QR payments are live." : "Saved. QR payments are still off: tick Enable, add the QR and all four prices.");
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
          <span className="text-sm font-bold">Settings: QR, prices, Telegram</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ready ? "bg-violet-500/20 text-violet-200" : "bg-[rgba(214,180,108,0.15)] text-[#E9DDBC]"}`}>
            {ready ? "Live" : "Not set up"}
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && s && (
        <div className="grid gap-5 border-t border-white/10 px-5 py-5 md:grid-cols-[240px_1fr]">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl bg-[#F4F1EA]">
              {s.qr_image_url
                ? <img src={s.qr_image_url} alt="Payment QR code" className="h-full w-full object-contain" />
                : <span className="px-4 text-center text-xs font-bold text-[#3D3A4D]">No QR image uploaded (the QR text is used instead, if set)</span>}
            </div>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3.5 text-[13px] font-bold">
              <Upload className="h-4 w-4" /> Upload QR image
              <input type="file" accept="image/*" onChange={uploadQr} className="sr-only" />
            </label>
            {decodeMsg && <p className="text-center text-[11px] leading-4 text-white/70">{decodeMsg}</p>}
            {s.qr_payload ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-[11px] font-bold text-white/55">The QR students see — test-scan it with your phone:</p>
                <div className="flex gap-2">
                  {["learner", "vip"].map((st) => (
                    <div key={st} className="flex flex-col items-center gap-1">
                      <div className="h-24 w-24" dangerouslySetInnerHTML={{ __html: (() => { try { return qrArtSvg(s.qr_payload, st); } catch { return ""; } })() }} />
                      <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: PLAN_THEME[st].accent }}>
                        <PlanDot plan={st} size={7} /> {PLAN_THEME[st].label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <button type="button" onClick={() => setShowPayload((v) => !v)} className="text-[11px] font-bold text-white/45 underline-offset-2 hover:underline">
              {showPayload ? "Hide QR text" : "QR text (advanced)"}
            </button>
            {showPayload && (
              <textarea
                value={s.qr_payload || ""}
                onChange={(e) => set("qr_payload", e.target.value.replace(/[\r\n]/g, ""))}
                rows={4}
                placeholder="000201..."
                className={`${input} w-full font-mono text-[10px]`}
              />
            )}
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={!!s.qr_enabled} onChange={(e) => set("qr_enabled", e.target.checked)} className="h-5 w-5 accent-violet-500" />
              Enable QR payments
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRICE_FIELDS.map(([k, label]) => (
                <label key={k} className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                  {label} (UZS)
                  <input type="number" min="0" inputMode="numeric" value={s[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={input} />
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                Recipient name
                <input value={s.recipient_name || ""} onChange={(e) => set("recipient_name", e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                Support Telegram (@handle, optional)
                <input value={s.telegram_handle || ""} onChange={(e) => set("telegram_handle", e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
                Usual activation time (hours)
                <input type="number" min="0" value={s.activation_hours ?? ""} onChange={(e) => set("activation_hours", e.target.value)} className={input} />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={save} disabled={busy} style={METAL_GOLD} className="min-h-[44px] rounded-xl px-5 text-sm font-extrabold disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </button>
              {msg && <span className="text-xs text-white/70">{msg}</span>}
            </div>
            <TelegramPanel tgState={tgState} setTgState={setTgState} />
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
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await qrPayApi("adminList", { status: "all" });
      downloadCsv(res.payments || []);
    } catch (e) {
      setError(ERRORS[e.code] || e.message);
    }
    setExporting(false);
  };

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
            <p className="text-[11px] font-extrabold tracking-[0.16em] text-white/55">ADMIN · ONLY YOU CAN SEE THIS</p>
            <h1 className="text-[28px] font-bold">QR payments (Humo / Uzcard)</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tb) => (
              <button key={tb.id} type="button" aria-pressed={tab === tb.id} onClick={() => setTab(tb.id)}
                className={`min-h-[40px] rounded-full px-3.5 text-[13px] font-bold ${tab === tb.id ? "bg-white text-[#0B0A1A]" : "border border-white/15 text-white/75"}`}>
                {tb.label}{tab === tb.id && !loading ? ` · ${rows.length}` : ""}
              </button>
            ))}
            <button type="button" onClick={() => load(tab)} aria-label="Refresh" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/75">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={exportCsv} disabled={exporting}
              className="flex min-h-[40px] items-center gap-2 rounded-full border border-white/15 px-3.5 text-[13px] font-bold text-white/80 disabled:opacity-60">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} CSV
            </button>
          </div>
        </div>

        <Settings onSaved={() => load(tab)} />

        {error && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

        <div className="overflow-x-auto rounded-[18px] border border-white/10">
          <div className="min-w-[900px]">
            <div className={`${cols} bg-white/[0.04] px-5 py-3.5 text-[11px] font-extrabold tracking-[0.12em] text-white/55`}>
              <span>STUDENT</span><span>PLAN</span><span>AMOUNT</span><span>CODE</span><span>RECEIPT</span><span>ACTION</span>
            </div>
            {loading && <div className="flex justify-center border-t border-white/[0.08] py-10"><Loader2 className="h-5 w-5 animate-spin text-violet-300" /></div>}
            {!loading && rows.length === 0 && (
              <p className="border-t border-white/[0.08] px-5 py-10 text-center text-sm text-white/50">Nothing here yet.</p>
            )}
            {!loading && rows.map((p) => (
              <div key={p.id} className={`${cols} border-t border-white/[0.08] px-5 py-4 text-sm`}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <PlanDot plan={planKey(p.plan)} size={10} />
                    <span className="truncate font-bold">{p.user_name || "—"}</span>
                  </span>
                  <span className="truncate text-xs text-white/55">
                    {p.user_email} · {new Date(p.submitted_at || p.created_date).toLocaleString()}
                  </span>
                </div>
                <span className="font-semibold" style={{ color: PLAN_THEME[planKey(p.plan)].accent }}>{p.plan === "vip" ? "VIP" : "Learner"} · {p.billing_cycle === "yearly" ? "Yearly" : "Monthly"}</span>
                <span className="font-bold">{formatUzs(p.amount_uzs)} UZS</span>
                <span className="font-mono font-bold">{p.payment_code}</span>
                {p.receipt_uri
                  ? <button type="button" onClick={() => viewReceipt(p)} className="min-h-[40px] rounded-[10px] border border-white/15 bg-white/[0.05] text-[13px] font-bold">View</button>
                  : <span className="text-xs text-white/40">—</span>}
                <div className="flex gap-2">
                  {(p.status === "pending" || p.status === "awaiting_receipt") ? (
                    <>
                      {p.status === "pending" && (
                        <button type="button" disabled={busyId === p.id} onClick={() => decide(p, "approve")} style={EMERALD}
                          className="min-h-[40px] flex-1 rounded-[10px] text-[13px] font-extrabold disabled:opacity-60">
                          {busyId === p.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Approve"}
                        </button>
                      )}
                      <button type="button" disabled={busyId === p.id} onClick={() => { setRejecting(p); setNote(""); }}
                        className="min-h-[40px] flex-1 rounded-[10px] border border-[rgba(255,138,122,0.55)] text-[13px] font-bold text-[#FFB4A8] disabled:opacity-60">
                        Reject
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
          <span>Before approving: check your bank app for an incoming payment of this exact amount with this code in the comment. “Approve” activates the plan immediately. The receipt screenshot alone isn't proof — only the money in your bank is.</span>
        </div>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/10 bg-[#11122A] p-6">
            <h2 id="reject-title" className="text-lg font-bold">Reject {rejecting.payment_code}</h2>
            <label className="flex flex-col gap-1.5 text-xs font-bold text-white/70">
              Reason the student will see (optional — write it in Uzbek or Russian)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className={input} />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejecting(null)} className="min-h-[40px] rounded-xl border border-white/15 px-4 text-sm font-bold">Cancel</button>
              <button type="button" onClick={() => decide(rejecting, "reject", note)} disabled={busyId === rejecting.id}
                className="min-h-[40px] rounded-xl border border-[rgba(255,138,122,0.55)] px-4 text-sm font-bold text-[#FFB4A8]">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
