export interface PrintTableReportOptions {
  title: string;
  subtitle?: string;
  schoolName: string;
  schoolId?: string;
  address?: string;
  preparedBy?: string;
  headers: string[];
  rows: string[][];
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printTableReportToPdf({
  title,
  subtitle,
  schoolName,
  schoolId,
  address,
  preparedBy,
  headers,
  rows,
}: PrintTableReportOptions): void {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = subtitle ? escapeHtml(subtitle) : '';
  const safeSchoolName = escapeHtml(schoolName);
  const safeSchoolId = schoolId ? escapeHtml(schoolId) : '';
  const safeAddress = address ? escapeHtml(address) : '';
  const safePreparedBy = preparedBy ? escapeHtml(preparedBy) : 'Instructional Supervisor';
  const generatedDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const theadHtml = headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join('');

  const tbodyHtml =
    rows.length === 0
      ? `<tr><td colspan="${Math.max(headers.length, 1)}" style="text-align:center;padding:18px;color:#64748b;font-style:italic;">No records match the current scope and filters.</td></tr>`
      : rows
          .map(
            (cols) =>
              `<tr>${cols
                .map((cell) => `<td>${escapeHtml(cell).replace(/\n/g, '<br/>')}</td>`)
                .join('')}</tr>`
          )
          .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @page { size: landscape; margin: 1cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 14px; font-size: 11px; }
    .hdr { text-align: center; border-bottom: 2px solid #701628; padding-bottom: 10px; margin-bottom: 12px; }
    .hdr h4 { margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1.4px; color: #475569; }
    .hdr h3 { margin: 2px 0; font-size: 12px; text-transform: uppercase; color: #1e293b; }
    .hdr h2 { margin: 4px 0; font-size: 16px; color: #701628; font-weight: 800; text-transform: uppercase; }
    .hdr p { margin: 2px 0; font-size: 10px; color: #64748b; }
    .banner { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; padding: 5px 10px; margin-top: 8px; font-weight: 700; font-size: 11px; color: #701628; text-transform: uppercase; }
    .meta { display: flex; justify-content: space-between; font-size: 10px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; text-align: left; }
    th { background: #f1f5f9; text-transform: uppercase; font-size: 9.5px; color: #334155; }
    tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <div class="hdr">
    <h4>Republic of the Philippines</h4>
    <h3>Department of Education · Caraga Region XIII</h3>
    <h2>${safeSchoolName}</h2>
    <p>${safeSchoolId ? `School ID: ${safeSchoolId} · ` : ''}${safeAddress}</p>
    <div class="banner">${safeTitle}${safeSubtitle ? ` · ${safeSubtitle}` : ''}</div>
  </div>
  <div class="meta">
    <div><strong>Prepared by:</strong> ${safePreparedBy}</div>
    <div><strong>Date Generated:</strong> ${generatedDate}</div>
    <div><strong>Records Exported:</strong> ${rows.length}</div>
  </div>
  <table>
    <thead><tr>${theadHtml}</tr></thead>
    <tbody>${tbodyHtml}</tbody>
  </table>
</body>
</html>`;

  const existingIframe = document.getElementById('omes-table-print-iframe');
  if (existingIframe) existingIframe.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'omes-table-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);
  }
}
