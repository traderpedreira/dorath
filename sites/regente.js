import { DorathAudio } from './dorath-audio.js';
import { EDGE_FUNCTION_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';
import { supabase } from './auth.js';

const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let currentUser=null,sessionAccessToken='',token='',view=null,busy=false,refreshInFlight=false;
const audio=new DorathAudio();
const regentTokenKey=uid=>'dorath.v4.regentToken.'+uid;

audio.status=message=>{const el=$('audioStatus');if(el)el.textContent=message};
$('audioToggle').addEventListener('click',async()=>{
 if(audio.enabled){audio.disable();$('audioToggle').textContent='Ativar experiência sonora'}
 else{await audio.activate();$('audioToggle').textContent='Desativar áudio'}
});
$('audioVolume').addEventListener('input',e=>audio.setVolume(Number(e.target.value)/100));
$('audioAmbient').addEventListener('change',e=>{audio.ambient=e.target.checked;if(audio.last)audio.render(audio.last)});
$('audioEffects').addEventListener('change',e=>audio.effects=e.target.checked);

function say(t,error=false){$('status').textContent=t;$('status').classList.toggle('mp-error',error)}
async function api(route,data={}){
 if(!/^https:\/\/[^/]+\.supabase\.co\/functions\/v1\/dorath-p1(?:-v4)?$/.test(EDGE_FUNCTION_URL))throw Error('Configure site/supabase-config.js antes de usar o app');
 if(!sessionAccessToken)throw Error('Sessão indisponível. Entre na sua conta novamente.');
 const response=await fetch(EDGE_FUNCTION_URL,{
  method:'POST',
  headers:{'content-type':'application/json','authorization':`Bearer ${sessionAccessToken}`,'apikey':SUPABASE_PUBLISHABLE_KEY},
  body:JSON.stringify({route,...data})
 });
 let body;try{body=await response.json()}catch{throw Error('Resposta inválida do servidor')}
 if(!response.ok)throw Error(body.error||`Erro ${response.status}`);
 return body;
}

const cardCatalog={
 marcos:{
  6:{title:'O Mandamento no Jardim',src:'assets/marcos/06_O_Mandamento.png',state:'MANDAMENTO'},
  10:{title:'A Criação de Eva',src:'assets/marcos/10_A_Criacao_de_Eva.png',state:'HARMONIA_NO_EDEN'},
  22:{title:'As Ofertas',src:'assets/marcos/22_As_Ofertas_HOMOLOGADA.png',state:'RESSENTIMENTO'},
  27:{title:'A Cidade de Enoque',src:'assets/marcos/27_A_Cidade_de_Enoque.png',state:'CIDADE_DE_ENOQUE'},
  37:{title:'Os Anjos Rebeldes',src:'assets/marcos/37_Os_Anjos_Rebeldes.png',state:'DESCIDA_DOS_ANJOS'},
  41:{title:'O Chamado de Noé',src:'assets/marcos/41_O_Chamado_de_Noe.png',state:'PREPARACAO_DA_ARCA'}
 },
 rupturas:{
  12:{title:'A Queda',src:'assets/rupturas/01_Queda.png'},
  18:{title:'Expulsão',src:'assets/rupturas/02_Expulsão.png'},
  24:{title:'Morte de Abel',src:'assets/rupturas/03_Morte_de_Abel.png'},
  39:{title:'Corrupção da Humanidade',src:'assets/rupturas/04_Corrupção_da_Humanidade.png'},
  52:{title:'O Dilúvio',src:'assets/rupturas/05_Dilúvio.png'}
 },
 ameacas:{
  opressor:{title:'Nefilim Opressor',src:'assets/ameacas/nefilim_opressor_carta.png'},
  dominador:{title:'Nefilim Dominador',src:'assets/ameacas/nefilim_dominador_carta.png'},
  corruptor:{title:'Nefilim Corruptor',src:'assets/ameacas/nefilim_corruptor_carta.png'}
 },
 especiais:{arca:{title:'Arca de Noé',src:'assets/especiais/carta_especial_arca.png'}}
};

function activeCards(v){
 const out=[],seen=new Set();
 const add=(kind,key,card,status='ATIVA')=>{if(!card)return;const id=kind+':'+key;if(seen.has(id))return;seen.add(id);out.push({id,kind,title:card.title,src:card.src,status})};
 for(const [house,card] of Object.entries(cardCatalog.marcos)){
  if(v.globalStates?.[card.state]||Number(v.pendingMarco?.house)===Number(house))add('MARCO',house,card,v.globalStates?.[card.state]?'ATIVO':'EM RESOLUÇÃO');
 }
 if(v.pendingRupture?.house)add('RUPTURA',v.pendingRupture.house,cardCatalog.rupturas[v.pendingRupture.house],'EM RESOLUÇÃO');
 if(v.pendingThreat?.card)add('AMEAÇA',v.pendingThreat.card,cardCatalog.ameacas[v.pendingThreat.card],'SURGINDO');
 for(const t of v.activeThreats||[])add('AMEAÇA',t.card,cardCatalog.ameacas[t.card],t.aggravated?'ATIVA · AGRAVADA':'ATIVA');
 if(v.arkOpened&&!v.preparationClosed)add('ESPECIAL','arca',cardCatalog.especiais.arca,'ATIVA');
 return out;
}

const die=(action,max,extra={})=>'<div class="dice">'+Array.from({length:max},(_,i)=>'<button type="button" data-regent-action="'+action+'" data-roll="'+(i+1)+'" '+Object.entries(extra).map(([k,v])=>'data-'+k+'="'+esc(v)+'"').join(' ')+'>'+(i+1)+'</button>').join('')+'</div>';

function render(){
 if(!view)return;
 const turn=view.players?.find(p=>p.id===view.turnPlayerId);
 $('summary').innerHTML=`<span class="dv4-regent-badge">REGENTE</span><h2>Partida-mestre ${esc(view.motherCode)}</h2><p><b>Rodada ${view.round}</b> · ${esc(view.phase)} · Violência ${view.violence}</p><p>Turno atual: <b>${esc(turn?.name||'—')}</b> · ${esc(turn?.houseCode||'')}</p><p>Arca: ${view.arkOpened?'aberta':'ainda não revelada'} ${view.preparationClosed?'· fechada':''}</p>`;

 $('players').innerHTML=(view.players||[]).map(p=>`<article class="dv4-regent-player ${p.id===view.turnPlayerId?'is-turn':''}"><strong>${esc(p.name)}</strong><span>${esc(p.houseCode)} · ${esc(p.houseName)}</span><small>${p.preserved?'PRESERVADO':p.arkFinalized?'NÃO ENTROU':'em jornada'}${p.readyAt47?' · PRONTO':''}</small></article>`).join('');

 const cards=activeCards(view);
 $('activeCards').innerHTML=cards.length?cards.map(c=>`<button type="button" class="dv4-regent-card" data-card-src="${esc(c.src)}" data-card-title="${esc(c.title)}"><span>${esc(c.kind)}</span><img src="${esc(c.src)}" alt="${esc(c.title)}" loading="lazy"><small>${esc(c.status)}</small></button>`).join(''):'<p>Nenhuma carta coletiva ativa neste momento.</p>';

 let collective='';
 if(view.phase==='marco-roll')collective+=`<p>Marco ${view.pendingMarco?.house}: informe o D4 coletivo.</p>${die('marcoD4',4)}`;
 if(view.phase==='rupture-roll')collective+=`<p>Ruptura P1-${String((view.pendingRupture?.house||0)*10).padStart(3,'0')}: informe o D4 coletivo.</p>${die('ruptureD4',4)}`;
 if(view.phase==='threat-spawn')collective+=`<p>Surgimento de Nefilim ${esc(view.pendingThreat?.card)}: informe o D4 coletivo.</p>${die('threatSpawnD4',4)}`;
 if(['threat-failure','threat-reward'].includes(view.phase)&&view.pendingThreatResult){
  collective+=`<p>${view.phase==='threat-failure'?'Falha':'Superação'} da Ameaça: registre o D4.</p><label>Atributo<select id="regentThreatAttr"><option value="conhecimento">Conhecimento</option><option value="influencia">Influência</option><option value="heranca">Herança</option></select></label>${die('threatD4',4)}`;
 }
 if(view.phase==='dominator-decider')collective+=`<p>Nefilim Dominador: D8 do próximo Decisor.</p>${die('dominatorD8',8)}`;
 if(view.phase==='dominator-tier')collective+=`<p>Decisor definido: D4 de intensidade.</p>${die('dominatorTierD4',4)}`;
 const sharedHouse=Number(view.players?.[0]?.house||0);
 if(view.preparationClosed&&view.phase==='active'&&[50,51,53].includes(sharedHouse))collective+='<button type="button" data-regent-action="advanceFinal">Avançar sequência final coletiva</button>';
 if(!collective)collective='<p>Nenhuma resolução coletiva pendente. As ações pessoais permanecem nos celulares.</p>';
 $('collective').innerHTML=collective;

 let threats=(view.activeThreats||[]).map(t=>`<div class="dv4-regent-threat"><strong>${esc(t.name)}</strong><p>Sucessos: ${Math.min(3,Math.max(0,Number(t.successes)||0))}/3 ${t.aggravated?'· AGRAVADA':''}</p></div>`).join('');
 if(view.pendingThreat)threats=`<div class="dv4-regent-threat"><strong>SURGINDO: Nefilim ${esc(view.pendingThreat.card)}</strong></div>`+threats;
 $('threats').innerHTML=threats||'<p>Nenhuma Ameaça ativa.</p>';

 $('history').innerHTML=(view.recentHistory||[]).slice().reverse().map(e=>'<li>'+esc(e.message)+'</li>').join('')||'<li>Sem eventos coletivos registrados.</li>';
 void audio.update(view);
 say(`Regente conectado · ${view.playerOrder?.length||0} jogador(es) · rodada ${view.round}`);
}

async function refresh(){
 if(!token||!currentUser||refreshInFlight)return;
 refreshInFlight=true;
 try{
  view=await api('state',{token});
  if(view.role!=='regent')throw Error('Esta sessão não é de Regente');
  $('joinPanel').hidden=true;$('board').hidden=false;render();
 }catch(e){
  say(e.message,true);
  if(/sessão inválida|participante não encontrado|outra conta/i.test(e.message||'')){
   token='';localStorage.removeItem(regentTokenKey(currentUser.id));$('board').hidden=true;$('joinPanel').hidden=false;
  }
 }finally{refreshInFlight=false}
}

async function joinRegent(){
 if(busy)return;busy=true;
 try{
  const code=$('code').value.trim().toUpperCase();
  const name=$('regentName').value.trim()||'Regente';
  const res=await api('regentJoin',{code,name});
  token=res.token;localStorage.setItem(regentTokenKey(currentUser.id),token);
  await refresh();
 }catch(e){say(e.message,true)}
 finally{busy=false}
}

async function regentAction(type,data={}){
 if(busy||!view)return;busy=true;
 try{
  view=await api('action',{token,expectedRevision:view.revision,type,...data});
  render();
 }catch(e){say(e.message,true);await refresh()}
 finally{busy=false}
}

$('joinRegent').onclick=joinRegent;
$('resumeRegent').onclick=async()=>{
 token=localStorage.getItem(regentTokenKey(currentUser.id))||'';
 if(token)await refresh();
};
$('leaveRegent').onclick=()=>{
 if(currentUser)localStorage.removeItem(regentTokenKey(currentUser.id));
 token='';view=null;audio.disable();$('board').hidden=true;$('joinPanel').hidden=false;say('Sessão do Regente removida deste tablet.');
};

document.addEventListener('click',e=>{
 const card=e.target.closest?.('.dv4-regent-card');
 if(card){
  $('activeCardModalTitle').textContent=card.dataset.cardTitle||'Carta ativa';
  $('activeCardModalImage').src=card.dataset.cardSrc||'';
  $('activeCardModalImage').alt=card.dataset.cardTitle||'Carta ativa';
  $('activeCardModal').showModal?.();
  return;
 }
 if(e.target.closest?.('#activeCardModalClose')){$('activeCardModal').close?.();return}
 const b=e.target.closest?.('[data-regent-action]');if(!b)return;
 const type=b.dataset.regentAction;
 const roll=Number(b.dataset.roll);
 if(type==='threatD4')regentAction(type,{d4:roll,attribute:$('regentThreatAttr')?.value||'conhecimento'});
 else if(type==='marcoD4'||type==='ruptureD4'||type==='threatSpawnD4'||type==='dominatorTierD4')regentAction(type,{d4:roll});
 else if(type==='dominatorD8')regentAction(type,{roll});
 else if(type==='advanceFinal')regentAction(type);
});

let authBusy=false;
$('accountForm').onsubmit=async e=>{
 e.preventDefault();if(authBusy)return;authBusy=true;
 $('accountSubmit').disabled=true;say('Validando sua conta…');
 try{
  const {data,error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  if(error)throw error;
  if(!data.session)throw Error('Sessão não iniciada');
  await showAccount(data.session);
 }catch(e){say('Não foi possível entrar: '+(e.message||'Erro desconhecido'),true)}
 finally{authBusy=false;$('accountSubmit').disabled=false}
};

async function showAccount(session){
 currentUser=session?.user&&!session.user.is_anonymous?session.user:null;
 sessionAccessToken=session?.access_token||'';
 $('account').hidden=!!currentUser;
 if(!currentUser){$('joinPanel').hidden=true;$('board').hidden=true;say('Entre na sua conta para abrir o Regente.');return}
 $('joinPanel').hidden=false;
 token=localStorage.getItem(regentTokenKey(currentUser.id))||'';
 $('resumeRegent').hidden=!token;
 if(token)await refresh();else say('Informe o código da Partida-mestre para assumir a mesa.');
}

supabase.auth.onAuthStateChange((event,session)=>{
 if(event==='TOKEN_REFRESHED'&&session?.access_token)sessionAccessToken=session.access_token;
 if(event==='INITIAL_SESSION')void showAccount(session);
 if(event==='SIGNED_OUT')void showAccount(null);
});

setInterval(()=>{if(currentUser&&token&&!busy&&!refreshInFlight)void refresh()},2000);
