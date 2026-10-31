import { master } from './master-data.js';
import { characters } from './characters-data.js';

// All actions mutate a copy of one game in the Edge Function. Postgres commits it by revision.
const keys = ['conhecimento','influencia','provisoes','heranca'];
const admin = keys.slice(0,3);
const byHouse = new Map(master.houses.map(h => [h.house,h]));
const rup = new Map(master.ruptures.map(r => [r.house,r]));
const marco = new Set(master.marcos);
const consequences = Object.fromEntries(master.consequences.distinctCards.map(c => [c.id,c]));
const threats = ['opressor','dominador','corruptor'];
const influence = {Conhecimento:'conhecimento','Influência':'influencia','Provisões':'provisoes','Herança':'heranca'};
const phaseFor = n => n <= 11 ? 'EDEN' : n <= 24 ? 'POS_QUEDA_CAIM_ABEL' : n <= 39 ? 'GERACOES_CORRUPCAO' : 'NOE_ARCA';
const rand = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const pick = a => a[rand(a.length)];
const number = (v,min,max) => {const n=Number(v);if(!Number.isInteger(n)||n<min||n>max) fail(`Informe um inteiro de ${min} a ${max}`);return n};
const fail = (s,status=400) => {throw Object.assign(new Error(s),{status})};
const uuid = () => crypto.randomUUID();
export const code = () => Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');
export const log = (g,type,message,data={}) => {g.history.push({at:new Date().toISOString(),round:g.round,type,message,...data});if(g.history.length>1000)g.history.shift()};
function change(p,k,n){if(!keys.includes(k))fail('Recurso inválido');const old=p.resources[k]||0;p.resources[k]=Math.max(0,old+n);return p.resources[k]-old}
function gain(g,p,k,n){
 if(k==='heranca'&&n>0&&g.noHeritageGainThrough>=g.round)return 0;
 if(k!=='provisoes'||n<=0)return change(p,k,n);
 let amount=n,cost=0;
 for(const c of p.consequences){if(c.expiresRound<g.round)continue;
  if(c.id==='CNS-P1-02'&&(!c.firstOnly||!c.used))cost+=c.d4>=3?2:1;
  if(c.id==='CNS-P1-04'&&(!c.firstOnly||!c.used))amount=Math.max(1,amount-(c.d4>=3?2:1));
 }
 if(p.cancelNextProvisionUnit){amount=0;p.cancelNextProvisionUnit=false}
 if(p.resources.influencia<cost){log(g,'consequencia',`${p.name}: ganho de Provisões bloqueado por Solo Amaldiçoado`,{privateFor:p.id});return 0}
 if(cost)change(p,'influencia',-cost);
 p.consequences.forEach(c=>{if(c.firstOnly)c.used=true});
 return change(p,k,amount);
}
function canReceiveProvision(g,p,amount){
 if(amount<=0)return true;let cost=0;
 for(const c of p.consequences)if(c.id==='CNS-P1-02'&&c.expiresRound>=g.round&&(!c.firstOnly||!c.used))cost+=c.d4>=3?2:1;
 return p.resources.influencia>=cost;
}
const everyone=(g,changes,{excludePreserved=false}={})=>g.players.forEach(p=>{if(excludePreserved&&p.preserved)return;for(const [k,n] of Object.entries(changes))gain(g,p,k,n)});
function secretFromHistory(history=[]){
 const ids=master.secretMissions.map(m=>m.id),valid=Array.isArray(history)?history.filter(v=>ids.includes(v)).slice(-160):[];
 const cycle=valid.slice(Math.floor(valid.length/16)*16);
 let available=ids.filter(id=>!cycle.includes(id));if(!cycle.length&&valid.length)available=available.filter(id=>id!==valid.at(-1));
 return pick(available);
}
export function newPlayer(name,room,team,history=[],commonHistory=[]){
 const sid=secretFromHistory(history);
 return {id:uuid(),name:String(name||'Jogador').trim().slice(0,40)||'Jogador',room,team:String(team||'').slice(0,30),
 house:1,resources:{conhecimento:2,influencia:2,provisoes:2,heranca:0},characters:['adao'],ownedCharacters:['adao'],freeCharacterChoices:[],recruitHistory:{},missionCharacterId:'adao',
 secretMissionId:sid,secretCompletedAt:null,setupDone:false,preserved:false,preservedCharacterId:null,
 arkFinalized:false,preservationBonus:null,consequences:[],mission:null,missionRewardPending:null,
 specialChoices:{},mandamentoChoice:null,lastChanceUsed:false,houseOccurrences:{},house3LandingBonus:null,missionRandomBonus:null,
 missionHistory:Array.isArray(commonHistory)?commonHistory.filter(id=>master.commonMissions.some(m=>m.id===id)).slice(-100):[],missionUsedRound:0,missionSuccesses:0,difficultMissionSuccess:false,
 threatAttempts:{},threatContributions:0,consequenceCount:0,tradeCount:0,donatedAmount:0,
 conversionCount:0,convertedRound:0,tradedRound:0,firstRuptures:0,marcoPersonal:{},
 lastMovedRound:0,offeredMove:null,readyAt47:false,enteredAt48:false,checkpointProvisions:null};
}
function unlocked(p){return characters.filter(c=>c.unlockHouse<=Math.max(3,p.house))}
// Capacidade homologada: 1–2 jogadores: 5 cartas; 3–4: 4; 5–6: 3; 7–8: 2.
function characterCapacity(count){return count<=2?5:count<=4?4:count<=6?3:2}
// Preenche gratuitamente slots livres apenas com personagens narrativamente desbloqueados.
// Em desbloqueios concorrentes com vagas insuficientes, preserva a escolha do jogador.
function recruitCharacter(g,p,a){
 activeTurn(g,p);
 if(p.house>=50||p.lastMovedRound===g.round)fail('Recrutamento disponível somente antes do movimento do turno');
 syncFreeCollection(g,p);
 const capacity=characterCapacity(g.players.length);
 const owned=p.ownedCharacters;
 if(owned.length<capacity)fail('Conclua primeiro o preenchimento gratuito da coleção');
 const candidate=unlocked(p).find(c=>c.id===a.characterId&&!owned.includes(c.id));
 if(!candidate)fail('Personagem indisponível ou já adquirido');
 const replaced=a.replaceId;
 if(!owned.includes(replaced))fail('Selecione a carta que será devolvida');
 if(!['roll','direct','guarantee'].includes(a.method))fail('Modalidade de aquisição inválida');
 p.recruitHistory||={};
 const history=p.recruitHistory[candidate.id]||{failures:0,lastAttemptRound:0};
 if(a.method==='roll'){
  if(history.lastAttemptRound===g.round)fail('Nova tentativa somente na próxima rodada');
  if(history.failures>=2)fail('Após duas falhas, utilize a aquisição garantida');
  if(p.resources.influencia<1)fail('Influência insuficiente');
  const roll=number(a.roll,1,6);
  change(p,'influencia',-1);
  history.lastAttemptRound=g.round;
  if(roll<4){
   history.failures++;
   p.recruitHistory[candidate.id]=history;
   log(g,'personagem',`${p.name} tentou adquirir ${candidate.name} (D6 ${roll}, falha ${history.failures}/2)`,{privateFor:p.id});
   return;
  }
 }else{
  if(a.method==='guarantee'&&(history.failures<2||history.lastAttemptRound===g.round))fail('Garantia disponível após duas falhas, em turno posterior');
  const cost=a.method==='direct'?3:1;
  if(p.resources.influencia<cost)fail('Influência insuficiente');
  change(p,'influencia',-cost);
 }
 const index=owned.indexOf(replaced);
 owned.splice(index,1,candidate.id);
 p.characters=p.characters.filter(id=>id!==replaced);
 if(p.missionCharacterId===replaced)p.missionCharacterId=null;
 delete p.recruitHistory[candidate.id];
 log(g,'personagem',`${p.name} adquiriu ${candidate.name} e devolveu ${characters.find(c=>c.id===replaced)?.name||replaced}`,{privateFor:p.id});
}
function syncFreeCollection(g,p){
 const cap=characterCapacity(g.players.length);
 p.ownedCharacters=Array.isArray(p.ownedCharacters)?[...new Set(p.ownedCharacters)]:[...new Set(p.characters||[])];
 const free=Math.max(0,cap-p.ownedCharacters.length);
 if(!free){p.freeCharacterChoices=[];return}
 const candidates=unlocked(p).filter(c=>!p.ownedCharacters.includes(c.id));
 if(candidates.length<=free){
  for(const c of candidates){p.ownedCharacters.push(c.id);log(g,'personagem',`${p.name} recebeu ${c.name} gratuitamente`,{privateFor:p.id})}
  p.freeCharacterChoices=[];
 }else p.freeCharacterChoices=candidates.map(c=>c.id);
}
export function publicView(g,p){return {
 role:'player',revision:g.revision,motherCode:g.motherCode,mode:g.mode||'multiplayer',phase:g.phase,round:g.round,
 turnPlayerId:g.players[g.turnIndex]?.id||null,hostPlayerId:g.hostPlayerId,
 playerOrder:g.players.map(x=>({id:x.id,name:x.name})),
 rooms:g.rooms.map(r=>({...r,players:g.players.filter(x=>x.room===r.code).map(x=>({id:x.id,name:x.name,house:x.house,team:x.team,preserved:x.preserved,arkFinalized:x.arkFinalized}))})),
 me:{...p,ownedCharacters:Array.isArray(p.ownedCharacters)?p.ownedCharacters:p.characters,missionCharacterId:p.missionCharacterId??null,freeCharacterChoices:p.freeCharacterChoices||[],recruitHistory:p.recruitHistory||{},characterCapacity:characterCapacity(g.players.length)},house:byHouse.get(p.house),availableCharacters:unlocked(p).map(c=>({id:c.id,name:c.name,asset:c.asset,attributes:c.attributes})),globalStates:g.globalStates,violence:g.violence,
 arkOpened:g.arkOpened,preparationClosed:g.preparationClosed,rupturesResolved:g.rupturesResolved,
 pendingMarco:g.pendingMarco,pendingRupture:g.pendingRupture,pendingHouseOccurrence:g.pendingHouseOccurrence?.initiator===p.id?g.pendingHouseOccurrence:null,
 pendingConsequencePlayers:g.pendingConsequencePlayers||[],pendingThreat:g.pendingThreat,
 pendingThreatResult:g.pendingThreatResult||null,
 activeThreats:g.activeThreats.map(t=>({id:t.id,card:t.card,name:`Nefilim ${t.card}`,successes:t.successes,aggravated:t.aggravated})),
 seenThreats:g.seenThreats,trades:g.trades.filter(t=>t.fromId===p.id||t.toId===p.id),
 recentHistory:g.history.slice(-35).filter(e=>!e.privateFor||e.privateFor===p.id),
 marcos:g.marcos,secretMission:master.secretMissions.find(m=>m.id===p.secretMissionId),
 availableMission:missionEligible(g,p),consequenceCards:master.consequences.distinctCards,
 masterVersion:master.masterVersion,finalScores:g.finalScores||null,
 finalParticipants:g.phase==='ended'?g.players.map(q=>({
  id:q.id,name:q.name,preserved:Boolean(q.preserved),
  heritage:q.resources.heranca||0,
  secretMissionCompleted:Boolean(q.secretCompletedAt),
  secretMissionBonus:q.secretCompletedAt?3:0,
  preservationBonus:q.preserved?(q.preservationBonus||0):0,
  total:q.preserved?(q.resources.heranca||0)+(q.secretCompletedAt?3:0)+(q.preservationBonus||0):null
 })):null,
 dominator:g.dominator||null,ruleNotes:g.ruleNotes||[]
}}
export function publicRegentView(g){
 const turn=g.players[g.turnIndex]||null;
 return {
  role:'regent',revision:g.revision,motherCode:g.motherCode,mode:g.mode||'multiplayer',phase:g.phase,round:g.round,
  turnPlayerId:turn?.id||null,hostPlayerId:g.hostPlayerId,
  playerOrder:g.players.map(x=>({id:x.id,name:x.name,house:x.house,preserved:x.preserved,arkFinalized:x.arkFinalized})),
  players:g.players.map(x=>({id:x.id,name:x.name,room:x.room,team:x.team,house:x.house,houseCode:byHouse.get(x.house)?.code||('P1-'+String(x.house*10).padStart(3,'0')),houseName:byHouse.get(x.house)?.name||'Casa',preserved:x.preserved,arkFinalized:x.arkFinalized,readyAt47:x.readyAt47,consequences:(x.consequences||[]).map(c=>({id:c.id,d4:c.d4,expiresRound:c.expiresRound})),specialChoices:x.specialChoices||{},mandamentoChoice:x.mandamentoChoice||null})),
  rooms:g.rooms.map(r=>({...r,players:g.players.filter(x=>x.room===r.code).map(x=>({id:x.id,name:x.name,house:x.house,team:x.team,preserved:x.preserved,arkFinalized:x.arkFinalized}))})),
  currentHouse:turn?byHouse.get(turn.house):null,
  globalStates:g.globalStates,violence:g.violence,arkOpened:g.arkOpened,preparationClosed:g.preparationClosed,
  rupturesResolved:g.rupturesResolved,pendingMarco:g.pendingMarco,pendingRupture:g.pendingRupture,
  pendingConsequencePlayers:g.pendingConsequencePlayers||[],pendingThreat:g.pendingThreat,pendingThreatResult:g.pendingThreatResult||null,
  activeThreats:g.activeThreats.map(t=>({id:t.id,card:t.card,name:`Nefilim ${t.card}`,successes:t.successes,aggravated:t.aggravated})),
  seenThreats:g.seenThreats,marcos:g.marcos,consequenceCards:master.consequences.distinctCards,
  recentHistory:g.history.slice(-50).filter(e=>!e.privateFor),masterVersion:master.masterVersion,
  finalScores:g.finalScores||null,dominator:g.dominator||null,ruleNotes:g.ruleNotes||[]
 }
}

export function applyRegentAction(g,a){
 if(!a||typeof a.type!=='string')fail('Ação do Regente inválida');
 let actor=null;
 if(a.type==='marcoD4')actor=g.players.find(x=>x.id===g.pendingMarco?.initiator);
 else if(a.type==='ruptureD4')actor=g.players.find(x=>x.id===g.pendingRupture?.initiator);
 else if(a.type==='threatSpawnD4')actor=g.players.find(x=>x.id===g.pendingThreat?.initiator);
 else if(a.type==='threatD4')actor=g.players.find(x=>x.id===g.pendingThreatResult?.by);
 else if(a.type==='dominatorD8')actor=g.players[g.dominator?.nextIndex];
 else if(a.type==='dominatorTierD4')actor=g.players.find(x=>x.id===g.dominator?.decider);
 else if(a.type==='advanceFinal')actor=g.players.find(x=>x.id===g.hostPlayerId);
 else fail('Esta ação permanece no aparelho do jogador');
 if(!actor)fail('Jogador responsável não encontrado');
 applyAction(g,actor,a);
}

function missionEligible(g,p){
 if(g.phase!=='active'||p.house>=50||p.offeredMove===g.round+':'+p.house)return false;
 const h=byHouse.get(p.house);
 return master.missionSystem.common.eligibleFamilies.some(f=>h.family.toLowerCase().includes(f.toLowerCase()))
  &&!master.missionSystem.common.ineligible.includes(h.anchorType);
}
function missionAttributeChoices(m){
 const r=m.requirement;
 if(m.id==='M06'||m.id==='M09'||m.id==='M15')return [];
 if(r.includes('Conhecimento ou Influência'))return ['conhecimento','influencia'];
 if(r.includes('Conhecimento'))return ['conhecimento'];
 if(r.includes('Influência'))return ['influencia'];
 return [];
}
function characterMissionBonus(g,p,m,a){
 const allowed=missionAttributeChoices(m);
 if(!allowed.length)return {bonus:0,character:'sem atributo definido',attribute:null};
 const attribute=allowed.length===1?allowed[0]:a.attribute;
 if(!allowed.includes(attribute))fail('Selecione o atributo permitido para esta Missão');
 const character=characters.find(c=>c.id===(p.characters.length===1?p.characters[0]:p.missionCharacterId)&&p.characters.includes(c.id)&&unlocked(p).some(u=>u.id===c.id));
 if(!character)return {bonus:0,character:'sem personagem responsável',attribute};
 const stat=character.attributes[attribute];
 if(!Number.isInteger(stat))fail('Atributo do Personagem não cadastrado');
 return {bonus:stat>=4?2:stat>=2?1:0,character:character.name,attribute};
}
function missionOffer(g,p,replace){
 const soloRepair=g.mode==='solo'&&p.mission?.id==='M19';
 if(!soloRepair&&!missionEligible(g,p))fail('Esta casa não oferece nova Missão');
 if(p.mission&&!soloRepair){if(!replace)fail('Mantenha a Missão atual ou substitua por 1 Influência');if(p.resources.influencia<1)fail('Influência insuficiente');change(p,'influencia',-1)}
 // Missao com destinatario obrigatorio nao pode ser sorteada em aventura solo.
 const all=master.commonMissions.filter(m=>m.phase===phaseFor(p.house)&&!(g.mode==='solo'&&m.id==='M19'));
 let pool=all.filter(m=>!p.missionHistory.includes(m.id));
 if(!pool.length)pool=all.filter(m=>m.id!==p.missionHistory.at(-1));
 if(!pool.length)pool=all;
 if(!pool.length)fail('Nenhuma Missão disponível nesta etapa');
 const m=pick(pool);p.mission={...m};p.missionHistory.push(m.id);p.offeredMove=g.round+':'+p.house;
 p.missionDonationSnapshot=p.donatedAmount;
 p.missionRandomBonus=null;
 log(g,'missao',soloRepair?`Missão incompatível com aventura solo substituída gratuitamente para ${p.name}`:`Missão privada oferecida a ${p.name}`,{privateFor:p.id});
}
function missionReward(g,p,n,a={}){
 const m=p.mission,amount=master.missionRewardD4ByDifficulty[m.difficulty][n];
 let key=m.baseReward.includes('Herança')||m.baseReward.includes('Heranças')?'heranca':m.baseReward.includes('Provis')?'provisoes':m.baseReward.includes('Influência')?'influencia':'conhecimento';
 if(m.id==='M19'){
  const q=g.players.find(q=>q.id===a.otherId&&q.id!==p.id);if(!q)fail('Escolha o jogador ajudado');
  if(a.rewardOption==='ambos'){gain(g,p,'provisoes',1);gain(g,q,'provisoes',1)}
  else gain(g,q,'provisoes',amount);
  p.directHelpCount=(p.directHelpCount||0)+1;
 }else{
  if(m.id==='M20')key=a.rewardOption==='heranca'?'heranca':'provisoes';
  const blocked=key==='heranca'&&(g.activeThreats.some(t=>t.card==='corruptor')||g.noHeritageGainThrough>=g.round);
  gain(g,p,key,blocked?0:amount);
 }
 if(m.id==='M05')gain(g,p,'conhecimento',1);
 if(m.id==='M11'){const q=g.players.find(q=>q.id===a.otherId&&q.id!==p.id);if(!q)fail('Escolha quem recebe Conhecimento');gain(g,q,'conhecimento',1);p.directHelpCount=(p.directHelpCount||0)+1}
 if(m.id==='M12')gain(g,p,'provisoes',1);
 if(m.id==='M14')gain(g,p,'conhecimento',1);
 if(m.id==='M17')gain(g,p,'influencia',1);
 if(m.id==='M15'&&g.activeThreats.length){g.activeThreats[0].successes++;p.threatContributions++}
 p.missionSuccesses++;if(m.difficulty==='Difícil')p.difficultMissionSuccess=true;
 log(g,'missao',`${p.name} concluiu ${m.name} · D4 ${n}`,{privateFor:p.id});p.mission=null;p.missionRewardPending=null;
}
function applyConsequence(g,p,id,n){
 if(!consequences[id])fail('Carta de Consequência inválida');
 p.consequenceCount++;const f=n>=3?2:1;
 switch(id){
 case 'CNS-P1-01':change(p,'provisoes',-f);if(n===4)change(p,'conhecimento',-1);break;
 case 'CNS-P1-02':if(n===4)change(p,'conhecimento',-1);p.consequences.push({id,d4:n,expiresRound:g.round,firstOnly:n===1,used:false});break;
 case 'CNS-P1-03':change(p,'conhecimento',-f);if(n===4)change(p,'influencia',-1);break;
 case 'CNS-P1-04':if(n===4)change(p,'conhecimento',-1);p.consequences.push({id,d4:n,expiresRound:g.round,firstOnly:n===1,used:false});break;
 case 'CNS-P1-05':if(n>=3)change(p,'influencia',-(n===4?2:1));p.consequences.push({id,d4:n,expiresRound:g.round});break;
 }
 log(g,'consequencia',`${p.name}: ${consequences[id].name} · D4 ${n}; devolver a carta ao fundo do baralho`,{privateFor:p.id});
}
function nextPending(g){
 if(g.marcoQueue?.length){g.pendingMarco=g.marcoQueue.shift();g.phase='marco-roll';return}
 if(g.personalPending){g.pendingMarco=g.personalPending;g.personalPending=null;g.phase='marco-individual';return}
 g.pendingMarco=null;
 if(g.pendingThreat){g.phase='threat-spawn';return}
 if(g.pendingConsequencePlayers?.length){g.phase='consequence-draw';return}
 if(g.pendingHouseOccurrence){g.phase='house-occurrence';return}
 if(g.pendingRupture){g.phase=g.pendingRupture.prepared.length>=g.players.length?'rupture-roll':'rupture-prep';return}
 g.phase='active';
}
function afterMove(g,p,old,n){
 syncFreeCollection(g,p);
 g.marcoQueue=master.marcos.filter(h=>h>old&&h<=n&&!g.marcos[h]).map(h=>({house:h,initiator:p.id,stopped:n===h}));
 if(marco.has(n)&&g.marcos[n]&&!p.marcoPersonal[n])g.personalPending={house:n,initiator:p.id,stopped:true};
 if(old<42&&n>=42){g.arkOpened=true;log(g,'arca','Arca revelada: 3 Provisões e 1 Personagem próprio')}
 if(old<38&&n>=38&&!g.seenThreats.length)g.pendingThreat={card:pick(threats),reason:'primeiro',initiator:p.id};
 else if(master.nefilim.escalation.eligibleHouses.includes(n)&&g.seenThreats.length<3&&g.lastSpawnRound!==g.round&&rand(4)===0){
  g.pendingThreat={card:pick(threats.filter(t=>!g.seenThreats.includes(t))),reason:'escalada',initiator:p.id};
 }
 if(master.consequences.houses.includes(n)&&n<50)g.pendingConsequencePlayers=[p.id];
 const occurrence=byHouse.get(n)?.occurrence;
 p.houseOccurrences ||= {};
 if(occurrence?.trigger==='exactLanding'&&!p.houseOccurrences[n])g.pendingHouseOccurrence={house:n,initiator:p.id,id:occurrence.id};
 if(n===47){p.readyAt47=p.preserved||arkReady(p);log(g,'arca',`${p.name}: ${p.readyAt47?'PRONTO':'EM RISCO'}`,{privateFor:p.id})}
 if(n===49&&!arkReady(p))log(g,'arca',`${p.name}: Última Oportunidade disponível`,{privateFor:p.id});
 if(n===50){p.checkpointProvisions=p.resources.provisoes;log(g,'arca',`${p.name} chegou ao fechamento da Arca`,{privateFor:p.id})}
 if(g.pendingRupture){g.pendingRupture.prepared=[p.id];p.firstRuptures++}
 nextPending(g);
}
function resolveHouseOccurrence(g,p,a){
 const pending=g.pendingHouseOccurrence;if(!pending||pending.initiator!==p.id)fail('Ocorrência de casa indisponível');
 const h=byHouse.get(pending.house),o=h?.occurrence;if(!o||p.house!==pending.house)fail('Ocorrência inválida');
 p.houseOccurrences ||= {};if(p.houseOccurrences[pending.house])fail('Ocorrência já resolvida');
 if(o.type==='resourceChoice'){
  const choice=String(a.choice||'');if(!o.choices.includes(choice))fail('Escolha um recurso válido');
  gain(g,p,choice,o.amount||1);
  log(g,'ocorrencia',`${p.name}: ${h.name} — +${o.amount||1} ${influenceLabel(choice)}`,{privateFor:p.id});
  p.houseOccurrences[pending.house]={choice,round:g.round};
 }else if(o.type==='narrative'){
  p.houseOccurrences[pending.house]={acknowledged:true,round:g.round};
  log(g,'ocorrencia',`${p.name}: ${h.name} — ocorrência narrativa concluída`,{privateFor:p.id});
 }else fail('Tipo de ocorrência não suportado');
 g.pendingHouseOccurrence=null;nextPending(g);
}
function influenceLabel(k){return {conhecimento:'Conhecimento',influencia:'Influência',provisoes:'Provisões',heranca:'Herança'}[k]||k}
function arkCost(p){return 3+(p.mission?2:0)}
function arkReady(p){return p.preserved||p.resources.provisoes>=arkCost(p)&&p.characters.length>0}
function enterArk(g,p,id){
 if(!arkReady(p)||!p.characters.includes(id))fail(`Entrada na Arca exige ${arkCost(p)} Provisões e um Personagem próprio`);
 change(p,'provisoes',-arkCost(p));p.preserved=true;p.preservedCharacterId=id;p.enteredAt48=p.house===48;
 log(g,'arca',`${p.name} entrou na Arca`,{privateFor:p.id});
}
function closeArk(g){
 if(g.players.every(p=>p.house===50&&p.arkFinalized)){
  g.preparationClosed=true;g.globalStates.PREPARACAO_DA_ARCA=false;
  log(g,'arca','Arca fechada: entrada e Personagem preservado travados');
 }
}
function resolveMarco(g,p,n){
 const h=g.pendingMarco.house,roll=number(n,1,4),m=master.marcoStates.find(x=>x.house===h);
 g.marcos[h]={d4:roll,by:p.id,round:g.round};g.globalStates[m.state]=true;
 if(h===10)everyone(g,{influencia:roll>=3?2:1});
 if(h===22)g.violence+=roll>=3?2:1;
 if(h===37)g.nextNefilimFailureExtra=roll>=3?roll-2:0;
 if(h===41&&roll>=3)everyone(g,{provisoes:roll===4?2:1});
 log(g,'marco',`${byHouse.get(h).name}: D4 coletivo ${roll}`);
 if(g.pendingMarco.stopped&&!p.marcoPersonal[h]){g.phase='marco-individual';return}
 nextPending(g);
}
function resolvePersonal(g,p,n){
 const h=g.pendingMarco.house,r=number(n,1,4);if(g.pendingMarco.initiator!==p.id)fail('Envolvimento reservado ao jogador que parou no Marco');
 const effects={6:[{}, {conhecimento:1},{conhecimento:1,heranca:1},{conhecimento:2,heranca:1}],
 10:[{influencia:1},{influencia:1},{influencia:1},{influencia:2}],
 22:[{}, {influencia:-1},{influencia:-1,heranca:-1},{influencia:-2,heranca:-1}],
 27:[{conhecimento:1},{conhecimento:1},{conhecimento:2},{conhecimento:2,influencia:1}],
 37:[{}, {influencia:-1},{influencia:-1,provisoes:-1},{influencia:-2,provisoes:-1}],
 41:[{provisoes:1},{provisoes:1},{provisoes:2},{provisoes:2,conhecimento:1}]};
 for(const [k,v] of Object.entries(effects[h][r-1]))gain(g,p,k,v);
 if(h===10&&r>=3)p.nextCooperationBonus=1;
 p.marcoPersonal[h]=true;log(g,'marco',`${p.name}: Envolvimento em ${byHouse.get(h).name} · D4 ${r}`,{privateFor:p.id});nextPending(g);
}
function resolveRupture(g,n){
 const h=g.pendingRupture.house,r=number(n,1,4),preserve=h===52;
 if(h===12){everyone(g,{heranca:r===1?0:r===2?-1:-2});if(r===4)g.noHeritageGainThrough=g.round}
 if(h===18){everyone(g,{provisoes:r===1?0:r===2?-1:-2});if(r===4)g.players.forEach(p=>p.cancelNextProvisionUnit=true)}
 if(h===24){everyone(g,{heranca:r<=2?-1:-2});if(g.globalStates.RESSENTIMENTO&&r>1)g.violence+=r===4?2:1}
 if(h===39){g.violence+=r===4?2:1;everyone(g,{influencia:r<=2?-1:-2});if(r>1)g.activeThreats.forEach(t=>t.aggravated=true)}
 if(h===52){everyone(g,{heranca:r<=2?-1:-2},{excludePreserved:true});for(const t of g.activeThreats){
  const final=t.card==='dominador'?{influencia:-1}:t.card==='corruptor'?{heranca:-1,influencia:-1}:{heranca:-1};
  const aggravated=Object.fromEntries(Object.entries(final).map(([k,v])=>[k,v-(r===4?1:0)-(t.aggravated?1:0)]));
  everyone(g,aggravated,{excludePreserved:true});
 }g.activeThreats=[]}
 for(const m of master.marcoStates)if(m.endsAtHouse===h)g.globalStates[m.state]=false;
 const ru=rup.get(h);g.rupturesResolved[ru.id]={d4:r,round:g.round,by:g.pendingRupture.initiator};
 g.players.forEach(p=>p.house=ru.nextHouse);g.pendingRupture=null;g.phase='active';
 log(g,'ruptura',`${ru.name}: D4 coletivo ${r}`);
}
function threatAppear(g,n){
 const t=g.pendingThreat,r=number(n,1,4);g.seenThreats.push(t.card);g.lastSpawnRound=g.round;
 g.activeThreats.push({id:uuid(),card:t.card,successes:0,aggravated:false});
 if(t.card==='opressor')everyone(g,{provisoes:r>=3?-2:-1,influencia:r===4?-1:0});
 if(t.card==='dominador')everyone(g,{influencia:r>=3?-2:-1,conhecimento:r===4?-1:0});
 if(t.card==='corruptor'){
  if(r>=3)everyone(g,{heranca:-1,influencia:r===4?-1:0});
  g.pendingConsequencePlayers.push(...g.players.map(p=>p.id));
 }
 log(g,'ameaca',`Nefilim ${t.card} surgiu · D4 ${r} (${t.reason})`);g.pendingThreat=null;nextPending(g);
}
function threatResult(g,p,t,n){
 const r=number(n,1,4),bonus=t.aggravated?1:0;
 if(g.phase==='threat-failure'){
  if(t.card==='opressor'){change(p,'provisoes',-(r>=3?2:1)-bonus-(g.nextNefilimFailureExtra||0));if(r===4)change(p,'influencia',-1)}
  if(t.card==='dominador')everyone(g,{influencia:-(r>=3?2:1)-bonus-(g.nextNefilimFailureExtra||0),conhecimento:r===4?-1:0});
  if(t.card==='corruptor'){change(p,'heranca',-(r>=3?2:1)-bonus-(g.nextNefilimFailureExtra||0));if(r===4)change(p,'influencia',-1)}
  g.nextNefilimFailureExtra=0;g.phase='active';log(g,'ameaca',`${p.name} sofreu falha contra Nefilim ${t.card} · D4 ${r}`);return;
 }
 if(t.card==='opressor')everyone(g,{heranca:r>=3?2:1,conhecimento:r===4?1:0});
 if(t.card==='corruptor'){
  const k=g.rewardAttribute;if(!['conhecimento','influencia','heranca'].includes(k))fail('Escolha o atributo coletivo');
  everyone(g,{[k]:r>=3?2:1,conhecimento:r===4?1:0});
 }
 g.activeThreats=g.activeThreats.filter(x=>x.id!==t.id);
 if(t.card==='dominador')g.dominator={nextIndex:0,decider:null,options:null};
 g.phase=t.card==='dominador'?'dominator-decider':'active';
 log(g,'ameaca',`Nefilim ${t.card} superado · D4 ${r}`);
}
function score(g){
 const eligible=g.players.filter(p=>p.preserved);
 const ranking=eligible.map(p=>({id:p.id,name:p.name,score:p.resources.heranca+(p.secretCompletedAt?3:0)+(p.preservationBonus||0),secretCompletedAt:p.secretCompletedAt,conversions:p.conversionCount,firstRuptures:p.firstRuptures}));
 ranking.sort((a,b)=>b.score-a.score||(a.secretCompletedAt??Infinity)-(b.secretCompletedAt??Infinity)||a.conversions-b.conversions||b.firstRuptures-a.firstRuptures);
 g.finalScores=ranking;g.phase='ended';log(g,'fim','Período 1 concluído e pontuação registrada');
}
function secretCheck(g,p,final=false){
 if(p.secretCompletedAt)return;
 const r=p.resources,id=p.secretMissionId;
 const done=({
 S01:final&&r.conhecimento>=6,S02:final&&r.influencia>=6,
 S03:p.checkpointProvisions>=5,S04:final&&r.heranca>=4,
 S05:p.house>=12&&admin.every(k=>r[k]>=3),S06:p.missionSuccesses>=3,
 S07:p.difficultMissionSuccess,S08:p.tradeCount>=3,S09:p.donatedAmount>=4,
 S10:p.directHelpCount>=1,S11:final&&p.consequenceCount>=2&&admin.every(k=>r[k]>0),
 S12:p.threatContributions>=1,S13:p.readyAt47,S14:p.enteredAt48,
 S15:p.house>=50&&admin.every(k=>r[k]>0),
 S16:p.missionSuccesses>=1&&p.tradeCount>=1&&p.threatContributions>=1
 })[id];
 if(done){p.secretCompletedAt=g.round*100+g.turnIndex+1;log(g,'missao',`${p.name} cumpriu a Missão Secreta`,{privateFor:p.id})}
}
function activeTurn(g,p){if(g.phase!=='active'||g.players[g.turnIndex]?.id!==p.id)fail('Não é seu turno normal')}
function firstRoundEntry(g,p){
 if(g.round!==1||p.house!==1||p.lastMovedRound===g.round)return;
 p.house=2;p.lastMovedRound=g.round;p.offeredMove=null;
 log(g,'movimento',`${p.name}: entrada inicial obrigatória P1-010 → P1-020 (sem D6)`);
 afterMove(g,p,1,2);
}
function endTurn(g,p){activeTurn(g,p);
 if(p.missionRewardPending)fail('Resolva o D4 da Missão antes de encerrar');
 g.turnIndex=(g.turnIndex+1)%g.players.length;
 if(g.turnIndex===0){
  g.round++;for(const t of g.activeThreats)if(t.card==='opressor')everyone(g,{provisoes:t.aggravated?-2:-1});
  g.players.forEach(q=>{q.consequences=q.consequences.filter(c=>c.expiresRound>=g.round);q.threatAttempts={}});
  log(g,'rodada',`Rodada ${g.round} começou`);
 }
 firstRoundEntry(g,g.players[g.turnIndex]);
}
function move(g,p,a){activeTurn(g,p);if(g.round===1&&p.house===1)fail('Na rodada inicial, a entrada na Casa 02 é automática; não role D6');if(p.house>=50)fail('A sequência P1-500 a P1-540 é coletiva e sem D6');
 if(p.lastMovedRound===g.round)fail('Você já se moveu nesta rodada');
 const roll=number(a.roll,1,6),old=p.house;
 const distance=roll;
 let n=Math.min(50,old+distance);const barrier=master.ruptures.find(r=>r.house>old&&r.house<=n&&!g.rupturesResolved[r.id]);
 if(barrier)n=barrier.house;
 p.house=n;p.lastMovedRound=g.round;p.offeredMove=null;
 log(g,'movimento',`${p.name}: D6 ${roll}, avanço ${distance} casa(s), P1-${String(old*10).padStart(3,'0')} → P1-${String(n*10).padStart(3,'0')}`,{roll,distance});
 if(barrier)g.pendingRupture={house:n,initiator:p.id,prepared:[p.id]};
 afterMove(g,p,old,n);
}
function missionAttempt(g,p,a){
 if(!p.mission)fail('Nenhuma Missão comum ativa');
 if(p.missionUsedRound===g.round)fail('A Missão já foi tentada nesta rodada');
 const m=p.mission,r=p.resources,req=m.requirement;
 if(req.includes('2+ Provisões')&&r.provisoes<2||req.includes('pelo menos 2 Provisões')&&r.provisoes<2)fail('Faltam 2 Provisões');
 if(req.includes('Ameaça ativa')&&!g.activeThreats.length)fail('Não há Ameaça ativa');
 if(req.includes('EM RISCO')&&!g.players.some(q=>q.id!==p.id&&!arkReady(q)))fail('Nenhum jogador EM RISCO');
 if(m.id==='M09'&&p.donatedAmount<=(p.missionDonationSnapshot||0))fail('Transfira voluntariamente 1 recurso após receber esta Missão');
 const support=characterMissionBonus(g,p,m,a);
 const bonus=support.bonus+(p.nextCooperationBonus||0);
 p.missionRandomBonus=null;
 p.nextCooperationBonus=0;p.missionUsedRound=g.round;
 const success=number(a.roll,1,6)+bonus>=m.target;
 log(g,'missao',`Teste de ${m.name}: ${support.character}${support.attribute?' / '+support.attribute:''} (+${support.bonus}), outros bônus +${bonus-support.bonus}, D6 ${a.roll}, alvo ${m.target}`,{privateFor:p.id});
 if(success){p.missionRewardPending=true;log(g,'missao',`${p.name} passou no teste de ${m.name}; D4 separado pendente`,{privateFor:p.id})}
 else {if(m.failure.startsWith('-1 Provis'))change(p,'provisoes',-1);if(m.failure.startsWith('-1 Conhecimento'))change(p,'conhecimento',-1);if(m.failure.startsWith('-1 Influência'))change(p,'influencia',-1);
  log(g,'missao',`${p.name} falhou em ${m.name}`,{privateFor:p.id})}
}
function convert(g,p,a){
 if((p.house<=12&&!g.rupturesResolved?.R12)||p.house>=50||g.preparationClosed)fail('Conversão fora da janela permitida');
 if(p.convertedRound===g.round)fail('Limite de uma conversão neste turno');
 const rate=master.conversion.rates[number(a.rate,0,5)];const [giveN,giveV]=Object.entries(rate.give)[0], [receiveN,receiveV]=Object.entries(rate.receive)[0];
 const from=influence[giveN],to=influence[receiveN];if(p.resources[from]<giveV)fail('Saldo insuficiente');
 change(p,from,-giveV);gain(g,p,to,receiveV);p.convertedRound=g.round;p.conversionCount++;
 log(g,'conversao',`${p.name}: ${giveV} ${giveN} por ${receiveV} ${receiveN}`);
}
function tradePropose(g,p,a){
 if(!['active','rupture-prep'].includes(g.phase)||p.house>=50||g.preparationClosed)fail('Troca indisponível');
 const q=g.players.find(x=>x.id===a.toId);if(!q||q.id===p.id)fail('Destinatário inválido');
 if(p.tradedRound===g.round||q.tradedRound===g.round)fail('Limite de negociação por jogador nesta rodada');
 if([p,q].some(x=>x.consequences.some(c=>c.id==='CNS-P1-05'&&c.expiresRound>=g.round)))fail('Violência Crescente proíbe trocas nesta rodada');
 if(!admin.includes(a.offerKey)||a.want&& !admin.includes(a.wantKey))fail('Herança não negociável');
 const offer=number(a.offer,1,99),want=number(a.want??0,0,99);if(p.resources[a.offerKey]<offer)fail('Saldo insuficiente');
 g.trades.push({id:uuid(),fromId:p.id,toId:q.id,offerKey:a.offerKey,offer,wantKey:a.wantKey||null,want,status:'pending'});
 log(g,'troca',`${p.name} propôs ${want?'troca':'doação'} a ${q.name}`);
}
function tradeAnswer(g,p,a){
 const t=g.trades.find(x=>x.id===a.tradeId&&x.toId===p.id&&x.status==='pending');if(!t)fail('Proposta indisponível');
 if(!a.accept){t.status='declined';return}
 const q=g.players.find(x=>x.id===t.fromId);
 if(q.tradedRound===g.round||p.tradedRound===g.round)fail('Limite de negociação por jogador nesta rodada');
 if([p,q].some(x=>x.consequences.some(c=>c.id==='CNS-P1-05'&&c.expiresRound>=g.round)))fail('Violência Crescente proíbe trocas');
 if(q.resources[t.offerKey]<t.offer||t.want&&p.resources[t.wantKey]<t.want)fail('Saldo insuficiente');
 if(t.offerKey==='provisoes'&&!canReceiveProvision(g,p,t.offer)||t.wantKey==='provisoes'&&!canReceiveProvision(g,q,t.want))fail('Solo Amaldiçoado: influência insuficiente para receber Provisões');
 change(q,t.offerKey,-t.offer);gain(g,p,t.offerKey,t.offer);
 if(t.want){change(p,t.wantKey,-t.want);gain(g,q,t.wantKey,t.want)}
 t.status='accepted';q.tradedRound=g.round;p.tradedRound=g.round;q.tradeCount++;p.tradeCount++;
 if(!t.want)q.donatedAmount+=t.offer;
 q.directHelpCount=(q.directHelpCount||0)+1;
 log(g,'troca',`${q.name} e ${p.name} concluíram ${t.want?'troca':'doação'}`);
}
function finalAdvance(g,p){
 if(p.id!==g.hostPlayerId)fail('Somente anfitrião conduz a sequência final');
 if(!g.preparationClosed)fail('A Arca ainda não foi fechada');
 if(g.players.some(q=>q.preserved&&q.preservationBonus===null))fail('Todos os preservados devem registrar o D6 secreto');
 const h=g.players[0].house;if(!g.players.every(q=>q.house===h))fail('Jogadores fora de sincronia');
 if(h===50){g.players.forEach(q=>q.house=51);log(g,'final','Sete dias de espera — P1-510');return}
 if(h===51){g.players.forEach(q=>q.house=52);g.pendingRupture={house:52,initiator:p.id,prepared:g.players.map(q=>q.id)};g.phase='rupture-roll';log(g,'final','O Dilúvio — D4 coletivo pendente');return}
 if(h===53){g.players.forEach(q=>q.house=54);g.players.forEach(q=>secretCheck(g,q,true));score(g);return}
 fail('Não há avanço coletivo pendente');
}
export function applyAction(g,p,a){
 if(!a||typeof a.type!=='string')fail('Ação inválida');
 switch(a.type){
 case 'roomCreate':if(p.id!==g.hostPlayerId||g.phase!=='lobby'||g.rooms.length>=5)fail('Sala indisponível');{let c=code();while(g.rooms.some(r=>r.code===c)||c===g.motherCode)c=code();g.rooms.push({code:c,name:String(a.name||`Sala ${g.rooms.length+1}`).slice(0,40),team:String(a.team||'').slice(0,30)});log(g,'sala',`Sala ${c} criada`)}break;
 case 'setup':if(g.phase!=='lobby'||p.setupDone)fail('Preparação inicial indisponível');if(!Array.isArray(a.rolls)||a.rolls.length!==3||!Array.isArray(a.order)||new Set(a.order).size!==3||a.order.some(k=>!admin.includes(k)))fail('Informe 3D6 e a distribuição dos recursos');a.order.forEach((k,i)=>p.resources[k]=2+Math.floor((number(a.rolls[i],1,6)-1)/2));p.setupDone=true;if((g.mode==='solo'||g.players.length>=2)&&g.players.every(q=>q.setupDone)){g.phase='active';log(g,'partida','Todos os jogadores preparados; partida iniciada automaticamente');firstRoundEntry(g,g.players[g.turnIndex])}break;
 case 'start':if(p.id!==g.hostPlayerId||g.phase!=='lobby'||(g.mode!=='solo'&&g.players.length<2)||g.players.some(q=>!q.setupDone))fail('O anfitrião inicia após todos prepararem os recursos');g.phase='active';log(g,'partida','Partida iniciada');firstRoundEntry(g,g.players[g.turnIndex]);break;
 case 'move':move(g,p,a);break;
 case 'endTurn':endTurn(g,p);break;
 case 'houseOccurrence':resolveHouseOccurrence(g,p,a);break;
 case 'missionOffer':activeTurn(g,p);missionOffer(g,p,!!a.replace);break;
 case 'missionDecline':activeTurn(g,p);if(!missionEligible(g,p))fail('Oportunidade indisponível');p.offeredMove=g.round+':'+p.house;break;
 case 'missionAttempt':activeTurn(g,p);missionAttempt(g,p,a);break;
 case 'missionD4':if(!p.missionRewardPending)fail('Recompensa de Missão ausente');missionReward(g,p,number(a.d4,1,4),a);break;
 case 'mandamentoChoice':if(!g.globalStates.MANDAMENTO||p.house!==6||p.mandamentoChoice)fail('Escolha do Mandamento indisponível para este jogador nesta casa');p.mandamentoChoice=a.refuse?'recusou':'não recusou';if(a.refuse){const roll=g.marcos[6]?.d4||2;gain(g,p,'heranca',roll>=3?2:1);if(roll===4)gain(g,p,'influencia',1)}break;
 case 'specialChoice':if(g.phase!=='active'||p.house!==7||!g.globalStates.MANDAMENTO||p.specialChoices[a.card])fail('Carta Especial indisponível nesta casa');
  if(a.card==='vida'){if(a.option==='heranca')gain(g,p,'heranca',2);else if(a.option==='provisoes')gain(g,p,'provisoes',2);else fail('Escolha inválida')}
  else if(a.card==='conhecimento'){if(p.mandamentoChoice!=='não recusou')fail('A escolha do fruto na Casa 07 exige ter mantido a decisão aberta na Casa 06');if(a.option==='aceitar'){gain(g,p,'conhecimento',3);change(p,'heranca',-5)}else if(a.option!=='recusar')fail('Escolha inválida')}
  else fail('Carta Especial inválida');p.specialChoices[a.card]=a.option;log(g,'especial',`${p.name} resolveu ${a.card==='vida'?'Árvore da Vida':'Árvore do Conhecimento'}`,{privateFor:p.id});break;
 case 'recruitCharacter':recruitCharacter(g,p,a);break;
 case 'freeCharacterChoice':{
  const cap=characterCapacity(g.players.length);
  syncFreeCollection(g,p);
  const free=cap-p.ownedCharacters.length;
  if(!free||!p.freeCharacterChoices?.length)fail('Não há escolha gratuita pendente');
  if(!Array.isArray(a.ids)||a.ids.length!==free||new Set(a.ids).size!==a.ids.length||a.ids.some(id=>!p.freeCharacterChoices.includes(id)))fail(`Selecione exatamente ${free} personagem(ns) desbloqueado(s)`);
  for(const id of a.ids){p.ownedCharacters.push(id);log(g,'personagem',`${p.name} escolheu ${characters.find(c=>c.id===id)?.name} gratuitamente`,{privateFor:p.id})}
  p.freeCharacterChoices=[];
 }break;
 case 'characters':{
  if(!p.setupDone||g.phase==='ended'||p.house>=50)fail('Seleção de personagens indisponível');
  syncFreeCollection(g,p);
  if(!Array.isArray(a.ids)||a.ids.length>2||new Set(a.ids).size!==a.ids.length||a.ids.some(id=>!p.ownedCharacters.includes(id)))fail('Selecione até dois personagens da sua coleção');
  p.characters=a.ids;
  // A selecao na aba Jogador define o personagem usado nas missoes.
  // Um personagem ativo e assumido automaticamente; com dois, exige nova escolha.
  p.missionCharacterId=a.ids.length===1?a.ids[0]:null;
 }break;
 case 'missionCharacterSelect':{
  if(!p.setupDone||g.phase==='ended'||p.house>=50)fail('Seleção do responsável indisponível');
  if(!p.characters.includes(a.characterId))fail('Escolha um dos personagens ativos');
  p.missionCharacterId=a.characterId;
 }break;
 case 'convert':if(!['active','rupture-prep'].includes(g.phase))fail('Conversão indisponível');convert(g,p,a);break;
 case 'tradePropose':tradePropose(g,p,a);break;
 case 'tradeAnswer':tradeAnswer(g,p,a);break;
 case 'prepare':if(g.phase!=='rupture-prep'||!g.pendingRupture||g.pendingRupture.initiator===p.id||g.pendingRupture.prepared.includes(p.id))fail('Última preparação indisponível');
  if(a.option==='mission')missionAttempt(g,p,a);else if(a.option==='convert')convert(g,p,a);else if(a.option!=='pass')fail('Escolha Missão, conversão ou passar');
  g.pendingRupture.prepared.push(p.id);if(g.pendingRupture.prepared.length===g.players.length)g.phase='rupture-roll';break;
 case 'marcoD4':if(g.phase!=='marco-roll'||g.pendingMarco.initiator!==p.id)fail('D4 coletivo do Marco indisponível');resolveMarco(g,p,a.d4);break;
 case 'marcoIndividualD4':if(g.phase!=='marco-individual')fail('Envolvimento de Marco indisponível');resolvePersonal(g,p,a.d4);break;
 case 'ruptureD4':if(g.phase!=='rupture-roll'||g.pendingRupture?.initiator!==p.id)fail('D4 coletivo da Ruptura indisponível');resolveRupture(g,a.d4);break;
 case 'consequence':if(g.phase!=='consequence-draw'||g.pendingConsequencePlayers[0]!==p.id)fail('Carta de Consequência indisponível');applyConsequence(g,p,a.card,number(a.d4,1,4));g.pendingConsequencePlayers.shift();nextPending(g);break;
 case 'threatSpawnD4':if(g.phase!=='threat-spawn'||g.pendingThreat?.initiator!==p.id)fail('D4 de entrada pertence a quem acionou a Ameaça');threatAppear(g,a.d4);break;
 case 'threatAttempt':activeTurn(g,p);{const t=g.activeThreats.find(x=>x.id===a.threatId);if(!t)fail('Ameaça inexistente');if(p.threatAttempts[t.id]===g.round)fail('Ameaça já enfrentada nesta rodada');
  const options=t.card==='opressor'?['conhecimento','influencia']:t.card==='dominador'?['influencia','heranca']:['conhecimento','heranca'];
  if(!options.includes(a.attribute))fail('Atributo inválido');const target=6+(t.card!=='dominador'&&g.activeThreats.some(x=>x.card==='dominador')?1:0);
  const success=number(a.roll,1,6)+p.resources[a.attribute]>=target;p.threatAttempts[t.id]=g.round;
  if(success){t.successes++;p.threatContributions++;log(g,'ameaca',`${p.name} obteve sucesso contra Nefilim ${t.card} (${t.successes}/3)`);if(t.successes>=3){
    if(t.card==='dominador'){g.activeThreats=g.activeThreats.filter(x=>x.id!==t.id);g.dominator={nextIndex:0,decider:null,options:null};g.phase='dominator-decider'}
    else{g.pendingThreatResult={id:t.id,by:p.id};g.phase='threat-reward'}
  }}
  else{g.pendingThreatResult={id:t.id,by:p.id};g.phase='threat-failure'}
 }break;
 case 'threatD4':if(!['threat-failure','threat-reward'].includes(g.phase)||g.pendingThreatResult?.by!==p.id)fail('D4 de Ameaça indisponível');{const t=g.activeThreats.find(x=>x.id===g.pendingThreatResult.id);g.rewardAttribute=a.attribute;threatResult(g,p,t,a.d4);g.pendingThreatResult=null;g.rewardAttribute=null}break;
 case 'dominatorD8':if(g.phase!=='dominator-decider'||g.players[g.dominator.nextIndex]?.id!==p.id)fail('D8 do Decisor indisponível');if(number(a.roll,1,8)===8){g.dominator.decider=p.id;g.phase='dominator-tier'}else g.dominator.nextIndex=(g.dominator.nextIndex+1)%g.players.length;break;
 case 'dominatorTierD4':if(g.phase!=='dominator-tier'||g.dominator.decider!==p.id)fail('D4 do Decisor indisponível');g.dominator.tier=number(a.d4,1,4);g.dominator.options=master.nefilim.tables.dominador.onDefeat.d4RewardTiers[g.dominator.tier];g.phase='dominator-choice';break;
 case 'dominatorChoice':if(g.phase!=='dominator-choice'||g.dominator.decider!==p.id)fail('Escolha do Decisor indisponível');{const i=number(a.option,0,2),tier=g.dominator.tier,opts=[
  [{all:{influencia:1},personal:{provisoes:1}},{all:{conhecimento:1},personal:{influencia:1}},{all:{provisoes:1},personal:{conhecimento:1}}],
  [{all:{influencia:1},personal:{provisoes:2}},{all:{conhecimento:1},personal:{influencia:2}},{all:{provisoes:1},personal:{conhecimento:2}}],
  [{violence:-1,personal:{provisoes:2}},{all:{conhecimento:1},personal:{provisoes:2}},{other:{provisoes:2},personal:{influencia:2}}],
  [{all:{provisoes:1},violence:-1},{all:{conhecimento:1,influencia:1}},{all:{influencia:1},personal:{provisoes:3}}]
 ][tier-1][i];if(opts.all)everyone(g,opts.all);if(opts.personal)for(const [k,v] of Object.entries(opts.personal))gain(g,p,k,v);
 if(opts.other){const q=g.players.find(x=>x.id===a.otherId&&x.id!==p.id);if(!q)fail('Escolha outro jogador');gain(g,q,'provisoes',2)}
 if(opts.violence)g.violence=Math.max(0,g.violence+opts.violence);g.dominator=null;g.phase='active'}break;
 case 'arkEnter':if(g.phase!=='active'||p.house!==48||p.preserved||g.preparationClosed)fail('Entrada antecipada só ao parar em P1-480');enterArk(g,p,a.characterId);break;
 case 'lastChance':if(g.phase!=='active'||p.house!==49||p.lastChanceUsed||arkReady(p))fail('Última Oportunidade indisponível');p.lastChanceUsed=true;if(number(a.roll,1,6)>=5)gain(g,p,'provisoes',1);log(g,'arca',`${p.name}: Última Oportunidade ${a.roll>=5?'sucesso (+1 Provisão)':'sem ganho'}`,{privateFor:p.id});break;
 case 'arkFinalize':if(g.phase!=='active'||p.house!==50||p.arkFinalized||g.preparationClosed)fail('Fechamento individual indisponível');if(a.enter&&!p.preserved)enterArk(g,p,a.characterId);if(!a.enter&&p.preserved)fail('Entrada antecipada não pode ser revertida');p.arkFinalized=true;closeArk(g);break;
 case 'preservationD6':if(!g.preparationClosed||!p.preserved||p.preservationBonus!==null)fail('Bônus secreto indisponível');p.preservationBonus=number(a.roll,1,6);log(g,'preservacao',`${p.name} registrou o D6 secreto`,{privateFor:p.id});break;
 case 'advanceFinal':finalAdvance(g,p);break;
 case 'correctPosition':if(g.phase!=='active'||p.house>=50)fail('Correção fora da sequência normal');{
  const reason=String(a.reason||'').trim();const to=number(a.house,1,49);
  if(reason.length<6)fail('Informe o motivo da correção');
  if(to>p.house+6||to<p.house-6)fail('Correção excepcional limitada a seis casas; consulte a mesa');
  if(master.ruptures.some(r=>!g.rupturesResolved[r.id]&&((r.house>p.house&&r.house<=to)||(r.house>to&&r.house<=p.house))))fail('Correção não pode atravessar uma Ruptura pendente');
  const code='P1-'+String(to*10).padStart(3,'0');p.house=to;log(g,'correcao',`${p.name} corrigiu posição para ${code}: ${reason}`,{privateFor:p.id})}break;
 default:fail('Ação desconhecida');
 }
 for(const q of g.players){syncFreeCollection(g,q);secretCheck(g,q)}
}
