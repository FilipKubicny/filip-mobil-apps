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
const REPEATS=[{id:'',name:'Neopakuje se',short:'Neopakuje se'},{id:'daily',name:'Denně',short:'Denně'},{id:'weekly',name:'Týdně',short:'Týdně'},{id:'monthly',name:'Měsíčně',short:'Měsíčně'},{id:'workdays',name:'Pracovní dny',short:'Pracovní dny'}];
const APP_VERSION=8;
const CAT_REPAIR={'432daf02':'sva','7e50a6ef':'sva','97d85896':'sva','c47f2c69':'zam','59a4c2fe':'zam','b39cb988':'sva','727076df':'sva','83367aa7':'fre','6a18e6c6':'fre','79486842':'fre','83549cb7':'lin','3ef16c57':'ost','6443a152':'ost','738ca1f6':'fre','66c017e9':'zam','a1b882a7':'zam','249f1330':'zam','9c9d5258':'zam','354dbdf3':'zam','b9e025f0':'pul','4185f791':'pul','fbe7d7cd':'pul','aab0cba9':'sva','c6bfbc8d':'sva','4aeb6c08':'sva','a3d38c38':'sva','6e49be28':'ost','5b60e232':'ost','ee532219':'lin','deafdb98':'lin','527a770f':'inv','f19d2292':'inv','f2e4f1b8':'sva','875b1851':'fre','c0e70d5':'inv','802e913d':'ost'};
function textKey(s){return String(s||'').trim().toLowerCase().replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\s+/g,' ')}
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
const CAT_COLORS=['#bd0926','#4a8019','#c2410c','#1d4ed8','#7c3aed','#dc2626','#047857','#b45309','#db2777','#475569'];
function slugifyCat(name){
  const map={'á':'a','ä':'a','č':'c','ď':'d','é':'e','ě':'e','í':'i','ň':'n','ó':'o','ö':'o','ř':'r','š':'s','ť':'t','ú':'u','ů':'u','ü':'u','ý':'y','ž':'z'};
  let s=String(name||'').trim().toLowerCase();
  s=s.replace(/[áäčďéěíňóöřšťúůüýž]/g,ch=>map[ch]||ch);
  s=s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  s=s.replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,20);
  return s||('x'+Math.random().toString(36).slice(2,6));
}
function newCatId(name){
  const base='u_'+slugifyCat(name);
  const used=new Set(allCats().map(c=>c.id));
  let id=base,i=2;
  while(used.has(id))id=base+'_'+(i++);
  return id;
}
function allCats(){return CATS.concat(customCats)}
function isBuiltinCat(id){return CATS.some(c=>c.id===id)}
function persistCats(){save('den_categories',customCats.map(c=>({id:c.id,name:c.name,color:c.color})))}
function loadCustomCats(){
  const raw=load('den_categories',[]);
  if(!Array.isArray(raw))return [];
  return raw.map(normalizeCategory).filter(Boolean).filter(c=>!isBuiltinCat(c.id));
}
function normalizeCategory(raw){
  if(!raw||typeof raw!=='object')return null;
  let name=String(raw.name||raw.n||raw.short||'').trim().slice(0,24);
  let id=String(raw.id||'').trim();
  let color=String(raw.color||raw.col||'').trim();
  if(!id&&!name)return null;
  if(!name)name=id.replace(/^u_/,'').replace(/_/g,' ').slice(0,24)||id;
  if(!id)id=newCatId(name);
  if(isBuiltinCat(id))return null;
  if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color))color='#475569';
  return{id,name,short:name,color};
}
function upsertCustomCat(cat){
  const c=normalizeCategory(cat);if(!c)return false;
  const i=customCats.findIndex(x=>x.id===c.id||x.name.toLowerCase()===c.name.toLowerCase());
  if(i>=0){
    const keep=customCats[i].id;
    customCats[i]={id:keep,name:c.name,short:c.name,color:c.color||customCats[i].color};
    persistCats();
    return customCats[i].id;
  }
  customCats.push(c);persistCats();
  return c.id;
}
function ingestCategories(list){
  let n=0;
  (list||[]).forEach(raw=>{if(upsertCustomCat(raw))n++});
  return n;
}
function adoptUnknownCat(v,raw){
  const name=String((raw&&(raw.catName||raw.categoryName||raw.cat_name))||(/^u_/.test(v)?v.slice(2).replace(/_/g,' '):v)).trim().slice(0,24)||v;
  const color=(raw&&(raw.catColor||raw.color))||'#475569';
  if(/^u_/.test(v))return upsertCustomCat({id:v,name,color})||v;
  return upsertCustomCat({name,color})||'ost';
}
function catId(raw){
  const v=String((raw&&(raw.cat||raw.category||raw.c||raw.kat))||'').trim();
  if(!v)return 'ost';
  if(allCats().some(c=>c.id===v))return v;
  const low=v.toLowerCase();
  const byName=allCats().find(c=>c.name.toLowerCase()===low||(c.short||'').toLowerCase()===low);
  if(byName)return byName.id;
  const aliases={'zámečnická':'zam','zámečnická hala':'zam','zamecnicka':'zam','půlkulatá':'pul','půlkulatá hala':'pul','pulkulata':'pul','nová linka a ohýbačka':'lin','nova linka':'lin','linka':'lin','ohýbačka':'lin','ohybacka':'lin','svařovna':'sva','svarovna':'sva','fréza':'fre','freza':'fre','investice':'inv','ostatní':'ost','ostatni':'ost'};
  if(aliases[low])return aliases[low];
  return adoptUnknownCat(v,raw);
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
const save=(k,v)=>{
  try{localStorage.setItem(k,JSON.stringify(v));return true}
  catch(e){
    const el=$('storageWarn');if(el)el.hidden=false;
    toast('Paměť je plná, data se neuložila. Uděláš zálohu v Nastavení.');
    return false;
  }
};
const uid=p=>(p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const catBy=id=>allCats().find(c=>c.id===id)||CATS[CATS.length-1];
const buckBy=id=>BUCKETS.find(b=>b.id===id)||BUCKETS[1];
const stBy=id=>STATUSES.find(s=>s.id===id)||STATUSES[0];
function toast(t,action){
  const e=$('toast');if(!e)return;
  e.innerHTML='';
  const span=document.createElement('span');span.textContent=t;e.appendChild(span);
  e.classList.toggle('has-act',!!(action&&action.label&&action.fn));
  if(action&&action.label&&action.fn){
    const b=document.createElement('button');b.type='button';b.className='toast-act';b.textContent=action.label;
    b.onclick=ev=>{ev.stopPropagation();e.classList.remove('show','has-act');action.fn()};
    e.appendChild(b);
  }
  e.classList.add('show');clearTimeout(toast._t);
  toast._t=setTimeout(()=>e.classList.remove('show','has-act'),action?6000:2500);
}

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
function isWorkday(iso){return !isWeekend(iso)&&!holidayName(iso)}
function nextWorkday(iso){let d=addDays(iso,1);while(!isWorkday(d))d=addDays(d,1);return d}
function addMonthsISO(iso,n){const d=parseISO(iso),day=d.getDate();d.setMonth(d.getMonth()+n);if(d.getDate()!==day)d.setDate(0);return toISO(d)}
function nextDue(due,repeat){if(!due||!repeat)return '';if(repeat==='daily')return addDays(due,1);if(repeat==='weekly')return addDays(due,7);if(repeat==='monthly')return addMonthsISO(due,1);if(repeat==='workdays')return nextWorkday(due);return ''}
function isOverdue(t){return t&&t.status!=='done'&&!!t.due&&t.due<todayISO()}
function isDueToday(t){return t&&t.status!=='done'&&!!t.due&&t.due===todayISO()}
function isDueSoon(t){return isOverdue(t)||isDueToday(t)}
function sortDue(arr){return arr.sort((a,b)=>{const ao=isOverdue(a)?0:1,bo=isOverdue(b)?0:1;return ao-bo||String(a.due||'').localeCompare(String(b.due||''))||String(a.text).localeCompare(String(b.text),'cs')})}
function dueLabel(t){if(!t||!t.due)return '';if(isOverdue(t))return 'po termínu · '+czDateSp(t.due);if(isDueToday(t))return 'dnes';return 'do '+czDateSp(t.due)}
function repeatLabel(id){const r=REPEATS.find(x=>x.id===id);return r?r.name:''}
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
  const from=raw.from||raw.src||'';
  const due=toISOdate(raw.due||raw.term||'');
  const rep=String(raw.repeat||raw.r||'');
  const repeat=REPEATS.some(r=>r.id&&r.id===rep)?rep:'';
  return{id:String(raw.id||uid('t')),text,cat,bucket,note:String(raw.note||raw.n||'').trim(),status,created,doneAt,prevStatus:raw.prevStatus||'open',updated:raw.updated||Date.now(),from:from==='bot'||from==='isbot'||from==='IS BOT'?'bot':from,due,repeat};
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
const TAG_SEF='Od šéfa';
function nowStamp(){
  const d=new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}
function stampToDisplay(at){
  if(!at)return '';
  const [d,tm]=String(at).split('T');
  return czDateSp(d)+(tm?' v '+tm.slice(0,5):'');
}
function normalizeNote(raw){
  if(!raw||typeof raw!=='object')return null;
  const text=String(raw.text||raw.t||raw.note||'').trim();if(!text)return null;
  let tag=raw.tag||raw.g||'';
  if(tag===true||tag==='sef'||tag===1)tag=TAG_SEF;
  tag=String(tag||'').trim();
  if(/^od šéfa$/i.test(tag)||/^od sefa$/i.test(tag))tag=TAG_SEF;
  let at=raw.at||raw.when||raw.created||'';
  at=String(at).replace(' ','T').slice(0,16);
  if(/^\d{4}-\d{2}-\d{2}$/.test(at))at+='T09:00';
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(at))at=nowStamp();
  return{id:String(raw.id||uid('n')),text,tag,at,updated:String(raw.updated||at).slice(0,16)};
}
function isIOS(){
  const ua=navigator.userAgent||'';
  return /iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function speechAvailable(){
  if(isIOS())return false;
  return !!(window.SpeechRecognition||window.webkitSpeechRecognition);
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
  out.notes=load('den_notes',[]);
  if(!Array.isArray(out.notes)) out.notes=[];
  return out;
}
let customCats=[];
const boot=migrateOld();
customCats=loadCustomCats();
let tasks=(boot.tasks||[]).map(normalizeTask).filter(Boolean);
let days=(boot.days||[]).map(normalizeDay).filter(Boolean);
let expenses=(boot.expenses||[]).map(normalizeExp).filter(Boolean);
let invoices=(boot.invoices||[]).map(normalizeExp).filter(Boolean);
let reminders=(boot.reminders||[]).map(normalizeRem).filter(Boolean);
let notes=(boot.notes||[]).map(normalizeNote).filter(Boolean);
let settings=Object.assign(defaultSettings(),boot.settings||{});
const persist=()=>{save('den_tasks',tasks);save('den_days',days);save('den_expenses',expenses);save('den_invoices',invoices);save('den_reminders',reminders);save('den_notes',notes);save('den_settings',settings);persistCats()};
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

let catEditFromSettings=false;
let view='dnes', taskTab='all', taskFilter='all', taskDoneOpen=true, monthYM=todayISO().slice(0,7);
let sheetMode=null, sheetTarget=null, quickBucket='tomorrow', pendingMails=[];
window.__lastMailto='';

function searchActive(){return !!(($('searchQ')&&$('searchQ').value||'').trim())}
function refreshLists(){
  if(searchActive()){renderSearch();return}
  if(view==='dnes')renderDnes();
  if(view==='ukoly')renderTasks();
  if(view==='dochazka')renderDochazka();
  if(view==='rems')renderRems();
  if(view==='notes')renderNotes();
}
function setView(v){
  view=v;
  document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  if(searchActive()){renderSearch();return}
  ['dnes','ukoly','dochazka','rems','notes'].forEach(id=>$('view-'+id).hidden=v!==id);
  if(v==='dnes')renderDnes();
  if(v==='ukoly')renderTasks();
  if(v==='dochazka')renderDochazka();
  if(v==='rems')renderRems();
  if(v==='notes')renderNotes();
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
  const before={status:t.status,prevStatus:t.prevStatus,doneAt:t.doneAt,updated:t.updated};
  const idx=tasks.indexOf(t);
  let spawned=null;
  if(t.status==='done'){
    t.status=t.prevStatus&&t.prevStatus!=='done'?t.prevStatus:'open';t.doneAt='';t.updated=Date.now();
    persist();refreshLists();
    toast('Vráceno mezi otevřené',{label:'Zpět',fn:()=>{Object.assign(t,before);persist();refreshLists()}});
    return;
  }
  t.prevStatus=t.status;t.status='done';t.doneAt=todayISO();t.updated=Date.now();
  if(t.repeat){
    const nd=nextDue(t.due||todayISO(),t.repeat);
    if(nd){
      spawned=normalizeTask({id:uid('t'),text:t.text,cat:t.cat,bucket:t.bucket,note:t.note,status:'open',due:nd,repeat:t.repeat,created:todayISO()});
      tasks.splice(idx>=0?idx+1:tasks.length,0,spawned);
    }
  }
  persist();refreshLists();
  const msg=spawned?('Hotovo, další termín '+czDateSp(spawned.due)):'Hotovo';
  toast(msg,{label:'Zpět',fn:()=>{Object.assign(t,before);if(spawned)tasks=tasks.filter(x=>x!==spawned);persist();refreshLists()}});
}
function taskCard(t,opts){
  const c=catBy(t.cat),st=stBy(t.status);
  const d=document.createElement('div');
  d.className='task'+(t.status==='done'?' done':'')+(isOverdue(t)?' overdue':'');
  d.style.setProperty('--cat',c.color);
  d.innerHTML='<button type="button" class="chk'+(t.status==='done'?' on':'')+'" aria-label="Hotovo">'+(t.status==='done'?'✓':'')+'</button>'+
    '<div class="body"><div class="ttext">'+esc(t.text)+'</div>'+(t.note?'<div class="tnote">'+esc(t.note)+'</div>':'')+
    '<div class="tmeta"><span class="pill"><span class="dot" style="background:'+c.color+'"></span>'+esc(c.name)+'</span>'+
    '<span class="pill '+esc(t.status)+'">'+esc(st.name)+'</span>'+
    (t.due?'<span class="pill '+(isOverdue(t)?'overdue':isDueToday(t)?'due':'')+'">'+esc(dueLabel(t))+'</span>':'')+
    (t.repeat?'<span class="pill">'+esc(repeatLabel(t.repeat))+'</span>':'')+
    (t.from==='bot'?'<span class="pill bot">od IS BOTa</span>':'')+'</div></div>';
  d.querySelector('.chk').onclick=ev=>{ev.stopPropagation();ev.currentTarget.classList.add('flash');toggleDone(t)};
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
  [{id:'all',name:'Vše',short:'Vše',color:null}].concat(allCats()).forEach(c=>{
    const btn=document.createElement('button');btn.type='button';btn.className='fchip'+(taskFilter===c.id?' on':'');
    if(c.color)btn.style.setProperty('--cat',c.color);
    btn.innerHTML=(c.color?'<span class="dot"></span>':'')+esc(c.short||c.name);
    btn.onclick=()=>{if(btn._held){btn._held=false;return}taskFilter=c.id;renderTasks()};
    if(c.id&&c.id.startsWith('u_'))bindCatLongPress(btn,c.id);
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
  const dueNow=sortDue(tasks.filter(t=>matchesCat(t)&&isDueSoon(t)));
  const dueIds=new Set(dueNow.map(t=>t.id));
  if(dueNow.length&&(taskTab==='all'||taskTab!=='done')){
    const show=taskTab==='all'?dueNow:dueNow.filter(t=>t.bucket===taskTab);
    if(show.length){
      const h=document.createElement('h2');h.className='task-sec';h.id='dueSection';h.textContent='Dnes / po termínu';
      list.appendChild(h);
      show.forEach(t=>list.appendChild(taskCard(t)));
    }
  }
  if(taskTab==='all'){
    let shown=dueNow.length;
    BUCKETS.forEach(b=>{
      const group=sortTasks(tasks.filter(t=>matchesCat(t)&&t.status!=='done'&&t.bucket===b.id&&!dueIds.has(t.id)));
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
  const items=visibleTasks().filter(t=>taskTab==='done'||!isDueSoon(t));
  if(!items.length&&!list.children.length){
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
function bindCatLongPress(btn,id){
  let tm=null;
  const start=()=>{tm=setTimeout(()=>{btn._held=true;catEditFromSettings=false;openCatEditor(customCats.find(c=>c.id===id));},550)};
  const cancel=()=>{if(tm)clearTimeout(tm);tm=null};
  btn.addEventListener('pointerdown',start);
  btn.addEventListener('pointerup',cancel);
  btn.addEventListener('pointerleave',cancel);
  btn.addEventListener('pointercancel',cancel);
}
function paintSwatches(el,value,onpick){
  el.innerHTML='';
  CAT_COLORS.forEach(col=>{
    const b=document.createElement('button');b.type='button';b.className='swatch'+(col.toLowerCase()===String(value||'').toLowerCase()?' on':'');
    b.style.background=col;b.setAttribute('aria-label',col);
    b.onclick=()=>onpick(col);
    el.appendChild(b);
  });
}
function mountNewCatForm(host,onCreated){
  const old=$('newCatBox');if(old){old.remove();if(old.parentNode===host)return}
  const box=document.createElement('div');box.id='newCatBox';box.className='new-cat-box';
  box.innerHTML='<div class="field"><label for="newCatName">Název kategorie</label><input type="text" id="newCatName" maxlength="24" placeholder="např. Urgent!!"></div>'+
    '<div class="field"><span class="lbl">Barva</span><div class="swatches" id="newCatColors"></div></div>'+
    '<button type="button" class="secondary" id="newCatSave">Vytvořit</button>';
  host.appendChild(box);
  let color=CAT_COLORS[0];
  const paint=()=>paintSwatches($('newCatColors'),color,c=>{color=c;paint()});
  paint();
  $('newCatSave').onclick=()=>{
    const name=($('newCatName').value||'').trim();
    if(!name){toast('Napiš název kategorie');return}
    const exist=allCats().find(c=>c.name.toLowerCase()===name.toLowerCase()||(c.short||'').toLowerCase()===name.toLowerCase());
    if(exist){box.remove();onCreated(exist.id);toast('Kategorie už existuje, vybral jsem ji');return}
    const id=upsertCustomCat({name,color});
    box.remove();onCreated(id);toast('Kategorie vytvořena');
  };
  setTimeout(()=>$('newCatName')&&$('newCatName').focus(),40);
}
function paintCatPicker(el,value,onpick){
  paintChips(el,allCats(),value,true,onpick);
  const add=document.createElement('button');add.type='button';add.className='chip add-cat';add.id='addCatChip';
  add.textContent='+ Nová kategorie';
  add.onclick=()=>mountNewCatForm(el.parentNode,id=>onpick(id));
  el.appendChild(add);
}
function openTaskSheet(task){
  sheetMode='task';sheetTarget=task||null;
  const draft=task?{text:task.text,cat:task.cat,bucket:task.bucket,status:task.status,note:task.note||'',due:task.due||'',repeat:task.repeat||''}:{text:'',cat:'ost',bucket:view==='ukoly'&&taskTab!=='done'&&taskTab!=='all'?taskTab:'tomorrow',status:'open',note:'',due:'',repeat:''};
  $('sheetTitle').textContent=task?'Upravit úkol':'Nový úkol';
  $('sheetDelete').hidden=!task;
  $('sheetBody').innerHTML='<div class="field"><label for="fText">Úkol</label><textarea id="fText" rows="3" placeholder="Co je potřeba udělat">'+esc(draft.text)+'</textarea></div>'+
    '<div class="field"><span class="lbl">Kategorie</span><div class="chips" id="fCat"></div></div>'+
    '<div class="field"><span class="lbl">Období</span><div class="chips" id="fBucket"></div></div>'+
    '<div class="field"><span class="lbl">Stav</span><div class="chips" id="fStatus"></div></div>'+
    '<div class="field"><label for="fDue">Termín</label><input type="date" id="fDue" value="'+esc(draft.due||'')+'"></div>'+
    '<div class="field"><span class="lbl">Opakování</span><div class="chips" id="fRepeat"></div></div>'+
    '<div class="field"><label for="fNote">Poznámka</label><textarea id="fNote" rows="2" placeholder="Volitelná poznámka">'+esc(draft.note)+'</textarea></div>';
  const redraw=()=>{paintCatPicker($('fCat'),draft.cat,id=>{draft.cat=id;redraw()});paintChips($('fBucket'),BUCKETS,draft.bucket,false,id=>{draft.bucket=id;redraw()});paintChips($('fStatus'),STATUSES,draft.status,false,id=>{draft.status=id;redraw()});paintChips($('fRepeat'),REPEATS,draft.repeat,false,id=>{draft.repeat=id;redraw()})};
  redraw();
  $('overlay').dataset.draft=JSON.stringify(draft);
  $('overlay')._draft=draft;
  $('overlay').hidden=false;document.body.classList.add('locked');
  setTimeout(()=>$('fText')&&$('fText').focus(),50);
}
function closeSheet(){$('overlay').hidden=true;if($('importOverlay').hidden)document.body.classList.remove('locked');sheetMode=null;sheetTarget=null;if($('sheetDelete'))$('sheetDelete').textContent='Smazat'}
$('addTaskBtn').onclick=()=>openTaskSheet(null);
$('sheetCancel').onclick=closeSheet;
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('importOverlay').hidden)closeImportSheet();else if(!$('overlay').hidden)closeSheet()}});
$('sheetSave').onclick=()=>{
  if(sheetMode==='settings'){
    const b=$('sBilled').value,s=$('sSpecial').value,r=Number($('sRate').value);
    if(!b||!s||!isFinite(r)||r<0){toast('Zkontroluj nastavení');return}
    settings.billedUntil=b;settings.specialEnd=s;settings.rate=r;persist();
    const key=($('sInboxKey')&&$('sInboxKey').value)||'';
    setInboxKeyRaw(key);
    closeSheet();if(view==='dochazka')renderDochazka();updateTotal();toast('Nastavení uloženo');
    pollInbox('force');
    return;
  }
  if(sheetMode==='cat-edit'){
    const draft=$('overlay')._draft||{};
    const name=(($('editCatName')&&$('editCatName').value)||draft.name||'').trim();
    if(!name){toast('Napiš název kategorie');return}
    const cat=sheetTarget;if(!cat)return;
    const clash=allCats().find(c=>c.id!==cat.id&&c.name.toLowerCase()===name.toLowerCase());
    if(clash){toast('Taková kategorie už existuje');return}
    cat.name=name;cat.short=name;cat.color=draft.color||cat.color;
    persist();closeSheet();renderTasks();renderDnes();if(catEditFromSettings)openSettings();toast('Kategorie uložena');
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
  if(sheetMode==='note-task'){
    const draft=$('overlay')._draft||{};
    const bucket=draft.bucket||'tomorrow';
    const text=(draft.text||'').trim();if(!text){toast('Napiš úkol');return}
    const note=draft.tag?draft.tag:'';
    tasks.push(normalizeTask({id:uid('t'),text,cat:draft.cat||'ost',bucket,status:'open',note,created:todayISO()}));
    persist();closeSheet();renderTasks();renderDnes();renderNotes();toast('Úkol přidán');
    return;
  }
  if(sheetMode==='note-rem'){
    const text=($('nrText').value||'').trim();
    const date=$('nrDate').value,time=$('nrTime').value;
    if(!text){toast('Napiš připomínku');return}
    if(!date){toast('Vyber den');return}
    const when=date+'T'+(time||'09:00').slice(0,5);
    reminders.push(normalizeRem({id:uid('r'),text,when,done:false,created:todayISO()}));
    persist();closeSheet();renderDnes();renderRems();renderNotes();toast('Připomínka přidána');
    return;
  }
  if(sheetMode!=='task')return;
  const draft=$('overlay')._draft||{};
  const text=($('fText').value||'').trim(),note=($('fNote').value||'').trim();
  if(!text){toast('Napiš úkol');return}
  draft.cat=draft.cat||'ost';draft.bucket=draft.bucket||'weeks';draft.status=draft.status||'open';
  draft.due=($('fDue')&&$('fDue').value)||'';
  if(sheetTarget){
    const t=sheetTarget;
    const prev={text:t.text,cat:t.cat,bucket:t.bucket,status:t.status,note:t.note,due:t.due||'',repeat:t.repeat||'',doneAt:t.doneAt,prevStatus:t.prevStatus,updated:t.updated};
    if(t.status!=='done'&&draft.status==='done'){t.prevStatus=t.status;t.doneAt=todayISO()}
    if(t.status==='done'&&draft.status!=='done')t.doneAt='';
    t.text=text;t.cat=draft.cat;t.bucket=draft.bucket;t.status=draft.status;t.note=note;t.due=draft.due||'';t.repeat=draft.repeat||'';t.updated=Date.now();
    const moved=prev.bucket!==t.bucket;
    toast(moved?('Přesunuto do „'+buckBy(t.bucket).name+'“'):'Úkol uložen',{label:'Zpět',fn:()=>{Object.assign(t,prev);persist();refreshLists()}});
  }else{
    tasks.push(normalizeTask({id:uid('t'),text,cat:draft.cat,bucket:draft.bucket,status:draft.status,note,due:draft.due,repeat:draft.repeat||'',created:todayISO()}));
    toast('Úkol přidán');
  }
  persist();closeSheet();refreshLists();
};
$('sheetDelete').onclick=()=>{
  if(sheetMode==='cat-edit'&&sheetTarget){deleteCustomCat(sheetTarget);return}
  if(sheetMode==='task'&&sheetTarget){
    const target=sheetTarget,i=tasks.indexOf(target),copy=JSON.parse(JSON.stringify(target));
    tasks=tasks.filter(t=>t!==target);persist();closeSheet();refreshLists();
    toast('Úkol smazán',{label:'Zpět',fn:()=>{const n=normalizeTask(copy);if(n)tasks.splice(Math.min(Math.max(i,0),tasks.length),0,n);persist();refreshLists()}});
  }
};

/* ---------- Dnes task + reminder quick UI ---------- */
function todayTaskList(){
  const open=tasks.filter(t=>t.status!=='done');
  const due=sortDue(open.filter(isDueSoon));
  const dueIds=new Set(due.map(t=>t.id));
  const soon=open.filter(t=>!dueIds.has(t.id)&&(t.bucket==='tomorrow'||t.status==='wip'));
  const rest=soon.length?soon:open.filter(t=>!dueIds.has(t.id)).slice(0,8);
  const box=$('todayTasks');box.innerHTML='';
  if(!due.length&&!rest.length){box.innerHTML='<p class="muted" style="margin:0">Žádné otevřené úkoly na teď.</p>';return}
  if(due.length){
    const h=document.createElement('h2');h.className='task-sec';h.textContent='Dnes / po termínu';
    box.appendChild(h);
    due.forEach(t=>box.appendChild(taskCard(t)));
  }
  rest.forEach(t=>box.appendChild(taskCard(t)));
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

let noteEditId=null, rec=null, recOn=false, recBase='';
function saveNoteDraft(){
  if(!$('noteText'))return;
  save('den_note_draft',{text:$('noteText').value,tag:!!$('noteTag').checked,edit:noteEditId||''});
}
function restoreNoteDraft(){
  const d=load('den_note_draft',null);if(!d||!$('noteText'))return;
  $('noteText').value=d.text||'';
  $('noteTag').checked=!!d.tag;
  noteEditId=d.edit||null;
  if($('noteCancelEdit'))$('noteCancelEdit').hidden=!noteEditId;
  if(noteEditId)$('noteSave').textContent='Uložit úpravu';
}
function clearNoteComposer(){
  noteEditId=null;
  $('noteText').value='';
  $('noteTag').checked=false;
  $('noteSave').textContent='Uložit';
  if($('noteCancelEdit'))$('noteCancelEdit').hidden=true;
  save('den_note_draft',{text:'',tag:false,edit:''});
}
function setDictHint(s){if($('dictHint'))$('dictHint').textContent=s||''}
function stopDictation(){
  recOn=false;
  try{if(rec)rec.stop()}catch(e){}
  rec=null;
  const b=$('dictBtn');if(b){b.classList.remove('live');b.textContent='Diktovat'}
}
function startDictation(){
  if(recOn){stopDictation();return}
  if(!speechAvailable()){
    setDictHint('klepni na mikrofon na klávesnici a diktuj');
    const ta=$('noteText');ta.focus();ta.scrollIntoView({block:'center'});
    return;
  }
  const C=window.SpeechRecognition||window.webkitSpeechRecognition;
  try{rec=new C()}catch(e){setDictHint('klepni na mikrofon na klávesnici a diktuj');$('noteText').focus();return}
  rec.lang='cs-CZ';
  rec.interimResults=true;
  try{rec.continuous=true}catch(e){}
  recBase=$('noteText').value||'';
  if(recBase&&!/\s$/.test(recBase))recBase+=' ';
  rec.onresult=e=>{
    let fin='', interim='';
    for(let i=0;i<e.results.length;i++){
      const x=e.results[i][0].transcript;
      if(e.results[i].isFinal)fin+=x+(/\s$/.test(x)?'':' ');
      else interim+=x;
    }
    $('noteText').value=(recBase+fin+interim).replace(/\s+$/,(interim?'':''));
    if(!interim)recBase=$('noteText').value+(( $('noteText').value && !/\s$/.test($('noteText').value))?' ':'');
    saveNoteDraft();
  };
  rec.onerror=ev=>{
    const err=String(ev&&ev.error||'');
    if(/not-allowed|service-not-allowed|network|audio-capture/.test(err) || !speechAvailable()){
      stopDictation();
      setDictHint('klepni na mikrofon na klávesnici a diktuj');
      $('noteText').focus();
    }
  };
  rec.onend=()=>{
    if(recOn){try{rec.start()}catch(e){stopDictation()}}
  };
  try{rec.start()}catch(e){stopDictation();setDictHint('klepni na mikrofon na klávesnici a diktuj');$('noteText').focus();return}
  recOn=true;
  $('dictBtn').classList.add('live');
  $('dictBtn').textContent='Stop';
  setDictHint('Mluv. Klepni na Stop, až budeš hotový.');
}
function sortedNotes(){return notes.slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))||String(b.id).localeCompare(String(a.id)))}
function startEditNote(n){
  stopDictation();
  noteEditId=n.id;
  $('noteText').value=n.text;
  $('noteTag').checked=n.tag===TAG_SEF;
  $('noteSave').textContent='Uložit úpravu';
  $('noteCancelEdit').hidden=false;
  saveNoteDraft();
  setView('notes');
  $('noteText').focus();
  $('noteText').scrollIntoView({block:'center'});
}
function saveNoteFromComposer(){
  const text=($('noteText').value||'').trim();
  if(!text){toast('Napiš nebo nadiktuj poznámku');return}
  const tag=$('noteTag').checked?TAG_SEF:'';
  if(noteEditId){
    const n=notes.find(x=>x.id===noteEditId);
    if(n){n.text=text;n.tag=tag;n.updated=nowStamp()}
    toast('Poznámka upravena');
  }else{
    notes.push(normalizeNote({id:uid('n'),text,tag,at:nowStamp()}));
    toast('Poznámka uložena');
  }
  clearNoteComposer();
  persist();
  renderNotes();renderDnes();
}
function deleteNote(n){
  const i=notes.indexOf(n),copy=JSON.parse(JSON.stringify(n));
  notes=notes.filter(x=>x!==n);
  if(noteEditId===n.id)clearNoteComposer();
  persist();refreshLists();
  toast('Poznámka smazána',{label:'Zpět',fn:()=>{notes.splice(Math.min(Math.max(i,0),notes.length),0,normalizeNote(copy));persist();refreshLists()}});
}
function openNoteTaskSheet(n){
  sheetMode='note-task';sheetTarget=n;
  const draft={text:n.text,tag:n.tag||'',bucket:'tomorrow',cat:'ost'};
  $('sheetTitle').textContent='Udělat z toho úkol';
  $('sheetDelete').hidden=true;
  $('sheetBody').innerHTML='<p style="margin:0 0 12px">'+esc(n.text)+'</p>'+(n.tag?'<p class="muted">'+esc(n.tag)+'</p>':'')+
    '<div class="field"><span class="lbl">Kategorie</span><div class="chips" id="ntCat"></div></div>'+
    '<div class="field"><span class="lbl">Období</span><div class="chips" id="ntBucket"></div></div>';
  const redraw=()=>{paintCatPicker($('ntCat'),draft.cat,id=>{draft.cat=id;redraw()});paintChips($('ntBucket'),BUCKETS,draft.bucket,false,id=>{draft.bucket=id;redraw()})};
  redraw();
  $('overlay')._draft=draft;
  $('overlay').hidden=false;document.body.classList.add('locked');
}
function openNoteRemSheet(n){
  sheetMode='note-rem';sheetTarget=n;
  $('sheetTitle').textContent='Připomenout';
  $('sheetDelete').hidden=true;
  const date=addDays(todayISO(),1);
  $('sheetBody').innerHTML='<div class="field"><label for="nrText">Připomínka</label><textarea id="nrText" rows="3">'+esc(n.text)+'</textarea></div>'+
    '<div class="row field"><div><label for="nrDate">Den</label><input type="date" id="nrDate" value="'+esc(date)+'"></div>'+
    '<div><label for="nrTime">Čas</label><input type="time" id="nrTime" value="08:00"></div></div>'+
    '<div class="chips" id="nrChips"></div>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  remChipBar($('nrChips'),$('nrDate'),$('nrTime'));
}
function noteCard(n,compact){
  const d=document.createElement('div');d.className='note';
  d.innerHTML='<div class="ntime">'+esc(stampToDisplay(n.at))+(n.tag?' · '+esc(n.tag):'')+'</div>'+
    '<div class="ntext">'+esc(n.text)+'</div>'+
    (compact?'':'<div class="note-actions">'+
      '<button type="button" data-a="edit">Upravit</button>'+
      '<button type="button" data-a="task">Udělat z toho úkol</button>'+
      '<button type="button" data-a="rem">Připomenout</button>'+
      '<button type="button" class="danger" data-a="del">Smazat</button>'+
    '</div>');
  if(!compact){
    d.querySelector('[data-a="edit"]').onclick=()=>startEditNote(n);
    d.querySelector('[data-a="task"]').onclick=()=>openNoteTaskSheet(n);
    d.querySelector('[data-a="rem"]').onclick=()=>openNoteRemSheet(n);
    d.querySelector('[data-a="del"]').onclick=()=>deleteNote(n);
  }
  return d;
}
function renderNotes(){
  if(!speechAvailable())setDictHint('klepni na mikrofon na klávesnici a diktuj');
  else if(!recOn)setDictHint('');
  const list=$('noteList'),empty=$('noteEmpty');
  list.innerHTML='';
  const arr=sortedNotes();
  if(!arr.length){empty.hidden=false;return}
  empty.hidden=true;
  arr.forEach(n=>list.appendChild(noteCard(n,false)));
}
function renderTodayNotes(){
  const today=todayISO();
  const todays=sortedNotes().filter(n=>String(n.at||'').slice(0,10)===today);
  const unsynced=(function(){
    const snap=load('den_snap',null);
    const map=new Map((snap&&snap.poznamky||[]).map(x=>[x.id,x]));
    return notes.filter(n=>{const p=map.get(n.id);return !p||p.text!==n.text||(p.tag||'')!==(n.tag||'');}).length;
  })();
  const sum=$('todayNotesSum');
  if(!sum)return;
  const parts=[];
  const nToday=todays.length, word=nToday===1?'poznámka':nToday<5?'poznámky':'poznámek';
  parts.push(nToday?('Dnes '+nToday+' '+word):'Dnes žádná poznámka');
  if(notes.length)parts.push('celkem '+notes.length);
  if(unsynced)parts.push(unsynced+' k odeslání');
  sum.textContent=parts.join(' · ');
  const box=$('todayNotesList');box.innerHTML='';
  todays.slice(0,3).forEach(n=>box.appendChild(noteCard(n,true)));
}

function renderDnes(){
  const d=parseISO(todayISO());
  $('todayLabel').textContent=WD[d.getDay()]+' '+d.getDate()+'. '+(d.getMonth()+1)+'. '+d.getFullYear();
  const oc=$('onboardCard');
  if(oc){
    oc.hidden=!!settings.seenOnboard;
    const ok=$('onboardOk');
    if(ok)ok.onclick=()=>{settings.seenOnboard=true;persist();oc.hidden=true};
  }
  todayTaskList();
  renderQuickBucket();
  remChipBar($('remChips'),$('remDate'),$('remTime'));
  renderTodayRems();
  renderTodayNotes();
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

let inboxHint='', inboxBusy=false, lastInboxAt=0;
function setInboxHint(s){
  inboxHint=s||'';
  const line=$('inboxHintLine');
  if(line)line.textContent=inboxHint;
  else if(inboxHint&&$('sInboxKey')){
    const p=document.createElement('p');p.className='muted';p.id='inboxHintLine';p.textContent=inboxHint;
    const field=$('sInboxKey').closest('.field');
    if(field&&field.parentNode)field.after(p);
  }
}
function normalizeInboxKey(s){return String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'')}
function getInboxKeyRaw(){return String(load('den_inbox_key','')||'')}
function setInboxKeyRaw(v){save('den_inbox_key',String(v||'').trim())}
function getInboxKey(){return normalizeInboxKey(getInboxKeyRaw())}
function loadAppliedInbox(){const a=load('den_inbox_applied',[]);return Array.isArray(a)?a:[]}
function saveAppliedInbox(ids){save('den_inbox_applied',ids.slice(-400))}
function b64toBytes(s){
  const bin=atob(s);const u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  return u;
}
async function decryptInboxFile(obj,pass){
  const salt=b64toBytes(obj.salt),iv=b64toBytes(obj.iv),ct=b64toBytes(obj.ct);
  const enc=new TextEncoder();
  const material=await crypto.subtle.importKey('raw',enc.encode(normalizeInboxKey(pass)),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
  return JSON.parse(new TextDecoder().decode(pt));
}
function bytesToB64(u){
  const a=u instanceof Uint8Array?u:new Uint8Array(u);
  let s='';for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);
  return btoa(s);
}
async function encryptBackup(plain,pass){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const enc=new TextEncoder();
  const material=await crypto.subtle.importKey('raw',enc.encode(normalizeInboxKey(pass)),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify(plain)));
  return {kind:'den-backup',v:1,at:nowStamp(),salt:bytesToB64(salt),iv:bytesToB64(iv),ct:bytesToB64(new Uint8Array(ct))};
}
function dumpState(){
  return {
    kind:'den-state',v:1,app:APP_VERSION,at:nowStamp(),
    tasks,days,expenses,invoices,reminders,notes,settings,
    categories:customCats,applied:loadAppliedInbox(),
    draft:load('den_draft',null),note_draft:load('den_note_draft',null),
    snap:load('den_snap',null),pending_mails:load('den_pending_mails',[]),
    inbox_key:getInboxKeyRaw(),
    lock:load('den_lock',null)
  };
}
function applyFullState(data){
  if(!data||typeof data!=='object')throw new Error('empty');
  tasks=(data.tasks||[]).map(normalizeTask).filter(Boolean);
  days=(data.days||[]).map(normalizeDay).filter(Boolean);
  expenses=(data.expenses||[]).map(normalizeExp).filter(Boolean);
  invoices=(data.invoices||[]).map(normalizeExp).filter(Boolean);
  reminders=(data.reminders||[]).map(normalizeRem).filter(Boolean);
  notes=(data.notes||data.poznamky||[]).map(normalizeNote).filter(Boolean);
  settings=Object.assign(defaultSettings(),data.settings||{});
  if(Array.isArray(data.categories)||Array.isArray(data.kategorie)){
    customCats=(data.categories||data.kategorie||[]).map(normalizeCategory).filter(Boolean);
  }
  if(Array.isArray(data.applied))saveAppliedInbox(data.applied);
  if('draft' in (data||{}))save('den_draft',data.draft);
  if('note_draft' in (data||{}))save('den_note_draft',data.note_draft);
  if(data.snap)save('den_snap',data.snap);
  if(data.pending_mails)save('den_pending_mails',data.pending_mails);
  if(data.inbox_key)setInboxKeyRaw(data.inbox_key);
  if(data.lock&&typeof data.lock==='object')save('den_lock',data.lock);
  persist();
}
async function shareOrDownload(blob,filename,title){
  const file=new File([blob],filename,{type:blob.type||'application/octet-stream'});
  try{
    if(navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
      await navigator.share({files:[file],title:title||filename});
      return 'share';
    }
  }catch(e){if(e&&e.name==='AbortError')return 'abort'}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=filename;a.rel='noopener';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),2500);
  return 'download';
}
async function makeBackupBlob(){
  const key=getInboxKey();
  if(!key)return null;
  const enc=await encryptBackup(dumpState(),key);
  const name='den-zaloha-'+todayISO()+'.enc';
  const blob=new Blob([JSON.stringify(enc)],{type:'application/octet-stream'});
  return {blob,name,enc};
}
async function exportBackup(){
  if(!getInboxKey()){toast('Nejdřív zadej kód pro IS BOTa v Nastavení');return}
  try{
    const file=await makeBackupBlob();
    if(!file){toast('Zálohu nejde vytvořit');return}
    const r=await shareOrDownload(file.blob,file.name,'Den záloha');
    if(r!=='abort')toast(r==='share'?'Záloha je v nabídce Sdílet':'Šifrovaná záloha je stažená');
  }catch(e){toast('Zálohu se nepovedlo vytvořit')}
}
async function importBackupFile(file){
  if(!file)return;
  if(!getInboxKey()){toast('Nejdřív zadej kód pro IS BOTa v Nastavení');return}
  try{
    const obj=JSON.parse(await file.text());
    const data=await decryptInboxFile(obj,getInboxKey());
    if(!confirm('Obnovit data ze souboru? Stávající data v telefonu se nahradí.'))return;
    applyFullState(data);
    toast('Data obnovena ze zálohy');
    location.reload();
  }catch(e){toast('Soubor nejde otevřít. Zkontroluj kód a že je to záloha Den.')}
}
async function promptInboxRestore(encObj){
  if(!encObj||!encObj.salt||!encObj.iv||!encObj.ct){toast('Záloha od IS BOTa je neúplná');return}
  if(!getInboxKey()){toast('Pro obnovu ze zálohy zadej kód v Nastavení');return}
  if(!confirm('Obnovit všechna data ze zálohy od IS BOTa? Data v telefonu se nahradí.'))return;
  try{
    const data=await decryptInboxFile(encObj,getInboxKey());
    applyFullState(data);
    toast('Data obnovena ze zálohy');
    location.reload();
  }catch(e){toast('Zálohu se nepodařilo otevřít. Zkontroluj kód.')}
}
function findTaskMatch(id,text){
  if(id){const t=tasks.find(x=>x.id===String(id));if(t)return t}
  if(text){const k=String(text).trim().toLowerCase();return tasks.find(x=>x.text.trim().toLowerCase()===k)}
  return null;
}
function payloadFromPush(data){
  if(Array.isArray(data))data={tasks:data};
  if(!data||typeof data!=='object')data={};
  const noteSrc=Array.isArray(data.poznamky)?data.poznamky:(Array.isArray(data.notes)?data.notes:[]);
  ingestCategories(data.kategorie||data.categories||[]);
  return{
    kategorie:(data.kategorie||data.categories||[]).map(normalizeCategory).filter(Boolean),
    tasks:(data.tasks||[]).map(x=>normalizeTask(Object.assign({},x,{from:x.from||'bot'}))).filter(Boolean),
    days:(data.days||[]).map(x=>normalizeDay(Object.assign({imported:true},x))).filter(Boolean),
    expenses:(data.expenses||[]).map(normalizeExp).filter(Boolean),
    invoices:(data.invoices||data.invoiced||[]).map(normalizeExp).filter(Boolean),
    reminders:(data.reminders||data.pripominky||[]).map(normalizeRem).filter(Boolean),
    poznamky:noteSrc.map(normalizeNote).filter(Boolean),
    done:Array.isArray(data.done)?data.done:[],
    update:Array.isArray(data.update)?data.update:[],
    billedUntil:data.billedUntil,specialEnd:data.specialEnd,rate:data.rate
  };
}
function applyInboxPayload(raw){
  const p=payloadFromPush(raw||{});
  const n={tasks:0,reminders:0,poznamky:0,days:0,expenses:0,done:0,update:0,kategorie:0};
  n.kategorie=p.kategorie?p.kategorie.length:0;
  p.tasks.forEach(t=>{
    t.from='bot';
    const ex=findTaskMatch(t.id,t.text);
    if(ex){if(!ex.from)ex.from='bot'}
    else{tasks.push(t);n.tasks++}
  });
  p.update.forEach(rawU=>{
    const ex=findTaskMatch(rawU.id,rawU.text||rawU.t);
    if(!ex)return;
    const merged=normalizeTask(Object.assign({},ex,rawU,{id:ex.id,text:rawU.text||rawU.t||ex.text,from:ex.from||'bot'}));
    if(!merged)return;
    Object.assign(ex,merged,{id:ex.id});
    n.update++;
  });
  p.done.forEach(key=>{
    const k=String(key||'').trim();if(!k)return;
    const ex=findTaskMatch(k,k);
    if(ex&&ex.status!=='done'){ex.prevStatus=ex.status;ex.status='done';ex.doneAt=todayISO();ex.updated=Date.now();n.done++}
  });
  p.reminders.forEach(r=>{
    const i=reminders.findIndex(a=>a.id===r.id||(a.text===r.text&&a.when===r.when));
    if(i>=0)return;
    reminders.push(r);n.reminders++;
  });
  p.poznamky.forEach(note=>{
    const i=notes.findIndex(a=>a.id===note.id||(a.text===note.text&&a.at===note.at));
    if(i>=0)return;
    notes.push(note);n.poznamky++;
  });
  p.days.forEach(d=>{
    const ex=days.find(a=>a.date===d.date);
    if(ex)return;
    days.push(d);n.days++;
  });
  p.expenses.forEach(e=>{
    const ex=expenses.find(a=>a.date===e.date&&a.what===e.what);
    if(ex)return;
    expenses.push(e);n.expenses++;
  });
  if(p.billedUntil)settings.billedUntil=p.billedUntil;
  if(p.specialEnd)settings.specialEnd=p.specialEnd;
  if(p.rate)settings.rate=Number(p.rate);
  return n;
}
function inboxToast(n){
  const parts=[];
  const add=(c,one,few,many)=>{if(c)parts.push(c+' '+(c===1?one:c<5?few:many))};
  add(n.tasks,'úkol','úkoly','úkolů');
  add(n.reminders,'připomínku','připomínky','připomínek');
  add(n.poznamky,'poznámku','poznámky','poznámek');
  add(n.days,'den','dny','dní');
  add(n.expenses,'výdaj','výdaje','výdajů');
  add(n.done,'hotový úkol','hotové úkoly','hotových úkolů');
  add(n.update,'úpravu','úpravy','úprav');
  add(n.kategorie,'kategorii','kategorie','kategorií');
  if(!parts.length)return;
  toast('Nové od IS BOTa: '+parts.join(', '));
}
function sumCounts(a,b){
  const o={};Object.keys(a).concat(Object.keys(b)).forEach(k=>o[k]=(a[k]||0)+(b[k]||0));
  return o;
}
async function pollInbox(reason){
  const key=getInboxKey();
  if(!key)return;
  if(inboxBusy)return;
  if(reason!=='force'&&Date.now()-lastInboxAt<2000)return;
  inboxBusy=true;lastInboxAt=Date.now();
  try{
    const r=await fetch('inbox.enc?t='+Date.now(),{cache:'no-store'});
    if(!r.ok){setInboxHint('Inbox teď nejde načíst (síť).');return}
    const obj=await r.json();
    if(!obj||!obj.salt||!obj.iv||!obj.ct){setInboxHint('Inbox má neočekávaný tvar.');return}
    let box;
    try{box=await decryptInboxFile(obj,key)}
    catch(e){setInboxHint('Kód nesedí. Zkontroluj ho v Nastavení.');return}
    setInboxHint('');
    const seen=new Set(loadAppliedInbox());
    const fresh=(box.messages||[]).filter(m=>m&&m.id&&!seen.has(String(m.id)))
      .sort((a,b)=>String(a.ts||'').localeCompare(String(b.ts||'')));
    if(!fresh.length)return;
    let totals={tasks:0,reminders:0,poznamky:0,days:0,expenses:0,done:0,update:0,kategorie:0};
    let restoreObj=null;
    fresh.forEach(m=>{
      const pay=m.payload||{};
      if(pay.type==='restore'||pay.backup){
        restoreObj=pay.backup||pay;
        seen.add(String(m.id));
        return;
      }
      totals=sumCounts(totals,applyInboxPayload(pay));
      seen.add(String(m.id));
    });
    saveAppliedInbox([...seen]);
    persist();
    refreshLists();
    inboxToast(totals);
    if(restoreObj)await promptInboxRestore(restoreObj);
  }catch(e){
    setInboxHint('Inbox teď nejde načíst (síť).');
  }finally{
    inboxBusy=false;
  }
}

function openSettings(){
  sheetMode='settings';sheetTarget=null;
  $('sheetTitle').textContent='Nastavení';
  $('sheetDelete').hidden=true;
  $('sheetBody').innerHTML='<div class="field"><label for="sBilled">Vyfakturováno do (včetně)</label><input type="date" id="sBilled" value="'+esc(settings.billedUntil)+'"></div>'+
    '<div class="field"><label for="sSpecial">Konec přechodného období</label><input type="date" id="sSpecial" value="'+esc(settings.specialEnd)+'"><div class="muted">Teď 16. 10. – 30. 11. 2026, potom celé kalendářní měsíce.</div></div>'+
    '<div class="field"><label for="sRate">Hodinovka v Kč</label><input type="number" id="sRate" min="0" step="1" value="'+esc(settings.rate)+'"></div>'+
    '<div class="field"><label for="sInboxKey">Kód pro IS BOTa</label><input type="text" id="sInboxKey" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" value="'+esc(getInboxKeyRaw())+'"></div>'+
    (inboxHint?'<p class="muted" id="inboxHintLine">'+esc(inboxHint)+'</p>':'')+
    lockSettingsHtml()+
    '<div class="field"><span class="lbl">Kategorie</span><div class="cat-admin" id="catAdmin"></div></div>'+
    '<div class="field"><span class="lbl">Záloha</span><div class="muted">Šifrovaná stejným kódem jako inbox. Při odeslání IS BOTovi se záloha nabídne ke sdílení.</div></div>'+
    '<button type="button" class="secondary" id="backupExport">Stáhnout / sdílet zálohu</button>'+
    '<button type="button" class="secondary" id="backupImport">Obnovit ze souboru</button>'+
    '<p class="muted">Verze aplikace: '+APP_VERSION+'</p>'+
    '<button type="button" class="secondary" id="forceUpdate">Aktualizovat aplikaci</button>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  const fu=$('forceUpdate');if(fu)fu.onclick=forceRefreshApp;
  const be=$('backupExport');if(be)be.onclick=()=>exportBackup();
  const bi=$('backupImport');if(bi)bi.onclick=()=>{const f=$('backupFile');if(f)f.click()};
  const lt=$('lockToggle');if(lt)lt.onclick=()=>{toggleAppLock()};
  renderCatAdmin();
}
function renderCatAdmin(){
  const box=$('catAdmin');if(!box)return;
  box.innerHTML='';
  allCats().forEach(c=>{
    const row=document.createElement('div');row.className='cat-row'+(isBuiltinCat(c.id)?' locked':'');
    row.style.setProperty('--cat',c.color);
    row.innerHTML='<span class="dot"></span><span class="cn">'+esc(c.name)+'</span>'+(isBuiltinCat(c.id)?'<span class="muted">vestavěná</span>':'<button type="button" class="ghost-btn" data-edit="'+esc(c.id)+'">Upravit</button>');
    const ed=row.querySelector('[data-edit]');
    if(ed)ed.onclick=()=>{catEditFromSettings=true;openCatEditor(customCats.find(x=>x.id===c.id))};
    box.appendChild(row);
  });
  const add=document.createElement('button');add.type='button';add.className='chip add-cat';add.textContent='+ Nová kategorie';
  add.onclick=()=>mountNewCatForm(box,()=>{renderCatAdmin();if(view==='ukoly')renderTasks()});
  box.appendChild(add);
}
function openCatEditor(cat){
  if(!cat)return;
  sheetMode='cat-edit';sheetTarget=cat;
  const draft={name:cat.name,color:cat.color};
  $('sheetTitle').textContent='Upravit kategorii';
  $('sheetDelete').hidden=false;
  $('sheetDelete').textContent='Smazat';
  $('sheetBody').innerHTML='<div class="field"><label for="editCatName">Název</label><input type="text" id="editCatName" maxlength="24" value="'+esc(draft.name)+'"></div>'+
    '<div class="field"><span class="lbl">Barva</span><div class="swatches" id="editCatColors"></div></div>';
  const paint=()=>paintSwatches($('editCatColors'),draft.color,c=>{draft.color=c;paint()});
  paint();
  $('overlay')._draft=draft;
  $('overlay').hidden=false;document.body.classList.add('locked');
}
function deleteCustomCat(cat){
  if(!cat||isBuiltinCat(cat.id))return;
  const n=tasks.filter(t=>t.cat===cat.id).length;
  if(!confirm('Smazat kategorii „'+cat.name+'“?'+(n?' Úkoly ('+n+') se přesunou do Ostatní.':'')))return;
  tasks.forEach(t=>{if(t.cat===cat.id){t.cat='ost';t.updated=Date.now()}});
  customCats=customCats.filter(c=>c.id!==cat.id);
  if(taskFilter===cat.id)taskFilter='all';
  persist();
  closeSheet();
  renderTasks();renderDnes();
  if(catEditFromSettings)openSettings();
  toast('Kategorie smazána');
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
$('dictBtn').onclick=startDictation;
$('noteSave').onclick=saveNoteFromComposer;
$('noteCancelEdit').onclick=()=>{clearNoteComposer();toast('Úprava zrušena')};
$('noteText').addEventListener('input',saveNoteDraft);
$('noteTag').addEventListener('change',saveNoteDraft);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){saveNoteDraft();stopDictation()}});
window.addEventListener('pagehide',saveNoteDraft);
$('goNotes').onclick=()=>setView('notes');


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
  ingestCategories(data.kategorie||data.categories||[]);
  return{
    kategorie:(data.kategorie||data.categories||[]).map(normalizeCategory).filter(Boolean),
    tasks:(data.tasks||[]).map(normalizeTask).filter(Boolean),
    days:(data.days||[]).map(x=>normalizeDay(Object.assign({imported:true},x))).filter(Boolean),
    expenses:(data.expenses||[]).map(normalizeExp).filter(Boolean),
    invoices:(data.invoices||data.invoiced||[]).map(normalizeExp).filter(Boolean),
    reminders:(data.reminders||data.pripominky||[]).map(normalizeRem).filter(Boolean),
    poznamky:(data.poznamky||[]).map(normalizeNote).filter(Boolean),
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
  add((b.poznamky||[]).length,'poznámku','poznámky','poznámek');
  add((b.kategorie||[]).length,'kategorii','kategorie','kategorií');
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
  ingestCategories(b.kategorie||[]);
  b.tasks.forEach(t=>upsert(tasks,t,(a,c)=>a.id===c.id||a.text.toLowerCase()===c.text.toLowerCase()));
  b.days.forEach(d=>upsert(days,d,(a,c)=>a.date===c.date));
  b.expenses.forEach(d=>upsert(expenses,d,(a,c)=>a.date===c.date&&a.what===c.what));
  b.invoices.forEach(d=>upsert(invoices,d,(a,c)=>a.date===c.date&&a.what===c.what));
  b.reminders.forEach(d=>upsert(reminders,d,(a,c)=>a.id===d.id||(a.text===d.text&&a.when===d.when)));
  (b.poznamky||[]).forEach(n=>upsert(notes,n,(a,c)=>a.id===c.id||(a.text===c.text&&a.at===c.at)));
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
    tasks:tasks.map(t=>({id:t.id,t:t.text,c:t.cat,b:t.bucket,n:t.note||'',s:t.status,due:t.due||'',r:t.repeat||''})),
    days:days.map(d=>({date:d.date,worked_min:d.worked_min,work:d.work,nonbillable:!!d.nonbillable,spans:d.spans,pause_min:d.pause_min,notes:d.notes||''})),
    rem:reminders.map(r=>({id:r.id,text:r.text,when:r.when,done:!!r.done})),
    notes:$('dayNotes')?$('dayNotes').value.trim():'',
    poznamky:notes.map(n=>({id:n.id,at:n.at,text:n.text,tag:n.tag||'',updated:n.updated||n.at})),
    expenses:expenses.map(e=>({date:e.date,what:e.what,czk:e.czk})),
    kategorie:customCats.map(c=>({id:c.id,name:c.name,color:c.color}))
  });
}
function taskWire(t){
  const o={t:t.text,c:t.cat,b:t.bucket};
  if(t.note)o.n=t.note;
  if(t.status&&t.status!=='open')o.s=t.status;
  if(t.due)o.due=t.due;
  if(t.repeat)o.r=t.repeat;
  return o;
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
      else neu.push(taskWire(t));
    }else if(p.s!=='done'&&t.status==='done')done.push(t.text);
    else if(p.t!==t.text||p.c!==t.cat||p.b!==t.bucket||(p.n||'')!==(t.note||'')||p.s!==t.status||(p.due||'')!==(t.due||'')||(p.r||'')!==(t.repeat||'')){
      changed.push(taskWire(t));
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
  const notesDay=($('dayNotes').value||'').trim();
  const notesOut=(snap&&snap.notes===notesDay)?'':notesDay;
  const snapNotes=new Map((snap&&snap.poznamky||[]).map(x=>[x.id,x]));
  const poznamky=notes.filter(n=>{
    const prev=snapNotes.get(n.id);
    if(!prev)return true;
    return prev.text!==n.text||(prev.tag||'')!==(n.tag||'')||(prev.at||'')!==(n.at||'');
  }).map(n=>{
    const o={at:String(n.at||'').slice(0,16),text:n.text};
    if(n.tag)o.tag=n.tag;
    return o;
  });
  const snapCats=new Map((snap&&snap.kategorie||[]).map(x=>[x.id,x]));
  const kategorie=customCats.filter(c=>{
    const prev=snapCats.get(c.id);
    if(!prev)return true;
    return prev.name!==c.name||prev.color!==c.color;
  }).map(c=>({id:c.id,name:c.name,color:c.color}));
  return{date,dochazka,ukoly:{new:neu,done,changed},pripominky,poznamky,notes:notesOut,kategorie};
}
function hasChanges(p){
  return !!(p.dochazka||p.ukoly.new.length||p.ukoly.done.length||p.ukoly.changed.length||p.pripominky.length||(p.poznamky&&p.poznamky.length)||p.notes||(p.kategorie&&p.kategorie.length));
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
  if(p.poznamky&&p.poznamky.length){L.push('Poznámky:');p.poznamky.forEach(n=>L.push('- '+(n.at?stampToDisplay(n.at)+': ':'')+(n.tag?n.tag+' · ':'')+n.text));L.push('')}
  if(p.kategorie&&p.kategorie.length){L.push('Kategorie:');p.kategorie.forEach(c=>L.push('- '+c.name+' ('+c.id+')'));L.push('')}
  if(p.notes){L.push('Poznámky k dnešku:',p.notes,'')}
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
  const base={date:p.date,dochazka:null,ukoly:{new:[],done:[],changed:[]},pripominky:[],poznamky:[],kategorie:[],notes:''};
  if(p.dochazka||p.notes||(p.poznamky&&p.poznamky.length)||(p.kategorie&&p.kategorie.length))chunks.push(Object.assign({},base,{dochazka:p.dochazka,notes:p.notes,poznamky:p.poznamky||[],kategorie:p.kategorie||[]}));
  const take=()=>({date:p.date,dochazka:null,ukoly:{new:[],done:[],changed:[]},pripominky:[],poznamky:[],kategorie:[],notes:''});
  let cur=take();
  const fit=obj=>{const b=packBody(dateLabel,Object.assign({},obj,{_human:humanSummary(obj)}),1,1);return b.body.length<=BODY_MAX-20};
  const pushList=(key,arr)=>{
    arr.forEach(item=>{
      const probe=JSON.parse(JSON.stringify(cur));
      if(key==='pripominky')probe.pripominky=probe.pripominky.concat([item]);
      else if(key==='poznamky')probe.poznamky=(probe.poznamky||[]).concat([item]);
      else if(key==='done')probe.ukoly.done=probe.ukoly.done.concat([item]);
      else probe.ukoly[key]=probe.ukoly[key].concat([item]);
      if(fit(probe))cur=probe;
      else{if(hasChanges(cur))chunks.push(cur);cur=take();if(key==='pripominky')cur.pripominky=[item];else if(key==='poznamky')cur.poznamky=[item];else if(key==='done')cur.ukoly.done=[item];else cur.ukoly[key]=[item]}
    });
  };
  pushList('new',p.ukoly.new);pushList('done',p.ukoly.done);pushList('changed',p.ukoly.changed);pushList('pripominky',p.pripominky);pushList('poznamky',p.poznamky||[]);
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
async function startSend(){
  if(collectTodayExpense()==='bad'){toast('Doplň výdaj: za co a částku');return}
  if(!saveTodayAttendance()&&collectTodayExpense()==='bad')return;
  const p=collectChanges();
  if(!hasChanges(p)){toast('Není co odeslat');return}
  try{
    const file=await makeBackupBlob();
    if(file){
      p.backup=true;p.backup_at=file.enc.at||nowStamp();
      const r=await shareOrDownload(file.blob,file.name,'Den záloha');
      if(r==='download')toast('Šifrovaná záloha je stažená, teď pošli e-mail');
    }else if(!getInboxKey()){
      /* záloha bez kódu nejde — e-mail pošleme stejně */
    }
  }catch(e){toast('Záloha se nepovedla, e-mail pošlu stejně')}
  const mails=splitPayload(p);
  pendingMails=mails.map((m,i)=>({subject:m.subject,body:m.body,_total:mails.length}));
  openNextMail(false);
}
$('sendBtn').onclick=()=>{startSend()};

/* ---------- App lock (WebAuthn / Face ID) ---------- */
const RP_ID_PROD='filipkubicny.github.io';
const LOCK_AFTER_MS=5*60*1000;
let platformUvAvail=null, uiReady=false, unlocked=true, hideAt=0, lastUnlockAt=0;
function lockRpId(){
  const h=location.hostname;
  if(h===RP_ID_PROD||h.endsWith('.'+RP_ID_PROD))return RP_ID_PROD;
  return h;
}
function lockApiPresent(){
  return !!(window.isSecureContext&&window.PublicKeyCredential&&navigator.credentials&&navigator.credentials.create&&navigator.credentials.get);
}
async function checkLockSupport(){
  if(!lockApiPresent()){platformUvAvail=false;return false}
  try{
    if(PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      platformUvAvail=!!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
    else platformUvAvail=true;
  }catch(e){platformUvAvail=false}
  const field=$('lockField');
  if(field&&platformUvAvail===false)field.remove();
  return platformUvAvail;
}
function loadLock(){const L=load('den_lock',null);return (L&&typeof L==='object')?L:null}
function lockEnabled(){const L=loadLock();return !!(L&&L.on&&L.credId)}
function bytesToB64url(u){return bytesToB64(u).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function b64urlToBytes(s){
  const t=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
  const pad=t.length%4===0?'':'===='.slice(t.length%4);
  return b64toBytes(t+pad);
}
function assertionHasUV(assertion){
  try{
    const ad=new Uint8Array(assertion.response.authenticatorData);
    if(ad.length<33)return false;
    return (ad[32]&0x04)!==0;
  }catch(e){return false}
}
function setLockHint(s){const e=$('lockHint');if(e)e.textContent=s||''}
function armPrivacyCover(){if(lockEnabled())document.documentElement.classList.add('app-blurred')}
function disarmPrivacyCover(){document.documentElement.classList.remove('app-blurred')}
function scrubDom(){
  ['taskList','todayTasks','todayNotesList','noteList','searchResults','taskFilters','todayRems'].forEach(id=>{const e=$(id);if(e)e.innerHTML=''});
  ['quickTask','noteText','work','dayNotes','expWhat','expCzk','from1','to1','from2','to2','searchQ'].forEach(id=>{const e=$(id);if(e)e.value=''});
  uiReady=false;
}
function showLockScreen(){
  document.documentElement.classList.add('app-locked');
  disarmPrivacyCover();
  const el=$('lockScreen');if(el)el.hidden=false;
  const em=$('lockEmergency');if(em)em.hidden=true;
  const code=$('lockCode');if(code)code.value='';
  setLockHint('');
  unlocked=false;
}
function lockApp(){
  unlocked=false;
  scrubDom();
  showLockScreen();
}
function shouldRelock(){return lockEnabled()&&unlocked&&hideAt&&(Date.now()-hideAt>=LOCK_AFTER_MS)}
function lockSettingsHtml(){
  if(platformUvAvail===false)return '';
  if(platformUvAvail===null&&!lockApiPresent())return '';
  const on=lockEnabled();
  return '<div class="field" id="lockField"><span class="lbl">Zámek Face ID</span>'+
    '<div class="muted">Na iPhonu odemkne Face ID, případně kód telefonu. Když passkey chybí, použiješ kód pro IS BOTa. Zámek je jen v telefonu — data zůstávají v úložišti prohlížeče.</div>'+
    '<button type="button" class="secondary" id="lockToggle">'+(on?'Vypnout zámek Face ID':'Zapnout zámek Face ID')+'</button></div>';
}
async function registerAppLock(){
  if(!lockApiPresent()){toast('Tenhle prohlížeč Face ID zámek neumí');return}
  if(!getInboxKey()){toast('Nejdřív zadej kód pro IS BOTa — slouží jako nouzové odemčení');return}
  try{
    const userId=crypto.getRandomValues(new Uint8Array(16));
    const cred=await navigator.credentials.create({
      publicKey:{
        rp:{id:lockRpId(),name:'Den'},
        user:{id:userId,name:'den-zamek',displayName:'Den'},
        challenge:crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
        timeout:60000,
        authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred',requireResidentKey:false},
        attestation:'none'
      }
    });
    if(!cred||!cred.rawId){toast('Face ID se nepodařilo nastavit');return}
    const credId=bytesToB64url(new Uint8Array(cred.rawId));
    save('den_lock',{on:true,credId,at:nowStamp()});
    toast('Zámek Face ID je zapnutý');
    if(sheetMode==='settings')openSettings();
  }catch(e){
    if(e&&e.name==='NotAllowedError')toast('Nastavení zámku bylo zrušeno');
    else toast('Face ID se nepodařilo nastavit');
  }
}
function disableAppLock(){
  if(!confirm('Vypnout zámek Face ID?'))return;
  save('den_lock',{on:false,credId:'',at:nowStamp()});
  document.documentElement.classList.remove('app-locked');
  const el=$('lockScreen');if(el)el.hidden=true;
  unlocked=true;
  toast('Zámek Face ID je vypnutý');
  if(sheetMode==='settings')openSettings();
  bootUi();
}
function toggleAppLock(){
  if(lockEnabled())disableAppLock();
  else registerAppLock();
}
async function unlockWithFace(){
  const L=loadLock();
  if(!L||!L.credId){setLockHint('Zámek není nastavený.');return}
  setLockHint('');
  try{
    const assertion=await navigator.credentials.get({
      publicKey:{
        rpId:lockRpId(),
        challenge:crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials:[{type:'public-key',id:b64urlToBytes(L.credId),transports:['internal']}],
        userVerification:'required',
        timeout:60000
      }
    });
    if(!assertion){setLockHint('Odemčení se nepovedlo.');return}
    if(!assertionHasUV(assertion)){setLockHint('Chybí ověření Face ID nebo kódu telefonu.');return}
    unlockApp();
  }catch(e){
    if(e&&e.name==='NotAllowedError')setLockHint('Ověření bylo zrušeno. Zkus to znovu, nebo použij kód pro IS BOTa.');
    else setLockHint('Odemčení se nepovedlo. Zkus kód pro IS BOTa.');
  }
}
function unlockWithPassphrase(){
  const typed=normalizeInboxKey(($('lockCode')&&$('lockCode').value)||'');
  const have=getInboxKey();
  if(!have){setLockHint('Kód pro IS BOTa v aplikaci chybí. Nastav ho, až se dostaneš do Nastavení.');return}
  if(!typed||typed!==have){setLockHint('Kód nesedí.');return}
  unlockApp();
}
function unlockApp(){
  unlocked=true;
  lastUnlockAt=Date.now();
  hideAt=0;
  document.documentElement.classList.remove('app-locked');
  disarmPrivacyCover();
  const el=$('lockScreen');if(el)el.hidden=true;
  const code=$('lockCode');if(code)code.value='';
  setLockHint('');
  bootUi();
}
function initForm(){
  if(initForm._done)return;
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
  initForm._done=true;
}
function bootUi(){
  if(uiReady){
    renderDnes();
    if(view==='ukoly')renderTasks();
    if(view==='dochazka')renderDochazka();
    if(view==='rems')renderRems();
    if(view==='notes')renderNotes();
    return;
  }
  uiReady=true;
  initForm();
  restoreNoteDraft();
  renderDnes();
  handleHashImport();
  pollInbox('init');
}
function onAppHide(){
  hideAt=Date.now();
  if(lockEnabled())armPrivacyCover();
}
function onAppShow(){
  disarmPrivacyCover();
  if(shouldRelock()){lockApp();return}
  if(uiReady&&unlocked)pollInbox('visible');
}

if($('appVer'))$('appVer').textContent='verze '+APP_VERSION;
if(!load('den_snap',null)&&(tasks.length||days.length||notes.length))takeSnapshot();
pendingMails=load('den_pending_mails',[])||[];
if(lockEnabled()){unlocked=false;showLockScreen()}
else {unlocked=true;bootUi()}
checkLockSupport();
if($('lockUnlock'))$('lockUnlock').onclick=()=>{unlockWithFace()};
if($('lockEmergencyBtn'))$('lockEmergencyBtn').onclick=()=>{
  const box=$('lockEmergency');if(!box)return;
  box.hidden=!box.hidden;
  if(!box.hidden&&$('lockCode'))$('lockCode').focus();
};
if($('lockCodeGo'))$('lockCodeGo').onclick=unlockWithPassphrase;
if($('lockCode'))$('lockCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();unlockWithPassphrase()}});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){onAppHide();saveNoteDraft();stopDictation()}
  else onAppShow();
});
window.addEventListener('pagehide',onAppHide);
window.addEventListener('focus',()=>{if(unlocked&&uiReady&&!document.hidden)pollInbox('focus')});
setInterval(()=>{if(!document.hidden&&unlocked&&uiReady)pollInbox('timer')},5*60*1000);
function setupSW(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.addEventListener('message',ev=>{
    if(!ev.data||ev.data.type!=='sw-update')return;
    if(sessionStorage.getItem('den_sw_bg')==='1')return;
    sessionStorage.setItem('den_sw_bg','1');
    location.reload();
  });
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
function hay(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function renderSearch(){
  const box=$('searchResults');if(!box)return;
  const q=hay(($('searchQ')&&$('searchQ').value||'').trim());
  if(!q){
    box.hidden=true;box.innerHTML='';
    ['dnes','ukoly','dochazka','rems','notes'].forEach(id=>$('view-'+id).hidden=view!==id);
    return;
  }
  ['dnes','ukoly','dochazka','rems','notes'].forEach(id=>$('view-'+id).hidden=true);
  box.hidden=false;box.innerHTML='';
  const h=document.createElement('h2');h.className='task-sec';h.textContent='Výsledky hledání';box.appendChild(h);
  const tHits=sortTasks(tasks.filter(t=>hay(t.text+' '+(t.note||'')).includes(q)));
  const nHits=notes.filter(n=>hay(n.text+' '+(n.tag||'')).includes(q));
  if(!tHits.length&&!nHits.length){
    const p=document.createElement('p');p.className='empty';p.textContent='Nic se nenašlo.';box.appendChild(p);return;
  }
  if(tHits.length){
    const s=document.createElement('h2');s.className='task-sec';s.textContent='Úkoly';box.appendChild(s);
    tHits.forEach(t=>box.appendChild(taskCard(t)));
  }
  if(nHits.length){
    const s=document.createElement('h2');s.className='task-sec';s.textContent='Poznámky';box.appendChild(s);
    nHits.forEach(n=>box.appendChild(noteCard(n,false)));
  }
}
function timesheetRows(p){
  p=p||period();
  const list=days.filter(d=>inPeriod(d.date,p)).sort((a,b)=>a.date.localeCompare(b.date));
  const exp=expenses.filter(e=>inPeriod(e.date,p)).sort((a,b)=>a.date.localeCompare(b.date));
  const billMin=list.reduce((a,d)=>a+dayMin(d),0),expSum=exp.reduce((a,e)=>a+e.czk,0),workCzk=pay(billMin);
  return {p,list,exp,billMin,expSum,workCzk,total:workCzk+expSum,rate:settings.rate};
}
function timesheetHtml(ts){
  const rows=ts.list.map(d=>{
    const when=(d.spans&&d.spans.length)?d.spans.map(([f,t])=>f+'–'+t).join(', '):'';
    const work=(d.work||[]).join('; ');
    return '<tr><td>'+esc(czDate(d.date))+'</td><td>'+esc(when)+'</td><td>'+esc(d.nonbillable?'0 (nefakt.)':fmt(dayMin(d)))+'</td><td>'+esc(work||d.notes||'')+'</td></tr>';
  }).join('');
  const exprows=ts.exp.map(e=>'<tr><td>'+esc(czDate(e.date))+'</td><td colspan="2">'+esc(e.what)+'</td><td>'+esc(czk(e.czk))+'</td></tr>').join('');
  return '<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Výkaz SAPEKOR '+esc(czPeriod(ts.p.start,ts.p.end))+'</title>'+
    '<style>body{font-family:system-ui,sans-serif;color:#111;margin:24px;font-size:13px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 8px}.meta{color:#444;margin:0 0 16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f3f3}td.num,th.num{text-align:right}.tot{font-weight:700}@media print{body{margin:12mm}}</style></head><body>'+
    '<h1>SAPEKOR · výkaz práce</h1>'+
    '<p class="meta">Období '+esc(czPeriod(ts.p.start,ts.p.end))+'<br>Sazba '+ts.rate+' Kč/h · částky bez DPH</p>'+
    '<h2>Odpracované dny</h2><table><thead><tr><th>Den</th><th>Čas</th><th>Hodiny</th><th>Popis</th></tr></thead><tbody>'+
    (rows||'<tr><td colspan="4">Žádný zápis v období</td></tr>')+'</tbody></table>'+
    '<h2>Výdaje</h2><table><thead><tr><th>Den</th><th colspan="2">Popis</th><th>Částka</th></tr></thead><tbody>'+
    (exprows||'<tr><td colspan="4">Žádné výdaje</td></tr>')+'</tbody></table>'+
    '<h2>Souhrn</h2><table><tr><td>Odpracováno</td><td class="num">'+esc(fmt(ts.billMin))+'</td></tr>'+
    '<tr><td>Práce ('+ts.rate+' Kč/h)</td><td class="num">'+esc(czk(ts.workCzk))+'</td></tr>'+
    '<tr><td>Výdaje</td><td class="num">'+esc(czk(ts.expSum))+'</td></tr>'+
    '<tr class="tot"><td>Celkem bez DPH</td><td class="num">'+esc(czk(ts.total))+'</td></tr></table></body></html>';
}
function csvEsc(s){const t=String(s??'');return /[;"\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t}
function timesheetCsv(ts){
  const lines=[['Den','Od','Do','Hodiny','Nefakturovat','Popis','Výdaj','Částka výdaje']];
  ts.list.forEach(d=>{
    const from=d.spans&&d.spans[0]?d.spans[0][0]:'';
    const to=d.spans&&d.spans[0]?d.spans[0][1]:'';
    const hours=d.nonbillable?0:(dayMin(d)/60);
    lines.push([d.date,from,to,String(hours).replace('.',','),d.nonbillable?'ano':'',(d.work||[]).join('; '),'','']);
  });
  ts.exp.forEach(e=>lines.push([e.date,'','','','','',e.what,String(e.czk)]));
  lines.push([]);
  lines.push(['Sazba Kč/h','','','','',String(ts.rate)]);
  lines.push(['Hodiny celkem','','','', '',String(ts.billMin/60).replace('.',',')]);
  lines.push(['Práce bez DPH','','','','',String(ts.workCzk)]);
  lines.push(['Výdaje','','','','',String(ts.expSum)]);
  lines.push(['Celkem bez DPH','','','','',String(ts.total)]);
  return '\uFEFF'+lines.map(r=>r.map(csvEsc).join(';')).join('\n');
}
function openTimesheetPrint(){
  const ts=timesheetRows(period());
  const w=window.open('','_blank');
  if(!w){toast('Prohlížeč zablokoval okno. Povol vyskakovací okna a zkus znovu.');return}
  w.document.write(timesheetHtml(ts));w.document.close();
  setTimeout(()=>{try{if(!window.__denNoPrint){w.focus();w.print()}}catch(e){}},300);
}
async function shareTimesheetCsv(){
  const ts=timesheetRows(period());
  const name='sapekor-vykaz-'+ts.p.start+'_'+ts.p.end+'.csv';
  const blob=new Blob([timesheetCsv(ts)],{type:'text/csv;charset=utf-8'});
  const r=await shareOrDownload(blob,name,'Výkaz SAPEKOR');
  if(r!=='abort')toast(r==='share'?'Výkaz je v nabídce Sdílet':'Výkaz CSV je stažený');
}
function requestPersist(){
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
}
if($('searchQ')){
  $('searchQ').addEventListener('input',renderSearch);
  $('searchQ').addEventListener('search',renderSearch);
}
if($('backupFile'))$('backupFile').addEventListener('change',ev=>{
  const f=ev.target.files&&ev.target.files[0];ev.target.value='';importBackupFile(f);
});
if($('timesheetPdf'))$('timesheetPdf').onclick=openTimesheetPrint;
if($('timesheetCsv'))$('timesheetCsv').onclick=()=>{shareTimesheetCsv()};
requestPersist();
setupSW();
})();
