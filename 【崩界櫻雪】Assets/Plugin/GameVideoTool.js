/* GameVideoTool.js
   共用影片工具
   責任：
   1. 統一影片路徑生成
   2. 支援 ap4 / mp4 fallback
   3. 依本頁影片素材狀態自動切換優先副檔名
   4. 與 GameImageTool 狀態完全獨立
   5. 不持久化狀態，重新整理頁面後重新判斷
*/
(function(global){
  "use strict";

  const DEFAULT_CONFIG = {
    basePath: "Video",
    primaryExt: "ap4",
    fallbackExt: "mp4",

    // auto：先以 primaryExt 嘗試；探測期若 primaryExt 失敗達門檻，切成 fallbackExt 優先。
    // primary：永遠 primaryExt 優先。
    // fallback：永遠 fallbackExt 優先。
    mode: "auto",

    // 探測期最多觀察幾支 primaryExt 的載入結果。
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
    console.log.apply(console, ["[GameVideoTool]"].concat(Array.from(arguments)));
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

  function getVideoPath(name, ext, folder){
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
      log("探測期結束，維持目前影片優先策略", getState());
    }
  }

  function clearVideo(videoElement){
    if(!videoElement) return;

    videoElement.onerror = null;
    videoElement.onloadeddata = null;
    videoElement.removeAttribute("src");

    delete videoElement.dataset.gameVideoName;
    delete videoElement.dataset.gameVideoFolder;
    delete videoElement.dataset.gameVideoExt;
    delete videoElement.dataset.gameVideoFallbackTried;

    if(typeof videoElement.load === "function"){
      videoElement.load();
    }
  }

  function applyVideo(videoElement, name, options){
    if(!videoElement) return;

    const opts = options && typeof options === "object" ? options : {};
    const folder = opts.folder || state.config.basePath;
    const videoName = String(name || "");

    videoElement.onerror = null;
    videoElement.onloadeddata = null;

    if(!videoName){
      clearVideo(videoElement);
      return;
    }

    const preferredExt = normalizeExt(opts.ext || getPreferredExt());
    const secondaryExt = normalizeExt(opts.fallbackExt || getSecondaryExt(preferredExt));
    const preferredPath = getVideoPath(videoName, preferredExt, folder);
    const secondaryPath = secondaryExt ? getVideoPath(videoName, secondaryExt, folder) : "";

    videoElement.dataset.gameVideoName = videoName;
    videoElement.dataset.gameVideoFolder = normalizePathPart(folder);
    videoElement.dataset.gameVideoExt = preferredExt;
    videoElement.dataset.gameVideoFallbackTried = "0";

    videoElement.onloadeddata = function(){
      if(preferredExt === state.config.primaryExt && videoElement.dataset.gameVideoFallbackTried === "0"){
        recordPrimaryResult(true);
      }
    };

    videoElement.onerror = function(){
      const isPrimaryAttempt = preferredExt === state.config.primaryExt && videoElement.dataset.gameVideoFallbackTried === "0";

      if(isPrimaryAttempt){
        recordPrimaryResult(false);
      }

      if(videoElement.dataset.gameVideoFallbackTried === "1" || !secondaryPath){
        return;
      }

      videoElement.dataset.gameVideoFallbackTried = "1";
      videoElement.dataset.gameVideoExt = secondaryExt;
      videoElement.src = secondaryPath;

      if(typeof videoElement.load === "function"){
        videoElement.load();
      }
    };

    videoElement.src = preferredPath;

    if(typeof videoElement.load === "function"){
      videoElement.load();
    }
  }

  function applyMappedVideos(root, options){
    const scope = root && root.querySelectorAll ? root : document;
    const videos = scope.querySelectorAll("video[data-video-name]");

    videos.forEach(video => {
      const name = video.dataset.videoName;
      const folder = video.dataset.videoFolder || (options && options.folder) || state.config.basePath;
      applyVideo(video, name, Object.assign({}, options || {}, { folder }));
    });
  }

  configure(DEFAULT_CONFIG);

  global.GameVideoTool = {
    configure,
    config: configure,
    getConfig,
    getState,
    resetProbe,
    getVideoPath,
    applyVideo,
    applyMappedVideos,
    clearVideo
  };
})(window);
