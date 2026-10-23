/*
==================================================
SKYK BottomBar
版本：v3.2d mobile-switch-slot-fix
==================================================
責任：
- 建立底部 / 側邊按鈕列 UI
- 手機：底部橫列
- PC：左側垂直列
- 建立左下固定切頁按鈕
- 建立快速按鈕區
- 管理 hold / active 外觀狀態
- 對外發出快速按鈕 index 事件

不負責：
- 切頁展開效果
- 讀取切頁 mapping
- 執行頁面功能
- 判斷快速按鈕 mode
==================================================
*/
(function(global){
"use strict";

const DEFAULT_OPTIONS = {
  mountTarget:"#stage",
  theme:"techBlue",

  buttonHeightMobilePx:91,
  buttonHeightPcRate:0.15,

  peekRate:0.475,
  activeRate:0.95,
  buryRate:0.05,

  switchButtonMobileWidthPercent:18,

  pcSideButtonRatio:2.1,
  pcSideGapRate:0.025,

  iconFolder:"【崩界櫻雪】GameSystem/Picture/IconImage",

  systemSwitch:{
    icon:"menu",
    label:"系統"
  },

  quickButtons:[],
  onQuickPress:null,
  onSystemSwitch:null
};

const THEMES = {
  techBlue:{
    switchBg:"linear-gradient(180deg, rgba(40,95,135,.96), rgba(10,30,48,.98))",
    switchBorder:"rgba(130,220,255,.72)",
    switchGlow:"rgba(80,200,255,.36)",
    quickBg:"linear-gradient(180deg, rgba(30,68,98,.94), rgba(9,24,42,.98))",
    quickBorder:"rgba(120,205,255,.54)",
    quickGlow:"rgba(70,180,255,.26)",
    text:"#ffffff",
    subText:"#d8f2ff",
    activeFilter:"brightness(1.18)",
    pressingFilter:"brightness(1.25)"
  },
  nightPink:{
    switchBg:"linear-gradient(180deg, rgba(105,45,88,.96), rgba(40,12,32,.98))",
    switchBorder:"rgba(255,175,225,.70)",
    switchGlow:"rgba(255,125,205,.32)",
    quickBg:"linear-gradient(180deg, rgba(82,34,68,.94), rgba(30,8,28,.98))",
    quickBorder:"rgba(255,175,225,.50)",
    quickGlow:"rgba(255,125,205,.22)",
    text:"#fff5fb",
    subText:"#ffd8ef",
    activeFilter:"brightness(1.18)",
    pressingFilter:"brightness(1.25)"
  },
  green:{
    switchBg:"linear-gradient(180deg, rgba(42,110,70,.96), rgba(8,38,24,.98))",
    switchBorder:"rgba(132,255,185,.68)",
    switchGlow:"rgba(90,255,170,.28)",
    quickBg:"linear-gradient(180deg, rgba(32,82,56,.94), rgba(8,32,22,.98))",
    quickBorder:"rgba(132,255,185,.48)",
    quickGlow:"rgba(90,255,170,.20)",
    text:"#f3fff8",
    subText:"#d5ffe6",
    activeFilter:"brightness(1.18)",
    pressingFilter:"brightness(1.25)"
  },
  yellow:{
    switchBg:"linear-gradient(180deg, rgba(132,112,34,.96), rgba(54,42,7,.98))",
    switchBorder:"rgba(255,226,116,.72)",
    switchGlow:"rgba(255,214,78,.34)",
    quickBg:"linear-gradient(180deg, rgba(110,92,28,.95), rgba(42,32,7,.98))",
    quickBorder:"rgba(255,226,116,.55)",
    quickGlow:"rgba(255,214,78,.24)",
    text:"#fffbea",
    subText:"#fff2bd",
    activeFilter:"brightness(1.18)",
    pressingFilter:"brightness(1.25)"
  },
  aurora:{
    switchBg:"linear-gradient(180deg, rgba(42,94,122,.96), rgba(55,22,82,.98))",
    switchBorder:"rgba(150,236,255,.72)",
    switchGlow:"rgba(120,220,255,.28)",
    quickBg:"linear-gradient(180deg, rgba(34,76,100,.95), rgba(42,18,68,.98))",
    quickBorder:"rgba(174,202,255,.56)",
    quickGlow:"rgba(138,164,255,.24)",
    text:"#f7fbff",
    subText:"#e7efff",
    activeFilter:"brightness(1.18)",
    pressingFilter:"brightness(1.25)"
  }
};


const SYSTEM_PAGE_MAPPING = [
  { label:"主頁",   link:{ file:"Game home page.html" } },
  { label:"後勤",   link:{ file:"Base_System.html" } },
  { label:"小遊戲", link:{ file:"MiniGame_Hub.html" } },
  { label:"LOVE",   link:{ file:"Love_System.html" } },
  { label:"多菜國", link:{ file:"Language_System.html" } },
  { label:"保留",   link:{ file:"Reserved_Page.html" } }
];

function getCurrentFile(){
  return decodeURIComponent(
    (location.pathname.split("/").pop()) || ""
  );
}

function buildSystemButtons(){
  const currentFile = getCurrentFile();

  return SYSTEM_PAGE_MAPPING.map(item=>({
    label:item.label,
    link:item.link,
    isCurrent:item.link.file === currentFile
  }));
}


let styleInjected = false;
let runtime = {
  mounted:false,
  root:null,
  target:null,
  options:null,
  activeIndex:null,
  resizeObserver:null
};

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function getTarget(target){
  if(target && typeof target === "string") return document.querySelector(target);
  if(target && target.nodeType === 1) return target;
  return document.querySelector(DEFAULT_OPTIONS.mountTarget);
}

function getTheme(name){
  return THEMES[name] || THEMES.techBlue;
}

function injectStyle(){
  if(styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.dataset.skykBottomBar = "style";
  style.textContent = `
.skyk-bottomBar,
.skyk-bottomBar *{
  box-sizing:border-box;
}

.skyk-bottomBar{
  --skyk-bottomBar-btn-height:91px;
  --skyk-bottomBar-btn-width:100px;

  --skyk-bottomBar-visible-height:43.225px;
  --skyk-bottomBar-rest-hidden:47.775px;
  --skyk-bottomBar-active-hidden:4.55px;

  --skyk-bottomBar-visible-width:100px;
  --skyk-bottomBar-rest-left:-52.5px;
  --skyk-bottomBar-active-left:-5px;

  --skyk-bottomBar-switch-width-mobile:18%;
  --skyk-bottomBar-pc-gap:2px;

  --skyk-bottomBar-radius:16px;
  --skyk-bottomBar-border-size:1px;
  --skyk-bottomBar-shadow-size:13px;

  --skyk-bottomBar-switch-bg:linear-gradient(180deg, rgba(40,95,135,.96), rgba(10,30,48,.98));
  --skyk-bottomBar-switch-border:rgba(130,220,255,.72);
  --skyk-bottomBar-switch-glow:rgba(80,200,255,.36);

  --skyk-bottomBar-quick-bg:linear-gradient(180deg, rgba(30,68,98,.94), rgba(9,24,42,.98));
  --skyk-bottomBar-quick-border:rgba(120,205,255,.54);
  --skyk-bottomBar-quick-glow:rgba(70,180,255,.26);

  --skyk-bottomBar-text:#fff;
  --skyk-bottomBar-subText:#d8f2ff;
  --skyk-bottomBar-active-filter:brightness(1.18);
  --skyk-bottomBar-pressing-filter:brightness(1.25);

  position:absolute;
  z-index:40;
  overflow:visible;
  pointer-events:none;
  font-family:"Segoe UI","Microsoft JhengHei",sans-serif;
}

.skyk-bottomBar[data-layout="mobile"]{
  left:0;
  right:0;
  bottom:0;
  height:var(--skyk-bottomBar-visible-height);
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-switchSlot,
.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-quickArea{
  position:absolute;
  bottom:0;
  height:var(--skyk-bottomBar-visible-height);
  overflow:visible;
  pointer-events:auto;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-switchSlot{
  left:0;
  width:var(--skyk-bottomBar-switch-width-mobile);
  display:flex;
  align-items:flex-end;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-quickArea{
  left:var(--skyk-bottomBar-switch-width-mobile);
  right:0;
  display:flex;
  align-items:flex-end;
  gap:0;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-btn{
  position:relative;
  height:var(--skyk-bottomBar-btn-height);
  min-width:0;
  bottom:calc(-1 * var(--skyk-bottomBar-rest-hidden));
  border:0;
  padding:0;
  margin:0;
  appearance:none;
  -webkit-appearance:none;
  background:transparent;
  color:var(--skyk-bottomBar-text);
  cursor:pointer;
  user-select:none;
  overflow:visible;
  font:inherit;
  transition:
    bottom .14s cubic-bezier(.18,.88,.28,1.08),
    filter .12s ease;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-btn.is-active,
.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-btn.is-pressing{
  bottom:calc(-1 * var(--skyk-bottomBar-active-hidden));
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-switchBtn{
  width:100%;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-quickBtn{
  flex:1 1 0;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-box{
  left:1%;
  right:1%;
  top:0;
  bottom:0;
  flex-direction:column;
  border-radius:
    var(--skyk-bottomBar-radius)
    var(--skyk-bottomBar-radius)
    0
    0;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-iconZone{
  flex:0 0 47.5%;
  padding:8% 12% 8%;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-labelZone{
  flex:0 0 47.5%;
  padding:5% 8% 7%;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-buryZone{
  flex:0 0 5%;
}

.skyk-bottomBar[data-layout="pc"]{
  left:0;
  bottom:0;
  width:var(--skyk-bottomBar-visible-width);
  height:auto;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-switchSlot,
.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-quickArea{
  position:absolute;
  left:0;
  width:var(--skyk-bottomBar-visible-width);
  overflow:visible;
  pointer-events:auto;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-switchSlot{
  bottom:0;
  height:var(--skyk-bottomBar-btn-height);
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-quickArea{
  bottom:calc(var(--skyk-bottomBar-btn-height) + var(--skyk-bottomBar-pc-gap));
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:var(--skyk-bottomBar-pc-gap);
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-btn{
  position:relative;
  width:var(--skyk-bottomBar-btn-width);
  height:var(--skyk-bottomBar-btn-height);
  left:var(--skyk-bottomBar-rest-left);
  border:0;
  padding:0;
  margin:0;
  appearance:none;
  -webkit-appearance:none;
  background:transparent;
  color:var(--skyk-bottomBar-text);
  cursor:pointer;
  user-select:none;
  overflow:visible;
  font:inherit;
  transition:
    left .14s cubic-bezier(.18,.88,.28,1.08),
    filter .12s ease;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-btn.is-active,
.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-btn.is-pressing{
  left:var(--skyk-bottomBar-active-left);
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-box{
  left:0;
  right:0;
  top:2%;
  bottom:2%;
  flex-direction:row;
  border-radius:
    0
    var(--skyk-bottomBar-radius)
    var(--skyk-bottomBar-radius)
    0;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-labelZone{
  order:1;
  flex:0 0 47.5%;
  padding:7% 5% 7% 8%;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-iconZone{
  order:2;
  flex:0 0 47.5%;
  padding:8% 8% 8% 5%;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-buryZone{
  order:0;
  flex:0 0 5%;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-label{
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:0;
  width:100%;
  height:100%;
  white-space:normal;
}

.skyk-bottomBar[data-layout="pc"] .skyk-bottomBar-labelChar{
  display:block;
  line-height:1.08;
}

.skyk-bottomBar[data-layout="mobile"] .skyk-bottomBar-labelChar{
  display:inline;
}

.skyk-bottomBar-btn.is-active .skyk-bottomBar-box{
  filter:var(--skyk-bottomBar-active-filter);
}

.skyk-bottomBar-btn.is-pressing .skyk-bottomBar-box{
  filter:var(--skyk-bottomBar-pressing-filter);
}

.skyk-bottomBar-box{
  position:absolute;
  overflow:hidden;

  border:var(--skyk-bottomBar-border-size) solid var(--skyk-bottomBar-quick-border);
  background:var(--skyk-bottomBar-quick-bg);

  box-shadow:
    inset 0 0 calc(var(--skyk-bottomBar-shadow-size) * 0.55) var(--skyk-bottomBar-quick-glow),
    inset 0 0 calc(var(--skyk-bottomBar-shadow-size) * 0.35) rgba(255,255,255,.06),
    0 calc(var(--skyk-bottomBar-shadow-size) * -0.10)
      calc(var(--skyk-bottomBar-shadow-size) * 0.28)
      rgba(0,0,0,.30);

  display:flex;
  isolation:isolate;
}

.skyk-bottomBar-switchBtn .skyk-bottomBar-box{
  border-color:var(--skyk-bottomBar-switch-border);
  background:var(--skyk-bottomBar-switch-bg);
  box-shadow:
    inset 0 0 calc(var(--skyk-bottomBar-shadow-size) * 0.65) var(--skyk-bottomBar-switch-glow),
    inset 0 0 calc(var(--skyk-bottomBar-shadow-size) * 0.40) rgba(255,255,255,.07),
    0 calc(var(--skyk-bottomBar-shadow-size) * -0.10)
      calc(var(--skyk-bottomBar-shadow-size) * 0.30)
      rgba(0,0,0,.32);
}

.skyk-bottomBar-iconZone,
.skyk-bottomBar-labelZone,
.skyk-bottomBar-buryZone{
  position:relative;
  min-width:0;
  min-height:0;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
}

.skyk-bottomBar-icon{
  display:block;
  width:100%;
  height:100%;
  object-fit:contain;
  filter:drop-shadow(0 2px 3px rgba(0,0,0,.72));
}

.skyk-bottomBar-label{
  display:block;
  max-width:100%;
  max-height:100%;
  min-width:0;
  color:var(--skyk-bottomBar-subText);
  font-size:var(--skyk-bottomBar-label-font-size, 12px);
  line-height:1;
  font-weight:950;
  white-space:nowrap;
  text-align:center;
  overflow:hidden;
  text-shadow:
    0 2px 4px rgba(0,0,0,.90),
    0 0 8px var(--skyk-bottomBar-quick-glow);
}

.skyk-bottomBar-switchBtn .skyk-bottomBar-label{
  text-shadow:
    0 2px 4px rgba(0,0,0,.90),
    0 0 8px var(--skyk-bottomBar-switch-glow);
}
`;
  document.head.appendChild(style);
}

function applyThemeVars(root, themeName){
  const theme = getTheme(themeName);
  root.style.setProperty("--skyk-bottomBar-switch-bg", theme.switchBg);
  root.style.setProperty("--skyk-bottomBar-switch-border", theme.switchBorder);
  root.style.setProperty("--skyk-bottomBar-switch-glow", theme.switchGlow);
  root.style.setProperty("--skyk-bottomBar-quick-bg", theme.quickBg);
  root.style.setProperty("--skyk-bottomBar-quick-border", theme.quickBorder);
  root.style.setProperty("--skyk-bottomBar-quick-glow", theme.quickGlow);
  root.style.setProperty("--skyk-bottomBar-text", theme.text);
  root.style.setProperty("--skyk-bottomBar-subText", theme.subText);
  root.style.setProperty("--skyk-bottomBar-active-filter", theme.activeFilter);
  root.style.setProperty("--skyk-bottomBar-pressing-filter", theme.pressingFilter);
}

function applyIcon(img, iconName, folder){
  if(!img) return;

  if(global.GameImageTool && typeof global.GameImageTool.applyImage === "function"){
    global.GameImageTool.applyImage(img, iconName, { folder });
    return;
  }

  img.src = String(folder || "Picture/IconImage").replace(/\/$/, "") + "/" + iconName + ".png";
}

function renderLabelChars(label, text){
  label.innerHTML = "";
  const chars = Array.from(String(text || ""));

  if(chars.length === 0){
    return;
  }

  chars.forEach(char=>{
    const span = document.createElement("span");
    span.className = "skyk-bottomBar-labelChar";
    span.textContent = char;
    label.appendChild(span);
  });
}

function createButton(buttonData, className, index, options){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skyk-bottomBar-btn " + className;
  button.dataset.index = String(index || 0);

  const box = document.createElement("div");
  box.className = "skyk-bottomBar-box";

  const iconZone = document.createElement("div");
  iconZone.className = "skyk-bottomBar-iconZone";

  const img = document.createElement("img");
  img.className = "skyk-bottomBar-icon";
  img.alt = buttonData.label || buttonData.icon || "";

  if(buttonData.icon){
    applyIcon(img, buttonData.icon, buttonData.folder || options.iconFolder);
  }

  const labelZone = document.createElement("div");
  labelZone.className = "skyk-bottomBar-labelZone";

  const label = document.createElement("div");
  label.className = "skyk-bottomBar-label";

  const labelText = String(buttonData.label || "");
  label.dataset.labelText = labelText;
  renderLabelChars(label, labelText);

  const buryZone = document.createElement("div");
  buryZone.className = "skyk-bottomBar-buryZone";

  iconZone.appendChild(img);
  labelZone.appendChild(label);
  box.append(iconZone, labelZone, buryZone);
  button.appendChild(box);

  bindPressingState(button);

  return button;
}

function bindPressingState(button){
  function onDown(){ button.classList.add("is-pressing"); }
  function onUp(){ button.classList.remove("is-pressing"); }

  button.addEventListener("pointerdown", onDown);
  button.addEventListener("pointerup", onUp);
  button.addEventListener("pointercancel", onUp);
  button.addEventListener("pointerleave", onUp);
}

function isPcLayout(){
  return global.matchMedia("(orientation: landscape) and (min-width: 500px)").matches;
}

function updateMetrics(){
  if(!runtime.root || !runtime.target || !runtime.options) return;

  const opts = runtime.options;
  const targetHeight = runtime.target.clientHeight || global.innerHeight || 1;

  const layout = isPcLayout() ? "pc" : "mobile";
  runtime.root.dataset.layout = layout;

  const peekRate = Number(opts.peekRate || DEFAULT_OPTIONS.peekRate);
  const activeRate = Number(opts.activeRate || DEFAULT_OPTIONS.activeRate);

  if(layout === "pc"){
    const buttonHeight = Math.max(1, targetHeight * Number(opts.buttonHeightPcRate || DEFAULT_OPTIONS.buttonHeightPcRate));
    const buttonWidth = buttonHeight * Number(opts.pcSideButtonRatio || DEFAULT_OPTIONS.pcSideButtonRatio);

    const visibleWidth = buttonWidth * peekRate;
    const restLeft = -(buttonWidth * (1 - peekRate));
    const activeLeft = -(buttonWidth * (1 - activeRate));
    const gap = buttonHeight * Number(opts.pcSideGapRate || DEFAULT_OPTIONS.pcSideGapRate);

    runtime.root.style.setProperty("--skyk-bottomBar-btn-height", buttonHeight + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-btn-width", buttonWidth + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-visible-width", visibleWidth + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-rest-left", restLeft + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-active-left", activeLeft + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-pc-gap", gap + "px");

    runtime.root.style.setProperty("--skyk-bottomBar-radius", (buttonHeight * 0.22) + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-border-size", Math.max(1, buttonHeight * 0.015) + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-shadow-size", (buttonHeight * 0.16) + "px");
  }else{
    const buttonHeight = Math.max(1, Number(opts.buttonHeightMobilePx || DEFAULT_OPTIONS.buttonHeightMobilePx));
    const visibleHeight = buttonHeight * peekRate;
    const restHidden = buttonHeight * (1 - peekRate);
    const activeHidden = buttonHeight * (1 - activeRate);

    runtime.root.style.setProperty("--skyk-bottomBar-btn-height", buttonHeight + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-visible-height", visibleHeight + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-rest-hidden", restHidden + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-active-hidden", activeHidden + "px");

    runtime.root.style.setProperty("--skyk-bottomBar-switch-width-mobile", opts.switchButtonMobileWidthPercent + "%");

    runtime.root.style.setProperty("--skyk-bottomBar-radius", Math.max(8, buttonHeight * 0.18) + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-border-size", Math.max(1, buttonHeight * 0.012) + "px");
    runtime.root.style.setProperty("--skyk-bottomBar-shadow-size", Math.max(8, buttonHeight * 0.14) + "px");
  }

  requestAnimationFrame(fitLabels);
}

function fitLabels(){
  if(!runtime.root) return;

  runtime.root.querySelectorAll(".skyk-bottomBar-label").forEach(label=>{
    const zone = label.parentElement;
    if(!zone) return;

    const zoneRect = zone.getBoundingClientRect();
    const text = label.textContent || "";
    const count = Math.max(1, text.length);

    const isPc = runtime.root.dataset.layout === "pc";
    let fontSize;

    if(isPc){
      const heightBased = (zoneRect.height * 0.64) / count;
      const widthBased = zoneRect.width * 0.60;
      fontSize = Math.max(0.1, Math.min(heightBased, widthBased));
    }else{
      const heightBased = zoneRect.height * 0.74;
      const widthBased = zoneRect.width / (count * 0.62);
      fontSize = Math.max(0.1, Math.min(heightBased, widthBased));
    }

    label.style.setProperty("--skyk-bottomBar-label-font-size", fontSize + "px");
  });
}

function mount(options={}){
  injectStyle();

  if(runtime.mounted){
    unmount();
  }

  const opts = Object.assign({}, clone(DEFAULT_OPTIONS), options || {});
  const target = getTarget(opts.mountTarget);
  if(!target) throw new Error("找不到 SKYKBottomBar mountTarget。");

  const root = document.createElement("div");
  root.className = "skyk-bottomBar";
  root.dataset.theme = opts.theme;

  applyThemeVars(root, opts.theme);

  const switchSlot = document.createElement("div");
  switchSlot.className = "skyk-bottomBar-switchSlot";

  const switchBtn = createButton(
    opts.systemSwitch || DEFAULT_OPTIONS.systemSwitch,
    "skyk-bottomBar-switchBtn",
    0,
    opts
  );

  switchBtn.addEventListener("click", event=>{
    event.preventDefault();

    if(typeof opts.onSystemSwitch === "function"){
      opts.onSystemSwitch();
      return;
    }

    if(global.SKYKExpandButtonPanel && typeof global.SKYKExpandButtonPanel.open === "function"){
      const switchIcon = switchBtn.querySelector(".skyk-bottomBar-icon");

      global.SKYKExpandButtonPanel.open({
        sourceElement:switchIcon || switchBtn,
        layout:"layout6",
        buttons:buildSystemButtons()
      });
      return;
    }

    console.warn("[SKYKBottomBar] 找不到 SKYKExpandButtonPanel。");
  });

  switchSlot.appendChild(switchBtn);

  const quickArea = document.createElement("div");
  quickArea.className = "skyk-bottomBar-quickArea";

  (opts.quickButtons || []).forEach((buttonData, index)=>{
    const quickBtn = createButton(
      buttonData || {},
      "skyk-bottomBar-quickBtn",
      index + 1,
      opts
    );

    quickBtn.addEventListener("click", event=>{
      event.preventDefault();
      if(typeof opts.onQuickPress === "function"){
        opts.onQuickPress(index + 1, buttonData || {});
      }
    });

    quickArea.appendChild(quickBtn);
  });

  root.append(switchSlot, quickArea);
  target.appendChild(root);

  runtime = {
    mounted:true,
    root,
    target,
    options:opts,
    activeIndex:null,
    resizeObserver:null
  };

  updateMetrics();

  if(typeof ResizeObserver !== "undefined"){
    runtime.resizeObserver = new ResizeObserver(updateMetrics);
    runtime.resizeObserver.observe(target);
  }

  global.addEventListener("resize", updateMetrics);

  return api;
}

function unmount(){
  global.removeEventListener("resize", updateMetrics);

  if(runtime.resizeObserver){
    runtime.resizeObserver.disconnect();
  }

  if(runtime.root && runtime.root.parentNode){
    runtime.root.parentNode.removeChild(runtime.root);
  }

  runtime = {
    mounted:false,
    root:null,
    target:null,
    options:null,
    activeIndex:null,
    resizeObserver:null
  };
}

function setActive(index){
  if(!runtime.root) return;

  clearActive();

  const safeIndex = Number(index);
  if(!Number.isFinite(safeIndex) || safeIndex <= 0) return;

  const selector = '.skyk-bottomBar-quickBtn[data-index="' + safeIndex + '"]';
  const button = runtime.root.querySelector(selector);
  if(!button) return;

  button.classList.add("is-active");
  runtime.activeIndex = safeIndex;
}

function clearActive(){
  if(!runtime.root) return;

  runtime.root.querySelectorAll(".skyk-bottomBar-quickBtn.is-active").forEach(button=>{
    button.classList.remove("is-active");
  });

  runtime.activeIndex = null;
}

function getActive(){
  return runtime.activeIndex;
}

function setTheme(themeName){
  if(!runtime.root) return;
  runtime.options.theme = themeName;
  runtime.root.dataset.theme = themeName;
  applyThemeVars(runtime.root, themeName);
}

const api = {
  mount,
  unmount,
  setActive,
  clearActive,
  getActive,
  setTheme,
  updateMetrics
};

global.SKYKBottomBar = api;

})(window);
