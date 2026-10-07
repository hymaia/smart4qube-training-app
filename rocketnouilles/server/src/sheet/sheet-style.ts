export const SHEET_CSS = `
  :root { color-scheme: light; }
  body { margin: 0; background: #f4ede4; color: #1f1a17; font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .sheet { max-width: 820px; margin: 24px auto; background: #fff; padding: 32px 40px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  .sheet.preview { outline: 3px dashed #d98b2b; }
  header h1 { margin: 0; font-size: 28px; color: #b3261e; }
  header h2 { margin: 12px 0 0; font-size: 20px; }
  header p { margin: 2px 0; }
  .code { font: 600 12px ui-monospace, monospace; background: #f1e4d3; padding: 2px 6px; border-radius: 4px; vertical-align: middle; }
  .status { color: #5b4d43; }
  h3 { border-bottom: 2px solid #1f1a17; padding-bottom: 4px; margin-top: 28px; }
  h4 { margin: 18px 0 4px; font-size: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #eadfd2; vertical-align: top; }
  .qty { width: 3em; font-weight: 700; white-space: nowrap; }
  .num { text-align: right; white-space: nowrap; }
  .zh { color: #7a6a5e; margin-left: 4px; }
  .muted { color: #7a6a5e; font-size: 13px; }
  .discount td { color: #2e7d32; }
  .total td { font-weight: 700; border-bottom: 2px solid #1f1a17; }
  .kitchen table td { font-size: 17px; }
  .grand-total { font-size: 18px; text-align: right; margin-top: 16px; }
  footer { margin-top: 32px; font-size: 12px; color: #7a6a5e; text-align: center; }
  @media print {
    body { background: #fff; font-size: 12pt; }
    .sheet { box-shadow: none; margin: 0; max-width: none; padding: 0; border-radius: 0; outline: none; }
    .participant { break-inside: avoid; }
    .kitchen { break-after: page; }
    footer { display: none; }
  }
`;
