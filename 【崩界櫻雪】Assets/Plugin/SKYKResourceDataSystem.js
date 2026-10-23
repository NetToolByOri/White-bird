/*
==================================================
SKYK ResourceDataSystem
==================================================

SKYK
=
SakuraYuki KowareSekai
（サクラユキ + コワレセカイ）

SKYK-ResourceDataSystem
為「崩界（コワレセカイのサクラユキ）」的共用資源資料與資源UI核心模組。

本插件屬於 SKYK 系統下的高度耦合型模組化插件，
並非獨立型通用元件，需依附 SKYK 系統既有 IndexedDB 櫃子結構與頁面地基架構運作。

設計核心：
- 資源資料唯一入口
- 所有資源增減都必須經過本插件
- UI 只讀取本插件建立的 status
- IndexedDB 為持久化儲存層，status 為頁面運行時狀態
==================================================
*/

(function(global){
"use strict";

/* ==================================================
   Root Setting
================================================== */

const SKYK_RESOURCE_DATA_SYSTEM_SETTING = {
  dbName:"崩界Game System DB",
  resourceStores:[
  "baseResource",
  "spResource",
  "broccoliResource"
],
  stateStore:"resourceSystemState",
  timerId:"baseResourceTimer",

  tickMs:10000,
  loopMs:250,
  shortDeltaRate:0.6,
  maxBadRealtimeCount:3,

  uiMountTarget:"#stage",

  // PC：以地基寬度百分比切割。
  pcCutWidthPercent:9,
  pcRowWidthPercent:40,
  pcClipCutPercent:5,

  // PC：以地基高度百分比控制整條資源列總高度。
  pcRootHeightPercent:5,

  // 手機：目前維持固定列高，約為舊 50px 的 2/3。
  mobileRowHeightPx:34,

  countdownHeightPx:6,
  fontRate:0.34,
  iconRate:0.76,

  debug:false
};

/* ==================================================
   Theme
================================================== */

const SKYK_RESOURCE_DATA_SYSTEM_THEMES = {
  techBlue:{
    bg:"rgba(12,24,42,.92)",
    bgTop:"rgba(41,75,112,.72)",
    bgBottom:"rgba(10,22,40,.96)",
    border:"rgba(126,205,255,.62)",
    glow:"rgba(90,200,255,.32)",
    itemBg:"rgba(19,48,76,.45)",
    itemBorder:"rgba(150,220,255,.20)",
    text:"#ffffff",
    subText:"#cfe8ff",
    countdownBg:"rgba(19,48,76,.85)",
    countdownFill:"rgba(110,225,255,.95)",
    popupBgTop:"rgba(12,22,38,.98)",
    popupBgBottom:"rgba(8,14,24,.98)"
  },
  nightPink:{
    bg:"rgba(48,18,38,.90)",
    bgTop:"rgba(92,42,78,.70)",
    bgBottom:"rgba(36,13,30,.96)",
    border:"rgba(255,168,215,.58)",
    glow:"rgba(255,130,200,.24)",
    itemBg:"rgba(76,28,58,.45)",
    itemBorder:"rgba(255,190,225,.20)",
    text:"#fff3fb",
    subText:"#ffd6ef",
    countdownBg:"rgba(76,28,58,.82)",
    countdownFill:"rgba(255,172,222,.92)",
    popupBgTop:"rgba(42,18,38,.98)",
    popupBgBottom:"rgba(10,5,12,.98)"
  },
  yellow:{
    bg:"rgba(48,38,12,.92)",
    bgTop:"rgba(112,84,22,.72)",
    bgBottom:"rgba(42,30,8,.96)",
    border:"rgba(255,218,110,.62)",
    glow:"rgba(255,212,80,.26)",
    itemBg:"rgba(90,64,18,.45)",
    itemBorder:"rgba(255,226,150,.22)",
    text:"#fff9df",
    subText:"#ffe7a6",
    countdownBg:"rgba(78,56,14,.85)",
    countdownFill:"rgba(255,215,68,.95)",
    popupBgTop:"rgba(48,36,12,.98)",
    popupBgBottom:"rgba(20,14,5,.98)"
  },
  green:{
    bg:"rgba(12,40,26,.92)",
    bgTop:"rgba(34,92,58,.72)",
    bgBottom:"rgba(7,32,20,.96)",
    border:"rgba(124,255,178,.56)",
    glow:"rgba(82,255,165,.22)",
    itemBg:"rgba(24,76,50,.45)",
    itemBorder:"rgba(150,255,195,.18)",
    text:"#f2fff8",
    subText:"#c6f5db",
    countdownBg:"rgba(24,76,50,.82)",
    countdownFill:"rgba(105,255,170,.94)",
    popupBgTop:"rgba(12,40,25,.98)",
    popupBgBottom:"rgba(4,18,12,.98)"
  },
  aurora:{
    bg:"rgba(16,22,42,.93)",
    bgTop:"rgba(58,48,110,.68)",
    bgBottom:"rgba(10,22,38,.96)",
    border:"rgba(165,245,255,.56)",
    glow:"rgba(210,120,255,.24)",
    itemBg:"rgba(40,52,90,.42)",
    itemBorder:"rgba(190,245,255,.18)",
    text:"#f7fbff",
    subText:"#d9f9ff",
    countdownBg:"rgba(35,48,78,.82)",
    countdownFill:"rgba(165,245,255,.95)",
    popupBgTop:"rgba(18,24,44,.98)",
    popupBgBottom:"rgba(8,10,20,.98)"
  }
};

SKYK_RESOURCE_DATA_SYSTEM_THEMES.blue = SKYK_RESOURCE_DATA_SYSTEM_THEMES.techBlue;
SKYK_RESOURCE_DATA_SYSTEM_THEMES.pink = SKYK_RESOURCE_DATA_SYSTEM_THEMES.nightPink;

/* ==================================================
   Runtime
================================================== */

let config = clonePlain(SKYK_RESOURCE_DATA_SYSTEM_SETTING);
let db = null;
let started = false;
let timerState = null;
let realtimeLoopId = null;
let styleInjected = false;
let subscribers = new Set();
let resizeHandler = null;

let status = {
  resourcesById:{},
  resourcesByStore:{},
  storeOrder:[],
  resourceOrder:[],
  updatedAt:0,
  realtime:{
    enabled:false,
    locked:false,
    badCount:0,
    progress:0,
    lastSettlementTime:0
  }
};

let uiRuntime = {
  mounted:false,
  root:null,
  panel:null,
  rowArea:null,
  countdown:null,
  popupOverlay:null,
  popupBody:null,
  popupGrid:null,
  warningOverlay:null,
  options:null,
  popupCardsById:{}
};

/* ==================================================
   Utility
================================================== */

function clonePlain(value){
  return JSON.parse(JSON.stringify(value));
}

function log(){
  if(config.debug){
    console.log.apply(console, ["[SKYKResourceDataSystem]"].concat(Array.from(arguments)));
  }
}

function num(value, fallback=0){
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function floor(value){
  return Math.floor(num(value, 0));
}

function boundNumber(value, min, max){
  return Math.max(min, Math.min(value, max));
}

function safeString(value){
  return String(value === undefined || value === null ? "" : value);
}

function formatValue(value){
  return floor(value).toLocaleString("en-US");
}

function getTheme(name){
  return SKYK_RESOURCE_DATA_SYSTEM_THEMES[name] || SKYK_RESOURCE_DATA_SYSTEM_THEMES.techBlue;
}

function getMountTarget(target){
  if(target && typeof target === "string") return document.querySelector(target);
  if(target && target.nodeType === 1) return target;
  return document.querySelector(config.uiMountTarget);
}

function isLandscapePC(){
  return window.matchMedia("(min-width:500px) and (orientation:landscape)").matches;
}

/* ==================================================
   Subscribe
================================================== */

function getStatus(){
  return clonePlain(status);
}

function emit(eventName, payload){
  const event = { eventName, payload:payload || null, status:getStatus() };

  subscribers.forEach(handler=>{
    try{
      handler(event);
    }catch(error){
      console.error(error);
    }
  });
}

function subscribe(handler){
  if(typeof handler !== "function") return function(){};

  subscribers.add(handler);
  handler({ eventName:"subscribe", payload:null, status:getStatus() });

  return function unsubscribe(){
    subscribers.delete(handler);
  };
}

/* ==================================================
   IndexedDB
================================================== */

function openDB(){
  return new Promise((resolve, reject)=>{
    const request = indexedDB.open(config.dbName);

    request.onupgradeneeded = event=>{
      event.target.transaction.abort();
      reject(new Error("DB 不存在或版本不正確，請先用櫃子管理器建立/升級。"));
    };

    request.onsuccess = ()=>{
      const opened = request.result;
      const required = config.resourceStores.concat([config.stateStore]);

      for(const storeName of required){
        if(!opened.objectStoreNames.contains(storeName)){
          opened.close();
          reject(new Error("找不到櫃子：" + storeName));
          return;
        }
      }

      resolve(opened);
    };

    request.onerror = ()=>{
      reject(request.error || new Error("IndexedDB 開啟失敗"));
    };
  });
}

function getAllFromStore(storeName){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();

    req.onsuccess = ()=>resolve(req.result || []);
    req.onerror = ()=>reject(req.error || new Error("讀取失敗：" + storeName));
  });
}

function getOneFromStore(storeName, id){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(id);

    req.onsuccess = ()=>resolve(req.result || null);
    req.onerror = ()=>reject(req.error || new Error("讀取失敗：" + storeName + "/" + id));
  });
}

function putOneToStore(storeName, data){
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(data);

    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error || new Error("寫入失敗：" + storeName));
    tx.onabort = ()=>reject(tx.error || new Error("寫入中止：" + storeName));
  });
}

/* ==================================================
   Status Core
================================================== */

function normalizeResource(raw, storeName, orderIndex){
  const item = Object.assign({}, raw);

  item.id = safeString(item.id).trim();
  item.storeName = storeName;
  item.orderIndex = orderIndex;
  item.label = item.label || item.id;
  item.amount = num(item.amount, 0);
  item.max = num(item.max, 0);
  item.regen = num(item.regen, 0);
  item.iconS = item.iconS || item["icon-s"] || item.iconSmall || "";
  item.iconBig = item.iconBig || item["icon-big"] || item.iconBG || item.iconS || "";
  item.info = item.info || "";

  return item;
}

async function refreshStatusFromDB(reason="refreshStatus"){
  const byId = {};
  const byStore = {};
  const resourceOrder = [];

  for(const storeName of config.resourceStores){
    const rows = await getAllFromStore(storeName);
    byStore[storeName] = [];

    rows.forEach((raw, index)=>{
      if(!raw || raw.id === undefined || raw.id === null) return;

      const resource = normalizeResource(raw, storeName, index);
      if(!resource.id) return;

      if(byId[resource.id]){
        console.warn("[SKYKResourceDataSystem] 重複資源 id，後讀取者覆蓋前者：", resource.id);
      }

      byId[resource.id] = resource;
      byStore[storeName].push(resource);
      resourceOrder.push(resource.id);
    });
  }

  status.resourcesById = byId;
  status.resourcesByStore = byStore;
  status.storeOrder = config.resourceStores.slice();
  status.resourceOrder = resourceOrder;
  status.updatedAt = Date.now();

  renderUIValues();
  patchPopupValues();

  emit(reason, null);
  return getStatus();
}

function getResource(id){
  const resource = status.resourcesById[id];
  return resource ? clonePlain(resource) : null;
}

function getResourceList(){
  return status.resourceOrder
    .map(id => status.resourcesById[id])
    .filter(Boolean)
    .map(resource => clonePlain(resource));
}

/* ==================================================
   Resource Change Core
================================================== */

function normalizeChanges(changes){
  const list = Array.isArray(changes) ? changes : [changes];

  return list
    .filter(item => item && item.id)
    .map(item => ({
      id:safeString(item.id).trim(),
      delta:num(item.delta, 0),
      allowOverMax:!!item.allowOverMax,
      allowNegative:!!item.allowNegative
    }));
}

async function changeResources(changes, options={}){
  if(!started) throw new Error("SKYKResourceDataSystem 尚未 start。");

  const normalized = normalizeChanges(changes);
  if(normalized.length === 0) return getStatus();

  await refreshStatusFromDB("beforeChangeRefresh");

  const missing = normalized.filter(change => !status.resourcesById[change.id]);
  if(missing.length > 0){
    throw new Error("找不到資源：" + missing.map(item => item.id).join(", "));
  }

  const storeNames = Array.from(new Set(
    normalized.map(change => status.resourcesById[change.id].storeName)
  ));

  await new Promise((resolve, reject)=>{
    const tx = db.transaction(storeNames, "readwrite");
    const stores = {};
    const latestMap = {};
    let pending = normalized.length;
    let failed = false;

    storeNames.forEach(storeName=>{
      stores[storeName] = tx.objectStore(storeName);
    });

    function fail(error){
      if(failed) return;
      failed = true;
      try{ tx.abort(); }catch(e){}
      reject(error);
    }

    normalized.forEach(change=>{
      const current = status.resourcesById[change.id];
      const req = stores[current.storeName].get(change.id);

      req.onsuccess = ()=>{
        if(failed) return;

        const latest = req.result;
        if(!latest){
          fail(new Error("修改前重新讀取失敗，找不到資源：" + change.id));
          return;
        }

        latestMap[change.id] = normalizeResource(latest, current.storeName, current.orderIndex);
        pending -= 1;

        if(pending === 0){
          try{
            normalized.forEach(nextChange=>{
              const latestResource = latestMap[nextChange.id];
              let nextAmount = num(latestResource.amount, 0) + nextChange.delta;

              if(!nextChange.allowNegative) nextAmount = Math.max(0, nextAmount);
              if(!nextChange.allowOverMax) nextAmount = Math.min(nextAmount, num(latestResource.max, 0));

              const clean = Object.assign({}, latestResource, { amount:nextAmount });
              delete clean.storeName;
              delete clean.orderIndex;

              stores[latestResource.storeName].put(clean);
            });
          }catch(error){
            fail(error);
          }
        }
      };

      req.onerror = ()=>{
        fail(req.error || new Error("修改前重新讀取失敗：" + change.id));
      };
    });

    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error || new Error("資源修改交易失敗"));
    tx.onabort = ()=>reject(tx.error || new Error("資源修改交易中止"));
  });

  return await refreshStatusFromDB(options.reason || "changeResources");
}

function addResources(changes, options){
  const list = (Array.isArray(changes) ? changes : [changes]).map(item => ({
    id:item.id,
    delta:Math.abs(num(item.amount !== undefined ? item.amount : item.delta, 0)),
    allowOverMax:!!item.allowOverMax
  }));

  return changeResources(list, options);
}

async function canAfford(costs){
  await refreshStatusFromDB("canAffordRefresh");

  const list = Array.isArray(costs) ? costs : [costs];

  return list.every(item=>{
    if(!item || !item.id) return false;

    const resource = status.resourcesById[item.id];
    if(!resource) return false;

    const amount = Math.abs(num(item.amount !== undefined ? item.amount : item.delta, 0));
    return num(resource.amount, 0) >= amount;
  });
}

async function spendResources(costs, options){
  const enough = await canAfford(costs);

  if(!enough){
    return { ok:false, reason:"not_enough_resource", status:getStatus() };
  }

  const list = (Array.isArray(costs) ? costs : [costs]).map(item => ({
    id:item.id,
    delta:-Math.abs(num(item.amount !== undefined ? item.amount : item.delta, 0))
  }));

  const nextStatus = await changeResources(list, options);

  return { ok:true, status:nextStatus };
}

/* ==================================================
   Timer State
================================================== */

function normalizeTimerState(rawState){
  const state = rawState && rawState.id === config.timerId
    ? Object.assign({}, rawState)
    : { id:config.timerId, timeIndex:0, timestamps:[0,0,0] };

  if(!Array.isArray(state.timestamps)) state.timestamps = [0,0,0];
  while(state.timestamps.length < 3) state.timestamps.push(0);

  state.timestamps = state.timestamps.slice(0,3).map(value=>{
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  if(!Number.isInteger(state.timeIndex) || state.timeIndex < 0 || state.timeIndex > 2){
    state.timeIndex = 0;
  }

  return state;
}

function getBestTimestamp(state, now){
  const valid = (state.timestamps || []).filter(time =>
    typeof time === "number" &&
    Number.isFinite(time) &&
    time > 0 &&
    time <= now
  );

  return valid.length ? Math.max(...valid) : now;
}

async function readTimerState(){
  const rawState = await getOneFromStore(config.stateStore, config.timerId);
  timerState = normalizeTimerState(rawState);
  return timerState;
}

async function writeTimestamp(time){
  if(!timerState) timerState = normalizeTimerState(null);

  const safeTime = Math.floor(num(time, Date.now()));
  const index = timerState.timeIndex;

  timerState.timestamps[index] = safeTime;
  timerState.timeIndex = (index + 1) % 3;

  await putOneToStore(config.stateStore, timerState);

  return safeTime;
}

/* ==================================================
   Settlement
================================================== */

function buildRegenChanges(tickCount){
  const safeTickCount = Math.max(0, Math.floor(num(tickCount, 0)));

  return status.resourceOrder
    .map(id => status.resourcesById[id])
    .filter(Boolean)
    .map(resource => ({
      id:resource.id,
      delta:num(resource.regen, 0) * safeTickCount
    }));
}

async function applyRegenTicks(tickCount, reason){
  if(tickCount <= 0) return getStatus();

  const changes = buildRegenChanges(tickCount);
  if(changes.length === 0) return getStatus();

  return await changeResources(changes, { reason:reason || "applyRegenTicks" });
}

async function runOfflineSettlement(){
  const now = Date.now();

  await readTimerState();

  const baseTime = getBestTimestamp(timerState, now);
  const elapsed = Math.max(0, now - baseTime);
  const tickCount = Math.floor(elapsed / config.tickMs);

  if(tickCount > 0){
    await applyRegenTicks(tickCount, "offlineSettlement");

    const nextSettlementTime = baseTime + tickCount * config.tickMs;
    status.realtime.lastSettlementTime = nextSettlementTime;

    await writeTimestamp(nextSettlementTime);

    emit("offlineSettlementDone", { tickCount, nextSettlementTime });
    return { tickCount, changed:true };
  }

  status.realtime.lastSettlementTime = baseTime;

  emit("offlineSettlementSkip", { tickCount:0 });
  return { tickCount:0, changed:false };
}

async function runRealtimeSettlement(){
  if(!status.realtime.enabled || status.realtime.locked){
    updateCountdownState();
    return { tickCount:0, changed:false };
  }

  const now = Date.now();
  const elapsed = Math.max(0, now - status.realtime.lastSettlementTime);
  const tickCount = Math.floor(elapsed / config.tickMs);

  status.realtime.progress = (elapsed % config.tickMs) / config.tickMs;
  updateCountdownState();
  emit("realtimeProgress", { progress:status.realtime.progress });

  if(tickCount <= 0){
    return { tickCount:0, changed:false };
  }

  await readTimerState();

  const latestExternalTime = getBestTimestamp(timerState, now);
  const deltaFromExternal = Math.max(0, now - latestExternalTime);
  const tooShort = deltaFromExternal < config.tickMs * config.shortDeltaRate;

  if(tooShort){
    status.realtime.badCount += 1;

    if(status.realtime.badCount >= config.maxBadRealtimeCount){
      lockRealtime("timestamp_delta_too_short", {
        deltaFromExternal,
        threshold:config.tickMs * config.shortDeltaRate
      });

      return { tickCount:0, changed:false, locked:true };
    }
  }else{
    status.realtime.badCount = 0;
  }

  await applyRegenTicks(tickCount, "realtimeSettlement");

  const nextSettlementTime = status.realtime.lastSettlementTime + tickCount * config.tickMs;
  status.realtime.lastSettlementTime = nextSettlementTime;

  await writeTimestamp(nextSettlementTime);

  status.realtime.progress = 0;
  updateCountdownState();

  emit("realtimeSettlementDone", { tickCount, nextSettlementTime });
  return { tickCount, changed:true };
}

function startRealtimeLoop(){
  stopRealtimeLoop();

  realtimeLoopId = setInterval(async ()=>{
    try{
      await runRealtimeSettlement();
    }catch(error){
      lockRealtime("runtime_error", { message:String(error && error.message ? error.message : error) });
      console.error(error);
    }
  }, config.loopMs);
}

function stopRealtimeLoop(){
  if(realtimeLoopId){
    clearInterval(realtimeLoopId);
    realtimeLoopId = null;
  }
}

function lockRealtime(reason, detail){
  status.realtime.locked = true;
  status.realtime.progress = 1;

  stopRealtimeLoop();
  updateCountdownState();
  showRealtimeLockWarning();

  emit("realtimeLocked", { reason, detail:detail || null });
}

/* ==================================================
   Style
================================================== */

function injectStyle(){
  if(styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.dataset.skykResourceDataSystem = "style";

  style.textContent = `
.skyk-resourceDataSystem-root,
.skyk-resourceDataSystem-root *{
  box-sizing:border-box;
}

.skyk-resourceDataSystem-root{
  --skyk-resourceDataSystem-mobile-row-height:34px;
  --skyk-resourceDataSystem-countdown-height:6px;
  --skyk-resourceDataSystem-row-px:34px;
  --skyk-resourceDataSystem-font-size:11px;
  --skyk-resourceDataSystem-icon-height:25px;
  --skyk-resourceDataSystem-popup-font-size:12px;

  position:absolute;
  top:0;
  left:0;
  right:0;
  z-index:30;
  color:var(--skyk-resourceDataSystem-text);
  font-family:"Segoe UI","Microsoft JhengHei",sans-serif;
  pointer-events:auto;
}

.skyk-resourceDataSystem-panel{
  width:100%;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  background:
    linear-gradient(180deg,var(--skyk-resourceDataSystem-bgTop),var(--skyk-resourceDataSystem-bgBottom)),
    var(--skyk-resourceDataSystem-bg);
  border-bottom:1px solid var(--skyk-resourceDataSystem-border);
  box-shadow:
    0 0 18px var(--skyk-resourceDataSystem-glow),
    inset 0 0 18px rgba(255,255,255,.08);
}

.skyk-resourceDataSystem-rowArea{
  display:flex;
  flex-direction:column;
  width:100%;
}

.skyk-resourceDataSystem-cut{
  display:none;
  flex:0 0 0;
}

.skyk-resourceDataSystem-row{
  flex:0 0 auto;
  width:100%;
  min-width:0;
  height:var(--skyk-resourceDataSystem-row-px);
  display:flex;
  align-items:stretch;
  border-top:1px solid var(--skyk-resourceDataSystem-itemBorder);
}

.skyk-resourceDataSystem-row:first-child{
  border-top:0;
}

.skyk-resourceDataSystem-item{
  flex:1 1 0;
  min-width:0;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  overflow:hidden;
  padding:0 1.4%;
  background:var(--skyk-resourceDataSystem-itemBg);
  border-left:1px solid var(--skyk-resourceDataSystem-itemBorder);
}

.skyk-resourceDataSystem-item:first-child{
  border-left:0;
}

.skyk-resourceDataSystem-iconBox{
  flex:0 0 42%;
  min-width:0;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:flex-start;
  overflow:hidden;
}

.skyk-resourceDataSystem-icon{
  display:block;
  height:var(--skyk-resourceDataSystem-icon-height);
  width:100%;
  object-fit:contain;
  object-position:left center;
}

.skyk-resourceDataSystem-valueBox{
  flex:1 1 auto;
  min-width:0;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:flex-end;
  overflow:hidden;
}

.skyk-resourceDataSystem-value{
  display:block;
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  text-align:right;
  color:var(--skyk-resourceDataSystem-text);
  font-size:var(--skyk-resourceDataSystem-font-size);
  line-height:1;
  font-weight:900;
  text-shadow:0 0 7px var(--skyk-resourceDataSystem-glow),0 1px 2px #000;
}

.skyk-resourceDataSystem-countdown{
  width:100%;
  height:var(--skyk-resourceDataSystem-countdown-height);
  display:flex;
  gap:1px;
  padding:1px 3px;
  background:rgba(0,0,0,.34);
  border-top:1px solid var(--skyk-resourceDataSystem-itemBorder);
}

.skyk-resourceDataSystem-countCell{
  flex:1 1 0;
  min-width:0;
  height:100%;
  border:1px solid rgba(255,255,255,.10);
  background:var(--skyk-resourceDataSystem-countdownBg);
  box-shadow:inset 0 0 5px rgba(0,0,0,.45);
}

.skyk-resourceDataSystem-countCell.is-active{
  background:var(--skyk-resourceDataSystem-countdownFill);
  box-shadow:
    0 0 6px var(--skyk-resourceDataSystem-countdownFill),
    inset 0 0 4px rgba(255,255,255,.75);
}

.skyk-resourceDataSystem-root.is-countdown-disabled .skyk-resourceDataSystem-countCell,
.skyk-resourceDataSystem-root.is-countdown-disabled .skyk-resourceDataSystem-countCell.is-active{
  background:rgba(95,95,105,.72);
  box-shadow:inset 0 0 5px rgba(0,0,0,.45);
}

.skyk-resourceDataSystem-root.is-countdown-locked .skyk-resourceDataSystem-countCell,
.skyk-resourceDataSystem-root.is-countdown-locked .skyk-resourceDataSystem-countCell.is-active{
  background:rgba(255,60,70,.88);
  box-shadow:
    0 0 7px rgba(255,60,70,.76),
    inset 0 0 4px rgba(255,255,255,.42);
}

.skyk-resourceDataSystem-popupOverlay{
  position:absolute;
  inset:0;
  z-index:120;
  display:none;
  align-items:flex-end;
  justify-content:center;
  pointer-events:none;
}

.skyk-resourceDataSystem-popupOverlay.is-open{
  display:flex;
  pointer-events:auto;
}

.skyk-resourceDataSystem-popupBackdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.45);
  opacity:0;
  transition:opacity .24s ease;
}

.skyk-resourceDataSystem-popupOverlay.is-open .skyk-resourceDataSystem-popupBackdrop{
  opacity:1;
}

.skyk-resourceDataSystem-popupPanel{
  position:relative;
  width:100%;
  height:90%;
  margin-bottom:0;
  border-radius:24px 24px 0 0;
  background:linear-gradient(180deg,var(--skyk-resourceDataSystem-popupBgTop),var(--skyk-resourceDataSystem-popupBgBottom));
  border:1px solid var(--skyk-resourceDataSystem-border);
  box-shadow:
    0 0 30px var(--skyk-resourceDataSystem-glow),
    0 -10px 30px rgba(0,0,0,.35);
  padding:18px 10px 10px;
  transform:translateY(105%);
  transition:transform .28s ease;
  overflow:visible;
}

.skyk-resourceDataSystem-popupOverlay.is-open .skyk-resourceDataSystem-popupPanel{
  transform:translateY(0);
}

.skyk-resourceDataSystem-popupClose{
  position:absolute;
  right:2%;
  top:0;
  width:48px;
  height:48px;
  transform:translateY(-50%);
  border:1px solid var(--skyk-resourceDataSystem-border);
  border-radius:14px;
  color:var(--skyk-resourceDataSystem-text);
  background:linear-gradient(180deg,var(--skyk-resourceDataSystem-bgTop),var(--skyk-resourceDataSystem-bgBottom));
  box-shadow:0 0 16px var(--skyk-resourceDataSystem-glow),0 8px 18px rgba(0,0,0,.35);
  font-size:38px;
  line-height:1;
  font-weight:900;
  cursor:pointer;
}

.skyk-resourceDataSystem-popupBody{
  width:100%;
  height:100%;
  overflow:auto;
  padding:2px;
}

.skyk-resourceDataSystem-popupGrid{
  width:100%;
  display:grid;
  grid-template-columns:1fr;
  gap:8px;
  align-content:start;
}

.skyk-resourceDataSystem-popupBox{
  width:100%;
  aspect-ratio:4 / 1;
  display:grid;
  grid-template-columns:1fr 3fr;
  align-items:stretch;
  min-width:0;
  border-radius:16px;
  overflow:hidden;
  background:var(--skyk-resourceDataSystem-itemBg);
  border:1px solid var(--skyk-resourceDataSystem-itemBorder);
}

.skyk-resourceDataSystem-popupImageBox{
  min-width:0;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:6%;
  border-right:1px solid var(--skyk-resourceDataSystem-itemBorder);
}

.skyk-resourceDataSystem-popupImage{
  width:100%;
  height:100%;
  object-fit:contain;
  display:block;
}

.skyk-resourceDataSystem-popupTextBox{
  min-width:0;
  display:grid;
  grid-template-rows:repeat(5,1fr);
  padding:3% 4%;
  color:var(--skyk-resourceDataSystem-subText);
}

.skyk-resourceDataSystem-popupLine{
  min-width:0;
  display:flex;
  align-items:center;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  line-height:1;
  font-size:var(--skyk-resourceDataSystem-popup-font-size);
  font-weight:800;
}

.skyk-resourceDataSystem-popupInfo{
  grid-row:span 2;
  align-items:flex-start;
  white-space:normal;
  line-height:1.22;
  display:-webkit-box;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
}

.skyk-resourceDataSystem-warningOverlay{
  position:absolute;
  inset:0;
  z-index:220;
  display:none;
  align-items:center;
  justify-content:center;
  background:rgba(0,0,0,.52);
}

.skyk-resourceDataSystem-warningOverlay.is-open{
  display:flex;
}

.skyk-resourceDataSystem-warningBox{
  width:86%;
  max-width:480px;
  padding:18px 20px;
  border-radius:18px;
  background:linear-gradient(180deg,rgba(70,20,30,.98),rgba(24,8,12,.98));
  border:1px solid rgba(255,120,140,.48);
  color:#ffe4e8;
  box-shadow:0 18px 44px rgba(0,0,0,.58);
  font-weight:900;
  line-height:1.7;
  text-align:center;
}

.skyk-resourceDataSystem-warningBtn{
  margin-top:14px;
  min-width:120px;
  min-height:40px;
  border-radius:999px;
  border:1px solid rgba(255,210,220,.38);
  background:rgba(255,255,255,.12);
  color:#fff;
  font:inherit;
  font-weight:900;
}

@media (min-width:500px) and (orientation:landscape){
  .skyk-resourceDataSystem-root{
    left:auto;
    right:0;
  }

  .skyk-resourceDataSystem-rowArea{
    flex-direction:row;
  }

  .skyk-resourceDataSystem-cut{
    display:block;
  }

  .skyk-resourceDataSystem-row{
    border-top:0;
  }

  .skyk-resourceDataSystem-panel{
    border-left:1px solid var(--skyk-resourceDataSystem-border);
    clip-path:polygon(0 0,100% 0,100% 100%,var(--skyk-resourceDataSystem-clip-cut) 100%);
  }

  .skyk-resourceDataSystem-popupPanel{
    width:90%;
    height:90%;
    border-radius:24px;
    margin-bottom:0;
    padding:20px 12px 12px;
  }

  .skyk-resourceDataSystem-popupGrid{
    grid-template-columns:1fr 1fr;
  }
}
`;

  document.head.appendChild(style);
}

/* ==================================================
   Image Adapter
================================================== */

function applyImage(img, iconName, folder="【崩界櫻雪】GameSystem/Picture/IconImage"){
  if(!img) return;

  const cleanName = safeString(iconName).trim();
  const cleanFolder = safeString(folder).trim() || "【崩界櫻雪】GameSystem/Picture/IconImage";

  if(!cleanName){
    img.removeAttribute("src");
    return;
  }

  if(global.GameImageTool && typeof global.GameImageTool.applyImage === "function"){
    global.GameImageTool.applyImage(img, cleanName, { folder:cleanFolder });
    return;
  }

  const safeFolder = cleanFolder.replace(/\/$/,"");

  img.onerror = null;
  img.dataset.fallbackTried = "0";
  img.src = safeFolder + "/" + cleanName + ".ang";

  img.onerror = ()=>{
    if(img.dataset.fallbackTried === "1") return;
    img.dataset.fallbackTried = "1";
    img.src = safeFolder + "/" + cleanName + ".png";
  };
}

/* ==================================================
   UI Layout Sizing
================================================== */

function applyThemeVars(root, themeName){
  const theme = getTheme(themeName);

  const vars = {
    "--skyk-resourceDataSystem-bg":theme.bg,
    "--skyk-resourceDataSystem-bgTop":theme.bgTop,
    "--skyk-resourceDataSystem-bgBottom":theme.bgBottom,
    "--skyk-resourceDataSystem-border":theme.border,
    "--skyk-resourceDataSystem-glow":theme.glow,
    "--skyk-resourceDataSystem-itemBg":theme.itemBg,
    "--skyk-resourceDataSystem-itemBorder":theme.itemBorder,
    "--skyk-resourceDataSystem-text":theme.text,
    "--skyk-resourceDataSystem-subText":theme.subText,
    "--skyk-resourceDataSystem-countdownBg":theme.countdownBg,
    "--skyk-resourceDataSystem-countdownFill":theme.countdownFill,
    "--skyk-resourceDataSystem-popupBgTop":theme.popupBgTop,
    "--skyk-resourceDataSystem-popupBgBottom":theme.popupBgBottom
  };

  Object.entries(vars).forEach(([key, value])=>{
    root.style.setProperty(key, value);
  });
}

function updateLayoutMetrics(){
  if(!uiRuntime.mounted || !uiRuntime.root) return;

  if(isLandscapePC()){
    const rowCount = uiRuntime.root.querySelectorAll(".skyk-resourceDataSystem-row").length;
    const totalWidth = config.pcCutWidthPercent + config.pcRowWidthPercent * rowCount;
    const cutShare = config.pcCutWidthPercent / totalWidth * 100;
    const rowShare = config.pcRowWidthPercent / totalWidth * 100;

    const rootHeight = uiRuntime.root.parentElement
      ? uiRuntime.root.parentElement.clientHeight * config.pcRootHeightPercent / 100
      : 38;

    const rowHeight = Math.max(1, rootHeight - config.countdownHeightPx);

    uiRuntime.root.style.width = totalWidth + "%";
    uiRuntime.root.style.height = rootHeight + "px";
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-cut-share", cutShare + "%");
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-clip-cut", config.pcClipCutPercent + "%");
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-row-share", rowShare + "%");
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-row-px", rowHeight + "px");
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-font-size", (rowHeight * config.fontRate) + "px");
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-icon-height", (rowHeight * config.iconRate) + "px");

    const cut = uiRuntime.root.querySelector(".skyk-resourceDataSystem-cut");
    if(cut) cut.style.flexBasis = cutShare + "%";

    uiRuntime.root.querySelectorAll(".skyk-resourceDataSystem-row").forEach(row=>{
      row.style.flexBasis = rowShare + "%";
      row.style.width = rowShare + "%";
    });
  }else{
    const rowHeight = config.mobileRowHeightPx;

    uiRuntime.root.style.width = "100%";
    uiRuntime.root.style.height = "auto";
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-row-px", rowHeight + "px");
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-font-size", (rowHeight * config.fontRate) + "px");
    uiRuntime.root.style.setProperty("--skyk-resourceDataSystem-icon-height", (rowHeight * config.iconRate) + "px");

    const cut = uiRuntime.root.querySelector(".skyk-resourceDataSystem-cut");
    if(cut) cut.style.flexBasis = "0";

    uiRuntime.root.querySelectorAll(".skyk-resourceDataSystem-row").forEach(row=>{
      row.style.flexBasis = "auto";
      row.style.width = "100%";
    });
  }

  updatePopupBoxMetrics();
}

function updatePopupBoxMetrics(){
  if(!uiRuntime.popupGrid) return;

  const boxes = uiRuntime.popupGrid.querySelectorAll(".skyk-resourceDataSystem-popupBox");

  boxes.forEach(box=>{
    const boxHeight = box.clientWidth / 4;
    box.style.setProperty("--skyk-resourceDataSystem-popup-font-size", (boxHeight * 0.145) + "px");
  });
}

/* ==================================================
   UI
================================================== */

function mountUI(uiOptions={}, popupOptions={}){
  injectStyle();

  if(uiOptions.enabled === false) return;

  const target = getMountTarget(uiOptions.mountTarget || config.uiMountTarget);
  if(!target) throw new Error("找不到 Resource UI mountTarget。");

  unmountUI();

  const root = document.createElement("div");
  root.className = "skyk-resourceDataSystem-root";
  applyThemeVars(root, uiOptions.theme || "techBlue");

  const panel = document.createElement("div");
  panel.className = "skyk-resourceDataSystem-panel";

  const rowArea = document.createElement("div");
  rowArea.className = "skyk-resourceDataSystem-rowArea";

  const cut = document.createElement("div");
  cut.className = "skyk-resourceDataSystem-cut";
  rowArea.appendChild(cut);

  rowArea.appendChild(createResourceRow(uiOptions.row1 || []));

  if(Array.isArray(uiOptions.row2) && uiOptions.row2.length > 0){
    rowArea.appendChild(createResourceRow(uiOptions.row2));
  }

  panel.appendChild(rowArea);

  const countdown = document.createElement("div");
  countdown.className = "skyk-resourceDataSystem-countdown";

  for(let i=0; i<20; i++){
    const cell = document.createElement("div");
    cell.className = "skyk-resourceDataSystem-countCell";
    countdown.appendChild(cell);
  }

  panel.appendChild(countdown);
  root.appendChild(panel);
  target.appendChild(root);

  uiRuntime = {
    mounted:true,
    root,
    panel,
    rowArea,
    countdown,
    popupOverlay:null,
    popupBody:null,
    popupGrid:null,
    warningOverlay:null,
    options:{
      ui:clonePlain(uiOptions),
      popup:clonePlain(popupOptions)
    },
    popupCardsById:{}
  };

  initializeRowIcons();

  if(popupOptions.enabled !== false){
    mountPopup(target, popupOptions, uiOptions.theme || "techBlue");
    panel.addEventListener("click", openPopup);
  }

  mountWarning(target);

  resizeHandler = ()=>{
    updateLayoutMetrics();
  };
  window.addEventListener("resize", resizeHandler);

  updateLayoutMetrics();
  renderUIValues();
}

function createResourceRow(ids){
  const row = document.createElement("div");
  row.className = "skyk-resourceDataSystem-row";

  ids.forEach(id=>{
    const item = document.createElement("div");
    item.className = "skyk-resourceDataSystem-item";
    item.dataset.resourceId = id;

    const iconBox = document.createElement("div");
    iconBox.className = "skyk-resourceDataSystem-iconBox";

    const icon = document.createElement("img");
    icon.className = "skyk-resourceDataSystem-icon";
    icon.alt = id;

    iconBox.appendChild(icon);

    const valueBox = document.createElement("div");
    valueBox.className = "skyk-resourceDataSystem-valueBox";

    const value = document.createElement("span");
    value.className = "skyk-resourceDataSystem-value";
    value.textContent = "0";

    valueBox.appendChild(value);
    item.append(iconBox, valueBox);
    row.appendChild(item);
  });

  return row;
}

function initializeRowIcons(){
  if(!uiRuntime.mounted || !uiRuntime.root) return;

  const items = uiRuntime.root.querySelectorAll(".skyk-resourceDataSystem-item[data-resource-id]");

  items.forEach(item=>{
    const id = item.dataset.resourceId;
    const resource = status.resourcesById[id];
    const icon = item.querySelector(".skyk-resourceDataSystem-icon");

    if(!icon) return;

    if(!resource){
      icon.removeAttribute("src");
      return;
    }

    icon.alt = resource.label || resource.id;
    applyImage(icon, resource.iconS, "【崩界櫻雪】GameSystem/Picture/IconImage");
  });
}

function unmountUI(){
  if(resizeHandler){
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }

  ["root", "popupOverlay", "warningOverlay"].forEach(key=>{
    const el = uiRuntime[key];
    if(el && el.parentNode) el.parentNode.removeChild(el);
  });

  uiRuntime = {
    mounted:false,
    root:null,
    panel:null,
    rowArea:null,
    countdown:null,
    popupOverlay:null,
    popupBody:null,
    popupGrid:null,
    warningOverlay:null,
    options:null,
    popupCardsById:{}
  };
}

function renderUIValues(){
  if(!uiRuntime.mounted || !uiRuntime.root) return;

  const items = uiRuntime.root.querySelectorAll(".skyk-resourceDataSystem-item[data-resource-id]");

  items.forEach(item=>{
    const id = item.dataset.resourceId;
    const resource = status.resourcesById[id];
    const value = item.querySelector(".skyk-resourceDataSystem-value");

    if(!value) return;

    if(!resource){
      value.textContent = "--";
      return;
    }

    value.textContent = formatValue(resource.amount);
    value.title = resource.label || resource.id;
  });

  updateCountdownState();
}

function updateCountdownState(){
  if(!uiRuntime.mounted || !uiRuntime.root || !uiRuntime.countdown) return;

  const cells = Array.from(uiRuntime.countdown.querySelectorAll(".skyk-resourceDataSystem-countCell"));

  const countdownEnabled = !!(
    uiRuntime.options &&
    uiRuntime.options.ui &&
    uiRuntime.options.ui.countdown !== false &&
    status.realtime.enabled
  );

  uiRuntime.root.classList.toggle("is-countdown-disabled", !countdownEnabled);
  uiRuntime.root.classList.toggle("is-countdown-locked", status.realtime.locked);

  let active = 0;

  if(countdownEnabled && !status.realtime.locked){
    active = Math.floor(boundNumber(status.realtime.progress, 0, 1) * cells.length);
  }

  if(status.realtime.locked){
    active = cells.length;
  }

  cells.forEach((cell, index)=>{
    cell.classList.toggle("is-active", index < active);
  });
}

/* ==================================================
   Popup
================================================== */

function mountPopup(target, popupOptions, themeName){
  const overlay = document.createElement("div");
  overlay.className = "skyk-resourceDataSystem-popupOverlay";
  applyThemeVars(overlay, themeName);

  const backdrop = document.createElement("div");
  backdrop.className = "skyk-resourceDataSystem-popupBackdrop";

  const panel = document.createElement("div");
  panel.className = "skyk-resourceDataSystem-popupPanel";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "skyk-resourceDataSystem-popupClose";
  closeBtn.textContent = "×";

  const body = document.createElement("div");
  body.className = "skyk-resourceDataSystem-popupBody";

  const grid = document.createElement("div");
  grid.className = "skyk-resourceDataSystem-popupGrid";

  body.appendChild(grid);
  panel.append(closeBtn, body);
  overlay.append(backdrop, panel);
  target.appendChild(overlay);

  backdrop.addEventListener("click", closePopup);
  closeBtn.addEventListener("click", closePopup);
  panel.addEventListener("click", event=>event.stopPropagation());

  uiRuntime.popupOverlay = overlay;
  uiRuntime.popupBody = body;
  uiRuntime.popupGrid = grid;
}

function openPopup(){
  if(!uiRuntime.popupOverlay) return;

  renderPopupStructure();
  patchPopupValues();

  uiRuntime.popupOverlay.classList.add("is-open");

  requestAnimationFrame(updatePopupBoxMetrics);
}

function closePopup(){
  if(!uiRuntime.popupOverlay) return;
  uiRuntime.popupOverlay.classList.remove("is-open");
}

function getPopupResourceList(){
  const popupOptions = uiRuntime.options && uiRuntime.options.popup ? uiRuntime.options.popup : {};
  const stores = Array.isArray(popupOptions.stores) ? popupOptions.stores : [];
  const result = [];

  stores.forEach(storeName=>{
    const list = status.resourcesByStore[storeName] || [];
    list.forEach(resource=>result.push(resource));
  });

  return result;
}

function renderPopupStructure(){
  if(!uiRuntime.popupGrid) return;

  const resources = getPopupResourceList();
  const nextIds = new Set(resources.map(resource=>resource.id));

  Array.from(uiRuntime.popupGrid.querySelectorAll(".skyk-resourceDataSystem-popupBox")).forEach(box=>{
    if(!nextIds.has(box.dataset.resourceId)){
      box.remove();
      delete uiRuntime.popupCardsById[box.dataset.resourceId];
    }
  });

  resources.forEach(resource=>{
    if(uiRuntime.popupCardsById[resource.id]) return;

    const box = createPopupBox(resource);
    uiRuntime.popupCardsById[resource.id] = box;
    uiRuntime.popupGrid.appendChild(box);
  });

  requestAnimationFrame(updatePopupBoxMetrics);
}

function patchPopupValues(){
  if(!uiRuntime.popupGrid) return;

  Object.entries(uiRuntime.popupCardsById).forEach(([id, box])=>{
    const resource = status.resourcesById[id];
    if(!resource || !box) return;

    const amount = box.querySelector('[data-skyk-resource-popup-role="amount"]');
    const max = box.querySelector('[data-skyk-resource-popup-role="max"]');
    const regen = box.querySelector('[data-skyk-resource-popup-role="regen"]');

    if(amount) amount.textContent = "儲備量：" + formatValue(resource.amount);
    if(max) max.textContent = "上限值：" + formatValue(resource.max);
    if(regen) regen.textContent = "收益值：" + formatValue(resource.regen);
  });
}

function createPopupBox(resource){
  const box = document.createElement("div");
  box.className = "skyk-resourceDataSystem-popupBox";
  box.dataset.resourceId = resource.id;

  const imageBox = document.createElement("div");
  imageBox.className = "skyk-resourceDataSystem-popupImageBox";

  const img = document.createElement("img");
  img.className = "skyk-resourceDataSystem-popupImage";
  img.alt = resource.label || resource.id;
  applyImage(img, resource.iconBig || resource.iconS, "【崩界櫻雪】GameSystem/Picture/IconImage");

  imageBox.appendChild(img);

  const textBox = document.createElement("div");
  textBox.className = "skyk-resourceDataSystem-popupTextBox";

  const amount = document.createElement("div");
  amount.className = "skyk-resourceDataSystem-popupLine";
  amount.dataset.skykResourcePopupRole = "amount";

  const max = document.createElement("div");
  max.className = "skyk-resourceDataSystem-popupLine";
  max.dataset.skykResourcePopupRole = "max";

  const regen = document.createElement("div");
  regen.className = "skyk-resourceDataSystem-popupLine";
  regen.dataset.skykResourcePopupRole = "regen";

  const info = document.createElement("div");
  info.className = "skyk-resourceDataSystem-popupLine skyk-resourceDataSystem-popupInfo";
  info.textContent = resource.info || "";

  textBox.append(amount, max, regen, info);
  box.append(imageBox, textBox);

  patchPopupValuesForBox(box, resource);
  return box;
}

function patchPopupValuesForBox(box, resource){
  const amount = box.querySelector('[data-skyk-resource-popup-role="amount"]');
  const max = box.querySelector('[data-skyk-resource-popup-role="max"]');
  const regen = box.querySelector('[data-skyk-resource-popup-role="regen"]');

  if(amount) amount.textContent = "儲備量：" + formatValue(resource.amount);
  if(max) max.textContent = "上限值：" + formatValue(resource.max);
  if(regen) regen.textContent = "收益值：" + formatValue(resource.regen);
}

/* ==================================================
   Warning
================================================== */

function mountWarning(target){
  const overlay = document.createElement("div");
  overlay.className = "skyk-resourceDataSystem-warningOverlay";

  const box = document.createElement("div");
  box.className = "skyk-resourceDataSystem-warningBox";

  const message = document.createElement("div");
  message.textContent = "偵測到資源收益時間戳異常，可能有重複開啟的頁面正在同時寫入。\n\n即時收益已暫停。請關閉重複開啟的視窗，再重新開啟本頁。";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "skyk-resourceDataSystem-warningBtn";
  btn.textContent = "確認";
  btn.addEventListener("click", ()=>{
    overlay.classList.remove("is-open");
  });

  box.append(message, btn);
  overlay.appendChild(box);
  target.appendChild(overlay);

  uiRuntime.warningOverlay = overlay;
}

function showRealtimeLockWarning(){
  if(uiRuntime.warningOverlay){
    uiRuntime.warningOverlay.classList.add("is-open");
  }
}

/* ==================================================
   Start / Stop
================================================== */

function configure(options={}){
  if(options.debug !== undefined) config.debug = !!options.debug;
  if(options.dbName) config.dbName = options.dbName;

  config.tickMs = Math.max(1000, floor(options.tickMs || config.tickMs));
  config.loopMs = Math.max(100, floor(options.loopMs || config.loopMs));
  config.shortDeltaRate = boundNumber(num(options.shortDeltaRate, config.shortDeltaRate), 0.1, 0.95);
  config.maxBadRealtimeCount = Math.max(1, floor(options.maxBadRealtimeCount || config.maxBadRealtimeCount));

  if(options.pcCutWidthPercent !== undefined) config.pcCutWidthPercent = num(options.pcCutWidthPercent, config.pcCutWidthPercent);
  if(options.pcRowWidthPercent !== undefined) config.pcRowWidthPercent = num(options.pcRowWidthPercent, config.pcRowWidthPercent);
  if(options.pcClipCutPercent !== undefined) config.pcClipCutPercent = num(options.pcClipCutPercent, config.pcClipCutPercent);
  if(options.pcRootHeightPercent !== undefined) config.pcRootHeightPercent = num(options.pcRootHeightPercent, config.pcRootHeightPercent);
  if(options.mobileRowHeightPx !== undefined) config.mobileRowHeightPx = num(options.mobileRowHeightPx, config.mobileRowHeightPx);

  return clonePlain(config);
}

async function start(options={}){
  if(started){
    await stop();
  }

  configure(options);

  db = await openDB();
  started = true;

  status.realtime.enabled = !!(options.realtime && options.realtime.enabled);
  status.realtime.locked = false;
  status.realtime.badCount = 0;
  status.realtime.progress = 0;

  await refreshStatusFromDB("startRefresh");

  if(options.ui && options.ui.enabled !== false){
    mountUI(
      Object.assign({}, options.ui, {
        mountTarget:options.mountTarget || options.ui.mountTarget || config.uiMountTarget
      }),
      options.popup || {}
    );
  }

  await runOfflineSettlement();

  if(status.realtime.enabled){
    startRealtimeLoop();
  }else{
    updateCountdownState();
  }

  renderUIValues();
  emit("started", null);

  return getStatus();
}

async function stop(){
  stopRealtimeLoop();
  unmountUI();

  if(db){
    db.close();
    db = null;
  }

  started = false;
  emit("stopped", null);
}

/* ==================================================
   Export
================================================== */

global.SKYKResourceDataSystem = {
  start,
  stop,
  configure,
  config:configure,

  getStatus,
  getResource,
  getResourceList,
  refreshStatus:refreshStatusFromDB,

  changeResources,
  addResources,
  spendResources,
  canAfford,

  runOfflineSettlement,
  runRealtimeSettlement,

  openPopup,
  closePopup,

  subscribe,

  settings:SKYK_RESOURCE_DATA_SYSTEM_SETTING,
  themes:SKYK_RESOURCE_DATA_SYSTEM_THEMES
};

global.SKYKResourseDataSystem = global.SKYKResourceDataSystem;

})(window);
