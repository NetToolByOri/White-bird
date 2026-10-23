本獨立版只包含qr、vendor及core/shion-backup.js備份解碼器；不包含人事或假表資料庫插件。

# WorkBase 插件位置

本機伺服器、GitHub Pages、桌面 file 使用同一套相對路徑。工具 HTML 留在根目錄；本套插件只放 `【崩界櫻雪】Assets/Plugin/WorkBase/`，不使用其他 Plugin 內容或舊根目錄副本。

- core：共用使用者、資料結構、資料存取、精簡備份編碼及轉接器樣式。
- personnel：人事 Excel 插件。
- planner：手機介面、假面、Patch、數據導出／假卡。
- qr：通用 QR 搬運、掃描槍、圖片框選、辨識 Worker 及傳輸格式說明。
- paper-island：313 紙本姓名辨識，可整個不帶入。
- vendor：JSZip、Brotli離線壓縮、QR、PDF、影像解碼與雜湊第三方函式庫及授權文件。
- legacy：舊資料轉接插件。

修改用戶名稱／密碼的唯一檔案為 `【崩界櫻雪】Assets/Plugin/WorkBase/core/shion-users.js`。

各 HTML 與插件位置一併更新，不要只搬 JS。移到網站子路徑時保留相同的相對結構；網址使用 `/`，不使用 Windows 路徑的 `\`。

`sw.js` 是瀏覽器的離線服務程式，保留根目錄以涵蓋各工具頁面；它不是一般業務插件。manifest 同樣留在根目錄，圖示路徑已指向 WorkBase。

若封閉電腦不允許姓名辨識，整個 `WorkBase/paper-island/` 資料夾都可省略，或只省略其中大型 `paddle-assets.js`。313 的排假、島休手動登記、保存、數據導出、Patch 等照常使用；按到缺失的辨識功能時顯示「未載入，無法使用」。離線準備會略過缺失的姓名辨識資源，仍保存其餘工具。

載入仍是原有普通 script／必要的 file 備援，不改成只支援伺服器的 ES Modules。手機本機 HTML 執行能力仍依瀏覽器／檔案 App；不支援時用 HTTPS 快取版。
