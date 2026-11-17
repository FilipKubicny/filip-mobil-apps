(function(){
const TO='b3b17pd7+mobil@mail.grokbot.com', BODY_MAX=1800, PAUSE=30;
const MONTHS=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const WD=['Ne','Po','Út','St','Čt','Pá','So'];
const AREAS={org:'Řízení výroby',it:'sapIS a IT',nav:'Návrhy a výkresy',skl:'Sklady a logistika',fre:'Fréza',hal:'Haly a úklid',viz:'Vizualizace a hřiště',bez:'Bezpečnost',exp:'Expedice',kan:'Kancelář, nákup, doprava'};
const CATS=[
  {id:'zam',name:'Zámečnická hala',short:'Zámečnická',color:'var(--zam)'},
  {id:'pul',name:'Půlkulatá hala',short:'Půlkulatá',color:'var(--pul)'},
  {id:'lin',name:'Nová linka a ohýbačka',short:'Linka',color:'var(--lin)'},
  {id:'sva',name:'Svařovna',short:'Svařovna',color:'var(--sva)'},
  {id:'fre',name:'Fréza',short:'Fréza',color:'var(--fre)'},
  {id:'inv',name:'Investice',short:'Investice',color:'var(--inv)'},
  {id:'ost',name:'Ostatní',short:'Ostatní',color:'var(--ost)'}
];
const BUCKETS=[
  {id:'tomorrow',name:'Zítra / další den',short:'Zítra / další den'},
  {id:'weeks',name:'Tento a příští týdny',short:'Tento a příští týdny'},
  {id:'months',name:'Příští měsíce',short:'Příští měsíce'},
  {id:'long',name:'Dlouhodobé',short:'Dlouhodobé'}
];
const STATUSES=[{id:'open',name:'Otevřené'},{id:'wip',name:'Rozpracované'},{id:'wait',name:'Čeká'},{id:'done',name:'Hotovo'}];
const APP_VERSION=3;
const CAT_REPAIR={'432daf02':'sva','7e50a6ef':'sva','97d85896':'sva','c47f2c69':'zam','59a4c2fe':'zam','b39cb988':'sva','727076df':'sva','83367aa7':'fre','6a18e6c6':'fre','79486842':'fre','83549cb7':'lin','3ef16c57':'ost','6443a152':'ost','738ca1f6':'fre','66c017e9':'zam','a1b882a7':'zam','249f1330':'zam','9c9d5258':'zam','354dbdf3':'zam','b9e025f0':'pul','4185f791':'pul','fbe7d7cd':'pul','aab0cba9':'sva','c6bfbc8d':'sva','4aeb6c08':'sva','a3d38c38':'sva','6e49be28':'ost','5b60e232':'ost','ee532219':'lin','deafdb98':'lin','527a770f':'inv','f19d2292':'inv','f2e4f1b8':'sva','875b1851':'fre','c0e70d5':'inv','802e913d':'ost'};
function textKey(s){return String(s||'').trim().toLowerCase().replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\s+/g,' ')}
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function catId(raw){
  const v=String((raw&&(raw.cat||raw.category||raw.c||raw.kat))||'').trim();
  if(CATS.some(c=>c.id===v))return v;
  const low=v.toLowerCase();
  const byName=CATS.find(c=>c.name.toLowerCase()===low||c.short.toLowerCase()===low);
  if(byName)return byName.id;
  const aliases={'zámečnická':'zam','zámečnická hala':'zam','zamecnicka':'zam','půlkulatá':'pul','půlkulatá hala':'pul','pulkulata':'pul','nová linka a ohýbačka':'lin','nova linka':'lin','linka':'lin','ohýbačka':'lin','ohybacka':'lin','svařovna':'sva','svarovna':'sva','fréza':'fre','freza':'fre','investice':'inv','ostatní':'ost','ostatni':'ost'};
  return aliases[low]||'ost';
}
function repairStoredTasks(list){
  let n=0;
  list.forEach(t=>{
    if(t.cat&&t.cat!=='ost')return;
    const mapped=CAT_REPAIR[fnv1a(textKey(t.text))];
    if(mapped&&mapped!=='ost'&&mapped!==t.cat){t.cat=mapped;t.updated=Date.now();n++}
  });
  return n;
}

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const parseISO=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
const toISO=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const addDays=(iso,n)=>{const d=parseISO(iso);d.setDate(d.getDate()+n);return toISO(d)};
const lastDayOfMonth=iso=>{const d=parseISO(iso);return toISO(new Date(d.getFullYear(),d.getMonth()+1,0))};
const czDate=iso=>{if(!iso)return '';const [y,m,d]=String(iso).slice(0,10).split('-');return (+d)+'.'+(+m)+'.'+y};
const czDateSp=iso=>{if(!iso)return '';const [y,m,d]=String(iso).slice(0,10).split('-');return (+d)+'. '+(+m)+'. '+y};
const czDateLong=iso=>{if(!iso)return '';const d=parseISO(iso);return WD[d.getDay()]+' '+(d.getDate())+'. '+(d.getMonth()+1)+'.'};
const czPeriod=(a,b)=>czDateSp(a)+' – '+czDateSp(b);
const mins=t=>{if(!t)return null;const p=String(t).split(':');if(p.length<2)return null;return (+p[0])*60+(+p[1])};
const spanMin=(f,t)=>{const a=mins(f),b=mins(t);if(a==null||b==null)return null;let d=b-a;if(d<0)d+=1440;return d};
const fmt=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return r?h+' h '+r+' min':h+' h'};
const czk=n=>Math.round(n).toLocaleString('cs-CZ')+' Kč';
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=p=>(p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const catBy=id=>CATS.find(c=>c.id===id)||CATS[CATS.length-1];
const buckBy=id=>BUCKETS.find(b=>b.id===id)||BUCKETS[1];
const stBy=id=>STATUSES.find(s=>s.id===id)||STATUSES[0];
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.remove('show'),2500)}

function easterSunday(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return toISO(new Date(y,month-1,day));
}
function holidaysInYear(y){
  const e=easterSunday(y),map={};
  map[y+'-01-01']='Nový rok';map[addDays(e,-2)]='Velký pátek';map[addDays(e,1)]='Velikonoční pondělí';
  map[y+'-05-01']='Svátek práce';map[y+'-05-08']='Den vítězství';map[y+'-07-05']='Cyril a Metoděj';
  map[y+'-07-06']='Jan Hus';map[y+'-09-28']='Den české státnosti';map[y+'-10-28']='Vznik Československa';
  map[y+'-11-17']='Den boje za svobodu';map[y+'-12-24']='Štědrý den';map[y+'-12-25']='1. svátek vánoční';map[y+'-12-26']='2. svátek vánoční';
  return map;
}
function holidayName(iso){return holidaysInYear(+iso.slice(0,4))[iso]||null}
function isWeekend(iso){const d=parseISO(iso).getDay();return d===0||d===6}
function workdaysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);const out=[];let d=new Date(y,m-1,1);
  while(d.getMonth()===m-1){const s=toISO(d);if(!isWeekend(s)&&!holidayName(s))out.push(s);d.setDate(d.getDate()+1)}
  return out;
}

function toISOdate(v){
  if(!v)return '';
  if(typeof v==='number'){const d=new Date(v);return isNaN(d)?'':toISO(d)}
  if(/^\d{4}-\d{2}-\d{2}/.test(v))return String(v).slice(0,10);
  const d=new Date(v);return isNaN(d)?'':toISO(d);
}
function normalizeTask(raw){
  if(!raw||typeof raw!=='object')return null;
  const text=String(raw.text||raw.t||'').trim();if(!text)return null;
  const cat=catId(raw);
  const bucket=BUCKETS.some(b=>b.id===(raw.bucket||raw.b))?(raw.bucket||raw.b):'weeks';
  let status=raw.status||raw.s;if(status==='later')status='wait';if(raw.done===true)status='done';
  if(!STATUSES.some(s=>s.id===status))status='open';
  const created=toISOdate(raw.created||raw.cr)||todayISO();
  const doneAt=status==='done'?(toISOdate(raw.doneAt||raw.d||raw.done_date)||created):'';
  return{id:String(raw.id||uid('t')),text,cat,bucket,note:String(raw.note||raw.n||'').trim(),status,created,doneAt,prevStatus:raw.prevStatus||'open',updated:raw.updated||Date.now()};
}
function normalizeDay(raw){
  if(!raw||!raw.date)return null;
  const spans=(raw.spans&&raw.spans.length?raw.spans:(raw.from&&raw.to?[[raw.from,raw.to]]:[])).map(s=>[s[0],s[1]]);
  const nonbillable=!!(raw.nonbillable||raw.nonbill||raw.hours===0);
  let pause_min=raw.pause_min,fixed_min=raw.fixed_min;
  if(fixed_min==null&&raw.hours!=null&&raw.hours!=='')fixed_min=Math.round(Number(raw.hours)*60);
  if(pause_min==null)pause_min=(raw.hours!=null||raw.fixed_min!=null||raw.imported)?0:PAUSE;
  let worked_min=raw.worked_min;
  if(worked_min==null){
    if(fixed_min!=null)worked_min=fixed_min;
    else worked_min=Math.max(0,spans.reduce((a,[f,t])=>a+(spanMin(f,t)||0),0)-(pause_min||0));
  }
  return{id:String(raw.id||uid('d')),date:String(raw.date).slice(0,10),spans,pause_min:pause_min||0,fixed_min:fixed_min!=null?fixed_min:null,worked_min:Math.round(worked_min||0),work:Array.isArray(raw.work)?raw.work.map(String):String(raw.work||'').split('\n').map(s=>s.trim()).filter(Boolean),notes:String(raw.notes||raw.note||'').trim(),areas:Array.isArray(raw.areas)?raw.areas:[],nonbillable};
}
function normalizeExp(raw){
  if(!raw)return null;
  const val=Number(raw.czk??raw.amount??raw.kc);const what=String(raw.what||raw.text||raw.desc||'').trim();const date=String(raw.date||'').slice(0,10);
  if(!date||!what||!isFinite(val))return null;
  return{id:String(raw.id||uid('e')),date,what,czk:val};
}
function normalizeRem(raw){
  if(!raw)return null;
  const text=String(raw.text||raw.t||raw.note||'').trim();if(!text)return null;
  let when=raw.when||raw.at||null;
  if(when){when=String(when).replace(' ','T').slice(0,16);if(/^\d{4}-\d{2}-\d{2}$/.test(when))when+='T09:00'}
  else when=null;
  return{id:String(raw.id||uid('r')),text,when,done:!!raw.done,created:toISOdate(raw.created)||todayISO()};
}

const defaultSettings=()=>({billedUntil:'2026-10-15',rate:600,specialEnd:'2026-11-30'});
function migrateOld(){
  const out={tasks:load('den_tasks',null),days:load('den_days',null),expenses:load('den_expenses',null),invoices:load('den_invoices',null),reminders:load('den_reminders',null),settings:load('den_settings',null)};
  if(!Array.isArray(out.tasks)) out.tasks=load('ukoly_tasks',[]);
  if(!Array.isArray(out.days)) out.days=load('dochazka_days',load('dochazka_history',[]));
  if(!Array.isArray(out.expenses)) out.expenses=load('dochazka_expenses',[]);
  if(!Array.isArray(out.invoices)) out.invoices=load('dochazka_invoices',[]);
  if(!out.settings) out.settings=Object.assign(defaultSettings(),load('dochazka_settings',{}));
  if(!Array.isArray(out.reminders)) out.reminders=[];
  return out;
}
const boot=migrateOld();
let tasks=(boot.tasks||[]).map(normalizeTask).filter(Boolean);
let days=(boot.days||[]).map(normalizeDay).filter(Boolean);
let expenses=(boot.expenses||[]).map(normalizeExp).filter(Boolean);
let invoices=(boot.invoices||[]).map(normalizeExp).filter(Boolean);
let reminders=(boot.reminders||[]).map(normalizeRem).filter(Boolean);
let settings=Object.assign(defaultSettings(),boot.settings||{});
const persist=()=>{save('den_tasks',tasks);save('den_days',days);save('den_expenses',expenses);save('den_invoices',invoices);save('den_reminders',reminders);save('den_settings',settings)};
repairStoredTasks(tasks);
persist();

function dayMin(d){return d.nonbillable?0:d.worked_min}
function pay(min){return Math.round((min/60)*settings.rate)}
function period(){
  const start=addDays(settings.billedUntil,1);
  const special=settings.specialEnd||'2026-11-30';
  const end=settings.billedUntil<special?special:lastDayOfMonth(start);
  return{start,end};
}
function inPeriod(iso,p){return iso>=p.start&&iso<=p.end}
function findDay(date){return days.find(d=>d.date===date)}

let view='dnes', taskTab='all', taskFilter='all', taskDoneOpen=true, monthYM=todayISO().slice(0,7);
let sheetMode=null, sheetTarget=null, quickBucket='tomorrow', pendingMails=[];
window.__lastMailto='';

function setView(v){
  view=v;
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  ['dnes','ukoly','dochazka','rems'].forEach(id=>$('view-'+id).hidden=v!==id);
  if(v==='dnes')renderDnes();
  if(v==='ukoly')renderTasks();
  if(v==='dochazka')renderDochazka();
  if(v==='rems')renderRems();
}
document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>setView(b.dataset.view));

/* ---------- Dnes: attendance form ---------- */
function formSpans(){
  const s=[];
  if($('from1').value&&$('to1').value)s.push([$('from1').value,$('to1').value]);
  if(!$('span2row').hidden&&$('from2').value&&$('to2').value)s.push([$('from2').value,$('to2').value]);
  return s;
}
function formWorked(){
  if($('nonbill').checked&&!formSpans().length)return 0;
  const spans=formSpans();if(!spans.length)return null;
  return Math.max(0,spans.reduce((a,[f,t])=>a+(spanMin(f,t)||0),0)-($('lunch').checked?PAUSE:0));
}
function updateTotal(){
  const nb=$('nonbill').checked,w=formWorked(),lunchOn=$('lunch').checked;
  let html,cls='total';
  if(nb&&(w==null||w===0)){html='Nefakturuje se<small>Den se zapíše, do faktury nepočítá</small>';cls+=' nb'}
  else if(w==null){html='Odpracováno: –<small>'+(lunchOn?'pauza 30 min se odečte':'bez pauzy na oběd')+'</small>'}
  else{
    html='Odpracováno: '+fmt(w)+(nb?'':' · '+czk(pay(w)))+'<small>'+(lunchOn?'pauza 30 min odečtena':'bez pauzy na oběd')+(nb?' · nefakturuje se':'')+'</small>';
    if(nb)cls+=' nb';
  }
  $('total').className=cls;$('total').innerHTML=html;
  saveDraft();
}
function saveDraft(){
  save('den_draft',{from1:$('from1').value,to1:$('to1').value,from2:$('from2').value,to2:$('to2').value,span2:!$('span2row').hidden,lunch:$('lunch').checked,nonbill:$('nonbill').checked,work:$('work').value,expWhat:$('expWhat').value,expCzk:$('expCzk').value,notes:$('dayNotes').value});
}
function setSpan2(on){
  $('span2row').hidden=!on;
  $('toggleSpan2').textContent=on?'Odebrat druhý čas':'+ Druhý čas';
  if(!on){$('from2').value='';$('to2').value=''}
  updateTotal();
}
$('toggleSpan2').onclick=()=>setSpan2($('span2row').hidden);
['from1','to1','from2','to2','lunch','nonbill','work','expWhat','expCzk','dayNotes'].forEach(id=>{
  const el=$(id);if(el){el.addEventListener('input',updateTotal);el.addEventListener('change',updateTotal)}
});

function fillTodayForm(d){
  const s=(d&&d.spans)||[];
  $('from1').value=s[0]?s[0][0]:'';$('to1').value=s[0]?s[0][1]:'';
  if(s[1]){setSpan2(true);$('from2').value=s[1][0];$('to2').value=s[1][1]}else setSpan2(false);
  $('lunch').checked=d?((d.pause_min||0)>0):true;
  $('nonbill').checked=!!(d&&d.nonbillable);
  $('work').value=d?(d.work||[]).join('\n'):'';
  const ex=expenses.find(e=>e.date===todayISO());
  $('expWhat').value=ex?ex.what:'';$('expCzk').value=ex?ex.czk:'';
  updateTotal();
}
function collectTodayDay(){
  const date=todayISO(),nb=$('nonbill').checked,spans=formSpans(),w=formWorked();
  const hasExp=!!$('expWhat').value.trim()||!!$('expCzk').value.trim();
  if(!nb&&w==null&&!hasExp&&!$('work').value.trim())return null;
  if(!nb&&w==null&&($('work').value.trim()||hasExp)){/* work without times - still allow if nonbill or reject */ }
  if(!nb&&w==null)return null;
  const existing=findDay(date);
  const pause=$('lunch').checked?PAUSE:0;
  let fixed_min=null,worked=w==null?0:w;
  if(existing&&existing.fixed_min!=null){
    const same=JSON.stringify(spans)===JSON.stringify(existing.spans||[])&&pause===(existing.pause_min||0);
    if(same){fixed_min=existing.fixed_min;worked=existing.fixed_min}
  }
  return normalizeDay({id:(existing||{}).id||uid('d'),date,spans,pause_min:pause,fixed_min,worked_min:worked,work:$('work').value.split('\n').map(s=>s.trim()).filter(Boolean),notes:'',nonbillable:nb,areas:(existing||{}).areas||[]});
}
function collectTodayExpense(){
  const what=$('expWhat').value.trim(),amt=$('expCzk').value.trim();
  if(!what&&!amt)return null;
  if(!what||!amt||!isFinite(Number(amt)))return 'bad';
  return{id:uid('e'),date:todayISO(),what,czk:Number(amt)};
}
function upsertDay(day){
  const i=days.findIndex(x=>x.date===day.date);
  if(i>=0)days[i]=Object.assign({},days[i],day,{id:days[i].id});
  else days.push(day);
  days.sort((a,b)=>a.date.localeCompare(b.date));
}
function saveTodayAttendance(){
  const day=collectTodayDay();
  const exp=collectTodayExpense();
  if(exp==='bad'){toast('Doplň výdaj: za co a částku');return false}
  if(day)upsertDay(day);
  if(exp){
    const i=expenses.findIndex(e=>e.date===exp.date&&e.what===exp.what);
    if(i>=0)expenses[i]=Object.assign({},expenses[i],exp,{id:expenses[i].id});
    else{
      const j=expenses.findIndex(e=>e.date===exp.date);
      if(j>=0&&!$('expWhat').dataset.keep)expenses[j]=Object.assign({},expenses[j],exp,{id:expenses[j].id});
      else expenses.push(exp);
    }
    expenses.sort((a,b)=>a.date.localeCompare(b.date));
  }
  persist();
  return true;
}

/* ---------- Tasks UI ---------- */
function matchesCat(t){return taskFilter==='all'||t.cat===taskFilter}
function sortTasks(arr){
  const so={wip:0,open:1,wait:2,done:3};
  return arr.sort((a,b)=>(so[a.status]-so[b.status])||String(a.created).localeCompare(String(b.created))||a.text.localeCompare(b.text,'cs'));
}
function visibleTasks(){
  return sortTasks(tasks.filter(t=>{
    if(!matchesCat(t))return false;
    if(taskTab==='all')return t.status!=='done';
    if(taskTab==='done')return t.status==='done';
    return t.status!=='done'&&t.bucket===taskTab;
  }));
}
function countBucket(id){
  return tasks.filter(t=>{
    if(!matchesCat(t))return false;
    if(id==='all')return true;
    if(id==='done')return t.status==='done';
    return t.status!=='done'&&t.bucket===id;
  }).length;
}
function toggleDone(t){
  if(t.status==='done'){t.status=t.prevStatus&&t.prevStatus!=='done'?t.prevStatus:'open';t.doneAt='';}
  else{t.prevStatus=t.status;t.status='done';t.doneAt=todayISO()}
  t.updated=Date.now();persist();renderTasks();renderDnes();
  toast(t.status==='done'?'Hotovo':'Vráceno mezi otevřené');
}
function taskCard(t,opts){
  const c=catBy(t.cat),st=stBy(t.status);
  const d=document.createElement('div');
  d.className='task'+(t.status==='done'?' done':'');
  d.style.setProperty('--cat',c.color);
  d.innerHTML='<button type="button" class="chk'+(t.status==='done'?' on':'')+'" aria-label="Hotovo">'+(t.status==='done'?'✓':'')+'</button>'+
    '<div class="body"><div class="ttext">'+esc(t.text)+'</div>'+(t.note?'<div class="tnote">'+esc(t.note)+'</div>':'')+
    '<div class="tmeta"><span class="pill"><span class="dot" style="background:'+c.color+'"></span>'+esc(c.name)+'</span>'+
    '<span class="pill '+esc(t.status)+'">'+esc(st.name)+'</span></div></div>';
  d.querySelector('.chk').onclick=ev=>{ev.stopPropagation();toggleDone(t)};
  if(!opts||opts.edit!==false)d.querySelector('.body').onclick=()=>openTaskSheet(t);
  return d;
}
function renderTasks(){
  const tabs=$('taskTabs');tabs.innerHTML='';
  const tabDefs=[{id:'all',name:'Vše',short:'Vše'}].concat(BUCKETS,[{id:'done',name:'Hotovo',short:'Hotovo'}]);
  tabDefs.forEach(b=>{
    const btn=document.createElement('button');btn.type='button';btn.className='tab'+(taskTab===b.id?' on':'');
    btn.innerHTML=esc(b.short)+' <span class="n">'+countBucket(b.id)+'</span>';
    btn.onclick=()=>{taskTab=b.id;renderTasks()};
    tabs.appendChild(btn);
  });
  const fil=$('taskFilters');fil.innerHTML='';
  [{id:'all',name:'Vše',short:'Vše',color:null}].concat(CATS).forEach(c=>{
    const btn=document.createElement('button');btn.type='button';btn.className='fchip'+(taskFilter===c.id?' on':'');
    if(c.color)btn.style.setProperty('--cat',c.color);
    btn.innerHTML=(c.color?'<span class="dot"></span>':'')+esc(c.short);
    btn.onclick=()=>{taskFilter=c.id;renderTasks()};
    fil.appendChild(btn);
  });
  const list=$('taskList');list.innerHTML='';
  const empty=$('taskEmpty');
  const hasAny=tasks.some(matchesCat);
  if(!hasAny){
    empty.hidden=false;
    empty.textContent=tasks.length?'V tomhle filtru zatím nic není.':'Zatím žádné úkoly. Přidej první, nebo vlož data.';
    return;
  }
  empty.hidden=true;
  if(taskTab==='all'){
    let shown=0;
    BUCKETS.forEach(b=>{
      const group=sortTasks(tasks.filter(t=>matchesCat(t)&&t.status!=='done'&&t.bucket===b.id));
      if(!group.length)return;
      const h=document.createElement('h2');h.className='task-sec';h.textContent=b.name;
      list.appendChild(h);
      group.forEach(t=>list.appendChild(taskCard(t)));
      shown+=group.length;
    });
    const done=sortTasks(tasks.filter(t=>matchesCat(t)&&t.status==='done'));
    if(done.length){
      const wrap=document.createElement('div');wrap.className='done-sec';
      const btn=document.createElement('button');btn.type='button';btn.className='task-sec done-toggle';
      btn.setAttribute('aria-expanded',taskDoneOpen?'true':'false');
      btn.innerHTML='Hotovo <span class="n">'+done.length+'</span>';
      const box=document.createElement('div');box.className='done-box';box.hidden=!taskDoneOpen;
      done.forEach(t=>box.appendChild(taskCard(t)));
      btn.onclick=()=>{taskDoneOpen=!taskDoneOpen;btn.setAttribute('aria-expanded',taskDoneOpen?'true':'false');box.hidden=!taskDoneOpen};
      wrap.appendChild(btn);wrap.appendChild(box);list.appendChild(wrap);
      shown+=done.length;
    }
    if(!shown){empty.hidden=false;empty.textContent='V tomhle filtru zatím nic není.';}
    return;
  }
  const items=visibleTasks();
  if(!items.length){
    empty.hidden=false;
    empty.textContent=taskTab==='done'?'Zatím žádné hotové úkoly v tomto filtru.':'V tomhle období zatím nic není.';
    return;
  }
  items.forEach(t=>list.appendChild(taskCard(t)));
}

function paintChips(el,options,value,withDot,onpick){
  el.innerHTML='';
  options.forEach(o=>{
    const b=document.createElement('button');b.type='button';b.className='chip'+(o.id===value?' on':'');
    if(withDot&&o.color){b.style.setProperty('--cat',o.color);b.innerHTML='<span class="dot"></span>'+esc(o.short||o.name)}
    else b.textContent=o.short||o.name;
    b.onclick=()=>onpick(o.id);
    el.appendChild(b);
  });
}
function openTaskSheet(task){
  sheetMode='task';sheetTarget=task||null;
  const draft=task?{text:task.text,cat:task.cat,bucket:task.bucket,status:task.status,note:task.note||''}:{text:'',cat:'ost',bucket:view==='ukoly'&&taskTab!=='done'&&taskTab!=='all'?taskTab:'tomorrow',status:'open',note:''};
  $('sheetTitle').textContent=task?'Upravit úkol':'Nový úkol';
  $('sheetDelete').hidden=!task;
  $('sheetBody').innerHTML='<div class="field"><label for="fText">Úkol</label><textarea id="fText" rows="3" placeholder="Co je potřeba udělat">'+esc(draft.text)+'</textarea></div>'+
    '<div class="field"><span class="lbl">Kategorie</span><div class="chips" id="fCat"></div></div>'+
    '<div class="field"><span class="lbl">Období</span><div class="chips" id="fBucket"></div></div>'+
    '<div class="field"><span class="lbl">Stav</span><div class="chips" id="fStatus"></div></div>'+
    '<div class="field"><label for="fNote">Poznámka</label><textarea id="fNote" rows="2" placeholder="Volitelná poznámka">'+esc(draft.note)+'</textarea></div>';
  const redraw=()=>{paintChips($('fCat'),CATS,draft.cat,true,id=>{draft.cat=id;redraw()});paintChips($('fBucket'),BUCKETS,draft.bucket,false,id=>{draft.bucket=id;redraw()});paintChips($('fStatus'),STATUSES,draft.status,false,id=>{draft.status=id;redraw()})};
  redraw();
  $('overlay').dataset.draft=JSON.stringify(draft);
  $('overlay')._draft=draft;
  $('overlay').hidden=false;document.body.classList.add('locked');
  setTimeout(()=>$('fText')&&$('fText').focus(),50);
}
function closeSheet(){$('overlay').hidden=true;if($('importOverlay').hidden)document.body.classList.remove('locked');sheetMode=null;sheetTarget=null}
$('addTaskBtn').onclick=()=>openTaskSheet(null);
$('sheetCancel').onclick=closeSheet;
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('importOverlay').hidden)closeImportSheet();else if(!$('overlay').hidden)closeSheet()}});
$('sheetSave').onclick=()=>{
  if(sheetMode==='settings'){
    const b=$('sBilled').value,s=$('sSpecial').value,r=Number($('sRate').value);
    if(!b||!s||!isFinite(r)||r<0){toast('Zkontroluj nastavení');return}
    settings.billedUntil=b;settings.specialEnd=s;settings.rate=r;persist();closeSheet();if(view==='dochazka')renderDochazka();updateTotal();toast('Nastavení uloženo');
    return;
  }
  if(sheetMode==='invoice'){
    const date=$('invDate').value,what=$('invWhat').value.trim(),cz=Number($('invCzk').value);
    if(!date||!what||!isFinite(cz)){toast('Doplň datum, popis a částku');return}
    invoices.push({id:uid('i'),date,what,czk:cz});
    if($('invClose').checked){const p=period();settings.billedUntil=p.end}
    persist();closeSheet();renderDochazka();toast('Faktura zapsána');
    return;
  }
  if(sheetMode!=='task')return;
  const draft=$('overlay')._draft||{};
  const text=($('fText').value||'').trim(),note=($('fNote').value||'').trim();
  if(!text){toast('Napiš úkol');return}
  draft.cat=draft.cat||'ost';draft.bucket=draft.bucket||'weeks';draft.status=draft.status||'open';
  if(sheetTarget){
    const t=sheetTarget;
    if(t.status!=='done'&&draft.status==='done'){t.prevStatus=t.status;t.doneAt=todayISO()}
    if(t.status==='done'&&draft.status!=='done')t.doneAt='';
    t.text=text;t.cat=draft.cat;t.bucket=draft.bucket;t.status=draft.status;t.note=note;t.updated=Date.now();
    toast('Úkol uložen');
  }else{
    tasks.push(normalizeTask({id:uid('t'),text,cat:draft.cat,bucket:draft.bucket,status:draft.status,note,created:todayISO()}));
    toast('Úkol přidán');
  }
  persist();closeSheet();renderTasks();renderDnes();
};
$('sheetDelete').onclick=()=>{
  if(sheetMode==='task'&&sheetTarget){
    if(!confirm('Smazat úkol „'+sheetTarget.text+'“?'))return;
    tasks=tasks.filter(t=>t!==sheetTarget);persist();closeSheet();renderTasks();renderDnes();toast('Úkol smazán');
  }
};

/* ---------- Dnes task + reminder quick UI ---------- */
function todayTaskList(){
  const open=tasks.filter(t=>t.status!=='done');
  const soon=open.filter(t=>t.bucket==='tomorrow'||t.status==='wip');
  const list=soon.length?soon:open.slice(0,8);
  const box=$('todayTasks');box.innerHTML='';
  if(!list.length){box.innerHTML='<p class="muted" style="margin:0">Žádné otevřené úkoly na teď.</p>';return}
  list.forEach(t=>box.appendChild(taskCard(t)));
}
function renderQuickBucket(){
  paintChips($('quickBucket'),BUCKETS,quickBucket,false,id=>{quickBucket=id;renderQuickBucket()});
}
$('quickAdd').onclick=()=>{
  const text=$('quickTask').value.trim();
  if(!text){toast('Napiš úkol');return}
  tasks.push(normalizeTask({id:uid('t'),text,cat:'ost',bucket:quickBucket,status:'open',created:todayISO()}));
  $('quickTask').value='';persist();renderDnes();renderTasks();toast('Úkol přidán');
};

function remWhenFrom(text,dateEl,timeEl){
  let date=dateEl.value,time=timeEl.value;
  const s=String(text||'').toLowerCase();
  const tm=s.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if(!time&&tm)time=pad(tm[1])+':'+tm[2];
  if(!date){
    if(/zítra|zitra/.test(s))date=addDays(todayISO(),1);
    else if(/pozítří|pozitri/.test(s))date=addDays(todayISO(),2);
    else if(/\bdnes\b/.test(s))date=todayISO();
  }
  if(!date&&!time)return null;
  if(date&&!time)time='09:00';
  if(!date&&time)date=todayISO();
  return date+'T'+time.slice(0,5);
}
function addReminderFrom(textEl,dateEl,timeEl){
  const text=textEl.value.trim();
  if(!text){toast('Napiš připomínku');return}
  const when=remWhenFrom(text,dateEl,timeEl);
  reminders.push(normalizeRem({id:uid('r'),text,when,done:false,created:todayISO()}));
  textEl.value='';dateEl.value='';timeEl.value='';
  persist();renderDnes();renderRems();toast('Připomínka přidána');
}
$('remAdd').onclick=()=>addReminderFrom($('remText'),$('remDate'),$('remTime'));
$('remAdd2').onclick=()=>addReminderFrom($('remText2'),$('remDate2'),$('remTime2'));
function remChipBar(el,dateEl,timeEl){
  el.innerHTML='';
  [['Dnes',todayISO()],['Zítra',addDays(todayISO(),1)],['Za týden',addDays(todayISO(),7)]].forEach(([lab,iso])=>{
    const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=lab;
    b.onclick=()=>{dateEl.value=iso;if(!timeEl.value)timeEl.value='08:00'};
    el.appendChild(b);
  });
}
function formatWhen(when){
  if(!when)return 'Bez termínu';
  const [d,t]=String(when).split('T');
  return czDateSp(d)+(t?' v '+t.slice(0,5):'');
}
function remCard(r){
  const d=document.createElement('div');d.className='rem'+(r.done?' done':'');
  d.innerHTML='<button type="button" class="chk'+(r.done?' on':'')+'" aria-label="Hotovo">'+(r.done?'✓':'')+'</button>'+
    '<div class="body"><div class="ttext">'+esc(r.text)+'</div><div class="tnote">'+esc(formatWhen(r.when))+'</div></div>';
  d.querySelector('.chk').onclick=()=>{r.done=!r.done;persist();renderDnes();renderRems()};
  return d;
}
function upcomingRems(){
  const now=todayISO()+'T00:00';
  return reminders.filter(r=>!r.done).sort((a,b)=>{
    if(!a.when&&!b.when)return 0;
    if(!a.when)return 1;if(!b.when)return -1;
    return a.when.localeCompare(b.when);
  });
}
function renderTodayRems(){
  const box=$('todayRems');box.innerHTML='';
  const list=upcomingRems().slice(0,6);
  if(!list.length)return;
  list.forEach(r=>box.appendChild(remCard(r)));
}
function renderRems(){
  const up=$('remUpcoming'),dn=$('remDone');up.innerHTML='';dn.innerHTML='';
  const a=upcomingRems(),b=reminders.filter(r=>r.done).sort((x,y)=>String(y.when||'').localeCompare(String(x.when||'')));
  if(!a.length)up.innerHTML='<div class="card muted">Žádné nadcházející připomínky.</div>';
  else a.forEach(r=>up.appendChild(remCard(r)));
  if(!b.length)dn.innerHTML='<div class="card muted">Zatím žádné hotové.</div>';
  else b.forEach(r=>dn.appendChild(remCard(r)));
}

function renderDnes(){
  const d=parseISO(todayISO());
  $('todayLabel').textContent=WD[d.getDay()]+' '+d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
  todayTaskList();
  renderQuickBucket();
  remChipBar($('remChips'),$('remDate'),$('remTime'));
  renderTodayRems();
  renderPendingMail();
  updateTotal();
}

/* ---------- Docházka overview ---------- */
function renderDochazka(){
  const [y,m]=monthYM.split('-').map(Number);
  $('monthTitle').textContent=MONTHS[m-1]+' '+y;
  const list=days.filter(d=>d.date.startsWith(monthYM)).sort((a,b)=>a.date.localeCompare(b.date));
  const exp=expenses.filter(e=>e.date.startsWith(monthYM)).sort((a,b)=>a.date.localeCompare(b.date));
  const billMin=list.reduce((a,d)=>a+dayMin(d),0),expSum=exp.reduce((a,e)=>a+e.czk,0);
  $('monthMetrics').innerHTML=
    metric(fmt(billMin),'Odpracováno')+metric(czk(pay(billMin)),'Práce ('+settings.rate+' Kč/h)')+
    metric(czk(expSum),'Ostatní náklady')+metric(czk(pay(billMin)+expSum),'Celkem k fakturaci');
  const wds=workdaysInMonth(monthYM);
  const hols=Object.entries(holidaysInYear(y)).filter(([s])=>s.startsWith(monthYM)).sort((a,b)=>a[0].localeCompare(b[0]));
  const startTrack=days.length?days.map(d=>d.date).sort()[0]:monthYM+'-01';
  const today=todayISO();
  const missing=wds.filter(s=>s<today&&s>=startTrack&&!findDay(s));
  let wdHtml='<div class="rowline"><div>Pracovních dnů v měsíci: <b>'+wds.length+'</b><div class="muted">Bez víkendů a státních svátků</div></div><div class="amt">zapsáno '+list.length+'</div></div>';
  hols.forEach(([s,n])=>{wdHtml+='<div class="rowline"><div><b>'+esc(czDateLong(s))+'</b><div class="muted">'+esc(n)+'</div></div><span class="badge">svátek</span></div>'});
  missing.forEach(s=>{wdHtml+='<div class="rowline missing"><div><b>'+esc(czDateLong(s))+'</b><div class="muted">Chybí zápis</div></div><span class="badge warn">dopsat</span></div>'});
  if(!hols.length&&!missing.length)wdHtml+='<p class="muted" style="margin:8px 0 0">Žádný svátek ani chybějící pracovní den.</p>';
  $('monthWorkdays').innerHTML=wdHtml;
  const box=$('monthDays');box.innerHTML='';
  if(!list.length)box.innerHTML='<div class="card muted">V tomhle měsíci zatím nic není.</div>';
  list.forEach(d=>{
    const b=document.createElement('div');b.className='day'+(d.nonbillable?' nb':'');
    const when=(d.spans||[]).map(([f,t])=>f+'–'+t).join(', ');
    const areas=(d.areas||[]).map(a=>AREAS[a]||a).filter(Boolean).join(', ');
    const title=d.work.length?d.work.join(' · '):(d.nonbillable?'Mimo SAPEKOR':'Bez popisu');
    b.innerHTML='<div class="lead"><b>'+esc(czDateLong(d.date))+'</b><span class="meta">'+(d.nonbillable?'nefakturuje se':fmt(d.worked_min)+' · '+czk(pay(dayMin(d))))+'</span></div>'+
      '<div class="title">'+esc(title)+'</div>'+(when||areas||d.notes?'<div class="detail">'+esc([when,areas,d.notes].filter(Boolean).join(' · '))+'</div>':'');
    box.appendChild(b);
  });
  const expBox=$('monthExp'),expTitle=$('monthExpTitle');
  if(!exp.length){expTitle.hidden=true;expBox.innerHTML=''}
  else{
    expTitle.hidden=false;
    expBox.innerHTML='<div class="card">'+exp.map(e=>'<div class="rowline"><div><b>'+esc(czDate(e.date))+'</b><div class="muted">'+esc(e.what)+'</div></div><div class="amt">'+czk(e.czk)+'</div></div>').join('')+
      '<div class="bill-total"><span>Celkem výdaje</span><span>'+czk(expSum)+'</span></div></div>';
  }
  const p=period();
  const openDays=days.filter(d=>inPeriod(d.date,p)&&dayMin(d)>0).sort((a,b)=>a.date.localeCompare(b.date));
  const openMin=openDays.reduce((a,d)=>a+dayMin(d),0);
  const openExp=expenses.filter(e=>inPeriod(e.date,p)).sort((a,b)=>a.date.localeCompare(b.date));
  const openExpSum=openExp.reduce((a,e)=>a+e.czk,0),total=pay(openMin)+openExpSum;
  let html='<p class="muted" style="margin:0 0 10px">Období '+esc(czPeriod(p.start,p.end))+(p.end<='2026-11-30'&&settings.billedUntil<'2026-11-30'?' · pak už celé kalendářní měsíce':'')+', bez DPH.</p>';
  html+='<div class="rowline"><div>Práce, '+openDays.length+' dnů zatím</div><div class="amt">'+fmt(openMin)+' × '+settings.rate+' Kč<br>'+czk(pay(openMin))+'</div></div>';
  openExp.forEach(e=>{html+='<div class="rowline"><div>'+esc(e.what)+'<div class="muted">'+esc(czDateLong(e.date))+'</div></div><div class="amt">'+czk(e.czk)+'</div></div>'});
  html+='<div class="bill-total"><span>Zatím celkem</span><span>'+czk(total)+'</span></div>';
  html+='<div class="actions"><button type="button" class="secondary" id="markBilled">Období je vyfakturované</button></div>';
  $('nextInvoice').innerHTML=html;
  $('markBilled').onclick=()=>openMarkBilled(p,openMin,openExpSum,total);
  const invBox=$('pastInvoices');
  const inv=[...invoices].sort((a,b)=>a.date.localeCompare(b.date));
  if(!inv.length)invBox.innerHTML='<div class="card muted">Zatím žádná zapsaná faktura.</div>';
  else invBox.innerHTML='<div class="card">'+inv.map(e=>'<div class="rowline"><div><b>'+esc(czDate(e.date))+'</b><div class="muted">'+esc(e.what)+'</div></div><div class="amt">'+czk(e.czk)+'</div></div>').join('')+'</div>';
}
function metric(v,l){return '<div class="metric"><div class="v">'+esc(v)+'</div><div class="l">'+esc(l)+'</div></div>'}
$('prevMonth').onclick=()=>{const d=parseISO(monthYM+'-01');d.setMonth(d.getMonth()-1);monthYM=toISO(d).slice(0,7);renderDochazka()};
$('nextMonth').onclick=()=>{const d=parseISO(monthYM+'-01');d.setMonth(d.getMonth()+1);monthYM=toISO(d).slice(0,7);renderDochazka()};

function openSettings(){
  sheetMode='settings';sheetTarget=null;
  $('sheetTitle').textContent='Nastavení';
  $('sheetDelete').hidden=true;
  $('sheetBody').innerHTML='<div class="field"><label for="sBilled">Vyfakturováno do (včetně)</label><input type="date" id="sBilled" value="'+esc(settings.billedUntil)+'"></div>'+
    '<div class="field"><label for="sSpecial">Konec přechodného období</label><input type="date" id="sSpecial" value="'+esc(settings.specialEnd)+'"><div class="muted">Teď 16. 10. – 30. 11. 2026, potom celé kalendářní měsíce.</div></div>'+
    '<div class="field"><label for="sRate">Hodinovka v Kč</label><input type="number" id="sRate" min="0" step="1" value="'+esc(settings.rate)+'"></div>'+
    '<p class="muted">Verze aplikace: '+APP_VERSION+'</p>'+
    '<button type="button" class="secondary" id="forceUpdate">Aktualizovat aplikaci</button>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  const fu=$('forceUpdate');if(fu)fu.onclick=forceRefreshApp;
}
async function forceRefreshApp(){
  toast('Aktualizuji…');
  try{
    const regs=await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r=>r.unregister()));
    if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}
  }catch(e){}
  const u=new URL(location.href);
  u.searchParams.set('v',String(APP_VERSION));
  location.replace(u.pathname+u.search+(location.hash||''));
}
function openMarkBilled(p,openMin,expSum,total){
  sheetMode='invoice';
  $('sheetTitle').textContent='Zapsat fakturu';
  $('sheetDelete').hidden=true;
  $('sheetBody').innerHTML='<p class="muted">Období '+esc(czPeriod(p.start,p.end))+' · '+fmt(openMin)+' + výdaje '+czk(expSum)+'</p>'+
    '<div class="field"><label for="invDate">Datum faktury</label><input type="date" id="invDate" value="'+todayISO()+'"></div>'+
    '<div class="field"><label for="invWhat">Popis</label><input type="text" id="invWhat" value="Faktura za '+esc(czPeriod(p.start,p.end))+'"></div>'+
    '<div class="field"><label for="invCzk">Částka bez DPH</label><input type="number" id="invCzk" min="0" step="1" value="'+Math.round(total)+'"></div>'+
    '<label class="check"><input type="checkbox" id="invClose" checked> Označit období jako vyfakturované (do '+esc(czDate(p.end))+')</label>';
  $('overlay').hidden=false;document.body.classList.add('locked');
}
$('settingsBtn').onclick=openSettings;

/* ---------- Import ---------- */
function b64urlDecode(s){
  s=String(s).replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  const bin=atob(s);const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function extractImportPayload(raw){
  let s=String(raw||'').trim().replace(/^[\s'"`]+|[\s'"`]+$/g,'');
  const hashAt=s.lastIndexOf('#import=');const plainAt=s.lastIndexOf('import=');
  if(hashAt>=0)s=s.slice(hashAt+8);else if(plainAt>=0)s=s.slice(plainAt+7);
  s=s.replace(/\s+/g,'');
  try{s=decodeURIComponent(s)}catch(e){}
  return s;
}
function parseImportedBundle(raw){
  let data=JSON.parse(b64urlDecode(extractImportPayload(raw)));
  if(Array.isArray(data))data={tasks:data};
  if(!data||typeof data!=='object')data={};
  return{
    tasks:(data.tasks||[]).map(normalizeTask).filter(Boolean),
    days:(data.days||[]).map(x=>normalizeDay(Object.assign({imported:true},x))).filter(Boolean),
    expenses:(data.expenses||[]).map(normalizeExp).filter(Boolean),
    invoices:(data.invoices||data.invoiced||[]).map(normalizeExp).filter(Boolean),
    reminders:(data.reminders||data.pripominky||[]).map(normalizeRem).filter(Boolean),
    billedUntil:data.billedUntil,specialEnd:data.specialEnd,rate:data.rate
  };
}
function importSummary(b){
  const parts=[];
  const add=(n,one,few,many)=>{if(n)parts.push(n+' '+(n===1?one:n<5?few:many))};
  add(b.tasks.length,'úkol','úkoly','úkolů');
  add(b.days.length,'den','dny','dní');
  add(b.expenses.length,'výdaj','výdaje','výdajů');
  add(b.invoices.length,'fakturu','faktury','faktur');
  add(b.reminders.length,'připomínku','připomínky','připomínek');
  return parts;
}
function upsert(arr,item,same){
  const i=arr.findIndex(x=>same(x,item));
  if(i>=0)arr[i]=Object.assign({},arr[i],item,{id:arr[i].id});
  else arr.push(item);
}
function applyImported(b){
  const parts=importSummary(b);
  if(!parts.length){toast('V odkazu nejsou žádná data');return false}
  const existing=tasks.length||days.length||expenses.length||invoices.length||reminders.length;
  if(!confirm('Nahrát '+parts.join(', ')+'?'+(existing?' Stejné se aktualizují, ostatní zůstanou.':'')))return false;
  b.tasks.forEach(t=>upsert(tasks,t,(a,c)=>a.id===c.id||a.text.toLowerCase()===c.text.toLowerCase()));
  b.days.forEach(d=>upsert(days,d,(a,c)=>a.date===c.date));
  b.expenses.forEach(d=>upsert(expenses,d,(a,c)=>a.date===c.date&&a.what===c.what));
  b.invoices.forEach(d=>upsert(invoices,d,(a,c)=>a.date===c.date&&a.what===c.what));
  b.reminders.forEach(d=>upsert(reminders,d,(a,c)=>a.id===d.id||(a.text===d.text&&a.when===d.when)));
  tasks.sort((a,b)=>String(a.created).localeCompare(String(b.created)));
  days.sort((a,b)=>a.date.localeCompare(b.date));
  expenses.sort((a,b)=>a.date.localeCompare(b.date));
  invoices.sort((a,b)=>a.date.localeCompare(b.date));
  if(b.billedUntil)settings.billedUntil=b.billedUntil;
  if(b.specialEnd)settings.specialEnd=b.specialEnd;
  if(b.rate)settings.rate=Number(b.rate);
  persist();
  takeSnapshot();
  const last=days[days.length-1];if(last)monthYM=last.date.slice(0,7);
  const today=findDay(todayISO());if(today)fillTodayForm(today);
  renderDnes();if(view==='ukoly')renderTasks();if(view==='dochazka')renderDochazka();if(view==='rems')renderRems();
  toast('Načteno: '+parts.join(', '));
  return true;
}
function handleHashImport(){
  const hash=location.hash||'';
  if(!/(?:^|#)import=/.test(hash))return;
  history.replaceState(null,'',location.pathname+location.search);
  let b;try{b=parseImportedBundle(hash)}catch(e){toast('Import se nepovedl');return}
  applyImported(b);
}
function openImportSheet(prefill){
  $('importText').value=prefill||'';
  $('importOverlay').hidden=false;document.body.classList.add('locked');
  setTimeout(()=>$('importText').focus(),50);
}
function closeImportSheet(){
  $('importOverlay').hidden=true;
  if($('overlay').hidden)document.body.classList.remove('locked');
}
async function startPasteImport(){
  let text='';
  try{if(navigator.clipboard&&navigator.clipboard.readText)text=(await navigator.clipboard.readText())||''}catch(e){}
  text=String(text).trim();
  if(text){
    try{const b=parseImportedBundle(text);if(importSummary(b).length&&applyImported(b))return}catch(e){}
  }
  openImportSheet(text);
}
$('importBtn').onclick=startPasteImport;
$('importCancel').onclick=closeImportSheet;
$('importOverlay').addEventListener('click',e=>{if(e.target===$('importOverlay'))closeImportSheet()});
$('importGo').onclick=()=>{
  const text=$('importText').value.trim();
  if(!text){toast('Vlož odkaz nebo kód');return}
  let b;try{b=parseImportedBundle(text)}catch(e){toast('Import se nepovedl');return}
  if(applyImported(b))closeImportSheet();
};

/* ---------- Send to IS BOT ---------- */
function takeSnapshot(){
  save('den_snap',{
    tasks:tasks.map(t=>({id:t.id,t:t.text,c:t.cat,b:t.bucket,n:t.note||'',s:t.status})),
    days:days.map(d=>({date:d.date,worked_min:d.worked_min,work:d.work,nonbillable:!!d.nonbillable,spans:d.spans,pause_min:d.pause_min,notes:d.notes||''})),
    rem:reminders.map(r=>({id:r.id,text:r.text,when:r.when,done:!!r.done})),
    notes:$('dayNotes')?$('dayNotes').value.trim():'',
    expenses:expenses.map(e=>({date:e.date,what:e.what,czk:e.czk}))
  });
}
function collectChanges(){
  const snap=load('den_snap',null);
  const date=todayISO();
  const todayDay=collectTodayDay();
  const exp=collectTodayExpense();
  const expense=exp&&exp!=='bad'?{czk:exp.czk,what:exp.what}:null;
  const snapTasks=new Map((snap&&snap.tasks||[]).map(x=>[x.id,x]));
  const neu=[],done=[],changed=[];
  tasks.forEach(t=>{
    const p=snapTasks.get(t.id);
    if(!p){
      if(t.status==='done')done.push(t.text);
      else neu.push({t:t.text,c:t.cat,b:t.bucket,n:t.note||''});
    }else if(p.s!=='done'&&t.status==='done')done.push(t.text);
    else if(p.t!==t.text||p.c!==t.cat||p.b!==t.bucket||(p.n||'')!==(t.note||'')||p.s!==t.status){
      const o={t:t.text,c:t.cat,b:t.bucket};if(t.note)o.n=t.note;if(t.status!=='open')o.s=t.status;changed.push(o);
    }
  });
  let dochazka=null;
  if(todayDay){
    const prev=(snap&&snap.days||[]).find(d=>d.date===date);
    const sig=JSON.stringify({w:todayDay.worked_min,work:todayDay.work,nb:!!todayDay.nonbillable,spans:todayDay.spans,pause:todayDay.pause_min,exp:expense});
    const prevSig=prev?JSON.stringify({w:prev.worked_min,work:prev.work,nb:!!prev.nonbillable,spans:prev.spans,pause:prev.pause_min,exp:null}):'';
    const prevExp=(snap&&snap.expenses||[]).find(e=>e.date===date);
    const expChanged=expense?(!prevExp||prevExp.what!==expense.what||prevExp.czk!==expense.czk):false;
    if(!prev||sig!==prevSig||expChanged){
      const from=todayDay.spans[0]&&todayDay.spans[0][0]||'';
      const to=todayDay.spans[0]&&todayDay.spans[0][1]||'';
      dochazka={date,from,to,spans:todayDay.spans,pause_min:todayDay.pause_min,worked_min:todayDay.worked_min,work:todayDay.work,notes:todayDay.notes||'',nonbillable:!!todayDay.nonbillable,expense};
    }
  }
  const snapRem=new Map((snap&&snap.rem||[]).map(x=>[x.id,x]));
  const pripominky=reminders.filter(r=>{
    const p=snapRem.get(r.id);
    if(!p)return true;
    return p.text!==r.text||p.when!==r.when||!!p.done!==!!r.done;
  }).map(r=>({when:r.when||null,text:r.text}));
  const notes=($('dayNotes').value||'').trim();
  const notesOut=(snap&&snap.notes===notes)?'':notes;
  return{date,dochazka,ukoly:{new:neu,done,changed},pripominky,notes:notesOut};
}
function hasChanges(p){
  return !!(p.dochazka||p.ukoly.new.length||p.ukoly.done.length||p.ukoly.changed.length||p.pripominky.length||p.notes);
}
function humanSummary(p){
  const L=['Den '+czDate(p.date),''];
  if(p.dochazka){
    const d=p.dochazka;
    const when=(d.spans&&d.spans.length?d.spans.map(([f,t])=>f+'–'+t).join(', '):(d.from&&d.to?d.from+'–'+d.to:''));
    L.push('Docházka'+(when?': '+when:'')+(d.worked_min!=null?' ('+fmt(d.worked_min)+(d.pause_min?', pauza '+d.pause_min+' min odečtena':'')+')':'')+(d.nonbillable?' — nefakturuje se':''));
    (d.work||[]).forEach(w=>L.push('- '+w));
    if(d.expense)L.push('Výdaj: '+d.expense.what+' · '+czk(d.expense.czk));
    L.push('');
  }
  if(p.ukoly.new.length){L.push('Nové úkoly:');p.ukoly.new.forEach(t=>L.push('- '+t.t+(t.n?' ('+t.n+')':'')));L.push('')}
  if(p.ukoly.done.length){L.push('Hotovo:');p.ukoly.done.forEach(t=>L.push('- '+t));L.push('')}
  if(p.ukoly.changed.length){L.push('Upravené úkoly:');p.ukoly.changed.forEach(t=>L.push('- '+t.t));L.push('')}
  if(p.pripominky.length){L.push('Připomínky:');p.pripominky.forEach(r=>L.push('- '+(r.when?formatWhen(r.when)+': ':'')+r.text));L.push('')}
  if(p.notes){L.push('Poznámky:',p.notes,'')}
  return L.join('\n').trim();
}
function packBody(subjectDate,payload,part,parts){
  const jsonObj=Object.assign({kind:'den',date:payload.date},payload);
  delete jsonObj._human;
  if(parts>1){jsonObj.part=part;jsonObj.parts=parts}
  const json=JSON.stringify(jsonObj);
  const human=payload._human||humanSummary(payload);
  return{subject:parts>1?('DEN '+subjectDate+' ('+part+'/'+parts+')'):('DEN '+subjectDate),body:human+'\n\n---JSON---\n'+json};
}
function splitPayload(p){
  const dateLabel=czDate(p.date);
  const full=Object.assign({},p,{_human:humanSummary(p)});
  const one=packBody(dateLabel,full,1,1);
  if(one.body.length<=BODY_MAX)return[one];
  const short=Object.assign({},p,{_human:humanSummary(p).split('\n').slice(0,8).join('\n')});
  const two=packBody(dateLabel,short,1,1);
  if(two.body.length<=BODY_MAX)return[two];
  const chunks=[];
  const base={date:p.date,dochazka:null,ukoly:{new:[],done:[],changed:[]},pripominky:[],notes:''};
  if(p.dochazka||p.notes)chunks.push(Object.assign({},base,{dochazka:p.dochazka,notes:p.notes}));
  const take=()=>({date:p.date,dochazka:null,ukoly:{new:[],done:[],changed:[]},pripominky:[],notes:''});
  let cur=take();
  const fit=obj=>{const b=packBody(dateLabel,Object.assign({},obj,{_human:humanSummary(obj)}),1,1);return b.body.length<=BODY_MAX-20};
  const pushList=(key,arr)=>{
    arr.forEach(item=>{
      const probe=JSON.parse(JSON.stringify(cur));
      if(key==='pripominky')probe.pripominky=probe.pripominky.concat([item]);
      else if(key==='done')probe.ukoly.done=probe.ukoly.done.concat([item]);
      else probe.ukoly[key]=probe.ukoly[key].concat([item]);
      if(fit(probe))cur=probe;
      else{if(hasChanges(cur))chunks.push(cur);cur=take();if(key==='pripominky')cur.pripominky=[item];else if(key==='done')cur.ukoly.done=[item];else cur.ukoly[key]=[item]}
    });
  };
  pushList('new',p.ukoly.new);pushList('done',p.ukoly.done);pushList('changed',p.ukoly.changed);pushList('pripominky',p.pripominky);
  if(hasChanges(cur))chunks.push(cur);
  if(!chunks.length)chunks.push(p);
  const n=chunks.length;
  return chunks.map((c,i)=>packBody(dateLabel,Object.assign({},c,{_human:humanSummary(c)}),i+1,n));
}
function mailtoUrl(subject,body){
  return 'mailto:'+TO+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
}
function renderPendingMail(){
  const box=$('pendingMail');
  if(!pendingMails.length){box.hidden=true;box.innerHTML='';return}
  box.hidden=false;
  const left=pendingMails.length,total=pendingMails[0]._total;
  const next=total-left+1;
  box.innerHTML='<div class="card"><p style="margin:0 0 10px">Ještě zbývá odeslat část '+next+'/'+total+'.</p><button type="button" class="primary" id="sendNext">Odeslat další část</button></div>';
  $('sendNext').onclick=()=>openNextMail(true);
}
function openNextMail(fromPending){
  if(!pendingMails.length)return;
  const m=pendingMails.shift();
  window.__lastMailto=mailtoUrl(m.subject,m.body);
  $('sendBtn').dataset.mailto=window.__lastMailto;
  save('den_pending_mails',pendingMails);
  location.href=window.__lastMailto;
  if(!pendingMails.length){takeSnapshot();save('den_pending_mails',[]);toast('Odešli e-mail v poště')}
  else toast('Odešli e-mail, pak pošli zbývající část');
  renderPendingMail();
}
function startSend(){
  if(collectTodayExpense()==='bad'){toast('Doplň výdaj: za co a částku');return}
  if(!saveTodayAttendance()&&collectTodayExpense()==='bad')return;
  const p=collectChanges();
  if(!hasChanges(p)){toast('Není co odeslat');return}
  const mails=splitPayload(p);
  pendingMails=mails.map((m,i)=>({subject:m.subject,body:m.body,_total:mails.length}));
  openNextMail(false);
}
$('sendBtn').onclick=startSend;

/* ---------- Init ---------- */
(function initForm(){
  const d=load('den_draft',null);
  const existing=findDay(todayISO());
  if(existing)fillTodayForm(existing);
  else if(d){
    $('from1').value=d.from1||'';$('to1').value=d.to1||'';
    if(d.span2){setSpan2(true);$('from2').value=d.from2||'';$('to2').value=d.to2||''}
    $('lunch').checked=d.lunch!==false;$('nonbill').checked=!!d.nonbill;
    $('work').value=d.work||'';$('expWhat').value=d.expWhat||'';$('expCzk').value=d.expCzk||'';
  }
  if(d&&d.notes)$('dayNotes').value=d.notes;
  pendingMails=load('den_pending_mails',[])||[];
  updateTotal();
})();
if(!load('den_snap',null)&&(tasks.length||days.length))takeSnapshot();
renderDnes();
handleHashImport();
function setupSW(){
  if(!('serviceWorker' in navigator))return;
  if(navigator.serviceWorker.controller){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(setupSW._reloading)return;setupSW._reloading=true;location.reload();
    });
  }
  const ping=reg=>{try{reg.update()}catch(e){}};
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
    ping(reg);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ping(reg)});
    window.addEventListener('focus',()=>ping(reg));
    window.addEventListener('pageshow',()=>ping(reg));
  }).catch(()=>{});
}
setupSW();
})();
