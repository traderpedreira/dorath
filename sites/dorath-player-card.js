/* Dorath V4: ficha biografica somente no navegador; nenhuma regra alterada. */
(()=>{
 const board=document.getElementById('board'),root=document.getElementById('player');
 if(!board||!root)return;
 const fields=[['origem','Origem / trajetória',120],['historia','História do jogador',600],['notas','Anotações pessoais',600],['tag1','Tag 1',50],['tag2','Tag 2',50],['tag3','Tag 3',50],['anoBatismo','Ano de batismo',40],['tempoServico','Tempo de serviço',60],['congregacaoCidade','Congregação / Cidade',100]];
 const key=()=> 'dorath.visual.profile.v1.'+(document.getElementById('accountEmail')?.textContent?.trim()||'local');
 let stored={},lastAccount='';
 const section=document.createElement('section');section.id='dorathPersonalHistory';section.className='dorath-personal-history';
 const header=document.createElement('div');header.innerHTML='<h4>Personalizar Carta do Jogador</h4><p>Foto, trajetória e história são pessoais. Os recursos e o histórico oficial permanecem controlados pelo jogo.</p>';section.append(header);
 for(const [id,label,max] of fields){const l=document.createElement('label');l.htmlFor='dorath-profile-'+id;l.textContent=label;const el=document.createElement(id==='origem'?'input':'textarea');el.id=l.htmlFor;el.maxLength=max;el.placeholder='Escreva aqui...';if(el.tagName==='TEXTAREA')el.rows=3;section.append(l,el)}
 const status=document.createElement('small');status.id='dorathPersonalStatus';status.textContent='Salvo somente neste aparelho';section.append(status);
 function load(){const account=key();if(account===lastAccount)return;lastAccount=account;try{stored=JSON.parse(localStorage.getItem(account)||'{}')||{}}catch{stored={}}for(const [id] of fields){section.querySelector('#dorath-profile-'+id).value=stored[id]||''}}
 section.addEventListener('input',e=>{const id=e.target.id.replace('dorath-profile-','');if(!fields.some(x=>x[0]===id))return;stored[id]=e.target.value;try{localStorage.setItem(key(),JSON.stringify(stored));status.textContent='Salvo somente neste aparelho'}catch{status.textContent='Não foi possível salvar; espaço insuficiente'}});
 function mount(){if(board.hidden)return;if(!root.contains(section))root.append(section);load()}
 new MutationObserver(mount).observe(root,{childList:true});
 new MutationObserver(mount).observe(board,{attributes:true,attributeFilter:['hidden']});mount();
})();
