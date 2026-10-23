/*
==================================================
CodexHeader
版本：v1.0.0
==================================================

用途：
- Codex 系列頁面的共用 Header 插件。
- 本插件不是單純 Toolbar。
- 本插件包含：
  1. TitleBar：標題列
  2. 左右 🥦 toggle button
  3. ToolbarStack：可註冊多條 toolbar
  4. Type1 標準按鈕
  5. Type2 群組按鈕
  6. FloatingLayer：所有群組展開面板統一掛載層
  7. 暗色立體按鈕樣式
  8. 按鈕顏色對應音效名稱 mapping

核心設計：
- 頁面負責決定有幾條 toolbar。
- 頁面負責決定每顆按鈕要做什麼。
- 插件只負責 Header / Toolbar / Button / FloatingLayer 的 UI 管理。
- 插件不讀 JSON。
- 插件不判斷頁面是否已建檔。
- active / inactive / auto 的實際結果應由頁面轉成 open:true / open:false 後交給插件。

==================================================
掛載結構
==================================================

建議 HTML 放一個容器：

<div id="CodexHeaderMount"></div>

然後：

CodexHeader.mount({
  target:"#CodexHeaderMount",
  title:"崩界櫻雪首頁",
  contentEditableTitle:true,

  leftToggle:{
    text:"🥦",
    toolbarIds:["toolbar-edit"]
  },

  rightToggle:{
    text:"🥦",
    toolbarIds:["toolbar-main"]
  },

  toolbars:[
    {
      id:"toolbar-main",
      open:false,
      buttons:[
        { id:"edit", text:"編輯", color:"red", onClick:()=>setMode("edit") },
        { id:"render", text:"渲染", color:"blue", onClick:()=>setMode("render") },
        { id:"export", text:"匯出", color:"green", onClick:()=>exportJSON() }
      ]
    }
  ]
});

==================================================
TitleBar 結構
==================================================

本插件產生三 DOM：

<div class="codex-titlebar">
  <button class="codex-title-toggle codex-title-toggle-left">🥦</button>
  <div class="codex-title-text">標題文字</div>
  <button class="codex-title-toggle codex-title-toggle-right">🥦</button>
</div>

注意：
- 🥦 不是字串合併。
- 左右 🥦 是 button。
- 中央標題文字可設定 contenteditable。
- 外框、背景、光暈在父層 codex-titlebar。
- 中央文字格本身不做外框。
- 🥦 格子為 1:1 正方形，跟著標題列高度縮放。

==================================================
Toolbar ID 規則
==================================================

Toolbar ID 由頁面自己定義，插件不強制規範。

建議語意命名：
- toolbar-main
- toolbar-edit
- toolbar-doc
- toolbar-jump
- toolbar-system

重點：
- 🥦 toggle 綁的是 toolbarIds。
- 只要 toggle 的 toolbarIds 和 toolbar 的 id 對得上即可。

==================================================
Toolbar 開關狀態
==================================================

插件只吃 open:true / open:false。

頁面可自行將語意狀態轉成 open：

active:
- 常態工具。
- 不管有沒有資料都預設開。
- 例：匯出 DOC、匯出剪貼簿。

inactive:
- 低頻工具。
- 不管有沒有資料都預設關。

auto:
- 建檔工具。
- 沒資料時開，有資料時關。
- 頁面自己根據是否載入 JSON / 是否已有資料判斷。
- 判斷完後傳 open:true / open:false 給插件。

例：

const hasData = !!loadedJson;

CodexHeader.mount({
  toolbars:[
    {
      id:"toolbar-edit",
      open:!hasData,
      buttons:[...]
    }
  ]
});

==================================================
Button Type 1：標準按鈕
==================================================

{
  id:"render",
  text:"渲染",
  color:"blue",
  textColor:"#fff",
  onClick:()=>setMode("render")
}

支援：
- id
- text
- color
- textColor
- background
- title
- disabled
- onClick

color 內建：
- dark
- blue
- red
- green
- yellow
- purple

==================================================
Button Type 2：群組按鈕
==================================================

{
  type:"group",
  id:"system",
  text:"系統",
  color:"purple",

  displayMode:"responsive",
  closeMode:"autoClose",

  children:[
    { id:"export", text:"匯出", color:"green", onClick:()=>exportJSON() },
    { id:"import", text:"匯入", color:"blue", onClick:()=>importJSON() },
    { id:"clear", text:"清除", color:"red", onClick:()=>clearData() }
  ]
}

displayMode:
- alwaysGroup
  手機 / PC 都顯示父按鈕，子按鈕進 FloatingLayer。
- responsive
  手機顯示父按鈕，PC 攤平成子按鈕。

closeMode:
- autoClose
  點子按鈕後自動關閉。
  適合：匯出、匯入、清除。
- stayOpen
  點子按鈕後不關閉。
  適合：跳轉、篩選、連續切換。

重要規則：
- 全頁同一時間只能開一個群組展開面板。
- 所有展開面板都掛在 FloatingLayer，不掛在 toolbar 內。
- 這樣可避免 Toolbar1 展開內容被 Toolbar2 蓋住。
- 未來即使有往上展開，也不會受 toolbar z-index 順序牽制。

群組父按鈕視覺：
- 同樣吃 color。
- 自動加 codex-btn-group。
- 不使用小箭頭。
- 透過較亮內框、內光、暗紋區分「這顆是展開父層」。

==================================================
音效規格
==================================================

本插件不處理音效檔案。
本插件只呼叫 GameAudioTool.play(soundName)。

音效名稱由顏色 mapping 決定：

const BUTTON_SOUND_BY_COLOR = {
  dark:"toolbar_default",
  blue:"toolbar_blue",
  red:"toolbar_red",
  green:"toolbar_green",
  yellow:"toolbar_yellow",
  purple:"toolbar_purple"
};

未來可在 GameAudioTool 的 AUDIO_MAP 內設定：
- toolbar_blue 對應哪個檔案
- channel
- repeatMode
- volume

若 GameAudioTool 不存在，插件會略過音效，不影響按鈕功能。

==================================================
Public API
==================================================

CodexHeader.mount(config)
CodexHeader.unmount()
CodexHeader.setToolbarOpen(toolbarId, open)
CodexHeader.toggleToolbar(toolbarId)
CodexHeader.closeAllToolbars()
CodexHeader.openToolbar(toolbarId)
CodexHeader.closeFloatingPanel()
CodexHeader.setTitle(text)
CodexHeader.getTitle()
CodexHeader.getState()

==================================================
*/

(function(global){
"use strict";

/* ==================================================
   Default Config
================================================== */

const DEFAULT_CONFIG = {
  target:"#CodexHeaderMount",

  title:"請輸入標題",
  contentEditableTitle:true,

  leftToggle:{
    text:"🥦",
    toolbarIds:[]
  },

  rightToggle:{
    text:"🥦",
    toolbarIds:[]
  },

  toolbars:[],

  // responsive 模式下，寬度小於等於此值時使用群組模式。
  mobileBreakpoint:700,

  debug:false
};

/* ==================================================
   Button Sound Mapping
   --------------------------------------------------
   本插件只呼叫音效名稱。
   實際檔案由 GameAudioTool 的 mapping 決定。
================================================== */

const BUTTON_SOUND_BY_COLOR = {
  dark:"toolbar_default",
  blue:"toolbar_blue",
  red:"toolbar_red",
  green:"toolbar_green",
  yellow:"toolbar_yellow",
  purple:"toolbar_purple"
};

/* ==================================================
   Runtime
================================================== */

const state = {
  mounted:false,
  config:null,

  root:null,
  titlebar:null,
  titleText:null,
  leftToggle:null,
  rightToggle:null,
  toolbarStack:null,
  floatingLayer:null,

  toolbarMap:new Map(),
  openFloating:null,

  resizeHandler:null,
  outsideHandler:null,
  keyHandler:null
};

/* ==================================================
   Utility
================================================== */

function log(){
  if(state.config && state.config.debug){
    console.log.apply(console, ["[CodexHeader]"].concat(Array.from(arguments)));
  }
}

function warn(){
  console.warn.apply(console, ["[CodexHeader]"].concat(Array.from(arguments)));
}

function getElement(target){
  if(target && typeof target === "string") return document.querySelector(target);
  if(target && target.nodeType === 1) return target;
  return null;
}

function createEl(tag, className){
  const el = document.createElement(tag);
  if(className) el.className = className;
  return el;
}

function isMobileWidth(){
  const bp = Number(state.config?.mobileBreakpoint || DEFAULT_CONFIG.mobileBreakpoint);
  return window.innerWidth <= bp;
}

function normalizeColor(color){
  const c = String(color || "dark").trim().toLowerCase();
  if(["dark","blue","red","green","yellow","purple"].includes(c)) return c;
  return "dark";
}

function playButtonSound(color){
  const c = normalizeColor(color);
  const soundName = BUTTON_SOUND_BY_COLOR[c] || BUTTON_SOUND_BY_COLOR.dark;

  if(global.GameAudioTool && typeof global.GameAudioTool.play === "function"){
    global.GameAudioTool.play(soundName);
  }
}

function stopEvent(e){
  e.preventDefault();
  e.stopPropagation();
}

function clearNode(node){
  if(node) node.innerHTML = "";
}

/* ==================================================
   Style
================================================== */

let styleInjected = false;

function injectStyle(){
  if(styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.dataset.codexHeader = "style";
  style.textContent = `
.codex-header-root{
  --codex-header-h: 66px;
  --codex-btn-radius: 8px;
  position: relative;
  z-index: 100;
}

/* ==============================
   TitleBar
============================== */

.codex-titlebar{
  height: var(--codex-header-h);
  position: sticky;
  top: 0;
  z-index: 100;

  display: grid;
  grid-template-columns: var(--codex-header-h) minmax(0,1fr) var(--codex-header-h);
  align-items: center;

  padding: 0 4px;
  border-radius: 8px;
  border: 1px solid rgba(130, 210, 255, .32);

  background:
    radial-gradient(circle at 20% 0%, rgba(80,160,255,.18), transparent 38%),
    linear-gradient(90deg, rgba(20,24,34,.96), rgba(34,39,52,.96), rgba(15,18,27,.96));

  box-shadow:
    inset 0 0 12px rgba(80, 210, 255, .14),
    inset 0 1px 0 rgba(255,255,255,.08),
    0 0 10px rgba(80, 210, 255, .20),
    0 8px 18px rgba(0,0,0,.36);

  overflow: hidden;
}

.codex-title-text{
  min-width: 0;
  padding: 0 8px;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  text-align: center;
  font-family: "Noto Sans JP", "Noto Sans TC", system-ui, sans-serif;
  font-weight: 800;
  font-size: clamp(20px, 6vw, 32px);
  color: #d8f4ff;
  text-shadow:
    1px 1px 2px #000,
    0 0 5px rgba(110,210,255,.85),
    0 0 12px rgba(90,180,255,.35);
}

.codex-title-text:focus{
  outline: none;
  text-shadow:
    1px 1px 2px #000,
    0 0 6px rgba(170,240,255,.95),
    0 0 16px rgba(120,220,255,.55);
}

.codex-title-toggle{
  aspect-ratio: 1 / 1;
  width: calc(var(--codex-header-h) - 12px);
  height: calc(var(--codex-header-h) - 12px);
  justify-self: center;
  align-self: center;

  border: none;
  background: transparent;
  color: #fff;
  font-size: calc(var(--codex-header-h) * .46);
  line-height: 1;
  cursor: pointer;

  display:flex;
  align-items:center;
  justify-content:center;

  padding: 0;
  border-radius: 999px;
  filter: drop-shadow(0 0 5px rgba(140,255,180,.35));
  transition:
    transform .18s ease,
    filter .18s ease,
    background .18s ease;
}

.codex-title-toggle:hover{
  transform: translateY(-1px) scale(1.08);
  background: rgba(120,255,180,.08);
  filter: drop-shadow(0 0 8px rgba(140,255,180,.58));
}

.codex-title-toggle:active{
  transform: translateY(1px) scale(.98);
}

/* ==============================
   Toolbar
============================== */

.codex-toolbar-stack{
  position: relative;
  z-index: 90;
}

.codex-toolbar{
  position: sticky;
  top: var(--codex-toolbar-top, var(--codex-header-h));
  z-index: 90;

  display: flex;
  align-items: center;
  gap: 6px;

  padding: 4px 8px;
  margin-top: 4px;
  border-radius: 8px;

  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;

  background:
    linear-gradient(90deg, rgba(10,20,40,.86), rgba(0,0,0,.88));

  border: 1px solid rgba(255,255,255,.12);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.06),
    0 5px 12px rgba(0,0,0,.28);

  backdrop-filter: blur(6px);
  scrollbar-width: none;
}

.codex-toolbar::-webkit-scrollbar{
  display:none;
}

.codex-toolbar[hidden]{
  display:none !important;
}

.codex-toolbar > *{
  flex: 0 0 auto;
}

/* ==============================
   Button Base
============================== */

.codex-btn{
  min-height: 32px;
  min-width: 0;

  padding: 4px 8px;
  border-radius: var(--codex-btn-radius);
  border: 1px solid rgba(255,255,255,.12);

  color: #fff;
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
  letter-spacing: .03em;

  cursor: pointer;
  user-select: none;
  appearance: none;
  -webkit-appearance: none;

  transform: translateY(0);
  transition:
    transform .13s ease,
    box-shadow .18s ease,
    filter .18s ease,
    border-color .18s ease;

  box-shadow:
    inset 0 3px 3px rgba(255,255,255,.11),
    inset 0 -9px 13px rgba(0,0,0,.20),
    0 4px 6px rgba(0,0,0,.42);

  text-shadow:
    0 1px 1px rgba(0,0,0,.8),
    0 0 5px rgba(255,255,255,.08);
}

.codex-btn:hover{
  transform: translateY(-1px);
  filter: brightness(1.11);
  box-shadow:
    inset 0 3px 3px rgba(255,255,255,.15),
    inset 0 -10px 14px rgba(0,0,0,.24),
    0 6px 8px rgba(0,0,0,.46);
}

.codex-btn:active{
  transform: translateY(1px);
  filter: brightness(.98);
  box-shadow:
    inset 0 3px 5px rgba(0,0,0,.34),
    0 2px 3px rgba(0,0,0,.28);
}

.codex-btn:focus-visible{
  outline: 2px solid rgba(120,220,255,.9);
  outline-offset: 2px;
}

.codex-btn:disabled{
  opacity:.5;
  cursor:not-allowed;
}

/* ==============================
   Button Colors
============================== */

.codex-btn-dark{
  background: linear-gradient(180deg, #303846, #151923);
  border-bottom: 2px solid #0d1017;
}

.codex-btn-blue{
  background: linear-gradient(180deg, #2457c8, #102b72);
  border-color: rgba(130,190,255,.25);
  border-bottom: 2px solid #081b55;
}

.codex-btn-red{
  background: linear-gradient(180deg, #8a242b, #3b0b10);
  border-color: rgba(255,140,150,.26);
  border-bottom: 2px solid #240308;
}

.codex-btn-green{
  background: linear-gradient(180deg, #1f7f54, #0b3825);
  border-color: rgba(120,255,185,.24);
  border-bottom: 2px solid #061f15;
}

.codex-btn-yellow{
  background: linear-gradient(180deg, #8a6a18, #3f2c05);
  border-color: rgba(255,220,100,.25);
  border-bottom: 2px solid #241801;
}

.codex-btn-purple{
  background: linear-gradient(180deg, #6840b5, #2b155e);
  border-color: rgba(200,170,255,.26);
  border-bottom: 2px solid #19083e;
}

/* ==============================
   Group Parent Button
   注意：不使用小箭頭。
============================== */

.codex-btn-group{
  position: relative;
  overflow: hidden;

  outline: 1px solid rgba(255,255,255,.13);

  box-shadow:
    inset 0 3px 3px rgba(255,255,255,.18),
    inset 0 -10px 14px rgba(0,0,0,.25),
    inset 0 0 0 1px rgba(255,255,255,.06),
    0 4px 7px rgba(0,0,0,.48);
}

.codex-btn-group::before{
  content:"";
  position:absolute;
  inset:-50%;
  background:
    linear-gradient(120deg,
      transparent 0%,
      transparent 42%,
      rgba(255,255,255,.10) 48%,
      transparent 56%,
      transparent 100%);
  transform: translateX(-28%);
  pointer-events:none;
  opacity:.7;
}

.codex-btn-group-open{
  filter: brightness(1.14);
  outline-color: rgba(180,235,255,.35);
}

/* ==============================
   Floating Layer
============================== */

.codex-floating-layer{
  position: fixed;
  inset: 0;
  z-index: 999;
  pointer-events: none;
}

.codex-floating-panel{
  position: fixed;
  min-width: 120px;
  max-width: min(260px, calc(100vw - 16px));

  display: flex;
  flex-direction: column;
  gap: 6px;

  padding: 8px;
  border-radius: 10px;

  background:
    radial-gradient(circle at top, rgba(50,70,95,.96), rgba(14,18,28,.96) 58%, rgba(5,7,12,.96));

  border: 1px solid rgba(130,210,255,.22);

  box-shadow:
    0 12px 36px rgba(0,0,0,.55),
    inset 0 1px 0 rgba(255,255,255,.08);

  pointer-events: auto;
  transform-origin: top center;
  animation: codexFloatingOpen .12s ease-out forwards;
}

@keyframes codexFloatingOpen{
  from{
    opacity:0;
    transform: translateY(-6px) scaleY(.96);
  }
  to{
    opacity:1;
    transform: translateY(0) scaleY(1);
  }
}

@media (max-width: 600px){
  .codex-header-root{
    --codex-header-h: 44px;
  }

  .codex-btn{
    min-height: 30px;
    padding: 6px 9px;
    font-size: 13px;
  }

  .codex-toolbar{
    padding: 4px 6px;
    gap: 5px;
  }
}
`;
  document.head.appendChild(style);
}

/* ==================================================
   Mount / Unmount
================================================== */

function mount(config={}){
  unmount();
  injectStyle();

  const cfg = Object.assign({}, DEFAULT_CONFIG, config || {});
  cfg.leftToggle = Object.assign({}, DEFAULT_CONFIG.leftToggle, config.leftToggle || {});
  cfg.rightToggle = Object.assign({}, DEFAULT_CONFIG.rightToggle, config.rightToggle || {});
  cfg.toolbars = Array.isArray(config.toolbars) ? config.toolbars : [];

  const target = getElement(cfg.target);
  if(!target){
    warn("找不到 target：", cfg.target);
    return null;
  }

  state.config = cfg;

  const root = createEl("div", "codex-header-root");
  const titlebar = buildTitlebar(cfg);
  const toolbarStack = createEl("div", "codex-toolbar-stack");
  const floatingLayer = createEl("div", "codex-floating-layer");

  root.appendChild(titlebar);
  root.appendChild(toolbarStack);
  root.appendChild(floatingLayer);

  state.root = root;
  state.toolbarStack = toolbarStack;
  state.floatingLayer = floatingLayer;

  target.appendChild(root);

  buildToolbars(cfg.toolbars);

  state.outsideHandler = function(e){
    if(state.openFloating){
      const panel = state.openFloating.panel;
      const button = state.openFloating.button;
      if(panel.contains(e.target) || button.contains(e.target)) return;
      closeFloatingPanel();
    }
  };

  state.keyHandler = function(e){
    if(e.key === "Escape") closeFloatingPanel();
  };

  state.resizeHandler = function(){
    closeFloatingPanel();
    rebuildResponsiveToolbars();
  };

  document.addEventListener("mousedown", state.outsideHandler, true);
  window.addEventListener("keydown", state.keyHandler);
  window.addEventListener("resize", state.resizeHandler);

  state.mounted = true;

  updateStickyOffsets();

  return api;
}

function unmount(){
  closeFloatingPanel();

  if(state.outsideHandler){
    document.removeEventListener("mousedown", state.outsideHandler, true);
  }
  if(state.keyHandler){
    window.removeEventListener("keydown", state.keyHandler);
  }
  if(state.resizeHandler){
    window.removeEventListener("resize", state.resizeHandler);
  }

  if(state.root && state.root.parentNode){
    state.root.parentNode.removeChild(state.root);
  }

  state.mounted = false;
  state.config = null;

  state.root = null;
  state.titlebar = null;
  state.titleText = null;
  state.leftToggle = null;
  state.rightToggle = null;
  state.toolbarStack = null;
  state.floatingLayer = null;

  state.toolbarMap.clear();
  state.openFloating = null;

  state.resizeHandler = null;
  state.outsideHandler = null;
  state.keyHandler = null;
}

/* ==================================================
   TitleBar
================================================== */

function buildTitlebar(cfg){
  const titlebar = createEl("div", "codex-titlebar");

  const left = createEl("button", "codex-title-toggle codex-title-toggle-left");
  left.type = "button";
  left.textContent = cfg.leftToggle.text || "🥦";
  left.title = cfg.leftToggle.title || "切換左側工具列";

  const title = createEl("div", "codex-title-text");
  title.textContent = cfg.title || DEFAULT_CONFIG.title;
  title.contentEditable = !!cfg.contentEditableTitle;

  const right = createEl("button", "codex-title-toggle codex-title-toggle-right");
  right.type = "button";
  right.textContent = cfg.rightToggle.text || "🥦";
  right.title = cfg.rightToggle.title || "切換右側工具列";

  left.addEventListener("click", function(e){
    stopEvent(e);
    toggleToolbarList(cfg.leftToggle.toolbarIds || []);
  });

  right.addEventListener("click", function(e){
    stopEvent(e);
    toggleToolbarList(cfg.rightToggle.toolbarIds || []);
  });

  titlebar.appendChild(left);
  titlebar.appendChild(title);
  titlebar.appendChild(right);

  state.titlebar = titlebar;
  state.titleText = title;
  state.leftToggle = left;
  state.rightToggle = right;

  return titlebar;
}

function setTitle(text){
  if(state.titleText){
    state.titleText.textContent = String(text || "");
  }
}

function getTitle(){
  return state.titleText ? state.titleText.textContent.trim() : "";
}

/* ==================================================
   Toolbar Build
================================================== */

function buildToolbars(toolbarConfigs){
  clearNode(state.toolbarStack);
  state.toolbarMap.clear();

  for(const tbConfig of toolbarConfigs){
    buildToolbar(tbConfig);
  }

  updateStickyOffsets();
}

function buildToolbar(tbConfig){
  const id = String(tbConfig.id || "").trim();
  if(!id){
    warn("toolbar 缺少 id。");
    return;
  }

  const toolbar = createEl("nav", "codex-toolbar");
  toolbar.dataset.codexToolbarId = id;
  toolbar.setAttribute("role", "toolbar");

  if(tbConfig.className){
    toolbar.classList.add(tbConfig.className);
  }

  const open = !!tbConfig.open;
  toolbar.hidden = !open;

  state.toolbarMap.set(id, {
    id,
    el:toolbar,
    config:tbConfig,
    open
  });

  renderToolbarButtons(toolbar, tbConfig);

  state.toolbarStack.appendChild(toolbar);
}

function renderToolbarButtons(toolbar, tbConfig){
  clearNode(toolbar);

  const buttons = Array.isArray(tbConfig.buttons) ? tbConfig.buttons : [];

  for(const btnConfig of buttons){
    if(btnConfig && btnConfig.type === "group"){
      renderGroupButton(toolbar, btnConfig);
    }else{
      toolbar.appendChild(createButton(btnConfig));
    }
  }
}

function rebuildResponsiveToolbars(){
  if(!state.config) return;

  for(const item of state.toolbarMap.values()){
    renderToolbarButtons(item.el, item.config);
  }
}

/* ==================================================
   Button Build
================================================== */

function createButton(btnConfig={}){
  const color = normalizeColor(btnConfig.color);

  const btn = createEl("button", "codex-btn codex-btn-" + color);
  btn.type = "button";
  btn.dataset.codexButtonId = btnConfig.id || "";
  btn.textContent = btnConfig.text || btnConfig.id || "Button";

  if(btnConfig.title) btn.title = btnConfig.title;
  if(btnConfig.disabled) btn.disabled = true;

  if(btnConfig.textColor){
    btn.style.color = btnConfig.textColor;
  }

  if(btnConfig.background){
    btn.style.background = btnConfig.background;
  }

  btn.addEventListener("click", function(e){
    stopEvent(e);
    if(btn.disabled) return;

    playButtonSound(color);

    if(typeof btnConfig.onClick === "function"){
      btnConfig.onClick(e, btnConfig);
    }
  });

  return btn;
}

function renderGroupButton(toolbar, groupConfig){
  const displayMode = groupConfig.displayMode || "alwaysGroup";

  if(displayMode === "responsive" && !isMobileWidth()){
    const children = Array.isArray(groupConfig.children) ? groupConfig.children : [];
    for(const child of children){
      toolbar.appendChild(createButton(child));
    }
    return;
  }

  toolbar.appendChild(createGroupParentButton(groupConfig));
}

function createGroupParentButton(groupConfig){
  const color = normalizeColor(groupConfig.color);

  const btn = createEl("button", "codex-btn codex-btn-" + color + " codex-btn-group");
  btn.type = "button";
  btn.dataset.codexButtonId = groupConfig.id || "";
  btn.textContent = groupConfig.text || groupConfig.id || "Group";

  if(groupConfig.title) btn.title = groupConfig.title;

  btn.addEventListener("click", function(e){
    stopEvent(e);
    playButtonSound(color);
    toggleGroupPanel(btn, groupConfig);
  });

  return btn;
}

/* ==================================================
   Floating Panel
================================================== */

function toggleGroupPanel(button, groupConfig){
  if(state.openFloating && state.openFloating.button === button){
    closeFloatingPanel();
    return;
  }

  closeFloatingPanel();
  openGroupPanel(button, groupConfig);
}

function openGroupPanel(button, groupConfig){
  if(!state.floatingLayer) return;

  const panel = createEl("div", "codex-floating-panel");
  panel.dataset.codexGroupId = groupConfig.id || "";

  const children = Array.isArray(groupConfig.children) ? groupConfig.children : [];
  const closeMode = groupConfig.closeMode || "autoClose";

  for(const child of children){
    const childBtn = createButton(Object.assign({}, child, {
      onClick:function(e, cfg){
        if(typeof child.onClick === "function"){
          child.onClick(e, cfg);
        }

        if(closeMode === "autoClose"){
          closeFloatingPanel();
        }
      }
    }));
    panel.appendChild(childBtn);
  }

  state.floatingLayer.appendChild(panel);

  const rect = button.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  let left = rect.left;
  let top = rect.bottom + 6;

  const margin = 8;
  if(left + panelRect.width > window.innerWidth - margin){
    left = window.innerWidth - panelRect.width - margin;
  }
  if(left < margin) left = margin;

  if(top + panelRect.height > window.innerHeight - margin){
    top = Math.max(margin, rect.top - panelRect.height - 6);
    panel.style.transformOrigin = "bottom center";
  }else{
    panel.style.transformOrigin = "top center";
  }

  panel.style.left = Math.round(left) + "px";
  panel.style.top = Math.round(top) + "px";

  button.classList.add("codex-btn-group-open");

  state.openFloating = {
    button,
    panel,
    groupConfig
  };
}

function closeFloatingPanel(){
  if(!state.openFloating) return;

  const {button, panel} = state.openFloating;

  if(button){
    button.classList.remove("codex-btn-group-open");
  }

  if(panel && panel.parentNode){
    panel.parentNode.removeChild(panel);
  }

  state.openFloating = null;
}

/* ==================================================
   Toolbar State
================================================== */

function setToolbarOpen(toolbarId, open){
  const item = state.toolbarMap.get(toolbarId);
  if(!item) return false;

  item.open = !!open;
  item.el.hidden = !item.open;

  if(!item.open){
    closeFloatingPanel();
  }

  updateStickyOffsets();
  return true;
}

function toggleToolbar(toolbarId){
  const item = state.toolbarMap.get(toolbarId);
  if(!item) return false;
  return setToolbarOpen(toolbarId, !item.open);
}

function openToolbar(toolbarId){
  return setToolbarOpen(toolbarId, true);
}

function closeToolbar(toolbarId){
  return setToolbarOpen(toolbarId, false);
}

function closeAllToolbars(){
  for(const item of state.toolbarMap.values()){
    setToolbarOpen(item.id, false);
  }
}

function toggleToolbarList(toolbarIds){
  const ids = Array.isArray(toolbarIds) ? toolbarIds : [];
  if(ids.length === 0) return;

  const anyClosed = ids.some(id => {
    const item = state.toolbarMap.get(id);
    return item && !item.open;
  });

  for(const id of ids){
    setToolbarOpen(id, anyClosed);
  }
}

/* ==================================================
   Sticky Offset
   --------------------------------------------------
   目前先讓每條 toolbar 預設吸在 titlebar 下方。
   若未來需要多條 toolbar 逐層堆疊，可在這裡擴充。
================================================== */

function updateStickyOffsets(){
  if(!state.root || !state.titlebar) return;

  const headerH = state.titlebar.offsetHeight || 66;
  state.root.style.setProperty("--codex-header-h", headerH + "px");

  for(const item of state.toolbarMap.values()){
    item.el.style.setProperty("--codex-toolbar-top", headerH + "px");
  }
}

/* ==================================================
   State
================================================== */

function getState(){
  const toolbars = {};

  for(const [id, item] of state.toolbarMap.entries()){
    toolbars[id] = {
      open:item.open
    };
  }

  return {
    mounted:state.mounted,
    title:getTitle(),
    toolbars,
    floatingOpen:!!state.openFloating
  };
}

/* ==================================================
   Public API
================================================== */

const api = {
  mount,
  unmount,

  setToolbarOpen,
  toggleToolbar,
  openToolbar,
  closeToolbar,
  closeAllToolbars,

  closeFloatingPanel,

  setTitle,
  getTitle,
  getState,

  soundMap:BUTTON_SOUND_BY_COLOR
};

global.CodexHeader = api;

})(window);
