import type { Corredino } from './corredino';
import type { Lang } from '../i18n';

/** Lista del corredino in PDF, stampabile: una sezione per taglia, una riga per capo con casella. */
export async function exportCorredinoPdf(c: Corredino, lang: Lang, basis: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const it = lang === 'it';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  // The standard PDF fonts cover Latin-1 only: arrows and ticks become plain text.
  const clean = (s: string) => s.replace(/→/g, '-').replace(/[–—]/g, '-');
  let y = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 57, 92);
  doc.text('NasciTara', 18, y);
  doc.setTextColor(51, 51, 51);
  doc.setFontSize(14);
  doc.text(it ? `Corredino 0-3 mesi · ${c.have} di ${c.total} capi pronti` : `Layette 0-3 months · ${c.have} of ${c.total} items ready`, 18, (y += 10));
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(clean(`${c.seasonHeadline} · ${basis}`), 18, (y += 7));
  doc.text(doc.splitTextToSize(clean(c.advice), 174), 18, (y += 6));
  y += 6;
  for (const group of [...c.columns, c.accessories]) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(clean(`${group.title} · ${group.infoTop.toLowerCase()} · ${group.have}/${group.total}`), 18, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(118, 118, 118);
    doc.text(clean(group.infoSub), 18, (y += 5));
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(11);
    for (const item of group.items) {
      y += 7;
      doc.rect(18, y - 3.6, 4, 4);
      if (item.have >= item.qty) doc.text('x', 19, y - 0.2);
      doc.text(clean(`${item.have}/${item.qty}  ${item.name}`), 26, y);
      doc.setTextColor(118, 118, 118);
      doc.text(clean(item.material), 110, y);
      doc.setTextColor(51, 51, 51);
    }
  }
  doc.setFontSize(8);
  doc.setTextColor(118, 118, 118);
  doc.text(it ? 'Indicazioni generali: adatta quantità e tessuti al clima di casa e ai consigli del pediatra.' : 'General guidance: adapt quantities and fabrics to your home climate and your paediatrician’s advice.', 18, 287);
  await doc.save(it ? 'NasciTara-corredino.pdf' : 'NasciTara-layette.pdf', { returnPromise: true });
}
