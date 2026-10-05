import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppLang } from "@/hooks/useAppLang";
import { startAppTour } from "@/components/tour/AppTour";
import { HELP_COPY } from "@/components/helpCopy";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Bug, Compass, HelpCircle, ImagePlus, Lightbulb, Loader2, Send } from "lucide-react";

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

export default function HelpReporter({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useAppLang();
  const c = HELP_COPY[lang] || HELP_COPY.en;
  // Help is the single always-available home for the app tour (Tee,
  // 2026-10-05), on every page. The tour covers the student Home screen;
  // teacher-track and admin accounts are routed to /teacher, so they don't
  // get the option.
  const canTour = !!user && user.role !== "admin" && user.role !== "teacher" &&
    !["approved", "pending", "rejected"].includes(user.teacher_status);
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const currentRoute = `${location.pathname}${location.search}`;

  const reset = () => {
    setKind(null);
    setTitle("");
    setDetails("");
    setExpectedBehavior("");
    setScreenshot(null);
    setError("");
  };

  const close = () => {
    if (submitting) return;
    setOpen(false);
    reset();
  };

  const selectScreenshot = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(c.errImage);
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError(c.errSize);
      return;
    }
    setScreenshot(file);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    const cleanDetails = details.trim();
    const cleanTitle = title.trim();

    if (!cleanDetails || (kind === "bug" && !cleanTitle)) {
      setError(kind === "bug" ? c.errBugEmpty : c.errFeedbackEmpty);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let screenshotUri;
      if (kind === "bug" && screenshot) {
        const uploaded = await base44.integrations.Core.UploadPrivateFile({ file: screenshot });
        screenshotUri = uploaded.file_uri;
      }

      if (kind === "bug") {
        await base44.entities.BugReport.create({
          title: cleanTitle,
          details: cleanDetails,
          expected_behavior: expectedBehavior.trim() || undefined,
          current_route: currentRoute,
          ...(screenshotUri ? { screenshot_uri: screenshotUri } : {}),
        });
      } else {
        await base44.entities.Feedback.create({
          details: cleanDetails,
          current_route: currentRoute,
        });
      }

      setKind("submitted");
    } catch (submitError) {
      console.error("Report submission failed:", submitError);
      setError(c.errSend);
    } finally {
      setSubmitting(false);
    }
  };

  const takeTour = () => {
    setOpen(false);
    reset();
    if (location.pathname === "/") window.setTimeout(startAppTour, 150);
    else navigate("/?tour=1");
  };

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="help-button"
        className="fixed bottom-24 right-4 z-40 h-12 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex items-center gap-2 select-none"
        aria-label={c.buttonAria}
      >
        <HelpCircle className="w-5 h-5" />
        {c.button}
      </button>

      <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? setOpen(true) : close()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:rounded-2xl">
          {kind === "submitted" ? (
            <div className="py-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <DialogTitle>{c.thanks}</DialogTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                {title ? c.sentBug : c.sentFeedback}
              </p>
              <Button className="mt-6" onClick={close}>{c.done}</Button>
            </div>
          ) : !kind ? (
            <>
              <DialogHeader>
                <DialogTitle>{c.title}</DialogTitle>
                <DialogDescription>{c.subtitle}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 pt-1">
                {canTour && (
                  <button
                    type="button"
                    onClick={takeTour}
                    className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Compass className="h-5 w-5" /></span>
                      <span><span className="block font-semibold text-foreground">{c.tourTitle}</span><span className="block pt-0.5 text-sm text-muted-foreground">{c.tourDesc}</span></span>
                    </div>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setKind("bug")}
                  className="rounded-2xl border border-border p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive"><Bug className="h-5 w-5" /></span>
                    <span><span className="block font-semibold text-foreground">{c.bugTitle}</span><span className="block pt-0.5 text-sm text-muted-foreground">{c.bugDesc}</span></span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setKind("feedback")}
                  className="rounded-2xl border border-border p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><Lightbulb className="h-5 w-5" /></span>
                    <span><span className="block font-semibold text-foreground">{c.feedbackTitle}</span><span className="block pt-0.5 text-sm text-muted-foreground">{c.feedbackDesc}</span></span>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{kind === "bug" ? c.bugTitle : c.feedbackTitle}</DialogTitle>
                <DialogDescription>{c.formNote}</DialogDescription>
              </DialogHeader>

              {kind === "bug" && (
                <>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder={c.shortTitle} autoFocus />
                  <Textarea value={expectedBehavior} onChange={(event) => setExpectedBehavior(event.target.value)} maxLength={3000} rows={3} placeholder={c.expected} />
                </>
              )}

              <Textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={5000} rows={kind === "bug" ? 5 : 6} placeholder={kind === "bug" ? c.bugDetails : c.feedbackDetails} autoFocus={kind !== "bug"} />

              {kind === "bug" && (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={selectScreenshot} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <ImagePlus className="h-4 w-4" />
                    {screenshot ? c.attached.replace("{name}", screenshot.name) : c.attach}
                  </button>
                  {screenshot && <button type="button" onClick={() => setScreenshot(null)} className="ml-3 text-xs text-muted-foreground hover:text-foreground">{c.remove}</button>}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setKind(null); setError(""); }}>{c.back}</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{c.sending}</> : c.send}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
