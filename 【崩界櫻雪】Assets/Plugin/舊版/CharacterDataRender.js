// === 基本資訊渲染模組 start ===
(function RenderBasicModule(){
  const container = document.getElementById("Render-basic");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  const FIELD_META = {
    'basic.fullname':  { label: '全名' },
    'basic.nameRuby':  { label: '讀音' },
    'basic.nameTag':   { label: '語系' },    
    'basic.gender':    { label: '性別' },
    'basic.race':      { label: '種族' },
    'basic.height':    { label: '身高' },
    'basic.cupSize':   { label: '胸圍' },
    'basic.haircolor': { label: '髮色' },
    'basic.eyescolor': { label: '瞳色' },
    'basic.birthday':  { label: '生日' },
  };

  function getByPath(obj, path){
    return path.split('.').reduce((o,k)=>o?.[k], obj);
  }
    // —— 年齡計算（與你原函式等價）——
  function _parseBirthday(str){
    if (typeof str !== 'string') return null;
    const m = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || (dt.getMonth()+1) !== mo || dt.getDate() !== d) return null;
    return dt;
  }
  function _parseDataYear(val){
    const n = Number(val);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }
  function _computeAgeLocal(birthdayStr, dataYearVal){
    const b = _parseBirthday(birthdayStr);
    const y = _parseDataYear(dataYearVal);
    if (!b || y == null) return null;
    const end = new Date(y, 11, 31);
    const diffMs = end - b;
    if (!Number.isFinite(diffMs)) return null;
    const yearMs = 365.2425 * 24 * 3600 * 1000;
    const ageB = diffMs / yearMs;
    const ageA = Math.floor(ageB);
    return { ageA, ageB };
  }
  function computeAgeCompat(birthdayStr, dataYearVal){
    // 若你有對外暴露 window.AgeCalc.compute，優先使用；否則用本地同等算法。
    if (window.AgeCalc?.compute) {
      try { return window.AgeCalc.compute(birthdayStr, dataYearVal); } catch(_) {}
    }
    return _computeAgeLocal(birthdayStr, dataYearVal);
  }

  function renderBasicSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    if (!tlId || !data){
      // 無節點 → 顯示空狀態
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無可渲染的時間節點）</span>`;
      container.appendChild(empty);
      return;
    }

    for (const path of Object.keys(FIELD_META)){
      const {label} = FIELD_META[path];
      let val = getByPath(data, path);
      let text = (val ?? '－');

      // === 特殊欄位處理 ===
      if (path === 'basic.height' && text !== '－' && text !== '') {
        const num = parseFloat(text);
        if (Number.isFinite(num)) text = `${num.toFixed(1)} cm`;
      }

      if (path === 'basic.cupSize' && text !== '－' && text !== '') {
        text = `${text} Cup`;
      }

      const row = document.createElement('div');
      row.className = 'RenderRow';
      row.innerHTML = `
        <span class="render-label">${label}：</span>
        <span class="render-value">${text}</span>
      `;
      container.appendChild(row);
    }

        // === 追加：年齡（衍生欄位，現算） ===
    const birthday = getByPath(data, 'basic.birthday');
    const dataYear = getByPath(data, 'SysMeta.dataYear');
    const age = computeAgeCompat(birthday, dataYear);

    const ageRow = document.createElement('div');
    ageRow.className = 'RenderRow';
    if (!age) {
      ageRow.innerHTML = `
        <span class="render-label">年齡：</span>
        <span class="render-value">數值不合法</span>
      `;
    } else {
      const title = `精確值：${age.ageB.toFixed(1)}歲`;
      ageRow.innerHTML = `
        <span class="render-label">年齡：</span>
        <span class="render-value" title="${title}">${age.ageA}歲</span>
      `;
    }
    container.appendChild(ageRow);

  }

  // 用戶手動切換 RTL → 立即渲染
  selectRenderTL.addEventListener("change", ()=>{
    const newId = selectRenderTL.value || '';
    ROOT.dataset.renderTlCurrent = newId;
    renderBasicSection();
  });

  // 對外：渲染入口
  window.RenderBasicSection = renderBasicSection;
})();

// === 供「切到渲染區」的按鈕呼叫：1.save → 2.重建 RTL → 3.（你切 pane）→ 4.渲染 ===
(function SetupEnterRenderFlow(){
  const ROOT = document.getElementById('EditorRoot');

  function EnterRenderModeFlow(){
    // 1) 先全域存檔（你原本就有）
    if (window.TLSaveLoad?.saveCurrent) TLSaveLoad.saveCurrent();

    // 2) 重建渲染區下拉，並同步 renderTlCurrent
    if (window.RebuildRenderTLSelect) window.RebuildRenderTLSelect();

    // 3) 你自己的「切換到渲染區」動作（此處不干涉）
    //    例如：document.body.dataset.mode = 'render';

    // 4) 依當前 RTL 值做渲染
    if (window.RenderSysMetaSection) window.RenderSysMetaSection();
    if (window.RenderBasicSection) window.RenderBasicSection();
    if (window.RenderRegionSection) window.RenderRegionSection();
    if (window.RenderEducationSection) window.RenderEducationSection();
    if (window.RenderEmploymentSection) window.RenderEmploymentSection();
    if (window.RenderPersonalitySection) window.RenderPersonalitySection();
    if (window.RenderTopicRecordSection) window.RenderTopicRecordSection();
    if (window.RenderCombatSection) window.RenderCombatSection();
    if (window.RenderWeaponsSection) window.RenderWeaponsSection();
    if (window.RenderQASection) window.RenderQASection();
    if (window.RenderFamilySection) window.RenderFamilySection();
    if (window.RenderDesignSection) window.RenderDesignSection();
    if (window.RenderPictureSection) window.RenderPictureSection();
    if (window.RenderFSSection) window.RenderFSSection();
  }

  // 對外：讓你的切換按鈕在 handler 裡呼叫這顆即可
  window.EnterRenderModeFlow = EnterRenderModeFlow;
})();
// === 基本資訊渲染模組 end ===
// === SysMeta（系統欄）渲染模組 start ===
(function RenderSysMetaModule(){
  const container = document.getElementById("Render-sysmeta");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  const FIELD_META = {
    'SysMeta.settingLayer': { label: '設定層級' },
    'SysMeta.computeLayer': { label: '演算層級' },
    'SysMeta.generation'  : { label: '所屬世代' },
    'SysMeta.dataYear'    : { label: '數據年份' },
    'SysMeta.branch'      : { label: '分支註記', multiline: true }, // ← 對應 textarea
  };

  function getByPath(obj, path){
    return path.split('.').reduce((o,k)=>o?.[k], obj);
  }

  function renderSysMetaSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    if (!tlId || !data){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無可渲染的時間節點）</span>`;
      container.appendChild(empty);
      return;
    }

    for (const path of Object.keys(FIELD_META)){
      const meta = FIELD_META[path];
      const val  = getByPath(data, path);
      const text = (val ?? '－');

      const row = document.createElement('div');
      row.className = 'RenderRow render-grid' + (meta.multiline ? ' is-multiline' : '');

      const labelEl = document.createElement('span');
      labelEl.className = 'render-label';
      labelEl.textContent = `${meta.label}：`;

      const valueEl = document.createElement('span');
      valueEl.className = 'render-value';
      if (meta.multiline) {
        // 分支註記：保留換行，長高時 label 會自動等高（靠 CSS Grid）
        valueEl.textContent = String(text);
      } else {
        valueEl.textContent = String(text);
      }

      row.appendChild(labelEl);
      row.appendChild(valueEl);
      container.appendChild(row);
    }
  }

  // 用戶手動切換 RTL → 同步渲染
  selectRenderTL.addEventListener("change", ()=>{
    const newId = selectRenderTL.value || '';
    ROOT.dataset.renderTlCurrent = newId;
    renderSysMetaSection();
  });

  // 對外：渲染入口
  window.RenderSysMetaSection = renderSysMetaSection;
})();
// === SysMeta（系統欄）渲染模組 end ===


// === 地域區渲染模組 start ===
(function RenderRegionModule(){
  const container = document.getElementById("Render-region");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  function renderRegionSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    if (!tlId || !data?.region){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無地域資料）</span>`;
      container.appendChild(empty);
      return;
    }

    const region = data.region;

    // === 出生都市 ===
    if (region.birth){
      const city = region.birth.city || '－';
      const note = region.birth.note ? `（${region.birth.note}）` : '';
      const row = document.createElement('div');
      row.className = 'RenderRow';
      row.innerHTML = `
        <span class="render-label">出生都市：</span>
        <span class="render-value">${city}${note}</span>
      `;
      container.appendChild(row);
    }

    // === 定居都市 ===
    if (region.residence && typeof region.residence === 'object'){
      const keys = Object.keys(region.residence).sort((a,b)=>a-b);
      keys.forEach(k=>{
        const item = region.residence[k];
        if (!item) return;
        const city = item.city || '－';
        const note = item.note ? `（${item.note}）` : '';
        const row = document.createElement('div');
        row.className = 'RenderRow';
        row.innerHTML = `
          <span class="render-label">定居都市：</span>
          <span class="render-value">${city}${note}</span>
        `;
        container.appendChild(row);
      });
    }
  }

  // 監聽 RTL 切換
  selectRenderTL.addEventListener("change", ()=>{
    const newId = selectRenderTL.value || '';
    ROOT.dataset.renderTlCurrent = newId;
    renderRegionSection();
  });

  // 對外入口
  window.RenderRegionSection = renderRegionSection;
})();
// === 地域區渲染模組 end ===

// === 學業資訊渲染模組 start ===
(function RenderEducationModule(){
  const container = document.getElementById("Render-education");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  // 可改：科系的分隔符
  const MAJOR_SEP = " / ";

  function norm(str){ return (str ?? '').toString().trim(); }
  function isEmptyToken(s){ const t = norm(s); return !t || t === '－'; }

  // 將 note 標準化為：（狀態：內容）
  // 例： "已畢業（4722年）" -> "（已畢業：4722年）"
  //     "未畢業（4XXX）"   -> "（未畢業：4XXX）"
  //     "已畢業"           -> "（已畢業）"
  function formatNote(note){
    const n = norm(note);
    if (!n) return '';
    const m = n.match(/^(.+?)（(.+?)）$/); // 全形括號
    if (m) return `（${m[1]}：${m[2]}）`;
    // 若是半形括號
    const m2 = n.match(/^(.+?)\((.+?)\)$/);
    if (m2) return `（${m2[1]}：${m2[2]}）`;
    // 沒有括號內容就包成（xxx）
    return `（${n}）`;
  }

  function joinMajor(cls, dept, group){
    const parts = [];
    if (!isEmptyToken(cls))  parts.push(norm(cls));
    if (!isEmptyToken(dept)) parts.push(norm(dept));
    if (!isEmptyToken(group))parts.push(norm(group));
    return parts.length ? parts.join(MAJOR_SEP) : '－';
  }

  function renderEducationSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const eduListObj = data?.education?.list;
    if (!tlId || !eduListObj || typeof eduListObj !== 'object'){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無學業資料）</span>`;
      container.appendChild(empty);
      return;
    }

    // 依 list 的鍵（0,1,2…）排序，展平成每校一筆
    const flat = [];
    Object.keys(eduListObj).sort((a,b)=>a-b).forEach(k=>{
      const block = eduListObj[k];
      const note  = block?.note || '';
      const items = block?.items || {};
      Object.keys(items).sort((a,b)=>a-b).forEach(i=>{
        const it = items[i];
        flat.push({
          school: norm(it?.school),
          cls:    norm(it?.class),
          dept:   norm(it?.dept),
          group:  norm(it?.group),
          note
        });
      });
    });

    if (!flat.length){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無學業資料）</span>`;
      container.appendChild(empty);
      return;
    }

    // 逐校輸出
    flat.forEach((rowData, idx)=>{
      const schoolText = `${rowData.school || '－'}${formatNote(rowData.note)}`;
      const majorText  = joinMajor(rowData.cls, rowData.dept, rowData.group);

      // 學校
      const row1 = document.createElement('div');
      row1.className = 'RenderRow';
      row1.innerHTML = `
        <span class="render-label">學校：</span>
        <span class="render-value">${schoolText}</span>
      `;
      container.appendChild(row1);

      // 科系
      const row2 = document.createElement('div');
      row2.className = 'RenderRow';
      row2.innerHTML = `
        <span class="render-label">科系：</span>
        <span class="render-value">${majorText}</span>
      `;
      container.appendChild(row2);

      // 校與校之間插入分隔線（最後一所不插）
      if (idx < flat.length - 1){
        const divider = document.createElement("div");
        divider.className = "render-divider";
        const icon = document.createElement("div"); icon.className = "render-icon";
        const line = document.createElement("div"); line.className = "render-line";
        divider.appendChild(icon); divider.appendChild(line);
        container.appendChild(divider);
      }
    });
  }

  // 切 RTL 時更新
  selectRenderTL.addEventListener("change", ()=>{
    const newId = selectRenderTL.value || '';
    ROOT.dataset.renderTlCurrent = newId;
    renderEducationSection();
  });

  // （建議）編輯端 TL 事件也跟著更新
  ROOT.addEventListener('timelineIdChange', renderEducationSection);
  ROOT.addEventListener('timelineMetaChange', renderEducationSection);

  // 對外入口
  window.RenderEducationSection = renderEducationSection;
})();
// === 學業資訊渲染模組 end ===

// === 就業（軍+民）渲染模組 start ===
(function RenderEmploymentModule(){
  const container = document.getElementById("Render-employment");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  // 軍階圖示路徑
  const IMG_PATH = "【崩界櫻雪】Codex/CharacterSystem專用/MilitaryRank/";

  const norm = (v)=> (v ?? '').toString().trim();
  const isEmpty = (v)=> !norm(v) || norm(v) === '－';

  function makeDivider(){
    const divider = document.createElement("div");
    divider.className = "render-divider";
    const icon = document.createElement("div"); icon.className = "render-icon";
    const line = document.createElement("div"); line.className = "render-line";
    divider.appendChild(icon); divider.appendChild(line);
    return divider;
  }

  function renderEmploymentSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const emp = data?.employment || {};
    const mil = emp?.military && typeof emp.military === 'object' ? emp.military : null;
    const gen = emp?.general  && typeof emp.general  === 'object' ? emp.general  : null;

    // 合併：先軍、後民（依 key 升冪）
    const merged = [];

    if (mil){
      Object.keys(mil).sort((a,b)=>a-b).forEach(k=>{
        const it = mil[k] || {};
        merged.push({
          type: 'mil',
          year: norm(it.year),
          org : norm(it.org),
          rank: norm(it.rank),
          pos : norm(it.position)
        });
      });
    }
    if (gen){
      Object.keys(gen).sort((a,b)=>a-b).forEach(k=>{
        const it = gen[k] || {};
        merged.push({
          type: 'gen',
          year: norm(it.year),
          org : norm(it.org),
          pos : norm(it.position)
        });
      });
    }

    if (!merged.length){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無就業資料）</span>`;
      container.appendChild(empty);
      return;
    }

    merged.forEach((row, idx)=>{
      if (row.type === 'mil'){
        // ── 軍用版：容器A（PCWrap）包 B + C ──
        const wrap = document.createElement('div');
        wrap.className = 'emp-row PCWrap';   // PCWrap：PC 同行、手機換行

        // B：year：org（白色粗體，造型似 label）
        const B = document.createElement('div');
        B.className = 'emp-head';
        const yearText = isEmpty(row.year) ? '－' : row.year;
        const orgText  = isEmpty(row.org)  ? '－' : row.org;
        B.textContent = `${yearText}：${orgText}`;

        // C：★圖示 + rank-position
        const C = document.createElement('div');
        C.className = 'emp-body';

        const meta = document.createElement('span');
        meta.className = 'emp-body-meta';

        // 圖示（rank.png）
        if (!isEmpty(row.rank)) {
          const iconWrap = document.createElement('span');
          iconWrap.className = 'emp-rank-wrap';

          const img = document.createElement('img');
          img.src = IMG_PATH + encodeURIComponent(row.rank) + ".png";
          img.alt = row.rank;
          img.title = row.rank;
          img.className = 'emp-rank-icon';

          iconWrap.appendChild(img);
          meta.appendChild(iconWrap);
        }

        // rank-position 文字
        const rankPart = isEmpty(row.rank) ? '' : row.rank;
        const posPart  = isEmpty(row.pos)  ? '' : row.pos;
        const tail = rankPart && posPart ? `${rankPart}-${posPart}` :
                    rankPart || posPart || '－';

        const textSpan = document.createElement('span');
        textSpan.className = 'render-value';
        textSpan.textContent = tail;

        meta.appendChild(textSpan);
        C.appendChild(meta);

        wrap.appendChild(B);
        wrap.appendChild(C);
        container.appendChild(wrap);

      } else {
        // ── 民用版：單行「year：org-position」（無 label）──
   // ── 民用版：單行「year：org-position」（無 label）──
      const line = document.createElement('div');
      line.className = 'RenderRow emp-row render-full';

      const yearText = isEmpty(row.year) ? '－' : row.year;
      const orgText  = isEmpty(row.org)  ? '－' : row.org;
      const posPart  = isEmpty(row.pos)  ? ''  : `-${row.pos}`;

      // 分開兩組：head + value
      const head = document.createElement('span');
      head.className = 'emp-head';
      head.textContent = `${yearText}：${orgText}`;

      const value = document.createElement('span');
      value.className = 'render-value';
      value.textContent = posPart;   // 保留原本的格式處理

      // 組合
      line.appendChild(head);
      line.appendChild(value);

      container.appendChild(line);
      }

      // 分隔線（最後一筆不插）
      if (idx < merged.length - 1){
        container.appendChild(makeDivider());
      }
    });
  }

  // 事件接線：RTL 切換 & 編輯端 TL 事件
  selectRenderTL.addEventListener('change', ()=>{
    const id = selectRenderTL.value || '';
    ROOT.dataset.renderTlCurrent = id;
    renderEmploymentSection();
  });
  ROOT.addEventListener('timelineIdChange', renderEmploymentSection);
  ROOT.addEventListener('timelineMetaChange', renderEmploymentSection);

  // 對外入口
  window.RenderEmploymentSection = renderEmploymentSection;
})();
// === 就業（軍+民）渲染模組 end ===

// === 性格特徵渲染模組 start ===
(function RenderPersonalityModule(){
  const container = document.getElementById("Render-personality");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;     
  
  function renderPersonalitySection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;
    container.innerHTML = '';

    if (!data || !data.personality){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無性格資料）</span>`;
      container.appendChild(empty);
      return;
    }

    // === 公開特徵 ===
    const pubDetail = document.createElement('details');
    pubDetail.className = 'detail-personality';
    pubDetail.open = true;

    const pubSummary = document.createElement('summary');
    pubSummary.className = 'summary';
    pubSummary.textContent = '公開特徵';

    const pubContent = document.createElement('div');
    pubContent.className = 'render-value';
    pubContent.textContent = data.personality.public || '－';

    pubDetail.appendChild(pubSummary);
    pubDetail.appendChild(pubContent);
    container.appendChild(pubDetail);

    // === 非公開資料 ===
    const secDetail = document.createElement('details');
    secDetail.className = 'detail-personality';

    const secSummary = document.createElement('summary');
    secSummary.className = 'summary';
    secSummary.textContent = '非公開特徵';

    const secContent = document.createElement('div');
    secContent.className = 'render-value';
    secContent.textContent = data.personality.secret || '－';

    secDetail.appendChild(secSummary);
    secDetail.appendChild(secContent);
    container.appendChild(secDetail);
  }
  
  // 用戶切換 RTL → 立即渲染（★ 新增）
  selectRenderTL.addEventListener("change", ()=>{
    ROOT.dataset.renderTlCurrent = selectRenderTL.value || '';
    renderPersonalitySection();
  });

  // 編輯端切 TL → 渲染（保持）
  ROOT.addEventListener("timelineIdChange", ()=>{
    if (document.body?.dataset?.mode === 'render') renderPersonalitySection();
  });

  window.RenderPersonalitySection = renderPersonalitySection;
})();
// === 性格特徵渲染模組 end ===


// === 主題紀錄（TopicRecord）渲染模組 start ===
(function RenderTopicRecordModule(){
  const container = document.getElementById("Render-topic-records");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT) return;

  const norm = (v)=> (v ?? '').toString().trim();
  const isOpen = (v)=> {
    const s = norm(v).toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
  };

  function renderTopicRecordSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const entriesObj = data?.topicRecords?.entries;
    if (!tlId || !entriesObj || typeof entriesObj !== 'object'){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無主題紀錄）</span>`;
      container.appendChild(empty);
      return;
    }

    // 依鍵 0,1,2…排序
    const keys = Object.keys(entriesObj).sort((a,b)=>a-b);

    keys.forEach((k, idx) => {
      const item = entriesObj[k] || {};
      const title   = norm(item.title)   || '－';
      const content = norm(item.content) || '－';
      const opened  = isOpen(item.open);

      const det = document.createElement('details');
      det.className = 'detail-TopicRecord';
      det.open = opened;

      const sum = document.createElement('summary');
      sum.className = 'summary';
      sum.textContent = title;

      const body = document.createElement('div');
      body.className = 'render-value';
      // 支援 textarea 換行顯示（若你的 .render-value 已經有 white-space: pre-wrap 可省略）
      body.style.whiteSpace = 'pre-wrap';
      body.textContent = content;

      det.appendChild(sum);
      det.appendChild(body);
      container.appendChild(det);

      // 需要的話也可在多組之間插入分隔線；預設不加：
      // if (idx < keys.length - 1) {
      //   const divider = document.createElement("div");
      //   divider.className = "render-divider";
      //   const icon = document.createElement("div"); icon.className = "render-icon";
      //   const line = document.createElement("div"); line.className = "render-line";
      //   divider.appendChild(icon); divider.appendChild(line);
      //   container.appendChild(divider);
      // }
    });
  }

  // 事件接線
  if (selectRenderTL) {
    selectRenderTL.addEventListener("change", ()=>{
      const id = selectRenderTL.value || '';
      ROOT.dataset.renderTlCurrent = id;
      renderTopicRecordSection();
    });
  }
  ROOT.addEventListener('timelineIdChange', renderTopicRecordSection);
  ROOT.addEventListener('timelineMetaChange', renderTopicRecordSection);

  // 對外入口
  window.RenderTopicRecordSection = renderTopicRecordSection;
})();
// === 主題紀錄（TopicRecord）渲染模組 end ===

// === 戰鬥（combat）渲染模組 start ===
(function RenderCombatModule(){
  const container = document.getElementById("Render-combat");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  // 路徑與圖示尺寸（要調大小改這裡）
  const ICON_PATH = "【崩界櫻雪】Codex/CharacterSystem專用/BattleIcon/";
  const ICON_W = 24;   // px
  const ICON_H = 24;   // px

  // aptitudes 的檔名 mapping + 顯示順序（固定）
  const APT_MAP = {
    '前衛': '前衛.png',
    '防衛者': '防衛.png',
    '中衛': '中衛.png',
    '狙擊': '狙擊.png',
    '前衛魔導士': '前法.png',
    '後衛魔導士': '後法.png',
    '輔助': '輔助.png',
    '治療': '治療.png',
  };
  const APT_ORDER = ['前衛','防衛者','中衛','狙擊','前衛魔導士','後衛魔導士','輔助','治療'];

  const norm = (v)=> (v ?? '').toString().trim();
  const isEmpty = (v)=> !norm(v) || norm(v) === '－';

  function makeRow(labelText, valueHTML){
    const row = document.createElement('div');
    row.className = 'RenderRow';
    row.innerHTML = `
      <span class="render-label">${labelText}：</span>
      <span class="render-value">${valueHTML}</span>
    `;
    return row;
  }

  function makeNoWrapAptRow(aptitudesObj){
    const row = document.createElement('div');
    row.className = 'RenderRow Nowrap'; // 不換行

    const label = document.createElement('span');
    label.className = 'render-label';
    label.textContent = '具備適性：';

    const value = document.createElement('span');
    value.className = 'render-value combat-apt-icons';

    // 依順序產出 true 的圖示
    let hasAny = false;
    APT_ORDER.forEach(key=>{
      if (aptitudesObj?.[key]) {
        const fname = APT_MAP[key];
        if (!fname) return;
        const img = document.createElement('img');
        img.src = ICON_PATH + encodeURIComponent(fname);
        img.alt = key;
        img.title = key;
        img.width = ICON_W;   // 指定 px 尺寸（可調）
        img.height = ICON_H;
        img.className = 'combat-icon';
        value.appendChild(img);
        hasAny = true;
      }
    });
    if (!hasAny){
      // 沒任何 true → 顯示 －
      value.textContent = '－';
    }

    // 兩者包在一起且不換行
    row.appendChild(label);
    row.appendChild(value);
    return row;
  }

  function makeDescDetails(descText){
    const det = document.createElement('details');
    det.className = 'detail-combat';
    det.open = false; // 這塊沒有指定預設，維持收合；要預設展開可改 true

    const sum = document.createElement('summary');
    sum.className = 'summary';
    sum.textContent = '戰鬥能力設定';

    const body = document.createElement('div');
    body.className = 'render-value';
    body.style.whiteSpace = 'pre-wrap'; // 模擬 textarea 顯示換行
    body.textContent = descText || '－';

    det.appendChild(sum);
    det.appendChild(body);
    return det;
  }

  function renderCombatSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const c = data?.combat || {};
    const hasA = !!c.A, hasB = !!c.B, hasC = !!c.C;

    if (!hasA && !hasB && !hasC){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無戰鬥資料）</span>`;
      container.appendChild(empty);
      return;
    }

    // 按優先：A > B > C（如資料同時有多版，A 先渲染）
    if (hasA){
      const a = c.A || {};
      // 戰測階級
      container.appendChild(makeRow('戰測階級', isEmpty(a.tier) ? '－' : norm(a.tier)));
      // 主要適性
      container.appendChild(makeRow('主要適性', isEmpty(a.role) ? '－' : norm(a.role)));
      // 具備適性（不換行，僅 true 的圖示）
      container.appendChild(makeNoWrapAptRow(a.aptitudes || {}));
      // 戰鬥特色
      container.appendChild(makeRow('戰鬥特色', isEmpty(a.feature) ? '－' : norm(a.feature)));
      // 戰鬥能力設定（detail）
      container.appendChild(makeDescDetails(norm(a.desc)));

    } else if (hasB){
      const b = c.B || {};
      // 只顯示戰測階級、主要適性
      container.appendChild(makeRow('戰測階級', isEmpty(b.tier) ? '－' : norm(b.tier)));
      container.appendChild(makeRow('主要適性', isEmpty(b.role) ? '－' : norm(b.role)));

    } else if (hasC){
      const line = document.createElement('div');
      line.className = 'RenderRow';
      line.innerHTML = `<span class="render-value">無戰鬥能力。</span>`;
      container.appendChild(line);
    }
  }

  // 事件接線：RTL 下拉＋編輯端 TL 事件
  selectRenderTL.addEventListener("change", ()=>{
    ROOT.dataset.renderTlCurrent = selectRenderTL.value || '';
    renderCombatSection();
  });
  ROOT.addEventListener('timelineIdChange', renderCombatSection);
  ROOT.addEventListener('timelineMetaChange', renderCombatSection);

  // 對外入口
  window.RenderCombatSection = renderCombatSection;
})();
// === 戰鬥（combat）渲染模組 end ===

// === 武裝（weapons）渲染模組 start ===
(function RenderWeaponsModule(){
  const container = document.getElementById("Render-weapons");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  const norm = (v)=> (v ?? '').toString().trim();
  const asText = (v)=> (norm(v) || '－');

  function makeRow(labelText, valueText, opts={}){
    const row = document.createElement('div');
    row.className = 'RenderRow';
    const valSpan = document.createElement('span');
    valSpan.className = 'render-value';
    if (opts.prewrap) valSpan.style.whiteSpace = 'pre-wrap';
    valSpan.textContent = valueText;

    row.innerHTML = `<span class="render-label">${labelText}：</span>`;
    row.appendChild(valSpan);
    return row;
  }

  function renderWeaponsSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const itemsObj = data?.weapons?.items;
    if (!tlId || !itemsObj || typeof itemsObj !== 'object'){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無武裝資料）</span>`;
      container.appendChild(empty);
      return;
    }

    // 依 0,1,2… 排序逐筆輸出
    Object.keys(itemsObj).sort((a,b)=>a-b).forEach((k, idx, arr)=>{
      const it = itemsObj[k] || {};

      const det = document.createElement('details');
      det.className = 'detail-weapon';
      // det.open = false; // 需要預設展開就改 true

      const sum = document.createElement('summary');
      sum.className = 'summary';
      const setType = asText(it.setType);
      const name    = asText(it.name);
      sum.textContent = `${setType}：${name}`;    // ← 中間補全形冒號

      const body = document.createElement('div');
      body.className = 'weapon-body';

      // 內容四行（白標籤＋淺藍字）
      body.appendChild(makeRow('武器種類',  asText(it.category)));
      body.appendChild(makeRow('武器材料',  asText(it.material)));
      body.appendChild(makeRow('武器等級',  asText(it.grade)));
      body.appendChild(makeRow('武器細節',  asText(it.detail), { prewrap:true }));

      det.appendChild(sum);
      det.appendChild(body);
      container.appendChild(det);
    });
  }

  // 事件接線：渲染下拉＋編輯端 TL 事件
  selectRenderTL.addEventListener("change", ()=>{
    ROOT.dataset.renderTlCurrent = selectRenderTL.value || '';
    renderWeaponsSection();
  });
  ROOT.addEventListener('timelineIdChange', renderWeaponsSection);
  ROOT.addEventListener('timelineMetaChange', renderWeaponsSection);

  // 對外入口
  window.RenderWeaponsSection = renderWeaponsSection;
})();
// === 武裝（weapons）渲染模組 end ===

// === 問答（QA）渲染模組 start ===
(function RenderQAModule(){
  const container = document.getElementById("Render-qa");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  // 固定題庫
  const qaSections = {
    mind: {
      title: "心靈問答（本人回答）",
      questions: [
        "一級：有什麼一直在做的事情？是自願的還是被迫的？",
        "一級：期望自己成為什麼樣的人？而實際上別人怎麼看你？",
        "一級：如果你不在這世界上，對世界會有什麼影響？",
        "一級：曾經後悔過什麼事情嗎？",
        "一級：你唯一願意的示弱對象是誰？"
      ]
    },
    social: {
      title: "社交問答（本人回答）",
      questions: [
        "三級：目前的工作是什麼？工作態度為何？",
        "二級：家庭狀況如何？有無特殊背景或成長經歷？",
        "二級：現階段有無親密友人？",
        "二級：對戀愛的積極度與心態為何？",
        "二級：最敬佩或是最喜歡的人是誰？"
      ]
    },
    appearance: {
      title: "外在形象（他人描述）",
      questions: [
        "三級：給人的外在印象為何？個性與長相？",
        "三級：有無特殊技能或興趣？大家有何看法？"
      ]
    }
  };

  const norm = (v)=> (v ?? '').toString().trim();
  const asText = (v)=> (norm(v) || '－');

  function renderQASection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;
    container.innerHTML = '';

    const qaData = data?.qa;
    if (!qaData){
      const empty = document.createElement('div');
      empty.className = 'RenderRow';
      empty.innerHTML = `<span class="render-value">（尚無問答資料）</span>`;
      container.appendChild(empty);
      return;
    }

    // 依照題庫順序輸出每個大區
    for (const [secKey, secDef] of Object.entries(qaSections)){
      const sectionWrap = document.createElement('div');
      sectionWrap.className = 'qa-section';

      // 標題（使用指定樣式）
      const titleEl = document.createElement('div');
      titleEl.className = 'S2-Block SK-Blue';
      titleEl.textContent = secDef.title;
      sectionWrap.appendChild(titleEl);

      const answers = qaData[secKey] || {};

      secDef.questions.forEach((qText, idx)=>{
        const qid = 'q' + (idx+1);
        const ansText = asText(answers[qid]);

        const qRow = document.createElement('div');
        qRow.className = 'qa-row';

        const qEl = document.createElement('div');
        qEl.className = 'qa-question';
        qEl.textContent = qText;

        const aEl = document.createElement('div');
        aEl.className = 'qa-answer render-value';
        aEl.textContent = ansText;

        qRow.appendChild(qEl);
        qRow.appendChild(aEl);
        sectionWrap.appendChild(qRow);
      });

      container.appendChild(sectionWrap);
    }
  }

  // 事件接線
  selectRenderTL.addEventListener("change", ()=>{
    ROOT.dataset.renderTlCurrent = selectRenderTL.value || '';
    renderQASection();
  });
  ROOT.addEventListener('timelineIdChange', renderQASection);
  ROOT.addEventListener('timelineMetaChange', renderQASection);

  // 對外入口
  window.RenderQASection = renderQASection;
})();
// === 問答（QA）渲染模組 end ===

// === 家族成員（family）渲染模組 start ===
(function RenderFamilyModule(){
  const container = document.getElementById("Render-family");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  const norm  = (v)=> (v ?? '').toString().trim();
  const asTxt = (v)=> (norm(v) || '－');

  function renderFamilySection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const text = asTxt(data?.chara?.family);

    const div = document.createElement('div');
    div.className = 'render-value render-block';
    div.style.whiteSpace = 'pre-wrap';   // 讓原本 textarea 的換行保留
    div.textContent = text;
    container.appendChild(div);
  }

  selectRenderTL.addEventListener("change", ()=>{
    ROOT.dataset.renderTlCurrent = selectRenderTL.value || '';
    renderFamilySection();
  });
  ROOT.addEventListener('timelineIdChange', renderFamilySection);
  ROOT.addEventListener('timelineMetaChange', renderFamilySection);

  window.RenderFamilySection = renderFamilySection;
})();
// === 家族成員（family）渲染模組 end ===


// === 設計補註（design）渲染模組 start ===
(function RenderDesignModule(){
  const container = document.getElementById("Render-design");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  const norm  = (v)=> (v ?? '').toString().trim();
  const asTxt = (v)=> (norm(v) || '－');

  function renderDesignSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const text = asTxt(data?.design?.Info);

    const div = document.createElement('div');
    div.className = 'render-value render-block';
    div.style.whiteSpace = 'pre-wrap';
    div.textContent = text;
    container.appendChild(div);
  }

  selectRenderTL.addEventListener("change", ()=>{
    ROOT.dataset.renderTlCurrent = selectRenderTL.value || '';
    renderDesignSection();
  });
  ROOT.addEventListener('timelineIdChange', renderDesignSection);
  ROOT.addEventListener('timelineMetaChange', renderDesignSection);

  window.RenderDesignSection = renderDesignSection;
})();
// === 設計補註（design）渲染模組 end ===

// === 圖像（Picture）渲染模組 start ===
(function RenderPictureModule(){
  const container = document.getElementById("Render-picture");
  const ROOT = document.getElementById("EditorRoot");
  const selectRenderTL = document.getElementById("RenderTLSelect");
  if (!container || !ROOT || !selectRenderTL) return;

  // 固定路徑（使用正斜線）
  const PATH_IDCARD  = "【崩界櫻雪】Standard/04【崩界櫻雪】圖片庫/23-【角色】證件/";
  const PATH_FULL    = "【崩界櫻雪】Standard/04【崩界櫻雪】圖片庫/22-【角色】人設圖/";
  const EXT = ".png";

  // 每個 TL 的當前索引記憶（避免重繪時回到 0）
  const curIdx = Object.create(null); // curIdx[tlId] = { IDCard: n, FullBody: n }

  const norm = v => (v ?? '').toString().trim();

  function listFromObject(obj){
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj)
      .sort((a,b)=> Number(a) - Number(b))
      .map(k => norm(obj[k]))
      .filter(s => !!s);
  }

  function makeDetail(title, files, tlId, key, basePath){
    const det = document.createElement('details');
    det.className = 'detail-picture';
    // 預設關閉，若需要打開可以 det.open = true;

    const sum = document.createElement('summary');
    sum.className = 'summary';
    sum.textContent = title;
    det.appendChild(sum);

    const body = document.createElement('div');
    body.className = 'picture-body';

    if (!files.length){
      const empty = document.createElement('div');
      empty.className = 'render-value';
      empty.textContent = '（尚無圖片）';
      body.appendChild(empty);
      det.appendChild(body);
      return det;
    }

    // 取記憶的索引（預設 0）
    if (!curIdx[tlId]) curIdx[tlId] = {};
    const startIdx = Number.isInteger(curIdx[tlId][key]) ? curIdx[tlId][key] : 0;

    const img = document.createElement('img');
    img.className = 'picture-img'; // 尺寸交給 CSS；你要固定 px 就在這個 class 調
    img.alt = title;
    img.decoding = 'async';
    img.loading = 'lazy';

    // 設置來源
    function setSrc(i){
      const n = ((i % files.length)+files.length) % files.length; // 安全取模
      curIdx[tlId][key] = n;
      const filename = files[n];
      img.src = basePath + encodeURIComponent(filename) + EXT;
      img.title = filename + `（${n+1}/${files.length}）`; // 小提示：檔名＋序號
      img.dataset.index = String(n);
    }
    setSrc(startIdx);

    // 點擊循環
    img.addEventListener('click', ()=>{
      const next = (curIdx[tlId][key] + 1) % files.length;
      setSrc(next);
    });

    body.appendChild(img);
    det.appendChild(body);
    return det;
  }

  function renderPictureSection(){
    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;

    container.innerHTML = '';

    const pic = data?.Picture || {};
    const idFiles   = listFromObject(pic.IDCard);
    const fullFiles = listFromObject(pic.FullBody);

    // 證件卡
    container.appendChild(
      makeDetail('證件卡', idFiles, tlId, 'IDCard', PATH_IDCARD)
    );

    // 全身照
    container.appendChild(
      makeDetail('全身照', fullFiles, tlId, 'FullBody', PATH_FULL)
    );
  }

  // 事件接線：渲染下拉＋編輯端 TL 事件
  selectRenderTL.addEventListener("change", ()=>{
    ROOT.dataset.renderTlCurrent = selectRenderTL.value || '';
    renderPictureSection();
  });
  ROOT.addEventListener('timelineIdChange', renderPictureSection);
  ROOT.addEventListener('timelineMetaChange', renderPictureSection);

  // 對外入口
  window.RenderPictureSection = renderPictureSection;
})();
// === 圖像（Picture）渲染模組 end ===

// === FS（立繪）渲染模組 start ===
(function RenderFSModule(){
  const ROOT = document.getElementById('EditorRoot');
  const selectRenderTL = document.getElementById('RenderTLSelect');
  if (!ROOT || !selectRenderTL) return;

  const FS_ANCHOR_ID = 'FS-Slot';  // ← 你要改名就改這裡
  const PATH_FS = "【崩界櫻雪】Standard/04【崩界櫻雪】圖片庫/21-【角色】FirstShow/";
  const EXT = ".png";

  function renderFSSection(){
    const slot = document.getElementById(FS_ANCHOR_ID);
    if (!slot) return;              // 沒錨點就不做

    // 先清空
    slot.innerHTML = '';

    const tlId = ROOT?.dataset?.renderTlCurrent || '';
    const all  = window.TLSaveLoad?.getAll ? TLSaveLoad.getAll() : {};
    const data = tlId ? (all?.[tlId] || {}) : null;
    const fsName = (data?.Picture?.FS || '').toString().trim();
    if (!fsName) return;

    // 外框
    const frame = document.createElement('div');
    frame.className = 'FS-Frame';

    // 圖片（高度鎖定，寬度自動）
    const img = document.createElement('img');
    img.className = 'FS-Img';
    img.alt = 'FS';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.src = PATH_FS + encodeURIComponent(fsName) + EXT;

    frame.appendChild(img);
    slot.appendChild(frame);
  }

  // 接線
  ROOT.addEventListener('timelineIdChange', renderFSSection);
  ROOT.addEventListener('timelineMetaChange', renderFSSection);
  selectRenderTL.addEventListener('change', renderFSSection);

  // 對外
  window.RenderFSSection = renderFSSection;
})();
// === FS（立繪）渲染模組 end ===


