import { decodeReportFile, prepareReportFile } from './reportImageFile';
import { flattenBackground } from './ocrImage';

/**
 * Testo del foglio illustrativo di un integratore, letto sul dispositivo con lo stesso OCR dei referti.
 * La foto non viene mai caricata: al server arriva solo il testo, per leggerne la posologia.
 */
export async function readLeafletImage(input: File, signal: AbortSignal, progress: (n: number) => void): Promise<string> {
  const file = await prepareReportFile(input);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) throw new Error('unsupported');
  const bitmap = await decodeReportFile(file, signal);
  const canvas = document.createElement('canvas');
  // I fogli illustrativi hanno caratteri piccoli: lato lungo fino a 2600 px.
  const scale = Math.min(2, 2600 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    bitmap.close();
    throw new Error('canvas');
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap.source, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  flattenBackground(image);
  ctx.putImageData(image, 0, 0);
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang', cacheMethod: 'none',
    logger: (m) => { if (!signal.aborted && m.status === 'recognizing text') progress(Math.round(m.progress * 100)); },
    errorHandler: () => {},
  });
  const stop = () => void worker.terminate();
  signal.addEventListener('abort', stop, { once: true });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    const { data } = await worker.recognize(canvas);
    if (signal.aborted) throw new Error('cancelled');
    return data.text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  } finally {
    signal.removeEventListener('abort', stop);
    canvas.width = canvas.height = 0;
    await worker.terminate();
  }
}
