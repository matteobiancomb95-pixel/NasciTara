import { mkdir, readdir, copyFile } from 'node:fs/promises';
// Never ship private reports or test fixtures alongside public OCR runtime assets.
async function checkAssets(dir='public/ocr',prefix='') {
 let entries;try{entries=await readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}
 for(const entry of entries){
  const name=prefix+entry.name;
  if(entry.isDirectory()&&(name==='core'||name==='lang')){await checkAssets(dir+'/'+entry.name,name+'/');continue;}
  if(!entry.isFile()||!(/^(worker\.min\.js|LICENSE-(tesseract|core)\.txt|core\/[^/]+\.wasm(\.js)?|lang\/eng\.traineddata\.gz)$/.test(name)))
   throw new Error('Unexpected file in public/ocr. Move private fixtures outside public before building.');
 }
}
await checkAssets();
await mkdir('public/ocr/core',{recursive:true});
await mkdir('public/ocr/lang',{recursive:true});
await copyFile('node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js');
for(const name of await readdir('node_modules/tesseract.js-core')) {
 if(name.endsWith('.wasm.js')||name.endsWith('.wasm'))await copyFile('node_modules/tesseract.js-core/'+name,'public/ocr/core/'+name);
}
await copyFile('node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz','public/ocr/lang/eng.traineddata.gz');

await copyFile('node_modules/tesseract.js/LICENSE.md','public/ocr/LICENSE-tesseract.txt');
await copyFile('node_modules/tesseract.js-core/LICENSE','public/ocr/LICENSE-core.txt');
