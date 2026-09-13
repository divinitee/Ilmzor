import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Bug, ExternalLink, Lightbulb, Loader2, Shield } from "lucide-react";

const formatDate = (date) => date ? new Date(date).toLocaleString() : "—";

export default function Developer() {
  const [state, setState] = useState({ loading: true, allowed: false, bugs: [], feedback: [], usersById: {} });
  const [tab, setTab] = useState("bugs");
  const [query, setQuery] = useState("");
  const [signedUrls, setSignedUrls] = useState({});
  const [signing, setSigning] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me || me.role !== "admin") {
          setState((current) => ({ ...current, loading: false, allowed: false }));
          return;
        }
        const [bugs, feedback, users] = await Promise.all([
          base44.entities.BugReport.list("-created_date", 500),
          base44.entities.Feedback.list("-created_date", 500),
          base44.entities.User.list(),
        ]);
        setState({
          loading: false,
          allowed: true,
          bugs: bugs || [],
          feedback: feedback || [],
          usersById: Object.fromEntries((users || []).map((user) => [user.id, user])),
        });
      } catch (error) {
        console.error("Developer reports load failed:", error);
        setState((current) => ({ ...current, loading: false, allowed: false }));
      }
    })();
  }, []);

  const reporter = (record) => {
    const user = state.usersById[record.created_by_id];
    return user?.full_name || user?.name || user?.email || record.created_by_id || "Unknown user";
  };

  const openScreenshot = async (record) => {
    if (!record.screenshot_uri || signedUrls[record.id] || signing[record.id]) return;
    setSigning((current) => ({ ...current, [record.id]: true }));
    try {
      const result = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: record.screenshot_uri,
        expires_in: 300,
      });
      setSignedUrls((current) => ({ ...current, [record.id]: result.signed_url }));
    } catch (error) {
      console.error("Screenshot signing failed:", error);
    } finally {
      setSigning((current) => ({ ...current, [record.id]: false }));
    }
  };

  if (state.loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  if (!state.allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10"><Shield className="h-7 w-7 text-destructive" /></span>
          <h1 className="mt-4 text-xl font-bold text-foreground">Access denied</h1>
          <p className="mt-1 text-sm text-muted-foreground">This page is for administrators only.</p>
          <Link to="/"><Button variant="outline" className="mt-5">Back home</Button></Link>
        </div>
      </div>
    );
  }

  const items = tab === "bugs" ? state.bugs : state.feedback;
  const visible = items.filter((item) => {
    const terms = `${reporter(item)} ${item.title || ""} ${item.details || ""} ${item.current_route || ""}`.toLowerCase();
    return terms.includes(query.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 pb-3 backdrop-blur safe-header">
        <Link to="/" className="p-1.5 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="font-bold text-foreground">Developer</h1>
          <p className="text-xs text-muted-foreground">Bug reports and product feedback</p>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex w-fit gap-1 rounded-xl bg-muted p-1">
            <button onClick={() => setTab("bugs")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "bugs" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Bugs ({state.bugs.length})</button>
            <button onClick={() => setTab("feedback")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "feedback" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Feedback ({state.feedback.length})</button>
          </div>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" className="sm:ml-auto sm:max-w-xs" />
        </div>

        <div className="space-y-3">
          {visible.length === 0 && <div className="rounded-2xl border border-border bg-card py-14 text-center text-sm text-muted-foreground">No {tab === "bugs" ? "bug reports" : "feedback"} yet.</div>}
          {visible.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tab === "bugs" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
                  {tab === "bugs" ? <Bug className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  {tab === "bugs" && <h2 className="font-semibold text-foreground">{item.title}</h2>}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{item.details}</p>
                  {tab === "bugs" && item.expected_behavior && <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm"><span className="font-medium text-foreground">Expected: </span><span className="text-muted-foreground">{item.expected_behavior}</span></div>}
                  <div className="mt-4 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>{reporter(item)}</span><span>{formatDate(item.created_date)}</span><span className="truncate" title={item.current_route}>{item.current_route}</span>
                  </div>
                  {tab === "bugs" && item.screenshot_uri && (
                    <div className="mt-4">
                      {signedUrls[item.id] ? <a href={signedUrls[item.id]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open private screenshot <ExternalLink className="h-3.5 w-3.5" /></a> : <Button variant="outline" size="sm" disabled={signing[item.id]} onClick={() => openScreenshot(item)}>{signing[item.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Open screenshot</Button>}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
