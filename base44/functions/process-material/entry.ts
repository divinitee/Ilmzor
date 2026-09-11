import { createClientFromRequest } from "npm:@base44/sdk";
import * as pdfjsLib from "npm:pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "npm:mammoth";

const MAX_TOTAL_CHARS = 400000;
const CHUNK_SIZE = 35000;
const MAX_CHUNKS = 12;

async function extractPdf(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error("Could not download PDF");
  const data = new Uint8Array(await response.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const pages = [];
  let total = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      const entry = "[PAGE " + pageNumber + "]\n" + text;
      if (total + entry.length > MAX_TOTAL_CHARS) break;
      pages.push(entry);
      total += entry.length;
    }
  }

  return { text: pages.join("\n\n"), pageCount: pdf.numPages, extractedPages: pages.length };
}

async function extractDocx(fileUrl) {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error("Could not download DOCX");
  const buffer = await response.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return { text: result.value.slice(0, MAX_TOTAL_CHARS) };
}

function splitIntoChunks(text) {
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(CHUNK_SIZE, remaining.length);
    const boundary = Math.max(
      remaining.lastIndexOf("[PAGE ", end),
      remaining.lastIndexOf("\n\n", end),
      remaining.lastIndexOf("\n", end),
    );
    if (boundary > CHUNK_SIZE * 0.5) end = boundary;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  return chunks.filter(Boolean);
}

async function analyzeChunk(base44, title, chunk, chunkIndex, chunkCount) {
  return await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: [
      "You are VIRORA's material ingestion engine for English teachers.",
      "Analyze this portion of uploaded teaching material.",
      "Do not invent content that is absent.",
      "Return JSON matching the schema.",
      "Identify useful teacher-selectable units, chapters, sections, lessons, exercises, or page ranges.",
      "Preserve page references such as [PAGE 12] whenever present.",
      "Chunk " + chunkIndex + " of " + chunkCount + ".",
      "",
      "SOURCE TITLE: " + title,
      "SOURCE:",
      chunk,
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
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let materialSourceId = null;

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    materialSourceId = body.materialSourceId;
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

    let extraction = { text: (material.source_text || material.extracted_text || "").trim() };

    if (!extraction.text && material.file_url) {
      if (material.source_type === "pdf") {
        extraction = await extractPdf(material.file_url);
      } else if (material.source_type === "docx") {
        extraction = await extractDocx(material.file_url);
      } else if (material.source_type === "image") {
        throw new Error("Image OCR is not enabled yet.");
      }
    }

    const source = (extraction.text || "").trim();
    if (!source) throw new Error("No readable text was found in this material.");

    const chunks = splitIntoChunks(source);
    const analyses = [];
    for (let i = 0; i < chunks.length; i++) {
      analyses.push(await analyzeChunk(base44, material.title, chunks[i], i + 1, chunks.length));
    }

    const allSegments = analyses.flatMap((analysis) =>
      Array.isArray(analysis?.segments) ? analysis.segments : []
    ).slice(0, 150);

    const existing = await base44.asServiceRole.entities.MaterialSegment.filter(
      { material_source_id: material.id },
      "-created_date",
      200,
    );
    for (const segment of existing) {
      await base44.asServiceRole.entities.MaterialSegment.delete(segment.id);
    }

    for (let i = 0; i < allSegments.length; i++) {
      const s = allSegments[i] || {};
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
        content_text: (s.content_text || "").slice(0, 30000),
      });
    }

    const combinedSummary = analyses
      .map((a) => a?.summary)
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 12000);

    await base44.asServiceRole.entities.MaterialSource.update(material.id, {
      extracted_text: source,
      detected_language: analyses.find((a) => a?.detected_language)?.detected_language || "",
      summary: combinedSummary,
      structure: {
        segment_count: allSegments.length,
        source_characters: source.length,
        chunk_count: chunks.length,
        page_count: extraction.pageCount || null,
        extracted_pages: extraction.extractedPages || null,
      },
      processing_status: "ready",
      error_message: null,
      processed_at: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      segmentCount: allSegments.length,
      extractedCharacters: source.length,
      chunks: chunks.length,
      pageCount: extraction.pageCount || null,
    });
  } catch (error) {
    console.error(error);
    if (materialSourceId) {
      try {
        await base44.asServiceRole.entities.MaterialSource.update(materialSourceId, {
          processing_status: "failed",
          error_message: error?.message || "Material processing failed",
        });
      } catch {}
    }
    return Response.json({ error: error?.message || "Material processing failed" }, { status: 500 });
  }
});