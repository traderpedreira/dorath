import { EDGE_FUNCTION_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';
import { supabase, validSession, accountTokenKey } from './auth.js';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label={conhecimento:'Conhecimento',influencia:'Influência',provisoes:'Provisões',heranca:'Herança'};
let token='',view=null,busy=false,stream=null,currentUser=null;
let historyKey='',commonKey='';
function say(t,error=false){$('status').textContent=t;$('status').classList.toggle('mp-error',error)}
async function api(route,data={}){
 if(!/^https:\/\/[^/]+\.supabase\.co\/functions\/v1\/dorath-p1$/.test(EDGE_FUNCTION_URL))throw Error('Configure site/supabase-config.js antes de usar o app');
 const {data: {session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token)throw Error('Entre na sua conta para continuar');
 const response=await fetch(EDGE_FUNCTION_URL,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${session.access_token}`,'apikey':SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify({route,...data})});
 let body;try{body=await response.json()}catch{throw Error('Resposta inválida do servidor')}
 if(!response.ok)throw Error(body.error||`Erro ${response.status}`);return body;
}
function saveCommon(){if(view?.me?.missionHistory)localStorage.setItem(commonKey,JSON.stringify(view.me.missionHistory))}
async function refresh(){if(!token||!currentUser)return;try{const next=await api('state',{token});const changed=!view||next.revision!==view.revision;view=next;saveCommon();$('login').hidden=true;$('board').hidden=false;if(changed)draw();say(`Conectado · Partida-Mãe ${view.motherCode} · revisão ${view.revision}`)}catch(e){say(e.message,true);if(/sessão inválida|outra conta/i.test(e.message)){token='';localStorage.removeItem(accountTokenKey(currentUser.id));$('login').hidden=false;$('board').hidden=true}}}
async function action(type,data={}){if(busy)return;busy=true;try{view=await api('action',{token,expectedRevision:view.revision,type,...data});saveCommon();draw();say(`Ação registrada · rodada ${view.round}`)}catch(e){const msg=e.message;await refresh();say(msg,true)}finally{busy=false}}
async function enter(route){try{const secretHistory=JSON.parse(localStorage.getItem(historyKey)||'[]'),commonHistory=JSON.parse(localStorage.getItem(commonKey)||'[]');const res=await api(route,{name:$('name').value,team:$('team').value,code:$('code').value,secretHistory,commonHistory});token=res.token;localStorage.setItem(accountTokenKey(currentUser.id),token);await refresh();if(view?.me.secretMissionId){localStorage.setItem(historyKey,JSON.stringify([...secretHistory,view.me.secretMissionId].slice(-160)))}}catch(e){say(e.message,true)}}
const die=(type,max,extra={})=>`<div class="dice">${Array.from({length:max},(_,i)=>`<button data-action="${type}" data-roll="${i+1}" ${Object.entries(extra).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ')}>${i+1}</button>`).join('')}</div>`;
const names=()=>view.rooms.flatMap(r=>r.players);
const choices=(items,skip)=>items.filter(q=>q.id!==skip).map(q=>`<option value="${esc(q.id)}">${esc(q.name)}</option>`).join('');
function draw(){const v=view,p=v.me,host=p.id===v.hostPlayerId,turn=v.turnPlayerId===p.id;
 $('summary').innerHTML=`<h2>${esc(v.house?.code||'P1-'+String(p.house*10).padStart(3,'0'))} · ${esc(v.house?.name||'Casa')}</h2><p>${esc(v.house?.family||'')} · Rodada ${v.round} · ${esc(v.phase)} · Violência ${v.violence}</p><p>${esc(v.house?.rule||'')}</p><p>Arca: ${p.preserved?'PRESERVADO / ENTROU':p.arkFinalized?'NÃO ENTROU':'entrada em aberto'} ${v.preparationClosed?'· fechada':''}</p>`;
 $('rooms').innerHTML=`<h3>Partida-Mãe ${esc(v.motherCode)}</h3>${v.rooms.map(r=>`<p><b>${esc(r.name)} · ${esc(r.code)}</b><br>${r.players.map(q=>`${esc(q.name)} P1-${String(q.house*10).padStart(3,'0')}`).join(' · ')}</p>`).join('')}${v.phase==='lobby'&&host?'<input id="roomName" placeholder="Nome da nova sala"><button data-action="roomCreate">Criar sala</button>':''}`;
 $('player').innerHTML=`<h3>${esc(p.name)} · Carta do Jogador</h3><p>${Object.entries(p.resources).map(([k,n])=>`${label[k]}: <b>${n}</b>`).join(' · ')}</p><p><b>Missão Secreta ${esc(v.secretMission?.id)}:</b> ${esc(v.secretMission?.name)} — ${esc(v.secretMission?.condition)} ${p.secretCompletedAt?'✓ cumprida':''}</p><p>Personagens (até 2): ${p.characters.map(esc).join(', ')}</p><p>Conversões: ${p.conversionCount} · Interações: ${p.tradeCount} · Missões: ${p.missionSuccesses}</p>${v.phase==='active'?`<div>${v.availableCharacters.map(c=>`<label class="mp-chip"><input class="char-check" type="checkbox" value="${esc(c.id)}" ${p.characters.includes(c.id)?'checked':''}>${esc(c.name)}</label>`).join('')}<button data-action="characters">Selecionar Personagens</button></div>`:''}`;
 let movement='<h3>Turno e movimento</h3>';
 if(v.phase==='lobby')movement+=!p.setupDone?`<p>Role fisicamente 3D6 e distribua os valores convertidos.</p>${[0,1,2].map(i=>`<label>D6 ${i+1}<select id="setupRoll${i}">${Array.from({length:6},(_,j)=>`<option>${j+1}</option>`).join('')}</select></label><label>Destino<select id="setupDest${i}">${['conhecimento','influencia','provisoes'].map((k,j)=>`<option value="${k}" ${j===i?'selected':''}>${label[k]}</option>`).join('')}</select></label>`).join('')}<button data-action="setup">Confirmar 3D6</button>`:'<p>Recursos iniciais registrados.</p>';
 if(v.phase==='lobby'&&host)movement+='<button data-action="start">Iniciar após todos prepararem</button>';
 if(v.phase==='active'&&turn&&p.house<50){movement+=p.lastMovedRound===v.round?'<p>Movimento desta rodada registrado.</p>':`<p>Role D6 físico e informe:</p>${die('move',6)}`;movement+='<button data-action="endTurn">Encerrar turno</button>'}
 if(v.phase==='active'&&!turn)movement+='<p>Aguarde seu turno.</p>';
 if(v.phase==='marco-roll')movement+=`<p>Marco ${v.pendingMarco.house}: D4 coletivo pelo primeiro jogador.</p>${v.pendingMarco.initiator===p.id?die('marcoD4',4):''}`;
 if(v.phase==='marco-individual')movement+=`<p>Envolvimento individual ao parar no Marco: D4 físico separado.</p>${v.pendingMarco.initiator===p.id?die('marcoIndividualD4',4):''}`;
 if(v.phase==='rupture-prep')movement+=v.pendingRupture.prepared.includes(p.id)?'<p>Aguarde a última preparação dos demais.</p>':`<p>Uma última ação antes da Ruptura.</p><button data-action="preparePass">Passar</button><button data-action="prepareMission">Tentar Missão atual</button><button data-action="prepareConvert">Converter recurso</button>`;
 if(v.phase==='rupture-roll')movement+=`<p>Ruptura P1-${String(v.pendingRupture.house*10).padStart(3,'0')}: D4 coletivo pelo primeiro jogador.</p>${v.pendingRupture.initiator===p.id?die('ruptureD4',4):''}`;
 if(v.phase==='active'&&p.house===50&&!p.arkFinalized)movement+=`<p>Fechamento obrigatório da Arca.</p>${p.preserved?'<button data-action="arkConfirm">Confirmar entrada antecipada</button>':`<select id="arkCharacter">${p.characters.map(id=>`<option>${esc(id)}</option>`).join('')}</select><button data-action="arkFinalEnter">Pagar 3 Provisões e entrar</button><button data-action="arkFinalOutside">Registrar NÃO ENTROU</button>`}`;
 if(v.phase==='active'&&p.house===48&&!p.preserved)movement+=`<p>Entrada antecipada possível somente nesta casa.</p><select id="arkEarlyCharacter">${p.characters.map(id=>`<option>${esc(id)}</option>`).join('')}</select><button data-action="arkEnter">Entrar na Arca</button>`;
 if(v.preparationClosed&&p.preserved&&p.preservationBonus===null)movement+=`<p>Role seu D6 secreto de Preservação. Ele só será aplicado em P1-540.</p>${die('preservationD6',6)}`;
 if(v.preparationClosed&&host&&v.phase==='active'&&[50,51,53].includes(p.house))movement+='<button data-action="advanceFinal">Avançar sequência final coletiva</button>';
 if(v.phase==='ended')movement+=`<h4>Resultado</h4><ol>${(v.finalScores||[]).map(s=>`<li>${esc(s.name)}: ${s.score} pontos</li>`).join('')}</ol>`;
 $('movement').innerHTML=movement;
 let mission='<h3>Missão comum</h3>';
 if(p.mission)mission+=`<p><b>${esc(p.mission.name)}</b> · ${esc(p.mission.difficulty)} · alvo ${p.mission.target}<br>Requisito: ${esc(p.mission.requirement)}<br>Recompensa: ${esc(p.mission.baseReward)}</p>`;
 if(p.missionRewardPending)mission+=`<p>Sucesso confirmado; role D4 físico separado para a recompensa.</p>${['M11','M19'].includes(p.mission.id)?`<label>Jogador beneficiado<select id="missionOther">${choices(names(),p.id)}</select></label>`:''}${p.mission.id==='M19'?'<label>Recompensa<select id="missionRewardOption"><option value="outro">Provisões para o outro</option><option value="ambos">1 Provisão para cada um</option></select></label>':p.mission.id==='M20'?'<label>Recompensa<select id="missionRewardOption"><option value="provisoes">Provisões</option><option value="heranca">Herança</option></select></label>':''}${die('missionD4',4)}`;
 else if(v.phase==='active'&&turn&&p.mission)mission+=`<label>Bônus confirmado (0–3)<select id="missionBonus">${[0,1,2,3].map(i=>`<option>${i}</option>`).join('')}</select></label><p>Resultado do D6 físico:</p>${die('missionAttempt',6)}`;
 if(v.availableMission&&turn)mission+=`<button data-action="missionOffer">${p.mission?'Trocar Missão por 1 Influência':'Gerar Missão'}</button><button data-action="missionDecline">Ignorar oportunidade</button>`;
 $('missions').innerHTML=mission;
 let world='<h3>Ocorrências e Arca</h3>';
 if(v.phase==='consequence-draw'&&v.pendingConsequencePlayers[0]===p.id)world+=`<p>Compre a carta física do topo; identifique-a e devolva ao fundo após resolver.</p><select id="consequenceCard">${v.consequenceCards.map(c=>`<option value="${esc(c.id)}" data-asset="${esc(c.asset)}">${esc(c.name)}</option>`).join('')}</select><img id="consequencePreview" class="card-preview" src="assets/consequencias/${esc(v.consequenceCards[0].asset)}" alt="Arte da Consequência"><label>D4 físico<select id="consequenceD4">${[1,2,3,4].map(i=>`<option>${i}</option>`).join('')}</select></label><button data-action="consequence">Resolver carta</button>`;
 if(v.phase==='threat-spawn')world+=`<p>Nefilim ${esc(v.pendingThreat.card)}: revele a carta física. ${v.pendingThreat.initiator===p.id?'Informe o D4 de surgimento.':'Aguarde o D4 de quem acionou a Ameaça.'}</p>${v.pendingThreat.initiator===p.id?die('threatSpawnD4',4):''}`;
 if(v.phase==='active'&&p.house===47)world+=`<p>Checkpoint: ${p.readyAt47?'PRONTO':'EM RISCO'}</p>`;
 if(v.phase==='active'&&v.globalStates.MANDAMENTO&&!p.mandamentoChoice)world+='<p>Mandamento no Éden:</p><button data-action="mandamentoRefuse">Recusar o fruto</button><button data-action="mandamentoOpen">Manter escolha aberta</button>';
 if(v.phase==='active'&&p.house===7&&v.globalStates.MANDAMENTO)world+=`<h4>Escolhas das árvores · apresentadas em P1-040</h4><p>O Mandamento já está ativo; resolva apenas a escolha mecânica, sem reapresentar as árvores.</p>${!p.specialChoices.vida?'<button data-action="vidaHeranca">Árvore da Vida: +2 Herança</button><button data-action="vidaProvisoes">Árvore da Vida: +2 Provisões</button>':''}${!p.specialChoices.conhecimento?'<button data-action="conhecimentoAceitar">Árvore do Conhecimento: +3 Conhecimento, −5 Herança</button><button data-action="conhecimentoRecusar">Recusar</button>':''}`;
 if(v.phase==='active'&&p.house===49&&!p.preserved&&!p.lastChanceUsed)world+=`<p>Última Oportunidade: teste de recuperação de playtest (D6 ≥ 5 concede 1 Provisão).</p>${die('lastChance',6)}`;
 if(v.phase==='active'&&p.house>=12&&p.house<50){world+=`<h4>Converter (uma vez por turno)</h4><select id="conversionRate">${['2 Conhecimento → 1 Influência','2 Influência → 1 Conhecimento','3 Conhecimento → 1 Provisão','3 Influência → 1 Provisão','2 Provisões → 1 Conhecimento','2 Provisões → 1 Influência'].map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select><button data-action="convert">Converter</button>`}
 world+=`<h4>Conferência de posição</h4><p>Posição registrada: <b>Casa ${p.house} · P1-${String(p.house*10).padStart(3,'0')} · ${esc(v.house?.name||'Casa')}</b>. Use a correção somente se a peça física e o app divergirem.</p><input id="correctHouse" type="number" min="1" max="49" value="${p.house}" aria-label="Número da casa"><input id="correctReason" placeholder="Motivo da correção"><button data-action="correctPosition">Corrigir posição</button>`;
 $('world').innerHTML=world;
 let th='<h3>Ameaças coletivas</h3>';
 th+=v.activeThreats.map(t=>`<div class="mp-chip"><b>${esc(t.name)}</b> ${t.successes}/3 ${t.aggravated?'· agravado':''}${v.phase==='active'&&turn?`<select id="attr-${esc(t.id)}">${(t.card==='opressor'?['conhecimento','influencia']:t.card==='dominador'?['influencia','heranca']:['conhecimento','heranca']).map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select>${die('threatAttempt',6,{threat:t.id})}`:''}</div>`).join('');
 if(['threat-failure','threat-reward'].includes(v.phase)&&v.pendingThreatResult?.by===p.id)th+=`<p>${v.phase==='threat-failure'?'Falha':'Superação'}: D4 físico.</p><select id="threatRewardAttr">${['conhecimento','influencia','heranca'].map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select>${die('threatD4',4)}`;
 if(v.phase==='dominator-decider'&&v.playerOrder[v.dominator.nextIndex]?.id===p.id)th+=`<p>Role D8 físico: o primeiro 8 define o Decisor.</p>${die('dominatorD8',8)}`;
 if(v.phase==='dominator-tier'&&v.dominator.decider===p.id)th+=`<p>Decisor: D4 da intensidade.</p>${die('dominatorTierD4',4)}`;
 if(v.phase==='dominator-choice'&&v.dominator.decider===p.id)th+=`<p>Escolha uma opção do nível ${v.dominator.tier}:</p>${v.dominator.options.map((o,i)=>`<button data-action="dominatorChoice" data-option="${i}">${esc(o)}</button>`).join('')}<select id="dominatorOther">${choices(names(),p.id)}</select>`;
 $('threats').innerHTML=th;
 let trades='<h3>Interação entre jogadores</h3>';
 if(v.phase==='active'||v.phase==='rupture-prep')trades+=`<select id="tradeTo">${choices(names(),p.id)}</select><select id="offerKey">${['conhecimento','influencia','provisoes'].map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select><input id="offerQty" type="number" min="1" value="1"><p>Receber (0 = doação):</p><select id="wantKey">${['conhecimento','influencia','provisoes'].map(k=>`<option value="${k}">${label[k]}</option>`).join('')}</select><input id="wantQty" type="number" min="0" value="0"><button data-action="tradePropose">Propor</button>`;
 trades+=v.trades.filter(t=>t.toId===p.id&&t.status==='pending').map(t=>`<p>Oferta: ${t.offer} ${label[t.offerKey]}, pede ${t.want} ${label[t.wantKey]||''}<button data-action="tradeAccept" data-trade="${esc(t.id)}">Aceitar</button><button data-action="tradeDecline" data-trade="${esc(t.id)}">Recusar</button></p>`).join('');
 $('trades').innerHTML=trades;
 $('history').innerHTML='<h3>Histórico</h3><ul class="mp-list">'+v.recentHistory.slice().reverse().map(e=>`<li>${esc(e.message)}</li>`).join('')+'</ul>';
}
$('create').onclick=()=>enter('create');$('join').onclick=()=>enter('join');
document.addEventListener('change',e=>{if(e.target.id==='consequenceCard'&&$('consequencePreview'))$('consequencePreview').src='assets/consequencias/'+e.target.selectedOptions[0].dataset.asset});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||!view)return;const t=b.dataset.action,r=Number(b.dataset.roll);const val=id=>$(id)?.value;
 const map={roomCreate:()=>action('roomCreate',{name:val('roomName')}),setup:()=>action('setup',{rolls:[0,1,2].map(i=>Number(val('setupRoll'+i))),order:[0,1,2].map(i=>val('setupDest'+i))}),start:()=>action('start'),move:()=>action('move',{roll:r}),endTurn:()=>action('endTurn'),missionOffer:()=>action('missionOffer',{replace:!!view.me.mission}),missionDecline:()=>action('missionDecline'),missionAttempt:()=>action('missionAttempt',{roll:r,bonus:Number(val('missionBonus'))}),missionD4:()=>action('missionD4',{d4:r,otherId:val('missionOther'),rewardOption:val('missionRewardOption')}),characters:()=>action('characters',{ids:[...document.querySelectorAll('.char-check:checked')].map(x=>x.value)}),convert:()=>action('convert',{rate:Number(val('conversionRate'))}),marcoD4:()=>action('marcoD4',{d4:r}),marcoIndividualD4:()=>action('marcoIndividualD4',{d4:r}),ruptureD4:()=>action('ruptureD4',{d4:r}),preparePass:()=>action('prepare',{option:'pass'}),prepareMission:()=>action('prepare',{option:'mission',roll:Number(prompt('D6 físico da Missão:')),bonus:0}),prepareConvert:()=>action('prepare',{option:'convert',rate:Number(prompt('Índice da taxa de conversão (0–5):'))}),consequence:()=>action('consequence',{card:val('consequenceCard'),d4:Number(val('consequenceD4'))}),threatSpawnD4:()=>action('threatSpawnD4',{d4:r}),threatAttempt:()=>action('threatAttempt',{threatId:b.dataset.threat,attribute:val('attr-'+b.dataset.threat),roll:r}),threatD4:()=>action('threatD4',{d4:r,attribute:val('threatRewardAttr')}),dominatorD8:()=>action('dominatorD8',{roll:r}),dominatorTierD4:()=>action('dominatorTierD4',{d4:r}),dominatorChoice:()=>action('dominatorChoice',{option:Number(b.dataset.option),otherId:val('dominatorOther')}),arkEnter:()=>action('arkEnter',{characterId:val('arkEarlyCharacter')}),arkConfirm:()=>action('arkFinalize',{enter:true}),arkFinalEnter:()=>action('arkFinalize',{enter:true,characterId:val('arkCharacter')}),arkFinalOutside:()=>action('arkFinalize',{enter:false}),lastChance:()=>action('lastChance',{roll:r}),mandamentoRefuse:()=>action('mandamentoChoice',{refuse:true}),mandamentoOpen:()=>action('mandamentoChoice',{refuse:false}),vidaHeranca:()=>action('specialChoice',{card:'vida',option:'heranca'}),vidaProvisoes:()=>action('specialChoice',{card:'vida',option:'provisoes'}),conhecimentoAceitar:()=>action('specialChoice',{card:'conhecimento',option:'aceitar'}),conhecimentoRecusar:()=>action('specialChoice',{card:'conhecimento',option:'recusar'}),preservationD6:()=>action('preservationD6',{roll:r}),advanceFinal:()=>action('advanceFinal'),correctPosition:()=>action('correctPosition',{house:Number(val('correctHouse')),reason:val('correctReason')}),tradePropose:()=>action('tradePropose',{toId:val('tradeTo'),offerKey:val('offerKey'),offer:Number(val('offerQty')),wantKey:val('wantKey'),want:Number(val('wantQty'))}),tradeAccept:()=>action('tradeAnswer',{tradeId:b.dataset.trade,accept:true}),tradeDecline:()=>action('tradeAnswer',{tradeId:b.dataset.trade,accept:false})};map[t]?.()});
async function showAccount(){
 const identity=await validSession();
 currentUser=identity?.user||null;view=null;token='';
 $('board').hidden=true;
 $('account').hidden=!!currentUser;
 $('game').hidden=!currentUser;
 if(!currentUser){say('Entre na sua conta para abrir o playtest.');return}
 $('accountEmail').textContent=currentUser.email||'Conta conectada';
 historyKey=`dorath.p1.secretHistory.${currentUser.id}`;
 commonKey=`dorath.p1.commonHistory.${currentUser.id}`;
 token=localStorage.getItem(accountTokenKey(currentUser.id))||'';
 if(token)await refresh();
 else{$('login').hidden=false;say('Crie uma Partida-Mãe ou entre pelo código da sala.')}
}
$('accountForm').onsubmit=async e=>{
 e.preventDefault();
 const email=$('email').value.trim(),password=$('password').value;
 $('accountSubmit').disabled=true;
 try{
  const result=$('accountMode').value==='signup'
   ?await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.href}})
   :await supabase.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;
  if(!result.data.session){say('Conta criada. Confirme o e-mail recebido e depois entre.',false);return}
  await showAccount();
 }catch(error){say(error.message,true)}finally{$('accountSubmit').disabled=false}
};
$('signout').onclick=async()=>{const {error}=await supabase.auth.signOut();if(error)say(error.message,true);else await showAccount()};
supabase.auth.onAuthStateChange(()=>{setTimeout(showAccount,0)});
showAccount();
setInterval(()=>{if(currentUser&&token&&!busy)refresh()},2000);
