/* Dorath V4 — camada visual independente. Nunca executa ações do jogo. */
(()=>{
const board=document.getElementById('board');if(!board)return;
const host=board.querySelector('.mp-grid');const panels=['movement','missions','world','player','rooms','threats','trades','history'];
const active=(id)=>document.getElementById(id);
const ui=document.createElement('section');ui.id='dv4';ui.innerHTML='<div class="dv4-meta" aria-label="Informações da partida"><span>PERÍODO 1<small>Éden ao Dilúvio</small></span><span id="dv4round">RODADA —</span><span id="dv4house">CASA —</span></div><div class="dv4-cards" id="dv4cards" aria-label="Cartas do jogador"></div><nav class="dv4-nav" aria-label="Navegação do Dorath"></nav><dialog id="dv4modal" aria-label="Carta ampliada"><button type="button" id="dv4close" aria-label="Fechar carta">✕</button><div id="dv4content"></div></dialog>';
board.insertBefore(ui,host);const cards=ui.querySelector('#dv4cards'),nav=ui.querySelector('.dv4-nav'),modal=ui.querySelector('#dv4modal');
const navItems=[['movement','Jogar','◈'],['missions','Missão','✦'],['world','Eventos','❢'],['player','Jogador','♛'],['threats','Ameaças','⚔'],['trades','Trocas','⇄'],['rooms','Salas','⌂'],['more','Mais','☰']];
// Icones vetoriais embutidos (sem dependencia de fontes ou bibliotecas externas).
const navIconPaths={
 movement:'<path d="M6 3h12l4 9-10 9L2 12 6 3Z"/><path d="M2 12h20M6 3l6 9 6-9M12 12v9"/>',
 missions:'<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 17 .8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/>',
 world:'<path d="M8 21h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 1 2 2Z"/><path d="M6 17H4a2 2 0 0 0 0 4h4M10 8h8M10 12h6"/>',
 player:'<path d="m2 8 5 4 5-7 5 7 5-4-2 12H4L2 8Z"/><path d="M4 20h16"/>',
 threats:'<path d="m14.5 17.5 3-3L6 3 3 6l11.5 11.5ZM13 19l6 2 2-2-2-6M3 21l6-6"/>',
 trades:'<path d="M7 7h14m-4-4 4 4-4 4M17 17H3m4-4-4 4 4 4"/>',
 rooms:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-8h6v8"/>',
 more:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
 change:'<path d="M20 7H4m0 0 4-4M4 7l4 4M4 17h16m0 0-4-4m4 4-4 4"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
};
const navIcon=(key)=>'<svg class="dv4-nav-icon" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(navIconPaths[key]||navIconPaths.more)+'</svg>';
const setNavContent=(button,key,title)=>{button.innerHTML=navIcon(key)+'<small>'+title+'</small>';button.setAttribute('aria-label',title)};
for(const [id,label] of navItems){const b=document.createElement('button');b.type='button';b.dataset.dv4=id;setNavContent(b,id,label);nav.append(b)}
const extras=document.createElement('div');extras.id='dv4extras';extras.hidden=true;for(const [id,label] of [['history','Histórico']]){let b=document.createElement('button');b.type='button';b.dataset.dv4=id;b.textContent=label;extras.append(b)}ui.insertBefore(extras,nav);const accountMenu=document.createElement('div');accountMenu.className='dv4-account-menu';accountMenu.innerHTML='<small>Conectado como <span id="dv4menuEmail"></span></small><button type="button" id="dv4menuSignout">Desconectar da partida</button>';extras.append(accountMenu);
const chooseParty=document.createElement('button');chooseParty.type='button';chooseParty.textContent='Trocar de partida';chooseParty.addEventListener('click',()=>{closeMore();document.dispatchEvent(new Event('dorath-choose-party'))});accountMenu.insertBefore(chooseParty,accountMenu.querySelector('#dv4menuSignout'));
setNavContent(extras.querySelector('[data-dv4="history"]'),'history','Histórico');
setNavContent(chooseParty,'change','Trocar partida');
setNavContent(accountMenu.querySelector('#dv4menuSignout'),'logout','Desconectar');

// A navegação vem depois do painel de turno, não entre as cartas e as ações.
host.after(nav,extras);
accountMenu.querySelector('#dv4menuSignout').addEventListener('click',()=>{if(window.confirm('Deseja desconectar desta partida? Você poderá retomá-la depois.'))document.getElementById('signout')?.click()});
const text=(el)=>el?.textContent?.trim()||'';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const files={'adao':'01_ADAO.webp','eva':'02_EVA.webp','caim':'03_CAIM.webp','abel':'04_ABEL.webp','sete':'05_SETE.webp','noe':'15_NOE.webp','sem':'16_SEM.webp','jafe':'18_JAFE.webp','enos':'11_ENOS.webp','jabal':'08_JABAL.webp','jubal':'09_JUBAL.webp','tubalc a im':'10_TUBALCAIM.webp'};
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const mapped=Object.fromEntries(Object.entries(files).map(([k,v])=>[slug(k),v]));mapped.tubalcaim='10_TUBALCAIM.webp';
let selected='movement',sig='',manual=false,oldNames='',playerPhoto='';
try{playerPhoto=localStorage.getItem('dorath.visual.photo.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local'))||''}catch{}
document.addEventListener('dorath-photo-update',e=>{playerPhoto=e.detail?.photo||'';oldNames='';renderCards()});
const moreButton=nav.querySelector('[data-dv4="more"]');
const historyButton=extras.querySelector('[data-dv4="history"]');
const signoutButton=accountMenu.querySelector('#dv4menuSignout');
// Somente os oito botoes principais pertencem ao rodape no estado padrao.
// Os extras sao movidos para a grade exclusivamente enquanto Mais estiver aberto.
const extraNavButtons=[historyButton,chooseParty,signoutButton].filter(Boolean);
function closeMore(){
 nav.classList.remove('dv4-more-open');
 moreButton.hidden=false;
 // Elementos extras ficam FORA do DOM quando Mais esta fechado.
 // Isso impede que CSS legado os exiba mesmo com o atributo hidden.
 for(const button of extraNavButtons){button.remove();button.classList.remove('dv4-more-extra')}
 extras.remove();
 extras.hidden=true;
}
function openMore(){
 closeMore();
 nav.classList.add('dv4-more-open');
 moreButton.hidden=true;
 for(const button of extraNavButtons){button.classList.add('dv4-more-extra');nav.append(button)}
}
closeMore();
function select(id,user=false){if(!panels.includes(id))return;selected=id;manual=user;for(const key of panels)active(key)?.classList.toggle('dv4-current',key===id);for(const b of nav.querySelectorAll('button'))b.classList.toggle('dv4-selected',b.dataset.dv4===(navItems.some(n=>n[0]===id)?id:'more'));closeMore()}
nav.addEventListener('click',e=>{const id=e.target.closest('button[data-dv4]')?.dataset.dv4;if(!id)return;if(id==='more'){openMore();return}if(id==='history'){select(id,true);return}select(id,true)});
extras.addEventListener('click',e=>{const id=e.target.closest('[data-dv4]')?.dataset.dv4;if(id)select(id,true)});
function openCard(card){
 const body=ui.querySelector('#dv4content');body.replaceChildren();
 if(card.kind==='JOGADOR'){
  const player=active('player');
  const resources=text(player?.querySelector('p'));
  const value=name=>{const entry=resources.split('·').find(x=>x.trim().toLowerCase().startsWith(name.toLowerCase()+':'));return entry?.match(/[0-9]+/)?.[0]||'0'};
  let personal={};try{personal=JSON.parse(localStorage.getItem('dorath.visual.profile.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local'))||'{}')}catch{}
  const cv=str=>escapeHTML(String(str||'').trim());
  const displayName=personal.nome?.trim()||card.title;
  const secret=text(player?.querySelectorAll('p')[1]).replace(/^Missão Secreta\s*/i,'').trim();
  const houseCode=(text(document.querySelector('#summary h2')).match(/P[1-8]-\d{3}/)||[])[0]||'P1-010';
  const period=(houseCode.match(/^P([1-8])/)||[])[1]||'1';
  const round=(text(document.querySelector('#summary p')).match(/Rodada\s+(\d+)/i)||[])[1]||'—';
  const boardHouse=(Number((houseCode.match(/-(\d{3})$/)||[])[1])||10)/10;
  const displayHouse=String(Math.max(1,Math.round(boardHouse))).padStart(2,'0');
  const sheet=document.createElement('article');sheet.className='dv4tpl-card dv4tpl-v5';
  sheet.innerHTML='<img class="dv4tpl-base" src="assets/ui/Cart%C3%A3o%20Dorath%20com%20miss%C3%A3o%20secreta.png" alt="Arte-base homologada da Carta do Jogador">'+
   '<div class="dv4tpl-name">'+escapeHTML(displayName)+'</div>'+
   '<div class="dv4tpl-subtitle">Período '+period+' · Rodada '+round+' · Casa '+displayHouse+'</div>'+
   '<div class="dv4tpl-portrait">'+(playerPhoto?'<img alt="Selfie do jogador" src="'+escapeHTML(playerPhoto)+'">':'<div class="dv4tpl-placeholder">SUA FOTO AQUI</div>')+'</div>'+
   '<section class="dv4tpl-history dv4tpl-controls" aria-label="Controles da partida"><strong>PARTIDA CONECTADA</strong><span class="dv4tpl-connection">'+escapeHTML(text(document.getElementById('status')).split(' · ')[0]||'Conectado')+'</span><span class="dv4tpl-room">'+escapeHTML(text(active('rooms')?.querySelector('h3'))||'Partida conectada')+'</span><span class="dv4tpl-roomname">'+escapeHTML(text(active('rooms')?.querySelector('p b'))||'')+'</span><button type="button" class="dv4tpl-audio-toggle">Áudio</button><label class="dv4tpl-volume-label">Volume <input type="range" min="0" max="100" class="dv4tpl-volume"></label><div class="dv4tpl-audio-flags"><label><input type="checkbox" class="dv4tpl-ambient"> Ambiente</label><label><input type="checkbox" class="dv4tpl-effects"> Efeitos</label></div></section>'+
   '<div class="dv4tpl-stats">'+[['knowledge','Conhecimento'],['influence','Influência'],['heritage','Herança'],['provisions','Provisões']].map(([key,name])=>'<output class="dv4tpl-stat dv4tpl-'+key+'">'+value(name)+'</output>').join('')+'</div>'+
   '<div class="dv4tpl-secret">'+escapeHTML(secret||'Aguardando atribuição da missão.')+'</div>';
  body.append(sheet);
  const audioButton=sheet.querySelector('.dv4tpl-audio-toggle'),volume=sheet.querySelector('.dv4tpl-volume');
  const nativeAudio=document.getElementById('audioToggle'),nativeVolume=document.getElementById('audioVolume');
  audioButton.textContent=nativeAudio?.textContent?.includes('Desativar')?'Desativar áudio':'Ativar áudio';
  volume.value=nativeVolume?.value||'50';
  audioButton.addEventListener('click',()=>{nativeAudio?.click();requestAnimationFrame(()=>{audioButton.textContent=nativeAudio?.textContent?.includes('Desativar')?'Desativar áudio':'Ativar áudio'})});
  volume.addEventListener('input',()=>{if(!nativeVolume)return;nativeVolume.value=volume.value;nativeVolume.dispatchEvent(new Event('input',{bubbles:true}))});
  for(const [cls,id] of [['dv4tpl-ambient','audioAmbient'],['dv4tpl-effects','audioEffects']]){
    const box=sheet.querySelector('.'+cls),native=document.getElementById(id);
    box.checked=Boolean(native?.checked);
    box.disabled=!native;
    box.addEventListener('change',()=>{if(!native)return;native.checked=box.checked;native.dispatchEvent(new Event('change',{bubbles:true}))});
  }
  const action=document.createElement('button');action.type='button';action.className='dv4tpl-edit';action.textContent='Editar carta · Tirar selfie';action.addEventListener('click',()=>{
    body.replaceChildren();
    const editor=document.createElement('section');editor.className='dv4-card-editor';
    const source=document.getElementById('dorathPersonalHistory');
    const stored=(()=>{try{return JSON.parse(localStorage.getItem('dorath.visual.profile.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local'))||'{}')}catch{return {}}})();
    const form=document.createElement('form');form.className='dv4-card-editor-form';
    const titles=[['nome','Nome na Carta',60]];
    for(const [id,label,max] of titles){
      const row=document.createElement('label');row.textContent=label;
      const field=document.createElement('input');
      field.name=id;field.maxLength=max;field.value=stored[id]||'';if(field.tagName==='TEXTAREA')field.rows=4;
      row.append(field);form.append(row);
    }
    const photoBtn=document.createElement('button');photoBtn.type='button';photoBtn.textContent='Tirar selfie';
    photoBtn.addEventListener('click',()=>source?.querySelector('#dorathPhotoCamera')?.click());
    form.append(photoBtn);
    const signout=document.createElement('button');signout.type='button';signout.className='dv4-editor-signout';signout.textContent='Desconectar da partida';
    signout.addEventListener('click',()=>{if(window.confirm('Deseja desconectar desta partida? Você poderá retomá-la depois.')){modal.close();document.getElementById('signout')?.click()}});
    const save=document.createElement('button');save.type='submit';save.textContent='Salvar e voltar à carta';form.append(save);
    form.addEventListener('submit',event=>{
      event.preventDefault();const next={...stored};
      for(const [id] of titles)next[id]=form.elements.namedItem(id).value.trim();
      try{localStorage.setItem('dorath.visual.profile.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local'),JSON.stringify(next))}catch{}
      for(const [id] of titles){const legacy=document.getElementById('dorath-profile-'+id);if(legacy)legacy.value=next[id]}
      modal.close();openCard(card);
    });
    editor.append(form);body.append(editor);
  });body.append(action);
 }else{
  if(card.src){const img=document.createElement('img');img.src=card.src;img.alt=card.title;img.loading='eager';body.append(img);if(card.stats){const cap=document.createElement('p');cap.className='dv4-full-card-stats';cap.textContent=card.stats;body.append(cap)}}
  else{const p=document.createElement('p');p.textContent=card.info||'Nenhum personagem selecionado.';body.append(p)}
 }
 modal.classList.toggle('dv4-character-modal',card.kind!=='JOGADOR');
 modal.showModal();
}
ui.querySelector('#dv4close').addEventListener('click',()=>modal.close());modal.addEventListener('click',e=>{if(e.target!==modal)return;const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()});
function renderCards(){
 const player=active('player');
 const label=text(player?.querySelector('h3')).split('·')[0].trim()||'Jogador';
 const selectedLine=text(player?.querySelectorAll('p')[2]);
 const chars=player?.dataset.setupDone==='true' && selectedLine.startsWith('Personagens (até 2):')
  ? selectedLine.slice('Personagens (até 2):'.length).trim() : '';
 const official={
  adao:['Adão',2,2,2],eva:['Eva',2,3,2],caim:['Caim',1,2,0],abel:['Abel',1,1,2],sete:['Sete',2,2,2],
  'lameque-caim':['Lameque (linhagem de Caim)',0,4,0],'enoque-caim':['Enoque (linhagem de Caim)',2,3,1],
  jabal:['Jabal',3,3,2],jubal:['Jubal',3,3,2],tubalcaim:['Tubalcaim',4,3,2],enos:['Enos',2,2,2],
  'enoque-sete':['Enoque (linhagem de Sete)',3,2,3],matusalem:['Matusalém',3,2,4],
  'lameque-noe':['Lameque (linhagem de Sete)',2,2,3],noe:['Noé',3,3,4],sem:['Sem',3,3,4],
  cam:['Cam',3,4,2],jafe:['Jafé',3,2,3]
 };
 const people=chars.split(',').map(x=>x.trim()).filter(id=>Object.prototype.hasOwnProperty.call(official,id)).slice(0,2).map(id=>{
  const [name,conhecimento,influencia,heranca]=official[id];
  return {id,name,stats:`Conhecimento ${conhecimento} · Influência ${influencia} · Herança ${heranca}`};
 });
 const statLine=text(player?.querySelector('p'));const secret=text(player?.querySelectorAll('p')[1]).replace(/^Missão Secreta\s*/i,'').trim();
 let personal={};try{personal=JSON.parse(localStorage.getItem('dorath.visual.profile.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local'))||'{}')}catch{}
 const summary=text(document.querySelector('#summary h2')),raw=text(document.querySelector('#summary p'));
 const code=(summary.match(/P[1-8]-(\d{3})/)||[])[1],period=(summary.match(/P([1-8])-/)||[])[1]||'1',round=(raw.match(/Rodada\s+(\d+)/i)||[])[1]||'—';
 const house=code?String(Math.round(Number(code)/10)).padStart(2,'0'):'—';
 const miniName=personal.nome?.trim()||label;
 const key=[label,player?.dataset.setupDone,statLine,secret,miniName,period,round,house,people.map(p=>p.name+':'+p.stats).join('|')].join('|');if(oldNames===key)return;oldNames=key;cards.replaceChildren();
 const getValue=name=>{const entry=statLine.split('·').find(x=>x.trim().toLowerCase().startsWith(name.toLowerCase()+':'));return entry?.match(/[0-9]+/)?.[0]||'0'};
 const set=[{title:label,kind:'JOGADOR',src:playerPhoto||null,info:'Toque em Editar carta para inserir sua foto, origem e história.'},...Array.from({length:2},(_,i)=>({kind:'PERSONAGEM',title:people[i]?.name||'Não selecionado',stats:people[i]?.stats||'',src: mapped[slug(people[i]?.name||'')]?'assets/personagens/'+mapped[slug(people[i].name)]:null}))];
 for(const [slot,c] of set.entries()){
  const b=document.createElement('div');
  b.className='dv4-card dv4-summary-card';
  if(c.kind==='JOGADOR'){
   b.classList.add('dv4-player-card');
   b.innerHTML='<span class="dv4-summary-type">CARTA DO JOGADOR</span><strong class="dv4-summary-name">'+escapeHTML(miniName)+'</strong>'+
    '<span class="dv4-summary-stats dv4-summary-stats-player">'+
    [['Conhecimento','CON'],['Influência','INF'],['Herança','HER'],['Provisões','PRO']].map(([name,abbr])=>'<span class="dv4-summary-stat"><small>'+abbr+'</small><b>'+getValue(name)+'</b></span>').join('')+
    '</span><button class="dv4-summary-open" type="button">VER CARTA<br>COMPLETA</button>';
   b.querySelector('.dv4-summary-open').addEventListener('click',()=>openCard(c));
  }else{
   b.classList.add('dv4-character-card');
   const fields=[['Conhecimento','CON'],['Influência','INF'],['Herança','HER']];
   const stat=name=>{const m=(c.stats||'').match(new RegExp(name+'\\s+(\\d+)','i'));return m?m[1]:'—'};
   b.innerHTML='<span class="dv4-summary-type">PERSONAGEM '+slot+'</span><strong class="dv4-summary-name">'+escapeHTML(c.title)+'</strong>'+
    '<span class="dv4-summary-stats dv4-summary-stats-character">'+fields.map(([name,abbr])=>'<span class="dv4-summary-stat"><small>'+abbr+'</small><b>'+stat(name)+'</b></span>').join('')+
    '<button class="dv4-summary-swap" type="button" aria-label="Trocar personagem '+slot+'">TROCAR<br>CARTA</button></span>'+
    '<button class="dv4-summary-open" type="button">VER CARTA<br>COMPLETA</button>';
   b.querySelector('.dv4-summary-open').addEventListener('click',()=>openCard(c));
   b.querySelector('.dv4-summary-swap').addEventListener('click',()=>{
    select('player',true);
    const gallery=active('player')?.querySelector('.dv4-player-section[data-section="collection"]');
    if(gallery){gallery.open=true;gallery.scrollIntoView({block:'nearest',behavior:'smooth'})}
   });
  }
  cards.append(b);
 }
}
// A galeria expõe a arte completa sem substituir o limite de personagens do motor.
document.addEventListener('click',e=>{
 const art=e.target.closest('.dv4-gallery-art,.dv4-gallery-name');
 const row=art?.closest('.dv4-character-option');
 if(!row||!row.classList.contains('dv4-unlocked'))return;
 const src=row.dataset.characterArt;
 if(!src)return;
 openCard({kind:'PERSONAGEM',title:row.dataset.characterName,src,stats:text(row.querySelector('.dv4-gallery-stats'))});
});

let initialAdamPending=false;
let initialAdamOpen=false;
let introAwaitEvent=false;
document.addEventListener('dorath-setup-acknowledged',()=>{
 initialAdamPending=true;
 select('player',true);
 updateIntroSelection();
});
function updateIntroSelection(){
 const panel=active('player');
 if(!panel)return;
 let btn=panel.querySelector('#dv4ChooseAdam');
 if(!initialAdamPending){btn?.remove();return}
 if(!btn){
  btn=document.createElement('button');
  btn.id='dv4ChooseAdam';btn.type='button';btn.className='dv4-intro-adam';
  btn.textContent='SELECIONAR ADÃO E ABRIR CARTA';
  btn.addEventListener('click',()=>{
   const c={kind:'PERSONAGEM',title:'Adão',src:'assets/personagens/01_ADAO.webp',stats:'Conhecimento 2 · Influência 2 · Herança 2'};
   initialAdamOpen=true;initialAdamPending=false;
   btn.remove();openCard(c);
  });
  panel.insertBefore(btn,panel.querySelector('.dv4-character-gallery'));
 }
}
modal.addEventListener('close',()=>{
 if(initialAdamOpen){
  initialAdamOpen=false;
  introAwaitEvent=true;
  select('movement',true);
  // A indicação de Eventos é desenhada pelo estado real da ocorrência, não adicionada ao DOM.
 }
});
const priority=()=>{
 // Fora da vez, o jogador acompanha o estado em Jogar; Missão não é acionável.
 const movement=active('movement');
 if(movement?.dataset.isMyTurn==='false')return 'movement';
 if(active('player')?.dataset.setupDone!=='true')return 'movement';
 if(initialAdamPending)return 'player';
 if(active('world')?.querySelector('.dv4-house-occurrence'))return 'movement';
 if(introAwaitEvent&&active('movement')?.querySelector('.dv4-intro-event-hint'))return 'movement';
 if(introAwaitEvent)introAwaitEvent=false;
 // A rolagem de movimento sempre abre o turno; a missão vem após a chegada.
 if(active('movement')?.querySelector('[data-action="move"],[data-action="setup"]'))return 'movement';
 // Enquanto há missão a decidir ou resolver, não desviar para Encerrar turno.
 if(active('missions')?.dataset.missionStep==='true')return 'missions';
 // Primeiro conclui os dados obrigatórios do Marco 06; em seguida destaca a decisão pessoal.
 const movementActions=[...active('movement')?.querySelectorAll('[data-action]')||[]].map(b=>b.dataset.action);
 if(movementActions.some(a=>['marcoD4','marcoIndividualD4'].includes(a)))return 'movement';
 if(active('world')?.querySelector('[data-action="mandamentoRefuse"], [data-action="mandamentoOpen"]'))return 'world';
 const set=[
 ['missions',['missionD4','missionAttempt','missionOffer','missionDecline']],
 ['world',['consequence','threatSpawnD4','mandamentoRefuse','mandamentoOpen','vidaHeranca','vidaProvisoes','conhecimentoAceitar','conhecimentoRecusar','lastChance']],
 ['threats',['threatD4','threatAttempt','dominatorD8','dominatorTierD4','dominatorChoice']],
 ['movement',['marcoD4','marcoIndividualD4','ruptureD4','preparePass','prepareMission','prepareConvert','arkFinalEnter','arkFinalOutside','arkEnter','preservationD6','move','setup','start','advanceFinal']],
 ['trades',['tradeAccept','tradeDecline']]
 ];
 for(const [id,actions] of set)if([...active(id)?.querySelectorAll('[data-action]')||[]].some(x=>actions.includes(x.dataset.action)))return id;
 return 'movement';
};
function fingerprint(){return panels.map(id=>[id,[...active(id)?.querySelectorAll('[data-action]')||[]].map(b=>b.dataset.action).join(',')].join(':')).join('|')+'|'+text(active('movement'))}
function update(){
 if(board.hidden)return;
 const s=fingerprint();renderCards();updateIntroSelection();
 const summary=text(document.querySelector('#summary h2'));const code=(summary.match(/P[1-8]-(\d{3})/)||[])[1];ui.querySelector('#dv4house').textContent=code?'CASA '+String(Math.round(Number(code)/10)).padStart(2,'0'):'CASA —';
 const raw=text(document.querySelector('#summary p'));const rd=raw.match(/Rodada\s+(\d+)/i);ui.querySelector('#dv4round').textContent=rd?'RODADA '+rd[1]:'RODADA —';
 if(sig!==s){sig=s;if(!initialAdamOpen&&!initialAdamPending)select(priority(),false)}else if(!manual&&!initialAdamOpen&&!initialAdamPending)select(selected,false);
}
let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;update()})});for(const id of panels)observer.observe(active(id),{childList:true,subtree:true});observer.observe(board,{attributes:true,attributeFilter:['hidden']});select('movement');update();
})();
