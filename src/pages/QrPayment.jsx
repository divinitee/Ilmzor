import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Check, Clock, Copy, Loader2, QrCode, Upload, Download, XCircle } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { qrPayApi } from "@/lib/serverApi";
import { qrT, formatUzs, METAL_GOLD, METAL_VIOLET, GOLD_TEXT } from "@/lib/qrPay";

// Humo / Uzcard payment by QR code (approved design, 2026-10-02).
// Everything that matters — the amount, the code, who is paying — comes from
// qrPayApi on the server. This page only shows it and uploads the receipt.

const PLANS = ["learner", "vip"];
const CYCLES = ["monthly", "yearly"];
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const card = "rounded-[20px] border border-white/10 bg-white/[0.04]";

function StepDot({ n }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold" style={METAL_GOLD}>
      {n}
    </span>
  );
}

function HelpLine({ q, handle }) {
  if (!handle) return null;
  return (
    <p className="text-center text-xs text-white/55">
      {q("help")}{" "}
      <a href={`https://t.me/${handle}`} target="_blank" rel="noopener noreferrer" className="text-violet-300 underline-offset-2 hover:underline">
        {q("help_tg")} · @{handle}
      </a>
    </p>
  );
}

export default function QrPayment() {
  const { lang } = useAppLang();
  const q = useCallback((key, vars) => qrT(lang, key, vars), [lang]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get("plan");
  const cycle = params.get("cycle");

  const [view, setView] = useState("loading"); // loading | form | status | not_ready | error
  const [payment, setPayment] = useState(null);
  const [qr, setQr] = useState(null);
  const [config, setConfig] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const showPayment = (p) => {
    setPayment(p);
    setView(p.status === "awaiting_receipt" ? "form" : "status");
  };

  const begin = useCallback(async () => {
    setView("loading");
    setError("");
    try {
      if (PLANS.includes(plan) && CYCLES.includes(cycle)) {
        const res = await qrPayApi("start", { plan, billing_cycle: cycle });
        setQr(res.qr);
        setConfig(res.config);
        showPayment(res.payment);
        return;
      }
      // No plan in the link: show the latest payment's status, if any.
      const [mine, cfg] = await Promise.all([qrPayApi("mine"), qrPayApi("config")]);
      setConfig(cfg?.config || null);
      const latest = mine?.payments?.[0];
      if (latest && latest.status !== "awaiting_receipt") showPayment(latest);
      else navigate("/pricing", { replace: true });
    } catch (e) {
      if (e.code === "not_configured") {
        const cfg = await qrPayApi("config").catch(() => null);
        setConfig(cfg?.config || null);
        setView("not_ready");
      } else {
        setError(e.code === "too_many_open" ? q("err_too_many") : q("err_generic"));
        setView("error");
      }
    }
  }, [plan, cycle, navigate, q]);

  useEffect(() => { begin(); }, [begin]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > MAX_RECEIPT_BYTES) {
      setError(q("need_receipt"));
      return;
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(payment.payment_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the code is on screen anyway */ }
  };

  const submit = async () => {
    if (!file) { setError(q("need_receipt")); return; }
    setSending(true);
    setError("");
    try {
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await qrPayApi("submit", { payment_id: payment.id, receipt_uri: uploaded.file_uri });
      showPayment(res.payment);
    } catch (e) {
      setError(q("err_generic"));
    }
    setSending(false);
  };

  const handle = config?.telegram_handle || "";
  const hours = config?.activation_hours;
  const amount = payment ? formatUzs(payment.amount_uzs) : "";
  const planLabel = payment ? `${q(payment.plan)} · ${q(payment.billing_cycle)}` : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070817] px-4 py-6 text-white sm:py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-16rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-violet-600/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-md flex-col gap-5">
        <Link to="/pricing" className="inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-semibold text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {q("back")}
        </Link>

        {view === "loading" && (
          <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-violet-300" /></div>
        )}

        {view === "error" && (
          <div className={`${card} flex flex-col items-center gap-4 p-6 text-center`}>
            <p className="text-sm text-white/80">{error}</p>
            <button type="button" onClick={begin} style={METAL_VIOLET} className="min-h-[48px] rounded-xl px-5 text-sm font-bold">{q("try_again")}</button>
            <HelpLine q={q} handle={handle} />
          </div>
        )}

        {view === "not_ready" && (
          <div className={`${card} flex flex-col items-center gap-3 p-6 text-center`}>
            <QrCode className="h-10 w-10" style={{ color: GOLD_TEXT }} />
            <h1 className="text-xl font-bold">{q("not_ready_title")}</h1>
            <p className="text-sm leading-6 text-white/60">{q("not_ready_sub")}</p>
            <HelpLine q={q} handle={handle} />
          </div>
        )}

        {view === "form" && payment && qr && (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-extrabold tracking-[0.16em]" style={{ color: GOLD_TEXT }}>{q("eyebrow")}</p>
              <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">{q("title")}</h1>
              <p className="text-sm leading-6 text-white/60">{q("sub")}</p>
            </div>

            <div className={`${card} flex flex-col gap-3 p-[18px]`}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{q("plan")}</span>
                <span className="font-bold">{planLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">{q("amount")}</span>
                <span className="text-[22px] font-extrabold" style={{ color: GOLD_TEXT }}>{amount} so‘m</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-white/60">{q("code_label")}</span>
                  <span className="font-mono text-xl font-bold tracking-wider">{payment.payment_code}</span>
                </div>
                <button type="button" onClick={copyCode} aria-label={q("copy")}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 text-[13px] font-bold">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? q("copied") : q("copy")}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-3xl bg-[#F4F1EA] p-5 text-[#14131F]">
              <img src={qr.image_url} alt={q("title")} className="h-60 w-60 rounded-2xl object-contain" />
              {qr.recipient_name && (
                <p className="text-[13px] font-bold text-[#3D3A4D]">{q("recipient")}: {qr.recipient_name}</p>
              )}
              <a href={qr.image_url} download target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#C9C4D6] bg-white px-4 text-[13px] font-bold text-[#14131F]">
                <Download className="h-4 w-4" /> {q("save_qr")}
              </a>
            </div>

            <ol className="flex flex-col gap-3.5">
              <li className="flex items-start gap-3 text-sm leading-6 text-white/90"><StepDot n={1} />{q("step1")}</li>
              <li className="flex items-start gap-3 text-sm leading-6 text-white/90"><StepDot n={2} />{q("step2", { amount, code: payment.payment_code })}</li>
              <li className="flex items-start gap-3 text-sm leading-6 text-white/90"><StepDot n={3} />{q("step3")}</li>
            </ol>

            <div className="flex flex-col gap-2">
              <label htmlFor="qr-receipt" className="text-[13px] font-bold text-white/80">{q("receipt")}</label>
              <label htmlFor="qr-receipt"
                className="flex min-h-[64px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-white/25 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/80">
                {preview
                  ? <><img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" /> {q("change")}</>
                  : <><Upload className="h-5 w-5" /> {q("pick")}</>}
              </label>
              <input id="qr-receipt" type="file" accept="image/*" onChange={pickFile} className="sr-only" />
            </div>

            {error && <p className="text-center text-sm text-rose-300">{error}</p>}

            <button type="button" onClick={submit} disabled={sending} style={METAL_GOLD}
              className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-xl text-base font-extrabold transition-[filter] hover:brightness-110 disabled:opacity-60">
              {sending ? <><Loader2 className="h-5 w-5 animate-spin" /> {q("sending")}</> : <><Check className="h-5 w-5" /> {q("paid_btn")}</>}
            </button>

            <p className="text-center text-xs leading-5 text-white/55">
              {hours ? q("hours", { hours }) : q("hours_generic")}
            </p>
            <HelpLine q={q} handle={handle} />
          </>
        )}

        {view === "status" && payment && (
          <div className="flex flex-col gap-6 pt-6">
            <div className="flex flex-col items-center gap-3.5 text-center">
              <div className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-[1.5px] ${
                payment.status === "rejected" ? "border-rose-300/50 bg-rose-400/10 text-rose-300" : "border-violet-300/50 bg-violet-500/15 text-violet-300"}`}>
                {payment.status === "rejected" ? <XCircle className="h-8 w-8" /> : <Check className="h-8 w-8" />}
              </div>
              <h1 className="text-2xl font-bold">
                {payment.status === "approved" ? q("approved_title") : payment.status === "rejected" ? q("rejected_title") : q("done_title")}
              </h1>
              <p className="text-sm leading-6 text-white/60">
                {payment.status === "approved" ? q("approved_sub") : payment.status === "rejected" ? q("rejected_sub") : q("done_sub")}
              </p>
              {payment.status === "rejected" && payment.admin_note && (
                <p className="text-sm text-white/80">“{payment.admin_note}”</p>
              )}
            </div>

            {payment.status !== "rejected" && (
              <div className={`${card} flex flex-col p-[18px]`}>
                <div className="flex min-h-[44px] items-center gap-3">
                  <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full" style={METAL_VIOLET}><Check className="h-3.5 w-3.5" /></span>
                  <span className="text-sm font-bold">{q("st_sent")}</span>
                </div>
                <div className="flex min-h-[44px] items-center gap-3">
                  {payment.status === "approved"
                    ? <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full" style={METAL_VIOLET}><Check className="h-3.5 w-3.5" /></span>
                    : <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-[#D6B46C] text-[#D6B46C]"><Clock className="h-3.5 w-3.5" /></span>}
                  <span className={`text-sm font-bold ${payment.status === "approved" ? "" : "text-[#D6B46C]"}`}>{q("st_check")}</span>
                </div>
                <div className="flex min-h-[44px] items-center gap-3">
                  {payment.status === "approved"
                    ? <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full" style={METAL_GOLD}><Check className="h-3.5 w-3.5" /></span>
                    : <span className="h-[26px] w-[26px] rounded-full border-2 border-white/25" />}
                  <span className={`text-sm font-semibold ${payment.status === "approved" ? "font-bold text-white" : "text-white/50"}`}>{q("st_active")}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-[18px] py-4 text-[13px]">
              <div className="flex justify-between"><span className="text-white/60">{q("plan")}</span><span className="font-bold">{planLabel}</span></div>
              <div className="flex justify-between"><span className="text-white/60">{q("sum")}</span><span className="font-bold">{amount} so‘m</span></div>
              <div className="flex justify-between"><span className="text-white/60">{q("code")}</span><span className="font-mono font-bold">{payment.payment_code}</span></div>
            </div>

            {payment.status === "rejected" ? (
              <Link to="/pricing" style={METAL_VIOLET} className="flex min-h-[52px] items-center justify-center rounded-xl text-[15px] font-bold">{q("try_again")}</Link>
            ) : (
              <Link to="/" style={METAL_VIOLET} className="flex min-h-[52px] items-center justify-center rounded-xl text-[15px] font-bold">{q("continue")}</Link>
            )}
            {payment.status === "pending" && (
              <p className="text-center text-xs text-white/55">{hours ? q("hours", { hours }) : q("hours_generic")}</p>
            )}
            <HelpLine q={q} handle={handle} />
          </div>
        )}
      </div>
    </div>
  );
}
