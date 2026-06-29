import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SPREADSHEET_ID = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID");
const SHEET_NAME = "Quiz Results";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both direct call with result data and entity automation payload
    const result = body.data || body;

    if (!result.student_name) {
      return Response.json({ error: "No quiz result data provided" }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Ensure header row exists by checking the sheet first
    const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME + "!A1:F1")}`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const checkData = await checkRes.json();

    // If no data in header row, write headers first
    if (!checkData.values || checkData.values.length === 0) {
      const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME + "!A1")}:append?valueInputOption=USER_ENTERED`;
      await fetch(headerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          values: [["Date", "Student Name", "Phone / Email", "Unit", "Score", "Total Questions"]]
        })
      });
    }

    // Append the quiz result row
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}:append?valueInputOption=USER_ENTERED`;
    const appendRes = await fetch(appendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [[
          result.date || new Date().toISOString().slice(0, 10),
          result.student_name || "",
          result.student_phone || "",
          result.unit_name || "",
          result.score ?? "",
          result.total_questions ?? 30
        ]]
      })
    });

    const appendData = await appendRes.json();

    if (appendData.error) {
      return Response.json({ error: appendData.error.message }, { status: 500 });
    }

    return Response.json({ success: true, updatedRange: appendData.updates?.updatedRange });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});