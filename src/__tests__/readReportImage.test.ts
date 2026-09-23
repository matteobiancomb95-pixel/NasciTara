import {it,expect,vi,afterEach} from 'vitest';
import {readReportImage} from '../lib/readReportImage';
import {parseReport} from '../lib/reportParser';
const worker=vi.hoisted(()=>({recognize:vi.fn(),setParameters:vi.fn(),terminate:vi.fn()}));
vi.mock('tesseract.js',()=>({createWorker:vi.fn(async()=>worker),PSM:{SPARSE_TEXT:11,AUTO:3}}));
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
it('keeps conflicts from every attempted pass, even when they reduce the number of complete fields',async()=>{
 const img={data:new Uint8ClampedArray(400).fill(255),width:10,height:10};
 vi.stubGlobal('ImageData',class {constructor(public data:Uint8ClampedArray,public width:number,public height:number){}});
 vi.stubGlobal('createImageBitmap',async()=>({width:10,height:10,close:()=>{}}));
 vi.stubGlobal('document',{createElement:()=>({width:10,height:10,getContext:()=>({fillRect:()=>{},drawImage:()=>{},getImageData:()=>img,putImageData:()=>{}})})});
 for(const text of ['HC 275 mm\nAC 229 mm','HC 285 mm\nAC 229 mm','FL 45 mm','BPD 77 mm'])worker.recognize.mockResolvedValueOnce({data:{text,blocks:[]}});
 const text=await readReportImage({type:'image/jpeg',size:100} as File,new AbortController().signal,()=>{});
 expect(parseReport(text).draft).toMatchObject({hcMm:'',acMm:229,flMm:45,bpdMm:77});
 expect(parseReport(text).ambiguous).toContain('hcMm');
 expect(worker.terminate).toHaveBeenCalled();
});
