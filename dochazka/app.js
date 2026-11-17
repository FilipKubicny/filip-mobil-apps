(function(){
const TO='b3b17pd7+mobil@mail.grokbot.com', PAUSE=30, NOTES_MAX=1500;
const $=id=>document.getElementById(id);
const F={date:$('date'),from:$('from'),to:$('to'),work:$('work'),notes:$('notes')};
const pad=n=>String(n).padStart(2,'0');
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const czDate=iso=>{const [y,m,d]=iso.split('-');return (+d)+'.'+(+m)+'.'+y};
const mins=t=>{if(!t)return null;const [h,m]=t.split(':');return (+h)*60+(+m)};
const fmt=m=>{const h=Math.floor(m/60),r=m%60;return r?h+' h '+r+' min':h+' h'};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function worked(){const a=mins(F.from.value),b=mins(F.to.value);if(a==null||b==null)return null;let d=b-a;if(d<0)d+=1440;return Math.max(0,d-PAUSE)}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)}
function update(){
  const w=worked();
  $('total').innerHTML=(w==null?'Odpracováno: –':'Odpracováno: '+fmt(w))+'<small>pauza 30 min odečtena</small>';
  const n=F.notes.value.length,wEl=$('notesWarn');
  if(n>NOTES_MAX){wEl.hidden=false;wEl.textContent='Poznámky mají '+n+' znaků, do e-mailu se vejde jen prvních '+NOTES_MAX+'. Zbytek pošli zvlášť.'}else wEl.hidden=true;
  save('dochazka_draft',{date:F.date.value,from:F.from.value,to:F.to.value,work:F.work.value,notes:F.notes.value});
}
function buildMail(e){
  let notes=e.notes, cut=false;
  if(notes.length>NOTES_MAX){notes=notes.slice(0,NOTES_MAX);cut=true}
  const lines=['Docházka '+czDate(e.date),'Čas: '+e.from+'–'+e.to+' (pauza '+PAUSE+' min)','Odpracováno: '+fmt(e.worked_min),''];
  if(e.work.length){lines.push('Na čem jsem pracoval:');e.work.forEach(w=>lines.push('- '+w));lines.push('')}
  if(notes){lines.push('Poznámky:',notes);if(cut)lines.push('[poznámky zkráceny]');lines.push('')}
  const json={kind:'dochazka',date:e.date,from:e.from,to:e.to,pause_min:PAUSE,worked_min:e.worked_min,work:e.work,notes:notes+(cut?' [zkráceno]':'')};
  lines.push('---JSON---',JSON.stringify(json));
  return 'mailto:'+TO+'?subject='+encodeURIComponent('DOCHAZKA '+czDate(e.date))+'&body='+encodeURIComponent(lines.join('\n'));
}
function render(){
  const h=load('dochazka_history',[]),el=$('history');
  if(!h.length){el.innerHTML='<div class="muted">Zatím žádné záznamy.</div>';return}
  el.innerHTML='';
  h.slice(0,30).forEach((e,i)=>{
    const d=document.createElement('div');d.className='hist';
    d.innerHTML='<div><b>'+czDate(e.date)+'</b> · '+e.from+'–'+e.to+'<div class="muted">'+fmt(e.worked_min)+' · <span class="badge'+(e.sent?' ok':'')+'">'+(e.sent?'odesláno':'neodesláno')+'</span></div></div>';
    const b=document.createElement('button');b.className='secondary small';b.textContent='Odeslat znovu';
    b.onclick=()=>{location.href=buildMail(e);e.sent=true;e.sentAt=Date.now();save('dochazka_history',h);render()};
    d.appendChild(b);el.appendChild(d);
  });
}
$('send').onclick=()=>{
  const w=worked();
  if(!F.date.value){toast('Vyplň datum');return}
  if(w==null){toast('Vyplň čas od a do');return}
  const e={date:F.date.value,from:F.from.value,to:F.to.value,worked_min:w,work:F.work.value.split('\n').map(s=>s.trim()).filter(Boolean),notes:F.notes.value.trim(),sent:true,sentAt:Date.now()};
  const h=load('dochazka_history',[]).filter(x=>x.date!==e.date);
  h.unshift(e);h.sort((a,b)=>b.date.localeCompare(a.date));save('dochazka_history',h.slice(0,100));
  location.href=buildMail(e);
  localStorage.removeItem('dochazka_draft');
  F.date.value=todayISO();F.from.value='';F.to.value='';F.work.value='';F.notes.value='';
  update();render();toast('Uloženo, odešli e-mail');
};
const d=load('dochazka_draft',null);
if(d){for(const k in F)F[k].value=d[k]||''}
if(!F.date.value)F.date.value=todayISO();
Object.values(F).forEach(f=>f.addEventListener('input',update));
update();render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
})();
