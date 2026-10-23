/*
==================================================
SKYK Hex Transition
版本：v1.2.1 page-restore-fix
==================================================

用途：
- 提供「六角形蔓延」式的頁面轉場效果。
- 可作為：
  1. 離開頁面時的遮罩轉場
  2. 進入頁面時的 Loading / Logo / 假進度條
  3. 小頁面快速切換時的短轉場
  4. 等待時間內的花菜幣彩蛋獎勵

核心概念：
- 六角形是「上下平邊、左右尖角」的樣式。
- 六角形會以直列為單位，從左上開始，由上往下逐顆填充。
- 下一列會在指定時間間隔後開始，不需要等上一列填完。
- 進場時可直接顯示「已填滿六角形背景」，再顯示 Logo / Loading。
- 進場完成後，六角形會反向逐列消失，露出頁面。

重要設計：
- 本插件不是單純動畫裝飾。
- 它負責把 HTML 頁面的「直接跳轉」包裝成遊戲感較強的系統切換。
- broccoliCoin 功能是 loading 期間的小彩蛋：
  若啟用，有 33% 機率在等待時間前半段出現花菜幣。
  點擊後會呼叫 SKYKResourceDataSystem.addResources，讓 broccoliCoin +1。

--------------------------------------------------
HTML 基本掛載方式
--------------------------------------------------

請先在 HTML 載入：

<script src="js插件/GameImageTool.js"></script>
<script src="js插件/SKYKResourceDataSystem.js"></script>
<script src="js插件/SKYKHexTransition.js"></script>

如果不使用花菜幣功能，可以不載入 SKYKResourceDataSystem。

--------------------------------------------------
進入頁面 Loading 用法
--------------------------------------------------

頁面初始化時呼叫：

SKYKHexTransition.enter({
  ui:true,
  broccoliCoin:true,
  timeScale:1,
  image:{
    logoName:"Logo-崩界櫻雪"
  }
});

ui:
- true：顯示 Logo 與假進度條，會等待 1.5~2 秒後再解除遮罩。
- false：不顯示 Logo / 進度條，等待時間為 0，直接解除六角遮罩。

broccoliCoin:
- true：等待期間有機率出現花菜幣。
- false：完全不執行花菜幣子系統。

timeScale:
- 所有動畫時間倍率。
- 0.5 = 時間減半，速度變快。
- 1 = 預設速度。
- 2 = 時間加倍，速度變慢。

--------------------------------------------------
離開頁面轉場用法
--------------------------------------------------

按鈕切頁時可呼叫：

SKYKHexTransition.leave({
  timeScale:1,
  onCovered:function(){
    location.href = "NextPage.html";
  }
});

或使用 Promise：

await SKYKHexTransition.leave({ timeScale:1 });
location.href = "NextPage.html";

--------------------------------------------------
快速小轉場範例
--------------------------------------------------

SKYKHexTransition.leave({
  ui:false,
  broccoliCoin:false,
  timeScale:0.45,
  onCovered:function(){
    location.href = "MiniPage.html";
  }
});

--------------------------------------------------
素材路徑
--------------------------------------------------

Logo：
預設路徑：【崩界櫻雪】Assets/Picture/Logo/
預設檔名：Logo-崩界櫻雪

HTML 可傳入 image.logoFolder / image.logoName 覆蓋：
SKYKHexTransition.enter({
  ui:true,
  image:{
    logoFolder:"【崩界櫻雪】Assets/Picture/Logo",
    logoName:"Logo-多菜國"
  }
});

若只指定 logoName，會套用預設 logoFolder：
SKYKHexTransition.enter({
  ui:true,
  image:{
    logoName:"Logo-多菜國"
  }
});

花菜幣：
Picture/IconImage/broccoli coin icon BG.ang
Picture/IconImage/broccoli coin icon BG.png

本插件會優先使用 GameImageTool.applyImage。
若 GameImageTool 不存在，會退回 .ang → .png 的簡易載入邏輯。

--------------------------------------------------
Preset 模式
--------------------------------------------------

本插件支援 preset：

preset:"full"
- 完整進場模式。
- ui:true
- broccoliCoin:false
- timeScale:1
- 適合：遊戲首頁、主入口、第一次進入大型系統。

preset:"quick"
- 快速轉場模式。
- ui:false
- broccoliCoin:false
- timeScale:0.16
- 適合：同系統內部跳轉、同 HTML 換 query / 換 JSON 的小轉場。

注意：
- options 內明確傳入的 ui / broccoliCoin / timeScale 會覆蓋 preset。
- quick 的 0.16 是單向倍率。
  若同時有 leave + enter，體感約為 0.32，不會像 0.35 + 0.35 那樣卡住。

範例：

SKYKHexTransition.enter({
  preset:"full",
  image:{
    logoName:"Logo-崩界櫻雪"
  }
});

SKYKHexTransition.enter({
  preset:"quick"
});

--------------------------------------------------
BootCover 初始遮罩規格
--------------------------------------------------

問題：
- JS 插件一定比 HTML/CSS 慢一瞬間。
- 若完全等 SKYKHexTransition.enter() 才建立遮罩，頁面剛開啟時可能會閃出原始畫面。

解法：
HTML 內先放一個原生遮罩：

<div id="BootTransitionCover"></div>

CSS 內先寫：

#BootTransitionCover{
  position:fixed;
  inset:0;
  z-index:999999;
  background:rgb(4,10,18);
  pointer-events:auto;
}

然後頁面呼叫：

SKYKHexTransition.enter({
  preset:"full",
  bootCover:"#BootTransitionCover"
});

插件會在正式轉場 root 建立後移除 BootCover。
這樣可以避免原頁面先閃一下。

注意：
- BootCover 不能完全由插件產生。
- 因為插件本身就是 JS，JS 執行前仍然可能閃屏。
- BootCover 是「插件配套規格」，但必須先寫在 HTML/CSS 內。

--------------------------------------------------
頁面恢復 / BFCache 對策
--------------------------------------------------

問題：
- 正規點連結時，LinkAdapter 會先執行 leave()。
- leave() 會讓六角形遮罩蓋滿畫面。
- 某些手機瀏覽器按「上一頁」時，可能從 BFCache 恢復舊頁面快照。
- 若舊頁面被快取時正停在滿版遮罩狀態，就會看起來卡在六角形滿版。

v1.2.1 對策：
- 插件會記錄最近一次 enter(options) 的進場設定。
- 當頁面被 pageshow 恢復且 event.persisted 為 true 時：
  1. closeImmediate() 清除任何殘留轉場 root
  2. 用最近一次 enter options 重新執行 enter()
- 這不是針對「返回鍵」的頁面特例，而是轉場系統自己的頁面恢復保底機制。

設計原則：
- leave 是禮貌：正規點連結時才有機會執行。
- enter 是保底：頁面重新顯示時必須能把現場洗乾淨並重新進場。
- 特殊手段跳頁若沒有 leave，不算錯；下一頁自己的 enter 仍然應該處理乾淨。

--------------------------------------------------
LinkAdapter 連結離場轉接器
--------------------------------------------------

用途：
- 自動攔截頁面上的 <a> 連結。
- 點擊連結時，先執行 SKYKHexTransition.leave()。
- 當畫面被六角遮罩蓋住後，再 location.href 跳轉。

適合：
- 所有需要統一離場轉場的頁面。
- 萬用型超連結目錄。
- 同 HTML 換 query / 換 JSON 的樹狀目錄。

呼叫：

SKYKHexTransition.mountLinkAdapter({
  preset:"quick",
  mountTarget:".Stage"
});

排除某條連結：

<a href="xxx.html" data-no-transition>直接跳轉</a>

預設不攔截：
- target 不是 _self 的連結
- download 連結
- href="#"
- javascript:
- mailto:
- tel:
- 外部網域

解除：

SKYKHexTransition.unmountLinkAdapter();

--------------------------------------------------
對外 API
--------------------------------------------------

SKYKHexTransition.enter(options)
SKYKHexTransition.leave(options)
SKYKHexTransition.closeImmediate()
SKYKHexTransition.mountLinkAdapter(options)
SKYKHexTransition.unmountLinkAdapter()

==================================================
*/

(function(global){
"use strict";

const DEFAULT_OPTIONS = {
  mountTarget:"#stage",
  ui:true,
  broccoliCoin:false,
  timeScale:1,
  image:{
    logoFolder:"【崩界櫻雪】Assets/Picture/Logo",
    logoName:"Logo-崩界櫻雪",
    broccoliFolder:"Picture/IconImage",
    broccoliName:"broccoli coin icon BG"
  },
  timing:{
    leaveColumnTotalMs:620,
    leaveFillTotalMs:520,
    leaveHexMs:260,
    enterColumnTotalMs:620,
    enterClearTotalMs:520,
    enterHexMs:260,
    waitMinMs:1500,
    waitMaxMs:2000,
    logoFadeMs:260,
    progressTickMs:80
  },
  layout:{
    mobileMaxColumns:6,
    pcMaxColumns:12,
    extraRows:2,
    extraColumns:2
  },
  style:{
    bg:"rgb(4, 10, 18)",
    hexBg:"rgb(8, 24, 44)",
    hexBg2:"rgb(13, 42, 72)",
    hexBorder:"rgba(120, 220, 255, .42)",
    hexGlow:"rgba(70, 190, 255, .24)",
    scanLine:"rgba(150,230,255,.045)",
    text:"#f2fbff",
    progressTrack:"rgba(255,255,255,.12)",
    progressFill:"rgba(130,220,255,.95)"
  },
  broccoli:{
    chance:0.33,
    resourceId:"broccoliCoin",
    rewardAmount:1,
    mobileSizeRate:0.18,
    pcSizeRate:0.075,
    safeLeftRate:0.10,
    safeRightRate:0.10,
    safeTopRate:0.20,
    safeBottomRate:0.10,
    jumpHeightMultiplier:2,
    swingDeg:15,
    animMs:850
  },
  onCovered:null,
  onDone:null
};


const PRESET_OPTIONS = {
  full:{
    ui:true,
    broccoliCoin:false,
    timeScale:1
  },
  quick:{
    ui:false,
    broccoliCoin:false,
    timeScale:0.16
  }
};

let styleInjected = false;
let runtime = {
  root:null,
  hexLayer:null,
  uiLayer:null,
  fxLayer:null,
  progressFill:null,
  active:false,
  timers:[]
};


let linkAdapterRuntime = {
  mounted:false,
  handler:null,
  options:null
};

let lastEnterOptions = null;
let pageRestoreHandlerMounted = false;

function clonePlain(value){ return JSON.parse(JSON.stringify(value)); }

function mergeOptions(options){
  const input = options || {};
  const presetName = String(input.preset || "").trim();
  const preset = PRESET_OPTIONS[presetName] || {};

  const opt = Object.assign({}, clonePlain(DEFAULT_OPTIONS), preset, input);

  opt.image = Object.assign(
    {},
    DEFAULT_OPTIONS.image,
    (preset && preset.image) || {},
    input.image || {}
  );

  opt.timing = Object.assign(
    {},
    DEFAULT_OPTIONS.timing,
    (preset && preset.timing) || {},
    input.timing || {}
  );

  opt.layout = Object.assign(
    {},
    DEFAULT_OPTIONS.layout,
    (preset && preset.layout) || {},
    input.layout || {}
  );

  opt.style = Object.assign(
    {},
    DEFAULT_OPTIONS.style,
    (preset && preset.style) || {},
    input.style || {}
  );

  opt.broccoli = Object.assign(
    {},
    DEFAULT_OPTIONS.broccoli,
    (preset && preset.broccoli) || {},
    input.broccoli || {}
  );

  opt.timeScale = normalizeTimeScale(opt.timeScale);
  return opt;
}

function normalizeTimeScale(value){
  const n = Number(value);
  if(!Number.isFinite(n) || n <= 0) return 1;
  return Math.max(0.05, n);
}

function scaled(ms, opt){ return Math.max(0, Math.round(Number(ms || 0) * opt.timeScale)); }
function randomBetween(min, max){ return min + Math.random() * (max - min); }

function getTarget(target){
  if(target && typeof target === "string") return document.querySelector(target);
  if(target && target.nodeType === 1) return target;
  return document.querySelector(DEFAULT_OPTIONS.mountTarget) || document.body;
}

function removeBootCover(bootCover){
  const cover = getTarget(bootCover);
  if(cover && cover.parentNode){
    cover.parentNode.removeChild(cover);
  }
}

function isPcLayout(){
  return global.matchMedia("(min-width:500px) and (orientation:landscape)").matches;
}

function clearTimers(){
  runtime.timers.forEach(id=>global.clearTimeout(id));
  runtime.timers = [];
}

function delay(ms){
  return new Promise(resolve=>{
    const id = global.setTimeout(resolve, ms);
    runtime.timers.push(id);
  });
}

function rememberEnterOptions(options){
  // 保留原始 options 的淺層複本。
  // 不使用 JSON clone，避免 onDone 等 function callback 被吃掉。
  lastEnterOptions = Object.assign({}, options || {});
}

function mountPageRestoreHandler(){
  if(pageRestoreHandlerMounted) return;
  pageRestoreHandlerMounted = true;

  global.addEventListener("pageshow", function(event){
    // BFCache / 頁面快照恢復時，舊 DOM 可能保留 leave() 後的滿版遮罩。
    // 這裡不把它視為「返回鍵特例」，而是頁面重新顯示時的轉場保底。
    if(!event.persisted) return;

    const restoreOptions = lastEnterOptions ? Object.assign({}, lastEnterOptions) : null;

    closeImmediate();

    if(restoreOptions){
      enter(restoreOptions);
    }
  });
}

function applyImage(img, name, folder){
  if(!img) return;
  const cleanName = String(name || "").trim();
  const cleanFolder = String(folder || "").trim().replace(/\/$/,"");
  if(!cleanName){ img.removeAttribute("src"); return; }

  if(global.GameImageTool && typeof global.GameImageTool.applyImage === "function"){
    global.GameImageTool.applyImage(img, cleanName, { folder:cleanFolder });
    return;
  }

  img.onerror = null;
  img.dataset.fallbackTried = "0";
  img.src = cleanFolder + "/" + cleanName + ".ang";
  img.onerror = ()=>{
    if(img.dataset.fallbackTried === "1") return;
    img.dataset.fallbackTried = "1";
    img.src = cleanFolder + "/" + cleanName + ".png";
  };
}

function injectStyle(){
  if(styleInjected) return;
  styleInjected = true;
  const style = document.createElement("style");
  style.dataset.skykHexTransition = "style";
  style.textContent = `
.skyk-hexTransition,.skyk-hexTransition *{box-sizing:border-box;}
.skyk-hexTransition{
  position:absolute; inset:0; z-index:1000; pointer-events:auto; overflow:hidden;
  background:var(--skyk-hexTransition-bg); font-family:"Segoe UI","Microsoft JhengHei",sans-serif;
  --skyk-hexTransition-bg:rgb(4,10,18);
  --skyk-hexTransition-hex-bg:rgb(8,24,44);
  --skyk-hexTransition-hex-bg2:rgb(13,42,72);
  --skyk-hexTransition-hex-border:rgba(120,220,255,.42);
  --skyk-hexTransition-hex-glow:rgba(70,190,255,.24);
  --skyk-hexTransition-scan-line:rgba(150,230,255,.045);
  --skyk-hexTransition-text:#f2fbff;
  --skyk-hexTransition-progress-track:rgba(255,255,255,.12);
  --skyk-hexTransition-progress-fill:rgba(130,220,255,.95);
}
.skyk-hexTransition.is-transparent{background:transparent;}
.skyk-hexTransition-hexLayer,.skyk-hexTransition-uiLayer,.skyk-hexTransition-fxLayer{position:absolute; inset:0; overflow:hidden;}
.skyk-hexTransition-hexLayer{z-index:1;}
.skyk-hexTransition-uiLayer{z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;}
.skyk-hexTransition-fxLayer{z-index:3; pointer-events:none;}
.skyk-hexTransition-hex{
  position:absolute; width:var(--hex-w); height:var(--hex-h); opacity:0; transform:scale(.72);
  clip-path:polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%);
  background:linear-gradient(135deg,var(--skyk-hexTransition-scan-line),transparent 58%),linear-gradient(180deg,var(--skyk-hexTransition-hex-bg2),var(--skyk-hexTransition-hex-bg));
  border:1px solid var(--skyk-hexTransition-hex-border);
  box-shadow:inset 0 0 8px rgba(130,220,255,.045),inset 0 0 22px rgba(0,0,0,.46),0 0 9px var(--skyk-hexTransition-hex-glow);
  will-change:transform,opacity;
}
.skyk-hexTransition-hex.is-filled{opacity:1; transform:scale(1);}
.skyk-hexTransition-logo{
  display:block; width:min(76vw,620px); max-height:44vh; object-fit:contain; opacity:0;
  transform:translateY(8px) scale(.98); transition:opacity var(--logo-fade-ms) ease,transform var(--logo-fade-ms) ease;
  filter:drop-shadow(0 0 18px rgba(120,210,255,.30)) drop-shadow(0 10px 28px rgba(0,0,0,.46));
}
.skyk-hexTransition-uiLayer.is-visible .skyk-hexTransition-logo{opacity:1; transform:translateY(0) scale(1);}
.skyk-hexTransition-loadingBox{width:min(58vw,420px); margin-top:clamp(16px,3vh,34px); opacity:0; transform:translateY(6px); transition:opacity var(--logo-fade-ms) ease,transform var(--logo-fade-ms) ease;}
.skyk-hexTransition-uiLayer.is-visible .skyk-hexTransition-loadingBox{opacity:1; transform:translateY(0);}
.skyk-hexTransition-loadingText{color:var(--skyk-hexTransition-text); font-size:clamp(11px,1.8vw,15px); letter-spacing:.18em; font-weight:900; text-align:center; margin-bottom:8px; opacity:.86; text-shadow:0 0 8px rgba(110,220,255,.35),0 2px 4px rgba(0,0,0,.85);}
.skyk-hexTransition-progressTrack{width:100%; height:8px; padding:1px; border-radius:999px; overflow:hidden; background:var(--skyk-hexTransition-progress-track); border:1px solid rgba(255,255,255,.14); box-shadow:inset 0 0 10px rgba(0,0,0,.55),0 0 14px rgba(120,210,255,.16);}
.skyk-hexTransition-progressFill{width:0%; height:100%; border-radius:999px; background:linear-gradient(90deg,rgba(255,255,255,.95),var(--skyk-hexTransition-progress-fill),rgba(110,220,255,.78)); box-shadow:0 0 10px var(--skyk-hexTransition-progress-fill),inset 0 0 5px rgba(255,255,255,.72); transition:width .14s ease-out;}
.skyk-hexTransition-broccoli{position:absolute; z-index:4; width:var(--broccoli-size); height:var(--broccoli-size); border:0; padding:0; margin:0; background:transparent; appearance:none; -webkit-appearance:none; cursor:pointer; pointer-events:auto; opacity:0; transform:scale(.65); transition:opacity .22s ease,transform .22s cubic-bezier(.18,.88,.28,1.08); will-change:transform,opacity;}
.skyk-hexTransition-broccoli.is-visible{opacity:1; transform:scale(1);}
.skyk-hexTransition-broccoli img{display:block; width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 0 12px rgba(140,255,170,.35)) drop-shadow(0 6px 10px rgba(0,0,0,.58));}
.skyk-hexTransition-broccoliFx{position:absolute; z-index:5; width:var(--broccoli-size); height:var(--broccoli-size); pointer-events:none; will-change:transform,opacity;}
.skyk-hexTransition-broccoliFx img{display:block; width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 0 16px rgba(140,255,170,.45)) drop-shadow(0 8px 12px rgba(0,0,0,.62));}
.skyk-hexTransition-plusOne{position:absolute; left:50%; top:-18%; transform:translateX(-50%); color:#d7ffe4; font-weight:1000; font-size:calc(var(--broccoli-size) * .32); text-shadow:0 0 10px rgba(120,255,180,.85),0 2px 4px rgba(0,0,0,.85); white-space:nowrap;}
@media (max-width:499px),(orientation:portrait){
  .skyk-hexTransition-uiLayer{justify-content:flex-start; padding-top:18vh;}
  .skyk-hexTransition-logo{width:86vw; max-height:32vh;}
  .skyk-hexTransition-loadingBox{width:68vw; margin-top:18px;}
  .skyk-hexTransition-progressTrack{height:7px;}
}`;
  document.head.appendChild(style);
}

function applyStyleVars(root, opt){
  const s = opt.style;
  root.style.setProperty("--skyk-hexTransition-bg", s.bg);
  root.style.setProperty("--skyk-hexTransition-hex-bg", s.hexBg);
  root.style.setProperty("--skyk-hexTransition-hex-bg2", s.hexBg2);
  root.style.setProperty("--skyk-hexTransition-hex-border", s.hexBorder);
  root.style.setProperty("--skyk-hexTransition-hex-glow", s.hexGlow);
  root.style.setProperty("--skyk-hexTransition-scan-line", s.scanLine);
  root.style.setProperty("--skyk-hexTransition-text", s.text);
  root.style.setProperty("--skyk-hexTransition-progress-track", s.progressTrack);
  root.style.setProperty("--skyk-hexTransition-progress-fill", s.progressFill);
  root.style.setProperty("--logo-fade-ms", scaled(opt.timing.logoFadeMs, opt) + "ms");
}

function getViewportRect(target){
  const rect = target.getBoundingClientRect();
  return { width:Math.max(1, rect.width || global.innerWidth || 1), height:Math.max(1, rect.height || global.innerHeight || 1) };
}

function calcHexLayout(target, opt){
  const rect = getViewportRect(target);
  const maxColumns = isPcLayout() ? opt.layout.pcMaxColumns : opt.layout.mobileMaxColumns;
  const stepX = rect.width / Math.max(1, maxColumns);
  const hexW = stepX / 0.75;
  const hexH = hexW * Math.sqrt(3) / 2;
  const columns = Math.ceil(rect.width / stepX) + opt.layout.extraColumns;
  const rowsBase = Math.ceil(rect.height / hexH) + opt.layout.extraRows;
  return { rect, hexW, hexH, stepX, stepY:hexH, columns, rowsBase };
}

function createHexGrid(root, opt, filled){
  const layer = root.querySelector(".skyk-hexTransition-hexLayer");
  const layout = calcHexLayout(root.parentElement || document.body, opt);
  const hexes = [];
  layer.innerHTML = "";
  root.style.setProperty("--hex-w", layout.hexW + "px");
  root.style.setProperty("--hex-h", layout.hexH + "px");
  for(let col=0; col<layout.columns; col++){
    const shifted = col % 2 === 1;
    const rowCount = layout.rowsBase + (shifted ? 1 : 0);
    const yOffset = shifted ? -layout.hexH / 2 : 0;
    for(let row=0; row<rowCount; row++){
      const hex = document.createElement("div");
      hex.className = "skyk-hexTransition-hex";
      if(filled) hex.classList.add("is-filled");
      hex.dataset.col = String(col);
      hex.dataset.row = String(row);
      // 從畫面左側外緣開始鋪，避免第一列太右導致左側露出縫隙。
      hex.style.left = (col * layout.stepX - layout.hexW * 0.50) + "px";
      hex.style.top = (row * layout.stepY + yOffset - layout.hexH * 0.04) + "px";
      layer.appendChild(hex);
      hexes.push({ el:hex, col, row });
    }
  }
  return { layout, hexes };
}

function animateHexes(grid, opt, mode){
  const hexes = grid.hexes;
  const columns = Math.max(1, grid.layout.columns);
  const isFill = mode === "fill";
  const columnTotal = scaled(isFill ? opt.timing.leaveColumnTotalMs : opt.timing.enterColumnTotalMs, opt);
  const rowTotal = scaled(isFill ? opt.timing.leaveFillTotalMs : opt.timing.enterClearTotalMs, opt);
  const hexMs = scaled(isFill ? opt.timing.leaveHexMs : opt.timing.enterHexMs, opt);
  const columnDelay = columns <= 1 ? 0 : columnTotal / (columns - 1);
  let maxEnd = 0;
  for(let col=0; col<columns; col++){
    const inColumn = hexes.filter(item=>item.col === col).sort((a,b)=>a.row - b.row);
    const rowDelay = inColumn.length <= 1 ? 0 : rowTotal / (inColumn.length - 1);
    inColumn.forEach((item, rowIndex)=>{
      const delayMs = Math.round(col * columnDelay + rowIndex * rowDelay);
      maxEnd = Math.max(maxEnd, delayMs + hexMs);
      item.el.style.transition = "opacity " + hexMs + "ms ease, transform " + hexMs + "ms cubic-bezier(.18,.88,.28,1.08)";
      const id = global.setTimeout(()=>{ item.el.classList.toggle("is-filled", isFill); }, delayMs);
      runtime.timers.push(id);
    });
  }
  return maxEnd;
}

function createRoot(opt, filled, transparent){
  injectStyle();
  closeImmediate();
  const target = getTarget(opt.mountTarget);
  const root = document.createElement("div");
  root.className = "skyk-hexTransition";
  if(transparent) root.classList.add("is-transparent");
  applyStyleVars(root, opt);
  const hexLayer = document.createElement("div");
  hexLayer.className = "skyk-hexTransition-hexLayer";
  const uiLayer = document.createElement("div");
  uiLayer.className = "skyk-hexTransition-uiLayer";
  const fxLayer = document.createElement("div");
  fxLayer.className = "skyk-hexTransition-fxLayer";
  root.append(hexLayer, uiLayer, fxLayer);
  target.appendChild(root);
  runtime.root = root;
  runtime.hexLayer = hexLayer;
  runtime.uiLayer = uiLayer;
  runtime.fxLayer = fxLayer;
  runtime.progressFill = null;
  runtime.active = true;
  const grid = createHexGrid(root, opt, filled);
  return { root, target, grid };
}

function mountLoadingUI(opt){
  if(!runtime.uiLayer) return;
  runtime.uiLayer.innerHTML = "";
  const logo = document.createElement("img");
  logo.className = "skyk-hexTransition-logo";
  logo.alt = "崩界櫻雪";
  applyImage(logo, opt.image.logoName, opt.image.logoFolder);
  const loadingBox = document.createElement("div");
  loadingBox.className = "skyk-hexTransition-loadingBox";
  const loadingText = document.createElement("div");
  loadingText.className = "skyk-hexTransition-loadingText";
  loadingText.textContent = "SYSTEM LOADING";
  const track = document.createElement("div");
  track.className = "skyk-hexTransition-progressTrack";
  const fill = document.createElement("div");
  fill.className = "skyk-hexTransition-progressFill";
  track.appendChild(fill);
  loadingBox.append(loadingText, track);
  runtime.uiLayer.append(logo, loadingBox);
  runtime.progressFill = fill;
  requestAnimationFrame(()=>{ if(runtime.uiLayer) runtime.uiLayer.classList.add("is-visible"); });
}

function hideLoadingUI(){ if(runtime.uiLayer) runtime.uiLayer.classList.remove("is-visible"); }

function runFakeProgress(waitMs, opt){
  if(!runtime.progressFill || waitMs <= 0) return;
  let progress = 0;
  const start = Date.now();
  const tick = Math.max(40, scaled(opt.timing.progressTickMs, opt));
  function step(){
    if(!runtime.progressFill) return;
    const elapsed = Date.now() - start;
    const t = Math.min(1, elapsed / waitMs);
    const target = t < 0.82 ? 88 * (1 - Math.pow(1 - t, 2.2)) : 88 + (t - 0.82) / 0.18 * 12;
    const jitter = t < 0.80 ? Math.random() * 5 : Math.random() * 1.5;
    progress = Math.min(100, Math.max(progress, target + jitter));
    runtime.progressFill.style.width = progress.toFixed(1) + "%";
    if(t < 1){
      const id = global.setTimeout(step, tick + Math.random() * tick);
      runtime.timers.push(id);
    }else{
      runtime.progressFill.style.width = "100%";
    }
  }
  step();
}

function maybeSpawnBroccoli(waitMs, opt){
  if(!opt.broccoliCoin || waitMs <= 0) return;
  if(Math.random() > opt.broccoli.chance) return;
  if(!global.SKYKResourceDataSystem || typeof global.SKYKResourceDataSystem.addResources !== "function"){
    console.warn("[SKYKHexTransition] broccoliCoin 已啟用，但找不到 SKYKResourceDataSystem.addResources。");
    return;
  }
  const spawnAt = Math.random() * waitMs * 0.5;
  const id = global.setTimeout(()=>{ spawnBroccoli(opt); }, spawnAt);
  runtime.timers.push(id);
}

function getBroccoliSize(opt){
  const minSide = Math.max(1, Math.min(global.innerWidth || 1, global.innerHeight || 1));
  const rate = isPcLayout() ? opt.broccoli.pcSizeRate : opt.broccoli.mobileSizeRate;
  return Math.max(34, minSide * rate);
}

function spawnBroccoli(opt){
  if(!runtime.root || !runtime.fxLayer) return;
  const size = getBroccoliSize(opt);
  const viewportW = global.innerWidth || runtime.root.clientWidth || 1;
  const viewportH = global.innerHeight || runtime.root.clientHeight || 1;
  const leftMin = viewportW * opt.broccoli.safeLeftRate;
  const leftMax = viewportW * (1 - opt.broccoli.safeRightRate) - size;
  const topMin = viewportH * opt.broccoli.safeTopRate;
  const topMax = viewportH * (1 - opt.broccoli.safeBottomRate) - size;
  const left = randomBetween(leftMin, Math.max(leftMin, leftMax));
  const top = randomBetween(topMin, Math.max(topMin, topMax));
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "skyk-hexTransition-broccoli";
  btn.style.left = left + "px";
  btn.style.top = top + "px";
  btn.style.setProperty("--broccoli-size", size + "px");
  const img = document.createElement("img");
  img.alt = "broccoli coin";
  applyImage(img, opt.image.broccoliName, opt.image.broccoliFolder);
  btn.appendChild(img);
  runtime.fxLayer.appendChild(btn);
  let claimed = false;
  btn.addEventListener("click", event=>{
    event.preventDefault(); event.stopPropagation();
    if(claimed) return;
    claimed = true;
    claimBroccoli(btn, { left, top, size }, opt);
  });
  requestAnimationFrame(()=>{ btn.classList.add("is-visible"); });
}

async function claimBroccoli(btn, pos, opt){
  const size = pos.size;
  if(btn && btn.parentNode) btn.parentNode.removeChild(btn);
  const fx = document.createElement("div");
  fx.className = "skyk-hexTransition-broccoliFx";
  fx.style.left = pos.left + "px";
  fx.style.top = pos.top + "px";
  fx.style.setProperty("--broccoli-size", size + "px");
  fx.style.zIndex = "3000";
  const img = document.createElement("img");
  img.alt = "broccoli coin";
  applyImage(img, opt.image.broccoliName, opt.image.broccoliFolder);
  const plus = document.createElement("div");
  plus.className = "skyk-hexTransition-plusOne";
  plus.textContent = "+1";
  fx.append(img, plus);
  document.body.appendChild(fx);
  const jump = size * opt.broccoli.jumpHeightMultiplier;
  const deg = opt.broccoli.swingDeg;
  const animMs = Math.max(260, scaled(opt.broccoli.animMs, opt));
  fx.animate([
    { transform:"translate(0,0) rotate(0deg) scale(1)", opacity:1, offset:0 },
    { transform:"translate(0," + (-jump * .55) + "px) rotate(" + (-deg) + "deg) scale(1.08)", opacity:1, offset:.28 },
    { transform:"translate(0," + (-jump * .82) + "px) rotate(" + deg + "deg) scale(1.08)", opacity:1, offset:.52 },
    { transform:"translate(0," + (-jump) + "px) rotate(" + (-deg * .45) + "deg) scale(1.02)", opacity:1, offset:.72 },
    { transform:"translate(0," + (-jump * 1.08) + "px) rotate(0deg) scale(.65)", opacity:0, offset:1 }
  ], { duration:animMs, easing:"cubic-bezier(.18,.88,.28,1)" });
  try{
    await global.SKYKResourceDataSystem.addResources({ id:opt.broccoli.resourceId, amount:opt.broccoli.rewardAmount }, { reason:"hexTransitionBroccoliCoin" });
  }catch(error){
    console.warn("[SKYKHexTransition] 花菜幣寫入失敗：", error);
  }
  global.setTimeout(()=>{ if(fx.parentNode) fx.parentNode.removeChild(fx); }, animMs + 40);
}

async function leave(options={}){
  const opt = mergeOptions(options);
  const built = createRoot(opt, false, true);
  const totalMs = animateHexes(built.grid, opt, "fill");
  await delay(totalMs);
  if(typeof opt.onCovered === "function"){
    try{ opt.onCovered(); }catch(error){ console.error(error); }
  }
  if(typeof opt.onDone === "function"){
    try{ opt.onDone(); }catch(error){ console.error(error); }
  }
  return api;
}

async function enter(options={}){
  rememberEnterOptions(options);

  const opt = mergeOptions(options);
  const useUI = opt.ui !== false;
  if(!useUI) opt.broccoliCoin = false;
  const built = createRoot(opt, true, false);

  if(opt.bootCover){
    requestAnimationFrame(()=>removeBootCover(opt.bootCover));
  }

  let waitMs = 0;
  if(useUI){
    mountLoadingUI(opt);
    const rawWait = randomBetween(opt.timing.waitMinMs, opt.timing.waitMaxMs);
    waitMs = scaled(rawWait, opt);
    runFakeProgress(waitMs, opt);
    maybeSpawnBroccoli(waitMs, opt);
    await delay(waitMs);
    hideLoadingUI(opt);
    await delay(scaled(opt.timing.logoFadeMs, opt));
  }
  const clearMs = animateHexes(built.grid, opt, "clear");
  await delay(clearMs);
  closeImmediate();
  if(typeof opt.onDone === "function"){
    try{ opt.onDone(); }catch(error){ console.error(error); }
  }
  return api;
}

function closeImmediate(){
  clearTimers();
  if(runtime.root && runtime.root.parentNode) runtime.root.parentNode.removeChild(runtime.root);
  runtime = { root:null, hexLayer:null, uiLayer:null, fxLayer:null, progressFill:null, active:false, timers:[] };
}


/* ==================================================
   LinkAdapter
================================================== */

function isModifiedClick(event){
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function shouldIgnoreLink(anchor, event, opt){
  if(!anchor) return true;
  if(isModifiedClick(event)) return true;
  if(anchor.hasAttribute("download")) return true;

  const excludeSelector = opt.excludeSelector || "[data-no-transition]";
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

  if(opt.sameOrigin !== false && url.origin !== global.location.origin) return true;

  return false;
}

function mountLinkAdapter(options={}){
  unmountLinkAdapter();

  const opt = mergeOptions(Object.assign({
    preset:"quick",
    selector:"a",
    sameOrigin:true
  }, options || {}));

  const handler = async function(event){
    const target = event.target && event.target.closest ? event.target.closest(opt.selector || "a") : null;
    if(!target) return;
    if(shouldIgnoreLink(target, event, opt)) return;

    const href = target.href;
    if(!href) return;

    event.preventDefault();
    event.stopPropagation();

    try{
      await leave(opt);
    }catch(error){
      console.error("[SKYKHexTransition] LinkAdapter leave failed:", error);
    }

    global.location.href = href;
  };

  document.addEventListener("click", handler, true);

  linkAdapterRuntime = {
    mounted:true,
    handler,
    options:opt
  };

  return api;
}

function unmountLinkAdapter(){
  if(linkAdapterRuntime.handler){
    document.removeEventListener("click", linkAdapterRuntime.handler, true);
  }

  linkAdapterRuntime = {
    mounted:false,
    handler:null,
    options:null
  };

  return api;
}

const api = { enter, leave, closeImmediate, mountLinkAdapter, unmountLinkAdapter };
mountPageRestoreHandler();
global.SKYKHexTransition = api;

})(window);
