(function(global){'use strict';
// 修改這張表即可調整帳號。密碼不會進入資料備份；id 請保持固定。
const USERS=[
 {id:'guest',emoji:'👤',name:'基礎用戶',password:'123456789'},
 {id:'satia',emoji:'🥦',name:'花椰菜',password:'satia'},
 {id:'bird',emoji:'🐦',name:'青鳥',password:'bird'},
 {id:'whitebird',emoji:'🕊️',name:'白鳥',password:'dove'},
 {id:'sheep',emoji:'🐑',name:'綿羊',password:'sheep'},
 {id:'snake',emoji:'🐍',name:'蛇蛇',password:'susu'},
 {id:'clover',emoji:'🍀',name:'幸運草',password:'clover'},
 {id:'tea',emoji:'🍁',name:'楓葉',password:'tea'},
 {id:'lion',emoji:'🦁',name:'獅子',password:'lion'},
 {id:'tree',emoji:'🌲',name:'松樹',password:'tree'},
 {id:'whale',emoji:'🐋',name:'藍鯨',password:'whale'},
 {id:'helicopter',emoji:'🚁',name:'旋翼',password:'heli'}
];
const KEY='OracleShion:CurrentUser:v3';let memory=null,dialog,bar,resolveLogin=[],identityDB=null;const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('OracleShion:User:v3'):null;
const publicUser=u=>u?{id:u.id,emoji:u.emoji,name:u.name}:null;
function current(){let id=memory;if(!identityDB)try{id=localStorage.getItem(KEY)}catch{}return publicUser(USERS.find(u=>u.id===id));}
function persist(){if(identityDB){const tx=identityDB.transaction('session','readwrite');tx.objectStore('session').put({key:'current',id:memory});}channel?.postMessage(memory);}
function emit(){refresh();global.dispatchEvent(new CustomEvent('shion-user-changed',{detail:current()}));}
function login(password){const matches=USERS.filter(u=>u.password&&u.password===String(password));if(matches.length!==1)throw Error(matches.length?'帳號密碼重複，請修改 shion-users.js':'密碼不正確');memory=matches[0].id;try{localStorage.setItem(KEY,memory)}catch{}persist();if(dialog?.open)dialog.close();emit();resolveLogin.splice(0).forEach(r=>r(current()));return current();}
function logout(){memory=null;try{localStorage.removeItem(KEY)}catch{}persist();emit();}
function show(){mount();dialog.querySelector('input').value='';dialog.querySelector('[data-error]').textContent='';if(!dialog.open)dialog.showModal();dialog.querySelector('input').focus();}
function refresh(){const u=current();document.querySelectorAll('[data-shion-identity]').forEach(el=>el.textContent=u?u.emoji+' '+u.name:'👤 尚未登入');if(!bar)return;bar.querySelector('[data-user]').textContent=u?u.emoji+' '+u.name:'👤 尚未登入';bar.querySelector('[data-logout]').hidden=!u;}
function mount(){if(dialog)return;const style=document.createElement('style');style.textContent='.shion-userbar{position:fixed;right:10px;bottom:10px;z-index:1900;display:flex;align-items:center;gap:6px;padding:5px 8px;background:#182738;color:#e6f3ff;border:1px solid #526c85;border-radius:8px;font:12px system-ui}.shion-userbar button{padding:5px 7px;background:#263e55;color:#fff;border:1px solid #68839c;border-radius:5px;cursor:pointer}.shion-login{z-index:2147483001;width:min(400px,92vw);padding:22px;background:#172635;color:#edf6ff;border:1px solid #68839c;border-radius:12px;font:15px system-ui}.shion-login::backdrop{background:#080e18cc}.shion-login input{box-sizing:border-box;width:100%;padding:12px;background:#0b1724;color:white;border:1px solid #68839c;border-radius:7px}.shion-login button{padding:10px 14px;margin:12px 6px 0 0;background:#2d5679;color:white;border:1px solid #68839c;border-radius:7px}.shion-login [data-error]{min-height:22px;color:#ffb2b2;margin-top:8px}@media print{.shion-userbar,.shion-login{display:none!important}}';document.head.append(style);bar=document.createElement('div');bar.className='shion-userbar';bar.innerHTML='<span data-user></span><button type="button" data-switch>登入／切換</button><button type="button" data-logout>登出</button>';if(decodeURIComponent(location.pathname).split('/').pop().startsWith('310-'))document.body.append(bar);bar.querySelector('[data-switch]').onclick=show;bar.querySelector('[data-logout]').onclick=logout;dialog=document.createElement('dialog');dialog.className='shion-login';dialog.innerHTML='<form><h2>操作身分</h2><p>輸入密碼後，所有工具會共用這個身分。</p><input type="password" autocomplete="current-password" aria-label="操作身分密碼"><div data-error role="status"></div><button type="submit">登入</button><button type="button" data-cancel>取消</button></form>';document.body.append(dialog);dialog.querySelector('form').onsubmit=e=>{e.preventDefault();try{login(dialog.querySelector('input').value)}catch(error){dialog.querySelector('[data-error]').textContent=error.message;}};dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();refresh();}
async function requireLogin(){await ready;if(current())return Promise.resolve(current());show();return new Promise(resolve=>resolveLogin.push(resolve));}
const ready=new Promise(resolve=>{try{const request=indexedDB.open('OracleShion:Identity',1);request.onupgradeneeded=()=>request.result.createObjectStore('session',{keyPath:'key'});request.onerror=()=>resolve();request.onsuccess=()=>{identityDB=request.result;const r=identityDB.transaction('session').objectStore('session').get('current');r.onsuccess=()=>{memory=r.result?.id||null;refresh();resolve();};r.onerror=()=>resolve();};}catch{resolve()}});if(channel)channel.onmessage=e=>{memory=e.data;emit();};
document.addEventListener('click',e=>{if(e.target.closest('[data-shion-switch]'))show()});
global.ShionUsers={ready,revision:'20261010-users-v4',current,login,logout,show,requireLogin,list:()=>USERS.map(publicUser)};
global.addEventListener('storage',e=>{if(e.key===KEY)emit()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
}(window));
