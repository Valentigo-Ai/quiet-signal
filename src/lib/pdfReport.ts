import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { PAIN_LABELS, ANXIETY_LABELS, PTSD_LABELS, ENERGY_LABELS } from "@/constants/scaleLabels";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-07-29" -> "29 Jul". The report previously printed raw ISO dates in
// the chart and table while the prose summary above them said "29 July" -
// two date formats on one page, and the machine-readable one given the most
// space. Plain English everywhere, short form so the table column stays narrow.
function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

// Whole days since the epoch. Used to place points along the x-axis by when
// they actually happened rather than by their position in the array - see
// buildChartSvg.
function toDayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export type ReportRow = {
  // Shown in the table. For daily rows this is an ISO date; for the 60/90-day
  // weekly rollup it's a human range like "1 Jul – 7 Jul", which is why the
  // chart must not try to parse it - see isoDate.
  date: string;
  // Optional machine-readable anchor used ONLY for placing this row on the
  // chart's time axis. Supplied by the weekly rollup, where `date` is a range
  // label. Absent for daily rows, where `date` is already ISO.
  isoDate?: string;
  pain_score: number;
  anxiety_score: number;
  // null for rows/periods with no PTSD data - most users, since it's only
  // ever collected from people who told us PTSD applies to them (see
  // CheckInScreen.tsx). The PTSD column/line only render at all if at
  // least one row in the export has a value.
  ptsd_score: number | null;
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

  // The PTSD column only appears at all if at least one row in this export
  // has it - most exports won't, since it's an optional dimension (see
  // ReportRow) - rather than showing an all-blank column every time.
  const hasPtsd = rows.some((r) => r.ptsd_score !== null);

  // Scores read as the words the person actually tapped, not "2 / 4".
  // scaleLabels.ts exists precisely for this - its own header names the PDF
  // export as a consumer - but this table was still printing raw numbers,
  // so the prose summary said "Medium" directly above a grid saying "2 / 4".
  // Numbers also quietly invite the reader to average or compare them, which
  // is exactly the reading a self-reported 0-4 tap-scale doesn't support.
  const tableRows = rows
    .map(
      (r) => `
        <tr>
          <td class="date">${escapeHtml(formatShortDate(r.date))}</td>
          <td class="score">${escapeHtml(PAIN_LABELS[r.pain_score] ?? "–")}</td>
          <td class="score">${escapeHtml(ANXIETY_LABELS[r.anxiety_score] ?? "–")}</td>
          ${hasPtsd ? `<td class="score">${r.ptsd_score !== null ? escapeHtml(PTSD_LABELS[r.ptsd_score] ?? "–") : "–"}</td>` : ""}
          <td class="score">${escapeHtml(ENERGY_LABELS[r.energy_score] ?? "–")}</td>
          <td class="note">${r.note ? escapeHtml(r.note) : ""}</td>
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
          /* An explicit page box plus a border-box body: without these the
             32px body padding sat on top of the print engine's own default
             margin, and everything below was laid out against a page wider
             than the one actually printed - which is what pushed the chart's
             right-hand date label and the Note column off the edge. */
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          /* Small padding rather than none: Android's WebView print adapter
             applies its own page margin and may ignore @page entirely, so this
             degrades to "printer margin + 8px" instead of text flush to the
             trimmed edge. The old 32px was what stacked on top of that margin. */
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1C2240; padding: 8px; margin: 0; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .muted { color: #545D8A; font-size: 13px; margin-bottom: 24px; }
          /* white-space: pre-line is load-bearing. summaryText arrives as
             several lines joined with \n (title, body, blank, footer - see
             buildShareSummary), which is right for the share sheet but HTML
             collapses newlines into spaces, so in the PDF the title ran
             straight into the body: "...summary - last 7 days Checked in 3 of
             the last 7 days...". This restores the structure the text already
             has without needing <br> tags, which escapeHtml would eat anyway. */
          .summary { background: #EDF0FA; border-radius: 12px; padding: 16px; font-size: 15px; line-height: 1.5; margin-bottom: 24px; white-space: pre-line; }
          /* table-layout: fixed so the Note column can't widen the table past
             the page to fit a long entry on one line (auto layout did exactly
             that, clipping the note instead of wrapping it). */
          table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 13px; }
          th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #CDD4EE; vertical-align: top; }
          th { color: #545D8A; font-weight: 600; }
          /* Scores are words now, not "4 / 4", and some are long ("A little on
             edge" is 16 characters). They MUST be allowed to wrap at their
             spaces - nowrap here would push the table past the page the same
             way an unwrapped note used to. Hyphenless break-word rather than
             anywhere, so a label breaks between words and never mid-word. */
          .score { overflow-wrap: break-word; }
          .date { white-space: normal; overflow-wrap: break-word; }
          .note { word-wrap: break-word; overflow-wrap: anywhere; }
          .disclaimer { margin-top: 28px; font-size: 11px; color: #545D8A; line-height: 1.5; }
          .chart { margin: 0 0 24px; }
          /* Scale the fixed-geometry SVG down to whatever the page actually
             is, rather than emitting it at its natural 640px and letting it
             hang off the right edge. */
          .chart svg { width: 100%; height: auto; display: block; }
          .chart-title { color: #545D8A; font-size: 12px; margin-bottom: 6px; }
          .legend { display: flex; gap: 18px; font-size: 12px; color: #1C2240; margin-top: 6px; flex-wrap: wrap; }
          /* Legend swatches mirror the marker SHAPE used in the chart, not
             just its colour. Four dash patterns proved indistinguishable at
             print size, and worse where two metrics share a score - which on
             real data happens constantly. Shape reads at a glance and survives
             a greyscale printer. */
          .legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
          .legend .dot-square { border-radius: 0; }
          .legend .dot-diamond { border-radius: 0; transform: rotate(45deg); }
          /* Drawn with borders because a CSS triangle needs no extra element. */
          .legend .dot-triangle {
            width: 0; height: 0; background: none !important; border-radius: 0;
            border-left: 5px solid transparent; border-right: 5px solid transparent;
            border-bottom: 9px solid currentColor;
          }
          /* A dimension that has data but not enough of it to plot - muted so
             it reads as "not yet" rather than as a line you've failed to find. */
          .legend .pending { color: #545D8A; }
          .chart-note { font-size: 10px; color: #545D8A; margin-top: 6px; }
        </style>
      </head>
      <body>
        <h1>Quiet Signal check-in report</h1>
        <div class="muted">${rangeLabel} · generated ${generatedAt}</div>
        <div class="summary">${escapeHtml(summaryText)}</div>
        ${chartSvg}
        <table>
          <!-- Rebalanced when scores became words. The two widest labels are
               "A little on edge" (Anxiety) and "A little on alert" (PTSD), so
               those columns get the most room of the four; Pain and Energy top
               out at "Severe" and "Very low". The Note column gives up the
               difference - it wraps freely and is the most forgiving. -->
          <colgroup>
            <col style="width:${hasPtsd ? "10%" : "11%"}" />
            <col style="width:${hasPtsd ? "12%" : "14%"}" />
            <col style="width:${hasPtsd ? "17%" : "19%"}" />
            ${hasPtsd ? `<col style="width:17%" />` : ""}
            <col style="width:${hasPtsd ? "12%" : "14%"}" />
            <col style="width:${hasPtsd ? "32%" : "42%"}" />
          </colgroup>
          <thead>
            <tr><th>${periodLabel}</th><th>Pain</th><th>Anxiety</th>${hasPtsd ? "<th>PTSD</th>" : ""}<th>Energy</th><th>Note</th></tr>
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
// Small-multiples chart for the PDF. Four metrics on a five-point scale, with
// real day-to-day swing, cannot share one plot: at print size the lines cross
// constantly and sit on top of each other wherever two scores match, which on
// real data is most days. An earlier version of this used four dash patterns
// and four marker shapes to try to separate them and it was still unreadable -
// the problem isn't telling the lines apart, it's four lines in one space.
//
// So each metric gets its own strip, stacked, sharing one date axis. Every
// strip holds a single line, which needs no legend and no dash pattern to be
// legible, and comparing metrics becomes a vertical scan down the same date.
function buildChartSvg(rows: ReportRow[]) {
  const w = 640;
  const left = 74;          // gutter for the metric name
  // Right gutter carries the WORDS for each strip's top and bottom, so nobody
  // has to be told separately what "high" means. Without it a reader has to
  // hold "higher = harder, including for energy" in their head across four
  // strips; with it, the Pain strip simply says Severe at the top and None at
  // the bottom, and there is nothing left to explain or misremember.
  const right = 78;
  const plotW = w - left - right;
  const stripH = 46;        // plot height of one metric
  const stripGap = 12;
  const top = 8;
  const axisH = 22;

  // x is placed by WHEN a check-in happened, not by its index in the array.
  // Spacing points evenly drew a five-day gap exactly as wide as a one-day
  // gap - the line implied a continuous run of days that never happened, in a
  // chart whose entire job is showing change over time.
  // Weekly rollup rows carry isoDate; daily rows have an ISO `date` already.
  const anchorOf = (r: ReportRow) => r.isoDate ?? r.date;
  const dayNumbers = rows.map((r) => toDayNumber(anchorOf(r)));

  // If ANY row's anchor won't parse, fall back to even index spacing rather
  // than piling every point onto x=0. The weekly rollup supplies isoDate, but
  // a future caller passing only a label shouldn't be able to silently
  // produce a chart that's a single vertical line.
  const datesUsable = dayNumbers.every((d) => Number.isFinite(d) && d > 0);
  const firstDay = dayNumbers[0];
  const lastDay = dayNumbers[dayNumbers.length - 1];
  const span = Math.max(lastDay - firstDay, 1);
  const xAt = (i: number) =>
    datesUsable
      ? left + ((dayNumbers[i] - firstDay) / span) * plotW
      : left + (i / Math.max(rows.length - 1, 1)) * plotW;

  // A run of consecutive-ish entries gets a connecting line; a longer gap
  // breaks it. Drawing straight through a fortnight of silence invents data
  // the person never gave us. The tolerance has to match this call's actual
  // cadence: weekly-rollup rows (60/90-day reports, see ReportRow.isoDate)
  // are 7 days apart even when every single week has data, so a threshold
  // tuned for daily rows broke every segment and drew nothing but dots. Each
  // cadence gets just enough slack to survive one missed day/week without
  // shattering the line, same reasoning either way.
  const isWeeklyRollup = rows.some((r) => r.isoDate !== undefined);
  const MAX_GAP_DAYS = isWeeklyRollup ? 10 : 2;

  type Key = "pain_score" | "anxiety_score" | "ptsd_score" | "energy_score";
  type Pt = { score: number; day: number; i: number };

  const pointsFor = (key: Key): Pt[] =>
    rows
      .map((r, i) => ({ score: r[key], day: dayNumbers[i], i }))
      // ptsd_score is null for most rows - plotting those as 0 would invent a
      // "Steady" reading nobody gave.
      .filter((p): p is Pt => p.score !== null);

  const segmentsFor = (key: Key) => {
    const runs: Pt[][] = [];
    let run: Pt[] = [];
    for (const p of pointsFor(key)) {
      const prev = run[run.length - 1];
      if (prev && datesUsable && p.day - prev.day > MAX_GAP_DAYS) {
        runs.push(run);
        run = [];
      }
      run.push(p);
    }
    if (run.length) runs.push(run);
    return runs;
  };

  const ptsdPointCount = pointsFor("ptsd_score").length;

  // Only strips with something to show. PTSD is omitted entirely rather than
  // drawn empty for the many people who don't track it.
  // high/low are the person's own words for each end of that scale, straight
  // from scaleLabels - the same strings they tapped on the check-in screen.
  const metrics: { key: Key; label: string; colour: string; high: string; low: string }[] = [
    { key: "pain_score", label: "Pain", colour: "#B3413A", high: PAIN_LABELS[4], low: PAIN_LABELS[0] },
    { key: "anxiety_score", label: "Anxiety", colour: "#3E4C8F", high: ANXIETY_LABELS[4], low: ANXIETY_LABELS[0] },
    ...(ptsdPointCount > 0
      ? [{ key: "ptsd_score" as Key, label: "PTSD", colour: "#7A4FBF", high: PTSD_LABELS[4], low: PTSD_LABELS[0] }]
      : []),
    { key: "energy_score", label: "Energy", colour: "#2F6B55", high: ENERGY_LABELS[4], low: ENERGY_LABELS[0] },
  ];

  const h = top + metrics.length * stripH + (metrics.length - 1) * stripGap + axisH;

  const strips = metrics
    .map((m, idx) => {
      const sTop = top + idx * (stripH + stripGap);
      const sBottom = sTop + stripH;
      const y = (score: number) => sTop + (1 - score / 4) * stripH;

      // A faint band behind each strip so the four read as separate panels
      // rather than one tall grid, plus a midline for judging height.
      const band = `<rect x="${left}" y="${sTop}" width="${plotW}" height="${stripH}" fill="#F7F8FD" />`;
      const mid = `<line x1="${left}" y1="${y(2).toFixed(1)}" x2="${left + plotW}" y2="${y(2).toFixed(1)}" stroke="#E4E8F6" stroke-width="1" />`;

      const lines = segmentsFor(m.key)
        .filter((run) => run.length >= 2)
        .map(
          (run) =>
            `<polyline points="${run.map((p) => `${xAt(p.i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ")}" fill="none" stroke="${m.colour}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" />`
        )
        .join("");

      // Markers stay: they mark the actual check-ins, so a lone entry with no
      // neighbour within two days still appears instead of vanishing.
      const dots = pointsFor(m.key)
        .map((p) => `<circle cx="${xAt(p.i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="2.4" fill="${m.colour}" />`)
        .join("");

      const name = `<text x="${left - 10}" y="${(sTop + stripH / 2 + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="#1C2240">${escapeHtml(m.label)}</text>`;

      // The two ends of this strip, in the person's own words. Placed just
      // inside the top and bottom edges so each aligns with the level it
      // describes rather than floating between strips.
      const ends =
        `<text x="${left + plotW + 8}" y="${(sTop + 8).toFixed(1)}" font-size="9" fill="#8A92B8">${escapeHtml(m.high)}</text>` +
        `<text x="${left + plotW + 8}" y="${(sBottom - 1).toFixed(1)}" font-size="9" fill="#8A92B8">${escapeHtml(m.low)}</text>`;

      return band + mid + lines + dots + name + ends;
    })
    .join("");

  // Shared date axis, drawn once beneath the stack. The old chart carried
  // exactly two labels - first and last - so no point between them could be
  // located in time at all.
  const axisY = top + metrics.length * stripH + (metrics.length - 1) * stripGap;
  const ticks: string[] = [`<line x1="${left}" y1="${axisY}" x2="${left + plotW}" y2="${axisY}" stroke="#CDD4EE" stroke-width="1" />`];
  if (datesUsable) {
    // Skip a periodic tick that would sit too close to the always-drawn end
    // label, measured in actual plotted pixels rather than days - the same
    // 7-day tick step covers very different pixel distances depending on the
    // report's total span (41px for a 90-day chart vs 118px for a 30-day
    // one), so a fixed day count only happened to work for the spans it was
    // tested against. 48px is roughly half the end label's width plus half
    // this tick's, the minimum gap before the two touch.
    const minTickGapPx = 48;
    for (let day = firstDay; day <= lastDay; day += 7) {
      const distFromEndPx = ((lastDay - day) / span) * plotW;
      if (distFromEndPx < minTickGapPx) continue;
      const iso = new Date(day * 86400000).toISOString().slice(0, 10);
      const x = left + ((day - firstDay) / span) * plotW;
      ticks.push(
        `<line x1="${x.toFixed(1)}" y1="${axisY}" x2="${x.toFixed(1)}" y2="${axisY + 4}" stroke="#CDD4EE" stroke-width="1" />` +
          `<text x="${x.toFixed(1)}" y="${axisY + 16}" text-anchor="middle" font-size="10" fill="#545D8A">${escapeHtml(formatShortDate(iso))}</text>`
      );
    }
    ticks.push(
      `<text x="${left + plotW}" y="${axisY + 16}" text-anchor="end" font-size="10" fill="#545D8A">${escapeHtml(formatShortDate(anchorOf(rows[rows.length - 1])))}</text>`
    );
  } else {
    ticks.push(
      `<text x="${left}" y="${axisY + 16}" text-anchor="start" font-size="10" fill="#545D8A">${escapeHtml(rows[0].date)}</text>` +
        `<text x="${left + plotW}" y="${axisY + 16}" text-anchor="end" font-size="10" fill="#545D8A">${escapeHtml(rows[rows.length - 1].date)}</text>`
    );
  }

  const n = rows.length;
  return `
    <div class="chart">
      <div class="chart-title">Each of your check-ins over time. The words on the right show what the top and bottom of each strip mean.</div>
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        ${strips}
        ${ticks.join("")}
      </svg>
      <div class="chart-note">${n} check-in${n === 1 ? "" : "s"} shown. A gap means no check-in was logged; the line only joins entries within a couple of days of each other.${ptsdPointCount === 1 ? " PTSD shows a single point &ndash; a line needs at least two." : ""}</div>
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
