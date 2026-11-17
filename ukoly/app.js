(function(){
const TO='b3b17pd7+mobil@mail.grokbot.com';
const BODY_MAX=1800;
const STORE='ukoly_tasks';
const LAST='ukoly_last';
const SNAP='ukoly_snap';

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
const STATUSES=[
  {id:'open',name:'Otevřené'},
  {id:'wip',name:'Rozpracované'},
  {id:'wait',name:'Čeká'},
  {id:'done',name:'Hotovo'}
];

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const czDate=iso=>{if(!iso)return '';const [y,m,d]=String(iso).split('-');return (+d)+'.'+(+m)+'.'+y};
const toISO=v=>{
  if(!v)return '';
  if(typeof v==='number'){const d=new Date(v);if(isNaN(d))return '';return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  if(/^\d{4}-\d{2}-\d{2}/.test(v))return v.slice(0,10);
  const d=new Date(v);if(isNaN(d))return '';return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=()=>'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const catBy=id=>CATS.find(c=>c.id===id)||CATS[CATS.length-1];
const buckBy=id=>BUCKETS.find(b=>b.id===id)||BUCKETS[1];
const stBy=id=>STATUSES.find(s=>s.id===id)||STATUSES[0];

function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.remove('show'),2500)}

function normalize(raw){
  if(!raw||typeof raw!=='object')return null;
  const text=String(raw.text||raw.t||'').trim();
  if(!text)return null;
  const cat=CATS.some(c=>c.id===(raw.cat||raw.category))? (raw.cat||raw.category) : 'ost';
  const bucket=BUCKETS.some(b=>b.id===(raw.bucket||raw.b))? (raw.bucket||raw.b) : 'weeks';
  let status=raw.status||raw.s;
  if(status==='later')status='wait';
  if(raw.done===true)status='done';
  if(!STATUSES.some(s=>s.id===status))status='open';
  const created=toISO(raw.created||raw.cr)||todayISO();
  const doneAt=status==='done'?(toISO(raw.doneAt||raw.d||raw.done_date)||created): (raw.doneAt||raw.d?toISO(raw.doneAt||raw.d):'');
  return {
    id:String(raw.id||uid()),
    text,
    cat,
    bucket,
    note:String(raw.note||raw.n||'').trim(),
    status,
    created,
    doneAt,
    prevStatus:raw.prevStatus||'open',
    sentNew:!!raw.sentNew,
    sentDone:!!raw.sentDone,
    updated:raw.updated||Date.now()
  };
}

let tasks=(load(STORE,[])||[]).map(normalize).filter(Boolean);
const persist=()=>save(STORE,tasks);

let tab='tomorrow';
let filter='all';
let editing=null;
const draft={text:'',cat:'ost',bucket:'tomorrow',status:'open',note:''};

function pending(){
  return{
    nw:tasks.filter(t=>t.status!=='done'&&!t.sentNew),
    dn:tasks.filter(t=>t.status==='done'&&!t.sentDone)
  };
}

function visible(){
  return tasks.filter(t=>{
    if(filter!=='all'&&t.cat!==filter)return false;
    if(tab==='done')return t.status==='done';
    return t.status!=='done'&&t.bucket===tab;
  }).sort((a,b)=>{
    const so={wip:0,open:1,wait:2,done:3};
    return (so[a.status]-so[b.status])||String(a.created).localeCompare(String(b.created))||a.text.localeCompare(b.text,'cs');
  });
}

function countFor(bucketId){
  return tasks.filter(t=>{
    if(filter!=='all'&&t.cat!==filter)return false;
    if(bucketId==='done')return t.status==='done';
    return t.status!=='done'&&t.bucket===bucketId;
  }).length;
}

function renderTabs(){
  const el=$('tabs');el.innerHTML='';
  BUCKETS.concat([{id:'done',name:'Hotovo',short:'Hotovo'}]).forEach(b=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='tab'+(tab===b.id?' on':'');
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected',tab===b.id?'true':'false');
    btn.innerHTML=esc(b.short)+' <span class="n">'+countFor(b.id)+'</span>';
    btn.onclick=()=>{tab=b.id;render()};
    el.appendChild(btn);
  });
}

function renderFilters(){
  const el=$('filters');el.innerHTML='';
  [{id:'all',name:'Vše',short:'Vše',color:null}].concat(CATS).forEach(c=>{
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='fchip'+(filter===c.id?' on':'');
    if(c.color)btn.style.setProperty('--cat',c.color);
    btn.innerHTML=(c.color?'<span class="dot"></span>':'')+esc(c.short);
    btn.onclick=()=>{filter=c.id;render()};
    el.appendChild(btn);
  });
}

function renderList(){
  const el=$('list');el.innerHTML='';
  const items=visible();
  const empty=$('empty');
  if(!items.length){
    empty.hidden=false;
    empty.textContent=tasks.length
      ? (tab==='done'?'Zatím žádné hotové úkoly v tomto filtru.':'V tomhle období zatím nic není.')
      : 'Zatím žádné úkoly. Přidej první tlačítkem dole.';
    return;
  }
  empty.hidden=true;
  items.forEach(t=>{
    const c=catBy(t.cat),st=stBy(t.status);
    const d=document.createElement('div');
    d.className='task'+(t.status==='done'?' done':'');
    d.style.setProperty('--cat',c.color);
    d.innerHTML='<button type="button" class="chk'+(t.status==='done'?' on':'')+'" aria-label="'+(t.status==='done'?'Vrátit mezi otevřené':'Označit jako hotové')+'">'+(t.status==='done'?'✓':'')+'</button>'+
      '<div class="body"><div class="ttext">'+esc(t.text)+'</div>'+
      (t.note?'<div class="tnote">'+esc(t.note)+'</div>':'')+
      '<div class="tmeta"><span class="pill"><span class="dot" style="background:'+c.color+'"></span>'+esc(c.name)+'</span>'+
      '<span class="pill '+esc(t.status)+'">'+esc(st.name)+'</span></div></div>';
    d.querySelector('.chk').onclick=ev=>{ev.stopPropagation();toggleDone(t)};
    d.querySelector('.body').onclick=()=>openSheet(t);
    el.appendChild(d);
  });
}

function render(){renderTabs();renderFilters();renderList()}

function toggleDone(t){
  if(t.status==='done'){
    t.status=t.prevStatus&&t.prevStatus!=='done'?t.prevStatus:'open';
    t.doneAt='';
    t.sentDone=false;
  }else{
    t.prevStatus=t.status;
    t.status='done';
    t.doneAt=todayISO();
    t.sentDone=false;
  }
  t.updated=Date.now();
  persist();render();
  toast(t.status==='done'?'Hotovo':'Vráceno mezi otevřené');
}

function paintChips(el,options,value,withDot){
  el.innerHTML='';
  options.forEach(o=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='chip'+(o.id===value?' on':'');
    if(withDot&&o.color){b.style.setProperty('--cat',o.color);b.innerHTML='<span class="dot"></span>'+esc(o.name)}
    else b.textContent=o.name;
    b.onclick=()=>{
      if(el=== $('fCat'))draft.cat=o.id;
      if(el===$('fBucket'))draft.bucket=o.id;
      if(el===$('fStatus'))draft.status=o.id;
      paintChips(el,options,o.id,withDot);
    };
    el.appendChild(b);
  });
}

function fillSheet(){
  $('fText').value=draft.text;
  $('fNote').value=draft.note;
  paintChips($('fCat'),CATS,draft.cat,true);
  paintChips($('fBucket'),BUCKETS,draft.bucket,false);
  paintChips($('fStatus'),STATUSES,draft.status,false);
  if(editing){
    const parts=[];
    if(editing.created)parts.push('Přidáno '+czDate(editing.created));
    if(editing.doneAt)parts.push('hotovo '+czDate(editing.doneAt));
    $('fDates').textContent=parts.join(' · ');
  }else $('fDates').textContent='';
}

function openSheet(task){
  editing=task||null;
  if(task){
    draft.text=task.text;draft.cat=task.cat;draft.bucket=task.bucket;draft.status=task.status;draft.note=task.note||'';
    $('sheetTitle').textContent='Upravit úkol';
    $('deleteBtn').hidden=false;
  }else{
    draft.text='';draft.cat=filter!=='all'?filter:'ost';
    draft.bucket=tab==='done'?'weeks':tab;
    draft.status='open';draft.note='';
    $('sheetTitle').textContent='Nový úkol';
    $('deleteBtn').hidden=true;
  }
  fillSheet();
  $('overlay').hidden=false;
  document.body.classList.add('locked');
  setTimeout(()=>$('fText').focus(),50);
}

function closeSheet(){
  $('overlay').hidden=true;
  document.body.classList.remove('locked');
  editing=null;
}

function saveSheet(){
  const text=$('fText').value.trim();
  const note=$('fNote').value.trim();
  if(!text){toast('Napiš úkol');$('fText').focus();return}
  if(editing){
    const becameDone=editing.status!=='done'&&draft.status==='done';
    const becameOpen=editing.status==='done'&&draft.status!=='done';
    if(becameDone){editing.prevStatus=editing.status;editing.doneAt=todayISO();editing.sentDone=false}
    if(becameOpen){editing.doneAt='';editing.sentDone=false}
    editing.text=text;editing.cat=draft.cat;editing.bucket=draft.bucket;editing.status=draft.status;editing.note=note;
    editing.updated=Date.now();
    toast('Úkol uložen');
  }else{
    tasks.push(normalize({id:uid(),text,cat:draft.cat,bucket:draft.bucket,status:draft.status,note,created:todayISO(),sentNew:false,sentDone:false,updated:Date.now()}));
    toast('Úkol přidán');
  }
  persist();closeSheet();render();
}

function deleteSheet(){
  if(!editing)return;
  if(!confirm('Smazat úkol „'+editing.text+'“?'))return;
  tasks=tasks.filter(t=>t!==editing);
  persist();closeSheet();render();toast('Úkol smazán');
}

$('addBtn').onclick=()=>openSheet(null);
$('cancelBtn').onclick=closeSheet;
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closeSheet()});
$('saveBtn').onclick=saveSheet;
$('deleteBtn').onclick=deleteSheet;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('overlay').hidden)closeSheet()});

function compactTask(t){
  const o={id:t.id,t:t.text,c:t.cat,b:t.bucket,s:t.status,cr:t.created};
  if(t.note)o.n=t.note;
  if(t.doneAt)o.d=t.doneAt;
  return o;
}
function strip(t){return {text:t.text,note:(t.note||'').trim()}}
function snapshotOf(list){return list.map(t=>({id:t.id,s:t.status,b:t.bucket,c:t.cat,t:t.text,n:t.note||''}))}

function changedSinceLast(){
  const snap=load(SNAP,[]);
  const map=new Map(snap.map(x=>[x.id,x]));
  return tasks.filter(t=>{
    const p=map.get(t.id);
    if(!p)return true;
    return p.s!==t.status||p.b!==t.bucket||p.c!==t.cat||p.t!==t.text||(p.n||'')!==(t.note||'');
  });
}

function buildMail(payload){
  const L=['Úkoly '+czDate(payload.date),''];
  const item=t=>'- '+t.text+(t.note?' ('+t.note+')':'');
  if(payload.new.length){L.push('Nové úkoly:');payload.new.forEach(t=>L.push(item(t)));L.push('')}
  if(payload.done.length){L.push('Hotovo:');payload.done.forEach(t=>L.push(item(t)));L.push('')}
  if(payload.notes){L.push('Poznámky:',payload.notes,'')}
  const head=()=>L.join('\n')+'---JSON---\n';
  const json={kind:'ukoly',date:payload.date,new:payload.new,done:payload.done,notes:payload.notes||'',tasks:payload.tasks};
  let body=head()+JSON.stringify(json);
  if(body.length>BODY_MAX){
    json.tasks=payload.changes||payload.tasks;
    json.full=false;
    body=head()+JSON.stringify(json);
  }
  if(body.length>BODY_MAX){
    L.length=0;
    L.push('Úkoly '+czDate(payload.date),'');
    body=head()+JSON.stringify(json);
  }
  if(body.length>BODY_MAX){
    delete json.notes;
    json.truncated=true;
    const slim={kind:'ukoly',date:payload.date,new:payload.new,done:payload.done,notes:'',tasks:json.tasks,full:false,truncated:true};
    body='---JSON---\n'+JSON.stringify(slim);
  }
  return 'mailto:'+TO+'?subject='+encodeURIComponent('UKOLY '+czDate(payload.date))+'&body='+encodeURIComponent(body);
}

$('send').onclick=()=>{
  const p=pending();
  const notes='';
  const changes=changedSinceLast();
  if(!p.nw.length&&!p.dn.length&&!changes.length&&!tasks.length){toast('Není co odeslat');return}
  const payload={
    date:todayISO(),
    new:p.nw.map(strip),
    done:p.dn.map(strip),
    notes,
    tasks:tasks.map(compactTask),
    changes:changes.map(compactTask)
  };
  save(LAST,{date:payload.date,new:payload.new,done:payload.done,notes:payload.notes});
  location.href=buildMail(payload);
  p.nw.forEach(t=>t.sentNew=true);
  p.dn.forEach(t=>t.sentDone=true);
  save(SNAP,snapshotOf(tasks));
  persist();
  toast('Odešli e-mail v poště');
};

function b64urlDecode(s){
  s=String(s).replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  const bin=atob(s);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function mergeImported(incoming){
  const byId=new Map(tasks.map(t=>[t.id,t]));
  const byText=new Map(tasks.map(t=>[t.text.toLowerCase(),t]));
  let added=0,updated=0;
  incoming.forEach(t=>{
    let cur=byId.get(t.id);
    if(!cur)cur=byText.get(t.text.toLowerCase());
    if(cur){
      cur.text=t.text;cur.cat=t.cat;cur.bucket=t.bucket;cur.note=t.note;cur.status=t.status;
      cur.created=t.created||cur.created;
      cur.doneAt=t.status==='done'?(t.doneAt||cur.doneAt||todayISO()):'';
      cur.prevStatus=t.prevStatus||cur.prevStatus;
      cur.updated=Date.now();
      updated++;
    }else{
      t.sentNew=true;
      t.sentDone=t.status==='done';
      tasks.push(t);
      added++;
    }
  });
  persist();
  return {added,updated};
}

function handleImport(){
  const hash=location.hash||'';
  const m=hash.match(/^#?import=(.+)$/);
  if(!m)return;
  let incoming;
  try{
    const parsed=JSON.parse(b64urlDecode(decodeURIComponent(m[1])));
    incoming=(Array.isArray(parsed)?parsed:[]).map(normalize).filter(Boolean);
  }catch(e){
    history.replaceState(null,'',location.pathname+location.search);
    toast('Import se nepovedl');
    return;
  }
  history.replaceState(null,'',location.pathname+location.search);
  if(!incoming.length){toast('V odkazu nejsou žádné úkoly');return}
  if(!confirm('Nahrát '+incoming.length+' úkolů?'))return;
  const r=mergeImported(incoming);
  render();
  toast('Načteno: '+r.added+' nových, '+r.updated+' upravených');
}

render();
handleImport();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
})();
