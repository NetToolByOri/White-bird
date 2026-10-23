# Brotli 離線壓縮插件

來源：https://github.com/httptoolkit/brotli-wasm ，npm brotli-wasm 3.0.1。
隨附 Apache-2.0 授權。來源pkg.web glue移除ES module匯出，明確提供內嵌WASM位元組；以Blob Worker執行，避免file模式fetch／ES module限制。壓縮quality11；解壓使用有輸出上限的串流。
原始WASM SHA-256：9ef0a025046bf7d87b7cdb8eac3f73a5c8fea2f1adb848cc9768345573fcd8a9
