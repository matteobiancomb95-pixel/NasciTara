import {it,expect,vi,afterEach} from 'vitest';
import {prepareReportFile,decodeReportFile} from '../lib/reportImageFile';
afterEach(()=>vi.unstubAllGlobals());
it('accepts a PNG by signature with missing or nonstandard MIME metadata',async()=>{
 const bytes=new Uint8Array([137,80,78,71,13,10,26,10]);
 for(const type of ['', 'image/x-png','application/octet-stream']){
  const file=await prepareReportFile(new File([bytes],'referto.PNG',{type}));expect(file.type).toBe('image/png');
 }
});
it('rejects misleading extensions and oversized images with distinct errors',async()=>{
 await expect(prepareReportFile(new File(['not a png'],'referto.png',{type:'image/png'}))).rejects.toThrow('file-format');
 await expect(prepareReportFile({size:13*1024*1024} as File)).rejects.toThrow('file-size');
});
it('opens a PNG with the image-element fallback when bitmap decoding fails',async()=>{
 vi.stubGlobal('createImageBitmap',vi.fn(async()=>{throw Error('bitmap unavailable');}));
 vi.stubGlobal('Image',class {naturalWidth=100;naturalHeight=50;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;set src(v:string){if(v)queueMicrotask(()=>this.onload?.());}});
 const decoded=await decodeReportFile(new File(['test'],'test.png',{type:'image/png'}),new AbortController().signal);
 expect(decoded.width).toBe(100);expect(decoded.height).toBe(50);decoded.close();
});
