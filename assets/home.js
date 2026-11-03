const $=id=>document.getElementById(id);
const M=["January","February","March","April","May","June","July","August","September","October","November","December"];
// Every shape is a radius at each of N angles, so any shape morphs into any other.
const N=180,TAU=Math.PI*2;
const reg=(k,a)=>Math.cos(Math.PI/k)/Math.cos(((a%(TAU/k))+TAU/k)%(TAU/k)-Math.PI/k);
// Three forms, three meanings: triangle loses time, square is steady, circle is safe.
// A polygon as a radius at each angle: the distance along the ray to the polygon's edge.
// verts: [angle in degrees, radius], in order around the shape.
const polyR=verts=>a=>{const V=verts.map(([d,r])=>[r*Math.cos(d*Math.PI/180),r*Math.sin(d*Math.PI/180)]),dx=Math.cos(a),dy=Math.sin(a);let best=0; // a ray that misses adds nothing
  for(let i=0;i<V.length;i++){const [x1,y1]=V[i],[x2,y2]=V[(i+1)%V.length],ex=x2-x1,ey=y2-y1,den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;
    const t=(x1*ey-y1*ex)/den,u=(x1*dy-y1*dx)/den;if(t>0&&u>=-1e-9&&u<=1+1e-9)best=t}return best};
// A shape made of circles, as a radius at each angle: the farthest edge of any circle along the ray.
const circlesR=cs=>a=>{const dx=Math.cos(a),dy=Math.sin(a);let best=0;
  for(const [cx,cy,r] of cs){const b=cx*dx+cy*dy,c=cx*cx+cy*cy-r*r,d=b*b-c;if(d>=0)best=Math.max(best,b+Math.sqrt(d))}return best};
// A closed curve as a radius at each angle, through polyR on many points along it.
const curveR=(f,n=240)=>polyR(Array.from({length:n},(_,k)=>{const [x,y]=f(k/n*TAU);return [Math.atan2(y,x)*180/Math.PI,Math.hypot(x,y)]}).sort((p,q)=>p[0]-q[0]));
const SHAPE={
  circle:a=>.9,
  square:a=>.8*reg(4,a+Math.PI/4),
  triangle:a=>reg(3,a-Math.PI/2)*.98, // points down
  diamond:a=>.95*reg(4,a),
  star:polyR(Array.from({length:10},(_,k)=>[-90+k*36,k%2?.46:1])), // five sharp points
  flower:circlesR([[.42,0,.5],[-.42,0,.5],[0,.42,.5],[0,-.42,.5]]), // four round petals
  squircle:a=>Math.pow(Math.pow(Math.abs(Math.cos(a)),4)+Math.pow(Math.abs(Math.sin(a)),4),-.25)*.8,
  hexagon:a=>.9*reg(6,a),
  burst:polyR(Array.from({length:16},(_,k)=>[-90+k*22.5,k%2?.62:1])), // eight sharp points
  kite:polyR([[-90,.72],[0,.72],[90,1],[180,.72]]),            // a diamond pulled down
  pill:a=>Math.max(circlesR([[-.42,0,.5],[.42,0,.5]])(a),Math.min(.42/Math.max(Math.abs(Math.cos(a)),1e-6),.5/Math.max(Math.abs(Math.sin(a)),1e-6))), // two round ends joined by flat sides
  drop:curveR(t=>[.78*Math.sin(t)*Math.sin(t/2),.1-Math.cos(t)*.88]), // a point above, round below
  pebble:curveR(t=>[.92*Math.cos(t)+.06*Math.cos(2*t),.74*Math.sin(t)+.05*Math.sin(3*t)]), // a smooth river stone
  // a wide, soft heart like the reference: about 1.3 times wider than tall, broad lobes, a shallow dip
  heart:curveR(t=>{const x=16*Math.pow(Math.sin(t),3),y=13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);return [x/16.4,-(y+2.5)/18.6]},360),
  sun:a=>Math.max(.72,SHAPE.burst(a)*.98), // a round body with short rays
  leaf:curveR(t=>{const R=1.17,c=.6,y=Math.sin(t)>=0?c-R*Math.sqrt(Math.max(0,1-Math.pow(Math.cos(t),2)/(R*R))):-(c-R*Math.sqrt(Math.max(0,1-Math.pow(Math.cos(t),2)/(R*R))));return [Math.cos(t),-y]}), // two arcs meeting in points
};
// The app's state colours: runway from 6 months, attention from 3 to 6, act under 3 (design doc, Colour).
const C={blue:[58,90,156],attention:[158,92,0],act:[153,51,9]};
const state=n=>n<3?C.act:n<=6?C.attention:C.blue;
// Per life: starting months and shape, then three moments [heading, months]
const LIVES=[
  [14,null,[["Rent goes up.",-3,'pressure'],["You get a raise.",4,'joy'],["A friend's wedding abroad.",-2,'love']]],
  [6,null,[["Textbooks, again.",-1,'pressure'],["A summer job.",3,'pride'],["The laptop dies.",-2,'shock']]],
  [4,null,[["First month with no pay.",-1,'pressure'],["A freelance job lands.",3,'pride'],["You cancel the subscriptions.",1,'relief']]],
  [30,null,[["The roof needs fixing.",-4,'shock'],["You rent out the spare room.",5,'relief'],["A trip to see the grandkids.",-2,'love']]],
];
// Each part of the shape says one thing: the form is how the moment feels, the colour is where you stand,
// and the number is how long. A happy cost (a wedding, a trip) still looks happy.
const START=['square','hexagon','diamond','pebble']; // who you are: work built, study bright, between jobs in motion, retirement soft
const MOOD={love:['heart'],joy:['flower','sun'],pride:['star'],pressure:['triangle'],shock:['burst'],relief:['pebble']};
function mood(m,k){const f=MOOD[m];return radii(f[k%f.length])}
const size=()=>[18,18,18,18]; // one size: colour and form already say where you stand
let life=0;
const lerp=(a,b,t)=>a+(b-a)*t, mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
// Organic, not perfect: every shape is softened the same way, so they stay one family.
// 1. Corners round off: each radius is averaged with its neighbours (a small window, so a triangle stays a triangle).
// 2. The outline wavers a little, like a shape cut by hand: a gentle wave fixed per shape, so it never jitters.
const SOFT=4,WAVER=.025;
const seedOf=name=>[...name].reduce((h,c)=>(h*31+c.charCodeAt(0))%9973,7);
const radii=name=>{
  const raw=Array.from({length:N},(_,k)=>SHAPE[name](k/N*TAU)),sd=seedOf(name);
  if(name==='circle')return raw; // the runway circle is the brand mark: always a true circle
  return raw.map((_,k)=>{let sum=0,wt=0;for(let j=-SOFT;j<=SOFT;j++){const w=SOFT+1-Math.abs(j);sum+=raw[(k+j+N)%N]*w;wt+=w}
    const a=k/N*TAU;return sum/wt*(1+WAVER*(Math.sin(3*a+sd)+.6*Math.sin(5*a+sd*1.7)))});
};
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function key(i){
  const [n0,shape0,inc]=LIVES[life];
  if(i===0)return{n:n0,r:radii(START[life]),turn:0,c:state(n0),ins:size(n0)};
  if(i<=3){const p=key(i-1),d=inc[i-1][1],nth=inc.slice(0,i-1).filter(e=>e[2]===inc[i-1][2]).length,r=mood(inc[i-1][2],nth);return{n:p.n+d,r,turn:0,c:state(p.n+d),ins:size(p.n+d)}}
  const k3=key(3);return{...k3,r:radii('circle'),turn:0,c:state(k3.n),ins:[19,25,31,25]};
}
// Where the number fits with the same gap above and below. The top edge is checked across the number's
// width, the bottom edge across the unit's width (each measured), so the two gaps come out equal. Units: half the box.
function edgeY(P,x,above){let best=above?-9:9;
  for(let k=0;k<P.length;k++){const [x1,y1]=P[k],[x2,y2]=P[(k+1)%P.length];if((x1-x)*(x2-x)>0||x1===x2)continue;
    const y=y1+(y2-y1)*(x-x1)/(x2-x1);if(above&&y<0)best=Math.max(best,y);if(!above&&y>0)best=Math.min(best,y)}return best}
function textSpot(r,turn,numHalf,unitHalf,blockHalf,inkLift=0){
  const P=r.map((v,k)=>{const a=k/N*TAU+turn*Math.PI/180;return [v*Math.cos(a),v*Math.sin(a)]}),cx=centroid(r,turn)[0];
  const top=Math.max(...[-numHalf,0,numHalf].map(d=>edgeY(P,cx+d,true))),bot=Math.min(...[-unitHalf,0,unitHalf].map(d=>edgeY(P,cx+d,false)));
  if(top<=-9||bot>=9)return centroid(r,turn);
  return [cx,(top+bot)/2-inkLift]; // centre the ink, not the line box, on the midpoint between the edges
}
// Centre of weight of the shape drawn from radii r (in units of half the box), by the shoelace formula.
function centroid(r,turn){
  let A=0,cx=0,cy=0;const P=r.map((v,k)=>{const a=k/N*TAU+turn*Math.PI/180;return [v*Math.cos(a),v*Math.sin(a)]});
  for(let k=0;k<P.length;k++){const [x1,y1]=P[k],[x2,y2]=P[(k+1)%P.length],c=x1*y2-x2*y1;A+=c;cx+=(x1+x2)*c;cy+=(y1+y2)*c}
  return A?[cx/(3*A),cy/(3*A)]:[0,0];
}
function poly(r,turn){
  return 'polygon('+r.map((v,k)=>{const a=k/N*TAU+turn*Math.PI/180;
    return (50+50*v*Math.cos(a)).toFixed(2)+'% '+(50+50*v*Math.sin(a)).toFixed(2)+'%'}).join(',')+')';
}
// The ending's words: arrive like the others, then stay through the hold, then leave.
const holdOpacity=s=>s<4?Math.max(0,1-(4-s)*2.5):s<=5?1:Math.max(0,1-(s-5)*2.5);
function frame(){
  const home=demo!==null&&demo<0; // -1 to 0: from the last moment straight back to the start
  const p=home?3:demo!==null?demo:Math.min(4,Math.max(0,scrollY/innerHeight)),i=home?3:Math.min(3,Math.floor(p)),t=home?ease(demo+1):ease(p-i),a=key(i),b=home?key(0):key(i+1);
  const el=$('shape'),size=$('wrap').offsetWidth;
  const A=pose[i],B=home?pose[0]:pose[i+1],sc=lerp(A.s,B.s,t);
  $('wrap').style.transform=`translate(${lerp(A.x,B.x,t)}px,${lerp(A.y,B.y,t)}px) scale(${sc})`;
  const rNow=mix(a.r,b.r,t),turnNow=lerp(a.turn,b.turn,t),clip=poly(rNow,turnNow),col=`color-mix(in oklch, rgb(${a.c}) ${((1-t)*100).toFixed(1)}%, rgb(${b.c}))`,ins=mix(a.ins,b.ins,t).map(v=>v+'%').join(' ');
  el.style.clipPath=clip;el.style.inset=ins;el.style.setProperty('--c',col);
  const moodNow=i<3&&!home?LIVES[life][2][i]?.[2]:null,land=Math.sin(Math.PI*Math.min(1,Math.max(0,(t-.6)/.4)));
  const beat={love:`scale(${1+.1*land})`,joy:`scale(${1+.08*land})`,pride:`translateY(${-4*land}%)`,pressure:`scale(${1+.06*land},${1-.08*land})`,shock:`rotate(${7*land}deg)`,relief:'none'}[moodNow]||'none';
  document.querySelector('.solid').style.transform=calm?'none':beat;
  const end=i===3&&!home?t:0,st=Math.min(1,Math.max(0,(end-.4)/.6));
  // out to an asymmetric arrangement by the middle of the step, back into the circle by its end
  const out=Math.sin(Math.PI*Math.min(1,end*1.15)),c={x:42,y:36};
  [['btri',{x:4,y:18,r:-12}],['bsq',{x:74,y:56,r:14}]].forEach(([id,to])=>{
    const b=$(id);b.style.opacity=out;b.style.left=lerp(c.x,to.x,out)+'%';b.style.top=lerp(c.y,to.y,out)+'%';
    b.style.transform=`rotate(${to.r*out}deg) scale(${.3+.7*out})`;});
  $('star').style.opacity=st;$('star').style.transform=`scale(${st}) rotate(${(1-st)*-90}deg)`;
  $('phone').style.opacity=end;$('phone').style.transform=`scale(${lerp(1.4,1,ease(end))})`;
  const n=Math.max(1,Math.round(lerp(a.n,b.n,t))),f=length(n);
  const box=mix(a.ins,b.ins,t),w=100-box[1]-box[3];
  Object.assign($('cnum').style,{top:box[0]+'%',right:box[1]+'%',bottom:box[2]+'%',left:box[3]+'%',fontSize:w*.3*size/100+'px'});
  // Equal room above and below the text: measure where the ink really is and where the shape's edge is
  // straight above the digits and straight below the unit, then move the text by half the difference.
  const cn=$('cnum'),nb=cn.querySelector('.cn'),ub=cn.querySelector('small'),hb=cn.offsetHeight/2,hw=cn.offsetWidth/2;
  if(nb&&hb){
    const P=rNow.map((v,k)=>{const q=k/N*TAU+turnNow*Math.PI/180;return [v*Math.cos(q)*hw,v*Math.sin(q)*hb]}); // px from the box centre
    const edge=(x,above)=>{let best=above?-1e9:1e9;for(let k=0;k<P.length;k++){const [x1,y1]=P[k],[x2,y2]=P[(k+1)%P.length];if((x1-x)*(x2-x)>0||x1===x2)continue;
      const y=y1+(y2-y1)*(x-x1)/(x2-x1);if(above&&y<0)best=Math.max(best,y);if(!above&&y>0)best=Math.min(best,y)}return best};
    cn.style.transform='none';
    const fN=parseFloat(getComputedStyle(nb).fontSize),fU=parseFloat(getComputedStyle(ub).fontSize);
    const nTop=nb.offsetTop-hb+fN*.14,uBot=ub.offsetTop+ub.offsetHeight-hb-fU*.2,nHalf=nb.offsetWidth/2,uHalf=ub.offsetWidth/2,cx=0;
    const top=Math.max(...[-nHalf,0,nHalf].map(d=>edge(cx+d,true))),bot=Math.min(...[-uHalf,0,uHalf].map(d=>edge(cx+d,false)));
    const shift=((bot-uBot)-(nTop-top))/2; // positive moves the text down
    cn.style.transform=`translateY(${Math.abs(top)<1e8&&Math.abs(bot)<1e8?shift:0}px)`;
  }
  $('cnum').innerHTML='<b class="cn">'+f.n+'</b><small>'+f.unit+'</small>';
  $('cline').style.top=(100-box[2]+5)+'%';$('cline').style.fontSize=Math.max(.048*size,14/sc)+'px';
  const word=n<3?'Worth a closer look.':n<=6?'A good time to make a plan.':'';
  $('cline').innerHTML='<span>until '+f.until+'</span>'+(word?'<em class="stateword">'+word+'</em>':''); // home shows it under the date too
  const at=Math.round(p),d=at>=1&&at<=3?LIVES[life][2][at-1][1]:0;
  $('flash').textContent=d?(d>0?'+':'−')+Math.abs(d):'';
  $('flash').style.top=`calc(${box[0]}% - ${12/sc}px)`; // 12 px on screen, whatever the stage's scale$('flash').style.transform='translateY(-100%)';
  $('flash').style.opacity=d?1-Math.abs(p-at)*2:0;
  document.querySelectorAll('#dots i').forEach((x,k)=>x.classList.toggle('on',k<Math.round(p)));
  $('dots').style.opacity=p>3.5?0:1;
  document.querySelectorAll('.step>div').forEach((x,k)=>x.style.opacity=demo!==null&&k===0?(home?Math.max(0,(demo+.5)*2):Math.max(0,1-demo*2.5)):k===4?holdOpacity(scrollY/innerHeight):Math.max(0,1-Math.abs(scrollY/innerHeight-k)*2.5));
  const lead=document.querySelector('[data-step="4"] .lead');if(lead)lead.style.opacity=Math.min(1,Math.max(0,(scrollY/innerHeight-4.3)/.3));
  const tr=$('trail');
  if(demo!==null&&(demo>.2||home)){const k=home?3:Math.min(3,Math.round(demo)),src=document.querySelector(`[data-step="${k}"]>div`),o=home?Math.max(0,1-(demo+1)*2):k===0?0:Math.max(0,1-Math.abs(demo-k)*2.5);
    if(tr.dataset.k!=k){tr.innerHTML=k?src.querySelector('h2').outerHTML:'';tr.dataset.k=k}
    const hb=document.querySelector('[data-step="0"]>div').getBoundingClientRect(),right=getComputedStyle(src).textAlign==='right';
    // on a phone the moment's words sit where they do when scrolled, at the top; on a computer, level with the shape
    const phone=innerWidth<800;
    Object.assign(tr.style,{opacity:o,left:hb.left+'px',width:(right?src.getBoundingClientRect().width:hb.width)+'px',
      top:phone?getComputedStyle(src).top:(hb.top+hb.height/2)+'px',transform:phone?'none':'translateY(-50%)',textAlign:right?'right':'left'});
  }else tr.style.opacity=0;
}
function length(months){ // "13 months, until December 2027"; under 3 months, weeks and a day
  const d=new Date(2026,10,3);
  if(months<3){const w=Math.round(months*52/12);d.setDate(d.getDate()+w*7);
    return{n:w,unit:'weeks',until:d.getDate()+' '+M[d.getMonth()]}}
  d.setMonth(d.getMonth()+months);
  return{n:months,unit:'months',until:M[d.getMonth()]+(months>=12?' '+d.getFullYear():'')}
}
function words(){
  let n=LIVES[life][0];
  LIVES[life][2].forEach((e,k)=>{n+=e[1];const f=length(n);$('h'+(k+1)).textContent=e[0];
    $('d'+(k+1)).textContent=(e[1]>0?'+':'−')+Math.abs(e[1])+(Math.abs(e[1])===1?' month':' months');
    $('s'+(k+1)).textContent='. Runway now '+f.n+' '+f.unit+', until '+f.until+'.'});
}
// The trailer: once, on arrival at the top, the shape runs through the three moments and comes back.
// Any scroll, key, tap or reduce motion skips it; it never plays again.
let demo=null;
function trailer(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||scrollY>2)return;
  // play each moment with a pause to read it, then go home in one calm morph (-1 marks the way home)
  // under five seconds of motion, so it needs no pause control (WCAG 2.2.2)
  const run=[[0,0],[300,0],[900,1],[1500,1],[2100,2],[2700,2],[3300,3],[3900,3],[3901,-1],[4800,0]],t0=performance.now();
  const stop=()=>{demo=null;frame();['wheel','touchstart','keydown','pointerdown'].forEach(e=>removeEventListener(e,stop))};
  ['wheel','touchstart','keydown','pointerdown'].forEach(e=>addEventListener(e,stop,{passive:true}));
  const tick=now=>{const t=now-t0;if(t>=run[run.length-1][0]){stop();return}
    let k=0;while(t>run[k+1][0])k++;const [ta,a]=run[k],[tb,b]=run[k+1],q=(t-ta)/(tb-ta);
    demo=a+(b-a)*ease(q);frame();if(demo!==null)requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
}
function pin(){
  const vh=innerHeight,run=$('planrun').getBoundingClientRect(),foot=document.querySelector('.foot').getBoundingClientRect();
  const inPlan=run.top<vh*.5&&run.bottom>vh*.5,footSeen=foot.top<vh,s=scrollY/vh,atEnd=s>3.5&&s<5.6;
  const show=scrollY>vh*.9&&!inPlan&&!footSeen&&!atEnd,el=$('pin');
  el.classList.toggle('on',show);el.tabIndex=show?0:-1;el.setAttribute('aria-hidden',!show);
}
addEventListener('scroll',()=>requestAnimationFrame(pin),{passive:true});
let queued=0;
addEventListener('scroll',()=>{if(!queued){queued=1;requestAnimationFrame(()=>{queued=0;frame()})}},{passive:true});
let pose=[];
function measure(){
  const w=$('wrap');w.style.transform='';
  const size=w.offsetWidth,cx=w.offsetLeft+size/2,cy=w.offsetTop+size/2,phone=innerWidth<800;
  const below=k=>{const d=document.querySelectorAll('.step>div')[k];return parseFloat(getComputedStyle(d).top)+d.offsetHeight};
  pose=[0,1,2,3].map(k=>{
    if(!phone)return{x:0,y:0,s:1};
    // what shows spans 8% to 95% of the stage: the change above, the shape, the date under it
    const short=innerHeight<600,top=below(k)+(short?12:20),room=innerHeight-top-(short?8:40);
    const s=Math.max(223/size,Math.min(1,room/(.87*size)));
    return{x:0,y:top-.08*size*s+size*s/2-cy,s};
  });
  // the ending: the phone, centred, under the closing words
  const phoneH=size*1.52,phoneW=size*.88,top=below(4)+16;
  const s=Math.min(1.6,(innerHeight-top-24)/phoneH,innerWidth*.84/phoneW);
  pose[4]={x:innerWidth/2-cx,y:top+phoneH*s/2-cy,s};
  frame();
}
addEventListener('resize',measure);
function mark(group,on){ // selected state for eyes, screen readers and the tab order alike
  group.querySelectorAll('button').forEach(x=>{const y=x===on;x.classList.toggle('on',y);x.setAttribute('role','radio');x.setAttribute('aria-checked',y);x.tabIndex=y?0:-1});
}
mark($('chips'),document.querySelector('#chips .on'));
document.querySelectorAll('#chips button').forEach(b=>b.onclick=()=>{
  mark($('chips'),b);
  life=+b.dataset.life;words();planGoals();const w=document.querySelector('.wrap');w.classList.add('tap');frame();
  setTimeout(()=>w.classList.remove('tap'),700)});

// Plan: goals fit the life stage; every answer is a date and what is left after.
// Plan: three kinds of what-if for each life stage, as the app allows: money out once, money out every month, money in every month.
// kind: once (money out once), out (more out every month), in (more in every month), save (less out every month), all (the others together)
// [monthly spending, [[name, amount, kind, months from now (once only)], ...]]
const PLAN=[
  [2000,[["Car deposit",4000,'once',6],["Bigger flat",400,'out'],["Side gig",500,'in'],["All three",0,'all']]],
  [900,[["New laptop",900,'once',2],["Own room",200,'out'],["Tutoring",300,'in'],["All three",0,'all']]],
  [1600,[["Course",1600,'once',1],["Health insurance",300,'out'],["Part-time job",600,'in'],["All three",0,'all']]],
  [1800,[["New roof",5400,'once',4],["Help at home",300,'out'],["Rent the spare room",500,'in'],["All three",0,'all']]],
];
const STAGE=['At work','As a student','Between jobs','Retired'];
const money=n=>'$'+n.toLocaleString('en-US');
const monthName=k=>{const d=new Date(2026,10+k),m=M[d.getMonth()].slice(0,3);return d.getMonth()===0||k===0?m+'<small>'+d.getFullYear()+'</small>':m};
let pick=-1;
// One model for every what-if: the money you have, divided by what goes out each month.
function withIt(n,spend,w){
  let have=n*spend;
  if(!w)return n;
  if(w[2]==='all'){ // every other what-if at once: one-offs lower what you have, monthly ones change what goes out
    let out=spend;for(const x of PLAN[life][1]){if(x[2]==='once')have-=x[1];if(x[2]==='out')out+=x[1];if(x[2]==='in'||x[2]==='save')out-=x[1]}
    return out<=0?48:Math.min(48,have/out);
  }
  if(w[2]==='once')return (have-w[1])/spend;
  if(w[2]==='out')return have/(spend+w[1]);
  return spend-w[1]<=0?48:Math.min(48,have/(spend-w[1])); // in and save both lower what goes out
}
function planDraw(){
  const n=Math.max(1,LIVES[life][0]+LIVES[life][2].reduce((a,e)=>a+e[1],0)),[spend,list]=PLAN[life],w=list[pick];
  const f=length(n),after=withIt(n,spend,w),full=Math.max(0,Math.floor(after+1e-9)),frac=after-full,up=after>n+1e-9,down=after<n-1e-9,have=Math.ceil(after-1e-9);
  $('pnum').innerHTML=f.n+'<small>'+f.unit+'</small>';$('pnum').style.background=`rgb(${state(n)})`;
  const end=new Date(2026,10+n);$('puntil').textContent='until '+M[end.getMonth()]+' '+end.getFullYear();
  const e=new Date(2026,10,3+Math.round(after*365.25/12));
  $('psecond').classList.toggle('on',up||down);$('lmore').hidden=!up;$('lused').hidden=!down;
  $('psecond').innerHTML=up||down?`<i class="${up?'':'u'}"></i><span>With it, <b class="nbw">until ${Math.abs(after-Math.round(after))>.03?e.getDate()+' ':''}${M[e.getMonth()]} ${e.getFullYear()}</b></span>`:'';
  const lastYear=Math.min(2029,new Date(2026,10+Math.max(n,have)).getFullYear()+1);
  let html='<span></span>'+'JFMAMJJASOND'.split('').map(c=>'<span class="l">'+c+'</span>').join('');const say=[],lostSay=[];
  for(let y=2026;y<=lastYear;y++){
    html+='<span class="y">'+y+'</span>';let a=null,b=null;
    for(let m=0;m<12;m++){
      const k=(y-2026)*12+m-10; // months from now
      // full months, then the month the money only partly reaches, then months it costs or adds
      const c=k<0?'past':k<Math.min(n,full)?'have':(k===full&&frac>1e-6&&k<Math.max(n,have))?(down?'part':'partmore'):(k<n?'lost':(k<have?'more':''));
      if(c==='have'||c==='more'||c==='part'||c==='partmore'){a=a??m;b=m}
      if(c==='lost'||c==='part')lostSay.push((c==='part'?'part of ':'')+M[m]+' '+y);
      html+=`<span class="m ${c} ${w&&(w[2]==='once'||w[2]==='all')&&k===PLAN[life][1].find(x=>x[2]==='once')[3]?'goal':''}" style="transition-delay:${Math.max(0,k)*18}ms;--p:${frac.toFixed(3)}"></span>`;
    }
    if(a!==null)say.push(y+': your money covers '+M[a]+' to '+M[b]);
  }
  const past=have-((lastYear-2026)*12+2);
  if(past>0)html+=`<span></span><span class="more-cap">+${past} ${past===1?'month':'months'}</span>`;
  $('planner').innerHTML=html;$('plansay').textContent=say.join('. ')+'.'+(lostSay.length?' It costs '+lostSay.join(', ')+'.':'');
  const tell=t=>$('change').textContent=t;
  if(!w){tell('');$('prow').innerHTML='<span class="need">Pick a what-if</span>';return}
  const when=w[2]==='all'?'Together':w[2]==='once'?'In '+M[new Date(2026,10+w[3]).getMonth()]:w[2]==='out'?money(w[1])+' more a month':w[2]==='save'?money(w[1])+' less a month':'+'+money(w[1])+' a month';
  if(w[2]==='once'&&after<=w[3]){tell('Needs a plan for money in');$('prow').innerHTML=`<i class="r"></i><div><b>${w[0]}, ${money(w[1])}</b><span class="need">This goal needs a plan for money in.</span></div>`;return}
  // the change in one unit, as the app's formatter: weeks under 3 months, months from 3,
  // rounded to the safe side (a loss up, a gain down) so it never flatters
  const d=after-n,way=d>0?'longer':'sooner',safe=x=>d<0?Math.ceil(x-1e-9):Math.floor(x+1e-9),a=Math.abs(d);
  const [v,u]=a<3?[safe(a*52/12),'week']:[safe(a),'month'];
  tell(v?v+' '+u+(v===1?'':'s')+' '+way:'About the same');
  $('prow').innerHTML=`${w[2]==='once'?'<i class="r"></i>':''}<div><b>${w[0]}${w[2]==='once'?', '+money(w[1]):''}</b><span>${when}</span></div>`;
}
function choose(k){
  if(k===pick)return;pick=k;
  mark($('goals'),$('goals').querySelector(`[data-g="${k}"]`));planDraw();
}
// scroll-driven only when the whole scene fits the screen; otherwise taps choose
function planFit(){
  const run=$('planrun'),plan=document.querySelector('.plan'),ph=document.querySelector('.pphone');
  run.classList.remove('auto');ph.style.zoom=1;plan.style.paddingTop=plan.style.paddingBottom='16px';
  // shrink the mock phone, never below 55%, so the whole scene fits one screen
  const over=plan.offsetHeight-innerHeight;
  if(over>0){const z=(ph.offsetHeight-over)/ph.offsetHeight;if(z>=.55)ph.style.zoom=z}
  const fits=plan.offsetHeight<=innerHeight+1;
  plan.style.paddingTop=plan.style.paddingBottom='';run.classList.toggle('auto',fits);
}
function planScroll(){
  const run=$('planrun');if(!run.classList.contains('auto'))return;
  const q=(scrollY-run.offsetTop)/(run.offsetHeight-innerHeight);if(q<0||q>1)return;
  // switch only when clearly into the next one (12% of a step), so a resting thumb never flickers it
  const count=PLAN[life][1].length,f=q*count,m=.12,clamp=k=>Math.max(0,Math.min(count-1,k));
  if(f>pick+1+m)choose(clamp(Math.floor(f-m)));else if(f<pick-m)choose(clamp(Math.floor(f+m)));

}
addEventListener('scroll',()=>requestAnimationFrame(planScroll),{passive:true});
addEventListener('resize',()=>{planFit();planScroll()});
function planGoals(){
  pick=null;$('planlead').innerHTML=STAGE[life]+': try each, or all three.<span class="kb pick"><kbd aria-label="Left">←</kbd><kbd aria-label="Right">→</kbd> to pick</span>';
  $('goals').innerHTML=PLAN[life][1].map((g,k)=>`<button data-g="${k}" class="${g[2]==='in'||g[2]==='save'?'earn':''}">${g[0]}${g[2]==='once'?' in '+M[new Date(2026,10+g[3]).getMonth()]:''}${g[2]==='all'?'':`<span class="goalprice">${g[2]==='once'?money(g[1]):(g[2]==='in'?'+':g[2]==='save'?'−':'')+money(g[1])+' a month'}</span>`}</button>`).join('');
  // a tap jumps the scroll to that what-if, so tap and scroll are one control
  $('goals').querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const run=$('planrun');
    if(run.classList.contains('auto'))scrollTo({top:run.offsetTop+(+b.dataset.g+.5)/PLAN[life][1].length*(run.offsetHeight-innerHeight),behavior:'smooth'});
    else choose(pick===+b.dataset.g?-1:+b.dataset.g)});
  planFit();choose(0);
}

// The beat: "Wait." lands big and still, holds, then gives way to "What if…".
function beat(){
  const b=document.querySelector('.beat'),r=b.getBoundingClientRect(),run=b.offsetHeight-innerHeight;
  const q=Math.min(1,Math.max(0,-r.top/run)),clamp=v=>Math.min(1,Math.max(0,v));
  const a=clamp(q/.25),out=clamp((q-.45)/.15),b2=clamp((q-.6)/.25);
  $('w1').style.opacity=a*(1-out);$('w1').style.transform=`scale(${lerp(1.25,1,ease(a))+out*.1})`;$('w1').style.filter=`blur(${(1-a)*12+out*8}px)`;
  $('w2').style.opacity=b2;$('w2').style.transform=`translateY(${(1-ease(b2))*30}px)`;
}
addEventListener('scroll',()=>requestAnimationFrame(beat),{passive:true});
// Keyboard: Up and Down go to the previous or next stop; Left and Right change the choice on screen.
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
function stops(){
  const vh=innerHeight,b=document.querySelector('.beat'),run=$('planrun'),list=[0,1,2,3,4,4.6].map(k=>k*vh);
  list.push(b.offsetTop+(b.offsetHeight-vh)*.3,b.offsetTop+(b.offsetHeight-vh)*.85);
  const c=PLAN[life][1].length;
  if(run.classList.contains('auto'))for(let k=0;k<c;k++)list.push(run.offsetTop+(k+.5)/c*(run.offsetHeight-vh));else list.push(run.offsetTop);
  list.push(document.querySelector('.after').offsetTop,document.querySelector('.foot').offsetTop);return list;
}
function step(group,dir){
  const all=[...group.querySelectorAll('button')],cur=all.findIndex(x=>x.classList.contains('on'));
  const next=all[(cur+dir+all.length)%all.length];next.click();if(group.contains(document.activeElement))next.focus({preventScroll:true});
}
addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
    // the choices on screen win; a focused group counts only while it is on screen too
    const seen=g=>{const r=g.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&getComputedStyle(g.closest('.step>div')||g).opacity>.5};
    const dir=e.key==='ArrowRight'?1:-1,group=[$('goals'),$('chips')].find(seen)||null;
    if(group){e.preventDefault();step(group,dir)}
  }
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();const list=stops(),y=scrollY;
    const to=e.key==='ArrowDown'?list.find(v=>v>y+4):[...list].reverse().find(v=>v<y-4);
    if(to!==undefined){if(document.activeElement.closest?.('[role=radiogroup]'))document.activeElement.blur();scrollTo({top:to,behavior:calm?'auto':'smooth'})}
  }
});
words();measure();planGoals();beat();setTimeout(trailer,500);
