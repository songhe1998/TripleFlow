'use strict';
const players = new Set();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock = (s) => Number.isFinite(s) ? s.toFixed(1) : '0.0';

function playerHTML(item, comparison = false, caption = false) {
  const order = ['source','n7','omnimattezero','objectwiper','contextflow5b','omnieraser'];
  const videos = [...item.videos].sort((a,b) => order.indexOf(a.method)-order.indexOf(b.method));
  const videoTag=v=>`<video muted playsinline preload="none" poster="${escapeHTML(v.poster)}" data-src="${escapeHTML(v.file)}" aria-label="${escapeHTML(v.label)}: ${escapeHTML(item.title)}" width="${v.width}" height="${v.height}"></video>`;
  const wipe=!comparison&&videos.length===2;
  const media=wipe?`<div class="wipe-frame" style="--split:50%;--frame-ratio:${videos[0].width}/${videos[0].height};--frame-width:${620*videos[0].width/videos[0].height}px">
    <div class="wipe-layer wipe-source">${videoTag(videos[0])}</div><div class="wipe-layer wipe-result">${videoTag(videos[1])}</div>
    <span class="wipe-label before">Input</span><span class="wipe-label after">TripleFlow</span>
    <div class="wipe-control" role="slider" tabindex="0" aria-label="Before and after divider for ${escapeHTML(item.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="50% input, 50% TripleFlow" aria-orientation="horizontal"><span class="wipe-line"><span class="wipe-handle" aria-hidden="true">‹ ›</span></span></div>
    </div><div class="wipe-help"><span>Drag the divider to compare input and output.</span><span><a href="${escapeHTML(videos[0].file)}" target="_blank" rel="noopener">Input ↗</a> · <a href="${escapeHTML(videos[1].file)}" target="_blank" rel="noopener">Output ↗</a></span></div>`:
    `<div class="video-grid">${videos.map(v=>`<figure class="video-cell"><figcaption class="video-label ${v.method==='n7'?'ours':''}"><span>${v.method==='source'?'Input video':v.method==='n7'?'TripleFlow (ours)':v.method==='contextflow5b'?'ContextFlow':escapeHTML(v.label)}</span><a class="expand-video" href="${escapeHTML(v.file)}" target="_blank" rel="noopener" aria-label="Open ${escapeHTML(v.label)} video for ${escapeHTML(item.name)}">Enlarge</a></figcaption>${videoTag(v)}</figure>`).join('')}</div>`;
  return `<div class="player ${comparison?'comparison-player':'wipe-player'}" data-case="${escapeHTML(item.id)}">
    ${media}
    ${caption?`<div class="player-caption"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.detail)}</p></div>`:''}
    <div class="player-bar"><button type="button" class="play-toggle" aria-label="Play all videos for ${escapeHTML(item.name)}">Play</button><button type="button" class="restart" aria-label="Restart videos for ${escapeHTML(item.name)}" title="Restart">↺</button><input class="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek videos for ${escapeHTML(item.name)}"><span class="time">0.0 / ${clock(videos[0].frames/videos[0].fps)}</span></div><p class="player-error" role="status" hidden></p>
  </div>`;
}

class SyncedPlayer {
  constructor(root) {
    this.root=root; this.videos=[...root.querySelectorAll('video')]; this.leader=this.videos[0]; this.playing=false; this.loading=false; this.alive=true; this.loaded=false;
    this.button=root.querySelector('.play-toggle'); this.seek=root.querySelector('.seek'); this.time=root.querySelector('.time'); this.message=root.querySelector('.player-error');
    this.duration=CASES[root.dataset.case].videos[0].frames/CASES[root.dataset.case].videos[0].fps;
    this.syncTolerance=root.classList.contains('wipe-player')?1/CASES[root.dataset.case].videos[0].fps:0.12;
    const divider=root.querySelector('.wipe-control');
    if(divider){
      const frame=root.querySelector('.wipe-frame');let split=50;
      const update=value=>{split=Math.max(0,Math.min(100,value));frame.style.setProperty('--split',`${split}%`);frame.querySelector('.before').style.opacity=split<15?'0':'1';frame.querySelector('.after').style.opacity=split>85?'0':'1';divider.setAttribute('aria-valuenow',String(Math.round(split)));divider.setAttribute('aria-valuetext',`${Math.round(split)}% input, ${100-Math.round(split)}% TripleFlow`);};
      const point=e=>{const r=frame.getBoundingClientRect();update(100*(e.clientX-r.left)/r.width);};
      divider.addEventListener('pointerdown',e=>{if(e.button!==0)return;divider.setPointerCapture(e.pointerId);divider.focus({preventScroll:true});point(e);});
      divider.addEventListener('pointermove',e=>{if(divider.hasPointerCapture(e.pointerId))point(e);});
      divider.addEventListener('pointerup',e=>{if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId);});
      divider.addEventListener('keydown',e=>{const delta=e.shiftKey?10:2;if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();update(e.key==='Home'?0:e.key==='End'?100:split+(['ArrowLeft','ArrowDown'].includes(e.key)?-delta:delta));}});
    }
    this.button.addEventListener('click',()=>this.playing||this.loading?this.pause():this.play());
    root.querySelector('.restart').addEventListener('click',async()=>{await this.load(); this.setTime(0);});
    this.seek.addEventListener('input',async()=>{const t=Number(this.seek.value)/1000*this.duration;await this.load();this.setTime(t);});
    this.videos.forEach(v=>{v.muted=true;v.addEventListener('error',()=>{this.pause();this.message.textContent='This video could not load. Use Enlarge to open it directly, or try again.';this.message.hidden=false;});});
    this.leader.addEventListener('ended',()=>{if(this.playing){this.setTime(0);this.videos.forEach(v=>v.play().catch(()=>this.pause()));}});
    this.tick=()=>{if(!this.alive)return;if(this.playing&&!this.seek.matches(':active')){const t=this.leader.currentTime;this.seek.value=String(t/this.duration*1000);this.time.textContent=`${clock(t)} / ${clock(this.duration)}`;this.videos.slice(1).forEach(v=>{if(v.readyState>=2&&Math.abs(v.currentTime-t)>this.syncTolerance)v.currentTime=t;});}this.raf=requestAnimationFrame(this.tick);};
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
renderSelector('hero-tabs','hero-demo',['me12_kayak_canal','wild_mirror_hard','me07_cactus_steps','me17_cone_stone']);
function renderCollection(kind, label, subtitle, ids) {
  const section=document.createElement('section');section.className='collection';
  section.innerHTML=`<div class="collection-heading"><div><h3>${label}</h3></div><p>${subtitle}</p></div><div class="collection-stage"></div><div class="filmstrip" role="group" aria-label="${label} scenes"></div>`;
  document.getElementById('gallery').append(section);
  const stage=section.querySelector('.collection-stage'),strip=section.querySelector('.filmstrip');let player;
  function select(id,autoplay=false){
    if(player)player.destroy();const c=CASES[id],v=c.videos[0];
    stage.classList.toggle('is-portrait',v.height>v.width);
    stage.innerHTML=`<div class="stage-heading"><h4>${escapeHTML(c.title)}</h4><span>${String(ids.indexOf(id)+1).padStart(2,'0')} / ${String(ids.length).padStart(2,'0')}</span></div>${playerHTML(c)}`;
    const root=stage.querySelector('.player');if(autoplay&&!reduceMotion)root.dataset.autoplay='true';player=new SyncedPlayer(root);
    strip.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
  }
  ids.forEach(id=>{const c=CASES[id],b=document.createElement('button');b.type='button';b.dataset.id=id;b.setAttribute('aria-label',`Show ${c.name}`);b.innerHTML=`<span class="thumb"><img src="${escapeHTML(c.videos[0].poster)}" alt="" loading="lazy"></span><span class="thumb-name">${escapeHTML(c.name.replace('Wild · ',''))}</span>`;b.addEventListener('click',()=>select(id,true));strip.append(b);});
  select(ids[0]);
}
renderCollection('wild','Captured Videos','', ['wild_mirror_hard','wild_kitchen','wild_motion','wild_chair','wild_red_chair','wild_mirror_easy']);
renderCollection('generated','Generated Videos','', ['me12_kayak_canal','me07_cactus_steps','me17_cone_stone','me06_suitcase_lobby','me11_sculpture_gallery','me01_bicycle_plaza','p09_gallery']);
renderSelector('comparison-tabs','comparison-demo',['t02_bookcase','t06_forklift_shelves','t01_carved_door','t09_mirror_entryway'],true);
document.getElementById('copy-citation').addEventListener('click',async()=>{const text=document.getElementById('bibtex').textContent,status=document.getElementById('copy-status');try{await navigator.clipboard.writeText(text);status.textContent='BibTeX copied.';}catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(document.getElementById('bibtex'));selection.removeAllRanges();selection.addRange(range);status.textContent='Citation selected. Press Ctrl+C or ⌘C to copy.';}});
