/* The Inherited Rooms · background music.
   Inside the exhibition shell (index.html at the top), the shell plays the music so it never stops between rooms;
   this script only draws the sound button and tells the shell what is happening.
   Opened on its own, a page plays the music itself. */
(function(){
  var me=document.currentScript, base=me.src.replace(/music\.js(\?.*)?$/,'');
  var QUIET=me.hasAttribute('data-quiet'), LOW=QUIET?0.13:0.22;
  var K_ON='inheritedRooms.music', K_POS='inheritedRooms.musicPos';
  function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
  function set(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  var on=get(K_ON)!=='off', blocked=false, mode='wait', a=null, target=0, raf=0, started=false;
  var page=(function(){var p=location.pathname.split('/');return p.slice(-2).join('/')+(location.search||'')})();

  /* ---- button ---- */
  var css='.mus{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:rgba(20,8,15,.82);color:#fdedb5;font:600 10px Poppins,sans-serif;letter-spacing:2px;text-transform:uppercase;padding:9px 13px;border-radius:30px;border:1px solid rgba(253,237,181,.3);white-space:nowrap;position:relative}'+
    '.mus:hover{background:rgba(20,8,15,.96)}.mus:focus-visible{outline:2px solid #f2d21b;outline-offset:2px}.mus svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'+
    '.mus .tip{display:none}.mus.blocked{border-color:#f2d21b;animation:muspulse 1.8s ease-in-out infinite}.mus.blocked .tip{display:inline}'+
    '@keyframes muspulse{50%{box-shadow:0 0 0 6px rgba(242,210,27,.18)}}@media (prefers-reduced-motion:reduce){.mus.blocked{animation:none}}'+
    '#musWrap{position:fixed;right:14px;top:10px;z-index:30;display:flex;gap:8px}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  var b=document.createElement('button');b.type='button';b.className='mus';
  var ON='<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
      OFF='<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  function paint(){b.innerHTML=(on?ON:OFF)+'<span class="tip">Tap for sound</span>';b.classList.toggle('blocked',on&&blocked);
    b.setAttribute('aria-label',on?(blocked?'Start the music':'Turn music off'):'Turn music on');b.setAttribute('aria-pressed',on&&!blocked);b.title=on?(blocked?'Tap for sound':'Music on'):'Music off'}
  paint();
  function place(){
    var topr=document.getElementById('topr');if(topr){topr.insertBefore(b,topr.firstChild);return}
    var bar=document.getElementById('bar'),lb=document.getElementById('langBtn');if(bar&&lb){bar.insertBefore(b,lb);return}
    var ab=document.getElementById('about');if(ab){var w=document.createElement('div');w.id='musWrap';ab.parentNode.insertBefore(w,ab);ab.style.position='static';w.appendChild(b);w.appendChild(ab);return}
    var w2=document.createElement('div');w2.id='musWrap';w2.appendChild(b);document.body.appendChild(w2)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',place);else place();

  function ducked(){return !!document.querySelector('#ov.on,.ov.on:not(#intro),#note.on')}

  /* ---- shell mode ---- */
  var inFrame=false;try{inFrame=window.parent&&window.parent!==window}catch(e){}
  function toShell(m){try{window.parent.postMessage(m,'*')}catch(e){}}
  addEventListener('message',function(e){var m=e.data;if(!m||m.mus!=='state')return;if(e.source!==window.parent)return;
    mode='shell';on=!!m.on;blocked=!!m.blocked;paint()});
  if(inFrame)toShell({mus:'hello',page:page,title:document.title,quiet:QUIET});
  setTimeout(function(){if(mode==='wait')standalone()},inFrame?500:0);

  var lastDuck=null;
  setInterval(function(){var d=ducked();if(mode==='shell'){if(d!==lastDuck){lastDuck=d;toShell({mus:'duck',v:d})}}else if(mode==='solo'&&started){to(level())}},300);
  ['pointerdown','keydown','touchend'].forEach(function(ev){addEventListener(ev,function(){if(mode==='shell'){if(blocked||!started){started=true;toShell({mus:'gesture'})}}else if(mode==='solo'&&on&&a&&a.paused)soloPlay()},{capture:true,passive:true})});
  b.addEventListener('click',function(e){e.stopPropagation();
    if(mode==='shell'){if(on&&blocked){toShell({mus:'gesture'})}else toShell({mus:'toggle'});return}
    if(on&&blocked){soloPlay();return}
    on=!on;set(K_ON,on?'on':'off');paint();if(on)soloPlay();else to(0)});

  /* ---- standalone mode (page opened on its own) ---- */
  function level(){return on?(ducked()?LOW*.4:LOW):0}
  function ramp(){var v=a.volume,d=target-v;if(Math.abs(d)<.004){a.volume=target;if(target===0)a.pause();raf=0;return}a.volume=Math.max(0,Math.min(1,v+d*.05));raf=requestAnimationFrame(ramp)}
  function to(v){target=v;if(!raf)raf=requestAnimationFrame(ramp)}
  function soloPlay(){if(!on||!a)return;a.play().then(function(){started=true;blocked=false;paint();to(level())}).catch(function(){blocked=true;paint()})}
  function standalone(){mode='solo';a=new Audio(base+'bg.mp3');a.loop=true;a.preload='auto';a.volume=0;
    var pos=parseFloat(get(K_POS)||'0');a.addEventListener('loadedmetadata',function(){if(pos>0&&pos<a.duration)try{a.currentTime=pos}catch(e){}});
    setInterval(function(){if(!a.paused)set(K_POS,String(a.currentTime))},1000);
    addEventListener('pagehide',function(){if(!a.paused)set(K_POS,String(a.currentTime))});
    document.addEventListener('visibilitychange',function(){if(document.hidden)a.pause();else if(on&&started)a.play().catch(function(){})});
    soloPlay()}
})();
