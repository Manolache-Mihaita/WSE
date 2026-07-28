/* app.js - client-side UI for the static PoE1 sound-filter tool.
 * All parsing/patching runs in the browser via engine.js. */
(function () {
"use strict";
const $ = (s) => document.querySelector(s);
const state = { filters: [], catalog: null, buckets: [], sounds: [], uploaded: new Map(),
                customNames: new Set(), scaffold: null,
                bundled: new Set(window.BUNDLED_SOUND_FILES || []) };
const BUNDLED_DIR = "sounds/";
const hasAudio = (name) => state.uploaded.has(name) || state.bundled.has(name);
const bundledUrl = (name) => BUNDLED_DIR + encodeURIComponent(name);

// ---- documentation ----
const FIELD_DOCS = {
  type: "A FilterBlade category tag (e.g. currency, uniques). Prefix match: 'currency' also covers 'currency->essence'.",
  tier: "A value/importance sub-tag within a category (e.g. t1, stack3). Narrows a category.",
  bucket: "Every block that currently plays one specific sound file.",
  baseType: "A single item base type (e.g. \"Divine Orb\").",
  items: "Several base types sharing one sound (grouped by their block so each keeps its look).",
};
const CATEGORY_DOCS = {
  currency:"Stackable currency — orbs, shards, catalysts, oils, essences, fossils, etc.",
  uniques:"Unique-rarity items.", maps:"Maps / Waystones for endgame.", divination:"Divination cards.",
  gems:"Skill and support gems.", fragments:"Map fragments, scarabs, breachstones, splinters.",
  gold:"Gold piles (tiered by stack size).", heist:"Heist contracts, blueprints and gear.",
  jewels:"Jewels — regular, abyss, cluster.", rareid:"Rare items shown for ID/mod-checking.",
  exoticbases:"Notable base types worth chase-basing.", influenced:"Shaper/Elder/Conqueror items.",
};
const describeType = (t) => t ? (CATEGORY_DOCS[t.split("->")[0]] || "") : "";

// ---- IndexedDB (uploaded audio) ----
const DB = "poe-sounds", STORE = "sounds";
function idb(){ return new Promise((res,rej)=>{ const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>r.result.createObjectStore(STORE); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function idbPut(name,blob){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).put(blob,name); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
async function idbAll(){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readonly");
  const k=tx.objectStore(STORE).getAllKeys(), v=tx.objectStore(STORE).getAll(); let keys,vals;
  k.onsuccess=()=>{keys=k.result;}; v.onsuccess=()=>{vals=v.result; res(keys.map((n,i)=>[n,vals[i]]));}; tx.onerror=()=>rej(tx.error); }); }
async function idbClear(){ const db=await idb(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,"readwrite");
  tx.objectStore(STORE).clear(); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }

// ---- sound library ----
function rebuildSounds(){
  const set = new Set([...(window.BUNDLED_SOUND_NAMES||[]), ...state.bundled, ...state.uploaded.keys(), ...state.customNames]);
  state.sounds = [...set].sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
  $("#soundLibInfo").textContent = `${state.sounds.length} names · ${state.bundled.size} bundled · ${state.uploaded.size} uploaded`;
  fillDatalists();
}
async function loadUploaded(){
  try{ const all=await idbAll(); for(const [name,blob] of all) state.uploaded.set(name,{blob,url:URL.createObjectURL(blob)}); }
  catch(e){ /* IDB unavailable */ }
  rebuildSounds();
}
$("#uploadSoundsBtn").onclick = ()=> $("#soundInput").click();
$("#soundInput").onchange = async ()=>{
  for(const f of $("#soundInput").files){ const name=f.name;
    try{ await idbPut(name,f); }catch(e){}
    state.uploaded.set(name,{blob:f,url:URL.createObjectURL(f)});
  }
  $("#soundInput").value=""; rebuildSounds();
  document.querySelectorAll("tr").forEach(tr=>{ if(tr.querySelector(".f-sound")) { /* refresh selects to include new audio */ } });
};
$("#clearSoundsBtn").onclick = async ()=>{ if(!confirm("Remove all uploaded sounds from this browser?")) return;
  await idbClear(); for(const v of state.uploaded.values()) URL.revokeObjectURL(v.url); state.uploaded.clear(); rebuildSounds(); };
function playSound(name){
  if(!name) return; const p=$("#player");
  const up = state.uploaded.get(name);
  if(up){ p.src=up.url; p.play().catch(()=>{}); }
  else if(state.bundled.has(name)){ p.src=bundledUrl(name); p.play().catch(()=>{}); }
  else { $("#tplMsg").innerHTML='<span class="muted">No audio for “'+esc(name)+'”. Upload it, or add it to the bundled sounds.</span>'; }
}

// ---- upload / parse filters ----
const drop=$("#drop"), fileInput=$("#fileInput");
drop.onclick=()=>fileInput.click();
["dragover","dragenter"].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.add("hover");}));
["dragleave","drop"].forEach(e=>drop.addEventListener(e,ev=>{ev.preventDefault();drop.classList.remove("hover");}));
drop.addEventListener("drop",ev=>handleFiles(ev.dataTransfer.files));
fileInput.onchange=()=>handleFiles(fileInput.files);

async function handleFiles(fileList){
  if(!fileList||!fileList.length) return;
  const filters=[]; let addedSounds=false;
  for(const f of fileList){
    const name=f.name.toLowerCase();
    if(name.endsWith(".zip")){
      try{ const zip=await JSZip.loadAsync(f);
        for(const path of Object.keys(zip.files)){ const zf=zip.files[path]; if(zf.dir) continue;
          const base=path.split("/").pop(); const ext=base.toLowerCase().slice(base.lastIndexOf("."));
          if(ext===".filter"){ filters.push({name:base, text: await zf.async("string")}); }
          else if(Engine.AUDIO_EXTENSIONS.has(ext)){ const blob=await zf.async("blob");
            try{ await idbPut(base,blob); }catch(e){} state.uploaded.set(base,{blob,url:URL.createObjectURL(blob)}); addedSounds=true; }
        }
      }catch(e){ $("#uploadMsg").innerHTML='<span class="badge b-err">bad zip: '+esc(f.name)+'</span>'; }
    } else if(name.endsWith(".filter")){ filters.push({name:f.name, text: await f.text()}); }
  }
  if(addedSounds) rebuildSounds();
  if(!filters.length){ $("#uploadMsg").innerHTML='<span class="badge b-err">no .filter files found</span>'; return; }
  loadFilters(filters);
}

function loadFilters(filters){
  state.filters=[]; let catalog=null; const buckets=new Map(); const filesInfo=[];
  for(const f of filters){
    f.text=f.text.replace(/\r\n?/g,"\n");  // normalize newlines to match the CLI output
    const items=Engine.splitIntoLinesAndBlocks(f.text);
    catalog=Engine.buildCatalog(items,catalog);
    Engine.collectBucketSounds(items).forEach((c,s)=>buckets.set(s,(buckets.get(s)||0)+c));
    const fmt=Engine.checkFormat(f.text);
    const blocks=items.filter(x=>x instanceof Engine.Block).length;
    filesInfo.push({name:f.name, format_ok:fmt.format_ok, errors:fmt.errors, blocks});
    state.filters.push({name:f.name, text:f.text, items});
  }
  state.catalog=Engine.catalogToJsonable(catalog);
  state.buckets=[...buckets.keys()].sort().map(s=>({sound:s,blocks:buckets.get(s)}));
  state.scaffold=Engine.buildScaffold(state.filters.flatMap(f=>f.items));
  $("#uploadMsg").textContent="";
  renderFiles(filesInfo); fillDatalists(); renderCatalog();
  $("#filesPanel").classList.remove("hidden"); $("#rulesPanel").classList.remove("hidden");
  $("#genResults").innerHTML="";
  if(state.buckets.length) loadScaffold(); else { $("#rulesBody").innerHTML=""; addRule(); }
}

function renderFiles(files){
  state.files=files;
  $("#scopeNote").innerHTML = files.length>1
    ? '<span class="badge b-info">Editing '+files.length+' filters together</span> — rules apply to all of them.' : '';
  $("#filesList").innerHTML = files.map(f=>{
    const badge=f.format_ok?'<span class="badge b-ok">format OK</span>':'<span class="badge b-err">'+f.errors.length+' issue(s)</span>';
    return '<li><b>'+esc(f.name)+'</b> — '+badge+' <span class="muted">('+f.blocks+' blocks)</span></li>';
  }).join("");
}
function renderCatalog(){
  const c=state.catalog;
  $("#catalogSummary").innerHTML=
    '<span class="stat"><b>'+Object.keys(c.types).length+'</b> $type</span>'+
    '<span class="stat"><b>'+Object.keys(c.tiers).length+'</b> $tier</span>'+
    '<span class="stat"><b>'+state.buckets.length+'</b> sound buckets</span>'+
    '<span class="stat"><b>'+Object.keys(c.items).length+'</b> base types</span>';
}
$("#catRef").onclick=()=>{ $("#catRefBox").classList.toggle("hidden");
  const c=state.catalog; if(!c) return;
  $("#catRefBox").innerHTML=Object.keys(c.types).sort().map(t=>{ const d=describeType(t);
    return '<div style="margin:4px 0"><code>'+esc(t)+'</code> <span class="muted">('+c.types[t].blocks+' blocks)</span>'+
      (d?'<br><span class="muted" style="font-size:12px">'+esc(d)+'</span>':'')+'</div>'; }).join("")||'<span class="muted">none</span>';
};
$("#rulesHelp").onclick=()=>$("#rulesHelpBox").classList.toggle("hidden");

// ---- datalists ----
function setOptions(id,arr){ $("#"+id).innerHTML=arr.slice().sort().map(v=>'<option value="'+esc(v)+'">').join(""); }
function fillDatalists(){ const c=state.catalog;
  if(c){ setOptions("dl-type",Object.keys(c.types)); setOptions("dl-tier",Object.keys(c.tiers));
    setOptions("dl-baseType",Object.keys(c.items)); }
  setOptions("dl-bucket",state.buckets.map(b=>b.sound)); setOptions("dl-sound",state.sounds);
}
function fillSoundSelect(sel,current){
  let html='<option value="">— choose sound —</option>';
  if(current && !state.sounds.includes(current)) html+='<option value="'+esc(current)+'">'+esc(current)+' (custom)</option>';
  html+=state.sounds.map(s=>'<option value="'+esc(s)+'">'+esc(s)+(hasAudio(s)?" ♪":"")+'</option>').join("");
  sel.innerHTML=html; sel.value=current||"";
}

// ---- rules ----
const FIELDS=["type","tier","bucket","soundTier","baseType","items"];
const FIELD_LABELS={type:"type",tier:"tier",bucket:"bucket",soundTier:"sound tier (1-6)",baseType:"baseType",items:"items (group)"};
const splitList=(v)=>(v||"").split(";").map(s=>s.trim()).filter(Boolean);
function ruleObjectForRow(tr){
  const field=tr.querySelector(".f-field").value, value=tr.querySelector(".f-value").value.trim();
  const tierEl=tr.querySelector(".f-tier"), tier=(tierEl&&!tierEl.classList.contains("hidden"))?tierEl.value.trim():"";
  if(field==="items") return {baseTypes:splitList(value)};
  if(field==="baseType") return {baseType:value};
  if(field==="soundTier") return {soundTier: parseInt(value,10)||value};
  const r={}; r[field]=value; if(field==="type"&&tier) r.tier=tier; return r;
}
$("#addRule").onclick=()=>addRule();
$("#loadScaffold").onclick=loadScaffold;

function addRule(preset){
  preset=preset||{};
  const tr=document.createElement("tr");
  tr.innerHTML=`
    <td><select class="f-field">${FIELDS.map(f=>`<option value="${f}" ${preset.field===f?"selected":""}>${FIELD_LABELS[f]}</option>`).join("")}</select></td>
    <td><input class="f-value row-val" placeholder="value…">
        <input class="f-tier row-val hidden" list="dl-tier" placeholder="+ tier (optional, e.g. stack3)" style="margin-top:4px">
        <input class="f-cond row-val hidden" list="dl-cond" placeholder="+ conditions (e.g. Rarity Unique; StackSize >= 3001)" style="margin-top:4px">
        <div class="v-note" style="font-size:11px;margin-top:3px"></div></td>
    <td><div style="display:flex;gap:6px;align-items:center">
        <select class="f-sound row-val"></select>
        <button class="icon f-play" title="Play">▶</button>
        <button class="icon f-rename" title="Type a custom sound name">✎</button></div>
        <div class="f-change" style="font-size:11px;margin-top:3px"></div></td>
    <td><input class="f-vol" type="number" min="0" max="300" style="width:60px" placeholder="300"></td>
    <td class="f-match muted">—</td>
    <td style="white-space:nowrap">
        <button class="icon f-reset hidden" title="Reset to loaded default">↺</button>
        <button class="icon f-items" title="Show affected items/blocks">🔍</button>
        <button class="icon f-del" title="Remove">✕</button></td>`;
  $("#rulesBody").appendChild(tr);
  const field=tr.querySelector(".f-field"), value=tr.querySelector(".f-value"), tier=tr.querySelector(".f-tier"),
        cond=tr.querySelector(".f-cond"), sound=tr.querySelector(".f-sound"), vol=tr.querySelector(".f-vol");
  const syncList=()=>value.setAttribute("list","dl-"+(field.value==="items"?"baseType":field.value));  // dl-soundTier exists
  const syncTier=()=>{ if(field.value==="type") tier.classList.remove("hidden"); else {tier.classList.add("hidden");tier.value="";} };
  const syncCond=()=>{ if(field.value==="baseType"||field.value==="items") cond.classList.remove("hidden"); else {cond.classList.add("hidden");cond.value="";} };
  field.onchange=()=>{ syncList();syncTier();syncCond();updateMatch(tr);updateChange(tr); };
  value.oninput=debounce(()=>{updateMatch(tr);updateChange(tr);},200);
  tier.oninput=debounce(()=>updateMatch(tr),200); cond.oninput=debounce(()=>updateChange(tr),200);
  sound.onchange=()=>updateChange(tr);
  if(preset.field) field.value=preset.field;
  syncList();syncTier();syncCond();
  if(preset.value) value.value=preset.value;
  if(preset.tier){ tier.value=preset.tier; syncTier(); }
  if(preset.conditions&&preset.conditions.length){ cond.value=preset.conditions.join("; "); syncCond(); }
  fillSoundSelect(sound,preset.sound||"");
  if(preset.volume!=null) vol.value=preset.volume;
  tr.querySelector(".f-del").onclick=()=>tr.remove();
  tr.querySelector(".f-play").onclick=()=>playSound(sound.value);
  tr.querySelector(".f-rename").onclick=()=>{ renameSound(sound); updateChange(tr); };
  tr.querySelector(".f-items").onclick=()=>showRuleItems(tr);
  if(preset.value!=null){
    tr.dataset.ofield=preset.field||field.value; tr.dataset.ovalue=preset.value||"";
    tr.dataset.otier=preset.tier||""; tr.dataset.ocond=(preset.conditions||[]).join("; ");
    tr.dataset.osound=preset.sound||""; tr.dataset.ovol=(preset.volume!=null)?preset.volume:"";
    const rb=tr.querySelector(".f-reset"); rb.classList.remove("hidden"); rb.onclick=()=>resetRow(tr);
  }
  if(preset.value) updateMatch(tr);
  updateChange(tr); return tr;
}
function resetRow(tr){
  const field=tr.querySelector(".f-field"), value=tr.querySelector(".f-value"), tier=tr.querySelector(".f-tier"),
        cond=tr.querySelector(".f-cond"), sound=tr.querySelector(".f-sound"), vol=tr.querySelector(".f-vol");
  field.value=tr.dataset.ofield||"type"; value.value=tr.dataset.ovalue||"";
  value.setAttribute("list","dl-"+(field.value==="items"?"baseType":field.value));
  if(field.value==="type"){tier.classList.remove("hidden");}else{tier.classList.add("hidden");} tier.value=tr.dataset.otier||"";
  const isItem=field.value==="baseType"||field.value==="items";
  if(isItem){cond.classList.remove("hidden");}else{cond.classList.add("hidden");} cond.value=tr.dataset.ocond||"";
  fillSoundSelect(sound,tr.dataset.osound||""); vol.value=tr.dataset.ovol||"";
  updateMatch(tr); updateChange(tr);
}
function renameSound(sound){
  const name=prompt("Custom sound file name for this rule:",sound.value||""); if(name==null) return;
  const v=name.trim(); if(!v) return;
  state.customNames.add(v); rebuildSounds();
  if(![...sound.options].some(o=>o.value===v)){ const o=document.createElement("option"); o.value=v; o.textContent=v+" (custom)"; sound.appendChild(o); }
  sound.value=v;
}
function updateMatch(tr){
  const value=tr.querySelector(".f-value").value.trim(), cell=tr.querySelector(".f-match");
  if(!value){ cell.innerHTML='<span class="muted">—</span>'; return; }
  const rule=ruleObjectForRow(tr);
  let matched=0,shown=0,cur=new Set();
  for(const f of state.filters){ const info=Engine.ruleMatchInfo(f.items,rule); matched+=info.matched; shown+=info.shown_blocks; info.current_sounds.forEach(s=>cur.add(s)); }
  if(matched===0){ cell.innerHTML='<span class="badge b-err">no match</span>'; return; }
  const vis=shown>0?'<span class="badge b-ok">shown</span>':'<span class="badge b-hide">hidden only</span>';
  const c=cur.size?' <span class="muted" title="'+esc([...cur].join(", "))+'">↺'+cur.size+'</span>':'';
  cell.innerHTML='<b>'+matched+'</b> block(s) '+vis+c;
}
function updateChange(tr){
  const field=tr.querySelector(".f-field").value, value=tr.querySelector(".f-value").value.trim(),
        snd=tr.querySelector(".f-sound").value.trim(), chg=tr.querySelector(".f-change"), vnote=tr.querySelector(".v-note");
  const identity=field==="bucket"&&snd===value, willChange=!!value&&!!snd&&!identity;
  chg.innerHTML=(!value||!snd)?'<span class="muted">— set a value and sound</span>':(identity?'<span class="muted">no change yet</span>':'<span style="color:var(--gold)">✓ will re-sound to “'+esc(snd)+'”</span>');
  vnote.innerHTML=(!value)?"":(!snd?'<span class="muted">find these blocks…</span>':(identity?'<span class="muted">plays this now</span>':'<span style="color:var(--gold)">→ becomes “'+esc(snd)+'”</span>'));
  const condEl=tr.querySelector(".f-cond");
  if(condEl&&!condEl.classList.contains("hidden")&&condEl.value.trim()) vnote.innerHTML+=' <span class="badge b-info" title="builds a fresh block">+ '+esc(condEl.value.trim())+'</span>';
  tr.classList.toggle("changed",willChange);
}
function loadScaffold(){ $("#rulesBody").innerHTML="";
  state.buckets.forEach(b=>{ const isFile=/\.(mp3|wav|ogg)$/i.test(b.sound);
    addRule({field:"bucket",value:b.sound,sound:isFile?b.sound:""}); }); }
function loadRulesFromMap(map){
  if(!state.filters.length){ $("#tplMsg").innerHTML='<span class="badge b-err">Load a filter first.</span>'; return; }
  $("#rulesBody").innerHTML="";
  (map.categories||[]).forEach(c=>{ let field="type",value="";
    if(c.type!=null){field="type";value=c.type;} else if(c.tier!=null){field="tier";value=c.tier;}
    else if(c.bucket!=null){field="bucket";value=c.bucket;} else if(c.soundTier!=null){field="soundTier";value=String(c.soundTier);}
    const p={field,value,sound:c.sound,volume:c.volume}; if(c.type!=null&&c.tier!=null) p.tier=c.tier; addRule(p);
  });
  (map.items||[]).forEach(i=>{ let field,value;
    if(i.baseTypes&&i.baseTypes.length){field="items";value=i.baseTypes.join("; ");}else{field="baseType";value=i.baseType||"";}
    addRule({field,value,sound:i.sound,volume:i.volume,conditions:i.conditions});
  });
  if(!$("#rulesBody").children.length) addRule();
}
function buildMap(){
  const categories=[],items=[];
  for(const tr of $("#rulesBody").children){
    const field=tr.querySelector(".f-field").value, value=tr.querySelector(".f-value").value.trim(),
          sound=tr.querySelector(".f-sound").value.trim(), volRaw=tr.querySelector(".f-vol").value.trim();
    if(!sound) continue;
    const isItem=(field==="baseType"||field==="items");
    const conds=isItem?splitList((tr.querySelector(".f-cond")||{}).value||""):[];
    // Keep a row only if it has a value, OR it's an item row carrying conditions
    // (a conditions-only rule, e.g. Rarity Unique flasks, legitimately has no BaseType).
    if(!value && !(isItem&&conds.length)) continue;
    const rule=ruleObjectForRow(tr); rule.sound=sound; if(volRaw!=="") rule.volume=parseInt(volRaw,10);
    if(isItem){
      if(field==="baseType"&&!value) delete rule.baseType;   // don't emit an empty BaseType
      if(field==="items"&&!value) delete rule.baseTypes;
      if(conds.length) rule.conditions=conds;
      items.push(rule);
    } else categories.push(rule);
  }
  return { sound_dir:"sound", default_volume:300, categories, items };
}

// ---- affected items drawer ----
function openDrawerHtml(title,html){ $("#drawerTitle").textContent=title; $("#drawerBody").innerHTML=html; $("#drawer").classList.remove("hidden"); }
$("#drawerClose").onclick=()=>$("#drawer").classList.add("hidden");
function showRuleItems(tr){
  const field=tr.querySelector(".f-field").value, value=tr.querySelector(".f-value").value.trim();
  if(!value){ openDrawerHtml("Affected items",'<p class="muted">Enter a value first.</p>'); return; }
  const rule=ruleObjectForRow(tr);
  let matched=0,shown=0,hidden=0; const bts=new Set(), blocks=[];
  for(const f of state.filters){ for(const b of Engine.ruleMatchedBlocks(f.items,rule)){ matched++;
    if(b.keyword==="Show")shown++; else if(b.keyword==="Hide")hidden++;
    b.baseTypes().forEach(x=>bts.add(x));
    if(blocks.length<300) blocks.push({file:f.name,keyword:b.keyword,type:b.tagType(),tier:b.tagTier(),sound:Engine.blockCurrentSound(b),conditions:Engine.blockConditionLines(b)});
  } }
  let baseTypes=[...bts].sort();
  if(rule.baseType) baseTypes=[rule.baseType]; else if(rule.baseTypes) baseTypes=[...new Set(rule.baseTypes)].sort();
  let h='<p><b>'+matched+'</b> block(s) — '+shown+' shown, '+hidden+' hidden.</p>';
  if(field==="type"&&describeType(value)) h+='<p class="muted">'+esc(describeType(value))+'</p>';
  if(baseTypes.length) h+='<p><b>Items ('+baseTypes.length+'):</b></p><div style="font-size:12px;line-height:1.5">'+baseTypes.map(esc).join(", ")+'</div>';
  else h+='<p class="muted">Matches by condition (e.g. Class/Rarity) — see blocks below.</p>';
  h+='<hr style="border-color:var(--edge);margin:12px 0"><p><b>Blocks:</b></p><ul class="issues">';
  h+=blocks.map(b=>{ const tag=((b.type?"$type→"+b.type:"")+(b.tier?"  $tier→"+b.tier:""))||"(untagged)";
    const cond=b.conditions.map(c=>esc(c.length>160?c.slice(0,160)+"…":c)).join("<br>");
    return '<li><span class="badge '+(b.keyword==="Show"?"b-ok":"b-hide")+'">'+b.keyword+'</span> <code>'+esc(tag)+'</code>'+
      '<div class="muted" style="font-size:12px">plays: '+esc(b.sound||"(none)")+'</div>'+(cond?'<div style="font-size:12px">'+cond+'</div>':'')+'</li>'; }).join("");
  h+='</ul>';
  openDrawerHtml('Affected items — '+field+' "'+value+'"',h);
}

// ---- item group builder ----
let groupItems=[];
function renderChips(){ $("#groupChips").innerHTML=groupItems.length?groupItems.map((it,i)=>'<span class="chip">'+esc(it)+'<a class="chip-x" data-i="'+i+'">✕</a></span>').join(""):'<span class="muted">No items yet.</span>'; }
function addGroupItem(){ const v=$("#groupSearch").value.trim(); if(!v) return; if(!groupItems.includes(v)) groupItems.push(v); $("#groupSearch").value=""; renderChips(); $("#groupSearch").focus(); }
$("#newGroup").onclick=()=>{ $("#groupBuilder").classList.remove("hidden"); fillSoundSelect($("#groupSound"),""); renderChips(); $("#groupSearch").focus(); };
$("#groupCancel").onclick=()=>{ groupItems=[]; renderChips(); $("#groupBuilder").classList.add("hidden"); };
$("#groupAdd").onclick=addGroupItem;
$("#groupSearch").addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); addGroupItem(); } });
$("#groupChips").addEventListener("click",e=>{ const a=e.target.closest(".chip-x"); if(!a) return; groupItems.splice(+a.dataset.i,1); renderChips(); });
$("#groupPlay").onclick=()=>playSound($("#groupSound").value);
$("#groupCreate").onclick=()=>{ if(!groupItems.length){$("#groupSearch").focus();return;} const snd=$("#groupSound").value; if(!snd){$("#groupSound").focus();return;}
  addRule({field:"items",value:groupItems.join("; "),sound:snd}); groupItems=[]; renderChips(); $("#groupBuilder").classList.add("hidden"); };

// ---- presets ----
function loadPresets(){
  const sel=$("#presetSelect"); const list=window.PRESETS||[];
  const structures=list.filter(p=>p.kind==="structure"), examples=list.filter(p=>p.kind==="example");
  let html="";
  if(structures.length) html+='<optgroup label="Blank structures">'+structures.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("")+'</optgroup>';
  if(examples.length) html+='<optgroup label="Full examples">'+examples.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("")+'</optgroup>';
  sel.innerHTML=html||'<option value="">(no presets)</option>';
}
$("#loadPreset").onclick=()=>{ const id=$("#presetSelect").value; const p=(window.PRESETS||[]).find(x=>x.id===id); if(!p) return;
  loadRulesFromMap(p.map); $("#tplMsg").innerHTML='<span class="badge b-ok">Loaded preset “'+esc(p.name)+'”</span>'; };

// ---- templates (localStorage) ----
const TPL_KEY="poe-sound-templates";
function tpls(){ try{ return JSON.parse(localStorage.getItem(TPL_KEY)||"{}"); }catch(e){ return {}; } }
function refreshTemplates(sel){ const t=tpls(); const names=Object.keys(t).sort();
  $("#tplSelect").innerHTML=names.length?names.map(n=>'<option value="'+esc(n)+'">'+esc(n)+'</option>').join(""):'<option value="">(no saved templates)</option>';
  if(sel) $("#tplSelect").value=sel; }
$("#saveTpl").onclick=()=>{ const name=prompt("Template name:",""); if(name==null) return; const n=name.trim(); if(!n) return;
  const t=tpls(); t[n]=buildMap(); localStorage.setItem(TPL_KEY,JSON.stringify(t)); refreshTemplates(n); $("#tplMsg").innerHTML='<span class="badge b-ok">Saved “'+esc(n)+'”</span>'; };
$("#loadTpl").onclick=()=>{ const n=$("#tplSelect").value; if(!n) return; const t=tpls(); if(t[n]){ loadRulesFromMap(t[n]); $("#tplMsg").innerHTML='<span class="badge b-ok">Loaded “'+esc(n)+'”</span>'; } };
$("#delTpl").onclick=()=>{ const n=$("#tplSelect").value; if(!n) return; const t=tpls(); delete t[n]; localStorage.setItem(TPL_KEY,JSON.stringify(t)); refreshTemplates(); };
$("#downloadMap").onclick=()=>{ downloadBlob(new Blob([JSON.stringify(buildMap(),null,2)],{type:"application/json"}),"sound_map.json"); };
$("#importMapBtn").onclick=()=>$("#importMap").click();
$("#importMap").onchange=()=>{ const f=$("#importMap").files[0]; if(!f) return; const r=new FileReader();
  r.onload=()=>{ try{ loadRulesFromMap(JSON.parse(r.result)); $("#tplMsg").innerHTML='<span class="badge b-ok">Imported '+esc(f.name)+'</span>'; }catch(e){ $("#tplMsg").innerHTML='<span class="badge b-err">not valid JSON</span>'; } };
  r.readAsText(f); $("#importMap").value=""; };

// ---- generate + download ----
$("#genBtn").onclick=generate;
async function generate(){
  const map=buildMap();
  if(!map.categories.length && !map.items.length){ $("#genResults").innerHTML='<span class="badge b-err">Add at least one rule with a value and sound.</span>'; return; }
  $("#genResults").textContent="Generating…";
  const zip=new JSZip(); const results=[]; const needed=new Set();
  for(const f of state.filters){
    const {newText,stats}=Engine.patchText(f.text,Engine.loadMap(JSON.parse(JSON.stringify(map))));
    zip.file("filter/"+f.name,newText);
    stats.referenced_sounds.forEach(s=>needed.add(s));
    results.push({name:f.name,stats});
  }
  const missingAudio=[];
  for(const s of needed){
    const up=state.uploaded.get(s);
    if(up){ zip.file("filter/"+s, up.blob); }
    else if(state.bundled.has(s)){
      try{ const b=await (await fetch(bundledUrl(s))).blob(); zip.file("filter/"+s, b); }
      catch(e){ missingAudio.push(s); }
    } else missingAudio.push(s);
  }
  zip.file("sound_map.used.json",JSON.stringify(map,null,2));
  const blob=await zip.generateAsync({type:"blob"});
  downloadBlob(blob,"patched_filter.zip");
  renderGen(results,missingAudio);
}
function renderGen(results,missingAudio){
  const rows=results.map(res=>{ const s=res.stats;
    const look=s.appearance_ok?'<span class="badge b-ok">appearance unchanged</span>':'<span class="badge b-err" title="'+esc((s.appearance_diffs||[]).join(" | "))+'">appearance changed!</span>';
    const miss=s.items_missing.length?' <span class="badge b-warn">'+s.items_missing.length+' item(s) not found</span>':"";
    const ch=s.changes; const parts=ch.sound_changes.slice(0,6).map(c=>c.blocks+"× "+(c.from||"(none)")+" → "+c.to);
    if(ch.sound_changes.length>6) parts.push("…+"+(ch.sound_changes.length-6)+" more");
    ch.items_added.forEach(i=>parts.push("+ item: "+i.baseType+" → "+i.sound));
    const summary=parts.length?'<div class="muted" style="margin:2px 0 6px 12px;font-size:12px">'+parts.map(esc).join("<br>")+'</div>':"";
    return '<div><b>'+esc(res.name)+'</b> — '+look+' · '+s.categories_changed+' categories, '+s.items_applied+' item override(s)'+miss+'</div>'+summary;
  }).join("");
  let note="";
  if(missingAudio.length) note='<div style="margin-top:8px"><span class="badge b-warn">'+missingAudio.length+' sound(s) not bundled</span> '+
    '<span class="muted">— referenced but no audio uploaded, so not in the zip. Put these in your PoE folder, or upload them: '+esc(missingAudio.slice(0,12).join(", "))+(missingAudio.length>12?"…":"")+'</span></div>';
  $("#genResults").innerHTML=rows+note+'<div style="margin-top:8px" class="muted">Downloaded <b>patched_filter.zip</b> — the <code>filter/</code> folder is the drop-in for your PoE folder.</div>';
}

// ---- utils ----
function downloadBlob(blob,name){ const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }
function debounce(fn,ms){ let t; return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);}; }
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

// ---- init ----
try{ $("#verInfo").textContent = "v"+Engine.VERSION+" · updated "+Engine.UPDATED; }catch(e){}
loadPresets(); refreshTemplates(); loadUploaded();
})();
