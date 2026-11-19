(function(){
const SETUP_RAW=(function(){try{const h=String(location.hash||'');const m=h.match(/[#&]setup=([A-Za-z0-9_\-]+)/);if(m){history.replaceState(null,'',location.pathname+location.search);return m[1]}}catch(e){}return ''})();
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
const APP_VERSION=12.1,APP_LABEL='12.1',APP_NAME='Kompas';
try{localStorage.removeItem('den_lock')}catch(e){}
try{localStorage.removeItem('den_pending_mails')}catch(e){}
const CAT_REPAIR={'432daf02':'sva','7e50a6ef':'sva','97d85896':'sva','c47f2c69':'zam','59a4c2fe':'zam','b39cb988':'sva','727076df':'sva','83367aa7':'fre','6a18e6c6':'fre','79486842':'fre','83549cb7':'lin','3ef16c57':'ost','6443a152':'ost','738ca1f6':'fre','66c017e9':'zam','a1b882a7':'zam','249f1330':'zam','9c9d5258':'zam','354dbdf3':'zam','b9e025f0':'pul','4185f791':'pul','fbe7d7cd':'pul','aab0cba9':'sva','c6bfbc8d':'sva','4aeb6c08':'sva','a3d38c38':'sva','6e49be28':'ost','5b60e232':'ost','ee532219':'lin','deafdb98':'lin','527a770f':'inv','f19d2292':'inv','f2e4f1b8':'sva','875b1851':'fre','c0e70d5':'inv','802e913d':'ost'};
function textKey(s){return String(s||'').trim().toLowerCase().replace(/[\u2010-\u2015\u2212]/g,'-').replace(/\s+/g,' ')}
function fnv1a(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
/* Stable ids: items without an id get the same id on every device (matches den_store.py). */
function fpText(v){return String(v==null?'':v).trim().replace(/\s+/g,' ').toLowerCase()}
function stableId(prefix,key){const k=String(key);return prefix+'h'+fnv1a(k).padStart(8,'0')+fnv1a(k+'|k').padStart(8,'0')}
function fpExp(x){return x?String(x.date||'').slice(0,10)+'|'+fpText(x.what)+'|'+Number(x.czk):''}
function fpNote(x){return x?fpText(x.text)+'|'+String(x.at||'').slice(0,16):''}
function fpRem(x){return x?fpText(x.text)+'|'+String(x.when||''):''}
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
function allCats(){return CATS.concat(customCats.filter(c=>!c.deleted))}
function isBuiltinCat(id){return CATS.some(c=>c.id===id)}
function persistCats(){save('den_categories',customCats.map(c=>({id:c.id,name:c.name,color:c.color,updatedAt:itemUpdatedAt(c)||0,deleted:!!c.deleted})))}
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
  return{id,name,short:name,color,updatedAt:itemUpdatedAt(raw)||0,deleted:!!raw.deleted};
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
function padTime(t){const m=String(t||'').trim().match(/^(\d{1,2}):(\d{2})/);return m?pad(m[1])+':'+m[2]:String(t||'')}
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
  const updatedAt=itemUpdatedAt(raw);return{id:String(raw.id||stableId('t',fpText(text))),text,cat,bucket,note:String(raw.note||raw.n||'').trim(),status,created,doneAt,prevStatus:raw.prevStatus||'open',updated:raw.updated||updatedAt||Date.now(),updatedAt:updatedAt||0,deleted:!!raw.deleted,from:from==='bot'||from==='isbot'||from==='IS BOT'?'bot':from,due,repeat};
}
function normalizeDay(raw){
  if(!raw||!raw.date)return null;
  const spans=(raw.spans&&raw.spans.length?raw.spans:(raw.from&&raw.to?[[raw.from,raw.to]]:[])).map(s=>[padTime(s[0]),padTime(s[1])]);
  const nonbillable=!!(raw.nonbillable||raw.nonbill||raw.hours===0);
  let pause_min=raw.pause_min,fixed_min=raw.fixed_min;
  if(fixed_min==null&&raw.hours!=null&&raw.hours!=='')fixed_min=Math.round(Number(raw.hours)*60);
  if(pause_min==null)pause_min=(raw.hours!=null||raw.fixed_min!=null||raw.imported)?0:PAUSE;
  let worked_min=raw.worked_min;
  if(worked_min==null){
    if(fixed_min!=null)worked_min=fixed_min;
    else worked_min=Math.max(0,spans.reduce((a,[f,t])=>a+(spanMin(f,t)||0),0)-(pause_min||0));
  }
  return{id:String(raw.id||('d'+String(raw.date).slice(0,10))),date:String(raw.date).slice(0,10),spans,pause_min:pause_min||0,fixed_min:fixed_min!=null?fixed_min:null,worked_min:Math.round(worked_min||0),work:Array.isArray(raw.work)?raw.work.map(String):String(raw.work||'').split('\n').map(s=>s.trim()).filter(Boolean),notes:String(raw.notes||raw.note||'').trim(),areas:Array.isArray(raw.areas)?raw.areas:[],nonbillable,updatedAt:itemUpdatedAt(raw)||0,deleted:!!raw.deleted};
}
function normalizeExp(raw){
  if(!raw)return null;
  const val=Number(raw.czk??raw.amount??raw.kc);const what=String(raw.what||raw.text||raw.desc||'').trim();const date=String(raw.date||'').slice(0,10);
  if(!date||!what||!isFinite(val))return null;
  return{id:String(raw.id||stableId('e',date+'|'+fpText(what)+'|'+val)),date,what,czk:val,updatedAt:itemUpdatedAt(raw)||0,deleted:!!raw.deleted};
}
function normalizeRem(raw){
  if(!raw)return null;
  const text=String(raw.text||raw.t||raw.note||'').trim();if(!text)return null;
  let when=raw.when||raw.at||null;
  if(when){when=String(when).replace(' ','T').slice(0,16);if(/^\d{4}-\d{2}-\d{2}$/.test(when))when+='T09:00'}
  else when=null;
  return{id:String(raw.id||stableId('r',fpText(text)+'|'+(when||''))),text,when,done:!!raw.done,created:toISOdate(raw.created)||todayISO(),updatedAt:itemUpdatedAt(raw)||0,deleted:!!raw.deleted};
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
  return{id:String(raw.id||stableId('n',fpText(text)+'|'+at)),text,tag,at,updated:String(raw.updated||at).slice(0,16),updatedAt:itemUpdatedAt(raw)||0,deleted:!!raw.deleted};
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
var syncFirstMerged=false,syncReady=false,syncTimer=0,syncBusy=false,syncApplying=false,syncSha=null,syncRemoteHash=null,syncRemoteAt=null;
const persist=()=>{save('den_tasks',tasks);save('den_days',days);save('den_expenses',expenses);save('den_invoices',invoices);save('den_reminders',reminders);save('den_notes',notes);save('den_settings',settings);persistCats();scheduleSync()};
function isLive(x){return !!(x&&!x.deleted)}
function itemUpdatedAt(x){if(!x)return 0;const v=x.updatedAt!=null?x.updatedAt:x.updated;const n=Number(v);return Number.isFinite(n)?n:0}
function touch(x){if(!x||typeof x!=='object')return x;const n=Date.now();x.updatedAt=n;x.updated=n;return x}
let uiReady=false,selectedIds=new Set();
repairStoredTasks(tasks);
dedupeAll();
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
function findDay(date){const hits=(days||[]).filter(d=>d&&d.date===date);const live=hits.filter(isLive);const pool=live.length?live:hits;if(!pool.length)return null;return pool.slice().sort((a,b)=>itemUpdatedAt(b)-itemUpdatedAt(a))[0]}

let catEditFromSettings=false;
let view='dnes', taskTab='all', taskFilter='all', taskDoneOpen=true, monthYM=todayISO().slice(0,7), editDayDate=todayISO();
let sheetMode=null, sheetTarget=null, quickBucket='tomorrow', pendingMails=[];
window.__lastMailto='';

function searchActive(){return !!(($('searchQ')&&$('searchQ').value||'').trim())}
function refreshLists(){
  syncTodayFormFromState();
  if(searchActive()){renderSearch();return}
  if(view==='dnes')renderDnes();
  if(view==='ukoly')renderTasks();
  if(view==='dochazka')renderDochazka();
  if(view==='rems')renderRems();
  if(view==='notes')renderNotes();
}
function viewTitle(v){return ({dnes:'Dnes',ukoly:'Úkoly',dochazka:'Docházka',rems:'Připomínky',notes:'Poznámky'})[v||view]||APP_NAME}
function syncTitle(){
  const name=viewTitle();
  const compact=document.documentElement.classList.contains('compact');
  if($('navTitle'))$('navTitle').textContent=compact?name:APP_NAME;
  if($('largeTitle'))$('largeTitle').innerHTML=esc(name)+' <span class="ver" id="appVer">verze '+APP_LABEL+'</span>';
}
function setupCompactHeader(){
  if(setupCompactHeader._on)return;
  setupCompactHeader._on=true;
  const onscroll=()=>{
    const y=window.scrollY||document.documentElement.scrollTop||0;
    document.documentElement.classList.toggle('compact',y>28);
    const name=viewTitle();
    if($('navTitle'))$('navTitle').textContent=document.documentElement.classList.contains('compact')?name:APP_NAME;
  };
  window.addEventListener('scroll',onscroll,{passive:true});
  onscroll();
}
function setView(v){
  view=v;
  document.querySelectorAll('.tabbar button, #appSidebar .sb-nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  syncTitle();
  if(searchActive()){renderSearch();return}
  ['dnes','ukoly','dochazka','rems','notes'].forEach(id=>$('view-'+id).hidden=v!==id);
  if(v==='dnes')renderDnes();
  if(v==='ukoly')renderTasks();
  if(v==='dochazka')renderDochazka();
  if(v==='rems')renderRems();
  if(v==='notes')renderNotes();
}
document.querySelectorAll('.tabbar button, #appSidebar .sb-nav button').forEach(b=>b.onclick=()=>setView(b.dataset.view));

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
  const el=$(id);if(el){const fn=()=>{updateTotal();scheduleTodaySave()};el.addEventListener('input',fn);el.addEventListener('change',fn)}
});

function todayFormSigFromDom(){
  return JSON.stringify({
    from1:$('from1')?$('from1').value||'':'',
    to1:$('to1')?$('to1').value||'':'',
    from2:$('from2')?$('from2').value||'':'',
    to2:$('to2')?$('to2').value||'':'',
    span2:$('span2row')? !$('span2row').hidden:false,
    lunch:$('lunch')?!!$('lunch').checked:true,
    nonbill:$('nonbill')?!!$('nonbill').checked:false,
    work:$('work')?($('work').value||''):'',
    expWhat:$('expWhat')?($('expWhat').value||''):'',
    expCzk:$('expCzk')?($('expCzk').value||''):''
  });
}
function formSigFromDay(d){
  const s=(d&&d.spans)||[];
  const ex=expenses.find(e=>e.date===todayISO()&&isLive(e));
  return JSON.stringify({
    from1:s[0]?s[0][0]:'',
    to1:s[0]?s[0][1]:'',
    from2:s[1]?s[1][0]:'',
    to2:s[1]?s[1][1]:'',
    span2:!!s[1],
    lunch:d?((d.pause_min||0)>0):true,
    nonbill:!!(d&&d.nonbillable),
    work:d?(d.work||[]).join('\n'):'',
    expWhat:ex?ex.what:'',
    expCzk:ex?String(ex.czk):''
  });
}
function todayFormIsBlank(){
  const v=id=>{const el=$(id);return el&&el.value&&String(el.value).trim()};
  return !(v('from1')||v('to1')||v('from2')||v('to2')||v('work')||v('expWhat')||v('expCzk'));
}
function dayContentSig(d){
  if(!d)return '';
  return JSON.stringify({spans:d.spans||[],pause:d.pause_min||0,nb:!!d.nonbillable,work:d.work||[],notes:d.notes||'',fixed:d.fixed_min==null?null:d.fixed_min,w:d.worked_min||0,areas:d.areas||[]});
}
let todayFormFilledSig='',todayFormDirty=false;
function fillTodayForm(d){
  const s=(d&&d.spans)||[];
  $('from1').value=s[0]?s[0][0]:'';$('to1').value=s[0]?s[0][1]:'';
  if(s[1]){setSpan2(true);$('from2').value=s[1][0];$('to2').value=s[1][1]}else setSpan2(false);
  $('lunch').checked=d?((d.pause_min||0)>0):true;
  $('nonbill').checked=!!(d&&d.nonbillable);
  $('work').value=d?(d.work||[]).join('\n'):'';
  const ex=expenses.find(e=>e.date===todayISO()&&isLive(e));
  $('expWhat').value=ex?ex.what:'';$('expCzk').value=ex?ex.czk:'';
  if(d&&d.notes&&$('dayNotes'))$('dayNotes').value=d.notes;
  updateTotal();
  todayFormFilledSig=todayFormSigFromDom();
  todayFormDirty=false;
}
function syncTodayFormFromState(){
  const d=findDay(todayISO());
  if(!d||!$('from1'))return;
  if(todayFormIsBlank()||!todayFormDirty||todayFormSigFromDom()===todayFormFilledSig){
    const next=formSigFromDay(d);
    if(todayFormSigFromDom()!==next)fillTodayForm(d);
  }
}
function scheduleTodaySave(){
  if(todayFormSigFromDom()!==todayFormFilledSig)todayFormDirty=true;
  if(todayFormIsBlank())return;
  clearTimeout(scheduleTodaySave._t);
  scheduleTodaySave._t=setTimeout(()=>{
    if(saveTodayAttendance()){todayFormFilledSig=todayFormSigFromDom();todayFormDirty=false}
  },500);
}
function collectTodayDay(){
  const date=todayISO(),nb=$('nonbill').checked,spans=formSpans(),w=formWorked();
  const hasExp=!!$('expWhat').value.trim()||!!$('expCzk').value.trim();
  if(!nb&&w==null&&!hasExp&&!$('work').value.trim())return null;
  if(!nb&&w==null)return null;
  const existing=findDay(date);
  const pause=$('lunch').checked?PAUSE:0;
  let fixed_min=null,worked=w==null?0:w;
  if(existing&&existing.fixed_min!=null){
    const same=JSON.stringify(spans)===JSON.stringify(existing.spans||[])&&pause===(existing.pause_min||0);
    if(same){fixed_min=existing.fixed_min;worked=existing.fixed_min}
  }
  return normalizeDay({id:(existing||{}).id||uid('d'),date,spans,pause_min:pause,fixed_min,worked_min:worked,work:$('work').value.split('\n').map(s=>s.trim()).filter(Boolean),notes:(existing&&existing.notes)||($('dayNotes')&&$('dayNotes').value)||'',nonbillable:nb,areas:(existing||{}).areas||[],updatedAt:itemUpdatedAt(existing)||0,deleted:false});
}
function collectTodayExpense(){
  const what=$('expWhat').value.trim(),amt=$('expCzk').value.trim();
  if(!what&&!amt)return null;
  if(!what||!amt||!isFinite(Number(amt)))return 'bad';
  return{id:uid('e'),date:todayISO(),what,czk:Number(amt)};
}
function upsertDay(day){
  if(!day||!day.date)return false;
  const incomingEmpty=!(day.spans&&day.spans.length)&&!(day.work&&day.work.length)&&!(day.worked_min);
  const i=days.findIndex(x=>x.date===day.date&&!x.deleted);
  if(i>=0){
    const prev=days[i];
    const prevFilled=!!((prev.spans&&prev.spans.length)||(prev.work&&prev.work.length)||prev.worked_min);
    if(incomingEmpty&&prevFilled)return false;
    const next=Object.assign({},prev,day,{id:prev.id});
    if(dayContentSig(next)===dayContentSig(prev))return false;
    days[i]=touch(next);
    days.sort((a,b)=>a.date.localeCompare(b.date));
    return true;
  }
  if(incomingEmpty)return false;
  days.push(touch(day));
  days.sort((a,b)=>a.date.localeCompare(b.date));
  return true;
}
function saveTodayAttendance(){
  const day=collectTodayDay();
  const exp=collectTodayExpense();
  if(exp==='bad'){toast('Doplň výdaj: za co a částku');return false}
  let changed=false;
  if(day)changed=upsertDay(day)||changed;
  if(exp){
    const i=expenses.findIndex(e=>e.date===exp.date&&e.what===exp.what&&isLive(e));
    if(i>=0){
      const next=Object.assign({},expenses[i],exp,{id:expenses[i].id});
      if(JSON.stringify({w:next.what,c:next.czk})!==JSON.stringify({w:expenses[i].what,c:expenses[i].czk})){expenses[i]=touch(next);changed=true}
    }else{
      const j=expenses.findIndex(e=>e.date===exp.date&&isLive(e));
      if(j>=0&&!$('expWhat').dataset.keep){
        const next=Object.assign({},expenses[j],exp,{id:expenses[j].id});
        expenses[j]=touch(next);changed=true;
      }else{expenses.push(touch(exp));changed=true}
    }
    expenses.sort((a,b)=>a.date.localeCompare(b.date));
  }
  if(changed)persist();
  return true;
}


function undoRestore(item,copy,msg){
  toast(msg,{label:'Zpět',fn:()=>{
    Object.assign(item,copy);
    if(copy.deleted)item.deleted=true;else item.deleted=false;
    touch(item);persist();refreshLists();
  }});
}
function setEditDayDate(iso){
  if(!iso)return;
  editDayDate=iso;
  monthYM=iso.slice(0,7);
  if($('pickDay'))$('pickDay').value=iso;
  if(view==='dochazka')renderDochazka();
}
function fillDaySheet(d){
  const s=(d&&d.spans)||[];
  if($('dDate')&&d&&d.date)$('dDate').value=d.date;
  $('dFrom1').value=s[0]?s[0][0]:'';$('dTo1').value=s[0]?s[0][1]:'';
  if($('dSpan2row')){
    const on=!!s[1];
    $('dSpan2row').hidden=!on;
    if($('dToggleSpan2'))$('dToggleSpan2').textContent=on?'Odebrat druhý čas':'+ Druhý čas';
    $('dFrom2').value=s[1]?s[1][0]:'';$('dTo2').value=s[1]?s[1][1]:'';
  }
  if($('dLunch'))$('dLunch').checked=d?((d.pause_min||0)>0):true;
  if($('dNonbill'))$('dNonbill').checked=!!(d&&d.nonbillable);
  if($('dWork'))$('dWork').value=d?(d.work||[]).join('\n'):'';
  if($('dNotes'))$('dNotes').value=d&&d.notes?d.notes:'';
}
function collectDayFromSheet(existing){
  const date=($('dDate')&&$('dDate').value)||(existing&&existing.date)||todayISO();
  const spans=[];
  if($('dFrom1')&&$('dFrom1').value&&$('dTo1')&&$('dTo1').value)spans.push([$('dFrom1').value,$('dTo1').value]);
  if($('dSpan2row')&&!$('dSpan2row').hidden&&$('dFrom2')&&$('dFrom2').value&&$('dTo2')&&$('dTo2').value)spans.push([$('dFrom2').value,$('dTo2').value]);
  const pause=$('dLunch')&&$('dLunch').checked?PAUSE:0;
  const nb=!!($('dNonbill')&&$('dNonbill').checked);
  const work=(($('dWork')&&$('dWork').value)||'').split('\n').map(x=>x.trim()).filter(Boolean);
  const notes=(($('dNotes')&&$('dNotes').value)||'').trim();
  const areas=(($('overlay')._draft&&$('overlay')._draft.areas)||(existing&&existing.areas)||[]).slice();
  let worked=null;
  if(spans.length)worked=Math.max(0,spans.reduce((a,pair)=>a+(spanMin(pair[0],pair[1])||0),0)-pause);
  else if(nb)worked=0;
  if(!nb&&worked==null&&!work.length&&!notes)return null;
  if(!nb&&worked==null)return null;
  let fixed_min=null;
  if(existing&&existing.fixed_min!=null){
    const same=JSON.stringify(spans)===JSON.stringify(existing.spans||[])&&pause===(existing.pause_min||0);
    if(same){fixed_min=existing.fixed_min;worked=existing.fixed_min}
  }
  return normalizeDay({id:(existing||{}).id||uid('d'),date,spans,pause_min:pause,fixed_min,worked_min:worked==null?0:worked,work,notes,nonbillable:nb,areas,deleted:false});
}
function paintAreaPicker(el,selected){
  if(!el)return;
  el.innerHTML='';
  Object.keys(AREAS).forEach(id=>{
    const b=document.createElement('button');b.type='button';b.className='chip'+(selected.indexOf(id)>=0?' on':'');
    b.textContent=AREAS[id];
    b.onclick=()=>{
      const draft=$('overlay')._draft||($('overlay')._draft={areas:[]});
      const i=draft.areas.indexOf(id);
      if(i>=0)draft.areas.splice(i,1);else draft.areas.push(id);
      paintAreaPicker(el,draft.areas);
    };
    el.appendChild(b);
  });
}
function openDaySheet(date,day){
  const iso=date||(day&&day.date)||editDayDate||todayISO();
  const existing=day||findDay(iso)||null;
  sheetMode='day';sheetTarget=existing;
  editDayDate=iso;if($('pickDay'))$('pickDay').value=iso;
  const draft={areas:((existing&&existing.areas)||[]).slice()};
  $('sheetTitle').textContent=existing?'Upravit den':'Přidat den';
  $('sheetDelete').hidden=!existing;
  $('sheetBody').innerHTML='<div class="daybar" style="margin-bottom:12px"><button type="button" class="ghost-btn" id="dPrev" aria-label="Předchozí den">‹</button><div class="field" style="flex:1;margin:0"><label for="dDate">Den</label><input type="date" id="dDate" value="'+esc(iso)+'"></div><button type="button" class="ghost-btn" id="dNext" aria-label="Další den">›</button></div>'+
    '<div class="row field"><div><label for="dFrom1">Od</label><input type="time" id="dFrom1" step="300"></div><div><label for="dTo1">Do</label><input type="time" id="dTo1" step="300"></div></div>'+
    '<div class="row field" id="dSpan2row" hidden><div><label for="dFrom2">Od (druhý čas)</label><input type="time" id="dFrom2" step="300"></div><div><label for="dTo2">Do</label><input type="time" id="dTo2" step="300"></div></div>'+
    '<div class="actions tight"><button type="button" class="secondary" id="dToggleSpan2">+ Druhý čas</button></div>'+
    '<label class="check"><input type="checkbox" id="dLunch" checked> Odečíst 30 min pauzu na oběd</label>'+
    '<label class="check"><input type="checkbox" id="dNonbill"> Nefakturuje se / mimo SAPEKOR</label>'+
    '<div class="field" style="margin-top:12px"><label for="dWork">Na čem jsem pracoval</label><textarea id="dWork" rows="4" placeholder="Každá činnost na nový řádek"></textarea></div>'+
    '<div class="field"><label for="dNotes">Poznámka k dni</label><textarea id="dNotes" rows="2"></textarea></div>'+
    '<div class="field"><span class="lbl">Oblasti</span><div class="chips" id="dAreas"></div></div>';
  $('overlay')._draft=draft;
  $('overlay').hidden=false;document.body.classList.add('locked');
  fillDaySheet(existing||{date:iso,spans:[],pause_min:PAUSE,work:[],notes:'',nonbillable:false,areas:[]});
  paintAreaPicker($('dAreas'),draft.areas);
  const go=iso2=>{const next=findDay(iso2);sheetTarget=next||null;$('sheetTitle').textContent=next?'Upravit den':'Přidat den';$('sheetDelete').hidden=!next;editDayDate=iso2;const nd={areas:((next&&next.areas)||[]).slice()};$('overlay')._draft=nd;fillDaySheet(next||{date:iso2,spans:[],pause_min:PAUSE,work:[],notes:'',nonbillable:false,areas:[]});if($('dDate'))$('dDate').value=iso2;paintAreaPicker($('dAreas'),nd.areas);};
  $('dPrev').onclick=()=>go(addDays($('dDate').value||iso,-1));
  $('dNext').onclick=()=>go(addDays($('dDate').value||iso,1));
  $('dDate').onchange=()=>{if($('dDate').value)go($('dDate').value)};
  $('dToggleSpan2').onclick=()=>{const on=$('dSpan2row').hidden;$('dSpan2row').hidden=!on;$('dToggleSpan2').textContent=on?'Odebrat druhý čas':'+ Druhý čas';if(!on){$('dFrom2').value='';$('dTo2').value=''}};
}
function openRemSheet(r){
  sheetMode='rem';sheetTarget=r||null;
  const when=r&&r.when?String(r.when):'';
  const date=when.slice(0,10)||todayISO();
  const time=when.length>10?when.slice(11,16):'';
  $('sheetTitle').textContent=r?'Upravit připomínku':'Nová připomínka';
  $('sheetDelete').hidden=!r;
  $('sheetBody').innerHTML='<div class="field"><label for="eRemText">Připomínka</label><textarea id="eRemText" rows="3" placeholder="Na co mě upozornit">'+esc(r?r.text:'')+'</textarea></div>'+
    '<div class="row field"><div><label for="eRemDate">Den</label><input type="date" id="eRemDate" value="'+esc(date)+'"></div><div><label for="eRemTime">Čas</label><input type="time" id="eRemTime" value="'+esc(time)+'"></div></div>'+
    '<div class="chips" id="eRemChips"></div>'+
    (r?'<label class="check"><input type="checkbox" id="eRemDone"'+(r.done?' checked':'')+'> Hotovo</label>':'');
  $('overlay').hidden=false;document.body.classList.add('locked');
  remChipBar($('eRemChips'),$('eRemDate'),$('eRemTime'));
  setTimeout(()=>$('eRemText')&&$('eRemText').focus(),40);
}
function openExpSheet(e){
  sheetMode='exp';sheetTarget=e||null;
  $('sheetTitle').textContent=e?'Upravit výdaj':'Nový výdaj';
  $('sheetDelete').hidden=!e;
  $('sheetBody').innerHTML='<div class="field"><label for="eExpDate">Den</label><input type="date" id="eExpDate" value="'+esc((e&&e.date)||editDayDate||todayISO())+'"></div>'+
    '<div class="field"><label for="eExpWhat">Výdaj</label><input type="text" id="eExpWhat" value="'+esc(e?e.what:'')+'" placeholder="Za co"></div>'+
    '<div class="field"><label for="eExpCzk">Částka v Kč</label><input type="number" id="eExpCzk" min="0" step="1" inputmode="numeric" value="'+(e?esc(String(e.czk)):'')+'"></div>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  setTimeout(()=>$('eExpWhat')&&$('eExpWhat').focus(),40);
}

/* ---------- Tasks UI ---------- */
function matchesCat(t){return isLive(t)&&(taskFilter==='all'||t.cat===taskFilter)}
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
    if(!isLive(t)||!matchesCat(t))return false;
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
    t.status=t.prevStatus&&t.prevStatus!=='done'?t.prevStatus:'open';t.doneAt='';touch(t);
    persist();refreshLists();
    toast('Vráceno mezi otevřené',{label:'Zpět',fn:()=>{Object.assign(t,before);persist();refreshLists()}});
    return;
  }
  t.prevStatus=t.status;t.status='done';t.doneAt=todayISO();touch(t);
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
  const meta=['<span class="meta-cat"><span class="dot" style="background:'+c.color+'"></span>'+esc(c.short||c.name)+'</span>'];
  if(t.status&&t.status!=='open')meta.push('<span class="meta-st '+esc(t.status)+'">'+esc(st.name)+'</span>');
  if(t.due)meta.push('<span class="meta-due '+(isOverdue(t)?'overdue':isDueToday(t)?'due':'')+'">'+esc(dueLabel(t))+'</span>');
  if(t.repeat)meta.push('<span class="meta-rep">'+esc(repeatLabel(t.repeat))+'</span>');
  if(t.from==='bot')meta.push('<span class="meta-bot">od IS BOTa</span>');
  d.innerHTML='<button type="button" class="chk'+(t.status==='done'?' on':'')+'" aria-label="Hotovo">'+(t.status==='done'?'✓':'')+'</button>'+
    '<div class="body"><div class="ttext">'+esc(t.text)+'</div>'+(t.note?'<div class="tnote">'+esc(t.note)+'</div>':'')+
    '<div class="tmeta">'+meta.join('')+'</div></div>';
  d.querySelector('.chk').onclick=ev=>{ev.stopPropagation();ev.currentTarget.classList.add('flash');haptic();toggleDone(t)};
  d.querySelector('.chk').setAttribute('aria-label',t.status==='done'?'Vrátit mezi otevřené: '+t.text:'Označit hotovo: '+t.text);
  if(!opts||opts.edit!==false){const b=d.querySelector('.body');b.onclick=()=>openTaskSheet(t);b.setAttribute('role','button');b.tabIndex=0;b.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openTaskSheet(t)}}}
  if(!opts||opts.swipe!==false)attachSwipe(d,{right:{label:t.status==='done'?'Vrátit':'Hotovo',fn:()=>toggleDone(t)},left:{label:'Smazat',fn:()=>softDelete(t,'task')}});
  return d;
}
function appendGroup(host,title,nodes,opts){
  if(!nodes||!nodes.length)return null;
  if(title){
    const h=document.createElement(opts&&opts.tag||'h2');
    h.className='task-sec'+(opts&&opts.cls?(' '+opts.cls):'');
    if(opts&&opts.id)h.id=opts.id;
    if(opts&&opts.html)h.innerHTML=title;else h.textContent=title;
    host.appendChild(h);
  }
  const g=document.createElement('div');g.className='group'+(opts&&opts.boxCls?(' '+opts.boxCls):'');
  if(opts&&opts.hidden)g.hidden=true;
  nodes.forEach(n=>g.appendChild(n));
  host.appendChild(g);
  return g;
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
  const hasAny=tasks.some(t=>isLive(t)&&matchesCat(t));
  if(!hasAny){
    empty.hidden=false;
    empty.innerHTML=tasks.length?emptyState('⌕','V tomhle filtru nic není','Zkus jinou kategorii nebo období.'):emptyState('✓','Zatím žádné úkoly','Přidej první tlačítkem +',{id:'task',label:'Přidat úkol'});bindEmptyButtons(empty);
    renderTaskTable();
    return;
  }
  empty.hidden=true;
  const dueNow=sortDue(tasks.filter(t=>isLive(t)&&matchesCat(t)&&isDueSoon(t)));
  const dueIds=new Set(dueNow.map(t=>t.id));
  if(dueNow.length&&(taskTab==='all'||taskTab!=='done')){
    const show=taskTab==='all'?dueNow:dueNow.filter(t=>t.bucket===taskTab);
    if(show.length)appendGroup(list,'Dnes / po termínu',show.map(t=>taskCard(t)),{id:'dueSection'});
  }
  if(taskTab==='all'){
    let shown=dueNow.length;
    BUCKETS.forEach(b=>{
      const group=sortTasks(tasks.filter(t=>isLive(t)&&matchesCat(t)&&t.status!=='done'&&t.bucket===b.id&&!dueIds.has(t.id)));
      if(!group.length)return;
      appendGroup(list,b.name,group.map(t=>taskCard(t)));
      shown+=group.length;
    });
    const done=sortTasks(tasks.filter(t=>isLive(t)&&matchesCat(t)&&t.status==='done'));
    if(done.length){
      const wrap=document.createElement('div');wrap.className='done-sec';
      const btn=document.createElement('button');btn.type='button';btn.className='task-sec done-toggle';
      btn.setAttribute('aria-expanded',taskDoneOpen?'true':'false');
      btn.innerHTML='Hotovo <span class="n">'+done.length+'</span>';
      const box=document.createElement('div');box.className='group done-box';box.hidden=!taskDoneOpen;
      done.forEach(t=>box.appendChild(taskCard(t)));
      btn.onclick=()=>{taskDoneOpen=!taskDoneOpen;btn.setAttribute('aria-expanded',taskDoneOpen?'true':'false');box.hidden=!taskDoneOpen};
      wrap.appendChild(btn);wrap.appendChild(box);list.appendChild(wrap);
      shown+=done.length;
    }
    if(!shown){empty.hidden=false;empty.textContent='V tomhle filtru zatím nic není.';}
    renderTaskTable();
    return;
  }
  const items=visibleTasks().filter(t=>taskTab==='done'||!isDueSoon(t));
  if(!items.length&&!list.children.length){
    empty.hidden=false;
    empty.textContent=taskTab==='done'?'Zatím žádné hotové úkoly v tomto filtru.':'V tomhle období zatím nic není.';
    renderTaskTable();
    return;
  }
  appendGroup(list,'',items.map(t=>taskCard(t)));
  renderTaskTable();
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
function closeSheet(){$('overlay').hidden=true;if($('importOverlay').hidden)document.body.classList.remove('locked');sheetMode=null;sheetTarget=null;if($('sheetDelete')){$('sheetDelete').hidden=true;$('sheetDelete').textContent='Smazat'}if($('sheetSave')){$('sheetSave').hidden=false;$('sheetSave').textContent='Uložit'}}
$('addTaskBtn').onclick=()=>openQuickAdd('task');
if($('quickFab'))$('quickFab').onclick=()=>{haptic();openQuickAdd()};
$('sheetCancel').onclick=closeSheet;
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('importOverlay').hidden)closeImportSheet();else if(!$('overlay').hidden)closeSheet()}});
$('sheetSave').onclick=()=>{
  if(sheetMode==='quick'){submitQuickAdd();return}
  if(sheetMode==='device-link'){closeSheet();return}
  if(sheetMode==='pair-accept'){submitPairAccept();return}
  if(sheetMode==='pair-share'){closeSheet();return}
  if(sheetMode==='settings'){
    const b=$('sBilled').value,s=$('sSpecial').value,r=Number($('sRate').value);
    if(!b||!s||!isFinite(r)||r<0){toast('Zkontroluj nastavení');return}
    settings.billedUntil=b;settings.specialEnd=s;settings.rate=r;touch(settings);persist();
    const cred=saveCredsFromForm();
    if(!cred.ok){toast(cred.err);setSyncStatus('warn',cred.err);return}
    closeSheet();if(view==='dochazka')renderDochazka();updateTotal();toast('Nastavení uloženo');
    updatePairBanner();
    if(hasSyncCreds())syncNow('auto').then(()=>pollInbox('force'));else pollInbox('force');
    return;
  }
  if(sheetMode==='cat-edit'){
    const draft=$('overlay')._draft||{};
    const name=(($('editCatName')&&$('editCatName').value)||draft.name||'').trim();
    if(!name){toast('Napiš název kategorie');return}
    const cat=sheetTarget;if(!cat)return;
    const clash=allCats().find(c=>c.id!==cat.id&&c.name.toLowerCase()===name.toLowerCase());
    if(clash){toast('Taková kategorie už existuje');return}
    const copy=JSON.parse(JSON.stringify(cat));cat.name=name;cat.short=name;cat.color=draft.color||cat.color;touch(cat);
    persist();closeSheet();renderTasks();renderDnes();if(catEditFromSettings)openSettings();toast('Kategorie uložena',{label:'Zpět',fn:()=>{Object.assign(cat,copy);touch(cat);persist();renderTasks();renderDnes();if(catEditFromSettings)openSettings()}});
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
  if(sheetMode==='day'){
    const date=($('dDate')&&$('dDate').value)||editDayDate||todayISO();
    const existing=findDay(date)||sheetTarget||null;
    const day=collectDayFromSheet(existing&&existing.date===date?existing:null);
    if(!day){toast('Doplň čas, práci nebo zaškrtni, že se nefakturuje');return}
    const prev=existing&&existing.date===date?JSON.parse(JSON.stringify(existing)):null;
    const changed=upsertDay(day);
    if(!changed&&prev){closeSheet();return}
    if(date===todayISO()){todayFormDirty=false;fillTodayForm(findDay(date))}
    setEditDayDate(date);
    persist();closeSheet();refreshLists();
    toast(prev?'Den uložen':'Den přidán',prev?{label:'Zpět',fn:()=>{const cur=findDay(date);if(cur){Object.assign(cur,prev);touch(cur);if(date===todayISO())fillTodayForm(cur);persist();refreshLists()}}}:undefined);
    return;
  }
  if(sheetMode==='rem'){
    const text=(($('eRemText')&&$('eRemText').value)||'').trim();
    const date=$('eRemDate')&&$('eRemDate').value;
    const time=$('eRemTime')&&$('eRemTime').value;
    if(!text){toast('Napiš připomínku');return}
    const when=date?(date+'T'+(time||'09:00').slice(0,5)):null;
    const done=$('eRemDone')?!!$('eRemDone').checked:false;
    if(sheetTarget){
      const r=sheetTarget,copy=JSON.parse(JSON.stringify(r));
      r.text=text;r.when=when;r.done=done;touch(r);
      persist();closeSheet();refreshLists();
      undoRestore(r,copy,'Připomínka uložena');
    }else{
      reminders.push(normalizeRem({id:uid('r'),text,when,done:false,created:todayISO()}));
      persist();closeSheet();refreshLists();
      toast('Připomínka přidána');
    }
    return;
  }
  if(sheetMode==='exp'){
    const date=$('eExpDate')&&$('eExpDate').value,what=(($('eExpWhat')&&$('eExpWhat').value)||'').trim(),amt=Number($('eExpCzk')&&$('eExpCzk').value);
    if(!date||!what||!isFinite(amt)){toast('Doplň den, za co a částku');return}
    if(sheetTarget){
      const e=sheetTarget,copy=JSON.parse(JSON.stringify(e));
      e.date=date;e.what=what;e.czk=amt;touch(e);
      persist();closeSheet();refreshLists();
      undoRestore(e,copy,'Výdaj uložen');
    }else{
      expenses.push(touch(normalizeExp({id:uid('e'),date,what,czk:amt})));
      persist();closeSheet();refreshLists();
      toast('Výdaj přidán');
    }
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
    t.text=text;t.cat=draft.cat;t.bucket=draft.bucket;t.status=draft.status;t.note=note;t.due=draft.due||'';t.repeat=draft.repeat||'';touch(t);
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
  const soft=kind=>{
    const target=sheetTarget;if(!target)return;
    const copy=JSON.parse(JSON.stringify(target));
    target.deleted=true;touch(target);
    if(kind==='day'&&target.date===todayISO()){if($('from1')){todayFormDirty=false;['from1','to1','from2','to2','work','expWhat','expCzk'].forEach(id=>{if($(id))$(id).value=''});if($('lunch'))$('lunch').checked=true;updateTotal();todayFormFilledSig=todayFormSigFromDom()}}
    persist();closeSheet();refreshLists();
    toast(({task:'Úkol smazán',day:'Den smazán',rem:'Připomínka smazána',exp:'Výdaj smazán',note:'Poznámka smazána'})[kind]||'Smazáno',{label:'Zpět',fn:()=>{target.deleted=false;touch(target);if(kind==='day'&&target.date===todayISO())fillTodayForm(target);persist();refreshLists()}});
  };
  if(sheetMode==='task'&&sheetTarget)return soft('task');
  if(sheetMode==='day'&&sheetTarget)return soft('day');
  if(sheetMode==='rem'&&sheetTarget)return soft('rem');
  if(sheetMode==='exp'&&sheetTarget)return soft('exp');
};

/* ---------- Dnes task + reminder quick UI ---------- */
function todayTaskList(){
  const open=tasks.filter(t=>isLive(t)&&t.status!=='done');
  const due=sortDue(open.filter(isDueSoon));
  const dueIds=new Set(due.map(t=>t.id));
  const soon=open.filter(t=>!dueIds.has(t.id)&&(t.bucket==='tomorrow'||t.status==='wip'));
  const rest=soon.length?soon:open.filter(t=>!dueIds.has(t.id)).slice(0,8);
  const box=$('todayTasks');box.innerHTML='';
  if(!due.length&&!rest.length){box.innerHTML=emptyState('✓','Na teď máš hotovo','Nový úkol přidáš tlačítkem +',{id:'task',label:'Přidat úkol'});bindEmptyButtons(box);return}
  if(due.length)appendGroup(box,'Dnes / po termínu',due.map(t=>taskCard(t)));
  if(rest.length)appendGroup(box,due.length?'Další': '',rest.map(t=>taskCard(t)));
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
  if(!date||!time){const q=parseQuick(text);if(!date&&q.date)date=q.date;if(!time&&q.time)time=q.time}
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
  d.querySelector('.chk').onclick=ev=>{ev.stopPropagation();toggleRemDone(r)};
  d.querySelector('.chk').setAttribute('aria-label',(r.done?'Vrátit: ':'Hotovo: ')+r.text);
  const rb=d.querySelector('.body');rb.onclick=()=>openRemSheet(r);rb.setAttribute('role','button');rb.tabIndex=0;rb.onkeydown=ev=>{if(ev.key==='Enter'){ev.preventDefault();openRemSheet(r)}};
  attachSwipe(d,{right:{label:r.done?'Vrátit':'Hotovo',fn:()=>toggleRemDone(r)},left:{label:'Smazat',fn:()=>softDelete(r,'rem')}});
  return d;
}
function upcomingRems(){
  const now=todayISO()+'T00:00';
  return reminders.filter(r=>isLive(r)&&!r.done).sort((a,b)=>{
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
  const a=upcomingRems(),b=reminders.filter(r=>isLive(r)&&r.done).sort((x,y)=>String(y.when||'').localeCompare(String(x.when||'')));
  if(!a.length){up.innerHTML=emptyState('🔔','Žádné připomínky','Napiš třeba „zítra v 8:00 zavolat dodavateli“',{id:'rem',label:'Přidat připomínku'});bindEmptyButtons(up)}
  else a.forEach(r=>up.appendChild(remCard(r)));
  if(!b.length)dn.innerHTML='<p class="muted es-inline">Zatím žádné hotové.</p>';
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
function sortedNotes(){return notes.filter(isLive).slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||''))||String(b.id).localeCompare(String(a.id)))}
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
    if(n){n.text=text;n.tag=tag;n.updated=nowStamp();touch(n)}
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
  const copy=JSON.parse(JSON.stringify(n));
  n.deleted=true;touch(n);
  if(noteEditId===n.id)clearNoteComposer();
  persist();refreshLists();
  toast('Poznámka smazána',{label:'Zpět',fn:()=>{n.deleted=false;touch(n);persist();refreshLists()}});
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
    attachSwipe(d,{right:{label:'Na úkol',color:'var(--wip)',fn:()=>openNoteTaskSheet(n)},left:{label:'Smazat',fn:()=>deleteNote(n)}});
  }else{
    d.style.cursor='pointer';
    d.onclick=()=>startEditNote(n);
  }
  return d;
}
function renderNotes(){
  if(!speechAvailable())setDictHint('klepni na mikrofon na klávesnici a diktuj');
  else if(!recOn)setDictHint('');
  const list=$('noteList'),empty=$('noteEmpty');
  list.innerHTML='';
  const arr=sortedNotes();
  if(!arr.length){empty.hidden=false;empty.innerHTML=emptyState('✎','Zatím žádné poznámky','Napiš nebo nadiktuj, co tě napadne. Ukládá se samo.');return}
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
    oc.hidden=true;
    const ok=$('onboardOk');
    if(ok)ok.onclick=()=>{settings.seenOnboard=true;persist();oc.hidden=true};
  }
  todayTaskList();
  renderQuickBucket();
  remChipBar($('remChips'),$('remDate'),$('remTime'));
  renderTodayRems();
  renderTodayNotes();
  updateTotal();
}

/* ---------- Docházka overview ---------- */
function renderDochazka(){
  const [y,m]=monthYM.split('-').map(Number);
  $('monthTitle').textContent=MONTHS[m-1]+' '+y;
  if($('pickDay')&&editDayDate)$('pickDay').value=editDayDate;
  const list=days.filter(d=>isLive(d)&&d.date.startsWith(monthYM)).sort((a,b)=>a.date.localeCompare(b.date));
  const exp=expenses.filter(e=>isLive(e)&&e.date.startsWith(monthYM)).sort((a,b)=>a.date.localeCompare(b.date));
  const billMin=list.reduce((a,d)=>a+dayMin(d),0),expSum=exp.reduce((a,e)=>a+e.czk,0);
  $('monthMetrics').innerHTML=
    metric(fmt(billMin),'Odpracováno')+metric(czk(pay(billMin)),'Práce ('+settings.rate+' Kč/h)')+
    metric(czk(expSum),'Ostatní náklady')+metric(czk(pay(billMin)+expSum),'Celkem k fakturaci');
  const wds=workdaysInMonth(monthYM);
  const hols=Object.entries(holidaysInYear(y)).filter(([s])=>s.startsWith(monthYM)).sort((a,b)=>a[0].localeCompare(b[0]));
  const liveDays=days.filter(isLive);const startTrack=liveDays.length?liveDays.map(d=>d.date).sort()[0]:monthYM+'-01';
  const today=todayISO();
  const missing=wds.filter(s=>s<today&&s>=startTrack&&!findDay(s));
  let wdHtml='<div class="rowline"><div>Pracovních dnů v měsíci: <b>'+wds.length+'</b><div class="muted">Bez víkendů a státních svátků</div></div><div class="amt">zapsáno '+list.length+'</div></div>';
  hols.forEach(([s,n])=>{wdHtml+='<div class="rowline"><div><b>'+esc(czDateLong(s))+'</b><div class="muted">'+esc(n)+'</div></div><span class="badge">svátek</span></div>'});
  missing.forEach(s=>{wdHtml+='<div class="rowline missing"><div><b>'+esc(czDateLong(s))+'</b><div class="muted">Chybí zápis</div></div><span class="badge warn">dopsat</span></div>'});
  if(!hols.length&&!missing.length)wdHtml+='<p class="muted" style="margin:8px 0 0">Žádný svátek ani chybějící pracovní den.</p>';
  $('monthWorkdays').innerHTML=wdHtml;
  $('monthWorkdays').querySelectorAll('.rowline.missing').forEach((row,i)=>{row.style.cursor='pointer';row.onclick=()=>openDaySheet(missing[i])});
  const box=$('monthDays');box.innerHTML='';
  if(!list.length)box.innerHTML='<div class="card muted">V tomhle měsíci zatím nic není.</div>';
  list.forEach(d=>{
    const b=document.createElement('button');b.type='button';b.className='day'+(d.nonbillable?' nb':'');
    const when=(d.spans||[]).map(([f,t])=>f+'–'+t).join(', ');
    const areas=(d.areas||[]).map(a=>AREAS[a]||a).filter(Boolean).join(', ');
    const title=d.work.length?d.work.join(' · '):(d.nonbillable?'Mimo SAPEKOR':'Bez popisu');
    b.innerHTML='<div class="lead"><b>'+esc(czDateLong(d.date))+'</b><span class="meta">'+(d.nonbillable?'nefakturuje se':fmt(d.worked_min)+' · '+czk(pay(dayMin(d))))+'</span></div>'+
      '<div class="title">'+esc(title)+'</div>'+(when||areas||d.notes?'<div class="detail">'+esc([when,areas,d.notes].filter(Boolean).join(' · '))+'</div>':'');
    b.onclick=()=>openDaySheet(d.date,d);
    box.appendChild(b);
  });
  const expBox=$('monthExp'),expTitle=$('monthExpTitle');
  if(!exp.length){expTitle.hidden=true;expBox.innerHTML=''}
  else{
    expTitle.hidden=false;
    expBox.innerHTML='';
    const card=document.createElement('div');card.className='card';
    exp.forEach(e=>{
      const row=document.createElement('button');row.type='button';row.className='rowline exp-row';
      row.innerHTML='<div><b>'+esc(czDate(e.date))+'</b><div class="muted">'+esc(e.what)+'</div></div><div class="amt">'+czk(e.czk)+'</div>';
      row.onclick=()=>openExpSheet(e);
      card.appendChild(row);
    });
    const tot=document.createElement('div');tot.className='bill-total';tot.innerHTML='<span>Celkem výdaje</span><span>'+czk(expSum)+'</span>';
    card.appendChild(tot);
    expBox.appendChild(card);
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
$('prevMonth').onclick=()=>{const d=parseISO(monthYM+'-01');d.setMonth(d.getMonth()-1);monthYM=toISO(d).slice(0,7);if(!String(editDayDate||'').startsWith(monthYM))editDayDate=monthYM+'-01';renderDochazka()};
$('nextMonth').onclick=()=>{const d=parseISO(monthYM+'-01');d.setMonth(d.getMonth()+1);monthYM=toISO(d).slice(0,7);if(!String(editDayDate||'').startsWith(monthYM))editDayDate=monthYM+'-01';renderDochazka()};
if($('prevDay'))$('prevDay').onclick=()=>setEditDayDate(addDays(editDayDate||todayISO(),-1));
if($('nextDay'))$('nextDay').onclick=()=>setEditDayDate(addDays(editDayDate||todayISO(),1));
if($('pickDay'))$('pickDay').onchange=()=>{if($('pickDay').value)setEditDayDate($('pickDay').value)};
if($('editPickedDay'))$('editPickedDay').onclick=()=>openDaySheet($('pickDay')&&$('pickDay').value||editDayDate||todayISO());

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
const INBOX_KEY_ALIASES=['den_inbox_key','den_passphrase','den_key','kompas_inbox_key'];
const TOKEN_KEY_ALIASES=['den_sync_token','den_github_token','den_pat','kompas_sync_token'];
const credMem={token:'',pass:''};
function readLocalRaw(k){
  try{
    const raw=localStorage.getItem(k);
    if(raw==null||raw==='')return '';
    try{
      const v=JSON.parse(raw);
      if(v==null||v===false)return '';
      return String(v);
    }catch(e){return String(raw)}
  }catch(e){return ''}
}
function readCred(aliases,memKey){
  if(credMem[memKey])return credMem[memKey];
  for(let i=0;i<aliases.length;i++){
    const v=String(readLocalRaw(aliases[i])||'').trim();
    if(v){credMem[memKey]=v;return v}
  }
  return '';
}
function writeCred(primary,aliases,memKey,v){
  const s=String(v||'').trim();
  if(!s)return false;
  credMem[memKey]=s;
  save(primary,s);
  idbSet(primary,s);
  requestPersist();
  return true;
}
function getInboxKeyRaw(){return readCred(INBOX_KEY_ALIASES,'pass')}
function setInboxKeyRaw(v){
  const s=String(v||'').trim();
  if(!s)return false;
  return writeCred('den_inbox_key',INBOX_KEY_ALIASES,'pass',s);
}
function getInboxKey(){return normalizeInboxKey(getInboxKeyRaw())}
const CRED_DB='kompas-creds',CRED_STORE='kv';
function idbOpen(){
  return new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(new Error('idb-timeout')),1500);
    try{
      const req=indexedDB.open(CRED_DB,1);
      req.onupgradeneeded=()=>{try{req.result.createObjectStore(CRED_STORE)}catch(e){}};
      req.onsuccess=()=>{clearTimeout(t);resolve(req.result)};
      req.onerror=()=>{clearTimeout(t);reject(req.error||new Error('idb'))};
      req.onblocked=()=>{clearTimeout(t);reject(new Error('idb-blocked'))};
    }catch(e){clearTimeout(t);reject(e)}
  });
}
async function idbSet(k,v){
  try{
    const db=await idbOpen();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(CRED_STORE,'readwrite');
      tx.objectStore(CRED_STORE).put(v,k);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    });
  }catch(e){}
}
async function idbGet(k){
  try{
    const db=await idbOpen();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(CRED_STORE,'readonly');
      const r=tx.objectStore(CRED_STORE).get(k);
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
  }catch(e){return undefined}
}
function requestPersist(){
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
}
function hasSyncCreds(){return !!(getSyncToken()&&getInboxKey())}
function updatePairBanner(){
  const el=$('pairBanner');if(!el)return;
  el.hidden=hasSyncCreds();
}
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
    snap:load('den_snap',null),pending_mails:load('den_pending_mails',[])
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
  try{localStorage.removeItem('den_lock')}catch(e){}
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
    const r=await shareOrDownload(file.blob,file.name,APP_NAME+' záloha');
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
  }catch(e){toast('Soubor nejde otevřít. Zkontroluj kód a že je to záloha '+APP_NAME+'.')}
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
  const catsBefore=new Set(customCats.map(c=>c.id));
  ingestCategories(data.kategorie||data.categories||[]);
  return{
    kategorie:customCats.filter(c=>!catsBefore.has(c.id)),
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
    if(ex&&ex.status!=='done'){ex.prevStatus=ex.status;ex.status='done';ex.doneAt=todayISO();touch(ex);n.done++}
  });
  p.reminders.forEach(r=>{
    const i=reminders.findIndex(a=>a.id===r.id||fpRem(a)===fpRem(r));
    if(i>=0)return;
    reminders.push(r);n.reminders++;
  });
  p.poznamky.forEach(note=>{
    const i=notes.findIndex(a=>a.id===note.id||fpNote(a)===fpNote(note));
    if(i>=0)return;
    notes.push(note);n.poznamky++;
  });
  p.days.forEach(d=>{
    const ex=days.find(a=>a.date===d.date);
    if(ex)return;
    days.push(d);n.days++;
  });
  p.expenses.forEach(e=>{
    const ex=expenses.find(a=>a.id===e.id||fpExp(a)===fpExp(e)||(a.date===e.date&&a.what===e.what));
    if(ex)return;
    expenses.push(e);n.expenses++;
  });
  p.invoices.forEach(e=>{
    if(invoices.find(a=>a.id===e.id||fpExp(a)===fpExp(e)))return;
    invoices.push(e);
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
  if(getSyncToken()&&!syncFirstMerged)return;
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
    dedupeAll();
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
  if($('sheetSave')){$('sheetSave').hidden=false;$('sheetSave').textContent='Hotovo'}
  const linked=hasSyncCreds();
  const cur=$('syncStatus');
  $('sheetBody').innerHTML=
    '<div class="set-card">'+
      '<div class="set-row"><span class="lbl">Synchronizace</span><span id="setSyncState" class="'+esc(cur?cur.className:'sync-status')+'">'+esc(cur?cur.textContent:'')+'</span></div>'+
      '<p class="muted small">'+(linked?'Vše se ukládá a stahuje samo – při každé změně i při otevření aplikace. Aplikace se sama aktualizuje.':'Kompas zatím není propojený s úložištěm.')+'</p>'+
      (linked?'<button type="button" class="primary" id="devLinkBtn">Přidat další zařízení</button>':'<button type="button" class="primary" id="linkNowBtn">Propojit</button>')+
    '</div>'+
    '<div class="field"><span class="lbl">Kategorie</span><div class="cat-admin" id="catAdmin"></div></div>'+
    '<div class="field"><span class="lbl">Fakturace</span></div>'+
    '<div class="field"><label for="sBilled">Vyfakturováno do (včetně)</label><input type="date" id="sBilled" value="'+esc(settings.billedUntil)+'"></div>'+
    '<div class="field"><label for="sSpecial">Konec přechodného období</label><input type="date" id="sSpecial" value="'+esc(settings.specialEnd)+'"><div class="muted small">Teď 16. 10. – 30. 11. 2026, potom celé kalendářní měsíce.</div></div>'+
    '<div class="field"><label for="sRate">Hodinovka v Kč</label><input type="number" id="sRate" min="0" step="1" inputmode="numeric" value="'+esc(settings.rate)+'"></div>'+
    '<div class="field"><span class="lbl">Záloha</span><div class="muted small">Šifrovaná záloha všech dat do souboru.</div></div>'+
    '<button type="button" class="secondary" id="backupExport">Stáhnout / sdílet zálohu</button>'+
    '<button type="button" class="secondary" id="backupImport">Obnovit ze souboru</button>'+
    '<details class="advanced" id="advBox"><summary>Pokročilé</summary>'+
      '<div class="field"><label for="sInboxKey">Kód pro IS BOTa</label><input type="text" id="sInboxKey" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" value="'+esc(getInboxKeyRaw())+'"></div>'+
      (inboxHint?'<p class="muted" id="inboxHintLine">'+esc(inboxHint)+'</p>':'')+
      '<div class="field"><label for="sSyncToken">Token úložiště</label><input type="password" id="sSyncToken" autocomplete="off" spellcheck="false" placeholder="'+(getSyncToken()?'Token je uložený – nový zadej jen při změně':'github_pat_…')+'"><div class="muted small" id="sTokenHint">'+(getSyncToken()?'Token je uložený na tomto zařízení.':'')+'</div></div>'+
      '<button type="button" class="secondary" id="syncNowBtn">Synchronizovat teď</button>'+
      '<button type="button" class="secondary" id="pairShareBtn">Spárovat přes QR a PIN</button>'+
      '<button type="button" class="secondary" id="pairAcceptBtn">Vložit odkaz nebo data</button>'+
      '<button type="button" class="secondary" id="forceUpdate">Aktualizovat aplikaci</button>'+
      '<p class="muted small">Kompas '+esc(APP_LABEL)+'</p>'+
    '</details>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  on('forceUpdate',forceRefreshApp);
  on('backupExport',()=>exportBackup());
  on('backupImport',()=>{const f=$('backupFile');if(f)f.click()});
  on('devLinkBtn',openDeviceLink);
  on('linkNowBtn',()=>{closeSheet();try{sessionStorage.removeItem('kompas_welcome_skip')}catch(e){}showWelcome()});
  on('syncNowBtn',()=>{const cred=saveCredsFromForm();if(!cred.ok){toast(cred.err);setSyncStatus('warn',cred.err);return}closeSheet();syncNow('manual')});
  on('pairShareBtn',()=>{const cred=saveCredsFromForm();if(!cred.ok){toast(cred.err);return}if(!hasSyncCreds()){toast('Kompas zatím není propojený');return}openPairShare()});
  on('pairAcceptBtn',()=>{closeSheet();startPasteImport()});
  const autosave=()=>{
    const b=$('sBilled').value,sp=$('sSpecial').value,r=Number($('sRate').value);
    if(!b||!sp||!isFinite(r)||r<0)return;
    if(settings.billedUntil===b&&settings.specialEnd===sp&&Number(settings.rate)===r)return;
    settings.billedUntil=b;settings.specialEnd=sp;settings.rate=r;touch(settings);persist();
    if(view==='dochazka')renderDochazka();updateTotal();toast('Uloženo');
  };
  ['sBilled','sSpecial','sRate'].forEach(id=>{const el=$(id);if(el)el.addEventListener('change',autosave)});
  bindCredFields();
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
  const n=tasks.filter(t=>isLive(t)&&t.cat===cat.id).length;
  if(!confirm('Smazat kategorii „'+cat.name+'“?'+(n?' Úkoly ('+n+') se přesunou do Ostatní.':'')))return;
  const moved=tasks.filter(t=>t.cat===cat.id).map(t=>({t,cat:t.cat}));
  const copy=JSON.parse(JSON.stringify(cat));
  tasks.forEach(t=>{if(t.cat===cat.id){t.cat='ost';touch(t)}});
  cat.deleted=true;touch(cat);
  if(taskFilter===cat.id)taskFilter='all';
  persist();
  closeSheet();
  renderTasks();renderDnes();
  if(catEditFromSettings)openSettings();
  toast('Kategorie smazána',{label:'Zpět',fn:()=>{Object.assign(cat,copy,{deleted:false});touch(cat);moved.forEach(x=>{x.t.cat=x.cat;touch(x.t)});persist();renderTasks();renderDnes();if(catEditFromSettings)openSettings()}});
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
  dedupeAll();
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
  if(extractSetupPacked(text)){acceptPasted(text);return}
  const packed=extractPairPacked(text);
  if(packed){openPairAccept(text,packed);return}
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
  if(extractSetupPacked(text)){closeImportSheet();acceptPasted(text);return}
  const packed=extractPairPacked(text);
  if(packed){closeImportSheet();openPairAccept(text,packed);return}
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
  const o={id:t.id,t:t.text,c:t.cat,b:t.bucket,updatedAt:itemUpdatedAt(t)||Date.now()};
  if(t.note)o.n=t.note;
  if(t.status&&t.status!=='open')o.s=t.status;
  if(t.due)o.due=t.due;
  if(t.repeat)o.r=t.repeat;
  if(t.deleted)o.deleted=true;
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
  const deleted=[];
  tasks.forEach(t=>{
    const p=snapTasks.get(t.id);
    if(t.deleted){if(!p||!p.deleted)deleted.push(taskWire(t));return}
    if(!p){
      if(t.status==='done')done.push(taskWire(t));
      else neu.push(taskWire(t));
    }else if(p.s!=='done'&&t.status==='done')done.push(taskWire(t));
    else if(p.t!==t.text||p.c!==t.cat||p.b!==t.bucket||(p.n||'')!==(t.note||'')||p.s!==t.status||(p.due||'')!==(t.due||'')||(p.r||'')!==(t.repeat||'')||!!p.deleted){
      changed.push(taskWire(t));
    }
  });
  (snap&&snap.tasks||[]).forEach(p=>{if(p&&p.id&&!tasks.some(t=>t.id===p.id))deleted.push({id:p.id,deleted:true,updatedAt:Date.now()});});
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
  return{date,sync:'delta',dochazka,ukoly:{new:neu,done,changed,deleted},pripominky,poznamky,notes:notesOut,kategorie,items:{tasks:neu.concat(changed,done,deleted),reminders:pripominky,notes:poznamky,categories:kategorie}};
}
function hasChanges(p){
  return !!(p.sync==='full'||p.dochazka||p.ukoly.new.length||p.ukoly.done.length||p.ukoly.changed.length||(p.ukoly.deleted&&p.ukoly.deleted.length)||p.pripominky.length||(p.poznamky&&p.poznamky.length)||p.notes||(p.kategorie&&p.kategorie.length));
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
  if(p.ukoly.done.length){L.push('Hotovo:');p.ukoly.done.forEach(t=>L.push('- '+(typeof t==='string'?t:(t.t||t.text||''))));L.push('')}
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
  const base={date:p.date,dochazka:null,ukoly:{new:[],done:[],changed:[],deleted:[]},pripominky:[],poznamky:[],kategorie:[],notes:''};
  if(p.dochazka||p.notes||(p.poznamky&&p.poznamky.length)||(p.kategorie&&p.kategorie.length))chunks.push(Object.assign({},base,{dochazka:p.dochazka,notes:p.notes,poznamky:p.poznamky||[],kategorie:p.kategorie||[]}));
  const take=()=>({date:p.date,dochazka:null,ukoly:{new:[],done:[],changed:[],deleted:[]},pripominky:[],poznamky:[],kategorie:[],notes:''});
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
  const pushDel=arr=>{(arr||[]).forEach(item=>{const probe=JSON.parse(JSON.stringify(cur));probe.ukoly.deleted=(probe.ukoly.deleted||[]).concat([item]);if(fit(probe))cur=probe;else{if(hasChanges(cur))chunks.push(cur);cur=take();cur.ukoly.deleted=[item]}})};
  pushList('new',p.ukoly.new);pushList('done',p.ukoly.done);pushList('changed',p.ukoly.changed);pushDel(p.ukoly.deleted);pushList('pripominky',p.pripominky);pushList('poznamky',p.poznamky||[]);
  if(hasChanges(cur))chunks.push(cur);
  if(!chunks.length)chunks.push(p);
  const n=chunks.length;
  return chunks.map((c,i)=>packBody(dateLabel,Object.assign({},c,{_human:humanSummary(c)}),i+1,n));
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

/* Pick one winner among copies: newest edit, then live over deleted, then smallest id (same on every device). */
function betterCopy(a,b){
  const ua=itemUpdatedAt(a),ub=itemUpdatedAt(b);
  if(ua!==ub)return ua>ub?a:b;
  if(!!a.deleted!==!!b.deleted)return a.deleted?b:a;
  return String(a.id||'')<=String(b.id||'')?a:b;
}
function dedupeBy(list,keyFn){
  const map=new Map(),order=[];
  (list||[]).forEach(it=>{
    if(!it)return;
    const k=keyFn(it);
    if(!k){order.push({it});return}
    const cur=map.get(k);
    if(!cur){const slot={it};map.set(k,slot);order.push(slot);return}
    cur.it=betterCopy(cur.it,it);
  });
  return order.map(s=>s.it);
}
function dedupeList(list,fpFn){return dedupeBy(dedupeBy(list,x=>x.id),fpFn)}
function dedupeAll(){
  const n=()=>expenses.length+invoices.length+notes.length+reminders.length+days.length+tasks.length;
  const before=n();
  tasks=dedupeBy(tasks,x=>x.id);
  days=dedupeBy(days,x=>x.date||x.id);
  expenses=dedupeList(expenses,fpExp);
  invoices=dedupeList(invoices,fpExp);
  notes=dedupeList(notes,fpNote);
  reminders=dedupeList(reminders,fpRem);
  return before-n();
}
function mergeAppliedInbox(remote){
  if(!Array.isArray(remote)||!remote.length)return;
  const cur=loadAppliedInbox().map(String),seen=new Set(cur);
  let add=false;remote.forEach(x=>{const s=String(x);if(s&&!seen.has(s)){seen.add(s);cur.push(s);add=true}});
  if(add)saveAppliedInbox(cur);
}
function mergeById(local, remote, keyFn){
  const map=new Map();
  const order=[];
  const put=it=>{
    if(!it)return;
    const k=keyFn(it);if(!k)return;
    const cur=map.get(k);
    if(!cur){map.set(k,it);order.push(k);return}
    if(itemUpdatedAt(it)>itemUpdatedAt(cur))map.set(k,it);
  };
  (local||[]).forEach(put);
  (remote||[]).forEach(put);
  return order.map(k=>map.get(k));
}
function mergeRemoteState(data){
  if(!data||typeof data!=='object')return 0;
  const before=JSON.stringify({t:tasks,d:days,e:expenses,i:invoices,r:reminders,n:notes,s:settings,c:customCats});
  const srcTasks=(data.tasks||[]).map(normalizeTask).filter(Boolean);
  const srcDays=(data.days||[]).map(normalizeDay).filter(Boolean);
  const srcExp=(data.expenses||[]).map(normalizeExp).filter(Boolean);
  const srcInv=(data.invoices||[]).map(normalizeExp).filter(Boolean);
  const srcRem=(data.reminders||[]).map(normalizeRem).filter(Boolean);
  const srcNotes=(data.notes||data.poznamky||[]).map(normalizeNote).filter(Boolean);
  const srcCats=(data.categories||data.kategorie||[]).map(normalizeCategory).filter(Boolean);
  tasks=mergeById(tasks,srcTasks,x=>x.id);
  days=mergeById(days,srcDays,x=>x.date||x.id);
  expenses=mergeById(expenses,srcExp,x=>x.id);
  invoices=mergeById(invoices,srcInv,x=>x.id);
  reminders=mergeById(reminders,srcRem,x=>x.id);
  notes=mergeById(notes,srcNotes,x=>x.id);
  dedupeAll();
  mergeAppliedInbox(data.applied);
  if(srcCats.length)customCats=mergeById(customCats,srcCats,x=>x.id);
  if(data.settings&&typeof data.settings==='object'){
    if(itemUpdatedAt(data.settings)>=itemUpdatedAt(settings))settings=Object.assign({},settings,data.settings);
  }
  syncApplying=true;persist();syncApplying=false;
  const after=JSON.stringify({t:tasks,d:days,e:expenses,i:invoices,r:reminders,n:notes,s:settings,c:customCats});
  return before===after?0:1;
}
const SYNC_OWNER='FilipKubicny',SYNC_REPO='den-data',SYNC_PATH='state.enc';
function getSyncToken(){return readCred(TOKEN_KEY_ALIASES,'token')}
function setSyncToken(v){
  const s=String(v||'').trim();
  if(!s)return false;
  return writeCred('den_sync_token',TOKEN_KEY_ALIASES,'token',s);
}
function looksLikeToken(s){return /^(github_pat_|ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{8,}$/.test(String(s||'').trim())}
function looksLikeInboxKey(s){return normalizeInboxKey(s).length>=12}
function updateTokenHint(){
  const el=$('sTokenHint');if(!el)return;
  el.textContent=getSyncToken()?'Token je uložený na tomto zařízení.':'';
  const inp=$('sSyncToken');
  if(inp&&!inp.value)inp.placeholder=getSyncToken()?'Token je uložený – nový zadej jen při změně':'github_pat_…';
}
function fillSettingsCreds(){
  const key=$('sInboxKey');
  if(key&&getInboxKeyRaw()&&!String(key.value||'').trim())key.value=getInboxKeyRaw();
  updateTokenHint();
}
function saveCredsFromForm(){
  const tok=$('sSyncToken')?String($('sSyncToken').value||'').trim():'';
  const key=$('sInboxKey')?String($('sInboxKey').value||'').trim():'';
  if(tok){
    if(!looksLikeToken(tok))return {ok:false,err:'Token úložiště nemá správný tvar'};
    setSyncToken(tok);
    if($('sSyncToken'))$('sSyncToken').value='';
  }
  if(key){
    if(normalizeInboxKey(key).length<8)return {ok:false,err:'Kód pro IS BOTa je moc krátký'};
    setInboxKeyRaw(key);
  }
  updatePairBanner();
  updateTokenHint();
  return {ok:true};
}
function bindCredFields(){
  const key=$('sInboxKey'),tok=$('sSyncToken');
  const onBlur=()=>{
    const t=tok?String(tok.value||'').trim():'';
    const k=key?String(key.value||'').trim():'';
    if(!t&&!k)return;
    const r=saveCredsFromForm();
    if(!r.ok)setInboxHint(r.err);
  };
  const onInput=()=>{
    const t=tok?String(tok.value||'').trim():'';
    const k=key?String(key.value||'').trim():'';
    if(t&&looksLikeToken(t)){setSyncToken(t);updateTokenHint()}
    if(k&&looksLikeInboxKey(k))setInboxKeyRaw(k);
  };
  ['blur','change'].forEach(ev=>{
    if(key)key.addEventListener(ev,onBlur);
    if(tok)tok.addEventListener(ev,onBlur);
  });
  if(key)key.addEventListener('input',onInput);
  if(tok)tok.addEventListener('input',onInput);
  fillSettingsCreds();
}
async function hydrateCreds(){
  requestPersist();
  getSyncToken();
  getInboxKeyRaw();
  try{
    const tok=await idbGet('den_sync_token');
    if(tok&&String(tok).trim()&&!getSyncToken())setSyncToken(String(tok).trim());
    else if(getSyncToken())idbSet('den_sync_token',getSyncToken());
    const key=await idbGet('den_inbox_key');
    if(key&&String(key).trim()&&!getInboxKeyRaw())setInboxKeyRaw(String(key).trim());
    else if(getInboxKeyRaw())idbSet('den_inbox_key',getInboxKeyRaw());
  }catch(e){}
  updatePairBanner();
  fillSettingsCreds();
}

const PAIR_TTL=30*60*1000;
function b64urlEncodeBytes(u){
  return bytesToB64(u).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlToBytes(s){
  s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  return b64toBytes(s);
}
function randomPin(){
  const n=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;
  return String(n).padStart(6,'0');
}
function pairBaseUrl(){
  return location.origin+location.pathname.replace(/index\.html$/,'');
}
function extractPairPacked(raw){
  const s=String(raw||'').trim();
  let m=s.match(/#pair=([A-Za-z0-9._\-]+)/);
  if(m)return m[1];
  m=s.match(/(?:^|[?&])pair=([A-Za-z0-9._\-]+)/);
  if(m)return m[1];
  if(/^v1\.[A-Za-z0-9._\-]+$/.test(s))return s;
  return '';
}
async function derivePinKey(pin,salt,usage){
  const enc=new TextEncoder();
  const material=await crypto.subtle.importKey('raw',enc.encode(String(pin)),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,[usage]);
}
async function encryptPairPayload(pin,obj){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derivePinKey(pin,salt,'encrypt');
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(obj)));
  return 'v1.'+b64urlEncodeBytes(salt)+'.'+b64urlEncodeBytes(iv)+'.'+b64urlEncodeBytes(new Uint8Array(ct));
}
async function decryptPairPayload(pin,packed){
  const parts=String(packed||'').split('.');
  if(parts[0]!=='v1'||parts.length!==4)throw new Error('format');
  const salt=b64urlToBytes(parts[1]),iv=b64urlToBytes(parts[2]),ct=b64urlToBytes(parts[3]);
  const key=await derivePinKey(pin,salt,'decrypt');
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,ct);
  return JSON.parse(new TextDecoder().decode(pt));
}
function isStandalonePwa(){
  try{
    if(window.navigator.standalone)return true;
    if(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)return true;
  }catch(e){}
  return false;
}
async function applyPairedCreds(token,pass){
  token=String(token||'').trim();
  pass=String(pass||'').trim();
  if(!token||!pass)throw new Error('empty');
  setSyncToken(token);
  setInboxKeyRaw(pass);
  try{sessionStorage.removeItem('den_pair_pending')}catch(e){}
  updatePairBanner();
  setSyncStatus('busy','Načítám…');
  await syncNow('init');
  if(isStandalonePwa())toast('Zařízení je spárované');
  else toast('V Safari je to uložené. V ikoně na ploše otevři Nastavení → Vložit párovací odkaz');
}
function renderQr(text,el){
  if(!el)return;
  el.innerHTML='';
  try{
    if(typeof qrcode!=='function')throw new Error('no qr');
    const qr=qrcode(0,'M');
    qr.addData(text,'Byte');
    qr.make();
    el.innerHTML=qr.createSvgTag(4,2);
    const svg=el.querySelector('svg');
    if(svg){
      const w=svg.getAttribute('width'),h=svg.getAttribute('height');
      if(!svg.getAttribute('viewBox')&&w&&h)svg.setAttribute('viewBox','0 0 '+parseInt(w,10)+' '+parseInt(h,10));
      svg.removeAttribute('width');svg.removeAttribute('height');
      svg.style.display='block';svg.style.width='100%';svg.style.height='auto';
    }
  }catch(e){
    el.innerHTML='<p class="muted">QR se nepodařilo vytvořit. Použij odkaz níže.</p>';
  }
}
async function openPairShare(){
  if(!hasSyncCreds()){toast('Nejdřív ulož token a kód pro IS BOTa');return}
  const pin=randomPin();
  const packed=await encryptPairPayload(pin,{t:getSyncToken(),k:getInboxKeyRaw(),exp:Date.now()+PAIR_TTL});
  const url=pairBaseUrl()+'#pair='+packed;
  sheetMode='pair-share';sheetTarget=null;
  $('sheetTitle').textContent='Připojit další zařízení';
  $('sheetDelete').hidden=true;
  if($('sheetSave'))$('sheetSave').hidden=true;
  $('sheetBody').innerHTML=
    '<p class="muted">Na druhém zařízení naskenuj QR kód nebo otevři odkaz a zadej tento kód. Odkaz platí 30 minut a nesdílej ho.</p>'+
    '<div class="pair-pin" id="pairPinShow">'+esc(pin)+'</div>'+
    '<p class="pair-pin-label">Kód pro druhé zařízení</p>'+
    '<div class="pair-qr" id="pairQr"></div>'+
    '<div class="field"><label for="pairLink">Odkaz</label><textarea id="pairLink" rows="3" readonly></textarea></div>'+
    '<button type="button" class="secondary" id="pairCopy">Kopírovat odkaz</button>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  const ta=$('pairLink');if(ta)ta.value=url;
  renderQr(url,$('pairQr'));
  const cp=$('pairCopy');
  if(cp)cp.onclick=async()=>{
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(url);
      else{ta.focus();ta.select();document.execCommand('copy')}
      toast('Odkaz je ve schránce');
    }catch(e){toast('Odkaz zkopíruj ručně')}
  };
}
function openPairAccept(prefill,packed){
  packed=packed||extractPairPacked(prefill||'')||'';
  try{if(packed)sessionStorage.setItem('den_pair_pending',packed)}catch(e){}
  sheetMode='pair-accept';sheetTarget=packed||null;
  $('sheetTitle').textContent='Spárovat zařízení';
  $('sheetDelete').hidden=true;
  if($('sheetSave')){$('sheetSave').hidden=false;$('sheetSave').textContent='Připojit'}
  $('sheetBody').innerHTML=
    '<p class="muted">Vlož odkaz z počítače (Nastavení → Připojit další zařízení) a šestimístný kód, který se tam ukázal.</p>'+
    '<div class="field"><label for="pairInLink">Odkaz</label><textarea id="pairInLink" rows="3" placeholder="https://…#pair=…"></textarea></div>'+
    '<div class="field"><label for="pairInPin">Šestimístný kód</label><input type="text" id="pairInPin" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="000000"></div>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  if($('pairInLink')){
    if(prefill)$('pairInLink').value=prefill;
    else if(packed)$('pairInLink').value=pairBaseUrl()+'#pair='+packed;
  }
  setTimeout(()=>{
    const pin=$('pairInPin'),link=$('pairInLink');
    if(link&&!String(link.value||'').trim())link.focus();
    else if(pin)pin.focus();
  },50);
}
async function submitPairAccept(){
  const raw=(($('pairInLink')&&$('pairInLink').value)||'').trim();
  const pin=(($('pairInPin')&&$('pairInPin').value)||'').replace(/\D/g,'');
  const packed=extractPairPacked(raw)||sheetTarget||'';
  if(!packed){toast('Vlož párovací odkaz');return}
  if(pin.length!==6){toast('Zadej šestimístný kód');return}
  try{
    const data=await decryptPairPayload(pin,packed);
    if(!data||!data.t||!data.k){toast('Odkaz je neplatný');return}
    if(data.exp&&Date.now()>Number(data.exp)){toast('Odkaz už neplatí, na počítači vytvoř nový');return}
    history.replaceState(null,'',location.pathname+location.search);
    closeSheet();
    await applyPairedCreds(data.t,data.k);
  }catch(e){
    toast('Špatný kód nebo odkaz, zkus znovu');
  }
}
async function handlePairLaunch(){
  let packed=extractPairPacked(location.hash)||extractPairPacked(location.href);
  if(!packed){
    try{packed=sessionStorage.getItem('den_pair_pending')||''}catch(e){packed=''}
  }
  if(!packed)return;
  history.replaceState(null,'',location.pathname+location.search);
  openPairAccept('',packed);
}

function setSyncStatus(kind,text){
  const el=$('syncStatus');if(!el)return;
  el.className='sync-status'+(kind?(' '+kind):'');
  el.textContent=text;
  const n=arr=>(arr||[]).filter(isLive).length;
  el.title=kind==='ok'?(czCount(n(tasks),'úkol','úkoly','úkolů')+', '+czCount(n(days),'den','dny','dní')+', '+czCount(n(notes),'poznámka','poznámky','poznámek')):text;
  const sb=$('sbSyncState');if(sb){sb.className='sync-status '+(kind||'');sb.textContent=text}
  const ss=$('setSyncState');if(ss){ss.className='sync-status '+(kind||'');ss.textContent=text}
}
function syncHeaders(){
  const h={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  const tok=getSyncToken();if(tok)h.Authorization='Bearer '+tok;
  return h;
}
function syncUrl(){return 'https://api.github.com/repos/'+SYNC_OWNER+'/'+SYNC_REPO+'/contents/'+SYNC_PATH}
function stableStringify(v){
  if(v===undefined)return 'null';
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(stableStringify).join(',')+']';
  const keys=Object.keys(v).filter(k=>v[k]!==undefined).sort();
  return '{'+keys.map(k=>JSON.stringify(k)+':'+stableStringify(v[k])).join(',')+'}';
}
function stripVolatile(x){
  if(!x||typeof x!=='object')return x;
  const o={};
  Object.keys(x).forEach(k=>{if(k==='updated'||x[k]===undefined)return;o[k]=x[k]});
  return o;
}
function sortByKey(arr,keyFn){return (arr||[]).slice().sort((a,b)=>String(keyFn(a)||'').localeCompare(String(keyFn(b)||''),'en'))}
function canonicalPayload(data){
  data=data||{};
  return {
    tasks:sortByKey((data.tasks||[]).map(stripVolatile),x=>x.id),
    days:sortByKey((data.days||[]).map(stripVolatile),x=>x.date||x.id),
    expenses:sortByKey((data.expenses||[]).map(stripVolatile),x=>x.id||((x.date||'')+'|'+(x.what||''))),
    invoices:sortByKey((data.invoices||[]).map(stripVolatile),x=>x.id||((x.date||'')+'|'+(x.what||''))),
    reminders:sortByKey((data.reminders||[]).map(stripVolatile),x=>x.id),
    notes:sortByKey((data.notes||data.poznamky||[]).map(stripVolatile),x=>x.id),
    categories:sortByKey((data.categories||data.kategorie||[]).map(stripVolatile),x=>x.id),
    settings:stripVolatile(data.settings&&typeof data.settings==='object'?data.settings:{}),
    applied:(data.applied||[]).map(String).sort()
  };
}
function contentHash(data){const s=stableStringify(canonicalPayload(data));return fnv1a(s)+':'+s.length}
function liveCloudPayload(){return {tasks,days,expenses,invoices,reminders,notes,settings,categories:customCats,applied:loadAppliedInbox()}}
function dumpCloudState(at){
  return {kind:'den-state',v:1,app:APP_VERSION,at:at||nowStamp(),tasks,days,expenses,invoices,reminders,notes,settings,categories:customCats,applied:loadAppliedInbox()};
}
function fetchTimeout(url,opts,ms){
  const c=new AbortController();
  const t=setTimeout(()=>c.abort(),ms||20000);
  return fetch(url,Object.assign({},opts||{},{signal:c.signal})).finally(()=>clearTimeout(t));
}
function isDecryptError(e){
  if(!e)return false;
  const n=String(e.name||''),m=String(e.message||'');
  return e.code==='decrypt'||n==='OperationError'||/decrypt|cipher|aes-gcm|the operation is not secure/i.test(n+' '+m);
}
function classifySyncError(e){
  if(e&&e.code==='offline')return {code:'offline',msg:'Jsi offline, uloží se později'};
  if(!navigator.onLine)return {code:'offline',msg:'Jsi offline, uloží se později'};
  if(!e)return {code:'fail',msg:'Synchronizace se nepovedla'};
  if(e.code==='auth'||e.status===401||e.status===403)return {code:'auth',msg:'Přístup k úložišti vypršel'};
  if(e.code==='nokey')return {code:'nokey',msg:'Doplň kód pro IS BOTa v Nastavení'};
  if(e.code==='notoken')return {code:'notoken',msg:'V Nastavení vlož token úložiště'};
  if(e.code==='conflict')return {code:'conflict',msg:'Ukládání se opakuje…'};
  if(e.code==='badstate')return {code:'fail',msg:'Stav z úložiště nejde přečíst'};
  if(isDecryptError(e))return {code:'decrypt',msg:'Kód pro IS BOTa nesedí'};
  if(e.name==='AbortError'||e.code==='timeout')return {code:'timeout',msg:'Vypršel čas, zkus to znovu'};
  if(e.name==='TypeError')return {code:'net',msg:'Síťová chyba, zkus to znovu'};
  return {code:'fail',msg:'Synchronizace se nepovedla'};
}
function czCount(n,one,few,many){
  n=Math.abs(Number(n)||0);
  const w=(n===1)?one:(n>=2&&n<=4)?few:many;
  return n+' '+w;
}
function syncCountText(){
  const n=arr=>(arr||[]).filter(isLive).length;
  return 'Uloženo ✓ · '+czCount(n(tasks),'úkol','úkoly','úkolů')+', '+czCount(n(days),'den','dny','dní')+', '+czCount(n(notes),'poznámka','poznámky','poznámek');
}
function showSyncOutcome(kind,text,alsoToast){
  setSyncStatus(kind,text);
  if(alsoToast)toast(text);
}
async function githubGetState(){
  let r;
  try{r=await fetchTimeout(syncUrl()+'?ref=main&t='+Date.now(),{cache:'no-store',headers:syncHeaders()})}
  catch(e){if(e&&e.name==='AbortError'){const err=new Error('timeout');err.code='timeout';throw err}throw e}
  if(r.status===404)return {missing:true};
  if(r.status===401||r.status===403){const err=new Error('auth');err.code='auth';err.status=r.status;throw err}
  if(!r.ok)throw new Error('get '+r.status);
  const j=await r.json();
  try{
    const raw=atob(String(j.content||'').replace(/\s/g,''));
    return {sha:j.sha,obj:JSON.parse(raw)};
  }catch(e){const err=new Error('bad-state');err.code='badstate';throw err}
}
async function githubPutState(enc,sha){
  const content=btoa(JSON.stringify(enc));
  const body={message:'Kompas: automatické uložení stavu',content,branch:'main'};
  if(sha)body.sha=sha;
  let r;
  try{r=await fetchTimeout(syncUrl(),{method:'PUT',cache:'no-store',headers:Object.assign({'Content-Type':'application/json'},syncHeaders()),body:JSON.stringify(body)})}
  catch(e){if(e&&e.name==='AbortError'){const err=new Error('timeout');err.code='timeout';throw err}throw e}
  if(r.status===409||r.status===422){const err=new Error('conflict');err.code='conflict';throw err}
  if(r.status===401||r.status===403){const err=new Error('auth');err.code='auth';throw err}
  if(!r.ok)throw new Error('put '+r.status);
  const j=await r.json();
  return (j.content&&j.content.sha)||sha;
}
function queueOutbox(enc){save('den_sync_outbox',{at:Date.now(),enc})}
function clearOutbox(){save('den_sync_outbox',null)}
function rememberRemote(data,sha){
  if(sha)syncSha=sha;
  if(data&&typeof data==='object'){syncRemoteHash=contentHash(data);syncRemoteAt=data.at||null}
}
async function pullAndMerge(){
  const key=getInboxKey();
  if(!getSyncToken()){updatePairBanner();const err=new Error('notoken');err.code='notoken';throw err}
  if(!key){const err=new Error('nokey');err.code='nokey';throw err}
  const got=await githubGetState();
  if(got.missing){syncRemoteHash=null;syncRemoteAt=null;syncFirstMerged=true;return 0}
  let data;
  try{data=await decryptInboxFile(got.obj,key)}
  catch(e){const err=new Error('decrypt');err.code='decrypt';throw err}
  if(!data||typeof data!=='object')return 0;
  rememberRemote(data,got.sha);
  const ch=mergeRemoteState(data);
  syncFirstMerged=true;
  return ch;
}
function localMatchesRemote(){
  return !!(syncRemoteHash&&contentHash(liveCloudPayload())===syncRemoteHash);
}
async function pushMerged(){
  const key=getInboxKey();
  if(!getSyncToken()||!key)return;
  if(localMatchesRemote()){clearOutbox();return}
  if(!navigator.onLine){queueOutbox(await encryptBackup(dumpCloudState(syncRemoteAt||nowStamp()),key));const err=new Error('offline');err.code='offline';throw err}
  setSyncStatus('busy','Ukládám…');
  let sha=syncSha;
  for(let attempt=0;attempt<3;attempt++){
    try{
      if(!sha){
        const got=await githubGetState();
        if(!got.missing){
          let data=null;
          try{data=await decryptInboxFile(got.obj,key)}
          catch(e){const err=new Error('decrypt');err.code='decrypt';throw err}
          if(data){
            rememberRemote(data,got.sha);
            mergeRemoteState(data);
            syncTodayFormFromState();
          }else{syncSha=got.sha}
          sha=got.sha;
        }
      }
      if(localMatchesRemote()){clearOutbox();return}
      const at=nowStamp();
      const enc=await encryptBackup(dumpCloudState(at),key);
      enc.kind='den-state-enc';
      queueOutbox(enc);
      const newSha=await githubPutState(enc,sha||undefined);
      rememberRemote(liveCloudPayload(),newSha);
      syncRemoteAt=at;
      clearOutbox();
      return;
    }catch(e){
      if(e&&e.code==='conflict'){syncSha=null;sha=null;continue}
      throw e;
    }
  }
  const err=new Error('conflict');err.code='conflict';throw err;
}
function renderPendingMail(){}
function scheduleSync(){
  if(!syncReady||syncApplying)return;
  if(!getSyncToken()){updatePairBanner();setSyncStatus('warn','Nepropojeno');return}
  if(!navigator.onLine){setSyncStatus('warn','Offline – uloží se později')}
  else setSyncStatus('busy','Ukládám…');
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>{syncNow('auto')},2000);
}
let syncWaiters=[];
async function syncNow(reason){
  const manual=reason==='manual';
  if(syncBusy){
    if(!manual)return;
    setSyncStatus('busy','Ještě probíhá synchronizace…');
    await new Promise(resolve=>syncWaiters.push(resolve));
    return syncNow(reason);
  }
  if(!getSyncToken()||!getInboxKey()){
    updatePairBanner();
    setSyncStatus('warn','Nepropojeno');
    if(manual)showWelcome();
    return;
  }
  syncBusy=true;
  try{
    setSyncStatus('busy',(reason==='pull'||reason==='init'||reason==='resume')?'Načítám…':'Ukládám…');
    const changed=await pullAndMerge();
    syncTodayFormFromState();
    if(changed)refreshLists();
    await pushMerged();
    const okText=syncCountText();
    setSyncStatus('ok','Uloženo ✓');
    if(manual||(changed&&reason!=='auto'&&reason!=='init'&&reason!=='resume'&&reason!=='visible'&&reason!=='focus'&&reason!=='pageshow'))toast(changed?'Data sladěna · '+okText:okText);
  }catch(e){
    const out=classifySyncError(e);
    const kind=out.code==='offline'||out.code==='net'||out.code==='nokey'||out.code==='notoken'?'warn':'err';
    showSyncOutcome(kind,out.msg,manual);
  }finally{
    syncBusy=false;
    const w=syncWaiters.splice(0);
    w.forEach(fn=>{try{fn()}catch(e){}});
  }
}
function pollState(reason){return syncNow(reason||'pull')}


function tableTasks(){
  if(taskTab==='all')return sortTasks(tasks.filter(t=>isLive(t)&&matchesCat(t)&&t.status!=='done')).concat(sortTasks(tasks.filter(t=>isLive(t)&&matchesCat(t)&&t.status==='done')));
  return visibleTasks();
}
function renderTaskTable(){
  const body=$('taskTableBody');if(!body)return;
  body.innerHTML='';
  const rows=tableTasks();
  rows.forEach(t=>{
    const c=catBy(t.cat),st=stBy(t.status),b=buckBy(t.bucket);
    const tr=document.createElement('tr');
    if(selectedIds.has(t.id))tr.classList.add('sel');
    tr.dataset.id=t.id;
    tr.innerHTML='<td class="col-check"><input type="checkbox" '+(selectedIds.has(t.id)?'checked':'')+' aria-label="Vybrat"></td>'+
      '<td class="task-name" data-col="text">'+esc(t.text)+'</td>'+
      '<td data-col="cat">'+esc(c.name)+'</td>'+
      '<td data-col="bucket">'+esc(b.name)+'</td>'+
      '<td data-col="due">'+esc(t.due?czDateSp(t.due):'')+'</td>'+
      '<td data-col="status">'+esc(st.name)+'</td>'+
      '<td data-col="note">'+esc(t.note||'')+'</td>';
    const cb=tr.querySelector('input[type=checkbox]');
    cb.onchange=()=>{if(cb.checked)selectedIds.add(t.id);else selectedIds.delete(t.id);syncBulkBar();tr.classList.toggle('sel',cb.checked)};
    tr.querySelectorAll('td[data-col]').forEach(td=>{
      td.onclick=ev=>{if(ev.target.tagName==='INPUT'||ev.target.tagName==='SELECT')return;startCellEdit(td,t,td.dataset.col)};
    });
    body.appendChild(tr);
  });
  const all=$('selAll');
  if(all){all.checked=rows.length>0&&rows.every(t=>selectedIds.has(t.id));all.indeterminate=rows.some(t=>selectedIds.has(t.id))&&!all.checked}
  syncBulkBar();
}
function syncBulkBar(){
  const bar=$('bulkBar');if(!bar)return;
  const n=selectedIds.size;
  bar.hidden=n===0;
  const lab=$('bulkCount');if(lab)lab.textContent=n+' vybraných';
}
function startCellEdit(td,task,col){
  if(td.querySelector('input,select'))return;
  const prev=td.textContent;
  let el;
  if(col==='cat'||col==='bucket'||col==='status'){
    el=document.createElement('select');el.className='cell-edit';
    const opts=col==='cat'?allCats():col==='bucket'?BUCKETS:STATUSES;
    const cur=col==='cat'?task.cat:col==='bucket'?task.bucket:task.status;
    opts.forEach(o=>{const op=document.createElement('option');op.value=o.id;op.textContent=o.name;if(o.id===cur)op.selected=true;el.appendChild(op)});
  }else if(col==='due'){
    el=document.createElement('input');el.type='date';el.className='cell-edit';el.value=task.due||'';
  }else{
    el=document.createElement('input');el.type='text';el.className='cell-edit';el.value=col==='text'?task.text:(task.note||'');
  }
  td.textContent='';td.appendChild(el);el.focus();if(el.select)el.select();
  const finish=ok=>{
    if(!el.parentNode)return;
    if(ok){
      if(col==='text'){const v=el.value.trim();if(!v){toast('Úkol musí mít název');return}task.text=v}
      else if(col==='note')task.note=el.value.trim();
      else if(col==='due')task.due=el.value||'';
      else if(col==='cat')task.cat=el.value;
      else if(col==='bucket')task.bucket=el.value;
      else if(col==='status'){
        if(task.status!=='done'&&el.value==='done'){task.prevStatus=task.status;task.doneAt=todayISO()}
        if(task.status==='done'&&el.value!=='done')task.doneAt='';
        task.status=el.value;
      }
      touch(task);persist();refreshLists();
    }else{td.textContent=prev}
  };
  el.onkeydown=ev=>{
    if(ev.key==='Enter'){ev.preventDefault();finish(true)}
    if(ev.key==='Escape'){ev.preventDefault();finish(false)}
  };
  el.onblur=()=>finish(true);
}
function selectedTasks(){return tasks.filter(t=>selectedIds.has(t.id)&&isLive(t))}
function bulkDone(){
  const list=selectedTasks();if(!list.length)return;
  list.forEach(t=>{if(t.status!=='done'){t.prevStatus=t.status;t.status='done';t.doneAt=todayISO();touch(t)}});
  persist();selectedIds.clear();refreshLists();toast('Označeno jako hotovo');
}
function bulkDelete(){
  const list=selectedTasks();if(!list.length)return;
  if(!confirm('Smazat '+list.length+' úkolů?'))return;
  list.forEach(t=>{t.deleted=true;touch(t)});
  persist();selectedIds.clear();refreshLists();toast('Smazáno');
}
function bindDesktopUi(){
  const news=$('deskNew');if(news)news.onclick=()=>openTaskSheet(null);
  const ds=$('deskSync');if(ds)ds.onclick=()=>syncNow('manual');
  const sb=$('sbSync');if(sb)sb.onclick=()=>syncNow('manual');
  const st=$('sbSettings');if(st)st.onclick=openSettings;
  const pr=$('deskPrint');if(pr)pr.onclick=()=>window.print();
  const sa=$('selAll');if(sa)sa.onchange=()=>{
    const rows=tableTasks();
    if(sa.checked)rows.forEach(t=>selectedIds.add(t.id));else selectedIds.clear();
    renderTaskTable();
  };
  const bd=$('bulkDone');if(bd)bd.onclick=bulkDone;
  const bdel=$('bulkDelete');if(bdel)bdel.onclick=bulkDelete;
}
function isTypingTarget(el){
  if(!el)return false;
  const tag=(el.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select')return true;
  return !!el.isContentEditable;
}
function bindShortcuts(){
  document.addEventListener('keydown',ev=>{
    if(ev.metaKey||ev.ctrlKey||ev.altKey)return;
    const typing=isTypingTarget(ev.target);
    if(ev.key==='Escape'){
      if(!$('overlay').hidden){closeSheet();ev.preventDefault()}
      return;
    }
    if(ev.key==='Enter'&&!typing&&!$('overlay').hidden&&sheetMode==='task'){ev.preventDefault();$('sheetSave')&&$('sheetSave').click();return}
    if(typing)return;
    if(ev.key==='n'||ev.key==='N'){ev.preventDefault();openQuickAdd();return}
    if(ev.key==='/'){ev.preventDefault();const q=$('searchQ');if(q){q.focus();q.select()}return}
  });
}

/* ================= Kompas 12: zero-config, quick add, swipe, pull to refresh ================= */
function haptic(kind){try{if(navigator.vibrate)navigator.vibrate(kind==='heavy'?[12,40,12]:kind==='warn'?[20,30,20]:8)}catch(e){}}
function prefersReducedMotion(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
function emptyState(icon,title,sub,btn){
  return '<div class="empty-state" role="note"><div class="es-ico" aria-hidden="true">'+icon+'</div><div class="es-title">'+esc(title)+'</div>'+(sub?'<div class="es-sub">'+esc(sub)+'</div>':'')+(btn?'<button type="button" class="secondary es-btn" data-es="'+esc(btn.id)+'">'+esc(btn.label)+'</button>':'')+'</div>';
}
function bindEmptyButtons(host){
  if(!host)return;
  host.querySelectorAll('[data-es]').forEach(b=>{b.onclick=()=>openQuickAdd(b.dataset.es)});
}

/* ---------- Czech natural-language date/time ---------- */
const CZ_WD=[['nedel','ne'],['pondel','po'],['uter','ut'],['stred','st'],['ctvrt','ct'],['pat','pa'],['sobot','so']];
function czFold(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
const CZ_NUM={jeden:1,jednu:1,jedna:1,dva:2,dve:2,tri:3,ctyri:4,pet:5,sest:6,sedm:7,osm:8,devet:9,deset:10,dvanact:12,ctrnact:14};
function parseQuick(input,nowDate){
  const now=nowDate||new Date();
  const today=toISO(now);
  let text=String(input||'');
  let date='',time='',matched=[];
  const cut=(re,fn)=>{
    const f=czFold(text);
    const m=f.match(re);
    if(!m)return false;
    const res=fn(m);
    if(res===false)return false;
    text=(text.slice(0,m.index)+' '+text.slice(m.index+m[0].length));
    matched.push(m[0].trim());
    return true;
  };
  const num=s=>{const n=Number(s);return isFinite(n)?n:(CZ_NUM[s]||null)};
  const dayPart=()=>{
    if(time)return;
    cut(/(?:^|\s)(?:rano|dopoledne)(?=\s|$|[,.!?])/,m=>{time=/dopoledne/.test(m[0])?'10:00':'08:00'});
    if(!time)cut(/(?:^|\s)odpoledne(?=\s|$|[,.!?])/,()=>{time='14:00'});
    if(!time)cut(/(?:^|\s)vecer(?=\s|$|[,.!?])/,()=>{time='19:00'});
  };
  // dates
  cut(/(?:^|\s)pozitri(?=\s|$|[,.!?])/,()=>{date=addDays(today,2)})||
  cut(/(?:^|\s)zitra(?=\s|$|[,.!?])/,()=>{date=addDays(today,1)})||
  cut(/(?:^|\s)dnes(?:ka)?(?=\s|$|[,.!?])/,()=>{date=today})||
  cut(/(?:^|\s)za\s+(\d+|[a-z]+)\s+(dni|dny|den|dnu)(?=\s|$|[,.!?])/,m=>{const n=num(m[1]);if(!n)return false;date=addDays(today,n)})||
  cut(/(?:^|\s)za\s+(?:(\d+|[a-z]+)\s+)?(tyden|tydny|tydnu|tydne)(?=\s|$|[,.!?])/,m=>{const n=m[1]?num(m[1]):1;if(!n)return false;date=addDays(today,7*n)})||
  cut(/(?:^|\s)za\s+(?:(\d+|[a-z]+)\s+)?(mesic|mesice|mesicu)(?=\s|$|[,.!?])/,m=>{const n=m[1]?num(m[1]):1;if(!n)return false;date=addMonthsISO(today,n)})||
  cut(/(?:^|\s)(?:pristi|dalsi)\s+tyden(?=\s|$|[,.!?])/,()=>{const d=parseISO(today);const dow=(d.getDay()+6)%7;date=addDays(today,7-dow)})||
  cut(/(?:^|\s)(\d{1,2})\.\s?(\d{1,2})\.(?:\s?(\d{4}))?(?=\s|$|[,!?])/,m=>{
    const dd=+m[1],mm=+m[2];if(dd<1||dd>31||mm<1||mm>12)return false;
    let y=m[3]?+m[3]:now.getFullYear();
    let iso=y+'-'+pad(mm)+'-'+pad(dd);
    if(!m[3]&&iso<today)iso=(y+1)+'-'+pad(mm)+'-'+pad(dd);
    date=iso;
  })||
  cut(/(?:^|\s)(?:v|ve|na|do|tento|tuto|pristi)?\s*(nedel[ieu]?|pondel[ki]?|uter[yk]?|stred[auy]?|ctvrt(?:ek|ka)?|pat(?:ek|ku)|sobot[auy]?)(?=\s|$|[,.!?])/,m=>{
    const w=m[1];const idx=CZ_WD.findIndex(([full])=>w.startsWith(full));if(idx<0)return false;
    const d=parseISO(today);let diff=(idx-d.getDay()+7)%7;if(diff===0)diff=7;
    date=addDays(today,diff);
  });
  // times
  cut(/(?:^|\s)(?:v|ve|od|na|kolem|o)?\s*(\d{1,2})[:.](\d{2})(?:\s*(?:h|hod|hodin))?(?=\s|$|[,.!?])/,m=>{const h=+m[1],mi=+m[2];if(h>23||mi>59)return false;time=pad(h)+':'+pad(mi)});
  if(!time)cut(/(?:^|\s)(?:v|ve|o|na|kolem)\s+(\d{1,2})(?:\s*(?:h|hod|hodin|hodiny))?(?=\s|$|[,.!?])/,m=>{const h=+m[1];if(h>23)return false;time=pad(h)+':00'});
  if(!time)cut(/(?:^|\s)(\d{1,2})\s*(?:h|hod|hodin)(?=\s|$|[,.!?])/,m=>{const h=+m[1];if(h>23)return false;time=pad(h)+':00'});
  if(!time)cut(/(?:^|\s)(?:v\s+)?poledne(?=\s|$|[,.!?])/,()=>{time='12:00'});
  dayPart();
  text=text.replace(/\s{2,}/g,' ').replace(/\s+([,.!?])/g,'$1').trim().replace(/^[,.\-–\s]+|[,\-–\s]+$/g,'');
  if(time&&!date){date=today;if(time<=pad(now.getHours())+':'+pad(now.getMinutes()))date=addDays(today,1)}
  const kind=time?'rem':'task';
  return {text:text||String(input||'').trim(),date,time,kind,matched};
}
function bucketForDate(iso){
  if(!iso)return 'tomorrow';
  const diff=Math.round((parseISO(iso)-parseISO(todayISO()))/86400000);
  if(diff<=1)return 'tomorrow';
  if(diff<=14)return 'weeks';
  if(diff<=120)return 'months';
  return 'long';
}
function quickWhenLabel(p){
  if(!p.date&&!p.time)return '';
  const t=todayISO();
  let d=p.date===t?'dnes':p.date===addDays(t,1)?'zítra':p.date===addDays(t,2)?'pozítří':czDateLong(p.date);
  return d+(p.time?' v '+p.time:'');
}

try{window.__kompas={parseQuick,version:APP_LABEL}}catch(e){}
/* ---------- Quick add sheet (FAB) ---------- */
let quickKind='auto';
function openQuickAdd(preset){
  sheetMode='quick';sheetTarget=null;
  quickKind=preset==='note'||preset==='rem'||preset==='task'?preset:'auto';
  if(!preset&&view==='notes')quickKind='note';
  if(!preset&&view==='rems')quickKind='rem';
  $('sheetTitle').textContent='Rychle přidat';
  $('sheetDelete').hidden=true;
  if($('sheetSave')){$('sheetSave').hidden=false;$('sheetSave').textContent='Přidat'}
  $('sheetBody').innerHTML=
    '<div class="seg" role="radiogroup" aria-label="Typ" id="qaKind">'+
      [['auto','Automaticky'],['task','Úkol'],['rem','Připomínka'],['note','Poznámka']].map(([id,l])=>'<button type="button" role="radio" data-k="'+id+'">'+l+'</button>').join('')+
    '</div>'+
    '<div class="field"><label for="qaText" class="sr-only">Text</label><textarea id="qaText" rows="3" enterkeyhint="done" placeholder="Např. zítra v 8:00 zavolat dodavateli"></textarea></div>'+
    '<div class="qa-preview" id="qaPreview" aria-live="polite"></div>'+
    '<div class="field" id="qaCatWrap"><span class="lbl">Kategorie</span><div class="chips" id="qaCat"></div></div>'+
    '<p class="muted qa-hint">Rozumím: dnes, zítra, pozítří, pondělí–neděle, za týden, za 3 dny, příští týden, 24. 11., v 8:00, ráno, večer.</p>';
  let cat=view==='ukoly'&&taskFilter!=='all'?taskFilter:'ost';
  const paintKind=()=>$('qaKind').querySelectorAll('button').forEach(b=>{const on=b.dataset.k===quickKind;b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false')});
  const paintCat=()=>paintCatPicker($('qaCat'),cat,id=>{cat=id;paintCat()});
  const upd=()=>{
    const p=parseQuick($('qaText').value);
    const k=quickKind==='auto'?p.kind:quickKind;
    $('overlay')._quick={p,k,cat};
    const lab=quickWhenLabel(p);
    const kindName={task:'Úkol',rem:'Připomínka',note:'Poznámka'}[k];
    let s='';
    if($('qaText').value.trim()){
      s='<span class="qa-kind k-'+k+'">'+kindName+'</span>';
      if(k!=='note'&&lab)s+=' <span class="qa-when">'+esc(k==='task'?'termín '+lab:lab)+'</span>';
      if(k==='task'&&!p.date)s+=' <span class="qa-when">'+esc(buckBy('tomorrow').name)+'</span>';
    }
    $('qaPreview').innerHTML=s;
    $('qaCatWrap').hidden=k!=='task';
  };
  $('qaKind').querySelectorAll('button').forEach(b=>b.onclick=()=>{quickKind=b.dataset.k;paintKind();upd();haptic()});
  $('qaText').addEventListener('input',upd);
  $('qaText').addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();submitQuickAdd()}});
  paintKind();paintCat();upd();
  $('overlay')._quickCat=()=>cat;
  $('overlay').hidden=false;document.body.classList.add('locked');
  setTimeout(()=>$('qaText')&&$('qaText').focus(),60);
}
function submitQuickAdd(){
  const raw=($('qaText')&&$('qaText').value||'').trim();
  if(!raw){toast('Napiš, co přidat');return}
  const p=parseQuick(raw);
  const k=quickKind==='auto'?p.kind:quickKind;
  const cat=$('overlay')._quickCat?$('overlay')._quickCat():'ost';
  let item=null,arr=null,msg='';
  if(k==='note'){
    item=normalizeNote({id:uid('n'),text:raw,at:nowStamp()});touch(item);notes.push(item);arr='notes';msg='Poznámka uložena';
  }else if(k==='rem'){
    const when=(p.date||todayISO())+'T'+(p.time||'09:00');
    item=normalizeRem({id:uid('r'),text:p.text,when,done:false,created:todayISO()});touch(item);reminders.push(item);arr='rems';
    msg='Připomínka · '+quickWhenLabel({date:when.slice(0,10),time:when.slice(11,16)});
  }else{
    item=normalizeTask({id:uid('t'),text:p.date?p.text:raw,cat,bucket:bucketForDate(p.date),status:'open',due:p.date||'',created:todayISO()});touch(item);tasks.push(item);arr='tasks';
    msg='Úkol přidán'+(p.date?' · termín '+quickWhenLabel({date:p.date}):'');
  }
  persist();closeSheet();refreshLists();haptic();
  toast(msg,{label:'Zpět',fn:()=>{item.deleted=true;touch(item);persist();refreshLists()}});
}

/* ---------- Swipe actions ---------- */
function attachSwipe(el,opts){
  if(!el||!opts)return el;
  el.classList.add('swipeable');
  const L=opts.left,R=opts.right;
  if(R){el.dataset.swR=R.label;el.style.setProperty('--swR',R.color||'var(--ok)')}
  if(L){el.dataset.swL=L.label;el.style.setProperty('--swL',L.color||'var(--danger)')}
  let sx=0,sy=0,dx=0,active=false,decided=false,horiz=false,id=null;
  const TH=88;
  const reset=()=>{el.classList.remove('swiping','sw-r','sw-l','sw-arm');el.style.setProperty('--sx','0px')};
  el.addEventListener('pointerdown',ev=>{
    if(ev.pointerType==='mouse'&&ev.button!==0)return;
    if(ev.target.closest('a,input,textarea,select,.note-actions'))return;
    sx=ev.clientX;sy=ev.clientY;dx=0;active=true;decided=false;horiz=false;id=ev.pointerId;
  });
  el.addEventListener('pointermove',ev=>{
    if(!active||ev.pointerId!==id)return;
    const mx=ev.clientX-sx,my=ev.clientY-sy;
    if(!decided){
      if(Math.abs(mx)<8&&Math.abs(my)<8)return;
      decided=true;horiz=Math.abs(mx)>Math.abs(my)*1.3;
      if(!horiz){active=false;return}
      try{el.setPointerCapture(id)}catch(e){}
      el.classList.add('swiping');
    }
    if(!horiz)return;
    dx=mx;
    if(dx>0&&!R)dx=Math.min(dx,12);
    if(dx<0&&!L)dx=Math.max(dx,-12);
    el.style.setProperty('--sx',dx+'px');
    el.classList.toggle('sw-r',dx>0);el.classList.toggle('sw-l',dx<0);
    const arm=Math.abs(dx)>TH;
    if(arm!==el.classList.contains('sw-arm')){el.classList.toggle('sw-arm',arm);if(arm)haptic()}
    ev.preventDefault();
  });
  const end=ev=>{
    if(!active)return;active=false;
    if(!horiz){return}
    el._swipedAt=Date.now();
    const go=dx>TH&&R?R:dx<-TH&&L?L:null;
    if(go&&!prefersReducedMotion()){
      el.style.setProperty('--sx',(dx>0?1:-1)*el.offsetWidth+'px');
      setTimeout(()=>{reset();go.fn()},160);
    }else{reset();if(go)go.fn()}
  };
  el.addEventListener('pointerup',end);
  el.addEventListener('pointercancel',()=>{active=false;reset()});
  el.addEventListener('click',ev=>{if(el._swipedAt&&Date.now()-el._swipedAt<350){ev.stopPropagation();ev.preventDefault()}},true);
  return el;
}
function softDelete(item,kind){
  if(!item)return;
  item.deleted=true;touch(item);
  persist();refreshLists();haptic('heavy');
  toast(({task:'Úkol smazán',rem:'Připomínka smazána',note:'Poznámka smazána'})[kind]||'Smazáno',{label:'Zpět',fn:()=>{item.deleted=false;touch(item);persist();refreshLists()}});
}
function toggleRemDone(r){
  const was=r.done;r.done=!r.done;touch(r);persist();refreshLists();haptic();
  toast(r.done?'Připomínka hotová':'Vráceno',{label:'Zpět',fn:()=>{r.done=was;touch(r);persist();refreshLists()}});
}

/* ---------- Pull to refresh ---------- */
function setupPullToRefresh(){
  const ind=$('ptr');if(!ind)return;
  let y0=null,dy=0,armed=false,busy=false;
  const lockedUi=()=>!$('overlay').hidden||!$('importOverlay').hidden||($('welcome')&&!$('welcome').hidden);
  window.addEventListener('touchstart',ev=>{
    if(busy||lockedUi()||(window.scrollY||0)>0||ev.touches.length!==1){y0=null;return}
    y0=ev.touches[0].clientY;dy=0;armed=false;
  },{passive:true});
  window.addEventListener('touchmove',ev=>{
    if(y0==null)return;
    dy=ev.touches[0].clientY-y0;
    if(dy<=0||(window.scrollY||0)>0){ind.style.setProperty('--py','0px');ind.classList.remove('show');return}
    const p=Math.min(dy*0.5,90);
    ind.classList.add('show');ind.style.setProperty('--py',p+'px');
    const a=p>62;if(a!==armed){armed=a;ind.classList.toggle('armed',a);if(a)haptic()}
    ind.querySelector('span').textContent=a?'Pusť pro obnovení':'Táhni pro obnovení';
  },{passive:true});
  window.addEventListener('touchend',async()=>{
    if(y0==null)return;y0=null;
    if(!armed){ind.classList.remove('show','armed');ind.style.setProperty('--py','0px');return}
    busy=true;ind.classList.add('busy');ind.querySelector('span').textContent='Obnovuji…';
    try{await refreshEverything()}catch(e){}
    busy=false;armed=false;ind.classList.remove('show','armed','busy');ind.style.setProperty('--py','0px');
  });
}
async function refreshEverything(){
  let remote=null;
  try{remote=await fetchRemoteVersion()}catch(e){}
  if(remote!=null&&remote>Number(APP_VERSION)){setSyncStatus('busy','Aktualizuji…');await applySilentUpdate(setupSW._reg,remote);return}
  if(hasSyncCreds())await syncNow('pull');
  await pollInbox('force');
  refreshLists();
  if(hasSyncCreds()&&navigator.onLine)flashUpdated();
  else if(!hasSyncCreds())toast('Kompas zatím není propojený');
}

/* ---------- Offline indicator ---------- */
function updateOnline(){
  const b=$('offlineBanner');if(b)b.hidden=navigator.onLine!==false;
  document.documentElement.classList.toggle('is-offline',navigator.onLine===false);
}
window.addEventListener('online',updateOnline);
window.addEventListener('offline',updateOnline);

/* ---------- Zero-config setup link ---------- */
function b64urlJson(obj){return b64urlEncodeBytes(new TextEncoder().encode(JSON.stringify(obj)))}
function b64urlJsonParse(s){return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)))}
function extractSetupPacked(raw){
  const s=String(raw||'').trim();
  const m=s.match(/[#&?]setup=([A-Za-z0-9_\-]+)/);
  if(m)return m[1];
  return '';
}
function decodeSetup(packed){
  try{
    const o=b64urlJsonParse(packed);
    if(!o||typeof o!=='object')return null;
    const k=String(o.k||'').trim(),t=String(o.t||'').trim();
    if(normalizeInboxKey(k).length<8)return null;
    if(t&&!looksLikeToken(t))return null;
    return {k,t};
  }catch(e){return null}
}
function buildSetupLink(){
  if(!hasSyncCreds())return '';
  return pairBaseUrl()+'#setup='+b64urlJson({v:1,k:getInboxKeyRaw(),t:getSyncToken()});
}
async function applySetup(s,source){
  if(!s)return false;
  setInboxKeyRaw(s.k);
  if(s.t)setSyncToken(s.t);
  requestPersist();
  try{
    const db=await idbOpen();db.close&&db.close();
    await idbSet('den_inbox_key',getInboxKeyRaw());
    if(getSyncToken())await idbSet('den_sync_token',getSyncToken());
  }catch(e){}
  try{sessionStorage.removeItem('kompas_welcome_skip')}catch(e){}
  updatePairBanner();
  if(!getSyncToken()){showWelcome('notoken');return true}
  hideWelcome();
  setSyncStatus('busy','Načítám…');
  await syncNow('init');
  refreshLists();
  haptic();
  if(isIOS()&&!isStandalonePwa()&&source==='link'){showWelcome('a2hs');return true}
  toast('Hotovo, Kompas je propojený ✓');
  return true;
}
window.addEventListener('hashchange',()=>{
  const h=String(location.hash||'');
  const sp=extractSetupPacked(h);
  if(sp){history.replaceState(null,'',location.pathname+location.search);const s=decodeSetup(sp);if(s)applySetup(s,'link');else toast('Odkaz Kompas je neplatný');return}
  if(extractPairPacked(h))handlePairLaunch();
});
async function handleSetupLaunch(){
  if(!SETUP_RAW)return false;
  const s=decodeSetup(SETUP_RAW);
  if(!s){toast('Odkaz Kompas je neplatný');return false}
  return applySetup(s,'link');
}
async function acceptPasted(raw){
  raw=String(raw||'').trim();
  if(!raw){toast('Schránka je prázdná – zkopíruj svůj odkaz Kompas');return false}
  const sp=extractSetupPacked(raw);
  if(sp){const s=decodeSetup(sp);if(!s){toast('Odkaz Kompas je neplatný');return false}return applySetup(s,'paste')}
  const pp=extractPairPacked(raw);
  if(pp){hideWelcome();openPairAccept('',pp);return true}
  if(looksLikeToken(raw)){setSyncToken(raw);hideWelcome();updatePairBanner();if(hasSyncCreds())syncNow('manual');else showWelcome('nokey');return true}
  toast('Tohle není odkaz Kompas');
  return false;
}
async function pasteFromClipboard(fallbackEl){
  try{
    if(navigator.clipboard&&navigator.clipboard.readText){
      const t=await navigator.clipboard.readText();
      if(t&&t.trim())return acceptPasted(t);
    }
  }catch(e){}
  if(fallbackEl){fallbackEl.hidden=false;const ta=fallbackEl.querySelector('textarea');if(ta)ta.focus()}
  toast('Vlož odkaz do pole (podrž prst → Vložit)');
  return false;
}
async function copyText(text,okMsg){
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);toast(okMsg||'Zkopírováno');haptic();return true}
  }catch(e){}
  try{
    const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    const ok=document.execCommand('copy');ta.remove();if(ok){toast(okMsg||'Zkopírováno');return true}
  }catch(e){}
  toast('Kopírování se nepovedlo');return false;
}
const SHARE_ICO='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function welcomeSkipped(){try{return sessionStorage.getItem('kompas_welcome_skip')==='1'}catch(e){return false}}
function hideWelcome(){const w=$('welcome');if(w){w.hidden=true;document.body.classList.remove('welcome-on')}}
function showWelcome(mode){
  const w=$('welcome');if(!w)return;
  const ios=isIOS(),standalone=isStandalonePwa();
  mode=mode||(getInboxKey()&&!getSyncToken()?'notoken':(ios&&!standalone?'ios-safari':'paste'));
  const pasteBlock=
    '<button type="button" class="primary big" id="wPaste">Vložit</button>'+
    '<div class="w-manual" id="wManual" hidden><label for="wText" class="lbl">Odkaz Kompas</label><textarea id="wText" rows="3" placeholder="https://…/den/#setup=…" autocomplete="off" spellcheck="false"></textarea><button type="button" class="secondary" id="wManualGo">Použít odkaz</button></div>';
  let html='<div class="w-logo" aria-hidden="true"><img src="icon-192.png" alt="" width="72" height="72"></div>';
  if(mode==='a2hs'){
    html+='<h1 id="welcomeTitle">Propojeno ✓</h1><p class="w-lead">Data máš staženo. Teď si Kompas dej na plochu, ať se otvírá jako aplikace.</p>'+
      '<ol class="w-steps">'+
      '<li class="w-step big"><span class="w-n">1</span><div><b>Přidat na plochu</b><span>Ťukni dole na '+SHARE_ICO+' Sdílet a vyber <b>Přidat na plochu</b>.</span></div></li>'+
      '<li class="w-step"><span class="w-n">2</span><div><b>Zkopíruj si odkaz</b><span>Ikona na ploše má vlastní paměť, proto jí odkaz jednou předáš.</span><button type="button" class="secondary" id="wCopy">Zkopírovat odkaz</button></div></li>'+
      '<li class="w-step"><span class="w-n">3</span><div><b>Otevři Kompas z plochy a ťukni na Vložit</b><span>Pak už se vše ukládá a stahuje samo.</span></div></li>'+
      '</ol><button type="button" class="link-btn" id="wClose">Pokračovat tady v Safari</button>';
  }else if(mode==='ios-safari'){
    html+='<h1 id="welcomeTitle">Vítej v Kompasu</h1>'+
      '<ol class="w-steps">'+
      '<li class="w-step big"><span class="w-n">1</span><div><b>Přidat na plochu</b><span>Ťukni dole na '+SHARE_ICO+' Sdílet a vyber <b>Přidat na plochu</b>.</span></div></li>'+
      '<li class="w-step"><span class="w-n">2</span><div><b>Ťukni na svůj odkaz Kompas a pak Vložit</b><span>Odkaz máš od IS BOTa, nebo na zařízení, kde Kompas už běží: Nastavení → Přidat další zařízení. Podrž na něm prst → Kopírovat.</span></div></li>'+
      '</ol>'+pasteBlock+'<button type="button" class="link-btn" id="wClose">Zatím bez propojení</button>';
  }else if(mode==='notoken'){
    html+='<h1 id="welcomeTitle">Ještě jeden krok</h1><p class="w-lead">Kód je uložený, ale chybí přístup k úložišti. Na zařízení, kde Kompas už běží, otevři <b>Nastavení → Přidat další zařízení → Zkopírovat odkaz</b> a tady ťukni na Vložit.</p>'+pasteBlock+
      '<button type="button" class="link-btn" id="wPair">Mám QR kód a PIN z počítače</button><button type="button" class="link-btn" id="wClose">Zatím bez propojení</button>';
  }else{
    html+='<h1 id="welcomeTitle">Ťukni na svůj odkaz Kompas a pak Vložit</h1><p class="w-lead">Odkaz máš od IS BOTa, nebo na zařízení, kde Kompas už běží (Nastavení → Přidat další zařízení). Podrž na něm prst a dej Kopírovat. Pak se všechno nastaví samo.</p>'+pasteBlock+
      '<button type="button" class="link-btn" id="wPair">Mám QR kód a PIN z počítače</button><button type="button" class="link-btn" id="wClose">Zatím bez propojení</button>';
  }
  w.querySelector('.w-inner').innerHTML=html;
  w.hidden=false;document.body.classList.add('welcome-on');
  const on=(id,fn)=>{const b=$(id);if(b)b.onclick=fn};
  on('wPaste',()=>pasteFromClipboard($('wManual')));
  on('wManualGo',()=>acceptPasted($('wText')&&$('wText').value));
  on('wCopy',()=>{const l=buildSetupLink();if(l)copyText(l,'Odkaz je ve schránce – teď ho vlož v ikoně na ploše')});
  on('wPair',()=>{hideWelcome();openPairAccept('','')});
  on('wClose',()=>{try{sessionStorage.setItem('kompas_welcome_skip','1')}catch(e){}hideWelcome();if(!hasSyncCreds())setSyncStatus('warn','Nepropojeno')});
  const t=$('welcomeTitle');if(t){t.setAttribute('tabindex','-1');setTimeout(()=>t.focus(),50)}
}
function maybeShowWelcome(){
  if(hasSyncCreds()){hideWelcome();return}
  if(welcomeSkipped())return;
  showWelcome();
}
function openDeviceLink(){
  const url=buildSetupLink();
  if(!url){showWelcome();return}
  sheetMode='device-link';sheetTarget=null;
  $('sheetTitle').textContent='Přidat další zařízení';
  $('sheetDelete').hidden=true;
  if($('sheetSave')){$('sheetSave').hidden=false;$('sheetSave').textContent='Hotovo'}
  $('sheetBody').innerHTML=
    '<p class="muted">Na novém zařízení naskenuj QR kód, nebo mu pošli odkaz a otevři ho. Všechno se nastaví samo – žádné kódy ani tokeny.</p>'+
    '<div class="pair-qr" id="devQr"></div>'+
    '<button type="button" class="primary" id="devCopy">Zkopírovat odkaz</button>'+
    (navigator.share?'<button type="button" class="secondary" id="devShare">Sdílet sobě…</button>':'')+
    '<p class="muted small">Odkaz je jako klíč od tvých dat. Posílej ho jen sobě (třeba do Poznámek nebo AirDropem), nikomu jinému.</p>';
  $('overlay').hidden=false;document.body.classList.add('locked');
  renderQr(url,$('devQr'));
  const c=$('devCopy');if(c)c.onclick=()=>copyText(url,'Odkaz je ve schránce');
  const s=$('devShare');if(s)s.onclick=async()=>{try{await navigator.share({title:'Můj Kompas',url})}catch(e){}};
}

setupCompactHeader();
syncTitle();
if($('appVer'))$('appVer').textContent='verze '+APP_LABEL;
if($('appSidebarVer'))$('appSidebarVer').textContent='verze '+APP_LABEL;
if(!load('den_snap',null)&&(tasks.length||days.length||notes.length))takeSnapshot();
pendingMails=load('den_pending_mails',[])||[];
bootUi();
bindDesktopUi();
bindShortcuts();
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){saveNoteDraft();stopDictation()}
});
setInterval(()=>{if(!document.hidden&&uiReady)pollInbox('timer')},5*60*1000);
setInterval(()=>{if(!document.hidden&&uiReady)syncNow('pull')},90*1000);
window.addEventListener('online',()=>{if(uiReady)syncNow('online').then(()=>{if(hasSyncCreds())flashUpdated()})});
window.addEventListener('offline',()=>setSyncStatus('warn','Offline – uloží se později'));
function flashUpdated(){
  if(!hasSyncCreds())return;
  setSyncStatus('ok','Aktualizováno');
  clearTimeout(flashUpdated._t);
  flashUpdated._t=setTimeout(()=>{
    const el=$('syncStatus');
    if(el&&el.textContent==='Aktualizováno')setSyncStatus('ok','Uloženo ✓');
  },2500);
}
async function fetchRemoteVersion(){
  const r=await fetch('version.json?t='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
  if(!r.ok)return null;
  const j=await r.json();
  const v=Number(j.version);
  return isFinite(v)?v:null;
}
async function applySilentUpdate(reg,remote){
  try{
    if(reg){
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      await reg.update();
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
    }
  }catch(e){}
  await new Promise(r=>setTimeout(r,1800));
  if(setupSW._reloading)return true;
  setupSW._reloading=true;
  try{
    const regs=await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(x=>x.unregister()));
    if(window.caches){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}
  }catch(e){}
  const u=new URL(location.href);
  u.searchParams.set('v',String(remote));
  location.replace(u.pathname+u.search);
  return true;
}
async function afterResumePull(){
  await bootGate;
  await syncNow('resume');
  await pollInbox('resume');
  if(hasSyncCreds()&&navigator.onLine)flashUpdated();
}
function onAppResume(){
  if(document.visibilityState==='hidden')return;
  const now=Date.now();
  if(onAppResume._busy)return;
  if(onAppResume._at&&now-onAppResume._at<1000)return;
  onAppResume._at=now;
  onAppResume._busy=true;
  (async()=>{
    await bootGate;
    let remote=null;
    try{remote=await fetchRemoteVersion()}catch(e){}
    const newer=remote!=null&&remote>Number(APP_VERSION);
    const reg=setupSW._reg;
    if(newer){
      setSyncStatus('busy','Aktualizuji…');
      await applySilentUpdate(reg,remote);
      return;
    }
    if(reg){try{await reg.update()}catch(e){}}
    await afterResumePull();
  })().catch(()=>afterResumePull()).finally(()=>{onAppResume._busy=false});
}
function setupSW(){
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')onAppResume()});
  window.addEventListener('focus',onAppResume);
  window.addEventListener('pageshow',onAppResume);
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.addEventListener('message',ev=>{
    if(!ev.data||ev.data.type!=='sw-update')return;
    if(setupSW._reloading)return;
    setupSW._reloading=true;
    location.reload();
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(setupSW._reloading)return;
    setupSW._reloading=true;
    location.reload();
  });
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{
    setupSW._reg=reg;
    onAppResume();
  }).catch(()=>{onAppResume()});
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
  const tHits=sortTasks(tasks.filter(t=>isLive(t)&&hay(t.text+' '+(t.note||'')).includes(q)));
  const nHits=notes.filter(n=>isLive(n)&&hay(n.text+' '+(n.tag||'')).includes(q));
  if(!tHits.length&&!nHits.length){
    const p=document.createElement('p');p.className='empty';p.textContent='Nic se nenašlo.';box.appendChild(p);return;
  }
  if(tHits.length)appendGroup(box,'Úkoly',tHits.map(t=>taskCard(t)));
  if(nHits.length)appendGroup(box,'Poznámky',nHits.map(n=>noteCard(n,false)));
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
if($('searchQ')){
  $('searchQ').addEventListener('input',renderSearch);
  $('searchQ').addEventListener('search',renderSearch);
}
if($('backupFile'))$('backupFile').addEventListener('change',ev=>{
  const f=ev.target.files&&ev.target.files[0];ev.target.value='';importBackupFile(f);
});
if($('timesheetPdf'))$('timesheetPdf').onclick=openTimesheetPrint;
if($('timesheetCsv'))$('timesheetCsv').onclick=()=>{shareTimesheetCsv()};
if($('pairBanner'))$('pairBanner').onclick=()=>showWelcome();
updateOnline();
setupPullToRefresh();
const bootGate=(async()=>{
  requestPersist();
  await hydrateCreds();
  const viaSetup=await handleSetupLaunch();
  await handlePairLaunch();
  updatePairBanner();
  if(!viaSetup&&$('overlay').hidden)maybeShowWelcome();
})();
bootGate.then(()=>{syncReady=true;if(!setupSW._reg)onAppResume()}).catch(()=>{syncReady=true;onAppResume()});
setupSW();
})();
