let sessionStartTime = Date.now();

export function initAnalyticsTracker() {
  sessionStartTime = Date.now();

  setInterval(() => {
    const secondsOnSite = Math.round((Date.now() - sessionStartTime) / 1000);
    localStorage.setItem("examhub_time_on_site", secondsOnSite);
  }, 10000);
}

export function getTimeOnSiteSeconds() {
  return Math.round((Date.now() - sessionStartTime) / 1000);
}

export function downloadCSV(filename, csvData) {
  const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadExcel(filename, rows, headers) {
  let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Report">
  <Table>
   <Row>`;

  headers.forEach((h) => {
    xml += `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`;
  });
  xml += `</Row>`;

  rows.forEach((r) => {
    xml += `<Row>`;
    r.forEach((val) => {
      xml += `<Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`;
    });
    xml += `</Row>`;
  });

  xml += `</Table></Worksheet></Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeXml(str) {
  return String(str || "").replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
    }
  });
}
