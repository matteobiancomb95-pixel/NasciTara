import type { Worker } from 'tesseract.js';
/** All workers, models and image processing are same-origin/local. No report is uploaded. */
export async function readReportImage(file: File, signal: AbortSignal, progress: (n:number)=>void): Promise<string> {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>12*1024*1024) throw new Error('unsupported');
 let stopped=false;
 let worker:Worker|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined;
 let rejectAbort:((reason:Error)=>void)|undefined;
 const abort=()=>{ stopped=true; void worker?.terminate(); rejectAbort?.(new Error('cancelled')); };
 const cancelled=new Promise<never>((_,reject)=>{rejectAbort=reject;});
 signal.addEventListener('abort',abort,{once:true});
 const run=async()=>{
  const bitmap=await createImageBitmap(file);
  if(bitmap.width*bitmap.height>24000000){bitmap.close();throw new Error('too-large');}
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,2600/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext('2d');if(!ctx){bitmap.close();throw new Error('canvas');}
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  if(signal.aborted||stopped)throw new Error('cancelled');
  const {createWorker,PSM}=await import('tesseract.js');
  worker=await createWorker('eng',1,{
   workerPath:'/ocr/worker.min.js',corePath:'/ocr/core',langPath:'/ocr/lang',cacheMethod:'none',
   logger:m=>{if(!signal.aborted && m.status==='recognizing text')progress(Math.round(m.progress*100));},
   errorHandler:()=>{},
  });
  if(signal.aborted||stopped){await worker.terminate();throw new Error('cancelled');}
  await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO});
  const result=await worker.recognize(canvas);
  canvas.width=canvas.height=0;
  return result.data.text;
 };
 try{
  if(signal.aborted||stopped)throw new Error('cancelled');
  timer=setTimeout(abort,90000);
  return await Promise.race([run(),cancelled]);
 }finally{
  clearTimeout(timer);signal.removeEventListener('abort',abort);await worker?.terminate();
 }
}
