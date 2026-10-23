/* ==================================================
   SSSnakeMover.js
   嘶嘶蛇搬家插件 v0.01

   系統級插件彈窗 z-index:9105
   用途：DoubleS / SatiaService 系列 localStorage 匯出與還原。
   定位：搬家公司，只搬資料，不理解工具內部內容。
================================================== */
(function(){
"use strict";

const SSSnakeMover = {
  version:"0.01",
  zIndex:9105,

  paths:{
    restoreRoot:"【崩界櫻雪】Assets/Registry/SatiaService/SS localstorage restore/",
    workspaceRoot:"【崩界櫻雪】Assets/Registry/SatiaService/SS Workspace/",
    jszip:"【崩界櫻雪】Assets/Plugin/jszip.min.js"
  },

  workspace:{
    id:"Workspace",
    title:"SS Workspace 工作站",
    badge:"⭐",
    ns:"OracleShion:DoubleS:Workspace",
    fileListKey:"OracleShion:DoubleS:Workspace:FileList",
    fileName:"SS_Workspace"
  },

  registry:[
    {
      id:"Ledger",
      title:"SS Ledger 帳本",
      badge:"📒",
      namespace:"OracleShion:DoubleS:Ledger",
      keys:["OracleShion:DoubleS:Ledger:MainData"],
      file:"Ledger.json"
    }
  ],

  _root:null,
  _view:"home",
  _result:[],

  open(){
    this._ensureRoot();
    this._root.classList.add("sssm-open");
    this._renderHome();
  },

  close(){
    if(this._root) this._root.classList.remove("sssm-open");
  },

  register(item){
    if(!item || !item.id || !item.namespace || !item.file) return false;
    const exists = this.registry.some(x=>x.id === item.id || x.namespace === item.namespace);
    if(exists) return false;
    this.registry.push(item);
    return true;
  },

  _ensureRoot(){
    if(this._root) return;

    this._injectStyle();

    const root = document.createElement("div");
    root.id = "SSSnakeMoverRoot";
    root.className = "sssm-root";
    root.innerHTML = `
      <div class="sssm-backdrop" data-sssm-close="1"></div>
      <section class="sssm-card" role="dialog" aria-modal="true" aria-label="嘶嘶蛇搬家">
        <div class="sssm-title">
          <span class="sssm-title-icon">🐍📦</span>
          <span class="sssm-title-text">嘶嘶蛇搬家</span>
        </div>
        <div class="sssm-body"></div>
      </section>
    `;
    document.body.appendChild(root);
    root.addEventListener("click", e=>{
      if(e.target.closest("[data-sssm-close]")) this.close();
      const action = e.target.closest("[data-sssm-action]")?.dataset?.sssmAction;
      if(action) this._handleAction(action, e);
    });
    this._root = root;
  },

  _body(){
    return this._root.querySelector(".sssm-body");
  },

  _toolRows(){
    const workspace = `<div class="sssm-tool-row"><span>${this.workspace.badge}</span><span>${this.workspace.title}</span><small>${this._hasWorkspaceFileList() ? "已有表頭" : "未偵測"}</small></div>`;
    const rows = this.registry.map(item=>{
      const count = this._collectKeys(item).length;
      return `<div class="sssm-tool-row"><span>${item.badge || "📦"}</span><span>${this._escape(item.title || item.id)}</span><small>${count ? "已有 "+count+" 項" : "未偵測"}</small></div>`;
    }).join("");
    return workspace + rows;
  },

  _renderHome(){
    this._view = "home";
    this._body().innerHTML = `
      <div class="sssm-note">已註冊工具</div>
      <div class="sssm-tool-list">${this._toolRows()}</div>
      <div class="sssm-actions">
        <button class="sssm-btn sssm-green" data-sssm-action="export-menu">匯出資料</button>
        <button class="sssm-btn sssm-red" data-sssm-action="restore-confirm">還原資料</button>
        <button class="sssm-btn" data-sssm-close="1">取消</button>
      </div>
    `;
  },

  _renderExportMenu(){
    this._view = "export";
    this._body().innerHTML = `
      <div class="sssm-note">選擇要匯出的資料類型</div>
      <div class="sssm-actions sssm-stack">
        <button class="sssm-btn sssm-green" data-sssm-action="export-workspace">匯出 SS Workspace</button>
        <button class="sssm-btn sssm-green" data-sssm-action="export-registered">匯出其餘資料</button>
        <button class="sssm-btn" data-sssm-action="home">返回</button>
      </div>
    `;
  },

  _renderRestoreConfirm(){
    this._view = "restore";
    this._body().innerHTML = `
      <div class="sssm-warning">
        <strong>⚠️ 還原資料</strong>
        <p>本功能會將 JSON 資料還原至 localStorage 內，可能覆蓋現有資料。</p>
        <p>如果現有 localStorage 的時間戳比較新，會逐項詢問是否覆蓋。</p>
      </div>
      <div class="sssm-actions">
        <button class="sssm-btn sssm-red" data-sssm-action="restore-start">選擇 ZIP / JSON 還原</button>
        <button class="sssm-btn" data-sssm-action="home">取消</button>
      </div>
    `;
  },

  _renderResult(title, rows){
    this._view = "result";
    const html = rows.map(r=>{
      const icon = r.ok ? "✓" : "×";
      const cls = r.ok ? "ok" : "bad";
      return `<div class="sssm-result-row ${cls}"><span>${icon}</span><div><b>${this._escape(r.title)}</b><small>${this._escape(r.message || "")}</small></div></div>`;
    }).join("");
    this._body().innerHTML = `
      <div class="sssm-note">${this._escape(title)}</div>
      <div class="sssm-result-list">${html || `<div class="sssm-empty">沒有結果</div>`}</div>
      <div class="sssm-actions">
        <button class="sssm-btn sssm-green" data-sssm-action="home">完成</button>
      </div>
    `;
  },

  async _handleAction(action){
    try{
      if(action === "home") return this._renderHome();
      if(action === "export-menu") return this._renderExportMenu();
      if(action === "restore-confirm") return this._renderRestoreConfirm();
      if(action === "export-workspace") return await this.exportWorkspace();
      if(action === "export-registered") return await this.exportRegistered();
      if(action === "restore-start") return await this.restoreFromFilePicker();
    }catch(e){
      console.error("[SSSnakeMover]", e);
      this._renderResult("執行失敗", [{ title:"嘶嘶蛇搬家", ok:false, message:e?.message || String(e) }]);
    }
  },

  async _ensureJSZip(){
    if(window.JSZip) return window.JSZip;
    await new Promise((resolve, reject)=>{
      const s = document.createElement("script");
      s.src = this.paths.jszip;
      s.onload = resolve;
      s.onerror = ()=>reject(new Error("缺少 jszip.min.js，無法打包或讀取 ZIP。"));
      document.head.appendChild(s);
    });
    if(!window.JSZip) throw new Error("JSZip 載入失敗。");
    return window.JSZip;
  },

  async exportWorkspace(){
    const JSZip = await this._ensureJSZip();
    const zip = new JSZip();
    const rawList = localStorage.getItem(this.workspace.fileListKey);
    if(!rawList){
      this._renderResult("Workspace 匯出結果", [{ title:this.workspace.title, ok:false, message:"找不到 FileList 表頭。" }]);
      return;
    }

    let fileList;
    try{ fileList = JSON.parse(rawList); }
    catch(e){ throw new Error("Workspace FileList 不是有效 JSON。"); }

    const snapshot = this._workspaceSnapshot(fileList);
    zip.file("FileList.json", JSON.stringify(snapshot, null, 2));

    let count = 0;
    let missing = 0;
    const files = Array.isArray(snapshot.files) ? snapshot.files : [];
    for(const file of files){
      const uuid = file && file.uuid;
      if(!uuid){ missing++; continue; }
      const raw = localStorage.getItem(this.workspace.ns + ":" + uuid);
      if(!raw){ missing++; continue; }
      try{
        const data = JSON.parse(raw);
        data.uuid = data.uuid || uuid;
        data.type = data.type || file.type || "note";
        data.title = data.title || file.title || "未知文件";
        zip.file(`${uuid}.json`, JSON.stringify(data, null, 2));
        count++;
      }catch(e){
        missing++;
      }
    }

    const blob = await zip.generateAsync({ type:"blob" });
    this._downloadBlob(blob, this._workspaceZipName());

    this._renderResult("Workspace 匯出完成", [
      { title:this.workspace.title, ok:true, message:`已打包 FileList 與 ${count} 個物件。${missing ? "略過 "+missing+" 個缺少資料的表頭。" : ""}` }
    ]);
  },

  async exportRegistered(){
    const JSZip = await this._ensureJSZip();
    const zip = new JSZip();
    const rows = [];

    for(const item of this.registry){
      const payload = this._buildRegisteredPayload(item);
      if(!payload.items.length){
        rows.push({ title:item.title || item.id, ok:false, message:"沒有找到可匯出的 localStorage。" });
        continue;
      }
      zip.file(item.file, JSON.stringify(payload, null, 2));
      rows.push({ title:item.title || item.id, ok:true, message:`已寫入 ${item.file}，共 ${payload.items.length} 項。` });
    }

    const hasAny = rows.some(r=>r.ok);
    if(hasAny){
      const blob = await zip.generateAsync({ type:"blob" });
      this._downloadBlob(blob, this._restoreZipName());
    }

    this._renderResult(hasAny ? "匯出完成" : "沒有資料可匯出", rows);
  },

  _buildRegisteredPayload(item){
    const keys = this._collectKeys(item);
    return {
      schema:"OracleShion.DoubleS.LocalStorageRestore",
      version:this.version,
      generatedAt:new Date().toISOString(),
      namespace:item.namespace,
      id:item.id,
      title:item.title || item.id,
      items:keys.map(key=>{
        const raw = localStorage.getItem(key);
        return {
          key,
          value:raw,
          meta:this._readMeta(raw)
        };
      })
    };
  },

  async restoreFromFilePicker(){
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip,.json,application/json,application/zip";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("change", async ()=>{
      const file = input.files && input.files[0];
      input.remove();
      if(!file) return;
      try{
        const rows = await this._restoreFile(file);
        this._renderResult("還原結果", rows);
      }catch(e){
        this._renderResult("還原失敗", [{ title:file.name, ok:false, message:e?.message || String(e) }]);
      }
    }, { once:true });

    input.click();
  },

  async _restoreFile(file){
    const name = file.name || "";
    if(name.toLowerCase().endsWith(".zip")){
      const JSZip = await this._ensureJSZip();
      const zip = await JSZip.loadAsync(file);
      return await this._restoreZip(zip);
    }

    const text = await file.text();
    const data = JSON.parse(text);
    return await this._restoreRegisteredPayload(data, file.name);
  },

  async _restoreZip(zip){
    const rows = [];

    // Workspace：只還原 FileList.json，不還原 uuid.json 到 localStorage。
    const fileListEntry = zip.file("FileList.json");
    if(fileListEntry){
      try{
        const text = await fileListEntry.async("text");
        const incoming = JSON.parse(text);
        const ok = await this._maybeWriteLocalStorage({
          key:this.workspace.fileListKey,
          value:JSON.stringify(incoming),
          incomingMeta:this._readMeta(JSON.stringify(incoming)),
          title:this.workspace.title + " / FileList"
        });
        rows.push({ title:this.workspace.title, ok, message: ok ? "已還原 FileList 表頭。uuid.json 保持靜態檔案，不寫回 localStorage。" : "已略過。" });
      }catch(e){
        rows.push({ title:this.workspace.title, ok:false, message:e?.message || String(e) });
      }
    }

    for(const item of this.registry){
      const entry = zip.file(item.file);
      if(!entry){
        rows.push({ title:item.title || item.id, ok:false, message:`找不到 ${item.file}` });
        continue;
      }
      try{
        const text = await entry.async("text");
        const payload = JSON.parse(text);
        const partRows = await this._restoreRegisteredPayload(payload, item.file, item);
        rows.push(...partRows);
      }catch(e){
        rows.push({ title:item.title || item.id, ok:false, message:e?.message || String(e) });
      }
    }

    return rows;
  },

  async _restoreRegisteredPayload(payload, sourceName, registryItem=null){
    if(!payload || !Array.isArray(payload.items)){
      throw new Error("Restore JSON 格式不正確。");
    }

    const title = payload.title || registryItem?.title || payload.id || sourceName;
    const rows = [];
    let okCount = 0;
    let skipCount = 0;

    for(const item of payload.items){
      if(!item || !item.key || typeof item.value !== "string"){
        skipCount++;
        continue;
      }

      const allowed = registryItem
        ? String(item.key).startsWith(registryItem.namespace + ":")
        : this.registry.some(r=>String(item.key).startsWith(r.namespace + ":"));

      if(!allowed){
        skipCount++;
        continue;
      }

      const ok = await this._maybeWriteLocalStorage({
        key:item.key,
        value:item.value,
        incomingMeta:item.meta || this._readMeta(item.value),
        title
      });
      if(ok) okCount++;
      else skipCount++;
    }

    rows.push({
      title,
      ok:okCount > 0,
      message:`已還原 ${okCount} 項。${skipCount ? "略過 "+skipCount+" 項。" : ""}`
    });
    return rows;
  },

  async _maybeWriteLocalStorage({key, value, incomingMeta, title}){
    const current = localStorage.getItem(key);
    if(current){
      const currentMeta = this._readMeta(current);
      const incomingTime = this._metaTime(incomingMeta);
      const currentTime = this._metaTime(currentMeta);

      if(currentTime && incomingTime && currentTime > incomingTime){
        const ok = await this._confirm(`${title}\n\n目前 localStorage 資料比較新。\n\n仍要覆蓋？`);
        if(!ok) return false;
      }
    }
    localStorage.setItem(key, value);
    return true;
  },

  _collectKeys(item){
    const keys = [];
    const explicit = Array.isArray(item.keys) ? item.keys : [];
    explicit.forEach(key=>{
      if(localStorage.getItem(key) != null) keys.push(key);
    });

    const prefix = item.namespace + ":";
    for(let i=0;i<localStorage.length;i++){
      const key = localStorage.key(i);
      if(!key || !key.startsWith(prefix)) continue;
      if(!keys.includes(key)) keys.push(key);
    }

    return keys.sort();
  },

  _hasWorkspaceFileList(){
    return localStorage.getItem(this.workspace.fileListKey) != null;
  },

  _workspaceSnapshot(fileList){
    const clone = JSON.parse(JSON.stringify(fileList || {}));
    const stamp = new Date().toISOString();
    clone.generatedAt = stamp;
    clone.files = Array.isArray(clone.files) ? clone.files.map(f=>{
      const out = Object.assign({}, f);
      const uuid = out.uuid;
      const raw = uuid ? localStorage.getItem(this.workspace.ns + ":" + uuid) : "";
      if(raw){
        try{
          const data = JSON.parse(raw);
          out.generatedAt = String(out.generatedAt || data.generatedAt || stamp);
        }catch(e){
          out.generatedAt = String(out.generatedAt || stamp);
        }
      }
      return out;
    }) : [];
    return clone;
  },

  _readMeta(raw){
    try{
      const obj = JSON.parse(raw);
      return {
        generatedAt:obj.generatedAt || obj.meta?.generatedAt || obj.meta?.exportedAt || "",
        updatedAt:obj.updatedAt || obj.meta?.updatedAt || "",
        exportedAt:obj.exportedAt || obj.meta?.exportedAt || ""
      };
    }catch(e){
      return {};
    }
  },

  _metaTime(meta){
    const list = [meta?.updatedAt, meta?.generatedAt, meta?.exportedAt].filter(Boolean);
    for(const x of list){
      const t = Date.parse(x);
      if(Number.isFinite(t) && t > 0) return t;
    }
    return 0;
  },

  _downloadBlob(blob, filename){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
  },

  _restoreZipName(){
    const d = new Date();
    const p = n=>String(n).padStart(2,"0");
    return `SS_localstorage_restore_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.zip`;
  },

  _workspaceZipName(){
    const d = new Date();
    const p = n=>String(n).padStart(2,"0");
    return `SS_Workspace_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.zip`;
  },

  _confirm(message){
    return new Promise(resolve=>{
      const prev = this._body().innerHTML;
      this._body().innerHTML = `
        <div class="sssm-warning">
          <strong>⚠️ 覆蓋確認</strong>
          <p>${this._escape(message).replace(/\n/g,"<br>")}</p>
        </div>
        <div class="sssm-actions">
          <button class="sssm-btn sssm-red" data-confirm="yes">覆蓋</button>
          <button class="sssm-btn" data-confirm="no">略過</button>
        </div>
      `;
      const handler = e=>{
        const btn = e.target.closest("[data-confirm]");
        if(!btn) return;
        this._root.removeEventListener("click", handler);
        const yes = btn.dataset.confirm === "yes";
        this._body().innerHTML = prev;
        resolve(yes);
      };
      this._root.addEventListener("click", handler);
    });
  },

  _escape(s){
    return String(s ?? "").replace(/[&<>"]/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));
  },

  _injectStyle(){
    if(document.getElementById("SSSnakeMoverStyle")) return;
    const style = document.createElement("style");
    style.id = "SSSnakeMoverStyle";
    style.textContent = `
#SSSnakeMoverRoot.sssm-root{
  position:fixed;
  inset:0;
  display:none;
  z-index:9105;
  align-items:center;
  justify-content:center;
  padding:14px;
  font-family:system-ui,"Noto Sans TC",sans-serif;
  color:#e8fbff;
}
#SSSnakeMoverRoot.sssm-open{display:flex;}
#SSSnakeMoverRoot .sssm-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.68);
  backdrop-filter:blur(3px);
}
#SSSnakeMoverRoot .sssm-card{
  position:relative;
  z-index:1;
  width:min(94vw,440px);
  max-height:min(86vh,680px);
  overflow:auto;
  border:1px solid rgba(160,230,255,.28);
  border-radius:16px;
  background:linear-gradient(180deg,rgba(18,28,42,.98),rgba(9,14,24,.98));
  box-shadow:0 16px 44px rgba(0,0,0,.62),0 0 28px rgba(80,190,255,.12);
  padding:12px;
}
#SSSnakeMoverRoot .sssm-title{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  padding:4px 4px 12px;
  font-weight:950;
  font-size:19px;
  color:#d8f4ff;
  text-shadow:0 0 10px rgba(110,210,255,.45);
}
#SSSnakeMoverRoot .sssm-title-icon{font-size:22px;}
#SSSnakeMoverRoot .sssm-note{
  color:#bfefff;
  font-size:13px;
  font-weight:800;
  margin:2px 0 8px;
  opacity:.9;
}
#SSSnakeMoverRoot .sssm-tool-list,
#SSSnakeMoverRoot .sssm-result-list{
  display:flex;
  flex-direction:column;
  gap:7px;
  margin-bottom:12px;
}
#SSSnakeMoverRoot .sssm-tool-row,
#SSSnakeMoverRoot .sssm-result-row{
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:center;
  gap:8px;
  padding:9px 10px;
  border:1px solid rgba(255,255,255,.10);
  border-radius:10px;
  background:rgba(255,255,255,.045);
}
#SSSnakeMoverRoot .sssm-tool-row small{
  color:#9bb0be;
  font-size:12px;
  white-space:nowrap;
}
#SSSnakeMoverRoot .sssm-result-row{
  grid-template-columns:28px minmax(0,1fr);
}
#SSSnakeMoverRoot .sssm-result-row.ok>span{color:#6de38d;font-weight:950;}
#SSSnakeMoverRoot .sssm-result-row.bad>span{color:#ff8d9a;font-weight:950;}
#SSSnakeMoverRoot .sssm-result-row b{
  display:block;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
}
#SSSnakeMoverRoot .sssm-result-row small{
  display:block;
  margin-top:2px;
  color:#9bb0be;
  line-height:1.45;
}
#SSSnakeMoverRoot .sssm-actions{
  display:flex;
  justify-content:flex-end;
  gap:8px;
  margin-top:12px;
}
#SSSnakeMoverRoot .sssm-actions.sssm-stack{
  flex-direction:column;
}
#SSSnakeMoverRoot .sssm-btn{
  min-height:40px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,.14);
  background:linear-gradient(135deg,#171d2a,#20283a);
  color:#e8fbff;
  padding:8px 12px;
  font:inherit;
  font-weight:900;
  cursor:pointer;
}
#SSSnakeMoverRoot .sssm-btn:hover{filter:brightness(1.08);}
#SSSnakeMoverRoot .sssm-btn:active{transform:translateY(1px);}
#SSSnakeMoverRoot .sssm-green{
  background:linear-gradient(135deg,#13261b,#183320);
  color:#caffdc;
  border-color:rgba(109,227,141,.38);
}
#SSSnakeMoverRoot .sssm-red{
  background:linear-gradient(135deg,#2a1518,#3a1b20);
  color:#ffd3d8;
  border-color:rgba(255,107,107,.42);
}
#SSSnakeMoverRoot .sssm-warning{
  padding:10px 12px;
  border-radius:12px;
  border:1px solid rgba(255,210,120,.28);
  background:rgba(120,80,10,.16);
  color:#ffe3a8;
  line-height:1.55;
}
#SSSnakeMoverRoot .sssm-warning p{
  margin:7px 0 0;
  color:#ffeac0;
}
#SSSnakeMoverRoot .sssm-empty{
  padding:16px;
  text-align:center;
  color:#9bb0be;
}
`;
    document.head.appendChild(style);
  }
};

window.SSSnakeMover = SSSnakeMover;
})();
