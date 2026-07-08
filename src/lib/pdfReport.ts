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
function buildReportHtml(opts: { rangeLabel: string; summaryText: string; rows: ReportRow[]; periodLabel?: string }) {
  const { rangeLabel, summaryText, rows, periodLabel = "Date" } = opts;
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

  // Trend chart - lives HERE, in the report, by design. The in-app History
  // screen deliberately shows no chart or trend language (see
  // HistoryScreen.tsx); the person sees this only when they explicitly
  // download the report and choose to look. Needs >= 3 points, same
  // reasoning as MIN_POINTS_FOR_TREND on the History screen.
  const chartSvg = rows.length >= 3 ? buildChartSvg(rows) : "";

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1C2240; padding: 32px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .muted { color: #545D8A; font-size: 13px; margin-bottom: 24px; }
          .summary { background: #EDF0FA; border-radius: 12px; padding: 16px; font-size: 15px; line-height: 1.5; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #CDD4EE; }
          th { color: #545D8A; font-weight: 600; }
          .disclaimer { margin-top: 28px; font-size: 11px; color: #545D8A; line-height: 1.5; }
          .chart { margin: 0 0 24px; }
          .chart-title { color: #545D8A; font-size: 12px; margin-bottom: 6px; }
          .legend { display: flex; gap: 18px; font-size: 12px; color: #1C2240; margin-top: 4px; }
          .legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
          .legend-dates { display: flex; justify-content: space-between; font-size: 11px; color: #545D8A; margin-top: 4px; }
        </style>
      </head>
      <body>
        <h1>Quiet Signal check-in report</h1>
        <div class="muted">${rangeLabel} · generated ${generatedAt}</div>
        <div class="summary">${escapeHtml(summaryText)}</div>
        ${chartSvg}
        <table>
          <thead>
            <tr><th>${periodLabel}</th><th>Pain</th><th>Anxiety/PTSD</th><th>Energy</th><th>Note</th></tr>
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

// Simple inline-SVG line chart for the PDF. Print-safe flat colors on a
// white page; distinct dash patterns per line (not just color) so two
// metrics with identical scores don't hide each other, and so it stays
// readable if someone prints in greyscale.
function buildChartSvg(rows: ReportRow[]) {
  const w = 640;
  const h = 160;
  const pad = 8;
  const n = rows.length;
  const toPoints = (key: "pain_score" | "anxiety_score" | "energy_score") =>
    rows
      .map((r, i) => {
        const x = pad + (i / Math.max(n - 1, 1)) * (w - pad * 2);
        const y = pad + (1 - r[key] / 4) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return `
    <div class="chart">
      <div class="chart-title">Trend over this period (top = higher score, 0-4 scale)</div>
      <svg width="${w}" height="${h + 14}" viewBox="0 0 ${w} ${h + 14}" xmlns="http://www.w3.org/2000/svg">
        <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" stroke="#CDD4EE" stroke-width="1" />
        <polyline points="${toPoints("pain_score")}" fill="none" stroke="#B3413A" stroke-width="2" />
        <polyline points="${toPoints("anxiety_score")}" fill="none" stroke="#3E4C8F" stroke-width="2" stroke-dasharray="6,4" />
        <polyline points="${toPoints("energy_score")}" fill="none" stroke="#2F6B55" stroke-width="2" stroke-dasharray="1,4" stroke-linecap="round" />
      </svg>
      <div class="legend">
        <span><span class="dot" style="background:#B3413A"></span>Pain (solid)</span>
        <span><span class="dot" style="background:#3E4C8F"></span>Anxiety/PTSD (dashed)</span>
        <span><span class="dot" style="background:#2F6B55"></span>Energy (dotted)</span>
      </div>
      <div class="legend-dates"><span>${escapeHtml(rows[0].date)}</span><span>${escapeHtml(rows[rows.length - 1].date)}</span></div>
    </div>`;
}

// Generates the PDF locally on-device (no server round trip - the same data
// already synced to the phone) and hands it to the OS share sheet, so
// "share with whoever you want" covers email, Files, WhatsApp, AirDrop,
// printing, or just saving it - whatever the person already has installed.
export async function downloadCheckinPdfReport(opts: { rangeLabel: string; summaryText: string; rows: ReportRow[]; periodLabel?: string }) {
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
