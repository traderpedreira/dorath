/* Modo visual reversível: não modifica partida nem backend. */
(()=>{
 const KEY='dorath.interface.mode.v1';
 const button=document.getElementById('dorathModeToggle');
 if(!button)return;
 const q=new URLSearchParams(location.search);
 let classic=q.get('classic')==='1';
 if(!q.has('classic')){try{classic=localStorage.getItem(KEY)==='classic'}catch{}}
 function apply(){document.documentElement.classList.toggle('dorath-classic',classic);button.textContent=classic?'Usar interface nova':'Voltar à interface anterior';button.setAttribute('aria-pressed',String(classic));button.title=classic?'Exibir a nova interface':'Exibir os oito painéis como antes';try{localStorage.setItem(KEY,classic?'classic':'stage')}catch{}}
 button.addEventListener('click',()=>{classic=!classic;apply()});apply();
})();
