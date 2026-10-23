/*
==================================================
SKYK Expand Button Panel
版本：v1.2 hex-leave-transition
==================================================
責任：
- 生成展開式按鈕面板
- 使用 GameImageTool 載入系統圖片
- 從 sourceElement 複製圖示飛到 #stage 中央
- 依 layout4 / layout6 / layout8 展開周邊按鈕
- 點背景關閉
- 點按鈕後依 link 資料跳轉

不負責：
- BottomBar
- 頁面按鈕 index 綁定
- 外部導航堆疊
- 複雜 action runner
==================================================
*/
(function(global){
"use strict";

const DEFAULT_OPTIONS = {
  mountTarget:"#stage",
  imageFolder:"【崩界櫻雪】GameSystem/Picture/SysImage",
  centerImage:"Sysbutton1",
  itemImage:"SysButton2",

  layout:"layout4",

  timings:{
    centerFlyMs:500,
    centerPauseMs:300,
    itemSpreadWindowMs:500,
    itemMoveMs:300,
    closeItemWindowMs:360,
    closeItemMoveMs:240,
    centerFadeMs:220,
    sourceFadeMs:220
  },

  mobile:{
    centerSizeRate:0.20,
    itemWidthRate:0.60,
    itemRatio:1.5,
    radiusRate:0.26
  },

  pc:{
    centerSizeRate:0.18,
    itemHeightRate:0.24,
    itemRatio:1.5,
    radiusRate:0.21
  },

  buttons:[],

  onSelect:null
};

const LAYOUTS = {
  layout4:[
    { key:"rt", x: 1, y:-1 },
    { key:"rb", x: 1, y: 1 },
    { key:"lb", x:-1, y: 1 },
    { key:"lt", x:-1, y:-1 }
  ],

  layout6:[
    { key:"rt", x: .75, y:-1 },
    { key:"r",  x: 1.25, y: 0 },
    { key:"rb", x: .75, y: 1 },
    { key:"lb", x:-.75, y: 1 },
    { key:"l",  x:-1.25, y: 0 },
    { key:"lt", x:-.75, y:-1 }
  ],

  layout8:[
    { key:"rt", x: 1, y:-1 },
    { key:"r",  x: 1, y: 0 },
    { key:"rb", x: 1, y: 1 },
    { key:"b",  x: 0, y: 1 },
    { key:"lb", x:-1, y: 1 },
    { key:"l",  x:-1, y: 0 },
    { key:"lt", x:-1, y:-1 },
    { key:"t",  x: 0, y:-1 }
  ]
};

let styleInjected = false;

let runtime = {
  isOpen:false,
  root:null,
  target:null,
  options:null,
  sourceElement:null,
  sourceOriginalOpacity:"",
  centerEl:null,
  itemEls:[]
};

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function mergeOptions(options){
  const merged = Object.assign({}, clone(DEFAULT_OPTIONS), options || {});
  merged.timings = Object.assign({}, DEFAULT_OPTIONS.timings, (options && options.timings) || {});
  merged.mobile = Object.assign({}, DEFAULT_OPTIONS.mobile, (options && options.mobile) || {});
  merged.pc = Object.assign({}, DEFAULT_OPTIONS.pc, (options && options.pc) || {});
  return merged;
}

function getTarget(target){
  if(target && typeof target === "string") return document.querySelector(target);
  if(target && target.nodeType === 1) return target;
  return document.querySelector(DEFAULT_OPTIONS.mountTarget);
}

function isPcLayout(){
  return global.matchMedia("(orientation: landscape) and (min-width: 500px)").matches;
}

function applyImage(img, name, folder){
  if(!img) return;

  if(global.GameImageTool && typeof global.GameImageTool.applyImage === "function"){
    global.GameImageTool.applyImage(img, name, { folder });
    return;
  }

  img.src = String(folder || "").replace(/\/$/,"") + "/" + name + ".png";
}

function injectStyle(){
  if(styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.dataset.skykExpandButtonPanel = "style";
  style.textContent = `
.skyk-expandPanel,
.skyk-expandPanel *{
  box-sizing:border-box;
}

.skyk-expandPanel{
  position:absolute;
  inset:0;
  z-index:90;
  pointer-events:auto;
  overflow:hidden;
  font-family:"Segoe UI","Microsoft JhengHei",sans-serif;

  --skyk-expand-center-size:120px;
  --skyk-expand-item-width:180px;
  --skyk-expand-item-height:120px;
  --skyk-expand-radius:220px;
  --skyk-expand-center-x:0px;
  --skyk-expand-center-y:0px;

  --skyk-expand-text:#f2fbff;
  --skyk-expand-text-shadow:rgba(72,190,255,.78);
}

.skyk-expandPanel-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.28);
  pointer-events:auto;
}

.skyk-expandPanel-center{
  position:absolute;
  width:var(--skyk-expand-center-size);
  height:var(--skyk-expand-center-size);
  left:0;
  top:0;
  transform-origin:center center;
  opacity:1;
  pointer-events:none;
  will-change:transform, opacity;
}

.skyk-expandPanel-center img{
  display:block;
  width:100%;
  height:100%;
  object-fit:contain;
}

.skyk-expandPanel-item{
  position:absolute;
  width:var(--skyk-expand-item-width);
  height:var(--skyk-expand-item-height);
  left:calc(var(--skyk-expand-center-x) - var(--skyk-expand-item-width) / 2);
  top:calc(var(--skyk-expand-center-y) - var(--skyk-expand-item-height) / 2);
  transform:scale(.5);
  opacity:0;
  border:0;
  padding:0;
  margin:0;
  appearance:none;
  -webkit-appearance:none;
  background:transparent;
  cursor:pointer;
  user-select:none;
  pointer-events:auto;
  will-change:left, top, transform, opacity;
  font:inherit;
}

.skyk-expandPanel-itemImg{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:contain;
  pointer-events:none;
}

.skyk-expandPanel-label{
  position:absolute;
  left:16%;
  right:16%;
  top:20%;
  bottom:20%;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  pointer-events:none;
  color:var(--skyk-expand-text);
  font-weight:950;
  line-height:1;
  white-space:nowrap;
  text-align:center;
  font-size:var(--skyk-expand-label-font-size, 20px);
  text-shadow:
    0 2px 4px rgba(0,0,0,.9),
    0 0 8px var(--skyk-expand-text-shadow);
}

.skyk-expandPanel-item:active{
  filter:brightness(1.24);
}
`;
  document.head.appendChild(style);
}

function getStageMetrics(target, opts){
  const rect = target.getBoundingClientRect();
  const pc = isPcLayout();
  let centerSize;
  let itemWidth;
  let itemHeight;
  let radius;

  if(pc){
    centerSize = rect.height * opts.pc.centerSizeRate;
    itemHeight = rect.height * opts.pc.itemHeightRate;
    itemWidth = itemHeight * opts.pc.itemRatio;
    radius = rect.height * opts.pc.radiusRate;
  }else{
    centerSize = rect.width * opts.mobile.centerSizeRate;
    itemWidth = rect.width * opts.mobile.itemWidthRate;
    itemHeight = itemWidth / opts.mobile.itemRatio;
    radius = rect.width * opts.mobile.radiusRate;
  }

  return {
    rect,
    centerX:rect.width / 2,
    centerY:rect.height / 2,
    centerSize,
    itemWidth,
    itemHeight,
    radius
  };
}

function sourceRectRelativeToTarget(sourceElement, target){
  if(!sourceElement) return null;

  const sourceRect = sourceElement.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  return {
    x: sourceRect.left - targetRect.left + sourceRect.width / 2,
    y: sourceRect.top - targetRect.top + sourceRect.height / 2,
    w: sourceRect.width,
    h: sourceRect.height
  };
}

function createCenterElement(opts){
  const el = document.createElement("div");
  el.className = "skyk-expandPanel-center";

  const img = document.createElement("img");
  applyImage(img, opts.centerImage, opts.imageFolder);
  el.appendChild(img);

  return el;
}

function createItemElement(buttonData, index, opts){
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skyk-expandPanel-item";
  button.dataset.index = String(index + 1);

  const img = document.createElement("img");
  img.className = "skyk-expandPanel-itemImg";
  applyImage(img, opts.itemImage, opts.imageFolder);

  const label = document.createElement("div");
  label.className = "skyk-expandPanel-label";
  label.textContent = buttonData.label || "";

  button.append(img, label);

  button.addEventListener("click", event=>{
    event.preventDefault();
    event.stopPropagation();
    selectItem(index, buttonData);
  });

  return button;
}

function setPanelMetrics(root, metrics){
  root.style.setProperty("--skyk-expand-center-size", metrics.centerSize + "px");
  root.style.setProperty("--skyk-expand-item-width", metrics.itemWidth + "px");
  root.style.setProperty("--skyk-expand-item-height", metrics.itemHeight + "px");
  root.style.setProperty("--skyk-expand-radius", metrics.radius + "px");
  root.style.setProperty("--skyk-expand-center-x", metrics.centerX + "px");
  root.style.setProperty("--skyk-expand-center-y", metrics.centerY + "px");
}

function fitLabels(root){
  root.querySelectorAll(".skyk-expandPanel-label").forEach(label=>{
    const rect = label.getBoundingClientRect();
    const text = label.textContent || "";
    const count = Math.max(1, text.length);
    const heightBased = rect.height * 0.72;
    const widthBased = rect.width / (count * 0.62);
    const fontSize = Math.max(0.1, Math.min(heightBased, widthBased));
    label.style.setProperty("--skyk-expand-label-font-size", fontSize + "px");
  });
}

function itemPosition(layoutPoint, metrics){
  return {
    x: metrics.centerX + layoutPoint.x * metrics.radius,
    y: metrics.centerY + layoutPoint.y * metrics.radius
  };
}

function setCenterPosition(el, x, y, size, scale){
  el.style.transform =
    "translate(" + (x - size / 2) + "px, " + (y - size / 2) + "px) scale(" + scale + ")";
}

function setItemAtCenter(el, metrics){
  el.style.left = (metrics.centerX - metrics.itemWidth / 2) + "px";
  el.style.top = (metrics.centerY - metrics.itemHeight / 2) + "px";
  el.style.transform = "scale(.5)";
  el.style.opacity = "0";
}

function setItemAtPosition(el, point, metrics){
  el.style.left = (point.x - metrics.itemWidth / 2) + "px";
  el.style.top = (point.y - metrics.itemHeight / 2) + "px";
  el.style.transform = "scale(1)";
  el.style.opacity = "1";
}

function buildUrl(link){
  if(!link) return "";

  const path = link.path || "";
  const file = link.file || "";
  const query = link.query || {};
  const base = path + file;

  const params = new URLSearchParams();

  if(query.json !== undefined && query.json !== null && query.json !== ""){
    params.set("json", query.json);
  }

  if(query.folder !== undefined && query.folder !== null && query.folder !== ""){
    params.set("folder", query.folder);
  }

  const extra = query.extra && typeof query.extra === "object" ? query.extra : {};
  Object.keys(extra).forEach(key=>{
    if(extra[key] !== undefined && extra[key] !== null){
      params.set(key, extra[key]);
    }
  });

  const qs = params.toString();
  return qs ? base + "?" + qs : base;
}

function open(options={}){
  injectStyle();

  if(runtime.isOpen){
    close({ immediate:true });
  }

  const opts = mergeOptions(options);
  const target = getTarget(opts.mountTarget);
  if(!target) throw new Error("找不到 SKYKExpandButtonPanel mountTarget。");

  const layout = LAYOUTS[opts.layout];
  if(!layout) throw new Error("未知的 SKYKExpandButtonPanel layout：" + opts.layout);

  const buttons = Array.isArray(opts.buttons) ? opts.buttons : [];
  if(buttons.length !== layout.length){
    console.warn("[SKYKExpandButtonPanel] buttons 數量與 layout 不一致。layout=", opts.layout, "layoutCount=", layout.length, "buttonCount=", buttons.length);
  }

  const root = document.createElement("div");
  root.className = "skyk-expandPanel";

  const backdrop = document.createElement("div");
  backdrop.className = "skyk-expandPanel-backdrop";
  backdrop.addEventListener("click", ()=>{
    close();
  });

  const metrics = getStageMetrics(target, opts);
  setPanelMetrics(root, metrics);

  const centerEl = createCenterElement(opts);

  const sourceInfo = sourceRectRelativeToTarget(opts.sourceElement, target);
  const startX = sourceInfo ? sourceInfo.x : metrics.centerX;
  const startY = sourceInfo ? sourceInfo.y : metrics.centerY;
  const startSize = sourceInfo ? Math.max(sourceInfo.w, sourceInfo.h) : metrics.centerSize;

  if(opts.sourceElement){
    runtime.sourceElement = opts.sourceElement;
    runtime.sourceOriginalOpacity = opts.sourceElement.style.opacity || "";
    opts.sourceElement.style.transition = "opacity " + opts.timings.sourceFadeMs + "ms ease";
    opts.sourceElement.style.opacity = "0";
  }

  setCenterPosition(centerEl, startX, startY, metrics.centerSize, startSize / metrics.centerSize);

  const itemEls = [];
  buttons.slice(0, layout.length).forEach((buttonData, index)=>{
    const item = createItemElement(buttonData || {}, index, opts);
    setItemAtCenter(item, metrics);
    itemEls.push(item);
  });

  root.append(backdrop, centerEl, ...itemEls);
  target.appendChild(root);

  runtime.isOpen = true;
  runtime.root = root;
  runtime.target = target;
  runtime.options = opts;
  runtime.centerEl = centerEl;
  runtime.itemEls = itemEls;

  requestAnimationFrame(()=>{
    centerEl.style.transition = "transform " + opts.timings.centerFlyMs + "ms cubic-bezier(.18,.88,.28,1), opacity " + opts.timings.centerFadeMs + "ms ease";
    setCenterPosition(centerEl, metrics.centerX, metrics.centerY, metrics.centerSize, 1);
  });

  global.setTimeout(()=>{
    if(opts.sourceElement){
      opts.sourceElement.style.opacity = runtime.sourceOriginalOpacity;
    }

    itemEls.forEach((item, index)=>{
      const point = itemPosition(layout[index], metrics);
      const startDelay = itemEls.length <= 1
        ? 0
        : (opts.timings.itemSpreadWindowMs / (itemEls.length - 1)) * index;

      global.setTimeout(()=>{
        item.style.transition =
          "left " + opts.timings.itemMoveMs + "ms cubic-bezier(.18,.88,.28,1.08), " +
          "top " + opts.timings.itemMoveMs + "ms cubic-bezier(.18,.88,.28,1.08), " +
          "transform " + opts.timings.itemMoveMs + "ms cubic-bezier(.18,.88,.28,1.08), " +
          "opacity " + Math.max(160, opts.timings.itemMoveMs * .7) + "ms ease";
        setItemAtPosition(item, point, metrics);
      }, startDelay);
    });

    requestAnimationFrame(()=>fitLabels(root));
  }, opts.timings.centerFlyMs + opts.timings.centerPauseMs);

  return api;
}

function close(options={}){
  if(!runtime.isOpen || !runtime.root) return;

  const opts = runtime.options || DEFAULT_OPTIONS;
  const root = runtime.root;
  const metrics = getStageMetrics(runtime.target, opts);
  const itemEls = runtime.itemEls || [];
  const centerEl = runtime.centerEl;

  if(options.immediate){
    cleanup();
    return;
  }

  const reversed = Array.from(itemEls).reverse();

  reversed.forEach((item, reverseIndex)=>{
    const startDelay = itemEls.length <= 1
      ? 0
      : (opts.timings.closeItemWindowMs / (itemEls.length - 1)) * reverseIndex;

    global.setTimeout(()=>{
      item.style.transition =
        "left " + opts.timings.closeItemMoveMs + "ms ease, " +
        "top " + opts.timings.closeItemMoveMs + "ms ease, " +
        "transform " + opts.timings.closeItemMoveMs + "ms ease, " +
        "opacity " + Math.max(120, opts.timings.closeItemMoveMs * .6) + "ms ease";
      setItemAtCenter(item, metrics);
    }, startDelay);
  });

  const centerDelay = opts.timings.closeItemWindowMs + opts.timings.closeItemMoveMs;

  global.setTimeout(()=>{
    if(centerEl){
      centerEl.style.transition = "opacity " + opts.timings.centerFadeMs + "ms ease";
      centerEl.style.opacity = "0";
    }
  }, centerDelay);

  global.setTimeout(cleanup, centerDelay + opts.timings.centerFadeMs + 30);
}

function cleanup(){
  if(runtime.sourceElement){
    runtime.sourceElement.style.opacity = runtime.sourceOriginalOpacity;
  }

  if(runtime.root && runtime.root.parentNode){
    runtime.root.parentNode.removeChild(runtime.root);
  }

  runtime = {
    isOpen:false,
    root:null,
    target:null,
    options:null,
    sourceElement:null,
    sourceOriginalOpacity:"",
    centerEl:null,
    itemEls:[]
  };
}

function selectItem(index, buttonData){
  const opts = runtime.options || DEFAULT_OPTIONS;

  if(typeof opts.onSelect === "function"){
    opts.onSelect(index + 1, buttonData || {});
  }

  const url = buildUrl(buttonData.link);

  close();

  if(url){
    const delay = (opts.timings.closeItemWindowMs || 360) + (opts.timings.closeItemMoveMs || 240) + (opts.timings.centerFadeMs || 220) + 40;

    global.setTimeout(()=>{
      if(global.SKYKHexTransition && typeof global.SKYKHexTransition.leave === "function"){
        global.SKYKHexTransition.leave({
          ui:false,
          broccoliCoin:false,
          timeScale:1,
          onCovered:function(){
            global.location.href = url;
          }
        });
        return;
      }

      global.location.href = url;
    }, delay);
  }
}

const api = {
  open,
  close,
  buildUrl
};

global.SKYKExpandButtonPanel = api;

})(window);
