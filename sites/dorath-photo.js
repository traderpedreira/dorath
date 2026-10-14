/* Fotografia pessoal opcional: armazenada apenas neste navegador, sem servidor. */
(()=>{
const root=document.getElementById('player');if(!root)return;
const key=()=> 'dorath.visual.photo.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local');
let lastKey='',photo='';
function load(){const k=key();if(k!==lastKey){lastKey=k;try{photo=localStorage.getItem(k)||''}catch{photo=''};document.dispatchEvent(new CustomEvent('dorath-photo-update',{detail:{photo}}))}}
const ui=document.createElement('section');ui.className='dorath-photo-editor';ui.innerHTML='<h4>Foto da Carta do Jogador</h4><p>Tire uma selfie para a sua Carta do Jogador. A foto ficará somente neste aparelho.</p><div class="dorath-photo-actions"><label class="dorath-photo-button">Tirar selfie<input id="dorathPhotoCamera" type="file" accept="image/*" capture="user" hidden></label><button type="button" id="dorathPhotoRemove">Remover foto</button></div><p id="dorathPhotoStatus" role="status"></p>';
function mount(){const parent=document.getElementById('dorathPersonalHistory');if(parent&&!parent.contains(ui))parent.prepend(ui);load()}
let requestId=0;
function process(file){
 if(!file||!file.type.startsWith('image/'))return;
 const current=++requestId,status=ui.querySelector('#dorathPhotoStatus');
 const img=new Image(),url=URL.createObjectURL(file);
 img.onload=async()=>{
  URL.revokeObjectURL(url);
  if(current!==requestId)return;
  try{
   const side=1200,scale=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight));
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   status.textContent='Recortando o fundo da selfie…';
   if(!window.DorathBackgroundRemoval)throw Error('Mecanismo de recorte indisponível');
   const cropped=await window.DorathBackgroundRemoval.remove(canvas);
   if(current!==requestId)return;
   localStorage.setItem(key(),cropped);
   photo=cropped;
   status.textContent='Selfie recortada e salva neste aparelho.';
   document.dispatchEvent(new CustomEvent('dorath-photo-update',{detail:{photo}}));
  }catch(e){
   if(current!==requestId)return;
   status.textContent='Não foi possível remover o fundo. A foto anterior foi mantida. Verifique os arquivos do recorte.';
  }
 };
 img.onerror=()=>{URL.revokeObjectURL(url);if(current===requestId)status.textContent='Não foi possível abrir a foto.'};
 img.src=url;
}
ui.addEventListener('change',e=>{if(e.target.type==='file'){process(e.target.files?.[0]);e.target.value=''}});
ui.querySelector('#dorathPhotoRemove').addEventListener('click',()=>{requestId++;photo='';try{localStorage.removeItem(key())}catch{};document.dispatchEvent(new CustomEvent('dorath-photo-update',{detail:{photo:''}}));ui.querySelector('#dorathPhotoStatus').textContent='Foto removida deste aparelho.'});
const obs=new MutationObserver(mount);obs.observe(root,{childList:true});obs.observe(document.getElementById('board'),{attributes:true,attributeFilter:['hidden']});mount();
})();
