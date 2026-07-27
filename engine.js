/* engine.js - browser/Node port of apply_sounds.py.
 * Pure logic: no file I/O, no DOM. Same rules as the Python CLI.
 * Exposes window.Engine (browser) or module.exports (Node). */
(function (root) {
  "use strict";

  const BLOCK_KEYWORDS = new Set(["Show", "Hide", "Minimal"]);
  const SOUND_ACTIONS = new Set(["CustomAlertSound", "CustomAlertSoundOptional"]);
  const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg"]);
  const MARKER_BEGIN = "# >>> custom-sound BEGIN";
  const MARKER_END = "# >>> custom-sound END <<<";
  const VISUAL_ACTIONS = new Set(["SetFontSize", "SetTextColor", "SetBorderColor",
    "SetBackgroundColor", "PlayEffect", "MinimapIcon"]);
  const DEFAULT_STYLE = [
    "\tSetFontSize 45", "\tSetTextColor 175 96 37 255", "\tSetBorderColor 175 96 37 255",
    "\tSetBackgroundColor 30 20 10 255", "\tPlayEffect Brown", "\tMinimapIcon 0 Brown Star"];
  const NON_CONDITION = new Set(["SetFontSize", "SetTextColor", "SetBorderColor",
    "SetBackgroundColor", "PlayEffect", "MinimapIcon", "PlayAlertSound", "PlayAlertSoundPositional",
    "CustomAlertSound", "CustomAlertSoundOptional", "DisableDropSound", "EnableDropSound",
    "DisableDropSoundIfAlertSound", "EnableDropSoundIfAlertSound", "Continue"]);

  const firstToken = (line) => { const s = line.trim(); return s ? s.split(/\s+/)[0] : ""; };
  const isBlockHeader = (line) => BLOCK_KEYWORDS.has(firstToken(line));
  const quotedValues = (line) => { const out = []; const re = /"([^"]*)"/g; let m; while ((m = re.exec(line))) out.push(m[1]); return out; };
  const tagType = (header) => { const m = header.match(/\$type->(\S+)/); return m ? m[1] : null; };
  const tagTier = (header) => { const m = header.match(/\$tier->(\S+)/); return m ? m[1] : null; };

  class Block {
    constructor(lines) { this.lines = lines; }
    get header() { return this.lines[0]; }
    get keyword() { return firstToken(this.header); }
    tagType() { return tagType(this.header); }
    tagTier() { return tagTier(this.header); }
    baseTypes() {
      const out = [];
      for (let i = 1; i < this.lines.length; i++)
        if (firstToken(this.lines[i]) === "BaseType") out.push(...quotedValues(this.lines[i]));
      return out;
    }
    soundLineIndex() {
      for (let i = 0; i < this.lines.length; i++)
        if (SOUND_ACTIONS.has(firstToken(this.lines[i]))) return i;
      return -1;
    }
  }

  function splitIntoLinesAndBlocks(text) {
    const raw = text.split("\n");
    const items = [];
    let i = 0;
    while (i < raw.length) {
      const line = raw[i];
      if (isBlockHeader(line)) {
        const blockLines = [line];
        let j = i + 1;
        while (j < raw.length) {
          const nxt = raw[j];
          if (nxt.trim() === "" || isBlockHeader(nxt) || nxt.replace(/^\s+/, "").startsWith("#")) break;
          blockLines.push(nxt); j++;
        }
        items.push(new Block(blockLines)); i = j;
      } else { items.push(line); i++; }
    }
    return items;
  }

  const render = (items) => items.map((it) => (it instanceof Block ? it.lines.join("\n") : it)).join("\n");

  function stripPreviousInsertions(text) {
    const out = []; let depth = 0;
    for (const ln of text.split("\n")) {
      if (ln.startsWith(MARKER_BEGIN)) { depth++; continue; }
      if (ln.startsWith(MARKER_END)) { if (depth > 0) depth--; continue; }
      if (depth === 0) out.push(ln);
    }
    return out.join("\n");
  }

  function blockAlertId(block) {
    for (let i = 1; i < block.lines.length; i++) {
      const tok = firstToken(block.lines[i]);
      if (tok === "PlayAlertSound" || tok === "PlayAlertSoundPositional") {
        const m = block.lines[i].match(/\b(\d+)\b/);
        if (m) return parseInt(m[1], 10);
      }
    }
    return null;
  }

  // The 6 FilterBlade drop-sound slots; every pack names files "<pack>_<N><slot>.mp3".
  const _SLOT_ORDER = [[5, "highmaps"], [6, "veryvaluable"], [1, "maybevaluable"],
                       [2, "currency"], [3, "uniques"], [4, "maps"]];
  const _TIER_RE = /_([1-6])(maybevaluable|currency|uniques|maps|highmaps|veryvaluable)/;
  // The block's value tier (1-6) from a built-in id OR a custom-pack filename.
  function blockSoundTier(block) {
    const aid = blockAlertId(block);
    if (aid != null && aid >= 1 && aid <= 6) return aid;
    const idx = block.soundLineIndex();
    if (idx >= 0) {
      const vals = quotedValues(block.lines[idx]);
      if (vals.length) {
        const name = vals[0].split(";")[0].trim().toLowerCase();
        const m = name.match(_TIER_RE);
        if (m) return parseInt(m[1], 10);
        for (const [tier, slot] of _SLOT_ORDER) if (name.includes(slot)) return tier;
      }
    }
    return null;
  }

  // Sound signature: the CustomAlertSound filename, else "PlayAlertSound <id>" for
  // a stock built-in sound. Lets bucket rules & scaffold work on any NeverSink filter.
  function blockCurrentSound(block) {
    const idx = block.soundLineIndex();
    if (idx >= 0) {
      const vals = quotedValues(block.lines[idx]);
      if (vals.length) { const name = vals[0].split(";")[0].trim(); if (name) return name; }
      return null;
    }
    const aid = blockAlertId(block);
    return aid != null ? "PlayAlertSound " + aid : null;
  }

  function tagMatches(ruleValue, blockValue, exact) {
    if (blockValue == null) return false;
    if (exact) return blockValue === ruleValue;
    const r = ruleValue.split("->"), b = blockValue.split("->");
    return b.slice(0, r.length).join("->") === r.join("->");
  }

  function categoryRuleMatches(rule, block) {
    const exact = !!rule.exact;
    const wantType = rule.type, wantTier = rule.tier, wantBucket = rule.bucket,
          wantAlert = rule.alertSound, wantSoundTier = rule.soundTier;
    if (wantType == null && wantTier == null && wantBucket == null && wantAlert == null && wantSoundTier == null) return false;
    if (wantType != null && !tagMatches(wantType, block.tagType(), exact)) return false;
    if (wantTier != null && !tagMatches(wantTier, block.tagTier(), exact)) return false;
    if (wantBucket != null && blockCurrentSound(block) !== wantBucket) return false;
    if (wantAlert != null && blockAlertId(block) !== parseInt(wantAlert, 10)) return false;
    if (wantSoundTier != null && blockSoundTier(block) !== parseInt(wantSoundTier, 10)) return false;
    return true;
  }

  function ruleBaseTypes(rule) {
    if (rule.baseTypes && rule.baseTypes.length) return rule.baseTypes.slice();
    if (rule.baseType) return [rule.baseType];
    return [];
  }

  const indentOf = (ln) => ln.slice(0, ln.length - ln.replace(/^\s+/, "").length);
  function makeSoundLine(sound, volume, keyword) {
    keyword = keyword || "CustomAlertSound";
    let base = `${keyword} "${sound}"`;
    if (volume != null) base += ` ${parseInt(volume, 10)}`;
    return "\t" + base;
  }
  function setBlockSound(block, sound, volume) {
    const idx = block.soundLineIndex();
    if (idx >= 0) {
      const orig = block.lines[idx];
      const kw = firstToken(orig);
      block.lines[idx] = indentOf(orig) + makeSoundLine(sound, volume, kw).replace(/^\s+/, "");
    } else block.lines.push(makeSoundLine(sound, volume));
  }

  function buildItemOverride(source, baseTypes, sound, volume) {
    if (typeof baseTypes === "string") baseTypes = [baseTypes];
    const quoted = baseTypes.map((b) => `"${b}"`).join(" ");
    const lines = [`${source.keyword} # custom-sound override for ${baseTypes.join(", ")}`];
    for (let i = 1; i < source.lines.length; i++) {
      const ln = source.lines[i], tok = firstToken(ln);
      if (tok === "Continue" || SOUND_ACTIONS.has(tok)) continue;
      // keep StackSize & every other condition: one override per source block
      if (tok === "BaseType") { lines.push(indentOf(ln) + `BaseType == ${quoted}`); continue; }
      lines.push(ln);
    }
    lines.push(makeSoundLine(sound, volume));
    return new Block(lines);
  }

  function blockVisualActionLines(block) {
    const out = [];
    for (let i = 1; i < block.lines.length; i++) {
      const ln = block.lines[i];
      if (VISUAL_ACTIONS.has(firstToken(ln))) out.push(/^[\t ]/.test(ln) ? ln : "\t" + ln.trim());
    }
    return out;
  }
  function styleLinesFor(items, baseTypes, conditions) {
    for (const it of items)
      if (it instanceof Block && it.keyword === "Show" && baseTypes.some((bt) => it.baseTypes().includes(bt))) {
        const v = blockVisualActionLines(it); if (v.length) return v;
      }
    const lowered = conditions.join(" ").toLowerCase();
    let pref = null;
    if (lowered.includes("unique")) pref = "uniques";
    else if (lowered.includes("divination card")) pref = "divination";
    if (pref)
      for (const it of items)
        if (it instanceof Block && it.keyword === "Show") {
          const t = it.tagType();
          if (t && t.split("->")[0] === pref) { const v = blockVisualActionLines(it); if (v.length) return v; }
        }
    return DEFAULT_STYLE.slice();
  }
  function buildConditionOverride(baseTypes, conditions, sound, volume, styleLines) {
    const label = baseTypes.length ? baseTypes.join(", ") : conditions.join("; ");
    const lines = [`Show # custom-sound override for ${label}`];
    for (const c of conditions) lines.push("\t" + c.trim());
    if (baseTypes.length) lines.push(`\tBaseType == ${baseTypes.map((b) => `"${b}"`).join(" ")}`);
    lines.push(...styleLines);
    lines.push(makeSoundLine(sound, volume));
    return new Block(lines);
  }

  function applyCategories(items, rules, defaultVolume) {
    let changed = 0;
    for (const it of items) {
      if (!(it instanceof Block)) continue;
      for (const rule of rules) {
        if (!rule.sound) continue;  // blank rows (e.g. structure presets) do nothing
        if (categoryRuleMatches(rule, it)) {
          setBlockSound(it, rule.sound, rule.volume != null ? rule.volume : defaultVolume);
          changed++; break;
        }
      }
    }
    return changed;
  }

  function applyItems(items, rules, defaultVolume) {
    let applied = 0; const missing = [];
    for (const rule of rules) {
      if (!rule.sound) continue;  // blank rows do nothing
      const baseTypes = ruleBaseTypes(rule);
      const volume = rule.volume != null ? rule.volume : defaultVolume;
      const sound = rule.sound;
      const conditions = rule.conditions || [];
      if (conditions.length) {
        const style = styleLinesFor(items, baseTypes, conditions);
        const block = buildConditionOverride(baseTypes, conditions, sound, volume, style);
        const label = baseTypes.length ? baseTypes.join(", ") : conditions.join("; ");
        items.splice(0, 0, `${MARKER_BEGIN} - ${label} >>>`, block, MARKER_END);
        applied++; continue;
      }
      // Override above EVERY Show block listing any of the base types (keeping
      // each block's own conditions incl. StackSize) so all stack tiers are covered.
      const sources = []; const matched = new Set();
      for (const it of items)
        if (it instanceof Block && it.keyword === "Show") {
          const hits = baseTypes.filter((bt) => it.baseTypes().includes(bt));
          if (hits.length) { sources.push([it, hits]); hits.forEach((h) => matched.add(h)); }
        }
      for (const bt of baseTypes) if (!matched.has(bt)) missing.push(bt);
      for (const [src, bts] of sources) {
        const override = buildItemOverride(src, bts, sound, volume);
        const idx = items.indexOf(src);
        items.splice(idx, 0, `${MARKER_BEGIN} - ${bts.join(", ")} >>>`, override, MARKER_END);
        applied++;
      }
    }
    return { applied, missing };
  }

  function collectReferencedSounds(items) {
    const sounds = new Set();
    for (const it of items) {
      if (!(it instanceof Block)) continue;
      const idx = it.soundLineIndex();
      if (idx >= 0) for (const v of quotedValues(it.lines[idx])) for (const n of v.split(";")) { const t = n.trim(); if (t) sounds.add(t); }
    }
    return sounds;
  }

  function collectBucketSounds(items) {
    const counts = new Map();
    for (const it of items) if (it instanceof Block) { const s = blockCurrentSound(it); if (s) counts.set(s, (counts.get(s) || 0) + 1); }
    return counts;
  }

  function blockConditionLines(block) {
    const out = [];
    for (let i = 1; i < block.lines.length; i++) { const ln = block.lines[i], tok = firstToken(ln); if (tok && !NON_CONDITION.has(tok)) out.push(ln.trim()); }
    return out;
  }

  function ruleMatchedBlocks(items, rule) {
    const out = []; const group = ruleBaseTypes(rule);
    for (const it of items) {
      if (!(it instanceof Block)) continue;
      const hit = group.length ? group.some((bt) => it.baseTypes().includes(bt)) : categoryRuleMatches(rule, it);
      if (hit) out.push(it);
    }
    return out;
  }
  function ruleMatchInfo(items, rule) {
    let matched = 0, shown = 0, hidden = 0; const sounds = new Set(); const group = ruleBaseTypes(rule);
    for (const it of items) {
      if (!(it instanceof Block)) continue;
      const hit = group.length ? group.some((bt) => it.baseTypes().includes(bt)) : categoryRuleMatches(rule, it);
      if (!hit) continue;
      matched++; if (it.keyword === "Show") shown++; else if (it.keyword === "Hide") hidden++;
      const cs = blockCurrentSound(it); if (cs) sounds.add(cs);
    }
    return { matched, shown_blocks: shown, hidden_blocks: hidden, shown: shown > 0, current_sounds: [...sounds].sort() };
  }

  function buildCatalog(items, catalog) {
    catalog = catalog || { types: {}, tiers: {}, classes: {}, items: {} };
    for (const it of items) {
      if (!(it instanceof Block)) continue;
      const t = it.tagType(), tier = it.tagTier();
      const classes = [];
      for (let i = 1; i < it.lines.length; i++) if (firstToken(it.lines[i]) === "Class") classes.push(...quotedValues(it.lines[i]));
      const shown = it.keyword === "Show";
      if (t != null) { const e = (catalog.types[t] = catalog.types[t] || { blocks: 0, tiers: new Set() }); e.blocks++; if (tier) e.tiers.add(tier); }
      if (tier != null) catalog.tiers[tier] = (catalog.tiers[tier] || 0) + 1;
      for (const c of classes) catalog.classes[c] = (catalog.classes[c] || 0) + 1;
      for (const bt of it.baseTypes()) {
        const e = (catalog.items[bt] = catalog.items[bt] || { types: new Set(), classes: new Set(), count: 0, shown: false });
        e.count++; e.shown = e.shown || shown; if (t) e.types.add(t); for (const c of classes) e.classes.add(c);
      }
    }
    return catalog;
  }
  function catalogToJsonable(catalog) {
    const types = {}; Object.keys(catalog.types).sort().forEach((t) => { types[t] = { blocks: catalog.types[t].blocks, tiers: [...catalog.types[t].tiers].sort() }; });
    const items = {}; Object.keys(catalog.items).sort().forEach((bt) => { const v = catalog.items[bt]; items[bt] = { types: [...v.types].sort(), classes: [...v.classes].sort(), count: v.count, shown: v.shown }; });
    const tiers = {}; Object.keys(catalog.tiers).sort().forEach((k) => (tiers[k] = catalog.tiers[k]));
    const classes = {}; Object.keys(catalog.classes).sort().forEach((k) => (classes[k] = catalog.classes[k]));
    return { types, tiers, classes, items };
  }

  function buildScaffold(items) {
    const buckets = collectBucketSounds(items);
    const categories = [];
    [...buckets.keys()].sort().forEach((s) => {
      const dot = s.lastIndexOf("."); const isFile = dot >= 0 && AUDIO_EXT.has(s.slice(dot).toLowerCase());
      categories.push({ bucket: s, sound: isFile ? s : "", _blocks: buckets.get(s) });
    });
    return { sound_dir: "sound", default_volume: 300, categories, items: [] };
  }

  function blockVisualLines(block) {
    const idx = block.soundLineIndex();
    return block.lines.filter((_, i) => i !== idx);
  }
  function verifyAppearanceUnchanged(originalText, patchedText) {
    const orig = splitIntoLinesAndBlocks(originalText).filter((b) => b instanceof Block);
    const pat = splitIntoLinesAndBlocks(stripPreviousInsertions(patchedText)).filter((b) => b instanceof Block);
    const diffs = []; let soundChanged = 0;
    if (orig.length !== pat.length) diffs.push(`block count changed: ${orig.length} -> ${pat.length}`);
    else for (let i = 0; i < orig.length; i++) {
      if (blockVisualLines(orig[i]).join("\n") !== blockVisualLines(pat[i]).join("\n"))
        diffs.push(`block ${i} [${orig[i].header.trim().slice(0, 60)}]: a visual/condition line changed`);
      if (blockCurrentSound(orig[i]) !== blockCurrentSound(pat[i])) soundChanged++;
    }
    return { ok: diffs.length === 0, diffs, blocks_original: orig.length, blocks_patched: pat.length, sound_changed: soundChanged };
  }

  function summarizeChanges(originalText, patchedText) {
    const orig = splitIntoLinesAndBlocks(originalText).filter((b) => b instanceof Block);
    const pat = splitIntoLinesAndBlocks(stripPreviousInsertions(patchedText)).filter((b) => b instanceof Block);
    const pairs = new Map();
    if (orig.length === pat.length)
      for (let i = 0; i < orig.length; i++) {
        const oa = blockCurrentSound(orig[i]), ob = blockCurrentSound(pat[i]);
        if (oa !== ob) { const k = `${oa} ${ob}`; pairs.set(k, (pairs.get(k) || 0) + 1); }
      }
    const soundChanges = [...pairs.entries()].map(([k, v]) => { const [f, t] = k.split(" "); return { from: f === "null" ? null : f, to: t, blocks: v }; }).sort((a, b) => b.blocks - a.blocks);
    const itemsAdded = []; let inMarker = false, curBt = null, curSnd = null;
    for (const ln of patchedText.split("\n")) {
      if (ln.startsWith(MARKER_BEGIN)) { inMarker = true; curBt = null; curSnd = null; const m = ln.match(/BEGIN - (.*) >>>/); if (m) curBt = m[1]; continue; }
      if (ln.startsWith(MARKER_END)) { if (curBt != null) itemsAdded.push({ baseType: curBt, sound: curSnd }); inMarker = false; continue; }
      if (inMarker && SOUND_ACTIONS.has(firstToken(ln))) { const v = quotedValues(ln); curSnd = v.length ? v[0] : null; }
    }
    let total = 0; pairs.forEach((v) => (total += v));
    return { sound_changes: soundChanges, items_added: itemsAdded, blocks_changed: total };
  }

  function loadMap(data) {
    data = Object.assign({ categories: [], items: [], sound_dir: "sound", default_volume: null }, data || {});
    return data;
  }

  function patchText(text, soundMap) {
    text = stripPreviousInsertions(text);
    const items = splitIntoLinesAndBlocks(text);
    const catChanged = applyCategories(items, soundMap.categories || [], soundMap.default_volume);
    const { applied, missing } = applyItems(items, soundMap.items || [], soundMap.default_volume);
    const newText = render(items);
    const stats = {
      categories_changed: catChanged, items_applied: applied, items_missing: missing,
      referenced_sounds: [...collectReferencedSounds(items)],
    };
    const appearance = verifyAppearanceUnchanged(text, newText);
    stats.appearance_ok = appearance.ok; stats.appearance_diffs = appearance.diffs;
    stats.changes = summarizeChanges(text, newText);
    return { newText, stats };
  }

  // Lightweight structural checks (the full grammar validator lives in the CLI).
  function checkFormat(text) {
    const errors = [];
    const items = splitIntoLinesAndBlocks(text);
    let sawBlock = false;
    for (const it of items) if (it instanceof Block) { sawBlock = true; break; }
    if (!sawBlock) errors.push("No Show/Hide blocks found - is this a PoE filter?");
    return { format_ok: errors.length === 0, errors };
  }

  const AUDIO_EXTENSIONS = AUDIO_EXT;
  const VERSION = "1.1.0";        // keep in sync with apply_sounds.py
  const UPDATED = "2026-07-27";
  const api = {
    VERSION, UPDATED,
    Block, splitIntoLinesAndBlocks, render, stripPreviousInsertions, blockCurrentSound, blockAlertId, blockSoundTier,
    categoryRuleMatches, ruleBaseTypes, buildCatalog, catalogToJsonable, buildScaffold,
    collectBucketSounds, collectReferencedSounds, ruleMatchInfo, ruleMatchedBlocks,
    blockConditionLines, verifyAppearanceUnchanged, summarizeChanges, loadMap, patchText,
    checkFormat, AUDIO_EXTENSIONS, MARKER_BEGIN, MARKER_END,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof window !== "undefined" ? window : globalThis);
