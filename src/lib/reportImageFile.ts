/** Read a stable local copy and identify the image from bytes, not its filename/MIME hint. */
export async function prepareReportFile(file:File):Promise<File>{
 if(file.size>12*1024*1024)throw new Error('file-size');
 let bytes:ArrayBuffer;try{bytes=await file.arrayBuffer();}catch{throw new Error('file-read');}
 const b=new Uint8Array(bytes);let type='';
 if(b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))type='image/png';
 else if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)type='image/jpeg';
 else if(b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')type='image/webp';
 if(!type)throw new Error('file-format');
 return new File([bytes],file.name,{type});
}
/** Fallback for browsers/PNG variants not supported by createImageBitmap. */
export async function decodeReportFile(file:File,signal:AbortSignal):Promise<{source:CanvasImageSource;width:number;height:number;close:()=>void}>{
 try{const bitmap=await createImageBitmap(file);if(signal.aborted){bitmap.close();throw new Error('cancelled');}return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};}
 catch{if(signal.aborted)throw new Error('cancelled');}
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file);const img=new Image();
  const clean=()=>{URL.revokeObjectURL(url);signal.removeEventListener('abort',abort);img.onload=img.onerror=null;};
  const abort=()=>{clean();img.src='';reject(new Error('cancelled'));};
  signal.addEventListener('abort',abort,{once:true});
  img.onload=()=>{clean();resolve({source:img,width:img.naturalWidth,height:img.naturalHeight,close:()=>{img.src='';}});};
  img.onerror=()=>{clean();reject(new Error('image-decode'));};
  if(signal.aborted)abort();else img.src=url;
 });
}
