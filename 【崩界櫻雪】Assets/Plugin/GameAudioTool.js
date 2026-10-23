/*
==================================================
GameAudioTool
版本：v1.0.0
==================================================

用途：
- 共用音效工具。
- 所有插件 / 頁面若要播放音效，建議統一經過本工具。
- 本插件負責：音效路徑、mapping、播放頻道、重複觸發處置、音量、靜音、播放上限。
- 本插件不做副檔名 fallback，file 必須包含副檔名，例如 "click.ogg" / "bgm_home.mp3"。

預設素材路徑：
- 【崩界櫻雪】Assets/Audio

核心概念：
1. mapping 呼叫
   GameAudioTool.play("toolbar_click");

2. 直接檔案呼叫
   GameAudioTool.play({
     path:"【崩界櫻雪】Assets/Audio/BGM",
     file:"BGM01.mp3",
     channel:"bgm",
     repeatMode:"ignore",
     loop:true
   });

3. channel 頻道
   channel:"sfx"
   - 一般音效。
   - 有同時播放上限。
   - 不會擠掉 BGM。

   channel:"bgm"
   - 背景音樂。
   - 獨立單頻道。
   - 不使用 sfx 播放池。
   - 新 BGM 可依 repeatMode 決定忽略或覆蓋。

4. repeatMode 重複觸發處置
   注意：只有「同一個音效 key / path+file」正在播放時才適用。

   repeatMode:"ignore"
   - 若同一音效正在播，吃掉後者。
   - 適合 BGM、長提示音、開啟音。

   repeatMode:"restart"
   - 若同一音效正在播，停止舊的，從頭播放新的。
   - 適合警告音、錯誤音、切換音。

   repeatMode:"overlap"
   - 同一音效允許重疊播放。
   - 適合砲擊、命中、腳步、短 UI click。
   - 受 maxSfxChannels 限制。

5. 音效失敗規則
   - 播放失敗不 alert。
   - 播放失敗不 throw。
   - 播放失敗不得阻斷頁面或按鈕主功能。
   - 若 debug=true，才輸出 console.warn。

==================================================
呼叫方式
==================================================

【模式1：mapping 名稱呼叫】

GameAudioTool.play("toolbar_click");

mapping 寫在 AUDIO_MAP。

--------------------------------------------------

【模式2：直接檔案呼叫】

GameAudioTool.play({
  path:"【崩界櫻雪】Assets/Audio/System",
  file:"warning01.ogg",
  channel:"sfx",
  repeatMode:"restart",
  volume:0.8
});

--------------------------------------------------

【模式3：BGM 呼叫】

GameAudioTool.play({
  path:"【崩界櫻雪】Assets/Audio/BGM",
  file:"home_theme.mp3",
  channel:"bgm",
  repeatMode:"ignore",
  loop:true,
  volume:0.5
});

也可以使用：

GameAudioTool.playBGM({
  path:"【崩界櫻雪】Assets/Audio/BGM",
  file:"home_theme.mp3"
});

--------------------------------------------------

【停止】

GameAudioTool.stopBGM();
GameAudioTool.stopAllSfx();
GameAudioTool.stopAll();

--------------------------------------------------

【設定】

GameAudioTool.configure({
  basePath:"【崩界櫻雪】Assets/Audio",
  volume:0.7,
  sfxVolume:0.8,
  bgmVolume:0.5,
  muted:false,
  maxSfxChannels:10,
  debug:false
});

--------------------------------------------------

【Toolbar 插件建議用法】

Toolbar 插件只需要呼叫音效名稱：

GameAudioTool.play("toolbar_blue");

實際音效檔案、音量、頻道、repeatMode 由本工具 mapping 決定。
Toolbar 插件不應該自己拼音效路徑。

==================================================
Mapping 寫法
==================================================

目前 mapping 可先空著。
未來可在 AUDIO_MAP 裡新增：

const AUDIO_MAP = {
  toolbar_default:{
    path:"【崩界櫻雪】Assets/Audio/Toolbar",
    file:"toolbar_click.ogg",
    channel:"sfx",
    repeatMode:"overlap",
    volume:0.6
  }
};

若 mapping 項目沒有 path，會使用 basePath。
若 mapping 項目沒有 channel，預設 sfx。
若 mapping 項目沒有 repeatMode：
- sfx 預設 overlap
- bgm 預設 ignore

==================================================
*/

(function(global){
"use strict";

/* ==================================================
   Default Config
================================================== */

const DEFAULT_CONFIG = {
  basePath:"【崩界櫻雪】Assets/Audio",
  volume:1,
  sfxVolume:1,
  bgmVolume:1,
  muted:false,
  maxSfxChannels:10,
  sameSoundCooldownMs:0,
  debug:false
};

/* ==================================================
   Audio Mapping
   --------------------------------------------------
   目前先保留空 mapping。
   未來請在這裡新增音效名稱對應。
================================================== */

const AUDIO_MAP = {
  /*
  toolbar_default:{
    path:"【崩界櫻雪】Assets/Audio/Toolbar",
    file:"toolbar_click.ogg",
    channel:"sfx",
    repeatMode:"overlap",
    volume:0.6
  },

  warning:{
    path:"【崩界櫻雪】Assets/Audio/System",
    file:"warning01.ogg",
    channel:"sfx",
    repeatMode:"restart",
    volume:0.8
  },

  bgm_home:{
    path:"【崩界櫻雪】Assets/Audio/BGM",
    file:"home_theme.mp3",
    channel:"bgm",
    repeatMode:"ignore",
    loop:true,
    volume:0.5
  }
  */
};

/* ==================================================
   Runtime State
================================================== */

const state = {
  config:Object.assign({}, DEFAULT_CONFIG),
  sfxInstances:[],
  bgmInstance:null,
  lastPlayAtByKey:Object.create(null)
};

/* ==================================================
   Utility
================================================== */

function normalizePathPart(value){
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function joinPath(path, file){
  const p = normalizePathPart(path || "");
  const f = String(file || "").replace(/^\/+/, "");
  if(!f) return "";
  if(!p) return f;
  return p + "/" + f;
}

function warn(){
  if(!state.config.debug) return;
  console.warn.apply(console, ["[GameAudioTool]"].concat(Array.from(arguments)));
}

function clonePlain(value){
  return JSON.parse(JSON.stringify(value));
}

function clampNumber(value, min, max, fallback){
  const n = Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function configure(options){
  if(!options || typeof options !== "object") return getConfig();

  Object.assign(state.config, options);

  state.config.basePath = normalizePathPart(state.config.basePath || DEFAULT_CONFIG.basePath);
  state.config.volume = clampNumber(state.config.volume, 0, 1, DEFAULT_CONFIG.volume);
  state.config.sfxVolume = clampNumber(state.config.sfxVolume, 0, 1, DEFAULT_CONFIG.sfxVolume);
  state.config.bgmVolume = clampNumber(state.config.bgmVolume, 0, 1, DEFAULT_CONFIG.bgmVolume);
  state.config.maxSfxChannels = Math.max(1, Number(state.config.maxSfxChannels) || DEFAULT_CONFIG.maxSfxChannels);
  state.config.sameSoundCooldownMs = Math.max(0, Number(state.config.sameSoundCooldownMs) || 0);
  state.config.muted = !!state.config.muted;
  state.config.debug = !!state.config.debug;

  applyVolumeToActiveAudio();

  return getConfig();
}

function getConfig(){
  return Object.assign({}, state.config);
}

function getState(){
  return {
    sfxCount:state.sfxInstances.length,
    bgmPlaying:!!state.bgmInstance,
    muted:state.config.muted,
    config:getConfig()
  };
}

function normalizeChannel(channel){
  return channel === "bgm" ? "bgm" : "sfx";
}

function normalizeRepeatMode(mode, channel){
  if(mode === "ignore" || mode === "restart" || mode === "overlap") return mode;
  return channel === "bgm" ? "ignore" : "overlap";
}

function getAudioVolume(entry){
  const base = clampNumber(entry.volume, 0, 1, 1);
  const channel = normalizeChannel(entry.channel);

  if(channel === "bgm"){
    return state.config.muted ? 0 : base * state.config.volume * state.config.bgmVolume;
  }

  return state.config.muted ? 0 : base * state.config.volume * state.config.sfxVolume;
}

function applyVolumeToActiveAudio(){
  for(const item of state.sfxInstances){
    if(item.audio) item.audio.volume = getAudioVolume(item.entry);
  }

  if(state.bgmInstance && state.bgmInstance.audio){
    state.bgmInstance.audio.volume = getAudioVolume(state.bgmInstance.entry);
  }
}

function resolveEntry(input, options){
  let raw = null;
  let key = "";

  if(typeof input === "string"){
    key = input;
    raw = AUDIO_MAP[input];

    if(!raw){
      warn("找不到 mapping：", input);
      return null;
    }
  }else if(input && typeof input === "object"){
    raw = input;
    key = input.key || input.id || (String(input.path || state.config.basePath) + "/" + String(input.file || ""));
  }else{
    return null;
  }

  const merged = Object.assign({}, raw || {}, options || {});
  const channel = normalizeChannel(merged.channel);
  const repeatMode = normalizeRepeatMode(merged.repeatMode, channel);

  const path = normalizePathPart(merged.path || state.config.basePath);
  const file = String(merged.file || "").trim();

  if(!file){
    warn("音效缺少 file：", input);
    return null;
  }

  const src = joinPath(path, file);

  return {
    key:String(key || src),
    path,
    file,
    src,
    channel,
    repeatMode,
    loop:!!merged.loop,
    volume:clampNumber(merged.volume, 0, 1, 1)
  };
}

function shouldBlockByCooldown(entry){
  const cd = state.config.sameSoundCooldownMs;
  if(!cd) return false;

  const t = Date.now();
  const last = state.lastPlayAtByKey[entry.key] || 0;

  if(t - last < cd) return true;

  state.lastPlayAtByKey[entry.key] = t;
  return false;
}

/* ==================================================
   SFX Handling
================================================== */

function cleanupSfxInstances(){
  state.sfxInstances = state.sfxInstances.filter(item => {
    const audio = item.audio;
    return audio && !audio.ended && !audio.paused;
  });
}

function findActiveSfxByKey(key){
  cleanupSfxInstances();
  return state.sfxInstances.filter(item => item.key === key);
}

function stopSfxItem(item){
  if(!item || !item.audio) return;
  try{
    item.audio.pause();
    item.audio.currentTime = 0;
  }catch(err){
    warn("停止 SFX 失敗：", err);
  }
}

function playSfx(entry){
  if(shouldBlockByCooldown(entry)) return null;

  const sameList = findActiveSfxByKey(entry.key);

  if(sameList.length > 0){
    if(entry.repeatMode === "ignore"){
      return null;
    }

    if(entry.repeatMode === "restart"){
      sameList.forEach(stopSfxItem);
      state.sfxInstances = state.sfxInstances.filter(item => item.key !== entry.key);
    }
  }

  cleanupSfxInstances();

  if(state.sfxInstances.length >= state.config.maxSfxChannels){
    warn("SFX 播放池已滿，拒絕播放：", entry.key);
    return null;
  }

  const audio = new Audio(entry.src);
  audio.loop = !!entry.loop;
  audio.volume = getAudioVolume(entry);
  audio.preload = "auto";

  const item = {
    key:entry.key,
    entry,
    audio
  };

  state.sfxInstances.push(item);

  audio.addEventListener("ended", () => {
    state.sfxInstances = state.sfxInstances.filter(x => x !== item);
  });

  audio.addEventListener("error", () => {
    warn("SFX 載入或播放錯誤：", entry.src);
    state.sfxInstances = state.sfxInstances.filter(x => x !== item);
  });

  const playResult = audio.play();

  if(playResult && typeof playResult.catch === "function"){
    playResult.catch(err => {
      warn("SFX 播放被瀏覽器阻擋或失敗：", entry.src, err);
      state.sfxInstances = state.sfxInstances.filter(x => x !== item);
    });
  }

  return item;
}

/* ==================================================
   BGM Handling
================================================== */

function stopBGM(){
  const item = state.bgmInstance;
  if(!item || !item.audio) return;

  try{
    item.audio.pause();
    item.audio.currentTime = 0;
  }catch(err){
    warn("停止 BGM 失敗：", err);
  }

  state.bgmInstance = null;
}

function playBgm(entry){
  const current = state.bgmInstance;

  if(current && current.key === entry.key){
    if(entry.repeatMode === "ignore"){
      return current;
    }

    if(entry.repeatMode === "restart"){
      stopBGM();
    }
  }else if(current){
    stopBGM();
  }

  const audio = new Audio(entry.src);
  audio.loop = entry.loop !== false;
  audio.volume = getAudioVolume(entry);
  audio.preload = "auto";

  const item = {
    key:entry.key,
    entry,
    audio
  };

  state.bgmInstance = item;

  audio.addEventListener("error", () => {
    warn("BGM 載入或播放錯誤：", entry.src);
    if(state.bgmInstance === item) state.bgmInstance = null;
  });

  const playResult = audio.play();

  if(playResult && typeof playResult.catch === "function"){
    playResult.catch(err => {
      warn("BGM 播放被瀏覽器阻擋或失敗：", entry.src, err);
      if(state.bgmInstance === item) state.bgmInstance = null;
    });
  }

  return item;
}

/* ==================================================
   Public API
================================================== */

function play(input, options){
  const entry = resolveEntry(input, options);
  if(!entry) return null;

  if(entry.channel === "bgm"){
    return playBgm(entry);
  }

  return playSfx(entry);
}

function playBGM(input, options){
  if(typeof input === "string"){
    return play(input, Object.assign({}, options || {}, { channel:"bgm" }));
  }

  return play(Object.assign({}, input || {}, { channel:"bgm" }), options);
}

function stopAllSfx(){
  for(const item of state.sfxInstances){
    stopSfxItem(item);
  }
  state.sfxInstances = [];
}

function stopAll(){
  stopAllSfx();
  stopBGM();
}

function setMuted(value){
  state.config.muted = !!value;
  applyVolumeToActiveAudio();
}

function toggleMuted(){
  setMuted(!state.config.muted);
  return state.config.muted;
}

function setVolume(value){
  state.config.volume = clampNumber(value, 0, 1, state.config.volume);
  applyVolumeToActiveAudio();
}

function setSfxVolume(value){
  state.config.sfxVolume = clampNumber(value, 0, 1, state.config.sfxVolume);
  applyVolumeToActiveAudio();
}

function setBgmVolume(value){
  state.config.bgmVolume = clampNumber(value, 0, 1, state.config.bgmVolume);
  applyVolumeToActiveAudio();
}

function addMapping(key, entry){
  const k = String(key || "").trim();
  if(!k || !entry || typeof entry !== "object") return false;
  AUDIO_MAP[k] = Object.assign({}, entry);
  return true;
}

function getMapping(){
  return clonePlain(AUDIO_MAP);
}

const api = {
  configure,
  config:configure,
  getConfig,
  getState,

  play,
  playBGM,
  stopBGM,
  stopAllSfx,
  stopAll,

  setMuted,
  toggleMuted,
  setVolume,
  setSfxVolume,
  setBgmVolume,

  addMapping,
  getMapping,

  map:AUDIO_MAP,
  defaults:DEFAULT_CONFIG
};

configure(DEFAULT_CONFIG);

global.GameAudioTool = api;

})(window);
