import { mkdir, readdir, copyFile } from 'node:fs/promises';
await mkdir('public/ocr/core',{recursive:true});
await mkdir('public/ocr/lang',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const name of await readdir('node_modules/tesseract.js-core')) {
 if(name.endsWith('.wasm.js')||name.endsWith('.wasm'))await copyFile('node_modules/tesseract.js-core/'+name,'public/ocr/core/'+name);
}
await copyFile('node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz','public/ocr/lang/eng.traineddata.gz');

await copyFile('node_modules/tesseract.js/LICENSE.md','public/ocr/LICENSE-tesseract.txt');
await copyFile('node_modules/tesseract.js-core/LICENSE','public/ocr/LICENSE-core.txt');
