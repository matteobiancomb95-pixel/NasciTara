/**
 * Evens out uneven lighting before OCR. Phone photos of paper reports often have a shadow across the page:
 * a single global threshold then erases the text in the darker half. Each pixel is divided by the local
 * background brightness, so paper becomes white everywhere and text stays dark. Works in place on RGBA data.
 */
export function flattenBackground(image: { data: Uint8ClampedArray; width: number; height: number }): void {
 const {data,width:w,height:h}=image;
 const n=w*h;
 if(!n)return;
 const gray=new Uint8ClampedArray(n);
 let sum=0;
 for(let i=0;i<n;i++){const v=data[i*4]*0.299+data[i*4+1]*0.587+data[i*4+2]*0.114;gray[i]=v;sum+=v;}
 // Screens and ultrasound overlays have light text on a dark background: work on the negative.
 if(sum/n<128)for(let i=0;i<n;i++)gray[i]=255-gray[i];
 // Background is estimated on a coarse grid and blurred over about a tenth of the page, then interpolated.
 const block=Math.max(4,Math.round(Math.min(w,h)/80));
 const gw=Math.ceil(w/block),gh=Math.ceil(h/block);
 const grid=new Float32Array(gw*gh);
 for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){
  let s=0,c=0;
  for(let y=gy*block;y<Math.min(h,(gy+1)*block);y++)for(let x=gx*block;x<Math.min(w,(gx+1)*block);x++){s+=gray[y*w+x];c++;}
  grid[gy*gw+gx]=s/c;
 }
 const radius=Math.max(1,Math.round(Math.min(w,h)/10/block));
 const bg=new Float32Array(gw*gh);
 for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){
  let s=0,c=0;
  for(let y=Math.max(0,gy-radius);y<=Math.min(gh-1,gy+radius);y++)for(let x=Math.max(0,gx-radius);x<=Math.min(gw-1,gx+radius);x++){s+=grid[y*gw+x];c++;}
  bg[gy*gw+gx]=s/c;
 }
 for(let y=0;y<h;y++){
  const fy=Math.min(gh-1,Math.max(0,y/block-0.5)),y0=Math.floor(fy),y1=Math.min(gh-1,y0+1),ty=fy-y0;
  for(let x=0;x<w;x++){
   const fx=Math.min(gw-1,Math.max(0,x/block-0.5)),x0=Math.floor(fx),x1=Math.min(gw-1,x0+1),tx=fx-x0;
   const b=(bg[y0*gw+x0]*(1-tx)+bg[y0*gw+x1]*tx)*(1-ty)+(bg[y1*gw+x0]*(1-tx)+bg[y1*gw+x1]*tx)*ty;
   const v=Math.min(255,255*gray[y*w+x]/Math.max(1,b));
   const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
  }
 }
}
