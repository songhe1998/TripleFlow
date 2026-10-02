'use strict';
const players = new Set();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock = (s) => Number.isFinite(s) ? s.toFixed(1) : '0.0';

function playerHTML(item, comparison = false, caption = false) {
  const order = ['source','n7','omnimattezero','objectwiper','contextflow5b','omnieraser'];
  const videos = [...item.videos].sort((a,b) => order.indexOf(a.method)-order.indexOf(b.method));
  return `<div class="player ${comparison ? 'comparison-player' : ''}" data-case="${escapeHTML(item.id)}">
    <div class="video-grid">${videos.map(v => `<figure class="video-cell"><figcaption class="video-label ${v.method==='n7'?'ours':''}"><span>${v.method==='source'?'Input video':v.method==='n7'?'TripleFlow (ours)':v.method==='contextflow5b'?'ContextFlow':escapeHTML(v.label)}</span><a class="expand-video" href="${escapeHTML(v.file)}" target="_blank" rel="noopener" aria-label="Open ${escapeHTML(v.label)} video for ${escapeHTML(item.name)}">Enlarge</a></figcaption><video muted playsinline preload="none" poster="${escapeHTML(v.poster)}" data-src="${escapeHTML(v.file)}" aria-label="${escapeHTML(v.label)}: ${escapeHTML(item.title)}" width="${v.width}" height="${v.height}"></video></figure>`).join('')}</div>
    ${caption?`<div class="player-caption"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p></div>`:''}
    <div class="player-bar"><button type="button" class="play-toggle" aria-label="Play all videos for ${escapeHTML(item.name)}">Play</button><button type="button" class="restart" aria-label="Restart videos for ${escapeHTML(item.name)}" title="Restart">↺</button><input class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek videos for ${escapeHTML(item.name)}"><span class="time">0.0 / ${clock(videos[0].frames/videos[0].fps)}</span></div><p class="player-error" role="status" hidden></p>
  </div>`;
}

class SyncedPlayer {
  constructor(root) {
    this.root=root; this.videos=[...root.querySelectorAll('video')]; this.leader=this.videos[0]; this.playing=false; this.loading=false; this.alive=true; this.loaded=false;
    this.button=root.querySelector('.play-toggle'); this.seek=root.querySelector('.seek'); this.time=root.querySelector('.time'); this.message=root.querySelector('.player-error');
    this.duration=CASES[root.dataset.case].videos[0].frames/CASES[root.dataset.case].videos[0].fps;
    this.button.addEventListener('click',()=>this.playing||this.loading?this.pause():this.play());
    root.querySelector('.restart').addEventListener('click',async()=>{await this.load(); this.setTime(0);});
    this.seek.addEventListener('input',async()=>{const t=Number(this.seek.value)/1000*this.duration;await this.load();this.setTime(t);});
    this.videos.forEach(v=>{v.muted=true;v.addEventListener('error',()=>{this.pause();this.message.textContent='This video could not load. Use Enlarge to open it directly, or try again.';this.message.hidden=false;});});
    this.leader.addEventListener('ended',()=>{if(this.playing){this.setTime(0);this.videos.forEach(v=>v.play().catch(()=>this.pause()));}});
    this.tick=()=>{if(!this.alive)return;if(this.playing&&!this.seek.matches(':active')){const t=this.leader.currentTime;this.seek.value=String(t/this.duration*1000);this.time.textContent=`${clock(t)} / ${clock(this.duration)}`;this.videos.slice(1).forEach(v=>{if(v.readyState>=2&&Math.abs(v.currentTime-t)>0.12)v.currentTime=t;});}this.raf=requestAnimationFrame(this.tick);};
    this.tick();players.add(this);observer.observe(root);
  }
  async load() {
    if(this.loaded)return this.ready;
    this.loaded=true;
    this.ready=Promise.all(this.videos.map(v=>new Promise((resolve,reject)=>{v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',reject,{once:true});v.preload='auto';v.src=v.dataset.src;v.load();}))).then(()=>{this.duration=Math.min(...this.videos.map(v=>v.duration).filter(Number.isFinite));this.time.textContent=`${clock(this.leader.currentTime)} / ${clock(this.duration)}`;});
    return this.ready;
  }
  async play() {
    if(!this.alive)return;this.loading=true;this.button.textContent='Loading';
    try{await this.load();if(!this.loading||!this.alive)return;await Promise.all(this.videos.map(v=>v.play()));if(!this.loading||!this.alive){this.videos.forEach(v=>v.pause());return;}this.playing=true;this.loading=false;this.button.textContent='Pause';this.button.setAttribute('aria-label','Pause synchronized videos');this.message.hidden=true;}
    catch{this.pause();}
  }
  pause(){this.loading=false;this.playing=false;this.videos.forEach(v=>v.pause());this.button.textContent='Play';this.button.setAttribute('aria-label','Play synchronized videos');}
  setTime(t){const n=Math.max(0,Math.min(t,this.duration-0.001));this.videos.forEach(v=>{if(v.readyState>=1)v.currentTime=n;});this.seek.value=String(n/this.duration*1000);this.time.textContent=`${clock(n)} / ${clock(this.duration)}`;}
  destroy(){this.pause();this.alive=false;cancelAnimationFrame(this.raf);observer.unobserve(this.root);players.delete(this);this.videos.forEach(v=>{v.removeAttribute('src');v.load();});}
}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{const player=[...players].find(p=>p.root===entry.target);if(!player)return;if(!entry.isIntersecting)player.pause();else if(player.root.dataset.autoplay==='true'){delete player.root.dataset.autoplay;player.play();}}),{threshold:0.05});
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pause());});

function renderSelector(tabsId,demoId,ids,comparison=false){
  const tabs=document.getElementById(tabsId),demo=document.getElementById(demoId);let player=null;
  const select=(id,autoplay)=>{if(player)player.destroy();demo.innerHTML=playerHTML(CASES[id],comparison,true);const root=demo.querySelector('.player');if(autoplay)root.dataset.autoplay='true';player=new SyncedPlayer(root);tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));};
  ids.forEach((id,i)=>{const b=document.createElement('button');b.type='button';b.dataset.id=id;b.textContent=CASES[id].name;b.setAttribute('aria-pressed',String(i===0));b.addEventListener('click',()=>select(id,!reduceMotion));tabs.append(b);});
  select(ids[0],!comparison&&!reduceMotion);
}
renderSelector('hero-tabs','hero-demo',['me12_kayak_canal','p09_gallery','wild_mirror_hard','p04_courtyard_bicycle']);
const galleryIds=['p09_gallery','p17_scooter','wild_mirror_hard','egret_2_1','wild_kitchen','p18_farm_horse','me07_cactus_steps','p04_courtyard_bicycle'];
document.getElementById('gallery').innerHTML=galleryIds.map(id=>{const c=CASES[id];return `<article class="result-card ${c.videos[0].height>c.videos[0].width?'portrait':''}"><div class="card-heading"><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.detail)}</p></div>${playerHTML(c)}<p class="instruction">${escapeHTML(c.title)}</p></article>`;}).join('');
document.querySelectorAll('#gallery .player').forEach(root=>new SyncedPlayer(root));
renderSelector('comparison-tabs','comparison-demo',['t02_bookcase','t06_forklift_shelves','t01_carved_door','t09_mirror_entryway'],true);
fetch('assets/abstract.txt').then(r=>{if(!r.ok)throw new Error();return r.text();}).then(t=>document.getElementById('abstract-text').textContent=t).catch(()=>{document.getElementById('abstract-text').innerHTML='Read the full abstract <a href="https://arxiv.org/abs/2609.39157">on arXiv</a>.';});
document.getElementById('copy-citation').addEventListener('click',async()=>{const text=document.getElementById('bibtex').textContent,status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(text);status.textContent='BibTeX copied.';}catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(document.getElementById('bibtex'));selection.removeAllRanges();selection.addRange(range);status.textContent='Citation selected. Press Ctrl+C or ⌘C to copy.';}});
