/* ==================================================
   CharacterSheetImporter.js
   Version : 1.01

   CharacterData v4 platform plugin.
   從 CharacterListSheet / C12-CharacterListSheet.json 抽取角色索引資料。

   負責：
   - 讀取 Sheet JSON（Auto / Manual）
   - 建立 Index Pool
   - 建立 Index Buffer
   - 名稱組裝
   - Branch 選取
   - Runtime 保存

   不負責：
   - CharacterData DOM 欄位寫入
   - Toolbar UI
   - alert 文案以外的頁面互動
   ================================================== */
(function(global){
  "use strict";

  const DEFAULT_AUTO_SHEET_PATH = "【崩界櫻雪】Assets/Registry/Collapse/CharacterSystem/C12-CharacterListSheet.json";

  const DEFAULT_RUNTIME = {
    indexPool:{},
    indexBuffer:null,
    indexSource:"",
    lastCharacterId:"",
    lastSheetData:null
  };

  function toText(value){
    return String(value ?? "").trim();
  }

  function cloneDefaultRuntime(){
    return {
      indexPool:{},
      indexBuffer:null,
      indexSource:"",
      lastCharacterId:"",
      lastSheetData:null
    };
  }

  function normalizeNameStyle(style){
    const s = toText(style).toLowerCase();
    if (s.includes("西") || s === "west" || s === "western") return "west";
    return "east";
  }

  function compactLang(text){
    return String(text ?? "").replace(/\s+/g, "");
  }

  function joinNameParts(style, source, langMode){
    const locale = normalizeNameStyle(style);
    const src = source || {};
    const order = locale === "west"
      ? ["first", "midlast", "last"]
      : ["last", "midlast", "first"];

    const parts = order
      .map(key => langMode ? compactLang(src[key]) : toText(src[key]))
      .filter(Boolean);

    if (langMode) return parts.join(" ");
    return parts.join(locale === "west" ? "・" : " ");
  }

  function replaceLastDigit(id, digit){
    const s = toText(id);
    if (!s) return "";
    return s.slice(0, -1) + String(digit ?? "");
  }

  function getActiveBranch(person){
    const branches = Array.isArray(person?.branches) ? person.branches : [];
    const activeId = toText(person?.activeBranchId);
    return branches.find(branch => toText(branch?.branchId) === activeId) || branches[0] || null;
  }

  function getProjectedBranch(character){
    const branches = character?.branches;
    if (!branches || Array.isArray(branches) || typeof branches !== "object") return null;

    const projectedId = toText(character?.projectedBranch);
    if (projectedId && branches[projectedId]) return branches[projectedId];

    const enabledIds = Array.isArray(character?.enabledBranches) ? character.enabledBranches : [];
    for (const id of enabledIds) {
      const branch = branches[toText(id)];
      if (branch?.enabled !== false) return branch;
    }

    return Object.keys(branches)
      .map(key => branches[key])
      .find(branch => branch?.enabled !== false) || null;
  }

  function getFlatValue(data, key, fallback){
    if (!data || typeof data !== "object") return fallback;
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : fallback;
  }

  function buildIndexPool(sheetData){
    const pool = {};

    const characters = Array.isArray(sheetData?.characters) ? sheetData.characters : [];
    characters.forEach(character => {
      const motherId = toText(character?.motherId || character?.key);
      if (!motherId) return;

      const branch = getProjectedBranch(character);
      if (!branch) return;

      const data = branch?.data && typeof branch.data === "object" ? branch.data : {};
      const branchId = toText(branch?.slot || character?.projectedBranch);
      const style = getFlatValue(data, "name.style", "東方式");
      const firstName = toText(getFlatValue(data, "name.first", ""));
      const nameSource = {
        first:getFlatValue(data, "name.first", ""),
        midlast:getFlatValue(data, "name.midlast", ""),
        last:getFlatValue(data, "name.last", "")
      };
      const readingSource = {
        first:getFlatValue(data, "reading.first", ""),
        midlast:getFlatValue(data, "reading.midlast", ""),
        last:getFlatValue(data, "reading.last", "")
      };
      const langSource = {
        first:getFlatValue(data, "lang.first", ""),
        midlast:getFlatValue(data, "lang.midlast", ""),
        last:getFlatValue(data, "lang.last", "")
      };

      const item = {
        id:motherId,
        branchId,
        name:firstName,
        fullname:joinNameParts(style, nameSource, false),
        nameRuby:joinNameParts(style, readingSource, false),
        nameTag:joinNameParts(style, langSource, true),
        settingLayer:getFlatValue(data, "meta.settingLayer", ""),
        computeLayer:getFlatValue(data, "meta.computeLayer", ""),
        generation:character?.era || getFlatValue(data, "meta.era", ""),
        dataYear:getFlatValue(data, "meta.year", ""),
        gender:getFlatValue(data, "bio.sex", ""),
        race:getFlatValue(data, "bio.race", ""),
        height:getFlatValue(data, "bio.height", ""),
        cupSize:getFlatValue(data, "bio.bust", ""),
        haircolor:getFlatValue(data, "bio.hair", ""),
        eyescolor:getFlatValue(data, "bio.eye", ""),
        birthday:getFlatValue(data, "age.bday", ""),
        idno:getFlatValue(data, "other.idno", ""),
        jsonTarget:toText(character?.RName) || `${motherId}-${firstName}`,
        picId:replaceLastDigit(motherId, toText(branch?.pictureSlot) || "1"),
        rawPerson:character,
        rawBranch:branch
      };

      pool[motherId] = item;
    });

    const people = Array.isArray(sheetData?.people) ? sheetData.people : [];

    people.forEach(person => {
      const containerId = toText(person?.containerId);
      if (!containerId) return;

      const branch = getActiveBranch(person);
      if (!branch) return;

      const branchId = toText(branch?.branchId || person?.activeBranchId);
      const style = branch?.name?.style || "東方式";
      const firstName = toText(branch?.name?.first);

      const item = {
        id:containerId,
        branchId,
        name:firstName,
        fullname:joinNameParts(style, branch?.name, false),
        nameRuby:joinNameParts(style, branch?.reading, false),
        nameTag:joinNameParts(style, branch?.lang, true),
        settingLayer:branch?.meta?.settingLayer || "",
        computeLayer:branch?.meta?.computeLayer || "",
        generation:branch?.meta?.era || "",
        dataYear:branch?.meta?.year ?? "",
        gender:branch?.bio?.sex || "",
        race:branch?.bio?.race || "",
        height:branch?.bio?.height ?? "",
        cupSize:branch?.bio?.bust || "",
        haircolor:branch?.bio?.hair || "",
        eyescolor:branch?.bio?.eye || "",
        birthday:branch?.age?.bday || "",
        idno:branch?.other?.idno || "",
        jsonTarget:`${containerId}-${firstName}`,
        picId:replaceLastDigit(containerId, "1"),
        rawPerson:person,
        rawBranch:branch
      };

      pool[containerId] = item;
      if (branchId) pool[branchId] = item;
    });

    return pool;
  }

  function create(options){
    const opt = Object.assign({
      autoSheetPath:DEFAULT_AUTO_SHEET_PATH,
      runtime:null,
      getCurrentCharacterId:null,
      importJsonFile:null,
      alertFn:null,
      onBufferChange:null,
      onError:null
    }, options || {});

    const runtime = opt.runtime || cloneDefaultRuntime();

    function say(message){
      if (typeof opt.alertFn === "function") opt.alertFn(message);
      else if (typeof global.alert === "function") global.alert(message);
      else console.log(message);
    }

    function getCurrentCharacterId(){
      if (typeof opt.getCurrentCharacterId === "function") return toText(opt.getCurrentCharacterId());
      return "";
    }

    function notifyBufferChange(meta){
      if (typeof opt.onBufferChange === "function") opt.onBufferChange(runtime, meta || {});
    }

    function handleError(error, meta){
      if (typeof opt.onError === "function") opt.onError(error, meta || {});
    }

    function applySheetDataToIndexPool(data, sourceLabel, characterId){
      const id = toText(characterId || getCurrentCharacterId());
      if (!id) {
        say("請先建立 / 填入角色ID，才能從總表抽值。");
        return null;
      }

      runtime.indexPool = buildIndexPool(data);
      runtime.indexBuffer = runtime.indexPool[id] || null;
      runtime.indexSource = sourceLabel || "Sheet";
      runtime.lastCharacterId = id;
      runtime.lastSheetData = data || null;

      notifyBufferChange({ type:"apply", id, source:runtime.indexSource });

      if (!runtime.indexBuffer) {
        say(`總表已讀取，但找不到角色ID：${id}`);
        return null;
      }

      say(`已抽取 ${runtime.indexSource}：${id} / ${runtime.indexBuffer.fullname || runtime.indexBuffer.name || "未命名"}`);
      return runtime.indexBuffer;
    }

    async function loadAuto(characterId){
      try {
        const id = toText(characterId || getCurrentCharacterId());
        if (!id) {
          say("請先建立 / 填入角色ID，才能從總表抽值。");
          return null;
        }

        const res = await fetch(opt.autoSheetPath, { cache:"no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return applySheetDataToIndexPool(data, "自動Sheet", id);
      } catch (error) {
        handleError(error, { type:"auto", path:opt.autoSheetPath });
        say("自動抽總表失敗，請改用手動表：\n" + error);
        return null;
      }
    }

    async function loadManual(characterId, importJsonFile){
      const importer = importJsonFile || opt.importJsonFile || global.CodexDataTool?.importJsonFile;
      if (typeof importer !== "function") {
        say("缺少 CodexDataTool，無法手動讀取 Sheet。");
        return null;
      }

      try {
        const id = toText(characterId || getCurrentCharacterId());
        if (!id) {
          say("請先建立 / 填入角色ID，才能從總表抽值。");
          return null;
        }

        const data = await importer.call(global.CodexDataTool || null);
        if (!data) return null;
        return applySheetDataToIndexPool(data, "手動Sheet", id);
      } catch (error) {
        handleError(error, { type:"manual" });
        say("手動表讀取失敗：\n" + error);
        return null;
      }
    }

    function setOptions(nextOptions){
      Object.assign(opt, nextOptions || {});
      return api;
    }

    function reset(){
      runtime.indexPool = {};
      runtime.indexBuffer = null;
      runtime.indexSource = "";
      runtime.lastCharacterId = "";
      runtime.lastSheetData = null;
      notifyBufferChange({ type:"reset" });
    }

    function getBufferValue(key){
      if (!runtime.indexBuffer) return undefined;
      return runtime.indexBuffer[key];
    }

    const api = {
      version:"1.01",
      DEFAULT_AUTO_SHEET_PATH,
      runtime,
      setOptions,
      reset,
      loadAuto,
      loadManual,
      applySheetDataToIndexPool,
      buildIndexPool,
      getActiveBranch,
      getProjectedBranch,
      joinNameParts,
      normalizeNameStyle,
      compactLang,
      replaceLastDigit,
      getBufferValue
    };

    return api;
  }

  const defaultImporter = create();

  global.CharacterSheetImporter = Object.assign(defaultImporter, {
    create,
    buildIndexPool,
    getActiveBranch,
    getProjectedBranch,
    joinNameParts,
    normalizeNameStyle,
    compactLang,
    replaceLastDigit
  });

})(window);
