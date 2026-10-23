/*
==================================================
SKYK Navigation
版本：v1.0.0 ghost-back-button
==================================================

用途：
- 提供 SKYK / Codex 系列頁面的自製返回系統。
- 不使用瀏覽器 history.back()。
- 使用 sessionStorage 建立「本分頁專屬導航堆疊」。
- 提供手機友善的幽靈 ⬅️ 返回按鈕。
- 返回時會觸發 SKYKHexTransition 的禮貌離場轉場。

核心概念：
- sessionStorage 是每個分頁獨立的臨時倉庫。
- 導航 stack 只在本分頁生命週期內存在。
- 關閉分頁後，導航記錄自然消失。
- 按下本插件的 ⬅️ 返回，其實不是瀏覽器上一頁，而是：
  1. pop 一筆 SKYK_NAV_STACK
  2. 跑 quick leave 轉場
  3. location.replace(previousUrl)

重要設計：
- 沒有「下一頁」功能。
- 這不是瀏覽器歷史系統。
- 這是「回到來源目錄 / 來源頁面」的導航堆疊。
- 正規連結跳轉時 pushCurrent()。
- 返回時 pop()。
- 使用 location.replace()，避免把返回本身再塞進瀏覽器歷史。

--------------------------------------------------
基本掛載方式
--------------------------------------------------

請先載入：

<script src="【崩界櫻雪】Assets/Plugin/SKYKHexTransition.js"></script>
<script src="【崩界櫻雪】Assets/Plugin/SKYKNavigation.js"></script>

然後在頁面初始化時：

SKYKNavigation.mount();

這樣會自動：
- 監聽本頁所有 <a> 連結
- 正規點擊連結時 push 目前完整網址
- 執行 SKYKHexTransition.leave({ preset:"quick" })
- 跳轉到連結
- 有導航歷史時顯示幽靈 ⬅️ 返回按鈕
- 點擊幽靈按鈕第一次現身，第二次返回

--------------------------------------------------
幽靈返回按鈕 UX
--------------------------------------------------

顯示條件：
- stack.length > 0 才存在。
- 沒有歷史時不顯示。

隱身態：
- 透明度極低。
- 固定在手機左下角。
- 仍可點擊喚醒。
- 可拖曳移動位置。
- 位置不保存，重新載入頁面回預設位置。

現身態：
- 第一次點擊時現身。
- 放大並左右搖晃。
- 停留 activeMs，預設 2000ms。
- 現身期間再點一次才觸發返回。
- 若時間到再次隱身，需要重新點一次喚醒。

拖曳：
- 隱身態 / 現身態都可以拖曳。
- 拖曳不會記錄位置。
- 會限制在畫面內，不讓按鈕完全甩出畫面。

--------------------------------------------------
LinkAdapter 規則
--------------------------------------------------

本插件會攔截符合條件的 <a>：

會攔截：
- target 沒寫
- target="_self"
- 同 origin 連結

不攔截：
- data-no-navigation
- data-no-transition
- target="_blank" 等非 _self
- download
- href="#"
- javascript:
- mailto:
- tel:
- 外部網域

可排除某條連結：

<a href="xxx.html" data-no-navigation>不進導航堆疊</a>

或：

<a href="xxx.html" data-no-transition>不跑轉場</a>

--------------------------------------------------
與 SKYKHexTransition 的關係
--------------------------------------------------

SKYKNavigation 不負責動畫本體。
它只在需要離場時呼叫：

SKYKHexTransition.leave({
  preset:"quick",
  mountTarget:".Stage"
});

若 SKYKHexTransition 不存在：
- 仍然可以導航。
- 只是沒有禮貌離場動畫。

--------------------------------------------------
常用 API
--------------------------------------------------

SKYKNavigation.mount(options)
SKYKNavigation.unmount()
SKYKNavigation.pushCurrent()
SKYKNavigation.back()
SKYKNavigation.peek()
SKYKNavigation.getStack()
SKYKNavigation.clear()
SKYKNavigation.refreshButton()

--------------------------------------------------
mount options
--------------------------------------------------

SKYKNavigation.mount({
  storageKey:"SKYK_NAV_STACK",
  buttonText:"⬅️",
  mountTarget:".Stage",
  transitionPreset:"quick",
  activeMs:2000,
  zIndex:180,
  bottom:"18px",
  left:"10px",
  debug:false
});

zIndex 注意：
- 本按鈕不應蓋過轉場。
- SKYKHexTransition 通常是 z-index:9610。
- 本按鈕預設 z-index:9490，避免轉場中還浮在上面。

==================================================
*/

(function(global){
"use strict";

const DEFAULT_CONFIG = {
  storageKey:"SKYK_NAV_STACK",
  buttonText:"⬅️",
  buttonTitle:"返回上一層",

  enableTransition:true,
  transitionPreset:"quick",
  mountTarget:".Stage",

  linkSelector:"a",
  sameOrigin:true,
  excludeSelector:"[data-no-navigation],[data-no-transition]",

  activeMs:2000,
  zIndex:180,
  size:58,
  hitSize:76,
  left:"10px",
  bottom:"18px",

  hiddenOpacity:0.10,
  activeOpacity:0.88,
  activeScale:1.14,
  minVisibleRatio:0.35,

  debug:false
};

let styleInjected = false;

const state = {
  mounted:false,
  config:null,
  button:null,
  buttonTimer:null,
  armed:false,
  linkHandler:null,
  pointer:{
    active:false,
    moved:false,
    startX:0,
    startY:0,
    originX:0,
    originY:0,
    pointerId:null
  }
};

function log(){
  if(state.config && state.config.debug){
    console.log.apply(console, ["[SKYKNavigation]"].concat(Array.from(arguments)));
  }
}

function getConfig(){
  return state.config || DEFAULT_CONFIG;
}

function getCurrentCleanUrl(){
  return global.location.href;
}

function getStorageKey(){
  return getConfig().storageKey || DEFAULT_CONFIG.storageKey;
}

function readStack(){
  try{
    const raw = global.sessionStorage.getItem(getStorageKey());
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(Boolean).map(String) : [];
  }catch(error){
    console.warn("[SKYKNavigation] 讀取 sessionStorage 失敗：", error);
    return [];
  }
}

function writeStack(stack){
  try{
    const clean = Array.isArray(stack) ? stack.filter(Boolean).map(String) : [];
    global.sessionStorage.setItem(getStorageKey(), JSON.stringify(clean));
  }catch(error){
    console.warn("[SKYKNavigation] 寫入 sessionStorage 失敗：", error);
  }
}

function getStack(){
  return readStack().slice();
}

function clear(){
  writeStack([]);
  refreshButton();
}

function peek(){
  const stack = readStack();
  return stack.length ? stack[stack.length - 1] : "";
}

function pushUrl(url){
  const next = String(url || "").trim();
  if(!next) return getStack();

  const stack = readStack();
  const last = stack[stack.length - 1];

  if(last !== next){
    stack.push(next);
  }

  writeStack(stack);
  refreshButton();
  return stack.slice();
}

function pushCurrent(){
  return pushUrl(getCurrentCleanUrl());
}

function popUrl(){
  const stack = readStack();
  const url = stack.pop() || "";
  writeStack(stack);
  refreshButton();
  return url;
}

function hasHistory(){
  return readStack().length > 0;
}

function isModifiedClick(event){
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldIgnoreLink(anchor, event){
  const cfg = getConfig();

  if(!anchor) return true;
  if(isModifiedClick(event)) return true;
  if(anchor.hasAttribute("download")) return true;

  const excludeSelector = cfg.excludeSelector || DEFAULT_CONFIG.excludeSelector;
  if(excludeSelector && anchor.matches(excludeSelector)) return true;
  if(excludeSelector && anchor.closest(excludeSelector)) return true;

  const target = String(anchor.getAttribute("target") || "").trim();
  if(target && target !== "_self") return true;

  const rawHref = String(anchor.getAttribute("href") || "").trim();
  if(!rawHref) return true;
  if(rawHref === "#") return true;

  const lower = rawHref.toLowerCase();
  if(lower.startsWith("javascript:")) return true;
  if(lower.startsWith("mailto:")) return true;
  if(lower.startsWith("tel:")) return true;

  let url;
  try{
    url = new URL(anchor.href, global.location.href);
  }catch(error){
    return true;
  }

  if(cfg.sameOrigin !== false && url.origin !== global.location.origin) return true;

  return false;
}

function clamp(value, min, max){
  return Math.max(min, Math.min(max, value));
}

function injectStyle(){
  if(styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.dataset.skykNavigation = "style";
  style.textContent = `
.skyk-navBackButton{
  position: fixed;
  left: var(--skyk-nav-left, 10px);
  bottom: var(--skyk-nav-bottom, 18px);
  width: var(--skyk-nav-hit-size, 76px);
  height: var(--skyk-nav-hit-size, 76px);
  z-index: var(--skyk-nav-z, 180);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  padding: 0;
  margin: 0;
  background: transparent;
  color: #e8fbff;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  appearance: none;
  -webkit-appearance: none;
  opacity: var(--skyk-nav-hidden-opacity, .10);
  transform: scale(1);
  transition: opacity .18s ease, transform .18s ease, filter .18s ease;
}
.skyk-navBackButton[hidden]{display:none !important;}
.skyk-navBackButton::before{
  content:"";
  position:absolute;
  left:50%;
  top:50%;
  width: var(--skyk-nav-size, 58px);
  height: var(--skyk-nav-size, 58px);
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: radial-gradient(circle at 35% 25%, rgba(150,230,255,.22), rgba(14,22,34,.52) 52%, rgba(0,0,0,.20));
  border: 1px solid rgba(170,230,255,.22);
  box-shadow: 0 6px 18px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.09), inset 0 -8px 14px rgba(0,0,0,.30);
}
.skyk-navBackButtonText{
  position: relative;
  z-index: 1;
  display: block;
  font-size: calc(var(--skyk-nav-size, 58px) * .48);
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,.9)) drop-shadow(0 0 5px rgba(120,220,255,.18));
  transform: translateX(-1px);
}
.skyk-navBackButton.is-active{
  opacity: var(--skyk-nav-active-opacity, .88);
  transform: scale(var(--skyk-nav-active-scale, 1.14));
  filter: brightness(1.12);
}
.skyk-navBackButton.is-active::before{
  border-color: rgba(170,235,255,.42);
  box-shadow: 0 8px 24px rgba(0,0,0,.46), 0 0 18px rgba(100,210,255,.20), inset 0 1px 0 rgba(255,255,255,.14), inset 0 -8px 14px rgba(0,0,0,.34);
}
.skyk-navBackButton.is-wiggle{animation: skykNavBackWiggle .34s ease both;}
.skyk-navBackButton.is-dragging{
  opacity: .92;
  transform: scale(1.08);
  transition:none;
}
@keyframes skykNavBackWiggle{
  0%   { transform: scale(var(--skyk-nav-active-scale, 1.14)) translateX(0); }
  20%  { transform: scale(var(--skyk-nav-active-scale, 1.14)) translateX(-7px); }
  42%  { transform: scale(var(--skyk-nav-active-scale, 1.14)) translateX(6px); }
  64%  { transform: scale(var(--skyk-nav-active-scale, 1.14)) translateX(-4px); }
  82%  { transform: scale(var(--skyk-nav-active-scale, 1.14)) translateX(2px); }
  100% { transform: scale(var(--skyk-nav-active-scale, 1.14)) translateX(0); }
}`;
  document.head.appendChild(style);
}

function createButton(){
  const cfg = getConfig();
  injectStyle();

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "skyk-navBackButton";
  btn.title = cfg.buttonTitle || DEFAULT_CONFIG.buttonTitle;
  btn.hidden = true;

  btn.style.setProperty("--skyk-nav-left", cfg.left || DEFAULT_CONFIG.left);
  btn.style.setProperty("--skyk-nav-bottom", cfg.bottom || DEFAULT_CONFIG.bottom);
  btn.style.setProperty("--skyk-nav-z", String(cfg.zIndex || DEFAULT_CONFIG.zIndex));
  btn.style.setProperty("--skyk-nav-size", Number(cfg.size || DEFAULT_CONFIG.size) + "px");
  btn.style.setProperty("--skyk-nav-hit-size", Number(cfg.hitSize || DEFAULT_CONFIG.hitSize) + "px");
  btn.style.setProperty("--skyk-nav-hidden-opacity", String(cfg.hiddenOpacity ?? DEFAULT_CONFIG.hiddenOpacity));
  btn.style.setProperty("--skyk-nav-active-opacity", String(cfg.activeOpacity ?? DEFAULT_CONFIG.activeOpacity));
  btn.style.setProperty("--skyk-nav-active-scale", String(cfg.activeScale ?? DEFAULT_CONFIG.activeScale));

  const span = document.createElement("span");
  span.className = "skyk-navBackButtonText";
  span.textContent = cfg.buttonText || DEFAULT_CONFIG.buttonText;
  btn.appendChild(span);

  btn.addEventListener("pointerdown", onButtonPointerDown);
  btn.addEventListener("pointermove", onButtonPointerMove);
  btn.addEventListener("pointerup", onButtonPointerUp);
  btn.addEventListener("pointercancel", onButtonPointerCancel);
  btn.addEventListener("click", onButtonClick);

  document.body.appendChild(btn);
  state.button = btn;

  refreshButton();
}

function removeButton(){
  disarmButton();

  if(state.button && state.button.parentNode){
    state.button.parentNode.removeChild(state.button);
  }

  state.button = null;
}

function refreshButton(){
  const btn = state.button;
  if(!btn) return;

  const show = hasHistory();
  btn.hidden = !show;

  if(!show){
    disarmButton();
  }
}

function armButton(){
  const btn = state.button;
  if(!btn || btn.hidden) return;

  state.armed = true;
  btn.classList.add("is-active");
  btn.classList.remove("is-wiggle");
  void btn.offsetWidth;
  btn.classList.add("is-wiggle");

  if(state.buttonTimer){
    global.clearTimeout(state.buttonTimer);
  }

  state.buttonTimer = global.setTimeout(()=>{
    disarmButton();
  }, Number(getConfig().activeMs || DEFAULT_CONFIG.activeMs));
}

function disarmButton(){
  state.armed = false;

  if(state.buttonTimer){
    global.clearTimeout(state.buttonTimer);
    state.buttonTimer = null;
  }

  if(state.button){
    state.button.classList.remove("is-active", "is-wiggle");
  }
}

function onButtonClick(event){
  event.preventDefault();
  event.stopPropagation();

  if(state.pointer.moved){
    state.pointer.moved = false;
    return;
  }

  if(!hasHistory()){
    refreshButton();
    return;
  }

  if(!state.armed){
    armButton();
    return;
  }

  back();
}

function onButtonPointerDown(event){
  const btn = state.button;
  if(!btn) return;

  state.pointer.active = true;
  state.pointer.moved = false;
  state.pointer.startX = event.clientX;
  state.pointer.startY = event.clientY;
  state.pointer.pointerId = event.pointerId;

  const rect = btn.getBoundingClientRect();
  state.pointer.originX = rect.left;
  state.pointer.originY = rect.top;

  try{ btn.setPointerCapture(event.pointerId); }catch(error){}
  btn.classList.add("is-dragging");
}

function onButtonPointerMove(event){
  if(!state.pointer.active || !state.button) return;

  const dx = event.clientX - state.pointer.startX;
  const dy = event.clientY - state.pointer.startY;

  if(Math.abs(dx) + Math.abs(dy) > 6){
    state.pointer.moved = true;
  }

  if(!state.pointer.moved) return;

  event.preventDefault();

  const btn = state.button;
  const rect = btn.getBoundingClientRect();
  const w = rect.width || Number(getConfig().hitSize || DEFAULT_CONFIG.hitSize);
  const h = rect.height || Number(getConfig().hitSize || DEFAULT_CONFIG.hitSize);

  const visibleRatio = Number(getConfig().minVisibleRatio || DEFAULT_CONFIG.minVisibleRatio);
  const minVisibleW = w * visibleRatio;
  const minVisibleH = h * visibleRatio;

  let x = state.pointer.originX + dx;
  let y = state.pointer.originY + dy;

  x = clamp(x, -w + minVisibleW, global.innerWidth - minVisibleW);
  y = clamp(y, -h + minVisibleH, global.innerHeight - minVisibleH);

  btn.style.left = Math.round(x) + "px";
  btn.style.top = Math.round(y) + "px";
  btn.style.bottom = "auto";
}

function onButtonPointerUp(event){
  if(!state.button) return;

  state.pointer.active = false;

  try{ state.button.releasePointerCapture(event.pointerId); }catch(error){}
  state.button.classList.remove("is-dragging");
}

function onButtonPointerCancel(event){
  onButtonPointerUp(event);
}

async function politeLeave(){
  const cfg = getConfig();

  if(!cfg.enableTransition) return;

  if(global.SKYKHexTransition && typeof global.SKYKHexTransition.leave === "function"){
    await global.SKYKHexTransition.leave({
      preset:cfg.transitionPreset || "quick",
      mountTarget:cfg.mountTarget || DEFAULT_CONFIG.mountTarget
    });
  }
}

async function back(){
  if(!hasHistory()){
    refreshButton();
    return false;
  }

  const url = popUrl();

  if(!url){
    refreshButton();
    return false;
  }

  disarmButton();

  try{
    await politeLeave();
  }catch(error){
    console.error("[SKYKNavigation] 返回離場轉場失敗：", error);
  }

  global.location.replace(url);
  return true;
}

function mountLinkAdapter(){
  if(state.linkHandler){
    document.removeEventListener("click", state.linkHandler, true);
    state.linkHandler = null;
  }

  state.linkHandler = async function(event){
    const cfg = getConfig();
    const selector = cfg.linkSelector || DEFAULT_CONFIG.linkSelector;
    const anchor = event.target && event.target.closest ? event.target.closest(selector) : null;

    if(!anchor) return;
    if(shouldIgnoreLink(anchor, event)) return;

    const href = anchor.href;
    if(!href) return;

    event.preventDefault();
    event.stopPropagation();

    pushCurrent();

    try{
      await politeLeave();
    }catch(error){
      console.error("[SKYKNavigation] 連結離場轉場失敗：", error);
    }

    global.location.href = href;
  };

  document.addEventListener("click", state.linkHandler, true);
}

function unmountLinkAdapter(){
  if(state.linkHandler){
    document.removeEventListener("click", state.linkHandler, true);
    state.linkHandler = null;
  }
}

function mount(options={}){
  unmount();

  state.config = Object.assign({}, DEFAULT_CONFIG, options || {});
  state.mounted = true;

  createButton();
  mountLinkAdapter();
  refreshButton();

  return api;
}

function unmount(){
  unmountLinkAdapter();
  removeButton();

  state.mounted = false;
  state.config = null;
  state.armed = false;

  state.pointer = {
    active:false,
    moved:false,
    startX:0,
    startY:0,
    originX:0,
    originY:0,
    pointerId:null
  };
}

function getState(){
  return {
    mounted:state.mounted,
    hasHistory:hasHistory(),
    stack:getStack(),
    armed:state.armed,
    buttonVisible:!!(state.button && !state.button.hidden)
  };
}

const api = {
  mount,
  unmount,
  pushCurrent,
  pushUrl,
  back,
  peek,
  getStack,
  clear,
  refreshButton,
  getState
};

global.SKYKNavigation = api;

})(window);
