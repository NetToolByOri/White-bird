/* ==================================================
SSSnakeMover_Lock.js 嘶嘶鎖 v0.01

臨時停用 SSSnakeMover。 保留 window.SSSnakeMover.open() 接口，
現有蛇蛇按鈕無須修改。

按下後只顯示 Toast： 「🐍：目前嘶嘶蛇搬家停業中」
================================================== */ (function(){ “use
strict”;

const TOAST_ID = “SSSnakeMoverLockToast”; const STYLE_ID =
“SSSnakeMoverLockStyle”;

function injectStyle(){ if(document.getElementById(STYLE_ID)) return;

const style = document.createElement(“style”); style.id = STYLE_ID;
style.textContent =
#${TOAST_ID}{   position:fixed;   left:50%;   bottom:max(24px,env(safe-area-inset-bottom));   z-index:9999;   max-width:min(88vw,420px);   padding:11px 16px;   border:1px solid rgba(160,230,255,.30);   border-radius:12px;   background:linear-gradient(180deg,rgba(18,28,42,.98),rgba(9,14,24,.98));   box-shadow:0 10px 30px rgba(0,0,0,.52),0 0 22px rgba(80,190,255,.14);   color:#dff7ff;   font:900 14px/1.45 system-ui,"Noto Sans TC",sans-serif;   text-align:center;   pointer-events:none;   opacity:0;   transform:translate(-50%,12px);   transition:opacity .18s ease,transform .18s ease; } #${TOAST_ID}.sssl-show{   opacity:1;   transform:translate(-50%,0); };
document.head.appendChild(style); }

let hideTimer = 0;

function showToast(message){ injectStyle();

let toast = document.getElementById(TOAST_ID); if(!toast){ toast =
document.createElement(“div”); toast.id = TOAST_ID;
toast.setAttribute(“role”,“status”);
toast.setAttribute(“aria-live”,“polite”);
document.body.appendChild(toast); }

toast.textContent = message; toast.classList.remove(“sssl-show”);

void toast.offsetWidth; toast.classList.add(“sssl-show”);

clearTimeout(hideTimer); hideTimer = window.setTimeout(()=>{
toast.classList.remove(“sssl-show”); },2200); }

const SSSnakeMoverLock = { version:“0.01-lock”, locked:true,

open(){ showToast(“🐍：目前嘶嘶蛇搬家停業中”); },

close(){ // 嘶嘶蛇沒有開門，因此也沒有門可以關。 },

register(){ // 停業期間不接受新的搬家委託。 return false; },

showToast };

// 覆蓋舊插件的全域接口，既有按鈕仍可照常呼叫 open()。
window.SSSnakeMover = SSSnakeMoverLock; window.SSSnakeLock =
SSSnakeMoverLock;

})();
