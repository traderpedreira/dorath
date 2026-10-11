/* Dorath presentation-only navigation.
   No Supabase calls, no game data mutation, no changes to gameplay handlers. */
(() => {
 const board=document.getElementById('board');
 if(!board)return;
 const grid=board.querySelector('.mp-grid');
 const defs=[
  ['movement','Movimento','◈'],
  ['missions','Missão','✦'],
  ['world','Evento','!'],
  ['player','Jogador','♛'],
  ['rooms','Salas','⌂'],
  ['threats','Ameaças','⚔'],
  ['trades','Trocas','⇄'],
  ['history','Histórico','☷']
 ];
 const nav=document.createElement('nav');nav.className='dorath-dock';nav.setAttribute('aria-label','Navegação da partida');
 const navIds=['movement','missions','world','player','history'];
 const labels={movement:'Jogar',missions:'Missão',world:'Eventos',player:'Jogador',history:'Mais'};
 const icons={movement:'◈',missions:'✧',world:'✦',player:'♟',history:'☰'};
 for(const id of navIds){const b=document.createElement('button');b.type='button';b.className='dorath-tab';b.dataset.dorathTab=id;b.innerHTML='<span aria-hidden="true">'+icons[id]+'</span><small>'+labels[id]+'</small>';nav.append(b)}
 const picker=document.createElement('div');picker.className='dorath-extras';picker.hidden=true;
 for(const [id,name,symbol] of defs){const b=document.createElement('button');b.type='button';b.dataset.dorathPanel=id;b.textContent=symbol+' '+name;picker.append(b)}
 board.append(picker,nav);
 const mini=document.createElement('div');mini.className='dorath-card-strip';mini.innerHTML='<div class="dorath-card-mini"><span>✦</span><div><small>CARTA DO JOGADOR</small><strong id="dorathCardName">Jogador</strong></div></div><div class="dorath-card-mini"><span>♛</span><div><small>PERSONAGENS</small><strong id="dorathCharacters">—</strong></div></div>';
 grid.before(mini);
 const step=document.createElement('div');step.className='dorath-step';step.setAttribute('role','status');step.setAttribute('aria-live','polite');grid.before(step);
 let selected='movement',lastSignature='',manual=false;
 function panel(id){return document.getElementById(id)}
 function show(id,fromUser=false){
  if(!panel(id))return;
  selected=id;manual=fromUser;
  for(const [key] of defs){const el=panel(key);if(el){el.classList.toggle('dorath-current',key===id);el.classList.toggle('dorath-inactive',key!==id)}}
  for(const b of nav.querySelectorAll('button')){const active=b.dataset.dorathTab===(navIds.includes(id)?id:'history');b.classList.toggle('selected',active);b.setAttribute('aria-current',active?'page':'false')}
  picker.hidden=true;
  const name={movement:'Seu próximo passo',missions:'Missão',world:'Ocorrências e Arca',player:'Carta do Jogador',rooms:'Salas',threats:'Ameaças coletivas',trades:'Interação entre jogadores',history:'Histórico'}[id]||'Partida';
  step.textContent=name;
 }
 nav.addEventListener('click',e=>{const b=e.target.closest('[data-dorath-tab]');if(!b)return;const id=b.dataset.dorathTab;if(id==='history'){picker.hidden=!picker.hidden;return}show(id,true)});
 picker.addEventListener('click',e=>{const b=e.target.closest('[data-dorath-panel]');if(b)show(b.dataset.dorathPanel,true)});
 // Detect available action controls. Current movement is a fallback only.
 const reactiveIds=['world','missions','threats','trades','movement'];
 const ignoredActions=new Set(['correctPosition','convert','tradePropose','characters','endTurn','roomCreate']);
 function priority(){
  for(const id of reactiveIds){const p=panel(id);if(!p)continue;
   const relevant=[...p.querySelectorAll('[data-action]')].some(x=>!ignoredActions.has(x.dataset.action));
   if(relevant)return id;
  }
  const move=panel('movement');
  if(move&&/Aguarde|turno|Movimento|Preparação/i.test(move.textContent))return 'movement';
  return selected;
 }
 function fingerprint(){
  return reactiveIds.map(id=>{const p=panel(id);return id+':'+(p?[...p.querySelectorAll('[data-action]')].map(x=>x.dataset.action+(x.dataset.roll||'')).join(','):'')}).join('|');
 }
 function refresh(){
  if(board.hidden)return;
  const signature=fingerprint();
  const name=panel('player')?.querySelector('h3')?.textContent||'Jogador';
  const chars=panel('player')?.querySelectorAll('p')[2]?.textContent||'Personagens';
  document.getElementById('dorathCardName').textContent=name.replace(/\s*·\s*Carta do Jogador.*/,'').slice(0,36);
  document.getElementById('dorathCharacters').textContent=chars.replace(/^Personagens \(até 2\):\s*/,'').slice(0,45)||'Nenhum selecionado';
  if(signature!==lastSignature){lastSignature=signature;show(priority(),false)}
  else if(!manual&&!panel(selected)?.classList.contains('dorath-current'))show(selected,false);
 }
 let scheduled=false;
 const obs=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;refresh()})});
 for(const [id] of defs){const p=panel(id);if(p)obs.observe(p,{childList:true,subtree:true})}
 obs.observe(board,{attributes:true,attributeFilter:['hidden']});
 show('movement');refresh();
})();
