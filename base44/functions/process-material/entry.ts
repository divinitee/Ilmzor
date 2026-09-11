import { createClientFromRequest } from "npm:@base44/sdk";

const MAX_SOURCE_CHARS = 50000;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const { materialSourceId } = await req.json();
    if (!materialSourceId) return Response.json({ error: "materialSourceId is required" }, { status: 400 });

    const material = await base44.asServiceRole.entities.MaterialSource.get(materialSourceId);
    if (!material) return Response.json({ error: "Material not found" }, { status: 404 });
    if (user.role !== "admin" && material.teacher_id !== user.id) {
      return Response.json({ error: "Not allowed" }, { status: 403 });
    }

    await base44.asServiceRole.entities.MaterialSource.update(material.id, {
      processing_status: "processing",
      error_message: null,
    });

    const text = (material.source_text || material.extracted_text || "").trim();
    if (!text) {
      await base44.asServiceRole.entities.MaterialSource.update(material.id, {
        processing_status: "failed",
        error_message: "This file has no extracted text yet. Text extraction for uploaded PDF, DOCX and image files is the next ingestion layer.",
      });
      return Response.json({ ok: false, status: "failed", reason: "no_extracted_text" });
    }

    const source = text.slice(0, MAX_SOURCE_CHARS);
    const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        "You are VIRORA's material ingestion engine for English teachers.",
        "Analyze the source material below. Do not invent content that is absent.",
        "Return JSON matching the schema.",
        "Identify the material's language, concise summary, and a navigable hierarchy of segments.",
        "A segment should correspond to a useful teacher-selectable unit, chapter, section, or page range.",
        "Keep content_text faithful to the source and short enough to store. Use the exact relevant excerpt when possible.",
        "",
        "SOURCE TITLE: " + material.title,
        "SOURCE:",
        source,
      ].join("\n"),
      response_json_schema: {
        type: "object",
        properties: {
          detected_language: { type: "string" },
          summary: { type: "string" },
          segments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                segment_type: { type: "string" },
                start_ref: { type: "string" },
                end_ref: { type: "string" },
                title: { type: "string" },
                summary: { type: "string" },
                learning_topics: { type: "array", items: { type: "string" } },
                content_text: { type: "string" },
              },
              required: ["title"],
            },
          },
        },
      },
    });

    const segments = Array.isArray(analysis?.segments) ? analysis.segments.slice(0, 100) : [];

    const existing = await base44.asServiceRole.entities.MaterialSegment.filter(
      { material_source_id: material.id },
      "-created_date",
      200,
    );
    for (const segment of existing) {
      await base44.asServiceRole.entities.MaterialSegment.delete(segment.id);
    }

    for (let i = 0; i < segments.length; i++) {
      const s = segments[i] || {};
      await base44.asServiceRole.entities.MaterialSegment.create({
        material_source_id: material.id,
        teacher_id: material.teacher_id,
        label: s.label || "",
        segment_type: ["chapter","unit","section","page_range","other"].includes(s.segment_type) ? s.segment_type : "section",
        order_index: i + 1,
        start_ref: s.start_ref || "",
        end_ref: s.end_ref || "",
        title: s.title || "Untitled section",
        summary: s.summary || "",
        learning_topics: Array.isArray(s.learning_topics) ? s.learning_topics.slice(0, 20) : [],
        content_text: s.content_text || "",
      });
    }

    await base44.asServiceRole.entities.MaterialSource.update(material.id, {
      extracted_text: source,
      detected_language: analysis?.detected_language || "",
      summary: analysis?.summary || "",
      structure: { segment_count: segments.length },
      processing_status: "ready",
      error_message: null,
      processed_at: new Date().toISOString(),
    });

    return Response.json({ ok: true, segmentCount: segments.length });
  } catch (error) {
    console.error(error);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.materialSourceId) {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.MaterialSource.update(body.materialSourceId, {
          processing_status: "failed",
          error_message: error?.message || "Material processing failed",
        });
      }
    } catch {}
    return Response.json({ error: error?.message || "Material processing failed" }, { status: 500 });
  }
});