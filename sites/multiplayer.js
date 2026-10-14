import { DorathAudio } from './dorath-audio.js';
import { EDGE_FUNCTION_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';
import { supabase, validSession, accountTokenKey } from './auth.js';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label={conhecimento:'Conhecimento',influencia:'Influência',provisoes:'Provisões',heranca:'Herança'};
let token='',view=null,busy=false,stream=null,currentUser=null,sessionAccessToken='';
let historyKey='',commonKey='';
const audio=new DorathAudio();
audio.status=message=>{const el=document.getElementById('audioStatus');if(el)el.textContent=message};
document.getElementById('audioToggle').addEventListener('click',async()=>{if(audio.enabled){audio.disable();document.getElementById('audioToggle').textContent='Ativar experiência sonora'}else{await audio.activate();document.getElementById('audioToggle').textContent='Desativar áudio'}});
document.getElementById('audioVolume').addEventListener('input',e=>audio.setVolume(Number(e.target.value)/100));
document.getElementById('audioAmbient').addEventListener('change',e=>{audio.ambient=e.target.checked;if(audio.last)audio.render(audio.last)});
document.getElementById('audioEffects').addEventListener('change',e=>{audio.effects=e.target.checked});
function say(t,error=false){$('status').textContent=t;$('status').classList.toggle('mp-error',error)}
async function api(route,data={}){
 if(!/^https:\/\/[^/]+\.supabase\.co\/functions\/v1\/dorath-p1(?:-v4)?$/.test(EDGE_FUNCTION_URL))throw Error('Configure site/supabase-config.js antes de usar o app');
 // A sessão já foi obtida no login/INITIAL_SESSION. Não consultar getSession()
 // a cada requisição: isso pode bloquear no lock interno durante refresh de token.
 if(!sessionAccessToken)throw Error('Sessão indisponível. Entre na sua conta novamente.');
 const response=await fetch(EDGE_FUNCTION_URL,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${sessionAccessToken}`,'apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({route,...data})});
 let body;try{body=await response.json()}catch{throw Error('Resposta inválida do servidor')}
 if(!response.ok)throw Error(body.error||`Erro ${response.status}`);return body;
}
// Confirmação das fichas físicas: cada celular mostra somente as mudanças do próprio jogador.
const resourceNames={conhecimento:'Conhecimento',influencia:'Influência',provisoes:'Provisões',heranca:'Herança'};
const resourceQueue=[];
let resourceDialog=null;
function ensureResourceDialog(){
 if(resourceDialog)return resourceDialog;
 resourceDialog=document.createElement('dialog');resourceDialog.id='dv4ResourceNotice';
 resourceDialog.innerHTML='<div class="dv4-resource-icon" aria-hidden="true">✦</div><h2 id="dv4ResourceTitle"></h2><p id="dv4ResourceMessage"></p><p class="dv4-resource-instruction">Atualize suas fichas físicas na mesa antes de continuar.</p><button id="dv4ResourceAck" type="button">OK — ATUALIZEI MINHAS FICHAS</button>';
 document.body.append(resourceDialog);
 resourceDialog.querySelector('#dv4ResourceAck').addEventListener('click',()=>{resourceDialog.close();resourceQueue.shift();showResourceNotice()});
 resourceDialog.addEventListener('cancel',e=>e.preventDefault());
 return resourceDialog;
}
function showResourceNotice(){
 const modal=ensureResourceDialog(),change=resourceQueue[0];
 if(!change)return;
 modal.querySelector('#dv4ResourceTitle').textContent=change.delta>0?'PARABÉNS!':'ATENÇÃO!';
 modal.querySelector('#dv4ResourceMessage').textContent=change.delta>0
 ?`Você recebeu +${change.delta} ${resourceNames[change.key]}!`
 :`Você perdeu ${Math.abs(change.delta)} ${resourceNames[change.key]}.`;
 modal.classList.toggle('dv4-resource-loss',change.delta<0);
 if(!modal.open)modal.showModal();
}
function showInitialResourceReceipt(p){
 const d=document.createElement('dialog');d.className='dv4-setup-receipt';
 d.innerHTML='<h2>ATRIBUTOS RECEBIDOS</h2><p>Você recebeu seus recursos iniciais:</p>'+
 ['conhecimento','influencia','provisoes'].map(k=>'<p><strong>'+resourceNames[k]+': '+Number(p.resources[k])+'</strong></p>').join('')+
 '<p>Confira suas fichas físicas antes de continuar.</p><button type="button">CONFIRMEI MEUS ATRIBUTOS</button>';
 document.body.append(d);
 d.addEventListener('cancel',e=>e.preventDefault());
 d.querySelector('button').addEventListener('click',()=>{
  d.close();d.remove();
  document.dispatchEvent(new Event('dorath-setup-acknowledged'));
 });
 d.showModal();
}
function recordResourceChanges(previous,next){
 if(!previous?.me||!next?.me||previous.me.id!==next.me.id||previous.motherCode!==next.motherCode)return;
 for(const key of Object.keys(resourceNames)){
  const before=Number(previous.me.resources?.[key]),after=Number(next.me.resources?.[key]);
  if(!Number.isFinite(before)||!Number.isFinite(after)||before===after)continue;
  resourceQueue.push({key,delta:after-before});
 }
 if(resourceQueue.length)showResourceNotice();
}
function saveCommon(){if(view?.me?.missionHistory)localStorage.setItem(commonKey,JSON.stringify(view.me.missionHistory))}
let refreshInFlight=false, lastRefreshFailure=0;
async function refresh(){
 if(!token||!currentUser||refreshInFlight)return;
 refreshInFlight=true;
 const requestedToken=token,requestedUser=currentUser.id;
 try{
  const next=await api('state',{token:requestedToken});
  if(token!==requestedToken||currentUser?.id!==requestedUser)return;
  const changed=!view||next.revision!==view.revision;const prior=view;view=next;recordResourceChanges(prior,next);
  void audio.update(view);saveCommon();rememberParty(view);
  $('login').hidden=true;$('board').hidden=false;
  if(changed)draw();
  say(`Conectado · Partida-mestre ${view.motherCode} · ${view.playerOrder.length} ${view.playerOrder.length===1?'jogador':'jogadores'} na partida`);
  lastRefreshFailure=0;
 }catch(e){
  if(token!==requestedToken||currentUser?.id!==requestedUser)return;
  lastRefreshFailure=Date.now();
  const invalid=/sessão inválida|outra conta/i.test(e?.message||'');
  if(invalid){
   token='';localStorage.removeItem(accountTokenKey(currentUser.id));
   $('login').hidden=false;$('board').hidden=true;
   say('A sessão da partida expirou. Entre novamente com o código da partida.',true);
  }else{
   // Falhas de rede não apagam o token nem deixam a tela sem saída.
   $('board').hidden=true;$('login').hidden=false;
   say('Não foi possível recuperar a partida ('+(e?.message||'erro de conexão')+'). Use Tentar reconectar abaixo. Seu vínculo foi preservado.',true);
  }
 }finally{refreshInFlight=false}
}
function missionFeedback(message,error=false){const el=$('dv4MissionFeedback');if(el){el.hidden=false;el.textContent=message;el.classList.toggle('mp-error',error)}}
function positionFeedback(message,error=false){const el=$('correctPositionFeedback');if(el){el.hidden=false;el.textContent=message;el.classList.toggle('mp-error',error)}}
async function action(type,data={}){if(busy){if(type==='missionAttempt')missionFeedback('Aguarde a conclusão da ação anterior.');return}busy=true;try{const prior=view;view=await api('action',{token,expectedRevision:view.revision,type,...data});recordResourceChanges(prior,view);if(type==='setup'&&view.me.setupDone){resourceQueue.length=0;resourceDialog?.close()}saveCommon();void audio.update(view);draw();if(type==='setup'&&view.me.setupDone)showInitialResourceReceipt(view.me);say(`Ação registrada · rodada ${view.round}`);if(type==='correctPosition')positionFeedback(`Posição atualizada para a casa ${view.me.house}.`);if(type==='missionAttempt')missionFeedback(view.me.missionRewardPending?'SUCESSO! Role o D4 físico para determinar a recompensa.':'Teste registrado: missão não concluída nesta tentativa.');if(type==='missionD4')missionFeedback('Recompensa da missão registrada.')}catch(e){const msg=e.message;await refresh();say(msg,true);if(type==='correctPosition')positionFeedback('Correção não realizada: '+msg,true);if(type==='missionAttempt'||type==='missionD4')missionFeedback('Não foi possível registrar o dado: '+msg,true)}finally{busy=false}}
async function correctPosition(){
 const house=Number($('correctHouse')?.value),reason=($('correctReason')?.value||'').trim();
 if(view?.phase!=='active'){positionFeedback('A correção só é permitida durante a partida ativa.',true);return}
 if(!Number.isInteger(house)||house<1||house>49){positionFeedback('Escolha uma casa entre 1 e 49.',true);return}
 if(reason.length<6){positionFeedback('Descreva o motivo da correção com pelo menos 6 caracteres.',true);return}
 if(Math.abs(house-view.me.house)>6){positionFeedback('A correção pode alterar no máximo 6 casas por vez.',true);return}
 if(house===view.me.house){positionFeedback('A peça já está registrada nessa casa.');return}
 await action('correctPosition',{house,reason});
}
async function enter(route,mode='multiplayer'){try{const secretHistory=JSON.parse(localStorage.getItem(historyKey)||'[]'),commonHistory=JSON.parse(localStorage.getItem(commonKey)||'[]');const res=await api(route,{name:$('name').value,team:$('team').value,code:$('code').value,mode,secretHistory,commonHistory});token=res.token;localStorage.setItem(accountTokenKey(currentUser.id),token);await refresh();if(view?.me.secretMissionId){localStorage.setItem(historyKey,JSON.stringify([...secretHistory,view.me.secretMissionId].slice(-160)))}}catch(e){say(e.message,true)}}
const die=(type,max,extra={})=>`<div class="dice">${Array.from({length:max},(_,i)=>`<button data-action="${type}" data-roll="${i+1}" ${Object.entries(extra).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')}>${i+1}</button>`).join('')}</div>`;
const partyHistoryKey=uid=>'dorath.v4.parties.'+uid;
function savedParties(){
 if(!currentUser)return [];
 try{return (JSON.parse(localStorage.getItem(partyHistoryKey(currentUser.id))||'[]')||[]).filter(x=>x&&x.token&&x.code).slice(0,12)}catch{return []}
}
function rememberParty(v){
 if(!currentUser||!token||!v?.motherCode)return;
 const others=savedParties().filter(x=>x.token!==token);
 const entry={token,code:v.motherCode,name:v.me?.name||'Jogador',mode:v.mode||'multiplayer',updated:Date.now()};
 try{localStorage.setItem(partyHistoryKey(currentUser.id),JSON.stringify([entry,...others].slice(0,12)))}catch{}
}
function partyHistoryHTML(){
 const list=savedParties();
 return list.length?`<section class="dv4-party-history"><h4>MINHAS PARTIDAS NESTE APARELHO</h4><p>Partidas anteriormente acessadas nesta conta. Os registros permanecem neste navegador até seus dados locais serem apagados.</p><div class="dv4-party-grid">${list.map(x=>`<button type="button" data-party-token="${esc(x.token)}"><b>${esc(x.code)}</b><small>${x.mode==='solo'?'Solo':'Grupo'} · ${esc(x.name)}</small></button>`).join('')}</div></section>`:'';
}
const names=()=>view.rooms.flatMap(r=>r.players);
const choices=(items,skip)=>items.filter(q=>q.id!==skip).map(q=>`<option value="${esc(q.id)}">${esc(q.name)}</option>`).join('');
// Estado visual local: nao altera regras nem sessao da partida.
const dv4PlayerExpanded=new Set(['player','collection']);
let dv4SelectionOrder=[];
let dv4SelectionPlayer='';
function syncSelectedCharacters(p){
 if(dv4SelectionPlayer!==p.id){dv4SelectionPlayer=p.id;dv4SelectionOrder=[]}
 const active=new Set(p.characters||[]);
 dv4SelectionOrder=dv4SelectionOrder.filter(id=>active.has(id));
 for(const id of p.characters||[])if(!dv4SelectionOrder.includes(id))dv4SelectionOrder.push(id);
}
function selectAtMostTwo(target){
 const checked=[...document.querySelectorAll('#player .char-check:checked')];
 if(target.checked){
  dv4SelectionOrder=dv4SelectionOrder.filter(id=>id!==target.value);
  dv4SelectionOrder.push(target.value);
 }else dv4SelectionOrder=dv4SelectionOrder.filter(id=>id!==target.value);
 while(dv4SelectionOrder.length>2){
  const oldest=dv4SelectionOrder.shift();
  const previous=[...document.querySelectorAll('#player .char-check')].find(el=>el.value===oldest);
  if(previous)previous.checked=false;
 }
 for(const el of checked)if(!dv4SelectionOrder.includes(el.value))el.checked=false;
}

function organizePlayerPanels(p,v){
 const root=$('player');
 const gallery=root.querySelector('.dv4-character-gallery');
 if(!gallery)return;
 const create=(id,title,open)=>{const details=document.createElement('details');details.className='dv4-player-section';details.dataset.section=id;details.open=dv4PlayerExpanded.has(id);const heading=document.createElement('summary');heading.textContent=title;details.append(heading);details.addEventListener('toggle',()=>{if(details.open)dv4PlayerExpanded.add(id);else dv4PlayerExpanded.delete(id)});return details};
 const intro=create('player','CARTA DO JOGADOR');
 const collection=create('collection','MINHA COLEÇÃO');
 const recruit=create('recruit','RECRUTAR PERSONAGEM');
 const available=create('available','PERSONAGENS DESBLOQUEADOS');
 const locked=create('locked','PERSONAGENS BLOQUEADOS');
 // As linhas originais continuam no DOM para os componentes visuais da V4.
 [...root.children].filter(el=>el.tagName==='H3'||el.tagName==='P').forEach(el=>intro.append(el));
 // Mantem os dados legados no DOM para a carta ampliada e a faixa de resumo V4.
 [...intro.children].filter(el=>el.tagName==='H3'||el.tagName==='P').forEach(el=>el.classList.add('dv4-legacy-data'));
 const resource=(key)=>Number(p.resources?.[key]??0);
 const secret=v.secretMission;
 const dashboard=document.createElement('div');
 dashboard.className='dv4-player-dashboard';
 dashboard.innerHTML=`<div class="dv4-heritage"><span>HERANÇA</span><strong>${resource('heranca')}</strong></div>
 <div class="dv4-resource-grid">
 ${[['provisoes','PROVISÕES'],['influencia','INFLUÊNCIA'],['conhecimento','CONHECIMENTO']].map(([key,name])=>`<div class="dv4-resource-stat"><small>${name}</small><strong>${resource(key)}</strong></div>`).join('')}
 </div>
 <div class="dv4-secret-panel"><small>MISSÃO SECRETA · ${esc(secret?.id||'—')}</small><strong>${esc(secret?.name||'Aguardando missão')}</strong><p>${esc(secret?.condition||'')}${p.secretCompletedAt?' · ✓ CUMPRIDA':''}</p></div>
 <div class="dv4-history-grid">
 ${[['CONVERSÕES',p.conversionCount],['INTERAÇÕES',p.tradeCount],['MISSÕES',p.missionSuccesses]].map(([name,n])=>`<div class="dv4-history-stat"><small>${name}</small><strong>${Number(n??0)}</strong></div>`).join('')}
 </div>`;
 intro.append(dashboard);
 const collectionInfo=root.querySelector('.dv4-collection-panel');
 if(collectionInfo){collectionInfo.querySelector('h4')?.remove();collection.append(collectionInfo)}
 const ownedGrid=document.createElement('div');ownedGrid.className='dv4-gallery-grid dv4-owned-grid';
 const availableGrid=document.createElement('div');availableGrid.className='dv4-gallery-grid';
 const lockedGrid=document.createElement('div');lockedGrid.className='dv4-gallery-grid';
 const rows=[...gallery.querySelectorAll('.dv4-character-option')];
 rows.sort((a,b)=>{
  const rank=el=>el.classList.contains('dv4-owned')?(p.characters.includes(el.dataset.characterId)?0:1):el.classList.contains('dv4-unlocked')?2:3;
  return rank(a)-rank(b);
 });
 for(const card of rows){
  if(card.classList.contains('dv4-owned'))ownedGrid.append(card);
  else if(card.classList.contains('dv4-unlocked'))availableGrid.append(card);
  else lockedGrid.append(card);
 }
 if(ownedGrid.children.length)collection.append(ownedGrid);
 const confirm=gallery.querySelector('[data-action="characters"]');
 if(confirm)collection.append(confirm);
 if(availableGrid.children.length)available.append(availableGrid);
 else available.append(Object.assign(document.createElement('p'),{textContent:'Nenhuma carta disponível para aquisição neste momento.'}));
 if(lockedGrid.children.length)locked.append(lockedGrid);
 for(const box of [...root.querySelectorAll('.dv4-free-recruit,.dv4-paid-recruit')]){
  if(box.classList.contains('dv4-paid-recruit')){
   box.querySelector('h4')?.remove();
   const grid=document.createElement('div');grid.className='dv4-recruit-tiles';
   for(const element of [...box.children]){
    if(element.matches('label,.dv4-recruit-actions,.dice,#recruitHistoryNote')){
     const tile=document.createElement('div');tile.className='dv4-recruit-tile';
     if(element.matches('.dv4-recruit-actions,.dice'))tile.classList.add('dv4-recruit-tile-wide');
     tile.append(element);grid.append(tile);
    }else if(element.matches('p')){element.classList.add('dv4-recruit-note');grid.append(element)}
    else grid.append(element);
   }
   box.append(grid);
  }
  recruit.append(box);
 }
 if(!recruit.querySelector('.dv4-free-recruit'))recruit.append(Object.assign(document.createElement('p'),{textContent:'Nenhuma aquisição disponível neste momento.'}));
 const heading=document.createElement('h3');heading.className='dv4-player-heading';heading.textContent='JOGADOR';
 root.replaceChildren(heading,intro,collection,recruit,available,...(lockedGrid.children.length?[locked]:[]));
}
const characterCatalog=[["adao","Adão","01_ADAO.webp"],["eva","Eva","02_EVA.webp"],["caim","Caim","03_CAIM.webp"],["abel","Abel","04_ABEL.webp"],["sete","Sete","05_SETE.webp"],["lameque-caim","Lameque (linhagem de Caim)","06_LAMEQUE_LINHAGEM_DE_CAIM.webp"],["enoque-caim","Enoque (linhagem de Caim)","07_ENOQUE_LINHAGEM_DE_CAIM.webp"],["jabal","Jabal","08_JABAL.webp"],["jubal","Jubal","09_JUBAL.webp"],["tubalcaim","Tubalcaim","10_TUBALCAIM.webp"],["enos","Enos","11_ENOS.webp"],["enoque-sete","Enoque (linhagem de Sete)","12_ENOQUE_LINHAGEM_DE_SETE.webp"],["matusalem","Matusalém","13_MATUSALEM.webp"],["lameque-noe","Lameque (linhagem de Sete)","14_LAMEQUE_LINHAGEM_DE_SETE.webp"],["noe","Noé","15_NOE.webp"],["sem","Sem","16_SEM.webp"],["cam","Cam","17_CA.webp"],["jafe","Jafé","18_JAFE.webp"]];
function draw(){const v=view,p=v.me,host=p.id===v.hostPlayerId,turn=v.turnPlayerId===p.id;
 syncSelectedCharacters(p);
 $('summary').innerHTML=`<h2>${esc(v.house?.code||'P1-'+String(p.house*10).padStart(3,'0'))} · ${esc(v.house?.name||'Casa')}</h2><p>${esc(v.house?.family||'')} · Rodada ${v.round} · ${esc(v.phase)} · Violência ${v.violence}</p><p>${esc(v.house?.rule||'')}</p><p>Arca: ${p.preserved?'PRESERVADO / ENTROU':p.arkFinalized?'NÃO ENTROU':'entrada em aberto'} ${v.preparationClosed?'· fechada':''}</p>`;
 $('rooms').innerHTML=`<h3>Partida-mestre ${esc(v.motherCode)}</h3>${v.rooms.map(r=>`<p><b>${esc(r.name)} · ${esc(r.code)}</b><br>${r.players.map(q=>`${esc(q.name)} P1-${String(q.house*10).padStart(3,'0')}`).join(' · ')}</p>`).join('')}${v.phase==='lobby'&&host?'<input id="roomName" placeholder="Nome da nova sala"><button data-action="roomCreate">Criar sala</button>':''}`;
 $('rooms').insertAdjacentHTML('beforeend',partyHistoryHTML());
 $('player').dataset.setupDone=String(Boolean(p.setupDone));
 $('player').innerHTML=`<h3>${esc(p.name)} · Carta do Jogador</h3><p>${Object.entries(p.resources).map(([k,n])=>`${label[k]}: <b>${n}</b>`).join(' · ')}</p><p><b>Missão Secreta ${esc(v.secretMission?.id)}:</b> ${esc(v.secretMission?.name)} — ${esc(v.secretMission?.condition)} ${p.secretCompletedAt?'✓ cumprida':''}</p><p>Personagens (até 2): ${p.characters.map(esc).join(', ')}</p><p>Conversões: ${p.conversionCount} · Interações: ${p.tradeCount} · Missões: ${p.missionSuccesses}</p>${p.setupDone?`<div class="dv4-character-gallery"><h4>Galeria de Personagens</h4><p>Cartas coloridas estão liberadas. Marque os personagens em uso.</p><div class="dv4-gallery-grid">${characterCatalog.map(([id,name,asset])=>{const c=v.availableCharacters.find(x=>x.id===id);const unlocked=Boolean(c),owned=(p.ownedCharacters||p.characters).includes(id),canEdit=p.setupDone&&v.phase!=='ended'&&p.house<50;return `<div class="dv4-character-option ${unlocked?'dv4-unlocked':'dv4-locked'} ${owned?'dv4-owned':'dv4-not-owned'}" data-character-id="${id}" data-character-name="${esc(name)}" data-character-stats="${c?`Conhecimento ${c.attributes?.conhecimento??"—"} · Influência ${c.attributes?.influencia??"—"} · Herança ${c.attributes?.heranca??"—"}`:""}" data-character-art="assets/personagens/${asset}"><img class="dv4-gallery-art" loading="lazy" alt="Carta ${esc(name)}" src="assets/personagens/${asset}">${unlocked?(owned?`<label class="dv4-gallery-select"><input class="char-check" type="checkbox" value="${id}" ${p.characters.includes(id)?'checked':''} ${!canEdit?'disabled':''}> Em uso</label>`:'<p class="dv4-available-label">Desbloqueado · não adquirido</p>'):''}</div>`}).join('')}</div>${p.setupDone&&v.phase!=='ended'&&p.house<50?'<button data-action="characters">Confirmar personagens ativos</button>':'<p class="dv4-gallery-pause">A seleção de personagens fica disponível após preparar a partida.</p>'}</div>`:''}`;
 if(p.setupDone){
  const owned=p.ownedCharacters||p.characters;
  const nameOf=id=>characterCatalog.find(c=>c[0]===id)?.[1]||id;
  const preMove=p.setupDone&&v.phase!=='ended'&&p.house<50;
  const remaining=owned.filter(id=>!p.characters.includes(id));
  const selectedMissionCharacter=p.characters.length===1?p.characters[0]:p.missionCharacterId;
   const options=p.characters.map(id=>`<option value="${esc(id)}" ${selectedMissionCharacter===id?'selected':''}>${esc(nameOf(id))}</option>`).join('');
  $('player').insertAdjacentHTML('beforeend',`<section class="dv4-collection-panel"><h4>MINHA COLEÇÃO · ${owned.length}/${p.characterCapacity||2}</h4><p><b>Em uso:</b> ${p.characters.length?p.characters.map(nameOf).map(esc).join(' · '):'Nenhum personagem ativo'}</p><p><b>Reserva:</b> ${remaining.length?remaining.map(nameOf).map(esc).join(' · '):'Nenhum'}</p><p><b>Responsável pelas Missões:</b> ${selectedMissionCharacter?esc(nameOf(selectedMissionCharacter)):'Aguardando escolha na Carta do Jogador'}</p></section>`);
 }
 if(Array.isArray(p.freeCharacterChoices)&&p.freeCharacterChoices.length){
  const free=Math.max(0,(p.characterCapacity||2)-(p.ownedCharacters?.length||p.characters.length));
  const candidates=p.freeCharacterChoices.map(id=>characterCatalog.find(c=>c[0]===id)).filter(Boolean);
  const panel=`<section class="dv4-free-recruit" role="group" aria-label="Escolha gratuita de personagens"><h4>ESCOLHA DE PERSONAGENS</h4><p>Você tem <b>${free} vaga(s) gratuita(s)</b>. Escolha ${free} entre os personagens desbloqueados:</p><div class="dv4-free-recruit-options">${candidates.map(c=>`<label><input type="checkbox" class="free-char-check" value="${esc(c[0])}"> ${esc(c[1])}</label>`).join('')}</div><button type="button" data-action="freeCharacterChoice">Confirmar escolha gratuita</button></section>`;
  $('player').insertAdjacentHTML('afterbegin',panel);
 }
 const ownedIds=p.ownedCharacters||p.characters;
 const recruits=v.availableCharacters.filter(c=>!ownedIds.includes(c.id));
 if(p.setupDone&&v.phase==='active'&&turn&&p.house<50&&p.lastMovedRound!==v.round&&ownedIds.length>=(p.characterCapacity||2)&&recruits.length){
  const opt=recruits.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  const old=ownedIds.map(id=>characterCatalog.find(c=>c[0]===id)).filter(Boolean).map(c=>`<option value="${esc(c[0])}">${esc(c[1])}</option>`).join('');
  $('player').insertAdjacentHTML('beforeend',`<section class="dv4-free-recruit dv4-paid-recruit"><h4>RECRUTAR PERSONAGEM</h4><p>Selecione uma carta desbloqueada e qual carta da sua coleção será devolvida quando a aquisição for bem-sucedida.</p><label>Nova carta<select id="recruitTarget">${opt}</select></label><label>Devolver à reserva geral<select id="recruitReplace">${old}</select></label><p id="recruitHistoryNote"></p><div class="dv4-recruit-actions"><button type="button" data-action="recruitDirect">Adquirir por 3 Influências</button><button type="button" data-action="recruitGuarantee" id="recruitGuarantee">Garantir por 1 Influência após 2 falhas</button></div><p>Tentativa: pague 1 Influência e informe seu D6 físico (4, 5 ou 6 para sucesso).</p><div class="dice">${Array.from({length:6},(_,i)=>`<button type="button" data-action="recruitRoll" data-roll="${i+1}">${i+1}</button>`).join('')}</div></section>`);
  const updateNote=()=>{const h=p.recruitHistory?.[$('recruitTarget')?.value]||{failures:0,lastAttemptRound:0};const usedThisRound=h.lastAttemptRound===v.round;const eligible=h.failures>=2&&!usedThisRound;$('recruitHistoryNote').textContent=`Falhas nesta carta: ${h.failures}/2${h.lastAttemptRound===v.round?' · próxima tentativa na rodada seguinte':''}`;$('recruitGuarantee').disabled=!eligible;document.querySelectorAll('#player [data-action="recruitRoll"]').forEach(b=>{b.disabled=usedThisRound||h.failures>=2})};
  $('recruitTarget').addEventListener('change',updateNote);updateNote();
 }
 organizePlayerPanels(p,v);
 let movement='<h3>Turno e movimento</h3>';
 if(v.phase==='lobby')movement+=!p.setupDone?`<p>Role fisicamente 3D6 e distribua os resultados conforme sua escolha.</p><div class="dv4-setup-rolls">${['conhecimento','influencia','provisoes'].map((k,i)=>`<label class="dv4-setup-row" for="setupRoll${i}"><span>${label[k]}</span><select id="setupRoll${i}" aria-label="Resultado para ${label[k]}">${Array.from({length:6},(_,j)=>`<option value="${j+1}">${j+1}</option>`).join('')}</select></label><input type="hidden" id="setupDest${i}" value="${k}">`).join('')}</div><div class="dv4-setup-actions"><button data-action="setup">Confirmar 3D6</button></div>`:(v.mode==='solo'?'<p>Preparação concluída. Iniciando sua aventura solo.</p>':'<p>Recursos iniciais registrados. Aguardando os demais jogadores.</p>');

 if(v.phase==='active'&&turn&&p.house<50){movement+=p.lastMovedRound===v.round?(v.round===1&&p.house===2?'<p>Entrada inicial concluída: Casa 02, sem D6. Resolva a bênção e atualize as fichas físicas.</p>':'<p>Movimento desta rodada registrado.</p>'):(v.round===1&&p.house===1?'<p>Na primeira rodada, a entrada na Casa 02 é automática. Aguarde a sincronização.</p>':'<p>Antes de avançar, você pode tentar sua Missão, negociar, converter recursos ou enfrentar Ameaças. Para avançar, role o D6 físico e informe o número: o aplicativo sorteará um deslocamento obrigatório de 1 a 3 casas.</p>'+die('move',6));movement+='<button data-action="endTurn">'+(p.lastMovedRound===v.round?'Encerrar turno':'Permanecer e encerrar turno')+'</button>'}
 if(v.phase==='active'&&!turn)movement+='<p>Aguarde seu turno.</p>';
 if(v.phase==='house-occurrence')movement+=v.pendingHouseOccurrence?.initiator===p.id?'<div class="dv4-intro-event-hint" role="status">Resolva a ocorrência na aba <span class="dv4-intro-event-target">Eventos</span> antes de continuar.</div>':'<p>Aguarde a resolução da ocorrência pelo jogador atual.</p>';
 if(v.phase==='marco-roll')movement+=`<p>Marco ${v.pendingMarco.house}: D4 coletivo pelo primeiro jogador.</p>${v.pendingMarco.initiator===p.id?die('marcoD4',4):''}`;
 if(v.phase==='marco-individual')movement+=`<p>Envolvimento individual ao parar no Marco: D4 físico separado.</p>${v.pendingMarco.initiator===p.id?die('marcoIndividualD4',4):''}`;
 if(v.phase==='rupture-prep')movement+=v.pendingRupture.prepared.includes(p.id)?'<p>Aguarde a última preparação dos demais.</p>':`<p>Uma última ação antes da Ruptura.</p><button data-action="preparePass">Passar</button><button data-action="prepareMission">Tentar Missão atual</button><button data-action="prepareConvert">Converter recurso</button>`;
 if(v.phase==='rupture-roll')movement+=`<p>Ruptura P1-${String(v.pendingRupture.house*10).padStart(3,'0')}: D4 coletivo pelo primeiro jogador.</p>${v.pendingRupture.initiator===p.id?die('ruptureD4',4):''}`;
 if(v.phase==='active'&&p.house===50&&!p.arkFinalized)movement+=`<p>Fechamento obrigatório da Arca.</p>${p.preserved?'<button data-action="arkConfirm">Confirmar entrada antecipada</button>':`<select id="arkCharacter">${p.characters.map(id=>`<option>${esc(id)}</option>`).join('')}</select><button data-action="arkFinalEnter">Pagar 3 Provisões e entrar</button><button data-action="arkFinalOutside">Registrar NÃO ENTROU</button>`}`;
 if(v.phase==='active'&&p.house===48&&!p.preserved)movement+=`<p>Entrada antecipada possível somente nesta casa.</p><select id="arkEarlyCharacter">${p.characters.map(id=>`<option>${esc(id)}</option>`).join('')}</select><button data-action="arkEnter">Entrar na Arca</button>`;
 if(v.preparationClosed&&p.preserved&&p.preservationBonus===null)movement+=`<p>Role seu D6 secreto de Preservação. Ele só será aplicado em P1-540.</p>${die('preservationD6',6)}`;
 if(v.preparationClosed&&host&&v.phase==='active'&&[50,51,53].includes(p.house))movement+='<button data-action="advanceFinal">Avançar sequência final coletiva</button>';
 if(v.phase==='ended'){
  const ranking=v.finalScores||[];
  const myResult=ranking.find(result=>result.id===p.id);
  const secretDone=Boolean(p.secretCompletedAt);
  const single=v.mode==='solo'||v.playerOrder.length===1;
  movement+=`<section class="dv4-final-screen" aria-label="Conclusão do Período 1" role="status">
    <div class="dv4-final-kicker">JORNADA CONCLUÍDA</div>
    <h4>PERÍODO 1 · ÉDEN AO DILÚVIO</h4>
    <p class="dv4-final-lead">Você chegou à última casa da jornada. O resultado do Período 1 foi registrado.</p>
    <div class="dv4-final-grid">
      <div><small>CASA FINAL</small><strong>54</strong></div>
      <div><small>ARCA</small><strong>${p.preserved?'ENTROU':'NÃO ENTROU'}</strong></div>
      <div><small>MISSÃO SECRETA</small><strong>${secretDone?'CUMPRIDA':'NÃO CUMPRIDA'}</strong></div>
      <div><small>PONTUAÇÃO</small><strong>${myResult?myResult.score+' pontos':'Sem pontuação classificatória'}</strong></div>
    </div>
    ${p.preserved?'<p class="dv4-final-outcome">Seu personagem foi preservado na Arca.</p>':'<p class="dv4-final-outcome">Seu personagem não entrou na Arca. A pontuação classificatória é reservada aos preservados.</p>'}
    ${!single?'<h5>CLASSIFICAÇÃO FINAL</h5>':''}
    ${!single?(ranking.length?`<ol class="dv4-final-ranking">${ranking.map(result=>`<li><span>${esc(result.name)}</span><strong>${result.score} pontos</strong></li>`).join('')}</ol>`:'<p>Nenhum jogador preservado para classificação.</p>'):''}
    <p class="dv4-final-footnote">A pontuação e o cumprimento da Missão Secreta seguem as regras registradas da partida.</p>
   </section>`;
 }
 const hasMissionStep=v.phase==='active'&&turn&&(
  Boolean(p.missionRewardPending)||
  (p.missionUsedRound!==v.round&&(
    Boolean(p.mission)||Boolean(v.availableMission)
  ))
 );

 $('movement').innerHTML=movement.replace(/<p(?=>)/g,'<p class="dv4-movement-status"');
 $('movement').dataset.missionStep=String(hasMissionStep);
 $('movement').dataset.isMyTurn=String(turn);
 const missionAttrs=p.mission?(p.mission.id==='M06'||p.mission.id==='M09'||p.mission.id==='M15'?[]:p.mission.requirement.includes('Conhecimento ou Influência')?['conhecimento','influencia']:p.mission.requirement.includes('Conhecimento')?['conhecimento']:p.mission.requirement.includes('Influência')?['influencia']:[]):[];
let mission='<h3>Missão comum</h3>';
 if(!p.setupDone)mission+='<p>Confirme os atributos iniciais em Jogar antes de acessar Missões.</p>';
 if(p.mission)mission+=`<div class="dv4-mission-details"><div class="dv4-mission-field dv4-mission-field-name"><span>MISSÃO</span><strong>${esc(p.mission.name)}</strong></div><div class="dv4-mission-field"><span>DIFICULDADE</span><strong>${esc(p.mission.difficulty)} · alvo ${p.mission.target}</strong></div><div class="dv4-mission-field"><span>REQUISITO</span><strong>${esc(p.mission.requirement)}</strong></div><div class="dv4-mission-field dv4-mission-field-reward"><span>RECOMPENSA</span><strong>${esc(p.mission.baseReward)}</strong></div></div>`;
 if(p.missionRewardPending)mission+=`<p>Sucesso confirmado; role D4 físico separado para a recompensa.</p>${['M11','M19'].includes(p.mission.id)?`<label>Jogador beneficiado<select id="missionOther">${choices(names(),p.id)}</select></label>`:''}${p.mission.id==='M19'?'<label>Recompensa<select id="missionRewardOption"><option value="outro">Provisões para o outro</option><option value="ambos">1 Provisão para cada um</option></select></label>':p.mission.id==='M20'?'<label>Recompensa<select id="missionRewardOption"><option value="provisoes">Provisões</option><option value="heranca">Herança</option></select></label>':''}${die('missionD4',4)}`;
 else if(v.phase==='active'&&turn&&p.mission&&p.missionUsedRound!==v.round)mission+=missionAttrs.length? `<div class="dv4-mission-bonus"><div class="dv4-mission-support-heading">PERSONAGEM DE APOIO</div><div class="dv4-mission-character-buttons">${p.characters.map(id=>`<button type="button" data-action="missionCharacterSelect" data-character="${esc(id)}" class="dv4-mission-character-button ${(p.characters.length===1?p.characters[0]:p.missionCharacterId)===id?'is-active':''}" aria-pressed="${(p.characters.length===1?p.characters[0]:p.missionCharacterId)===id}">${esc(characterCatalog.find(c=>c[0]===id)?.[1]||id)}</button>`).join('')||'<p>Nenhum personagem ativo.</p>'}</div><input type="hidden" id="missionCharacter" value="${esc(p.characters.length===1?p.characters[0]:p.missionCharacterId||'')}">${missionAttrs.length>1?`<label>Atributo<select id="missionAttribute">${missionAttrs.map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select></label>`:`<div class="dv4-test-attribute"><span>ATRIBUTO DO TESTE</span><strong>${label[missionAttrs[0]]}</strong></div>`}<div class="dv4-bonus-table-wrap"><div class="dv4-bonus-heading">TABELA DE BÔNUS</div><table class="dv4-bonus-table"><thead><tr><th scope="col">ATRIBUTO</th><th scope="col">0–1</th><th scope="col">2–3</th><th scope="col">4</th></tr></thead><tbody><tr><th scope="row">BÔNUS</th><td>+0</td><td>+1</td><td>+2</td></tr></tbody></table><small class="dv4-bonus-caption">Consulte o atributo na Carta de Personagem.</small></div></div>`:`<div class="dv4-mission-bonus"><label>SEM BÔNUS DE PERSONAGEM</label><small>Esta missão ainda não define um atributo de Personagem. Teste apenas com D6 e outros efeitos expressos.</small></div>`;
 if(v.phase==='active'&&turn&&p.mission&&!p.missionRewardPending&&p.missionUsedRound!==v.round)mission+=`<p class="dv4-mission-roll-title">ROLE O D6 FÍSICO</p><div class="dv4-mission-dice">${die('missionAttempt',6).replace('<div class="dice">','<div class="dice" style="display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:4px!important;flex-wrap:nowrap!important">')}</div>`;
 mission+='<p id="dv4MissionFeedback" class="dv4-mission-feedback" role="status" aria-live="polite" hidden></p>';
 if(v.mode==='solo'&&p.mission?.id==='M19'&&v.phase==='active'&&turn)mission+='<p class="dv4-solo-mission-fix">Esta missão exige outro jogador e não se aplica à aventura solo. Substitua-a gratuitamente para continuar.</p><button data-action="missionOffer">Substituir missão incompatível (grátis)</button>';
 else if(p.setupDone&&v.phase==='active'&&v.availableMission&&turn)mission+=`<button data-action="missionOffer">${p.mission?'Trocar Missão por 1 Influência':'Gerar Missão'}</button><button data-action="missionDecline">Ignorar oportunidade</button>`;
 $('missions').innerHTML=!turn?'<h3>Missão comum</h3><p class="dv4-mission-wait">Aguarde seu turno.</p>':mission;
 $('missions').dataset.missionStep=String(turn&&hasMissionStep);
 let world='<h3>Eventos</h3>';
 if(v.phase==='house-occurrence'&&v.pendingHouseOccurrence?.initiator===p.id){
  const o=v.house?.occurrence;
  world+=`<div class="dv4-house-occurrence"><h4>${esc(v.house?.name||'Ocorrência')}</h4><p>${esc(o?.narrative||'Resolva a ocorrência desta casa.')}</p>`;
  if(o?.type==='resourceChoice')world+=`<label>Escolha o recurso<select id="houseOccurrenceChoice">${o.choices.map(k=>`<option value="${esc(k)}">${esc(label[k]||k)}</option>`).join('')}</select></label><button data-action="houseOccurrenceResolve">Receber +${o.amount||1}</button>`;
  else world+='<button data-action="houseOccurrenceResolve">Continuar</button>';
  world+='</div>';
 }
 if(v.phase==='consequence-draw'&&v.pendingConsequencePlayers[0]===p.id)world+=`<p>Compre a carta física do topo; identifique-a e devolva ao fundo após resolver.</p><select id="consequenceCard">${v.consequenceCards.map(c=>`<option value="${esc(c.id)}" data-asset="${esc(c.asset)}">${esc(c.name)}</option>`).join('')}</select><img id="consequencePreview" class="card-preview" src="assets/consequencias/${esc(v.consequenceCards[0].asset)}" alt="Arte da Consequência"><label>D4 físico<select id="consequenceD4">${[1,2,3,4].map(i=>`<option>${i}</option>`).join('')}</select></label><button data-action="consequence">Resolver carta</button>`;
 if(v.phase==='threat-spawn')world+=`<p>Nefilim ${esc(v.pendingThreat.card)}: revele a carta física. ${v.pendingThreat.initiator===p.id?'Informe o D4 de surgimento.':'Aguarde o D4 de quem acionou a Ameaça.'}</p>${v.pendingThreat.initiator===p.id?die('threatSpawnD4',4):''}`;
 if(v.phase==='active'&&p.house===47)world+=`<p>Checkpoint: ${p.readyAt47?'PRONTO':'EM RISCO'}</p>`;
 if(v.globalStates.MANDAMENTO&&p.house===6&&!p.mandamentoChoice)world+='<p>Mandamento no Éden:</p><button data-action="mandamentoRefuse">Recusar o fruto</button><button data-action="mandamentoOpen">Manter escolha aberta</button>';
 if(v.phase==='active'&&p.house===7&&v.globalStates.MANDAMENTO)world+=`<h4>Escolhas das árvores · apresentadas em P1-040</h4><p>O Mandamento já está ativo; resolva apenas a escolha mecânica, sem reapresentar as árvores.</p>${!p.specialChoices.vida?'<button data-action="vidaHeranca">Árvore da Vida: +2 Herança</button><button data-action="vidaProvisoes">Árvore da Vida: +2 Provisões</button>':''}${p.mandamentoChoice==='recusou'?'<p>Você já recusou o fruto na Casa 06. Essa decisão está mantida.</p>':p.mandamentoChoice==='não recusou'&&!p.specialChoices.conhecimento?'<button data-action="conhecimentoAceitar">Árvore do Conhecimento: +3 Conhecimento, −5 Herança</button><button data-action="conhecimentoRecusar">Recusar</button>':''}`;
 if(v.phase==='active'&&p.house===49&&!p.preserved&&!p.lastChanceUsed)world+=`<p>Última Oportunidade: teste de recuperação de playtest (D6 ≥ 5 concede 1 Provisão).</p>${die('lastChance',6)}`;
 if(v.phase==='active'&&p.house>=12&&p.house<50){world+=`<h4>Converter (uma vez por turno)</h4><select id="conversionRate">${['2 Conhecimento → 1 Influência','2 Influência → 1 Conhecimento','3 Conhecimento → 1 Provisão','3 Influência → 1 Provisão','2 Provisões → 1 Conhecimento','2 Provisões → 1 Influência'].map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select><button data-action="convert">Converter</button>`}
 world+=`<h4>Conferência de posição</h4><p>Posição registrada: <b>Casa ${p.house} · P1-${String(p.house*10).padStart(3,'0')} · ${esc(v.house?.name||'Casa')}</b>. Use a correção somente se a peça física e o app divergirem.</p><input id="correctHouse" type="number" min="1" max="49" value="${p.house}" aria-label="Número da casa"><input id="correctReason" placeholder="Motivo da correção (mín. 6 caracteres)" maxlength="180"><p class="dv4-position-hint">Corrige apenas sua peça, até 6 casas de distância e sem atravessar Rupturas pendentes.</p><button data-action="correctPosition">Corrigir posição</button><p id="correctPositionFeedback" class="dv4-position-feedback" role="status" aria-live="polite" hidden></p>`;
 $('world').innerHTML=world;
 let th='<h3>Ameaças coletivas</h3>';
 th+=v.activeThreats.map(t=>`<div class="mp-chip"><b>${esc(t.name).replace(/corruptor/gi,'Corruptor')}</b><div class="dv4-threat-progress" role="group" aria-label="Sucessos contra esta ameaça"><div class="dv4-threat-progress-label"><span>SUCESSOS ACUMULADOS</span><strong>${Math.min(3,Math.max(0,Number(t.successes)||0))}/3</strong></div><div class="dv4-threat-track" role="progressbar" aria-label="Progresso contra ${esc(t.name)}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${Math.min(3,Math.max(0,Number(t.successes)||0))}"><span style="width:${Math.min(3,Math.max(0,Number(t.successes)||0))*100/3}%"></span></div></div> ${t.aggravated?'<p class="dv4-threat-warning"><strong>AMEAÇA AGRAVADA</strong><span>O agravamento aumenta a penalidade coletiva na Ruptura da casa 52. O Opressor também amplia a perda de Provisões por rodada. Consulte a carta física para os detalhes narrativos.</span></p>':''}${v.phase==='active'&&turn?`<label class="dv4-threat-attribute">ATRIBUTO DO TESTE<select id="attr-${esc(t.id)}">${(t.card==='opressor'?['conhecimento','influencia']:t.card==='dominador'?['influencia','heranca']:['conhecimento','heranca']).map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select></label>${die('threatAttempt',6,{threat:t.id})}`:''}</div>`).join('');
 if(['threat-failure','threat-reward'].includes(v.phase)&&v.pendingThreatResult?.by===p.id)th+=`<p>${v.phase==='threat-failure'?'Falha':'Superação'}: D4 físico.</p><select id="threatRewardAttr">${['conhecimento','influencia','heranca'].map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select>${die('threatD4',4)}`;
 if(v.phase==='dominator-decider'&&v.playerOrder[v.dominator.nextIndex]?.id===p.id)th+=`<p>Role D8 físico: o primeiro 8 define o Decisor.</p>${die('dominatorD8',8)}`;
 if(v.phase==='dominator-tier'&&v.dominator.decider===p.id)th+=`<p>Decisor: D4 da intensidade.</p>${die('dominatorTierD4',4)}`;
 if(v.phase==='dominator-choice'&&v.dominator.decider===p.id)th+=`<p>Escolha uma opção do nível ${v.dominator.tier}:</p>${v.dominator.options.map((o,i)=>`<button data-action="dominatorChoice" data-option="${i}">${esc(o)}</button>`).join('')}<select id="dominatorOther">${choices(names(),p.id)}</select>`;
 $('threats').innerHTML=th;
 let trades='<h3>Interação entre jogadores</h3>';
 if((v.phase==='active'||v.phase==='rupture-prep')&&names().some(q=>q.id!==p.id))trades+=`<label class="dv4-trade-field">JOGADOR DESTINATÁRIO<select id="tradeTo">${choices(names(),p.id)}</select></label><label class="dv4-trade-field">OFERECER<select id="offerKey">${['conhecimento','influencia','provisoes'].map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select></label><label class="dv4-trade-field">QUANTIDADE OFERECIDA<input id="offerQty" type="number" min="1" value="1"></label><label class="dv4-trade-field">RECEBER (0 = DOAÇÃO)<select id="wantKey">${['conhecimento','influencia','provisoes'].map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select></label><label class="dv4-trade-field">QUANTIDADE SOLICITADA<input id="wantQty" type="number" min="0" value="0"></label><button data-action="tradePropose">Propor troca</button>`;
 if(!names().some(q=>q.id!==p.id))trades+=`<p class="dv4-trade-empty">Nenhum outro jogador conectado nesta partida. As trocas estarão disponíveis quando houver um participante elegível.</p>`;
 trades+=v.trades.filter(t=>t.toId===p.id&&t.status==='pending').map(t=>`<p>Oferta: ${t.offer} ${label[t.offerKey]}, pede ${t.want} ${label[t.wantKey]||''}<button data-action="tradeAccept" data-trade="${esc(t.id)}">Aceitar</button><button data-action="tradeDecline" data-trade="${esc(t.id)}">Recusar</button></p>`).join('');
 $('trades').innerHTML=trades;
 $('history').innerHTML='<h3>Histórico</h3><ul class="mp-list">'+v.recentHistory.slice().reverse().map(e=>`<li>${esc(e.message)}</li>`).join('')+'</ul>';
}
const retry=document.createElement('button');retry.type='button';retry.id='dv4RetryConnection';retry.textContent='Tentar reconectar à partida';retry.className='primary';retry.addEventListener('click',async()=>{if(!currentUser||!token){say('Entre na conta e informe o código da partida.');return}retry.disabled=true;say('Reconectando à partida…');await refresh();retry.disabled=false});
$('login').insertBefore(retry,$('login').firstChild);
// Escolha explícita de partida sem apagar o token da partida anterior.
const savedPartyChoice=document.createElement('div');
savedPartyChoice.id='dv4SavedPartyChoice';
savedPartyChoice.hidden=true;
savedPartyChoice.innerHTML='<p>Você tem uma partida anterior neste aparelho.</p><button type="button" id="dv4ReturnParty">Voltar à partida anterior</button>';
$('login').insertBefore(savedPartyChoice,$('login').firstChild);
$('dv4ReturnParty').onclick=async()=>{
 if(!currentUser)return;
 const saved=localStorage.getItem(accountTokenKey(currentUser.id))||'';
 if(!saved){say('Nenhuma partida anterior encontrada. Entre usando o código.');return}
 token=saved;await refresh();
};
function showPartyChooser(){
 if(!currentUser)return;
 const saved=localStorage.getItem(accountTokenKey(currentUser.id))||'';
 token='';view=null;
 $('board').hidden=true;$('game').hidden=false;$('login').hidden=false;
 savedPartyChoice.hidden=!saved&&!savedParties().length;
 savedPartyChoice.querySelector('.dv4-party-history')?.remove();
 savedPartyChoice.insertAdjacentHTML('beforeend',partyHistoryHTML());
 $('dv4RetryConnection').hidden=true;
 say(saved?'Escolha: voltar à partida anterior ou entrar em outra pelo código.':'Crie ou entre em uma partida.');
}
document.addEventListener('dorath-choose-party',showPartyChooser);
$('createSolo').onclick=()=>enter('create','solo');$('create').onclick=()=>enter('create','multiplayer');$('join').onclick=()=>enter('join');
document.addEventListener('click',async e=>{
 const button=e.target.closest('button[data-party-token]');
 if(!button||!currentUser)return;
 const next=button.dataset.partyToken;
 if(!next)return;
 token=next;localStorage.setItem(accountTokenKey(currentUser.id),token);
 $('login').hidden=true;await refresh();
});
document.addEventListener('change',e=>{if(e.target.matches('#player .char-check'))selectAtMostTwo(e.target);if(e.target.id==='consequenceCard'&&$('consequencePreview'))$('consequencePreview').src='assets/consequencias/'+e.target.selectedOptions[0].dataset.asset});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||!view)return;const t=b.dataset.action,r=Number(b.dataset.roll);const val=id=>$(id)?.value;
 if(['missionOffer','missionDecline','missionAttempt','missionD4'].includes(t)){
  if(view.turnPlayerId!==view.me.id){say('Aguarde seu turno.');return}
  if(t==='missionAttempt'&&(!view.me.mission||view.me.missionRewardPending||view.me.missionUsedRound===view.round)){say('Nenhuma tentativa de Missão disponível.');return}
  if(t==='missionD4'&&!view.me.missionRewardPending){say('Nenhuma recompensa de Missão pendente.');return}
  if(['missionOffer','missionDecline'].includes(t)&&!view.availableMission&&!(t==='missionOffer'&&view.mode==='solo'&&view.me.mission?.id==='M19')){say('Nenhuma oportunidade de Missão disponível.');return}
 }
 const map={houseOccurrenceResolve:()=>action('houseOccurrence',{choice:val('houseOccurrenceChoice')}),roomCreate:()=>action('roomCreate',{name:val('roomName')}),setup:()=>action('setup',{rolls:[0,1,2].map(i=>Number(val('setupRoll'+i))),order:[0,1,2].map(i=>val('setupDest'+i))}),start:()=>action('start'),move:()=>action('move',{roll:r}),endTurn:()=>action('endTurn'),missionOffer:()=>action('missionOffer',{replace:!!view.me.mission}),missionDecline:()=>action('missionDecline'),missionAttempt:()=>{missionFeedback('Registrando resultado do D6…');return action('missionAttempt',{roll:r,characterId:val('missionCharacter'),attribute:val('missionAttribute')})},missionD4:()=>action('missionD4',{d4:r,otherId:val('missionOther'),rewardOption:val('missionRewardOption')}),recruitRoll:()=>action('recruitCharacter',{method:'roll',roll:r,characterId:val('recruitTarget'),replaceId:val('recruitReplace')}),recruitDirect:()=>action('recruitCharacter',{method:'direct',characterId:val('recruitTarget'),replaceId:val('recruitReplace')}),recruitGuarantee:()=>action('recruitCharacter',{method:'guarantee',characterId:val('recruitTarget'),replaceId:val('recruitReplace')}),freeCharacterChoice:()=>{const ids=[...document.querySelectorAll('.free-char-check:checked')].map(x=>x.value);const required=Math.max(0,(view.me.characterCapacity||2)-(view.me.ownedCharacters?.length||view.me.characters.length));if(ids.length!==required){say(`Escolha exatamente ${required} personagem(ns) para sua coleção.`,true);return}action('freeCharacterChoice',{ids})},missionCharacterSelect:()=>{const id=b.dataset.character;if(!id||!view.me.characters.includes(id)){say('Escolha um dos personagens ativos.',true);return}action('missionCharacterSelect',{characterId:id})},characters:()=>action('characters',{ids:[...document.querySelectorAll('.char-check:checked')].map(x=>x.value)}),convert:()=>action('convert',{rate:Number(val('conversionRate'))}),marcoD4:()=>action('marcoD4',{d4:r}),marcoIndividualD4:()=>action('marcoIndividualD4',{d4:r}),ruptureD4:()=>action('ruptureD4',{d4:r}),preparePass:()=>action('prepare',{option:'pass'}),prepareMission:()=>action('prepare',{option:'mission',roll:Number(prompt('D6 físico da Missão:')),bonus:0}),prepareConvert:()=>action('prepare',{option:'convert',rate:Number(prompt('Índice da taxa de conversão (0–5):'))}),consequence:()=>action('consequence',{card:val('consequenceCard'),d4:Number(val('consequenceD4'))}),threatSpawnD4:()=>action('threatSpawnD4',{d4:r}),threatAttempt:()=>action('threatAttempt',{threatId:b.dataset.threat,attribute:val('attr-'+b.dataset.threat),roll:r}),threatD4:()=>action('threatD4',{d4:r,attribute:val('threatRewardAttr')}),dominatorD8:()=>action('dominatorD8',{roll:r}),dominatorTierD4:()=>action('dominatorTierD4',{d4:r}),dominatorChoice:()=>action('dominatorChoice',{option:Number(b.dataset.option),otherId:val('dominatorOther')}),arkEnter:()=>action('arkEnter',{characterId:val('arkEarlyCharacter')}),arkConfirm:()=>action('arkFinalize',{enter:true}),arkFinalEnter:()=>action('arkFinalize',{enter:true,characterId:val('arkCharacter')}),arkFinalOutside:()=>action('arkFinalize',{enter:false}),lastChance:()=>action('lastChance',{roll:r}),mandamentoRefuse:()=>action('mandamentoChoice',{refuse:true}),mandamentoOpen:()=>action('mandamentoChoice',{refuse:false}),vidaHeranca:()=>action('specialChoice',{card:'vida',option:'heranca'}),vidaProvisoes:()=>action('specialChoice',{card:'vida',option:'provisoes'}),conhecimentoAceitar:()=>action('specialChoice',{card:'conhecimento',option:'aceitar'}),conhecimentoRecusar:()=>action('specialChoice',{card:'conhecimento',option:'recusar'}),preservationD6:()=>action('preservationD6',{roll:r}),advanceFinal:()=>action('advanceFinal'),correctPosition:()=>correctPosition(),tradePropose:()=>action('tradePropose',{toId:val('tradeTo'),offerKey:val('offerKey'),offer:Number(val('offerQty')),wantKey:val('wantKey'),want:Number(val('wantQty'))}),tradeAccept:()=>action('tradeAnswer',{tradeId:b.dataset.trade,accept:true}),tradeDecline:()=>action('tradeAnswer',{tradeId:b.dataset.trade,accept:false})};map[t]?.()});
let authBusy=false;
let authReady=false;
const withAuthDeadline=(promise,ms=15000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tempo limite da autenticação excedido.')),ms))]);
async function showAccount(session,chooseParty=false){
 authReady=true;
 const user=session?.user&&!session.user.is_anonymous?session.user:null;
 currentUser=user;sessionAccessToken=session?.access_token||'';view=null;token='';
 $('board').hidden=true;
 $('account').hidden=!!user;
 $('game').hidden=!user;
 if(!user){$('login').hidden=true;say('Entre na sua conta para abrir o playtest.');return}
 $('accountEmail').textContent=user.email||'Conta conectada';
 historyKey=`dorath.p1.secretHistory.${user.id}`;
 commonKey=`dorath.p1.commonHistory.${user.id}`;
 token=localStorage.getItem(accountTokenKey(user.id))||'';
 if(chooseParty){showPartyChooser();return}
 if(token)await refresh();
 else{$('login').hidden=false;say('Crie uma Partida-mestre ou entre pelo código da sala.')}
}
$('accountCreate').addEventListener('click',()=>{ $('accountMode').value='signup'; $('accountForm').requestSubmit(); });
$('accountForm').onsubmit=async e=>{
 e.preventDefault();
 if(authBusy)return;
 authBusy=true;
 const email=$('email').value.trim(),password=$('password').value;
 $('accountSubmit').disabled=true;
 $('accountSubmit').textContent=$('accountMode').value==='signup'?'Criando conta…':'Entrando…';
 say('Validando sua conta…');
 try{
  const result=await withAuthDeadline($('accountMode').value==='signup'
   ?supabase.auth.signUp({email,password,options:{emailRedirectTo:location.href}})
   :supabase.auth.signInWithPassword({email,password}));
  if(result.error)throw result.error;
  if(!result.data.session){say('Conta criada. Confirme o e-mail recebido e depois entre.');return}
  say('Conta autenticada. Recuperando sua partida…');
  await showAccount(result.data.session,true);
 }catch(error){say('Não foi possível entrar: '+(error?.message||'Erro desconhecido'),true)}
 finally{authBusy=false;$('accountSubmit').disabled=false;$('accountSubmit').textContent='Entrar';$('accountMode').value='login'}
};
$('signout').onclick=async()=>{
 if(authBusy)return;
 authBusy=true;
 // Invalida respostas de atualizacao pendentes antes de encerrar voluntariamente a conta.
 token='';
 try{
  const {error}=await withAuthDeadline(supabase.auth.signOut());
  if(error)throw error;
  await showAccount(null);
 }catch(error){say('Falha ao sair: '+(error?.message||'Erro desconhecido'),true)}
 finally{authBusy=false}
};
// INITIAL_SESSION entrega o estado local sem disparar uma segunda consulta concorrente.
// SIGNED_IN e SIGNED_OUT são tratados pelo formulário e botão, evitando corridas.
supabase.auth.onAuthStateChange((event,session)=>{
 if(event==='TOKEN_REFRESHED'&&session?.access_token)sessionAccessToken=session.access_token;
 if(event==='INITIAL_SESSION'){
  if(!authBusy)void showAccount(session).catch(error=>say('Falha ao restaurar partida: '+error.message,true));
 }
});
setTimeout(()=>{
 if(!authReady&&!authBusy){
  $('account').hidden=false;$('game').hidden=true;
  say('A sessão demorou para inicializar. Tente entrar com sua conta.',true);
 }
},12000);
setInterval(()=>{if(currentUser&&token&&!busy&&!refreshInFlight&&(!lastRefreshFailure||Date.now()-lastRefreshFailure>10000))refresh()},2000);
