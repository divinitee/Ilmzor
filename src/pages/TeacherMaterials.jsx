import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Upload, Sparkles, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function TeacherMaterials() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    const me = await base44.auth.me();
    if (!me || (me.role !== "admin" && me.teacher_status !== "approved")) {
      navigate("/");
      return;
    }
    setUser(me);
    const rows = await base44.entities.MaterialSource.filter({ teacher_id: me.id }, "-created_date", 100);
    setMaterials(rows);
  };

  useEffect(() => { load().catch(console.error); }, []);

  const createMaterial = async () => {
    if (!user || (!text.trim() && !file)) return;
    setSaving(true);
    try {
      let file_url = "";
      let source_type = "text";
      if (file) {
        const uploaded = await base44.integrations.Core.UploadFile({ file });
        file_url = uploaded.file_url;
        const ext = file.name.split(".").pop()?.toLowerCase();
        source_type = ext === "pdf" ? "pdf" : ext === "docx" || ext === "doc" ? "docx" : "image";
      }
      const row = await base44.entities.MaterialSource.create({
        teacher_id: user.id,
        teacher_email: user.email,
        title: title.trim() || file?.name || "Untitled material",
        source_type,
        file_url: file_url || undefined,
        source_text: text.trim() || undefined,
        processing_status: "uploaded",
      });
      setTitle("");
      setText("");
      setFile(null);
      await load();
      await processMaterial(row.id);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const processMaterial = async (id) => {
    setProcessingId(id);
    try {
      await base44.functions.invoke("process-material", { materialSourceId: id });
      await load();
    } catch (error) {
      console.error(error);
      await load();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <div className="font-bold text-sm">Material Library</div>
          <div className="text-[11px] text-muted-foreground">AI ingestion workspace</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <section className="premium-card p-5 space-y-4">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2"><Upload className="w-5 h-5" /> Add teaching material</h1>
            <p className="text-sm text-muted-foreground mt-1">Paste text or upload a PDF or DOCX. VIRORA extracts the material and maps its structure.</p>
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Material title, e.g. English Grammar in Use, Unit 7" />
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste lesson text, an exercise, or a unit here..." className="min-h-[220px]" />
          <div className="flex items-center gap-3">
            <Input type="file" accept=".pdf,.doc,.docx,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button onClick={createMaterial} disabled={saving || (!text.trim() && !file)}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Ingest
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4" /> Your materials</h2>
          {materials.length === 0 && <div className="text-sm text-muted-foreground py-10 text-center">No materials yet.</div>}
          {materials.map((m) => (
            <div key={m.id} className="premium-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> {m.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.source_type.toUpperCase()} · {m.processing_status}{m.structure?.page_count ? " · " + m.structure.page_count + " pages" : ""}{m.structure?.segment_count ? " · " + m.structure.segment_count + " sections" : ""}</div>
                {m.summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.summary}</p>}
                {m.error_message && <p className="text-xs text-destructive mt-2">{m.error_message}</p>}
              </div>
              <Button variant="outline" size="sm" disabled={processingId === m.id || m.processing_status === "processing"} onClick={() => processMaterial(m.id)}>
                {processingId === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analyze
              </Button>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}