import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export type ReportRow = {
  date: string;
  pain_score: number;
  anxiety_score: number;
  energy_score: number;
  note: string | null;
};

// Doctor-ready export (Section: Pro tier), deliberately reframed as a
// general "download a PDF report" rather than "for your GP/therapist."
// The content is unchanged from what was already promised in the Upgrade
// copy - the user's own self-reported numbers, in the same plain language
// already shown on-screen - but naming it for a specific clinical audience
// invited more scrutiny than the feature itself warrants. A PDF someone can
// hand to anyone they choose (a doctor, a partner, themselves) is the same
// low-risk personal-diary export either way; this only changes the label.
function buildReportHtml(opts: { rangeLabel: string; summaryText: string; rows: ReportRow[] }) {
  const { rangeLabel, summaryText, rows } = opts;
  const generatedAt = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const tableRows = rows
    .map(
      (r) => `
        <tr>
          <td>${r.date}</td>
          <td>${r.pain_score} / 4</td>
          <td>${r.anxiety_score} / 4</td>
          <td>${r.energy_score} / 4</td>
          <td>${r.note ? escapeHtml(r.note) : ""}</td>
        </tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #2B2622; padding: 32px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .muted { color: #6B6259; font-size: 13px; margin-bottom: 24px; }
          .summary { background: #F6F1EB; border-radius: 12px; padding: 16px; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E3D8CC; }
          th { color: #6B6259; font-weight: 600; }
          .disclaimer { margin-top: 28px; font-size: 11px; color: #6B6259; line-height: 1.5; }
        </style>
      </head>
      <body>
        <h1>Quiet Signal check-in report</h1>
        <div class="muted">${rangeLabel} · generated ${generatedAt}</div>
        <div class="summary">${escapeHtml(summaryText)}</div>
        <table>
          <thead>
            <tr><th>Date</th><th>Pain</th><th>Anxiety</th><th>Energy</th><th>Note</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="disclaimer">
          This report reflects self-reported check-ins logged in Quiet Signal. Quiet Signal is not a
          medical device and does not diagnose, treat, or provide medical advice - it's a personal record
          you're free to share with anyone you choose.
        </div>
      </body>
    </html>`;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Generates the PDF locally on-device (no server round trip - the same data
// already synced to the phone) and hands it to the OS share sheet, so
// "share with whoever you want" covers email, Files, WhatsApp, AirDrop,
// printing, or just saving it - whatever the person already has installed.
export async function downloadCheckinPdfReport(opts: { rangeLabel: string; summaryText: string; rows: ReportRow[] }) {
  const html = buildReportHtml(opts);

  // expo-print's printToFileAsync (native PDF generation) isn't available
  // on web - there's no native PDF engine to call into. Instead this opens
  // the report in a new tab and triggers the browser's own print dialog,
  // where choosing "Save as PDF" produces the same result with no extra
  // library. Popup blockers can block window.open, hence the explicit
  // error rather than a silent no-op if it returns null.
  if (Platform.OS === "web") {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      throw new Error("Please allow pop-ups for this site, then try again.");
    }
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    // Give the new tab a moment to finish laying out before printing -
    // calling print() immediately can produce a blank page.
    setTimeout(() => reportWindow.print(), 300);
    return null;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Download your Quiet Signal report",
      UTI: "com.adobe.pdf",
    });
  }
  return uri;
}
