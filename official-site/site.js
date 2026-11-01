const menu=document.querySelector('.menu');const links=document.querySelector('.nav-links');if(menu&&links){menu.addEventListener('click',()=>links.classList.toggle('open'))}
const form=document.querySelector('[data-playtest-form]');if(form){form.addEventListener('submit',e=>{e.preventDefault();const status=form.querySelector('[data-status]');status.textContent='Cadastro de interesse registrado apenas nesta prévia. A integração definitiva será ativada antes da abertura pública.';status.hidden=false;})}
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduceMotion){
 const layers=[...document.querySelectorAll('.hero-v2 [data-parallax]')];
 const hero=document.querySelector('.hero-v2');
 const updateParallax=()=>{
  if(!hero)return;
  const r=hero.getBoundingClientRect(),center=r.top+r.height/2,viewport=innerHeight/2;
  const delta=Math.max(-1,Math.min(1,(viewport-center)/Math.max(innerHeight,r.height)));
  layers.forEach(el=>{const strength=Number(el.dataset.parallax||0);el.style.translate='0 '+(delta*strength*180)+'px';});
 };
 addEventListener('scroll',updateParallax,{passive:true});addEventListener('resize',updateParallax);updateParallax();
}
