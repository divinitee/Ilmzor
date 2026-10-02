import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Check, Clock, Copy, Loader2, QrCode, Upload, Download, XCircle, Info } from "lucide-react";
import { useAppLang } from "@/hooks/useAppLang";
import { qrPayApi } from "@/lib/serverApi";
import { qrT, formatUzs } from "@/lib/qrPay";
import { pT } from "@/lib/planCopy";
import { PLAN_THEME, planKey, metalText } from "@/lib/planTheme";
import { qrArtSvg, qrArtPng } from "@/lib/qrArt";
import { getCurrentStage } from "@/lib/founderPricing";
import MemberCard from "@/components/payments/MemberCard";

// Humo / Uzcard payment by QR, themed per plan (2026-10-03):
//   learner → violet, guided 3-step walkthrough (Summa → Skanerlash → Chek)
//   vip     → black & gold, dramatic single page with concierge line
// Everything that matters — amount, code, who pays — comes from qrPayApi on
// the server. This page only shows it and uploads the receipt.

const PLANS = ["learner", "vip"];
const CYCLES = ["monthly", "yearly"];
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const APPS = ["Click", "Payme", "Uzum", "Paynet"];

const PAGE_BG = {
  learner: "radial-gradient(120% 60% at 50% 0%, #2A1846 0%, #0B0817 55%)",
  vip: "radial-gradient(80% 45% at 50% 16%, #3A2C12 0%, #0A0806 65%)",
};
const PAGE_BASE = { learner: "#0B0817", vip: "#0A0806" };

// The bank QR redrawn in the plan's style. Falls back to the uploaded image
// when the admin hasn't stored the QR's text yet.
function QrArt({ qr, style, alt }) {
  const svg = useMemo(() => {
    if (!qr?.payload) return "";
    try { return qrArtSvg(qr.payload, style); } catch { return ""; }
  }, [qr?.payload, style]);
  if (svg) return <div role="img" aria-label={alt} className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
  return <img src={qr?.image_url} alt={alt} className="h-full w-full rounded-2xl bg-white object-contain p-2" />;
}

async function saveQr(qr, style) {
  try {
    if (qr?.payload) {
      const blob = await qrArtPng(qr.payload, style);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "virora-qr.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return;
      }
    }
  } catch { /* fall through to the original image */ }
  if (qr?.image_url) window.open(qr.image_url, "_blank", "noopener,noreferrer");
}

function HelpLine({ q, handle, color }) {
  if (!handle) return null;
  return (
    <p className="text-center text-xs text-white/55">
      {q("help")}{" "}
      <a href={`https://t.me/${handle}`} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline" style={{ color }}>
        {q("help_tg")} · @{handle}
      </a>
    </p>
  );
}

function CopyCode({ code, q, th }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked: the code is on screen anyway */ }
  };
  return (
    <button type="button" onClick={copy} aria-label={q("copy")}
      className="flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-bold"
      style={{ borderColor: th.border, background: "rgba(255,255,255,0.05)", color: th.accent }}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? q("copied") : q("copy")}
    </button>
  );
}

function ReceiptPicker({ id, preview, onPick, q, th, dashed }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-bold text-white/80">{q("receipt")}</label>
      <label htmlFor={id}
        className="flex min-h-[72px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold"
        style={{ border: `1.5px dashed ${dashed}`, background: "rgba(255,255,255,0.03)", color: th.accent }}>
        {preview
          ? <><img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" /> {q("change")}</>
          : <><Upload className="h-5 w-5" /> {q("pick")}</>}
      </label>
      <input id={id} type="file" accept="image/*" onChange={onPick} className="sr-only" />
    </div>
  );
}

// ───────────────────────────── learner: 3-step walkthrough
function LearnerCheckout({ payment, qr, name, lang, q, p, ctx }) {
  const th = PLAN_THEME.learner;
  const [step, setStep] = useState(1);
  const amount = formatUzs(payment.amount_uzs);
  const code = payment.payment_code;
  const steps = [p("l_step_amount"), p("l_step_scan"), p("l_step_receipt")];
  const go = (n) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <>
      {/* stepper */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const now = n === step;
          return (
            <React.Fragment key={label}>
              {i > 0 && <div className="mb-5 h-[2px] flex-[1.2]" style={{ background: n <= step ? "linear-gradient(90deg, #8C66D4, #DCC08A)" : "rgba(255,255,255,0.15)" }} />}
              <button type="button" disabled={n > step} onClick={() => go(n)} className="flex flex-1 flex-col items-center gap-1.5 disabled:cursor-default">
                {done ? (
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full" style={th.metal}><Check className="h-3.5 w-3.5" /></span>
                ) : now ? (
                  <span className="vr-pulse-violet flex h-[30px] w-[30px] items-center justify-center rounded-full text-sm font-extrabold" style={PLAN_THEME.vip.metal}>{n}</span>
                ) : (
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white/20 text-[13px] font-bold text-white/45">{n}</span>
                )}
                <span className="text-[11px] font-bold" style={{ color: now ? "#DCC08A" : done ? th.accent : "rgba(255,255,255,0.45)" }}>{label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-extrabold tracking-[0.16em]" style={{ color: th.accent }}>{p("l_of", { n: step })}</p>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
          {step === 1 ? p("l1_title") : step === 2 ? p("l2_title") : p("l3_title")}
        </h1>
        <p className="text-sm leading-6 text-white/60">
          {step === 1 ? p("l1_sub") : step === 2 ? p("l2_sub") : p("l3_sub")}
        </p>
      </div>

      {step === 1 && (
        <>
          <div className="flex justify-center">
            <MemberCard plan="learner" name={name} lang={lang} founding={getCurrentStage().id === "founder"}
              rightLabel={p("plan_word")} rightValue={q(payment.billing_cycle)} />
          </div>
          <div className="flex flex-col gap-3 rounded-[20px] p-[18px]" style={{ background: "rgba(139,92,246,0.10)", border: `1px solid ${th.border.replace(/0\.\d+\)$/, "0.25)")}` }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">{q("plan")}</span>
              <span className="font-bold">{q("learner")} · {q(payment.billing_cycle)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">{q("amount")}</span>
              <span className="text-[24px] font-extrabold" style={{ color: "#DCC08A" }}>{amount} so‘m</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white/60">{q("code_label")}</span>
                <span className="font-mono text-xl font-bold tracking-wider">{code}</span>
              </div>
              <CopyCode code={code} q={q} th={th} />
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] leading-5" style={{ background: "rgba(220,192,138,0.08)", border: "1px dashed rgba(220,192,138,0.40)", color: "#E9DDBC" }}>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#DCC08A]" />
            <span>{p("l1_hint")}</span>
          </div>
          <button type="button" onClick={() => go(2)} style={th.metal}
            className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-xl text-[15px] font-extrabold transition-[filter] hover:brightness-110">
            {p("l_next")} <ArrowRight className="h-5 w-5" />
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3" style={{ background: "rgba(139,92,246,0.10)", border: `1px solid ${th.border.replace(/0\.\d+\)$/, "0.25)")}` }}>
            <div className="flex flex-col">
              <span className="text-xs text-white/55">{q("learner")} · {q(payment.billing_cycle)}</span>
              <span className="text-lg font-extrabold" style={{ color: "#DCC08A" }}>{amount} so‘m</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-white/55">{q("code")}</span>
              <span className="font-mono text-base font-bold tracking-wider">{code}</span>
            </div>
          </div>

          <div className="relative self-center rounded-[28px] p-3.5" style={{ width: 300, background: "#120B22", border: "1px solid rgba(196,181,253,0.35)", boxShadow: "0 0 0 6px rgba(140,102,212,0.10), 0 0 60px rgba(140,102,212,0.40), 0 24px 60px rgba(10,4,24,0.7)" }}>
            <div style={{ width: 272, height: 272 }}><QrArt qr={qr} style="learner" alt={q("title")} /></div>
            <div className="vr-scan pointer-events-none absolute left-7 right-7 h-[2px]" style={{ background: "linear-gradient(90deg, rgba(220,192,138,0), #DCC08A, rgba(220,192,138,0))", boxShadow: "0 0 14px #DCC08A" }} />
          </div>
          {qr.recipient_name && <p className="-mt-2 text-center text-xs font-semibold text-white/55">{q("recipient")}: {qr.recipient_name}</p>}

          <div className="flex flex-col gap-2.5 rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
            {[p("l2_a"), p("l2_b", { amount }), p("l2_c", { code })].map((line, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm leading-6 text-[#E6E3F0]">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-xs font-extrabold" style={{ background: "rgba(140,102,212,0.25)", color: th.accent }}>
                  {"abc"[i]}
                </span>
                <span>{line}</span>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[...APPS, p("bank_app")].map((a) => (
                <span key={a} className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/70">{a}</span>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] leading-5" style={{ background: "rgba(220,192,138,0.08)", border: "1px dashed rgba(220,192,138,0.40)", color: "#E9DDBC" }}>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#DCC08A]" />
            <span>{p("l2_tip")}</span>
          </div>

          <button type="button" onClick={() => go(3)} style={th.metal}
            className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-xl text-[15px] font-extrabold transition-[filter] hover:brightness-110">
            {p("l2_paid")} <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex justify-between">
            <button type="button" onClick={() => go(1)} className="min-h-[44px] text-[13px] font-bold text-white/55 hover:text-white">← {p("l_back")}</button>
            <button type="button" onClick={() => saveQr(qr, "learner")} className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-bold hover:text-white" style={{ color: th.accent }}>
              <Download className="h-4 w-4" /> {p("save_qr_png")}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <ReceiptPicker id="qr-receipt-l" preview={ctx.preview} onPick={ctx.pickFile} q={q} th={th} dashed="rgba(196,181,253,0.40)" />
          {ctx.error && <p className="text-center text-sm text-rose-300">{ctx.error}</p>}
          <button type="button" onClick={ctx.submit} disabled={ctx.sending} style={th.metal}
            className="flex min-h-[56px] items-center justify-center gap-2.5 rounded-xl text-base font-extrabold transition-[filter] hover:brightness-110 disabled:opacity-60">
            {ctx.sending ? <><Loader2 className="h-5 w-5 animate-spin" /> {q("sending")}</> : <><Check className="h-5 w-5" /> {p("l3_send")}</>}
          </button>
          <button type="button" onClick={() => go(2)} className="min-h-[44px] self-start text-[13px] font-bold text-white/55 hover:text-white">← {p("l_back")}</button>
          <p className="text-center text-xs leading-5 text-white/55">{ctx.hoursLine}</p>
        </>
      )}
    </>
  );
}

// ───────────────────────────── vip: dramatic single page
function VipCheckout({ payment, qr, name, lang, q, p, ctx, handle }) {
  const th = PLAN_THEME.vip;
  const amount = formatUzs(payment.amount_uzs);
  const code = payment.payment_code;
  const roman = ["I", "II", "III"];
  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[10px] font-extrabold tracking-[0.3em]" style={{ color: "#B9A27A" }}>{p("v_eyebrow")}</p>
        <h1 className="vr-serif text-[42px] font-semibold leading-[1.02]" style={metalText(th)}>{p("v_title")}</h1>
        <p className="max-w-[300px] text-sm leading-6" style={{ color: th.sub }}>{p("v_sub")}</p>
      </div>

      <div className="flex justify-center">
        <MemberCard plan="vip" name={name} lang={lang} founding={getCurrentStage().id === "founder"}
          rightLabel={p("plan_word")} rightValue={q(payment.billing_cycle)} />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[20px] px-[18px] py-4" style={{ background: "rgba(233,210,154,0.06)", border: "1px solid rgba(233,210,154,0.30)" }}>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] tracking-[0.12em]" style={{ color: "#9C8F78" }}>{q("amount").toUpperCase()}</span>
          <span className="text-[26px] font-extrabold" style={metalText(th)}>{amount} so‘m</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-base font-bold tracking-wider" style={{ color: th.text }}>{code}</span>
          <CopyCode code={code} q={q} th={th} />
        </div>
      </div>

      {/* QR inside a slowly turning gold ring */}
      <div className="relative mx-auto my-2 flex items-center justify-center" style={{ width: 316, height: 316 }}>
        <div className="vr-breathe pointer-events-none absolute -inset-6 rounded-full blur-2xl" style={{ background: "rgba(217,181,114,0.22)" }} />
        <div className="vr-spin-slow absolute inset-0 rounded-[36px]" style={{ background: "conic-gradient(from 0deg, #F6E7BE, #9C7536, #E3C68A, #5E4520, #F6E7BE, #B08D57, #F6E7BE)" }} />
        <div className="relative rounded-[32px] p-3" style={{ width: 308, height: 308, background: "#0E0B07" }}>
          <QrArt qr={qr} style="vip" alt={q("title")} />
        </div>
      </div>
      {qr.recipient_name && <p className="-mt-1 text-center text-xs font-semibold" style={{ color: "#9C8F78" }}>{q("recipient")}: {qr.recipient_name}</p>}
      <button type="button" onClick={() => saveQr(qr, "vip")} className="inline-flex min-h-[44px] items-center gap-1.5 self-center text-[13px] font-bold" style={{ color: th.accent }}>
        <Download className="h-4 w-4" /> {p("save_qr_png")}
      </button>

      <ol className="flex flex-col gap-3">
        {[p("v_step1"), p("v_step2", { amount, code }), p("v_step3")].map((line, i) => (
          <li key={i} className="flex items-start gap-3.5 text-sm leading-6" style={{ color: th.text }}>
            <span className="vr-serif w-7 shrink-0 text-center text-[22px] font-semibold leading-6" style={metalText(th)}>{roman[i]}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>

      <ReceiptPicker id="qr-receipt-v" preview={ctx.preview} onPick={ctx.pickFile} q={q} th={th} dashed="rgba(233,210,154,0.45)" />
      {ctx.error && <p className="text-center text-sm text-rose-300">{ctx.error}</p>}

      <button type="button" onClick={ctx.submit} disabled={ctx.sending} style={th.metal}
        className="relative flex min-h-[58px] items-center justify-center gap-2.5 overflow-hidden rounded-2xl text-base font-extrabold tracking-[0.02em] transition-[filter] hover:brightness-110 disabled:opacity-60">
        <span className="vr-sheen pointer-events-none absolute inset-y-0 left-0 w-1/4" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.45), rgba(255,255,255,0))" }} />
        <span className="relative flex items-center gap-2.5">
          {ctx.sending ? <><Loader2 className="h-5 w-5 animate-spin" /> {q("sending")}</> : <><Check className="h-5 w-5" /> {p("v_send")}</>}
        </span>
      </button>

      <p className="text-center text-xs leading-5" style={{ color: "#9C8F78" }}>{ctx.hoursLine}</p>
      {handle && (
        <p className="text-center text-[13px]" style={{ color: th.sub }}>
          {p("v_concierge")}{" "}
          <a href={`https://t.me/${handle}`} target="_blank" rel="noopener noreferrer" className="font-bold underline-offset-2 hover:underline" style={{ color: th.accent }}>@{handle}</a>
        </p>
      )}
    </>
  );
}

// ───────────────────────────── after "approved"
function Welcome({ k, payment, name, lang, q, p }) {
  const th = PLAN_THEME[k];
  const vip = k === "vip";
  return (
    <div className="relative flex flex-col items-center gap-6 pt-6 text-center">
      {vip && (
        <>
          <div className="vr-spin-xslow pointer-events-none absolute rounded-full" style={{ width: 760, height: 760, left: "calc(50% - 380px)", top: -250, background: "repeating-conic-gradient(from 0deg, rgba(233,201,140,0.10) 0deg 6deg, rgba(233,201,140,0) 6deg 18deg)" }} />
          {[[12, 0], [34, 0.5], [62, 1], [84, 1.4]].map(([left, delay]) => (
            <span key={left} className="vr-rise pointer-events-none absolute h-1 w-1 rounded-full bg-[#E9D29A]" style={{ left: `${left}%`, top: 520, animationDelay: `${delay}s` }} />
          ))}
        </>
      )}
      <p className="relative text-[11px] font-extrabold tracking-[0.32em]" style={{ color: vip ? "#B9A27A" : th.accent }}>
        {vip ? p("v_welcome_eyebrow") : p("l_welcome_eyebrow")}
      </p>
      <h1 className={`relative ${vip ? "vr-serif text-[44px] font-semibold leading-[1.02]" : "text-[30px] font-extrabold"}`} style={metalText(th)}>
        {vip ? p("v_welcome_title") : p("l_welcome_title")}
      </h1>
      <div className="relative flex w-full justify-center">
        <MemberCard plan={k} name={name} lang={lang} active rightLabel={p("plan_word")} rightValue={q(payment.billing_cycle)} />
      </div>
      <p className="relative max-w-[300px] text-sm leading-6" style={{ color: th.sub }}>
        {vip ? p("v_welcome_sub") : p("l_welcome_sub")}
      </p>
      <Link to="/" style={th.metal} className="relative flex min-h-[56px] w-full items-center justify-center rounded-2xl text-base font-extrabold">
        {vip ? p("v_welcome_cta") : p("l_welcome_cta")}
      </Link>
    </div>
  );
}

// ───────────────────────────── pending / rejected tracker
function Tracker({ k, payment, q, p, hoursLine, handle }) {
  const th = PLAN_THEME[k];
  const vip = k === "vip";
  const rejected = payment.status === "rejected";
  const amount = formatUzs(payment.amount_uzs);
  const label = `${q(payment.plan)} · ${q(payment.billing_cycle)}`;
  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex flex-col items-center gap-3.5 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[1.5px]"
          style={rejected ? { borderColor: "rgba(253,164,175,0.5)", background: "rgba(244,63,94,0.10)", color: "#FDA4AF" } : { borderColor: th.border, background: th.glow, color: th.accent }}>
          {rejected ? <XCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
        </div>
        <h1 className={vip && !rejected ? "vr-serif text-[32px] font-semibold" : "text-2xl font-bold"} style={vip && !rejected ? metalText(th) : undefined}>
          {rejected ? q("rejected_title") : vip ? p("v_pending_title") : q("done_title")}
        </h1>
        <p className="text-sm leading-6 text-white/60">{rejected ? q("rejected_sub") : vip ? p("v_pending_sub") : q("done_sub")}</p>
        {rejected && payment.admin_note && <p className="text-sm text-white/80">“{payment.admin_note}”</p>}
      </div>

      {!rejected && (
        <div className="flex flex-col rounded-[20px] p-[18px]" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${th.border.replace(/0\.\d+\)$/, "0.25)")}` }}>
          <div className="flex min-h-[44px] items-center gap-3">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full" style={th.metal}><Check className="h-3.5 w-3.5" /></span>
            <span className="text-sm font-bold">{q("st_sent")}</span>
          </div>
          <div className="flex min-h-[44px] items-center gap-3">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2" style={{ borderColor: th.accent, color: th.accent }}><Clock className="h-3.5 w-3.5" /></span>
            <span className="text-sm font-bold" style={{ color: th.accent }}>{q("st_check")}</span>
          </div>
          <div className="flex min-h-[44px] items-center gap-3">
            <span className="h-[26px] w-[26px] rounded-full border-2 border-white/25" />
            <span className="text-sm font-semibold text-white/50">{q("st_active")}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-[18px] py-4 text-[13px]">
        <div className="flex justify-between"><span className="text-white/60">{q("plan")}</span><span className="font-bold">{label}</span></div>
        <div className="flex justify-between"><span className="text-white/60">{q("sum")}</span><span className="font-bold">{amount} so‘m</span></div>
        <div className="flex justify-between"><span className="text-white/60">{q("code")}</span><span className="font-mono font-bold">{payment.payment_code}</span></div>
      </div>

      <Link to={rejected ? "/pricing" : "/"} style={th.metal} className="flex min-h-[52px] items-center justify-center rounded-xl text-[15px] font-bold">
        {rejected ? q("try_again") : q("continue")}
      </Link>
      {payment.status === "pending" && <p className="text-center text-xs text-white/55">{hoursLine}</p>}
      <HelpLine q={q} handle={handle} color={th.accent} />
    </div>
  );
}

export default function QrPayment() {
  const { lang } = useAppLang();
  const q = useCallback((key, vars) => qrT(lang, key, vars), [lang]);
  const p = useCallback((key, vars) => pT(lang, key, vars), [lang]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get("plan");
  const cycle = params.get("cycle");

  const [view, setView] = useState("loading"); // loading | form | status | not_ready | error
  const [payment, setPayment] = useState(null);
  const [qr, setQr] = useState(null);
  const [config, setConfig] = useState(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const showPayment = (pay) => {
    setPayment(pay);
    setView(pay.status === "awaiting_receipt" ? "form" : "status");
  };

  useEffect(() => {
    base44.auth.me().then((me) => setName(me?.full_name || "")).catch(() => {});
  }, []);

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

  const submit = async () => {
    if (!file) { setError(q("need_receipt")); return; }
    setSending(true);
    setError("");
    try {
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await qrPayApi("submit", { payment_id: payment.id, receipt_uri: uploaded.file_uri });
      showPayment(res.payment);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError(q("err_generic"));
    }
    setSending(false);
  };

  const k = planKey(payment?.plan || plan) === "vip" ? "vip" : "learner";
  const th = PLAN_THEME[k];
  const handle = config?.telegram_handle || "";
  const hours = config?.activation_hours;
  const hoursLine = hours ? q("hours", { hours }) : q("hours_generic");
  const ctx = { preview, pickFile, submit, sending, error, hoursLine };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 text-white sm:py-10" style={{ background: `${PAGE_BG[k]}, ${PAGE_BASE[k]}`, backgroundColor: PAGE_BASE[k], fontFamily: "inherit" }}>
      {k === "vip" && (
        <>
          {/* spotlight from above + watermark V */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[420px] -translate-x-1/2" style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(246,231,190,0.18), rgba(246,231,190,0) 70%)" }} />
          <img src="/virora-mark-v2.svg" alt="" aria-hidden="true" className="pointer-events-none absolute -right-24 top-40 h-[420px] w-[420px] opacity-[0.04]" />
          <span className="vr-twinkle pointer-events-none absolute left-[10%] top-[180px] h-1 w-1 rounded-full bg-[#F6E7BE]" />
          <span className="vr-twinkle pointer-events-none absolute right-[16%] top-[120px] h-1 w-1 rounded-full bg-[#E9D29A]" style={{ animationDelay: "1.2s" }} />
          <span className="vr-twinkle pointer-events-none absolute left-[22%] top-[420px] h-[3px] w-[3px] rounded-full bg-[#D9B572]" style={{ animationDelay: "0.7s" }} />
        </>
      )}

      <div className="relative mx-auto flex max-w-md flex-col gap-5">
        <Link to="/pricing" className="inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-semibold text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {q("back")}
        </Link>

        {view === "loading" && (
          <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin" style={{ color: th.accent }} /></div>
        )}

        {view === "error" && (
          <div className="flex flex-col items-center gap-4 rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-center">
            <p className="text-sm text-white/80">{error}</p>
            <button type="button" onClick={begin} style={th.metal} className="min-h-[48px] rounded-xl px-5 text-sm font-bold">{q("try_again")}</button>
            <HelpLine q={q} handle={handle} color={th.accent} />
          </div>
        )}

        {view === "not_ready" && (
          <div className="flex flex-col items-center gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-6 text-center">
            <QrCode className="h-10 w-10" style={{ color: th.accent }} />
            <h1 className="text-xl font-bold">{q("not_ready_title")}</h1>
            <p className="text-sm leading-6 text-white/60">{q("not_ready_sub")}</p>
            <HelpLine q={q} handle={handle} color={th.accent} />
          </div>
        )}

        {view === "form" && payment && qr && (
          k === "vip"
            ? <VipCheckout payment={payment} qr={qr} name={name} lang={lang} q={q} p={p} ctx={ctx} handle={handle} />
            : <LearnerCheckout key={payment.id} payment={payment} qr={qr} name={name} lang={lang} q={q} p={p} ctx={ctx} />
        )}

        {view === "status" && payment && (
          payment.status === "approved"
            ? <Welcome k={k} payment={payment} name={name} lang={lang} q={q} p={p} />
            : <Tracker k={k} payment={payment} q={q} p={p} hoursLine={hoursLine} handle={handle} />
        )}
      </div>
    </div>
  );
}
