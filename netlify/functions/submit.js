const PDFDocument = require('pdfkit');
const { valid } = require('./_auth');

const GREEN = '#244C45';
const INK = '#18201F';
const MUTED = '#66706D';
const LINE = '#DFE3DF';
const CREAM = '#F6F5F1';
const RED = '#9A4B32';
const RED_BG = '#FFF1E9';
const YES_BG = '#E9F3ED';

const sections = [
  { title: 'First impressions', from: 0, to: 1 },
  { title: 'Bedrooms & linen', from: 2, to: 5 },
  { title: 'Bathrooms', from: 6, to: 9 },
  { title: 'Kitchen & dining', from: 10, to: 13 },
  { title: 'Living areas & finishing touches', from: 14, to: 16 },
  { title: 'Final walkthrough & sign-off', from: 17, to: 19 }
];

function wrapText(doc, value, x, y, width, opts = {}) {
  doc.text(value, x, y, { width, ...opts });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  if (!valid(event)) return { statusCode: 401, body: JSON.stringify({ error: 'Please sign in again' }) };

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid submission' }) }; }

  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(data.date || '') ||
      typeof data.completedBy !== 'string' || !data.completedBy.trim() || data.completedBy.length > 120 ||
      typeof data.issues !== 'string' || data.issues.length > 4000 ||
      !Array.isArray(data.answers) || data.answers.length !== 20 ||
      data.answers.some(a => !a || typeof a.question !== 'string' || a.question.length > 500 ||
        !['yes', 'attention'].includes(a.answer))) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Please complete all 20 checks' }) };
  }

  // Test-only: no email integration is implemented.
  const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true, autoFirstPage: true });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  const done = new Promise((resolve, reject) => { doc.on('end', resolve); doc.on('error', reject); });
  const W = doc.page.width;
  const H = doc.page.height;
  const M = 42;
  const CW = W - 2 * M;
  const BOTTOM = H - 66;
  let y = M;

  const text = (value, x, top, opts = {}) => doc.text(String(value), x, top, opts);
  const page = () => { doc.addPage(); y = M + 8; };
  const ensure = (height) => { if (y + height > BOTTOM) page(); };

  // PDFKit's drawing operations should not move the document cursor; explicit y controls all layout.
  const header = () => {
    doc.roundedRect(M, y, CW, 105, 13).fill(GREEN);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#D7E8E1');
    text('MCN CLEANING SOLUTIONS LTD', M + 19, y + 16, { characterSpacing: 1.3 });
    doc.font('Helvetica-Bold').fontSize(23).fillColor('#FFFFFF');
    text('ANGORFA', M + 19, y + 35);
    doc.font('Helvetica').fontSize(11).fillColor('#E2EEEA');
    text('Changeover Standards Check', M + 19, y + 68);
    y += 119;
    doc.roundedRect(M, y, CW, 27, 7).fill(CREAM);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN);
    text('TEST MODE  •  PDF DOWNLOAD ONLY  •  NOT EMAILED', M + 12, y + 8, { width: CW - 24 });
    y += 40;
  };

  header();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED);
  text('INSPECTION DATE', M, y);
  text('COMPLETED BY', M + 195, y);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(INK);
  text(data.date, M, y + 16);
  text(data.completedBy.trim(), M + 195, y + 16, { width: CW - 195 });
  y += 56;

  const flagged = data.answers.filter(a => a.answer === 'attention').length;
  const passed = 20 - flagged;
  doc.roundedRect(M, y, CW, 66, 12).fill(CREAM);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(MUTED);
  text('INSPECTION SUMMARY', M + 15, y + 11);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(GREEN);
  text(String(passed), M + 15, y + 29);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED);
  text('Passed', M + 43, y + 36);
  doc.font('Helvetica-Bold').fontSize(19).fillColor(flagged ? RED : GREEN);
  text(String(flagged), M + 176, y + 29);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED);
  text('Need attention', M + 205, y + 36);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(INK);
  text('20 checks', M + CW - 100, y + 35, { width: 85, align: 'right' });
  y += 84;

  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    ensure(75);
    doc.roundedRect(M, y, CW, 34, 9).fill(GREEN);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF');
    text(String(s + 1).padStart(2, '0') + '  ' + section.title, M + 13, y + 9, { width: CW - 26 });
    y += 42;

    for (let i = section.from; i <= section.to; i++) {
      const a = data.answers[i];
      doc.font('Helvetica').fontSize(10.3);
      const question = (i + 1) + '.  ' + a.question;
      const questionH = doc.heightOfString(question, { width: CW - 32, lineGap: 2 });
      const boxH = questionH + 42;
      ensure(boxH + 8);
      doc.roundedRect(M, y, CW, boxH, 9).fill('#FFFFFF');
      doc.roundedRect(M, y, CW, boxH, 9).strokeColor(LINE).lineWidth(0.8).stroke();
      doc.font('Helvetica').fontSize(10.3).fillColor(INK);
      wrapText(doc, question, M + 13, y + 11, CW - 26, { lineGap: 2 });
      const status = a.answer === 'yes' ? 'YES' : 'NEEDS ATTENTION';
      const pillW = a.answer === 'yes' ? 47 : 129;
      const pillY = y + 17 + questionH;
      doc.roundedRect(M + 13, pillY, pillW, 20, 7).fill(a.answer === 'yes' ? YES_BG : RED_BG);
      doc.font('Helvetica-Bold').fontSize(8.3).fillColor(a.answer === 'yes' ? GREEN : RED);
      text(status, M + 20, pillY + 5, { width: pillW - 14 });
      y += boxH + 8;
    }
    y += 10;
  }

  ensure(120);
  doc.roundedRect(M, y, CW, 34, 9).fill(GREEN);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF');
  text('Issues to report', M + 13, y + 9);
  y += 43;

  const issues = data.issues.trim();
  const issueText = issues || 'No additional written issues reported.';
  doc.font('Helvetica').fontSize(10.5);
  const noteH = Math.max(58, doc.heightOfString(issueText, { width: CW - 30, lineGap: 3 }) + 26);
  ensure(noteH + 55);
  doc.roundedRect(M, y, CW, noteH, 9).fill(CREAM);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK);
  wrapText(doc, issueText, M + 15, y + 13, CW - 30, { lineGap: 3 });
  y += noteH + 10;
  if (flagged) {
    doc.font('Helvetica').fontSize(9).fillColor(RED);
    const flagNote = flagged + ' check' + (flagged === 1 ? '' : 's') + ' marked Needs Attention. See highlighted answers above.';
    const flagH = doc.heightOfString(flagNote, { width: CW });
    ensure(flagH + 16);
    text(flagNote, M, y, { width: CW });
    y += flagH + 12;
  }

  ensure(58);
  doc.moveTo(M, y + 6).lineTo(M + CW, y + 6).strokeColor(LINE).stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK);
  text('Completed by: ' + data.completedBy.trim(), M, y + 17, { width: CW });
  y += 50;

  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);
    doc.moveTo(M, H - 51).lineTo(W - M, H - 51).strokeColor(LINE).lineWidth(0.7).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(MUTED);
    text('MCN Cleaning Solutions LTD  •  Angorfa Standards', M, H - 41, { width: CW - 70 });
    text('Page ' + (i + 1) + ' of ' + pages.count, W - M - 70, H - 41, { width: 70, align: 'right' });
  }

  doc.end();
  await done;
  return {
    statusCode: 200,
    isBase64Encoded: true,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="angorfa-check.pdf"',
      'Cache-Control': 'no-store'
    },
    body: Buffer.concat(chunks).toString('base64')
  };
};
