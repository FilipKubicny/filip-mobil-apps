(function(){
const TO='b3b17pd7+mobil@mail.grokbot.com', NOTES_MAX=1500;
const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const czDate=iso=>{const [y,m,d]=iso.split('-');return (+d)+'.'+(+m)+'.'+y};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let tasks=load('ukoly_tasks',[]);
const persist=()=>save('ukoly_tasks',tasks);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500)}
const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pending(){return{nw:tasks.filter(t=>!t.sentNew),dn:tasks.filter(t=>t.done&&!t.sentDone)}}
function render(){
  const el=$('list');el.innerHTML='';
  if(!tasks.length){el.innerHTML='<div class="muted">Žádné úkoly. Přidej první nahoře.</div>'}
  const sorted=[...tasks].sort((a,b)=>(a.done-b.done)||(b.created-a.created));
  sorted.forEach(t=>{
    const d=document.createElement('div');d.className='task'+(t.done?' done':'');
    d.innerHTML='<button class="chk" aria-label="Hotovo">'+(t.done?'✓':'')+'</button><div class="tbody"><div class="ttext">'+esc(t.text)+'</div>'+
      (t.showNote||t.note?'<textarea class="tnote" placeholder="Poznámka k úkolu">'+esc(t.note||'')+'</textarea>':'')+
      '<div class="tmeta">'+(t.showNote||t.note?'':'<button class="link addnote">+ poznámka</button>')+
      (t.sentNew?'<span class="badge ok">odesláno</span>':'<span class="badge">nový</span>')+'</div></div><button class="del" aria-label="Smazat">×</button>';
    d.querySelector('.chk').onclick=()=>{t.done=!t.done;if(t.done)t.doneAt=Date.now();else t.sentDone=false;persist();render()};
    const n=d.querySelector('.tnote');if(n)n.oninput=()=>{t.note=n.value;persist()};
    const an=d.querySelector('.addnote');if(an)an.onclick=()=>{t.showNote=true;render();const x=[...$('list').querySelectorAll('.task')][sorted.indexOf(t)].querySelector('.tnote');x&&x.focus()};
    d.querySelector('.del').onclick=()=>{if(confirm('Smazat úkol „'+t.text+'“?')){tasks=tasks.filter(x=>x!==t);persist();render()}};
    el.appendChild(d);
  });
  const p=pending();
  $('pending').textContent=(p.nw.length||p.dn.length)?'K odeslání: '+p.nw.length+' nových, '+p.dn.length+' hotových':'Vše odesláno.';
}
$('addBtn').onclick=()=>{
  const lines=$('add').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!lines.length){toast('Napiš úkol');return}
  lines.forEach(l=>tasks.push({id:uid(),text:l,note:'',done:false,created:Date.now(),sentNew:false,sentDone:false}));
  $('add').value='';save('ukoly_draft','');persist();render();toast(lines.length>1?'Přidáno '+lines.length+' úkolů':'Úkol přidán');
};
$('add').value=load('ukoly_draft','');
$('add').oninput=()=>save('ukoly_draft',$('add').value);
$('notes').value=load('ukoly_notes','');
$('notes').oninput=()=>{const v=$('notes').value;save('ukoly_notes',v);const w=$('notesWarn');if(v.length>NOTES_MAX){w.hidden=false;w.textContent='Poznámky mají '+v.length+' znaků, do e-mailu se vejde jen prvních '+NOTES_MAX+'.'}else w.hidden=true};
function buildMail(p){
  let notes=p.notes,cut=false;if(notes.length>NOTES_MAX){notes=notes.slice(0,NOTES_MAX);cut=true}
  const L=['Úkoly '+czDate(p.date),''];
  const item=t=>'- '+t.text+(t.note?' ('+t.note+')':'');
  if(p.new.length){L.push('Nové úkoly:');p.new.forEach(t=>L.push(item(t)));L.push('')}
  if(p.done.length){L.push('Hotovo:');p.done.forEach(t=>L.push(item(t)));L.push('')}
  if(notes){L.push('Poznámky:',notes);if(cut)L.push('[poznámky zkráceny]');L.push('')}
  L.push('---JSON---',JSON.stringify({kind:'ukoly',date:p.date,new:p.new,done:p.done,notes:notes+(cut?' [zkráceno]':'')}));
  let body=L.join('\n');
  return 'mailto:'+TO+'?subject='+encodeURIComponent('UKOLY '+czDate(p.date))+'&body='+encodeURIComponent(body);
}
$('send').onclick=()=>{
  const p=pending(),notes=$('notes').value.trim();
  if(!p.nw.length&&!p.dn.length&&!notes){toast('Není co odeslat');return}
  const strip=t=>({text:t.text,note:(t.note||'').trim()});
  const payload={date:todayISO(),new:p.nw.map(strip),done:p.dn.map(strip),notes};
  save('ukoly_last',payload);
  location.href=buildMail(payload);
  p.nw.forEach(t=>t.sentNew=true);p.dn.forEach(t=>t.sentDone=true);
  persist();$('notes').value='';save('ukoly_notes','');render();toast('Odešli e-mail v poště');
};
$('resend').onclick=()=>{const p=load('ukoly_last',null);if(!p){toast('Zatím nic odesláno');return}location.href=buildMail(p)};
$('clearDone').onclick=()=>{
  const d=tasks.filter(t=>t.done);if(!d.length){toast('Žádné hotové úkoly');return}
  const uns=d.filter(t=>!t.sentDone).length;
  if(!confirm('Vymazat '+d.length+' hotových úkolů?'+(uns?' '+uns+' z nich ještě nebylo odesláno.':'')))return;
  tasks=tasks.filter(t=>!t.done);persist();render();
};
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
})();
