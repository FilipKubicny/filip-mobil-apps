(function(){
const TO='b3b17pd7+mobil@mail.grokbot.com';
const NOTES_MAX=1500;
const MONTHS=['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];
const WD=['Ne','Po','Út','St','Čt','Pá','So'];
const AREAS={org:'Řízení výroby',it:'sapIS a IT',nav:'Návrhy a výkresy',skl:'Sklady a logistika',fre:'Fréza',hal:'Haly a úklid',viz:'Vizualizace a hřiště',bez:'Bezpečnost',exp:'Expedice',kan:'Kancelář, nákup, doprava'};
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const parseISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const toISO=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const addDays=(iso,n)=>{const d=parseISO(iso);d.setDate(d.getDate()+n);return toISO(d)};
const lastDayOfMonth=iso=>{const d=parseISO(iso);return toISO(new Date(d.getFullYear(),d.getMonth()+1,0))};
const czDate=iso=>{if(!iso)return '';const [y,m,d]=iso.split('-');return (+d)+'.'+(+m)+'.'+y};
const czDateSp=iso=>{if(!iso)return '';const [y,m,d]=iso.split('-');return (+d)+'. '+(+m)+'. '+y};
const czDateLong=iso=>{if(!iso)return '';const d=parseISO(iso);return WD[d.getDay()]+' '+(d.getDate())+'. '+(d.getMonth()+1)+'.'};
const czPeriod=(a,b)=>czDateSp(a)+' – '+czDateSp(b);
const mins=t=>{if(!t)return null;const p=String(t).split(':');if(p.length<2)return null;return (+p[0])*60+(+p[1])};
const spanMin=(f,t)=>{const a=mins(f),b=mins(t);if(a==null||b==null)return null;let d=b-a;if(d<0)d+=1440;return d};
const fmt=m=>{m=Math.round(m||0);const h=Math.floor(m/60),r=m%60;return r?h+' h '+r+' min':h+' h'};
const czk=n=>Math.round(n).toLocaleString('cs-CZ')+' Kč';
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=()=>'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function easterSunday(y){
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return toISO(new Date(y,month-1,day));
}
function holidaysInYear(y){
  const e=easterSunday(y);
  const map={};
  map[y+'-01-01']='Nový rok';
  map[addDays(e,-2)]='Velký pátek';
  map[addDays(e,1)]='Velikonoční pondělí';
  map[y+'-05-01']='Svátek práce';
  map[y+'-05-08']='Den vítězství';
  map[y+'-07-05']='Cyril a Metoděj';
  map[y+'-07-06']='Jan Hus';
  map[y+'-09-28']='Den české státnosti';
  map[y+'-10-28']='Vznik Československa';
  map[y+'-11-17']='Den boje za svobodu';
  map[y+'-12-24']='Štědrý den';
  map[y+'-12-25']='1. svátek vánoční';
  map[y+'-12-26']='2. svátek vánoční';
  return map;
}
function holidayName(iso){return holidaysInYear(+iso.slice(0,4))[iso]||null}
function isWeekend(iso){const d=parseISO(iso).getDay();return d===0||d===6}
function workdaysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  const out=[];let d=new Date(y,m-1,1);
  while(d.getMonth()===m-1){const s=toISO(d);if(!isWeekend(s)&&!holidayName(s))out.push(s);d.setDate(d.getDate()+1)}
  return out;
}

function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.remove('show'),2500)}

const defaultSettings=()=>({billedUntil:'2026-10-15',rate:600,specialEnd:'2026-11-30'});
function migrateOldHistory(){
  const old=load('dochazka_history',null);
  if(!old||!old.length)return [];
  return old.map(e=>normalizeDay({
    date:e.date,spans:e.from&&e.to?[[e.from,e.to]]:[],worked_min:e.worked_min,pause_min:e.pause_min??30,
    work:e.work,notes:e.notes,sent:e.sent,nonbillable:false
  })).filter(Boolean);
}
function normalizeDay(raw){
  if(!raw||!raw.date)return null;
  const spans=(raw.spans&&raw.spans.length?raw.spans:(raw.from&&raw.to?[[raw.from,raw.to]]:[])).map(s=>[s[0],s[1]]);
  const nonbillable=!!(raw.nonbillable||raw.nonbill||raw.hours===0);
  let pause_min=raw.pause_min;
  let fixed_min=raw.fixed_min;
  if(fixed_min==null&&raw.hours!=null&&raw.hours!=='')fixed_min=Math.round(Number(raw.hours)*60);
  if(pause_min==null)pause_min=(raw.hours!=null||raw.fixed_min!=null||raw.imported)?0:30;
  let worked_min=raw.worked_min;
  if(worked_min==null){
    if(fixed_min!=null)worked_min=fixed_min;
    else{
      const rawMin=spans.reduce((a,[f,t])=>a+(spanMin(f,t)||0),0);
      worked_min=Math.max(0,rawMin-(pause_min||0));
    }
  }
  return{
    id:String(raw.id||uid()),
    date:String(raw.date).slice(0,10),
    spans,
    pause_min:pause_min||0,
    fixed_min:fixed_min!=null?fixed_min:null,
    worked_min:Math.round(worked_min||0),
    work:Array.isArray(raw.work)?raw.work.map(String):String(raw.work||'').split('\n').map(s=>s.trim()).filter(Boolean),
    notes:String(raw.notes||raw.note||'').trim(),
    areas:Array.isArray(raw.areas)?raw.areas:[],
    nonbillable,
    sent:!!raw.sent
  };
}
function normalizeExp(raw){
  if(!raw)return null;
  const czk=Number(raw.czk??raw.amount??raw.kc);
  const what=String(raw.what||raw.text||raw.desc||'').trim();
  const date=String(raw.date||'').slice(0,10);
  if(!date||!what||!isFinite(czk))return null;
  return{id:String(raw.id||uid()),date,what,czk};
}
function normalizeInv(raw){
  const e=normalizeExp(raw);
  return e?{...e,what:e.what}:null;
}

let days=load('dochazka_days',null);
if(!Array.isArray(days)){days=migrateOldHistory();if(days.length)save('dochazka_days',days)}
days=(days||[]).map(normalizeDay).filter(Boolean);
let expenses=(load('dochazka_expenses',[])||[]).map(normalizeExp).filter(Boolean);
let invoices=(load('dochazka_invoices',[])||[]).map(normalizeInv).filter(Boolean);
let settings=Object.assign(defaultSettings(),load('dochazka_settings',{}));
const persist=()=>{save('dochazka_days',days);save('dochazka_expenses',expenses);save('dochazka_invoices',invoices);save('dochazka_settings',settings)};

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

let view='entry';
let monthYM=todayISO().slice(0,7);
let sheetMode=null,sheetTarget=null;

function updateImportHint(){
  const el=$('importHint');
  if(el)el.hidden=days.length>0;
}
function setView(v){
  view=v;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  $('view-entry').hidden=v!=='entry';
  $('view-month').hidden=v!=='month';
  $('view-invoice').hidden=v!=='invoice';
  if(v==='month')renderMonth();
  if(v==='invoice')renderInvoice();
  updateImportHint();
}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));

function formSpans(){
  const s=[];
  if($('from1').value&&$('to1').value)s.push([$('from1').value,$('to1').value]);
  if(!$('span2row').hidden&&$('from2').value&&$('to2').value)s.push([$('from2').value,$('to2').value]);
  return s;
}
function formWorked(){
  if($('nonbill').checked&&!formSpans().length)return 0;
  const spans=formSpans();
  if(!spans.length)return null;
  const raw=spans.reduce((a,[f,t])=>a+(spanMin(f,t)||0),0);
  return Math.max(0,raw-($('lunch').checked?30:0));
}
function updateTotal(){
  const nb=$('nonbill').checked;
  const w=formWorked();
  const lunchOn=$('lunch').checked;
  let html,cls='card total';
  if(nb&&(w==null||w===0)){html='Nefakturuje se<small>Den se zapíše, do faktury nepočítá</small>';cls+=' nb'}
  else if(w==null){html='Odpracováno: –<small>'+(lunchOn?'pauza 30 min se odečte':'bez pauzy na oběd')+'</small>'}
  else{
    const extra=nb?' · nefakturuje se':'';
    html='Odpracováno: '+fmt(w)+(nb?'':' · '+czk(pay(w)))+'<small>'+(lunchOn?'pauza 30 min odečtena':'bez pauzy na oběd')+extra+'</small>';
    if(nb)cls+=' nb';
  }
  $('total').className=cls;
  $('total').innerHTML=html;
  saveDraft();
}
function saveDraft(){
  save('dochazka_draft',{
    date:$('date').value,from1:$('from1').value,to1:$('to1').value,
    from2:$('from2').value,to2:$('to2').value,span2:!$('span2row').hidden,
    lunch:$('lunch').checked,nonbill:$('nonbill').checked,
    work:$('work').value,notes:$('notes').value,expWhat:$('expWhat').value,expCzk:$('expCzk').value
  });
}
function setSpan2(on){
  $('span2row').hidden=!on;
  $('toggleSpan2').textContent=on?'Odebrat druhý čas':'+ Druhý čas';
  if(!on){$('from2').value='';$('to2').value=''}
  updateTotal();
}
$('toggleSpan2').onclick=()=>setSpan2($('span2row').hidden);
['date','from1','to1','from2','to2','lunch','nonbill','work','notes','expWhat','expCzk'].forEach(id=>{
  const el=$(id);el.addEventListener('input',updateTotal);el.addEventListener('change',updateTotal);
});
$('date').addEventListener('change',()=>loadDateIntoForm($('date').value,true));

function clearExpenseFields(){$('expWhat').value='';$('expCzk').value=''}
function fillForm(d,keepExpense){
  $('date').value=d.date||todayISO();
  const s=d.spans||[];
  $('from1').value=s[0]?s[0][0]:'';$('to1').value=s[0]?s[0][1]:'';
  if(s[1]){setSpan2(true);$('from2').value=s[1][0];$('to2').value=s[1][1]}
  else{setSpan2(false)}
  $('lunch').checked=(d.pause_min||0)>0;
  $('nonbill').checked=!!d.nonbillable;
  $('work').value=(d.work||[]).join('\n');
  $('notes').value=d.notes||'';
  if(!keepExpense)clearExpenseFields();
  updateTotal();
}
function loadDateIntoForm(date,fromPicker){
  const d=findDay(date);
  if(d)fillForm(d,fromPicker);
  else if(fromPicker){
    $('from1').value='';$('to1').value='';setSpan2(false);
    $('lunch').checked=true;$('nonbill').checked=false;
    $('work').value='';$('notes').value='';clearExpenseFields();updateTotal();
  }
}

function collectEntry(){
  const date=$('date').value;
  if(!date){toast('Vyplň datum');return null}
  const nb=$('nonbill').checked;
  const spans=formSpans();
  const w=formWorked();
  if(!nb&&w==null){toast('Vyplň čas od a do');return null}
  const work=$('work').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const notes=$('notes').value.trim();
  const existing=findDay(date);
  const pause=$('lunch').checked?30:0;
  let fixed_min=null, worked=w==null?0:w;
  if(existing&&existing.fixed_min!=null){
    const sameSpans=JSON.stringify(spans)===JSON.stringify(existing.spans||[]);
    const samePause=pause===(existing.pause_min||0);
    if(sameSpans&&samePause){fixed_min=existing.fixed_min;worked=existing.fixed_min}
  }
  const day=normalizeDay({
    id:(existing||{}).id||uid(),
    date,spans,pause_min:pause,fixed_min,
    worked_min:worked,work,notes,nonbillable:nb,areas:(existing||{}).areas||[],sent:false
  });
  const what=$('expWhat').value.trim();
  const amt=$('expCzk').value.trim();
  let expense=null;
  if(what||amt){
    if(!what||!amt||!isFinite(Number(amt))){toast('Doplň výdaj: za co a částku');return null}
    expense={id:uid(),date,what,czk:Number(amt)};
  }
  return{day,expense,notes};
}

function upsertDay(day){
  const i=days.findIndex(x=>x.date===day.date);
  if(i>=0)days[i]=Object.assign({},days[i],day,{id:days[i].id});
  else days.push(day);
  days.sort((a,b)=>a.date.localeCompare(b.date));
}

function buildMail(e){
  let notes=e.notes||'',cut=false;
  if(notes.length>NOTES_MAX){notes=notes.slice(0,NOTES_MAX);cut=true}
  const spans=e.spans||[];
  const from=e.from||(spans[0]&&spans[0][0])||'';
  const to=e.to||(spans[0]&&spans[0][1])||'';
  const lines=['Docházka '+czDate(e.date)];
  if(spans.length){
    const t=spans.map(([f,t])=>f+'–'+t).join(', ');
    lines.push('Čas: '+t+(e.pause_min?' (pauza '+e.pause_min+' min)':''));
  }
  lines.push('Odpracováno: '+fmt(e.worked_min||0)+(e.nonbillable?' (nefakturuje se)':''),'');
  if(e.work&&e.work.length){lines.push('Na čem jsem pracoval:');e.work.forEach(w=>lines.push('- '+w));lines.push('')}
  if(e.expense){lines.push('Výdaj: '+e.expense.what+' · '+czk(e.expense.czk),'')}
  if(notes){lines.push('Poznámky:',notes);if(cut)lines.push('[poznámky zkráceny]');lines.push('')}
  const json={
    kind:'dochazka',date:e.date,from,to,
    pause_min:e.pause_min||0,worked_min:e.worked_min||0,
    work:e.work||[],notes:notes+(cut?' [zkráceno]':''),
    spans,nonbillable:!!e.nonbillable,expense:e.expense||null
  };
  lines.push('---JSON---',JSON.stringify(json));
  return 'mailto:'+TO+'?subject='+encodeURIComponent('DOCHAZKA '+czDate(e.date))+'&body='+encodeURIComponent(lines.join('\n'));
}

function saveEntry(andSend){
  const c=collectEntry();if(!c)return;
  upsertDay(c.day);
  if(c.expense)expenses.push(c.expense);
  persist();
  if(andSend){
    const e=Object.assign({},c.day,{from:c.day.spans[0]&&c.day.spans[0][0],to:c.day.spans[0]&&c.day.spans[0][1],expense:c.expense||null});
    location.href=buildMail(e);
    c.day.sent=true;persist();
    toast('Uloženo, odešli e-mail');
  }else toast('Uloženo');
  localStorage.removeItem('dochazka_draft');
  clearExpenseFields();
  if(andSend){
    $('from1').value='';$('to1').value='';setSpan2(false);
    $('lunch').checked=true;$('nonbill').checked=false;$('work').value='';$('notes').value='';
    $('date').value=todayISO();
  }
  updateTotal();
  if(view==='month')renderMonth();
  if(view==='invoice')renderInvoice();
}
$('saveSend').onclick=()=>saveEntry(true);
$('saveOnly').onclick=()=>saveEntry(false);

function renderMonth(){
  const [y,m]=monthYM.split('-').map(Number);
  $('monthTitle').textContent=MONTHS[m-1]+' '+y;
  const list=days.filter(d=>d.date.startsWith(monthYM)).sort((a,b)=>a.date.localeCompare(b.date));
  const exp=expenses.filter(e=>e.date.startsWith(monthYM)).sort((a,b)=>a.date.localeCompare(b.date));
  const billMin=list.reduce((a,d)=>a+dayMin(d),0);
  const expSum=exp.reduce((a,e)=>a+e.czk,0);
  $('monthMetrics').innerHTML=
    metric(fmt(billMin),'Odpracováno')+
    metric(czk(pay(billMin)),'Práce ('+settings.rate+' Kč/h)')+
    metric(czk(expSum),'Ostatní náklady')+
    metric(czk(pay(billMin)+expSum),'Celkem k fakturaci');
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
  if(!list.length){
    const empty=days.length
      ? '<div class="card muted">V tomhle měsíci zatím nic není.</div>'
      : '<div class="card"><p class="muted" style="margin:0 0 12px">Zatím tu nejsou žádné dny. Vlož odkaz nebo kód s docházkou.</p><button type="button" class="primary" id="monthImport">Vložit data</button></div>';
    box.innerHTML=empty;
    const b=$('monthImport');if(b)b.onclick=startPasteImport;
  }else
  list.forEach(d=>{
    const b=document.createElement('button');b.type='button';b.className='day'+(d.nonbillable?' nb':'');
    const when=(d.spans||[]).map(([f,t])=>f+'–'+t).join(', ');
    const areas=(d.areas||[]).map(a=>AREAS[a]||a).filter(Boolean).join(', ');
    const title=d.work.length?d.work.join(' · '):(d.nonbillable?'Mimo SAPEKOR':'Bez popisu');
    b.innerHTML='<div class="lead"><b>'+esc(czDateLong(d.date))+'</b><span class="meta">'+(d.nonbillable?'nefakturuje se':fmt(d.worked_min)+' · '+czk(pay(dayMin(d))))+'</span></div>'+
      '<div class="title">'+esc(title)+'</div>'+
      (when||areas||d.notes?'<div class="detail">'+esc([when,areas,d.notes].filter(Boolean).join(' · '))+'</div>':'');
    b.onclick=()=>{setView('entry');fillForm(d,false);window.scrollTo(0,0)};
    box.appendChild(b);
  });
  const expBox=$('monthExp');const expTitle=$('monthExpTitle');
  if(!exp.length){expTitle.hidden=true;expBox.innerHTML=''}
  else{
    expTitle.hidden=false;
    expBox.innerHTML='<div class="card">'+exp.map(e=>'<div class="rowline"><div><b>'+esc(czDate(e.date))+'</b><div class="muted">'+esc(e.what)+'</div></div><div class="amt">'+czk(e.czk)+'</div></div>').join('')+
      '<div class="bill-total"><span>Celkem výdaje</span><span>'+czk(expSum)+'</span></div></div>';
  }
}
function metric(v,l){return '<div class="metric"><div class="v">'+esc(v)+'</div><div class="l">'+esc(l)+'</div></div>'}
$('prevMonth').onclick=()=>{const d=parseISO(monthYM+'-01');d.setMonth(d.getMonth()-1);monthYM=toISO(d).slice(0,7);renderMonth()};
$('nextMonth').onclick=()=>{const d=parseISO(monthYM+'-01');d.setMonth(d.getMonth()+1);monthYM=toISO(d).slice(0,7);renderMonth()};

function renderInvoice(){
  const p=period();
  const openDays=days.filter(d=>inPeriod(d.date,p)&&dayMin(d)>0).sort((a,b)=>a.date.localeCompare(b.date));
  const openMin=openDays.reduce((a,d)=>a+dayMin(d),0);
  const openExp=expenses.filter(e=>inPeriod(e.date,p)).sort((a,b)=>a.date.localeCompare(b.date));
  const expSum=openExp.reduce((a,e)=>a+e.czk,0);
  const total=pay(openMin)+expSum;
  let html='<p class="muted" style="margin:0 0 10px">Období '+esc(czPeriod(p.start,p.end))+(p.end<='2026-11-30'&&settings.billedUntil<'2026-11-30'?' · pak už celé kalendářní měsíce':'')+', bez DPH.</p>';
  html+='<div class="rowline"><div>Práce, '+openDays.length+' dnů zatím</div><div class="amt">'+fmt(openMin)+' × '+settings.rate+' Kč<br>'+czk(pay(openMin))+'</div></div>';
  openExp.forEach(e=>{html+='<div class="rowline"><div>'+esc(e.what)+'<div class="muted">'+esc(czDateLong(e.date))+'</div></div><div class="amt">'+czk(e.czk)+'</div></div>'});
  html+='<div class="bill-total"><span>Zatím celkem</span><span>'+czk(total)+'</span></div>';
  html+='<div class="actions"><button type="button" class="secondary" id="markBilled">Období je vyfakturované</button></div>';
  $('nextInvoice').innerHTML=html;
  $('markBilled').onclick=()=>openMarkBilled(p,openMin,expSum,total);
  const box=$('pastInvoices');
  const list=[...invoices].sort((a,b)=>a.date.localeCompare(b.date));
  if(!list.length)box.innerHTML='<div class="card muted">Zatím žádná zapsaná faktura.</div>';
  else box.innerHTML='<div class="card">'+list.map(e=>'<div class="rowline"><div><b>'+esc(czDate(e.date))+'</b><div class="muted">'+esc(e.what)+'</div></div><div class="amt">'+czk(e.czk)+'</div></div>').join('')+'</div>';
}

function openSheet(title,body,opts){
  sheetMode=opts.mode;sheetTarget=opts.target||null;
  $('sheetTitle').textContent=title;
  $('sheetBody').innerHTML=body;
  $('sheetSave').textContent=opts.saveLabel||'Uložit';
  $('sheetSave').hidden=!!opts.hideSave;
  $('sheetDelete').hidden=!opts.deletable;
  $('overlay').hidden=false;document.body.classList.add('locked');
}
function closeSheet(){$('overlay').hidden=true;document.body.classList.remove('locked');sheetMode=null;sheetTarget=null}
$('sheetCancel').onclick=closeSheet;
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('overlay').hidden)closeSheet()});

$('settingsBtn').onclick=()=>{
  openSheet('Nastavení',
    '<div class="field"><label for="sBilled">Vyfakturováno do (včetně)</label><input type="date" id="sBilled" value="'+esc(settings.billedUntil)+'"></div>'+
    '<div class="field"><label for="sSpecial">Konec přechodného období</label><input type="date" id="sSpecial" value="'+esc(settings.specialEnd)+'"><div class="muted">Teď 16. 10. – 30. 11. 2026, potom celé kalendářní měsíce.</div></div>'+
    '<div class="field"><label for="sRate">Hodinovka v Kč</label><input type="number" id="sRate" min="0" step="1" value="'+esc(settings.rate)+'"></div>'+
    '<div class="actions"><button type="button" class="secondary" id="sImport">Vložit data</button></div>',
    {mode:'settings'}
  );
  const ib=$('sImport');if(ib)ib.onclick=()=>{closeSheet();startPasteImport()};
};
function openMarkBilled(p,openMin,expSum,total){
  openSheet('Zapsat fakturu',
    '<p class="muted">Období '+esc(czPeriod(p.start,p.end))+' · '+fmt(openMin)+' + výdaje '+czk(expSum)+'</p>'+
    '<div class="field"><label for="invDate">Datum faktury</label><input type="date" id="invDate" value="'+todayISO()+'"></div>'+
    '<div class="field"><label for="invWhat">Popis</label><input type="text" id="invWhat" value="Faktura za '+esc(czPeriod(p.start,p.end))+'"></div>'+
    '<div class="field"><label for="invCzk">Částka bez DPH</label><input type="number" id="invCzk" min="0" step="1" value="'+Math.round(total)+'"></div>'+
    '<label class="check"><input type="checkbox" id="invClose" checked> Označit období jako vyfakturované (do '+esc(czDate(p.end))+')</label>',
    {mode:'invoice',saveLabel:'Uložit fakturu'}
  );
}
$('sheetSave').onclick=()=>{
  if(sheetMode==='settings'){
    const b=$('sBilled').value,s=$('sSpecial').value,r=Number($('sRate').value);
    if(!b||!s||!isFinite(r)||r<0){toast('Zkontroluj nastavení');return}
    settings.billedUntil=b;settings.specialEnd=s;settings.rate=r;persist();closeSheet();renderInvoice();if(view==='month')renderMonth();updateTotal();toast('Nastavení uloženo');
  }else if(sheetMode==='invoice'){
    const date=$('invDate').value,what=$('invWhat').value.trim(),cz=Number($('invCzk').value);
    if(!date||!what||!isFinite(cz)){toast('Doplň datum, popis a částku');return}
    invoices.push({id:uid(),date,what,czk:cz});
    if($('invClose').checked){const p=period();settings.billedUntil=p.end}
    persist();closeSheet();renderInvoice();toast('Faktura zapsána');
  }
};
$('sheetDelete').onclick=()=>{};

function b64urlDecode(s){
  s=String(s).replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  const bin=atob(s);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function extractImportPayload(raw){
  let s=String(raw||'').trim().replace(/^[\s'"`]+|[\s'"`]+$/g,'');
  const hashAt=s.lastIndexOf('#import=');
  const plainAt=s.lastIndexOf('import=');
  if(hashAt>=0)s=s.slice(hashAt+8);
  else if(plainAt>=0)s=s.slice(plainAt+7);
  s=s.replace(/\s+/g,'');
  try{s=decodeURIComponent(s)}catch(e){}
  return s;
}
function parseImportedData(raw){
  let data=JSON.parse(b64urlDecode(extractImportPayload(raw)));
  if(Array.isArray(data))data={days:data};
  if(!data||typeof data!=='object')return {days:[],expenses:[],invoices:[]};
  const incomingDays=(data.days||[]).map(x=>normalizeDay(Object.assign({imported:true},x))).filter(Boolean);
  const incomingExp=(data.expenses||[]).map(normalizeExp).filter(Boolean);
  const incomingInv=(data.invoices||data.invoiced||[]).map(normalizeInv).filter(Boolean);
  return {days:incomingDays,expenses:incomingExp,invoices:incomingInv,billedUntil:data.billedUntil,specialEnd:data.specialEnd,rate:data.rate};
}
function importSummary(data){
  const n=(data.days||[]).length,ex=(data.expenses||[]).length,inv=(data.invoices||[]).length;
  const parts=[];
  if(n)parts.push(n+' '+(n===1?'den':n<5?'dny':'dní'));
  if(ex)parts.push(ex+' '+(ex===1?'výdaj':ex<5?'výdaje':'výdajů'));
  if(inv)parts.push(inv+' '+(inv===1?'fakturu':inv<5?'faktury':'faktur'));
  return {days:n,ex,inv,parts};
}
function applyImportedData(data){
  const s=importSummary(data);
  if(!s.parts.length){toast('V odkazu nejsou žádná data');return false}
  const existing=days.length||expenses.length||invoices.length;
  if(!confirm('Nahrát '+s.parts.join(', ')+'?'+(existing?' Stávající se nahradí.':'')))return false;
  days=(data.days||[]).slice();
  expenses=(data.expenses||[]).slice();
  invoices=(data.invoices||[]).slice();
  days.sort((a,b)=>a.date.localeCompare(b.date));
  expenses.sort((a,b)=>a.date.localeCompare(b.date));
  invoices.sort((a,b)=>a.date.localeCompare(b.date));
  if(data.billedUntil)settings.billedUntil=data.billedUntil;
  if(data.specialEnd)settings.specialEnd=data.specialEnd;
  if(data.rate)settings.rate=Number(data.rate);
  persist();
  const last=days[days.length-1];if(last)monthYM=last.date.slice(0,7);
  updateTotal();updateImportHint();
  if(view==='month')renderMonth();
  if(view==='invoice')renderInvoice();
  toast('Načteno: '+s.parts.join(', '));
  return true;
}
function handleImport(){
  const hash=location.hash||'';
  if(!/(?:^|#)import=/.test(hash))return;
  history.replaceState(null,'',location.pathname+location.search);
  let data;
  try{data=parseImportedData(hash)}catch(e){toast('Import se nepovedl');return}
  applyImportedData(data);
}
function openImportSheet(prefill){
  $('importText').value=prefill||'';
  $('importOverlay').hidden=false;
  document.body.classList.add('locked');
  setTimeout(()=>$('importText').focus(),50);
}
function closeImportSheet(){
  $('importOverlay').hidden=true;
  if($('overlay').hidden)document.body.classList.remove('locked');
}
async function startPasteImport(){
  let text='';
  try{
    if(navigator.clipboard&&navigator.clipboard.readText)text=(await navigator.clipboard.readText())||'';
  }catch(e){}
  text=String(text).trim();
  if(text){
    try{
      const data=parseImportedData(text);
      if(importSummary(data).parts.length&&applyImportedData(data))return;
    }catch(e){}
  }
  openImportSheet(text);
}
$('importBtn').onclick=startPasteImport;
const entryImp=$('entryImport');if(entryImp)entryImp.onclick=startPasteImport;
$('importCancel').onclick=closeImportSheet;
$('importOverlay').addEventListener('click',e=>{if(e.target===$('importOverlay'))closeImportSheet()});
$('importGo').onclick=()=>{
  const text=$('importText').value.trim();
  if(!text){toast('Vlož odkaz nebo kód');$('importText').focus();return}
  let data;
  try{data=parseImportedData(text)}catch(e){toast('Import se nepovedl');return}
  if(applyImportedData(data))closeImportSheet();
};

(function initForm(){
  const d=load('dochazka_draft',null);
  if(d){
    $('date').value=d.date||todayISO();
    $('from1').value=d.from1||'';$('to1').value=d.to1||'';
    if(d.span2){setSpan2(true);$('from2').value=d.from2||'';$('to2').value=d.to2||''}
    $('lunch').checked=d.lunch!==false;$('nonbill').checked=!!d.nonbill;
    $('work').value=d.work||'';$('notes').value=d.notes||'';
    $('expWhat').value=d.expWhat||'';$('expCzk').value=d.expCzk||'';
  }
  if(!$('date').value)$('date').value=todayISO();
  if(!d&&findDay($('date').value))loadDateIntoForm($('date').value,false);
  updateTotal();
})();
updateImportHint();
handleImport();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
})();
