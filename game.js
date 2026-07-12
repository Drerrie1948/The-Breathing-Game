const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);

let W=0,H=0,dpr=1,last=0,raf;
let state='menu', distance=0, shots=0, speed=17, spawn=0;
let objects=[], particles=[], shake=0;
let turn={active:false,ready:false,turning:false,dir:null,at:250,deadline:0,phase:0},worldHeading=0,cameraYaw=0;
const lanes=[-1,0,1];
const player={lane:0,x:0,y:0,vy:0,slide:0,lean:0};

// Procedural audio keeps the prototype tiny and avoids licensed sound files.
const audio={ctx:null,master:null,music:null,muted:false,nextBeat:0,beat:0,nextBreath:0,nextCall:0,siren:null};
function initAudio(){
  if(audio.ctx){if(audio.ctx.state==='suspended')audio.ctx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  audio.ctx=new AC();audio.master=audio.ctx.createGain();audio.master.gain.value=.42;audio.master.connect(audio.ctx.destination);
  audio.music=audio.ctx.createGain();audio.music.gain.value=.38;audio.music.connect(audio.master);startSiren();
}
function tone(freq,dur=.12,vol=.12,type='sine',when=0,dest){
  if(!audio.ctx||audio.muted)return;const t=audio.ctx.currentTime+when,o=audio.ctx.createOscillator(),g=audio.ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(dest||audio.music);o.start(t);o.stop(t+dur+.03);
}
function noise(dur=.08,vol=.05,when=0){
  if(!audio.ctx||audio.muted)return;const rate=audio.ctx.sampleRate,b=audio.ctx.createBuffer(1,rate*dur,rate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  const s=audio.ctx.createBufferSource(),f=audio.ctx.createBiquadFilter(),g=audio.ctx.createGain(),t=audio.ctx.currentTime+when;s.buffer=b;f.type='lowpass';f.frequency.value=900;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(audio.music);s.start(t);
}
function startSiren(){const c=audio.ctx,o=c.createOscillator(),g=c.createGain(),l=c.createOscillator(),lg=c.createGain();o.type='sawtooth';o.frequency.value=690;l.frequency.value=.72;lg.gain.value=190;l.connect(lg);lg.connect(o.frequency);g.gain.value=.018;o.connect(g);g.connect(audio.master);o.start();l.start();audio.siren={o,g,l};}
function pickupSound(){tone(740,.09,.15,'square');tone(1110,.16,.1,'sine',.08);}
function jumpSound(){if(!audio.ctx||audio.muted)return;const o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),t=audio.ctx.currentTime;o.type='triangle';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(430,t+.18);g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(audio.master);o.start(t);o.stop(t+.21);}
function crashSound(){noise(.35,.22);tone(72,.42,.24,'sawtooth');}
function gorillaCall(){
  if(!audio.ctx||audio.muted)return;const t=audio.ctx.currentTime;
  for(let i=0;i<3;i++){const o=audio.ctx.createOscillator(),g=audio.ctx.createGain(),f=audio.ctx.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(150-i*12,t+i*.13);o.frequency.exponentialRampToValueAtTime(88,t+i*.13+.22);f.type='lowpass';f.frequency.value=520;g.gain.setValueAtTime(.001,t+i*.13);g.gain.exponentialRampToValueAtTime(.1,t+i*.13+.025);g.gain.exponentialRampToValueAtTime(.001,t+i*.13+.23);o.connect(f);f.connect(g);g.connect(audio.master);o.start(t+i*.13);o.stop(t+i*.13+.25);}
}
function breathe(){noise(.24,.055);tone(82,.22,.025,'sine');}
function updateAudio(){
  if(!audio.ctx||audio.muted||state!=='playing')return;const now=audio.ctx.currentTime,bpm=118+Math.min(28,distance/25),step=60/bpm/2;
  while(audio.nextBeat<now+.12){const n=audio.beat++%8,wait=Math.max(0,audio.nextBeat-now);if(n%2===0){tone(n===0?110:98,.09,.11,'sine',wait);noise(.045,.04,wait);}if(n===2||n===6)noise(.07,.075,wait);if([0,2,3,5,7].includes(n))tone([220,277,330,392][Math.floor(audio.beat/8)%4],.08,.035,'square',wait);audio.nextBeat=Math.max(audio.nextBeat+step,now);}
  if(now>audio.nextBreath){breathe();audio.nextBreath=now+Math.max(.62,1.18-speed*.015);}if(now>audio.nextCall){gorillaCall();audio.nextCall=now+7+Math.random()*8;}
  if(audio.siren)audio.siren.g.gain.setTargetAtTime(.015+Math.min(.018,distance/18000),now,.4);
}
function setMuted(muted){audio.muted=muted;if(audio.master)audio.master.gain.setTargetAtTime(muted?0:.42,audio.ctx.currentTime,.05);const b=$('#sound-button');b.textContent=muted?'×':'♪';b.classList.toggle('muted',muted);b.setAttribute('aria-label',muted?'Turn sound on':'Mute sound');b.title=muted?'Turn sound on':'Mute sound';}
$('#sound-button').onclick=()=>{initAudio();setMuted(!audio.muted);};

function resize(){
  dpr=Math.min(devicePixelRatio||1,2); W=innerWidth>560?560:innerWidth; H=innerHeight;
  canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',resize); resize();

function reset(){
  distance=0; shots=0; speed=17; spawn=25; objects=[]; particles=[];
  turn={active:false,ready:false,turning:false,dir:null,at:250,deadline:0,phase:0};worldHeading=0;cameraYaw=0;$('#turn-warning').classList.remove('visible');
  Object.assign(player,{lane:0,x:0,y:0,vy:0,slide:0,lean:0});
  for(let z=35;z<120;z+=25) spawnChallenge(z);
  updateHud();
}
function start(){initAudio();audio.nextBeat=audio.ctx?.currentTime||0;audio.nextBreath=audio.nextBeat+.45;audio.nextCall=audio.nextBeat+2.5;reset();state='playing';$('.panel.visible')?.classList.remove('visible');last=performance.now();tone(220,.12,.1,'square');tone(330,.14,.1,'square',.12);tone(440,.2,.12,'square',.24);}
function over(){if(state!=='playing')return;state='over';shake=14;crashSound();$('#turn-warning').classList.remove('visible');$('#final-score').textContent=Math.floor(distance);$('#final-vials').textContent=shots;setTimeout(()=>$('#game-over').classList.add('visible'),350);}
$('#start-button').onclick=start; $('#retry-button').onclick=start;

function spawnChallenge(z=110){
  const safeLane=lanes[Math.floor(Math.random()*3)];
  const blocked=lanes.filter(l=>l!==safeLane);
  const blockCount=Math.random()<.58?1:2;
  if(blockCount===1&&Math.random()<.5)blocked.reverse();
  for(const lane of blocked.slice(0,blockCount)){
    const r=Math.random(),type=r<.38?'monkey':r<.66?'barrier':r<.84?'fire':'beam';
    objects.push({type,lane,z,spin:Math.random()*6.28,hit:false,sign:Math.random()<.5?'APES\nTOGETHER':'LET APES\nLIVE'});
  }
  // Blue pickups clearly mark the guaranteed route through the row.
  for(let i=0;i<3;i++)objects.push({type:'shot',lane:safeLane,z:z-7+i*4,spin:i,hit:false});
}
function project(lane,z,y=0){
  const horizon=H*.285,t=Math.max(0,1-z/110),vanishX=W/2-cameraYaw*W*.78;
  const center=vanishX+(W/2-vanishX)*t,roadHalf=W*(.08+.48*t);
  return {x:center+lane*roadHalf*.57,y:horizon+t*(H-horizon)+y*(.15+.85*t),s:.12+1.22*t};
}

function update(dt){
  if(state!=='playing') return;
  if(turn.turning){
    turn.phase=Math.min(1,turn.phase+dt/0.72);const eased=turn.phase<.5?2*turn.phase*turn.phase:1-Math.pow(-2*turn.phase+2,2)/2;cameraYaw=(turn.dir==='left'?-1:1)*Math.sin(eased*Math.PI);
    player.x+=(0-player.x)*Math.min(1,12*dt);updateAudio();
    if(turn.phase>=1){turn.turning=false;turn.ready=false;turn.phase=0;cameraYaw=0;worldHeading+=(turn.dir==='left'?-1:1);turn.dir=null;turn.at=distance+250;spawn=25;objects=[];for(let z=35;z<120;z+=25)spawnChallenge(z);}
    return;
  }
  speed=Math.min(30,17+distance/260); distance+=speed*dt; spawn-=speed*dt;
  if(!turn.active&&distance>=turn.at-30){
    turn.active=true;turn.ready=false;turn.deadline=turn.at+10;objects=objects.filter(o=>o.z<18);
    $('#turn-arrow').textContent='↔';$('#turn-warning').classList.add('visible');tone(520,.08,.1,'square');tone(520,.08,.1,'square',.15);
  }
  turn.ready=turn.active&&distance>=turn.at-5;
  if(turn.active&&distance>turn.deadline)over();
  if(spawn<=0){spawn+=25;if(!turn.active&&turn.at-distance>45)spawnChallenge(110);}
  player.vy+=40*dt; player.y+=player.vy*dt; if(player.y>0){player.y=0;player.vy=0;}
  player.slide=Math.max(0,player.slide-dt); player.x+=(player.lane-player.x)*Math.min(1,13*dt); player.lean+=(0-player.lean)*8*dt;
  for(const o of objects){
    o.z-=speed*dt; o.spin+=dt*4;
    if(!o.hit&&o.z<5.7&&o.z>1.8&&Math.abs(o.lane-player.x)<.48){
      if(o.type==='shot'){o.hit=true;shots++;pickupSound();burst(o.lane,'#2ed7ff');updateHud();}
      else {
        const safe=((o.type==='barrier'||o.type==='monkey')&&player.y<-.9)||(o.type==='beam'&&player.slide>0);
        if(!safe){o.hit=true;over();}
      }
    }
  }
  objects=objects.filter(o=>o.z>-5&&!o.hit);
  particles.forEach(p=>{p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=80*dt;}); particles=particles.filter(p=>p.life>0);
  updateAudio();updateHud();
}
function burst(lane,color){const p=project(lane,3,-40);for(let i=0;i<12;i++)particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*130,vy:-Math.random()*100,life:.45,color});}
function updateHud(){ $('#score').textContent=Math.floor(distance);$('#vials').textContent=shots; }

function poly(points,fill){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
function drawCity(){
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#6d7778');sky.addColorStop(.38,'#353b3d');sky.addColorStop(1,'#101315');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#cad0c822'; for(let i=0;i<8;i++){let x=((i*97-distance*1.5)%(W+180))-90;ctx.beginPath();ctx.arc(x,H*.22,90,0,7);ctx.fill();}
  const hz=H*.285;
  for(let side=-1;side<=1;side+=2){
    for(let i=0;i<7;i++){const x=side<0?i*45-45:W-i*45;const bw=52+(i%2)*24,bh=80+(i*37)%150;ctx.fillStyle=i%2?'#202628':'#293032';ctx.fillRect(x-bw/2,hz-bh,bw,bh);
      ctx.fillStyle='#f05a2844';for(let wy=hz-bh+18;wy<hz-15;wy+=28)for(let wx=x-bw/2+10;wx<x+bw/2-5;wx+=20)ctx.fillRect(wx,wy,8,12);
    }
  }
  const vanishX=W/2-cameraYaw*W*.78;
  poly([[vanishX-W*.08,hz],[vanishX+W*.08,hz],[W*1.12,H],[-W*.12,H]],'#24292a');
  poly([[vanishX-W*.02,hz],[vanishX+W*.02,hz],[W*.57,H],[W*.43,H]],'#d7d0ba18');
  ctx.strokeStyle='#e4d9bd55';ctx.lineWidth=3;ctx.setLineDash([18,25]);ctx.beginPath();ctx.moveTo(vanishX,hz);ctx.lineTo(W*.5,H);ctx.stroke();ctx.setLineDash([]);
  drawSideDetails(hz);
  if(turn.active){
    const closeness=Math.max(0,Math.min(1,(distance-(turn.at-30))/40)),y=hz+(H-hz)*(.26+closeness*.38);
    // The forward street visibly ends and both sides of the T-junction open.
    ctx.fillStyle='#171b1c';ctx.fillRect(0,y-26,W,34);
    poly([[0,y-18],[W*.5,y-7],[W*.5,y+42],[0,y+90]],'#2b3031');
    poly([[W,y-18],[W*.5,y-7],[W*.5,y+42],[W,y+90]],'#2b3031');
    ctx.save();ctx.translate(W/2,y-36);ctx.fillStyle=turn.ready?'#ffcf45':'#e9ecec';ctx.font=`900 ${30+closeness*28}px Inter, sans-serif`;ctx.textAlign='center';ctx.fillText('↔',0,0);ctx.restore();
  }
}
function drawSideDetails(hz){
  for(let i=0;i<10;i++){const z=((i*15-distance)%120+120)%120;const p=project(i%2?-1.75:1.75,z);if(p.y<hz)return; ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.s,p.s);
    ctx.fillStyle='#111';ctx.fillRect(-24,-46,48,46);ctx.fillStyle=i%3===0?'#ff5d24':'#777';ctx.fillRect(-20,-38,40,10);ctx.fillStyle='#050606';ctx.fillRect(-17,-23,34,23);
    if(i%3===0){ctx.fillStyle='#ff8a32';ctx.beginPath();ctx.moveTo(-8,0);ctx.quadraticCurveTo(-24,-30,0,-49);ctx.quadraticCurveTo(18,-25,8,0);ctx.fill();}
    ctx.restore();}
}
function drawObject(o){const p=project(o.lane,o.z);if(p.y<H*.28)return;ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.s,p.s);
  if(o.type==='shot'){ctx.rotate(-.7+Math.sin(o.spin)*.12);ctx.shadowBlur=18;ctx.shadowColor='#2ed7ff';ctx.fillStyle='#dce7e9';ctx.fillRect(-4,-38,8,40);ctx.fillStyle='#2ed7ff';ctx.fillRect(-3,-23,6,22);ctx.fillStyle='#dce7e9';ctx.fillRect(-9,-42,18,5);ctx.fillRect(-1,2,2,12);ctx.shadowBlur=0;}
  if(o.type==='barrier'){ctx.fillStyle='#e56928';ctx.fillRect(-32,-35,64,35);ctx.fillStyle='#fff';for(let i=-25;i<30;i+=22){ctx.save();ctx.translate(i,-18);ctx.rotate(-.5);ctx.fillRect(-5,-18,10,36);ctx.restore();}ctx.fillStyle='#15191a';ctx.fillRect(-28,0,7,12);ctx.fillRect(21,0,7,12);}
  if(o.type==='monkey'){
    // A compact cartoon monkey holding a fictional protest placard.
    ctx.fillStyle='#c5aa70';ctx.fillRect(-30,-82,60,35);ctx.strokeStyle='#4a3020';ctx.lineWidth=4;ctx.strokeRect(-30,-82,60,35);
    ctx.fillStyle='#251a13';ctx.font='900 9px Inter, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const words=(o.sign||'APES\nTOGETHER').split('\n');ctx.fillText(words[0],0,-70);ctx.fillText(words[1],0,-58);
    ctx.strokeStyle='#60462e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-20,-48);ctx.lineTo(-15,-7);ctx.moveTo(20,-48);ctx.lineTo(15,-7);ctx.stroke();
    ctx.fillStyle='#3a2a20';ctx.beginPath();ctx.ellipse(0,-18,23,20,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(0,-38,15,0,7);ctx.fill();
    ctx.fillStyle='#8b6749';ctx.beginPath();ctx.ellipse(0,-35,9,7,0,0,7);ctx.fill();ctx.fillStyle='#eee';ctx.fillRect(-6,-43,3,3);ctx.fillRect(3,-43,3,3);
    ctx.strokeStyle='#3a2a20';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-12,-12);ctx.lineTo(-20,4);ctx.moveTo(12,-12);ctx.lineTo(20,4);ctx.stroke();
  }
  if(o.type==='fire'){ctx.fillStyle='#202426';ctx.fillRect(-24,-18,48,18);ctx.fillStyle='#ff6726';ctx.beginPath();ctx.moveTo(-18,-14);ctx.quadraticCurveTo(-34,-56,-4,-44);ctx.quadraticCurveTo(4,-80,15,-42);ctx.quadraticCurveTo(35,-56,19,-14);ctx.fill();ctx.fillStyle='#ffd04a';ctx.beginPath();ctx.ellipse(1,-27,9,20,0,0,7);ctx.fill();}
  if(o.type==='beam'){ctx.fillStyle='#101314';ctx.fillRect(-50,-76,100,15);ctx.fillRect(-46,-61,8,61);ctx.fillRect(38,-61,8,61);ctx.fillStyle='#ff5d24';ctx.fillRect(-50,-77,100,5);}
  ctx.restore();
}
function drawOfficer(){const x=W/2+(player.x*-8)+Math.sin(distance*.5)*4,y=H-34;ctx.save();ctx.translate(x,y);ctx.globalAlpha=.86;ctx.fillStyle='#131719';ctx.beginPath();ctx.arc(0,-46,12,0,7);ctx.fill();ctx.fillRect(-14,-38,28,40);ctx.fillRect(-19,-34,38,8);ctx.strokeStyle='#131719';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-15,31+Math.sin(distance)*5);ctx.moveTo(8,0);ctx.lineTo(15,31-Math.sin(distance)*5);ctx.stroke();ctx.fillStyle='#5275a0';ctx.fillRect(-13,-34,26,23);ctx.fillStyle='#d7bd54';ctx.fillRect(-3,-29,6,7);ctx.restore();}
function drawPlayer(){const p=project(player.x,3,player.y*42);const sliding=player.slide>0;ctx.save();ctx.translate(p.x,p.y-(sliding?65:108));ctx.rotate(player.lean*.08);ctx.scale(1.03,1.03);ctx.fillStyle='#201d1a';
  if(sliding){ctx.beginPath();ctx.ellipse(0,18,38,22,-.15,0,7);ctx.fill();ctx.beginPath();ctx.arc(24,-1,17,0,7);ctx.fill();}
  else {ctx.beginPath();ctx.ellipse(0,0,29,43,0,0,7);ctx.fill();ctx.beginPath();ctx.arc(0,-42,21,0,7);ctx.fill();ctx.strokeStyle='#201d1a';ctx.lineWidth=16;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-19,-8);ctx.lineTo(-32,36);ctx.moveTo(19,-8);ctx.lineTo(32,36);ctx.stroke();ctx.fillStyle='#51473e';ctx.beginPath();ctx.ellipse(0,-36,12,10,0,0,7);ctx.fill();}
  ctx.restore();
}
function render(){ctx.save();if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.88;if(shake<.3)shake=0;}drawCity();objects.slice().sort((a,b)=>b.z-a.z).forEach(drawObject);drawOfficer();drawPlayer();for(const p of particles){ctx.globalAlpha=p.life*2;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);}ctx.globalAlpha=1;ctx.restore();}
function loop(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;update(dt);render();raf=requestAnimationFrame(loop);}raf=requestAnimationFrame(loop);

function completeTurn(dir){
  turn.dir=dir;turn.active=false;turn.ready=false;turn.turning=true;turn.phase=0;player.lane=0;objects=[];$('#turn-warning').classList.remove('visible');tone(330,.1,.1,'square');tone(495,.16,.1,'square',.1);
}
function act(dir){if(state!=='playing'||turn.turning)return;if(turn.ready&&(dir==='left'||dir==='right')){completeTurn(dir);return;}if(dir==='left'){player.lane=Math.max(-1,player.lane-1);player.lean=-1;tone(170,.045,.025,'square');}if(dir==='right'){player.lane=Math.min(1,player.lane+1);player.lean=1;tone(190,.045,.025,'square');}if(dir==='up'&&player.y===0){player.vy=-18;jumpSound();}if(dir==='down'&&player.y===0){player.slide=.72;noise(.12,.04);}}
addEventListener('keydown',e=>({ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'}[e.key]&&act(({ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'})[e.key])));
let sx=0,sy=0;canvas.addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY});canvas.addEventListener('pointerup',e=>{const dx=e.clientX-sx,dy=e.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;act(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));});
