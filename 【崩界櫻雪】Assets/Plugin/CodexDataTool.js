/*
==================================================
CodexDataTool
版本：v1.0.0
==================================================

用途：
- Codex 系列頁面的共用資料工具。
- 本插件整合「路徑解析」與「JSON 運輸」。
- 它不負責把資料套進頁面。
- applyImportedData(data) 仍然應該留在各頁面本地。

核心定位：
- Path：決定 JSON 在哪裡。
- Json：負責把 JSON 搬進來 / 匯出去。
- Page：負責解釋 JSON 並套用到自己的 DOM。

==================================================
最重要的設計
==================================================

本工具支援兩種 JSON 入口：

1. directPath 直接指定路徑
   - 適合專屬工具。
   - 例如 GTA 地圖工具、素材工具、單用途編輯器。
   - 不需要 query，打開 HTML 就讀固定 JSON。

2. query / 同名 JSON 規則
   - 適合通用載體。
   - 例如首頁、CharacterData、DataPage。
   - 依網址 ?folder=xxx&json=yyy 決定資料來源。
   - 沒有 query 時，使用 HTML 同名 JSON。

路徑優先序：

1. directPath
2. ?folder=xxx&json=yyy
3. 目前 HTML 同名 JSON

==================================================
基本呼叫方式
==================================================

【通用頁面：走 query 或同名 JSON】

const path = CodexDataTool.resolveJsonPath();

CodexDataTool.loadJson(path).then(data=>{
  applyImportedData(data);
});

--------------------------------------------------

【專用工具：直接指定 JSON】

const path = CodexDataTool.resolveJsonPath({
  directPath:"91-Json區/工具json/GTA SanAndreas Marker.json"
});

CodexDataTool.loadJson(path).then(data=>{
  applyImportedData(data);
});

--------------------------------------------------

【自動載入：推薦寫法】

CodexDataTool.autoLoadJson({
  directPath:"",
  onLoaded:(data, meta)=>{
    applyImportedData(data);
  },
  onError:(err, meta)=>{
    console.warn("自動載入失敗", err, meta);
  }
});

若 directPath 為空，會自動走 query / 同名 JSON 規則。

--------------------------------------------------

【手動匯入】

async function importJSON(){
  const data = await CodexDataTool.importJsonFile();
  if(data) applyImportedData(data);
}

--------------------------------------------------

【匯出】

CodexDataTool.exportJsonFile(payload, "MyData.json");

==================================================
Path 區塊
==================================================

CodexDataTool.Path.joinPath(path, file)
- 組合路徑。
- 避免多一條 / 或少一條 /。

CodexDataTool.Path.getQueryParams()
- 讀取目前網址 query。
- 預設只回傳 folder / json。
- 回傳：{ folder, json }

CodexDataTool.Path.getDefaultJsonName()
- 用目前 HTML 檔名推導同名 JSON。
- 例：
  Codex Collapse Index.html
  →
  Codex Collapse Index.json

CodexDataTool.Path.resolveJsonPath(options)
- 決定自動載入路徑。
- options.directPath 有值時優先使用。
- 否則走 query / 同名 JSON。

==================================================
Json 區塊
==================================================

CodexDataTool.Json.load(path, options)
- fetch JSON。
- 回傳解析後的 data。
- file:// 環境下可能被瀏覽器 CORS / 安全規則阻擋。

CodexDataTool.Json.importFile(options)
- 開啟檔案選擇器。
- 讀取本地 JSON。
- 回傳解析後的 data。

CodexDataTool.Json.exportFile(data, filename, options)
- 下載 JSON 檔。
- 預設會 JSON.stringify(data, null, 2)。

CodexDataTool.Json.autoLoad(options)
- 解析路徑並自動載入。
- 成功呼叫 onLoaded(data, meta)。
- 失敗呼叫 onError(err, meta)。
- 預設不 alert，避免頁面一開就吵。

==================================================
短名 API
==================================================

以下是外層短名，等同於 Path / Json 底下方法：

CodexDataTool.joinPath()
CodexDataTool.getQueryParams()
CodexDataTool.getDefaultJsonName()
CodexDataTool.resolveJsonPath()

CodexDataTool.loadJson()
CodexDataTool.importJsonFile()
CodexDataTool.exportJsonFile()
CodexDataTool.autoLoadJson()

==================================================
建議頁面分工
==================================================

插件負責：

const path = CodexDataTool.resolveJsonPath();
const data = await CodexDataTool.loadJson(path);

頁面負責：

applyImportedData(data);

不要把 applyImportedData 寫進 CodexDataTool。
因為每個頁面的 JSON schema 和 DOM 結構都不同。

==================================================
*/

(function(global){
"use strict";

/* ==================================================
   Default Config
================================================== */

const DEFAULT_CONFIG = {
  queryKeys:{
    folder:"folder",
    json:"json"
  },

  defaultJsonFallback:"index.json",

  fetchOptions:{
    cache:"no-store"
  },

  exportIndent:2,

  debug:false
};

const state = {
  config:Object.assign({}, DEFAULT_CONFIG)
};

/* ==================================================
   Utility
================================================== */

function warn(){
  if(!state.config.debug) return;
  console.warn.apply(console, ["[CodexDataTool]"].concat(Array.from(arguments)));
}

function normalizeString(value){
  return String(value ?? "").trim();
}

function ensureJsonExtension(name){
  const n = normalizeString(name);
  if(!n) return "";
  return n.toLowerCase().endsWith(".json") ? n : n + ".json";
}

function stripLeadingSlash(value){
  return String(value || "").replace(/^\/+/, "");
}

function stripTrailingSlash(value){
  return String(value || "").replace(/\/+$/, "");
}

function cloneConfig(config){
  return JSON.parse(JSON.stringify(config));
}

/* ==================================================
   Config
================================================== */

function configure(options){
  if(!options || typeof options !== "object") return getConfig();

  if(options.queryKeys && typeof options.queryKeys === "object"){
    state.config.queryKeys = Object.assign({}, state.config.queryKeys, options.queryKeys);
  }

  if(options.fetchOptions && typeof options.fetchOptions === "object"){
    state.config.fetchOptions = Object.assign({}, state.config.fetchOptions, options.fetchOptions);
  }

  if(options.defaultJsonFallback != null){
    state.config.defaultJsonFallback = normalizeString(options.defaultJsonFallback) || DEFAULT_CONFIG.defaultJsonFallback;
  }

  if(options.exportIndent != null){
    const n = Number(options.exportIndent);
    state.config.exportIndent = Number.isFinite(n) ? n : DEFAULT_CONFIG.exportIndent;
  }

  if(options.debug != null){
    state.config.debug = !!options.debug;
  }

  return getConfig();
}

function getConfig(){
  return cloneConfig(state.config);
}

/* ==================================================
   Path Module
================================================== */

function joinPath(path, file){
  const p = stripTrailingSlash(normalizeString(path));
  const f = stripLeadingSlash(normalizeString(file));

  if(!f) return p;
  if(!p) return f;

  return p + "/" + f;
}

function joinUrlPath(path, file){
  return joinPath(path, file);
}

function getQueryParams(options={}){
  const queryKeys = Object.assign({}, state.config.queryKeys, options.queryKeys || {});

  const url = options.url
    ? new URL(options.url, window.location.href)
    : new URL(window.location.href);

  const folderKey = queryKeys.folder || "folder";
  const jsonKey = queryKeys.json || "json";

  const folder = normalizeString(url.searchParams.get(folderKey));
  const json = normalizeString(url.searchParams.get(jsonKey));

  return { folder, json };
}

function getDefaultJsonName(options={}){
  const pathname = options.pathname || window.location.pathname || "";
  const fallback = normalizeString(options.fallback || state.config.defaultJsonFallback || DEFAULT_CONFIG.defaultJsonFallback);

  const base = pathname.substring(pathname.lastIndexOf("/") + 1) || "";
  const decodedBase = decodeURIComponent(base || "");

  if(!decodedBase){
    return ensureJsonExtension(fallback);
  }

  const name = decodedBase.replace(/\.[^.]+$/, "") || decodedBase || fallback;
  return ensureJsonExtension(name);
}

function resolveJsonPath(options={}){
  const directPath = normalizeString(options.directPath);

  if(directPath){
    return directPath;
  }

  const params = getQueryParams(options);
  const jsonName = params.json
    ? ensureJsonExtension(params.json)
    : getDefaultJsonName(options);

  return joinUrlPath(params.folder, jsonName);
}

/* ==================================================
   Json Module
================================================== */

async function loadJson(path, options={}){
  const targetPath = normalizeString(path);

  if(!targetPath){
    throw new Error("CodexDataTool.loadJson 缺少 path。");
  }

  const fetchOptions = Object.assign(
    {},
    state.config.fetchOptions || {},
    options.fetchOptions || {}
  );

  const res = await fetch(targetPath, fetchOptions);

  if(!res.ok){
    throw new Error("HTTP " + res.status + " : " + targetPath);
  }

  return await res.json();
}

function importJsonFile(options={}){
  return new Promise((resolve, reject)=>{
    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.accept || "application/json,.json";

    input.onchange = ()=>{
      const file = input.files && input.files[0];

      if(!file){
        resolve(null);
        return;
      }

      const reader = new FileReader();

      reader.onload = ()=>{
        try{
          const data = JSON.parse(reader.result);
          resolve(data);
        }catch(err){
          reject(err);
        }
      };

      reader.onerror = ()=>{
        reject(reader.error || new Error("讀取 JSON 檔案失敗。"));
      };

      reader.readAsText(file, options.encoding || "utf-8");
    };

    input.click();
  });
}

function exportJsonFile(data, filename, options={}){
  const safeFilename = ensureJsonExtension(filename || options.filename || getDefaultJsonName());
  const indent = options.indent != null ? Number(options.indent) : state.config.exportIndent;
  const jsonText = typeof data === "string"
    ? data
    : JSON.stringify(data, null, Number.isFinite(indent) ? indent : 2);

  const blob = new Blob([jsonText], {
    type: options.type || "application/json;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = decodeURIComponent(safeFilename);

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>{
    URL.revokeObjectURL(url);
  }, options.revokeDelayMs || 1000);

  return safeFilename;
}

async function autoLoadJson(options={}){
  const path = resolveJsonPath(options);
  const meta = {
    path,
    source: options.directPath ? "directPath" : "resolvedPath"
  };

  if(!path){
    const err = new Error("CodexDataTool.autoLoadJson 無法解析 path。");

    if(typeof options.onError === "function"){
      options.onError(err, meta);
      return null;
    }

    throw err;
  }

  try{
    const data = await loadJson(path, options);

    if(typeof options.onLoaded === "function"){
      options.onLoaded(data, meta);
    }

    return data;
  }catch(err){
    warn("autoLoadJson 失敗：", err, meta);

    if(typeof options.onError === "function"){
      options.onError(err, meta);
      return null;
    }

    if(options.alertOnError){
      alert(`載入失敗：${path}\n${err}`);
      return null;
    }

    throw err;
  }
}

/* ==================================================
   Public API
================================================== */

const Path = {
  joinPath,
  joinUrlPath,
  getQueryParams,
  getDefaultJsonName,
  resolveJsonPath
};

const Json = {
  load:loadJson,
  importFile:importJsonFile,
  exportFile:exportJsonFile,
  autoLoad:autoLoadJson
};

const api = {
  configure,
  config:configure,
  getConfig,

  Path,
  Json,

  // Short aliases
  joinPath,
  joinUrlPath,
  getQueryParams,
  getDefaultJsonName,
  resolveJsonPath,

  loadJson,
  importJsonFile,
  exportJsonFile,
  autoLoadJson,

  ensureJsonExtension
};

global.CodexDataTool = api;

})(window);
