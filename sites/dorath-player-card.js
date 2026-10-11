/* Carta de jogador: camada de apresentação, sem alterar Supabase ou regras.
   O histórico abaixo é biográfico e pessoal, não o registro oficial das ações. */
(() => {
 const board=document.getElementById('board');
 const root=document.getElementById('player');
 const strip=document.querySelector('.dorath-card-strip');
 if(!board||!root||!strip)return;
 const fields=[['origem','Origem / trajetória',120],['historia','História do jogador',600],['notas','Anotações pessoais',600]];
 const key=()=>{const account=document.getElementById('accountEmail')?.textContent?.trim()||'local';return 'dorath.visual.profile.v1.'+account};
 let profile={};
 function load(){try{profile=JSON.parse(localStorage.getItem(key())||'{}')||{}}catch{profile={}}}
 function save(){try{localStorage.setItem(key(),JSON.stringify(profile))}catch(e){document.getElementById('dorathPersonalStatus').textContent='Não foi possível salvar neste navegador.'}}
 const form=document.createElement('section');
 form.id='dorathPersonalHistory';form.className='dorath-personal-history';
 form.innerHTML='<h4>Minha história <small>· anotações pessoais</small></h4><p>Estes campos são editáveis somente neste navegador. Não modificam a partida, a pontuação ou o histórico oficial.</p>'+
 fields.map(([id,label,max])=>'<label for="dorath-profile-'+id+'">'+label+'</label>'+(id==='origem'?'<input':'<textarea')+' id="dorath-profile-'+id+'" maxlength="'+max+'" placeholder="Escreva aqui..."'+(id==='origem'?'>':' rows="3"></textarea>')).join('')+
 '<div id="dorathPersonalStatus" role="status">Salvo somente neste aparelho</div>';
 const avatar=document.createElement('div');avatar.className='dorath-player-avatar';avatar.setAttribute('aria-hidden','true');avatar.textContent='♛';
 const first=strip.querySelector('.dorath-card-mini');first.prepend(avatar);
 const second=strip.querySelectorAll('.dorath-card-mini')[1];
 const portraits=document.createElement('div');portraits.className='dorath-portraits';second.prepend(portraits);
 const characterFiles={
  'ADÃO':'01_ADAO.webp','EVA':'02_EVA.webp','CAIM':'03_CAIM.webp',
  'ABEL':'04_ABEL.webp','SETE':'05_SETE.webp','NOÉ':'15_NOE.webp','SEM':'16_SEM.webp','JAFÉ':'18_JAFE.webp',
  'ENOS':'11_ENOS.webp','JABAL':'08_JABAL.webp','JUBAL':'09_JUBAL.webp','TUBALCAIM':'10_TUBALCAIM.webp'
 };
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const fileFor=name=>Object.entries(characterFiles).find(([k])=>normalize(k)===normalize(name))?.[1]||null;
 let lastCharacters='';
 function updatePortraits(){
  const raw=document.getElementById('dorathCharacters')?.textContent||'';
  if(raw===lastCharacters)return;lastCharacters=raw;
  const names=raw.split(',').map(s=>s.trim()).filter(x=>x&&x!=='—'&&x!=='Nenhum selecionado').slice(0,2).map(id=>{const input=[...root.querySelectorAll('.char-check')].find(el=>el.value===id);return input?.closest('label')?.textContent?.trim()||id});
  portraits.replaceChildren();
  for(const name of names){
   const file=fileFor(name);if(!file)continue;
   const img=document.createElement('img');img.src='assets/personagens/'+file;img.alt='';img.loading='lazy';img.decoding='async';
   img.title=name;portraits.append(img);
  }
 }
 function mount(){
  if(board.hidden)return;
  if(!root.contains(form)){root.append(form);load();for(const [id] of fields){const el=document.getElementById('dorath-profile-'+id);el.value=profile[id]||''}}
  updatePortraits();
 }
 form.addEventListener('input',e=>{const id=e.target.id.replace('dorath-profile-','');if(!fields.some(f=>f[0]===id))return;profile[id]=e.target.value;save()});
 const observer=new MutationObserver(()=>mount());
 observer.observe(root,{childList:true});
 observer.observe(board,{attributes:true,attributeFilter:['hidden']});
 observer.observe(strip,{subtree:true,childList:true,characterData:true});
 mount();
})();
