/* Fotografia pessoal opcional: armazenada apenas neste navegador, sem servidor. */
(()=>{
const root=document.getElementById('player');if(!root)return;
const key=()=> 'dorath.visual.photo.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local');
let lastKey='',photo='';
function load(){const k=key();if(k!==lastKey){lastKey=k;try{photo=localStorage.getItem(k)||''}catch{photo=''};document.dispatchEvent(new CustomEvent('dorath-photo-update',{detail:{photo}}))}}
const ui=document.createElement('section');ui.className='dorath-photo-editor';ui.innerHTML='<h4>Foto da Carta do Jogador</h4><p>Tire uma selfie para a sua Carta do Jogador. A foto ficará somente neste aparelho.</p><div class="dorath-photo-actions"><label class="dorath-photo-button">Tirar selfie<input id="dorathPhotoCamera" type="file" accept="image/*" capture="user" hidden></label><button type="button" id="dorathPhotoRemove">Remover foto</button></div><p id="dorathPhotoStatus" role="status"></p>';
function mount(){const parent=document.getElementById('dorathPersonalHistory');if(parent&&!parent.contains(ui))parent.prepend(ui);load()}
function process(file){if(!file||!file.type.startsWith('image/'))return;
 const img=new Image(),url=URL.createObjectURL(file);
 img.onload=()=>{try{const side=512,scale=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);
 photo=c.toDataURL('image/jpeg',0.76);localStorage.setItem(key(),photo);document.getElementById('dorathPhotoStatus').textContent='Foto salva neste aparelho.';document.dispatchEvent(new CustomEvent('dorath-photo-update',{detail:{photo}}))}catch{document.getElementById('dorathPhotoStatus').textContent='Espaço insuficiente. Tente uma foto menor.'}finally{URL.revokeObjectURL(url)}};
 img.onerror=()=>{URL.revokeObjectURL(url);document.getElementById('dorathPhotoStatus').textContent='Não foi possível abrir a foto.'};img.src=url;
}
ui.addEventListener('change',e=>{if(e.target.type==='file'){process(e.target.files?.[0]);e.target.value=''}});
ui.querySelector('#dorathPhotoRemove').addEventListener('click',()=>{photo='';try{localStorage.removeItem(key())}catch{};document.dispatchEvent(new CustomEvent('dorath-photo-update',{detail:{photo:''}}));ui.querySelector('#dorathPhotoStatus').textContent='Foto removida deste aparelho.'});
const obs=new MutationObserver(mount);obs.observe(root,{childList:true});obs.observe(document.getElementById('board'),{attributes:true,attributeFilter:['hidden']});mount();
})();
