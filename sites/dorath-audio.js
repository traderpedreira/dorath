// Dorath audio-only controller. Does not influence game rules.
const AUDIO_ROOT='./audio/period-01/zone-01/';
const TRACKS={stream:'ambience/eden_field_stream_crickets',forest:'ambience/eden_field_forest',tension:'ambience/eden_tension',post:'ambience/eden_postfall',command:'stingers/stinger_command',eve:'stingers/stinger_eve',fall:'stingers/stinger_fall'};
export class DorathAudio {
 constructor(){this.enabled=false;this.ambient=true;this.effects=true;this.volume=.5;this.players=new Map();this.last=null;this.game=null;this.seen=new Set();this.silenceUntil=0;this.firstSnapshot=true;this.status=()=>{};document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopAll();else if(this.enabled&&this.last)this.render(this.last)});}
 async activate(){this.enabled=true;try{const AudioContext=window.AudioContext||window.webkitAudioContext;this.context??=new AudioContext();await this.context.resume();this.status('Experiência sonora ativada');if(this.last)this.render(this.last)}catch(e){this.status('Áudio indisponível neste navegador');}}
 disable(){this.enabled=false;this.stopAll();this.status('Experiência sonora desativada')}
 setVolume(v){this.volume=Math.max(0,Math.min(1,Number(v)||0));for(const p of this.players.values())p.el.volume=this.volume*p.gain}
 stopAll(){for(const p of this.players.values()){p.el.pause();p.el.removeAttribute('src');p.el.load()}this.players.clear()}
 async source(id){const stem=AUDIO_ROOT+TRACKS[id];if(!stem)return null;const audio=document.createElement('audio');const formats=[['.ogg','audio/ogg; codecs="opus"'],['.m4a','audio/mp4']];const choice=formats.find(([ext,mime])=>audio.canPlayType(mime)!=='')||formats[1];return stem+choice[0]}
 async play(id,gain,loop=false){if(!this.enabled||document.hidden)return;if(this.players.has(id)){this.players.get(id).gain=gain;this.setVolume(this.volume);return}
 const src=await this.source(id);if(!src)return;const el=new Audio(src);el.loop=loop;el.preload='auto';el.volume=this.volume*gain;el.onerror=()=>{this.players.delete(id);this.status('Algumas camadas sonoras não foram carregadas')};this.players.set(id,{el,gain});try{await el.play()}catch{this.players.delete(id)}if(!loop)el.onended=()=>this.players.delete(id);}
 stop(id){const p=this.players.get(id);if(p){p.el.pause();p.el.src='';this.players.delete(id)}}
 async render(v){if(!this.enabled||document.hidden)return;const fallen=!!v.rupturesResolved?.R12;const isFall=fallen||this.fallen;
 // Global ruptures are read from the existing server state, never derived from local movement.
 if(fallen)this.fallen=true;
 const house=Number(v.me?.house||1);const next=new Map();
 if(this.ambient&&Date.now()>=this.silenceUntil){
  if(isFall)next.set('post',.24);
  else if(house===11){next.set('tension',.18)}
  else if(house<=10){next.set('stream',house===10?.38:.50);next.set('forest',house===10?.35:.47)}
 }
 for(const name of ['stream','forest','tension','post'])if(!next.has(name))this.stop(name);
 for(const [name,gain] of next)await this.play(name,gain,true);
 }
 async update(v){const session=v.motherCode||'session';if(this.game!==session){this.game=session;this.seen.clear();this.firstSnapshot=true;this.fallen=false;this.silenceUntil=0;this.stopAll()}
 this.last=v;const detected=[];
 if(v.marcos?.[6])detected.push(['marco-6','command']);
 if(v.marcos?.[10])detected.push(['marco-10','eve']);
 const fallKey=v.rupturesResolved?.R12?'R12':null;
 if(fallKey)detected.push(['rupture-12','fall']);
 // On joining, historical events must never replay.
 if(this.firstSnapshot){for(const [key] of detected)this.seen.add(key);this.firstSnapshot=false}
 else for(const [key,track] of detected){if(this.seen.has(key))continue;this.seen.add(key);if(track==='fall'){this.fallen=true;this.silenceUntil=Date.now()+6500;this.stopAll();if(this.effects)await this.play(track,.7,false);setTimeout(()=>{if(this.enabled&&this.last)this.render(this.last)},6500)}else if(this.effects)await this.play(track,.55,false)}
 await this.render(v);
 }
}
