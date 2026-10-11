/* Recorte de fundo da selfie: MediaPipe local, sem upload da imagem. */
(()=>{
'use strict';
const base=new URL('vendor/mediapipe/',document.currentScript.src).href;
let promise;
function load(){
 if(window.SelfieSegmentation)return Promise.resolve();
 if(!promise)promise=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=base+'selfie_segmentation.js';
  s.onload=()=>window.SelfieSegmentation?resolve():reject(new Error('Motor de recorte indisponível'));
  s.onerror=()=>reject(new Error('Arquivos MediaPipe ausentes'));
  document.head.appendChild(s);
 }).catch(e=>{promise=null;throw e});
 return promise;
}
let queue=Promise.resolve();
async function remove(src){
 await load();
 const engine=new window.SelfieSegmentation({locateFile:file=>base+file});
 engine.setOptions({modelSelection:0,selfieMode:false});
 try{
  const result=new Promise((resolve,reject)=>{
   engine.onResults(r=>{
    try{
     const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
     const ctx=c.getContext('2d');ctx.drawImage(src,0,0);
     ctx.globalCompositeOperation='destination-in';ctx.drawImage(r.segmentationMask,0,0,c.width,c.height);
     ctx.globalCompositeOperation='source-over';
     const pix=ctx.getImageData(0,0,c.width,c.height).data;
     let count=0;for(let i=3;i<pix.length;i+=4)if(pix[i]>128)count++;
     if(count<c.width*c.height*.005)throw Error('Nenhuma pessoa detectada');
     resolve(c.toDataURL('image/png'));
    }catch(e){reject(e)}
   });
   Promise.resolve(engine.send({image:src})).catch(reject);
  });
  return await Promise.race([result,new Promise((_,reject)=>setTimeout(()=>reject(Error('Tempo limite de recorte')),45000))]);
 }finally{try{await engine.close()}catch{}}
}
window.DorathBackgroundRemoval={remove:src=>{const work=queue.then(()=>remove(src));queue=work.catch(()=>{});return work}};
})();