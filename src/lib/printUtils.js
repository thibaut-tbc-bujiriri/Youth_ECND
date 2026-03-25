function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function printTableReport({ title, subtitle = "", columns = [], rows = [], summary = [] }) {
  const printWindow = window.open("", "_blank", "width=1200,height=900");
  if (!printWindow) return;

  const nowLabel = new Date().toLocaleString("fr-FR");
  const safeTitle = escapeHtml(title || "Rapport");
  const safeSubtitle = escapeHtml(subtitle);

  const summaryHtml = summary.length
    ? `
      <div class="summary">
        ${summary
          .map(
            (item) =>
              `<div class="summary-item"><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</div>`,
          )
          .join("")}
      </div>
    `
    : "";

  const theadHtml = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const tbodyHtml = rows.length
    ? rows
        .map(
          (row) =>
            `<tr>${columns
              .map((column) => `<td>${escapeHtml(row[column.key] ?? "-")}</td>`)
              .join("")}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${Math.max(columns.length, 1)}">Aucune donnee disponible.</td></tr>`;

  const html = `
    <!doctype html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        <style>
          @page { size: A4 landscape; margin: 14mm; }
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            margin: 0;
            color: #0f172a;
            font-size: 12px;
            background: #fff;
          }
          .header { margin-bottom: 16px; }
          h1 { margin: 0; font-size: 20px; }
          .subtitle { margin-top: 4px; color: #334155; }
          .meta { margin-top: 4px; color: #64748b; font-size: 11px; }
          .summary { margin: 12px 0; display: flex; flex-wrap: wrap; gap: 10px; }
          .summary-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px 10px;
            background: #f8fafc;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
          }
          th {
            background: #e2e8f0;
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${safeTitle}</h1>
          ${safeSubtitle ? `<div class="subtitle">${safeSubtitle}</div>` : ""}
          <div class="meta">Imprime le: ${escapeHtml(nowLabel)}</div>
        </div>
        ${summaryHtml}
        <table>
          <thead>
            <tr>${theadHtml}</tr>
          </thead>
          <tbody>
            ${tbodyHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
