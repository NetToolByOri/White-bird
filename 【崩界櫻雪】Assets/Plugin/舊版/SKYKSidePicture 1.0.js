/*
==================================================
SKYKSidePicture
版本：v1.0.1
==================================================

用途：
- 共用左右裝飾圖插件。
- 可用於 Codex / CharacterData / DataPage / GameSystem 等頁面。
- 本插件只負責「把左右圖片放進指定容器」。
- 顯示、隱藏、尺寸、位置、RWD 全部由頁面 CSS / 掛載容器決定。

依賴：
- 建議先載入 GameImageTool.js。
- 若找不到 GameImageTool，會使用原生 img.src fallback。

預設素材路徑：
- 【崩界櫻雪】Assets/Picture/SidePicture

路徑注意：
- 本插件的 path 是「以目前 HTML 所在位置為基準」的相對路徑。
- 若某頁面不在可直接找到「【崩界櫻雪】Assets」的位置，請在 mount 時傳入 path 覆蓋。
- 例：path:"../【崩界櫻雪】Assets/Picture/SidePicture"

責任範圍：
✔ 卡池模式
✔ 指定檔案模式
✔ default pool fallback
✔ 左右成組，不混抽
✔ GameImageTool.applyImage
✔ 呼吸感動畫 class
✔ 頁面載入時抽一次

不負責：
✘ 不讀 JSON
✘ 不 fetch
✘ 不解析角色資料
✘ 不決定尺寸
✘ 不決定顯示/隱藏
✘ 不決定 RWD
✘ 不控制頁面 layout

==================================================
呼叫方式
==================================================

【模式1：卡池模式】

SKYKSidePicture.mount({
  pool:"default"
});

或：

SKYKSidePicture.mount({
  path:"【崩界櫻雪】Assets/Picture/SidePicture",
  pool:"satia"
});

--------------------------------------------------

【模式2：指定檔案模式】

SKYKSidePicture.mount({
  left:"satia_guard",
  right:"satia_work"
});

或：

SKYKSidePicture.mount({
  path:"【崩界櫻雪】Assets/Picture/SidePicture",
  left:"hanoshi_casual",
  right:"hanoshi_uniform"
});

--------------------------------------------------

【模式3：轉接器模式】

頁面自己讀 JSON，自己轉成標準格式。
SKYKSidePicture 不讀 JSON。

function buildCharacterSidePictureConfig(data){
  return data.sidePicture || { pool:"default" };
}

const sideConfig = buildCharacterSidePictureConfig(characterData);
SKYKSidePicture.mount(sideConfig);

--------------------------------------------------

【轉接器回傳格式】

卡池：
{
  pool:"satia"
}

指定：
{
  left:"satia_guard",
  right:"satia_work"
}

可選：
{
  path:"【崩界櫻雪】Assets/Picture/SidePicture",
  pool:"satia"
}

--------------------------------------------------

【預設掛載點】

若不傳 leftTarget / rightTarget：

leftTarget  = ".side-Left"
rightTarget = ".side-Right"

Codex 類頁面可直接沿用：

<div class="Side side-Left"></div>
<div class="Side side-Right"></div>

GameSystem 可指定：

SKYKSidePicture.mount({
  leftTarget:"#skykLeftDecorLayer",
  rightTarget:"#skykRightDecorLayer",
  pool:"default"
});

==================================================
*/

(function(global){
"use strict";

const DEFAULT_OPTIONS = {
  leftTarget:".side-Left",
  rightTarget:".side-Right",
  path:"【崩界櫻雪】Assets/Picture/SidePicture",
  pool:"default",
  left:"",
  right:"",
  altPrefix:"Side Picture",
  clearTarget:true,
  applyBaseClass:true,
  animation:true,
  debug:false
};

const SIDE_PICTURE_POOLS = {
  default:[
    { left:"side-Left", right:"side-Right" }
  ],
  satia:[
    { left:"satia_guard", right:"satia_work" },
    { left:"satia_summer", right:"satia_water" }
  ]

  /*
  story:[
    { left:"hanoshi_casual", right:"hanoshi_uniform" },
    { left:"qianfeng_suit", right:"qianfeng_private" }
  ]
  */
};

let styleInjected = false;

let runtime = {
  mounted:false,
  leftTarget:null,
  rightTarget:null,
  leftImg:null,
  rightImg:null,
  options:null,
  selectedPair:null
};

function clonePlain(value){
  return JSON.parse(JSON.stringify(value));
}

function normalizePathPart(value){
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

function getElement(target){
  if(target && typeof target === "string") return document.querySelector(target);
  if(target && target.nodeType === 1) return target;
  return null;
}

function randomItem(list){
  if(!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function log(){
  if(runtime.options && runtime.options.debug){
    console.log.apply(console, ["[SKYKSidePicture]"].concat(Array.from(arguments)));
  }
}

function getPool(poolName){
  const key = String(poolName || DEFAULT_OPTIONS.pool).trim() || DEFAULT_OPTIONS.pool;
  const pool = SIDE_PICTURE_POOLS[key];

  if(Array.isArray(pool) && pool.length > 0){
    return { name:key, list:pool };
  }

  return { name:"default", list:SIDE_PICTURE_POOLS.default || [] };
}

function resolvePair(options){
  const left = String(options.left || "").trim();
  const right = String(options.right || "").trim();

  if(left || right){
    return {
      mode:"files",
      left,
      right
    };
  }

  const poolInfo = getPool(options.pool);
  const pair = randomItem(poolInfo.list);

  if(!pair){
    return {
      mode:"empty",
      left:"",
      right:""
    };
  }

  return {
    mode:"pool",
    pool:poolInfo.name,
    left:String(pair.left || "").trim(),
    right:String(pair.right || "").trim()
  };
}

function injectStyle(){
  if(styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.dataset.skykSidePicture = "style";
  style.textContent = `
.skyk-sidePicture-img{
  display:block;
  width:100%;
  height:100%;
  max-width:100%;
  max-height:100%;
  object-fit:contain;
  opacity:.86;
  filter:
    brightness(.82)
    contrast(1.08)
    saturate(.92)
    drop-shadow(0 -5px 15px rgba(0,0,0,.35));
  transition:
    transform .8s ease,
    filter .8s ease,
    opacity .8s ease;
}

.skyk-sidePicture-img:hover{
  transform:translateY(-10px) scale(1.02);
  filter:
    brightness(1.06)
    contrast(1.08)
    drop-shadow(0 -5px 20px rgba(0,0,0,.60));
  opacity:1;
}

.skyk-sidePicture-img.is-floatA{
  animation:skykSidePictureFloatA 8s ease-in-out infinite;
}

.skyk-sidePicture-img.is-floatB{
  animation:skykSidePictureFloatB 10s ease-in-out infinite;
}

@keyframes skykSidePictureFloatA{
  0%,100%{ transform:translateY(0); }
  50%{ transform:translateY(-12px); }
}

@keyframes skykSidePictureFloatB{
  0%,100%{ transform:translateY(0); }
  50%{ transform:translateY(12px); }
}
`;
  document.head.appendChild(style);
}

function applyImage(img, imageName, path){
  const cleanName = String(imageName || "").trim();

  if(!cleanName){
    img.removeAttribute("src");
    return;
  }

  if(global.GameImageTool && typeof global.GameImageTool.applyImage === "function"){
    global.GameImageTool.applyImage(img, cleanName, {
      folder:normalizePathPart(path || DEFAULT_OPTIONS.path)
    });
    return;
  }

  const folder = normalizePathPart(path || DEFAULT_OPTIONS.path);
  img.dataset.skykSidePictureFallbackTried = "0";
  img.onerror = function(){
    if(img.dataset.skykSidePictureFallbackTried === "1") return;
    img.dataset.skykSidePictureFallbackTried = "1";
    img.src = folder + "/" + cleanName + ".png";
  };
  img.src = folder + "/" + cleanName + ".ang";
}

function createImg(side, imageName, options){
  const img = document.createElement("img");

  img.className = "skyk-sidePicture-img";
  img.dataset.skykSidePictureSide = side;
  img.dataset.skykSidePictureName = imageName || "";
  img.alt = options.altPrefix + " " + side;

  if(options.applyBaseClass){
    img.classList.add("is-" + side);
  }

  if(options.animation){
    img.classList.add(side === "left" ? "is-floatA" : "is-floatB");
  }

  applyImage(img, imageName, options.path);

  return img;
}

function clearTarget(target){
  if(!target) return;
  target.innerHTML = "";
}

function mount(options={}){
  injectStyle();

  const opts = Object.assign({}, clonePlain(DEFAULT_OPTIONS), options || {});
  opts.path = normalizePathPart(opts.path || DEFAULT_OPTIONS.path);

  const leftTarget = getElement(opts.leftTarget);
  const rightTarget = getElement(opts.rightTarget);

  if(!leftTarget || !rightTarget){
    console.warn("[SKYKSidePicture] 找不到 leftTarget 或 rightTarget。", {
      leftTarget:opts.leftTarget,
      rightTarget:opts.rightTarget
    });
    return null;
  }

  const pair = resolvePair(opts);

  if(opts.clearTarget){
    clearTarget(leftTarget);
    clearTarget(rightTarget);
  }

  const leftImg = createImg("left", pair.left, opts);
  const rightImg = createImg("right", pair.right, opts);

  leftTarget.appendChild(leftImg);
  rightTarget.appendChild(rightImg);

  runtime = {
    mounted:true,
    leftTarget,
    rightTarget,
    leftImg,
    rightImg,
    options:opts,
    selectedPair:pair
  };

  log("mounted", pair);

  return api;
}

function unmount(){
  if(runtime.leftImg && runtime.leftImg.parentNode){
    runtime.leftImg.parentNode.removeChild(runtime.leftImg);
  }

  if(runtime.rightImg && runtime.rightImg.parentNode){
    runtime.rightImg.parentNode.removeChild(runtime.rightImg);
  }

  runtime = {
    mounted:false,
    leftTarget:null,
    rightTarget:null,
    leftImg:null,
    rightImg:null,
    options:null,
    selectedPair:null
  };
}

function remount(options={}){
  unmount();
  return mount(options);
}

function getSelectedPair(){
  return runtime.selectedPair ? clonePlain(runtime.selectedPair) : null;
}

function getPools(){
  return clonePlain(SIDE_PICTURE_POOLS);
}

function addPool(poolName, pairList){
  const key = String(poolName || "").trim();
  if(!key) return false;
  if(!Array.isArray(pairList)) return false;

  SIDE_PICTURE_POOLS[key] = pairList
    .filter(pair => pair && (pair.left || pair.right))
    .map(pair => ({
      left:String(pair.left || "").trim(),
      right:String(pair.right || "").trim()
    }));

  return true;
}

const api = {
  mount,
  unmount,
  remount,
  getSelectedPair,
  getPools,
  addPool,
  pools:SIDE_PICTURE_POOLS,
  defaults:DEFAULT_OPTIONS
};

global.SKYKSidePicture = api;

})(window);
