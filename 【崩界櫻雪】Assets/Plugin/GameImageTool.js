/* GameImageTool.js
   共用圖片工具
   責任：
   1. 統一圖片路徑生成
   2. 支援 ang / png fallback
   3. 依本頁素材狀態自動切換優先副檔名
   4. 不持久化狀態，重新整理頁面後重新判斷
*/
(function(global){
  "use strict";

  const DEFAULT_CONFIG = {
    basePath: "Picture/IconImage",
    primaryExt: "ang",
    fallbackExt: "png",

    // auto：先以 primaryExt 嘗試；探測期若 primaryExt 連續失敗達門檻，切成 fallbackExt 優先。
    // primary：永遠 primaryExt 優先。
    // fallback：永遠 fallbackExt 優先。
    mode: "auto",

    // 探測期最多觀察幾張 primaryExt 的載入結果。
    probeLimit: 5,

    // 探測期內 primaryExt 失敗幾次後，切成 fallbackExt 優先。
    failThreshold: 3,

    // true：在 console 輸出模式切換訊息。
    debug: false
  };

  const state = {
    config: Object.assign({}, DEFAULT_CONFIG),
    preferFallback: false,
    probeLocked: false,
    probeCount: 0,
    primaryFailCount: 0,
    primarySuccessCount: 0
  };

  function normalizePathPart(value){
    return String(value || "").replace(/^\/+|\/+$/g, "");
  }

  function normalizeExt(ext){
    return String(ext || "").replace(/^\./, "");
  }

  function log(){
    if(!state.config.debug) return;
    console.log.apply(console, ["[GameImageTool]"].concat(Array.from(arguments)));
  }

  function configure(options){
    if(!options || typeof options !== "object") return getConfig();

    Object.assign(state.config, options);

    state.config.basePath = normalizePathPart(state.config.basePath);
    state.config.primaryExt = normalizeExt(state.config.primaryExt);
    state.config.fallbackExt = normalizeExt(state.config.fallbackExt);

    if(!["auto", "primary", "fallback"].includes(state.config.mode)){
      state.config.mode = DEFAULT_CONFIG.mode;
    }

    state.config.probeLimit = Math.max(1, Number(state.config.probeLimit) || DEFAULT_CONFIG.probeLimit);
    state.config.failThreshold = Math.max(1, Number(state.config.failThreshold) || DEFAULT_CONFIG.failThreshold);

    return getConfig();
  }

  function resetProbe(){
    state.preferFallback = false;
    state.probeLocked = false;
    state.probeCount = 0;
    state.primaryFailCount = 0;
    state.primarySuccessCount = 0;
  }

  function getConfig(){
    return Object.assign({}, state.config);
  }

  function getState(){
    return {
      preferFallback: state.preferFallback,
      probeLocked: state.probeLocked,
      probeCount: state.probeCount,
      primaryFailCount: state.primaryFailCount,
      primarySuccessCount: state.primarySuccessCount,
      config: getConfig()
    };
  }

  function getImagePath(name, ext, folder){
    const cleanFolder = normalizePathPart(folder || state.config.basePath);
    const cleanName = String(name || "");
    const cleanExt = normalizeExt(ext || state.config.primaryExt);

    if(!cleanName) return "";
    return `${cleanFolder}/${cleanName}.${cleanExt}`;
  }

  function getPreferredExt(){
    if(state.config.mode === "fallback") return state.config.fallbackExt;
    if(state.config.mode === "primary") return state.config.primaryExt;
    return state.preferFallback ? state.config.fallbackExt : state.config.primaryExt;
  }

  function getSecondaryExt(preferredExt){
    if(preferredExt === state.config.primaryExt) return state.config.fallbackExt;
    return state.config.primaryExt;
  }

  function recordPrimaryResult(isSuccess){
    if(state.config.mode !== "auto") return;
    if(state.probeLocked) return;

    state.probeCount += 1;

    if(isSuccess){
      state.primarySuccessCount += 1;
    }else{
      state.primaryFailCount += 1;
    }

    if(state.primaryFailCount >= state.config.failThreshold){
      state.preferFallback = true;
      state.probeLocked = true;
      log("primaryExt 探測失敗達門檻，切換為 fallback 優先", getState());
      return;
    }

    if(state.probeCount >= state.config.probeLimit){
      state.probeLocked = true;
      log("探測期結束，維持目前圖片優先策略", getState());
    }
  }

  function clearImage(imgElement){
    if(!imgElement) return;
    imgElement.onerror = null;
    imgElement.onload = null;
    imgElement.removeAttribute("src");
    delete imgElement.dataset.gameImageName;
    delete imgElement.dataset.gameImageFolder;
    delete imgElement.dataset.gameImageExt;
    delete imgElement.dataset.gameImageFallbackTried;
  }

  function applyImage(imgElement, name, options){
    if(!imgElement) return;

    const opts = options && typeof options === "object" ? options : {};
    const folder = opts.folder || state.config.basePath;
    const imageName = String(name || "");

    imgElement.onerror = null;
    imgElement.onload = null;

    if(!imageName){
      clearImage(imgElement);
      return;
    }

    const preferredExt = normalizeExt(opts.ext || getPreferredExt());
    const secondaryExt = normalizeExt(opts.fallbackExt || getSecondaryExt(preferredExt));
    const preferredPath = getImagePath(imageName, preferredExt, folder);
    const secondaryPath = secondaryExt ? getImagePath(imageName, secondaryExt, folder) : "";

    imgElement.dataset.gameImageName = imageName;
    imgElement.dataset.gameImageFolder = normalizePathPart(folder);
    imgElement.dataset.gameImageExt = preferredExt;
    imgElement.dataset.gameImageFallbackTried = "0";

    imgElement.onload = function(){
      if(preferredExt === state.config.primaryExt && imgElement.dataset.gameImageFallbackTried === "0"){
        recordPrimaryResult(true);
      }
    };

    imgElement.onerror = function(){
      const isPrimaryAttempt = preferredExt === state.config.primaryExt && imgElement.dataset.gameImageFallbackTried === "0";

      if(isPrimaryAttempt){
        recordPrimaryResult(false);
      }

      if(imgElement.dataset.gameImageFallbackTried === "1" || !secondaryPath){
        return;
      }

      imgElement.dataset.gameImageFallbackTried = "1";
      imgElement.dataset.gameImageExt = secondaryExt;
      imgElement.src = secondaryPath;
    };

    imgElement.src = preferredPath;
  }

  function applyIconPath(imgElement, iconName, options){
    const opts = Object.assign({ folder: state.config.basePath }, options || {});
    applyImage(imgElement, iconName, opts);
  }

  function applyMappedImages(root, options){
    const scope = root && root.querySelectorAll ? root : document;
    const images = scope.querySelectorAll("img[data-icon-id], img[data-image-name]");

    images.forEach(img => {
      const name = img.dataset.iconId || img.dataset.imageName;
      const folder = img.dataset.imageFolder || (options && options.folder) || state.config.basePath;
      applyImage(img, name, Object.assign({}, options || {}, { folder }));
    });
  }

  configure(DEFAULT_CONFIG);

  global.GameImageTool = {
    configure,
    config: configure,
    getConfig,
    getState,
    resetProbe,
    getImagePath,
    applyImage,
    applyIconPath,
    applyMappedImages,
    clearImage
  };
})(window);
