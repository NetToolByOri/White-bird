/*
==================================================
CDExportModel
Version : 1.01

用途：
- 將 CharacterData 4.x Timeline status 轉為共用輸出模型。
- Clipboard 與 DOCX 共用同一份內容模型，只分離排版器。
- 資料來源固定為 window.CDTimelineCore.getState()。
- 不讀 Render DOM，不受 PC／手機 Render 結構影響。
- DOCX 尾端保留 Oracle Shion / 莎緹亞 / Yukise 小簽名。
- docx.esm.js 由 HTML 統一載入，本插件只使用 globalThis.docx。

公開 API：
- CDExportModel.openClipboard()
- CDExportModel.openDoc()
- CDExportModel.buildModel(options)
- CDExportModel.formatText(model)
- CDExportModel.exportDocx(model)
==================================================
*/

(function(global){
  'use strict';

  const VERSION = '1.01';
  const MODAL_ID = 'CDExportModelModal';
  const STYLE_ID = 'CDExportModelStyle';
  const WORD_FONT_SIZE = 24;

  const QA_GROUPS = Object.freeze([
    {
      title:'心靈問答（本人回答）', key:'mind', questions:[
        ['q1','一級：有什麼一直在做的事情？是自願的還是被迫的？'],
        ['q2','一級：期望自己成為什麼樣的人？而實際上別人怎麼看你？'],
        ['q3','一級：如果你不在這世界上，對世界會有什麼影響？'],
        ['q4','一級：曾經後悔過什麼事情嗎？'],
        ['q5','一級：你唯一願意的示弱對象是誰？']
      ]
    },
    {
      title:'社交問答（本人回答）', key:'social', questions:[
        ['q1','三級：目前的工作是什麼？工作態度為何？'],
        ['q2','二級：家庭狀況如何？有無特殊背景或成長經歷？'],
        ['q3','二級：現階段有無親密友人？'],
        ['q4','二級：對戀愛的積極度與心態為何？'],
        ['q5','二級：最敬佩或是最喜歡的人是誰？']
      ]
    },
    {
      title:'外在形象（他人描述）', key:'appearance', questions:[
        ['q1','三級：給人的外在印象為何？個性與長相？'],
        ['q2','二級：有無特殊技能或興趣？大家有何看法？']
      ]
    }
  ]);

  const APTITUDE_ORDER = Object.freeze([
    '前衛','防衛者','中衛','狙擊','前衛魔導士','後衛魔導士','輔助','治療'
  ]);

  function text(value){ return value == null ? '' : String(value); }
  function trim(value){ return text(value).trim(); }
  function has(value){ const s = trim(value); return !!s && s !== '－'; }
  function list(value){
    if(Array.isArray(value)) return value;
    if(value && typeof value === 'object') return Object.values(value);
    return [];
  }
  function enabled(item){ return !!item && item.enabled !== false; }
  function currentTitle(){
    return trim(global.CodexHeader?.getTitle?.()) || trim(document.title) || 'CharacterData';
  }
  function getSnapshot(){
    if(!global.CDTimelineCore?.getState) throw new Error('CDTimelineCore 尚未載入。');
    return global.CDTimelineCore.getState();
  }
  function getTarget(snapshot, type, index){
    const space = type === 'rtl' ? 'rtl' : 'tl';
    const n = Math.max(1, Math.min(9, Number(index) || 1));
    const sandbox = snapshot?.[space];
    const status = sandbox?.slots?.[n - 1];
    if(!sandbox || !status) throw new Error(`找不到 ${space.toUpperCase()}${n} status。`);
    return { space, index:n, sandbox, status };
  }
  function calcAge(dataYear, birthday){
    const year = Number((trim(dataYear).match(/\d{3,4}/) || [])[0]);
    const birth = Number((trim(birthday).match(/\d{3,4}/) || [])[0]);
    return Number.isFinite(year) && Number.isFinite(birth) && year >= birth ? `${year - birth}歲` : '';
  }
  function branchId(type, index, status){
    const rawId = trim(status?.fields?.['SysMeta.characterIndex']);
    const root = rawId.length > 1 ? rawId.slice(0, -1) : rawId;
    const computed = root ? `${root}${index}` : `${type === 'rtl' ? 'R' : ''}未設定${index}`;
    return type === 'rtl' && !computed.startsWith('R') ? `R${computed}` : computed;
  }

  function section(title){ return { title, blocks:[] }; }
  function kv(label, value){ return { type:'kv', label:text(label), value:text(value) }; }
  function line(value){ return { type:'line', value:text(value) }; }
  function detail(label, value){ return { type:'detail', label:text(label), value:text(value) }; }
  function bullets(label, values){ return { type:'bullets', label:text(label), values:list(values).map(text) }; }
  function qaGroup(title, items){ return { type:'qa', title:text(title), items:list(items) }; }
  function item(title, rows=[], body=''){ return { type:'item', title:text(title), rows:list(rows), body:text(body) }; }
  function pushIf(sec, block, condition=true){ if(condition) sec.blocks.push(block); }

  function buildModel(options={}){
    const snapshot = options.snapshot || getSnapshot();
    const type = options.type === 'rtl' ? 'rtl' : 'tl';
    const index = Math.max(1, Math.min(9, Number(options.index) || 1));
    const { sandbox, status } = getTarget(snapshot, type, index);
    const f = status.fields || {};
    const m = status.managers || {};
    const globalData = sandbox.global || {};
    const model = {
      schema:'OracleShion.CharacterData.ExportModel',
      version:VERSION,
      title:trim(options.title) || currentTitle(),
      context:{ type, index, label:`${type.toUpperCase()}${index}` },
      sections:[]
    };

    const sys = section('SysMeta');
    pushIf(sys, kv('角色ID：', f['SysMeta.characterIndex']), has(f['SysMeta.characterIndex']));
    pushIf(sys, kv('設定層級：', f['SysMeta.settingLayer']), has(f['SysMeta.settingLayer']));
    pushIf(sys, kv('演算層級：', f['SysMeta.computeLayer']), has(f['SysMeta.computeLayer']));
    pushIf(sys, kv('所屬世代：', f['SysMeta.generation']), has(f['SysMeta.generation']));
    pushIf(sys, kv('數據年份：', `${text(f['SysMeta.dataYear'])}年`), has(f['SysMeta.dataYear']));
    const branch = text(f['SysMeta.branch']).split(/\r?\n/).map(trim).filter(Boolean);
    pushIf(sys, bullets('分支註記：', branch), branch.length > 0);
    model.sections.push(sys);

    const basic = section('基本資訊');
    [
      ['全名：','basic.fullname'], ['讀音：','basic.nameRuby'], ['語系：','basic.nameTag'],
      ['性別：','basic.gender'], ['種族：','basic.race']
    ].forEach(([label,key]) => pushIf(basic, kv(label,f[key]), has(f[key])));
    pushIf(basic, kv('身高：', `${text(f['basic.height'])} cm`), has(f['basic.height']));
    pushIf(basic, kv('胸圍：', `${trim(f['basic.cupSize'])} Cup`), has(f['basic.cupSize']));
    [['髮色：','basic.haircolor'],['瞳色：','basic.eyescolor'],['生日：','basic.birthday']]
      .forEach(([label,key]) => pushIf(basic, kv(label,f[key]), has(f[key])));
    const age = calcAge(f['SysMeta.dataYear'], f['basic.birthday']);
    pushIf(basic, kv('年齡：', age), !!age);
    model.sections.push(basic);

    const region = section('地域資訊');
    const birthCity = trim(f['region.birth.city']);
    const birthNote = trim(f['region.birth.note']);
    pushIf(region, kv('出生都市：', `${birthCity}${birthNote ? `（${birthNote}）` : ''}`), !!(birthCity || birthNote));
    list(m.region).filter(enabled).forEach(row => {
      const city = trim(row?.city), note = trim(row?.note);
      pushIf(region, kv('居住都市：', `${city}${note ? `（${note}）` : ''}`), !!(city || note));
    });
    model.sections.push(region);

    const education = section('學業資訊');
    list(m.education).filter(enabled).forEach(row => {
      const school = trim(row?.school), note = trim(row?.note);
      const title = `${school}${note ? `（${note}）` : ''}`;
      const rows = [];
      list(row?.items).filter(enabled).forEach(major => {
        const parts = [major?.class, major?.dept, major?.group].map(trim).filter(has);
        if(parts.length) rows.push(kv('科系：', parts.join(' / ')));
      });
      if(title || rows.length) education.blocks.push(item(title ? `學歷：${title}` : '學歷', rows));
    });
    model.sections.push(education);

    const employment = section('就業資訊');
    list(m.employmentMilitary).filter(enabled).forEach(row => {
      const year = trim(row?.year).replace(/年$/,'');
      const title = [year ? `${year}年` : '', row?.org, row?.rank, row?.position].map(trim).filter(has).join('-');
      if(title) employment.blocks.push(line(title));
    });
    list(m.employmentGeneral).filter(enabled).forEach(row => {
      const year = trim(row?.year).replace(/年$/,'');
      const title = [year ? `${year}年` : '', row?.org, row?.position].map(trim).filter(has).join('-');
      if(title) employment.blocks.push(line(title));
    });
    model.sections.push(employment);

    const personality = section('基本個性');
    pushIf(personality, detail('公開特徵：', f['personality.public']), has(f['personality.public']));
    pushIf(personality, detail('非公開特徵：', f['personality.secret']), has(f['personality.secret']));
    model.sections.push(personality);

    const topics = section('主題紀錄');
    const topicRegistry = list(globalData?.topic?.registry).map(Number);
    const topicSort = list(globalData?.topic?.sort).map(Number);
    const topicOrder = [...topicSort.filter(n=>topicRegistry.includes(n)), ...topicRegistry.filter(n=>!topicSort.includes(n))];
    topicOrder.forEach(slot => {
      const row = m.topicSlots?.[String(slot)] || m.topicSlots?.[`slot${String(slot).padStart(2,'0')}`];
      if(!enabled(row)) return;
      const title = trim(row?.title), body = trim(row?.body);
      if(title || body) topics.blocks.push(item(title ? `事件：${title}` : '事件', [], body));
    });
    model.sections.push(topics);

    const combat = section('戰鬥能力設定');
    pushIf(combat, kv('戰測階級：', f['combat.rank']), has(f['combat.rank']));
    pushIf(combat, kv('主要適性：', f['combat.mainRole']), has(f['combat.mainRole']));
    const aptitudes = APTITUDE_ORDER.filter(name => {
      const value = f[`combat.aptitudes.${name}`];
      return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
    });
    pushIf(combat, kv('具備適性：', aptitudes.join('、')), aptitudes.length > 0);
    pushIf(combat, kv('戰鬥特色：', f['combat.feature']), has(f['combat.feature']));
    pushIf(combat, detail('戰鬥能力設定：', f['combat.detail']), has(f['combat.detail']));
    model.sections.push(combat);

    const weapons = section('武器');
    const weaponRegistry = list(globalData?.weapon?.registry).map(Number);
    const ownSort = list(m.weaponSort).map(Number);
    const weaponOrder = [...ownSort.filter(n=>weaponRegistry.includes(n)), ...weaponRegistry.filter(n=>!ownSort.includes(n))];
    weaponOrder.forEach(slot => {
      const row = m.weaponSlots?.[String(slot)] || m.weaponSlots?.[`slot${String(slot).padStart(2,'0')}`];
      if(!enabled(row)) return;
      const name = trim(row?.name) || `武器 ${slot}`;
      const title = row?.groupType === '套裝武器' ? `${name}x${text(row?.count)}` : name;
      const rows = [];
      const kind = [row?.category, row?.type, row?.style].map(trim).filter(has).join(' / ');
      const spec = [row?.grade, row?.mechanism].map(trim).filter(has).join(' / ');
      if(kind) rows.push(kv('武器種類：', kind));
      if(spec) rows.push(kv('武器規格：', spec));
      weapons.blocks.push(item(title, rows, row?.detail));
    });
    model.sections.push(weapons);

    const questions = section('角色問答');
    QA_GROUPS.forEach(group => {
      const items = group.questions.map(([id,question]) => ({
        question,
        answer:has(f[`qa.${group.key}.${id}`]) ? text(f[`qa.${group.key}.${id}`]) : '（未作答）'
      }));
      questions.blocks.push(qaGroup(group.title, items));
    });
    model.sections.push(questions);

    const family = section('家族成員');
    pushIf(family, detail('', f['chara.family']), has(f['chara.family']));
    model.sections.push(family);

    const design = section('設計雜談');
    pushIf(design, detail('', f['design.Info']), has(f['design.Info']));
    model.sections.push(design);

    return model;
  }

  function formatText(model){
    const lines = [];
    const push = value => lines.push(text(value));
    push(model?.title || 'CharacterData');
    push('');
    list(model?.sections).forEach(sec => {
      push(`—  ${sec.title}  —`);
      list(sec.blocks).forEach(block => {
        if(block.type === 'kv') push(`${block.label}${block.value}`);
        else if(block.type === 'line') push(block.value);
        else if(block.type === 'detail') {
          if(block.label) push(block.label);
          text(block.value).split(/\r?\n/).forEach(push);
        } else if(block.type === 'bullets') {
          if(block.label) push(block.label);
          list(block.values).forEach(v => push(`• ${v}`));
        } else if(block.type === 'item') {
          if(block.title) push(block.title);
          list(block.rows).forEach(row => push(`${row.label}${row.value}`));
          if(has(block.body)) text(block.body).split(/\r?\n/).forEach(push);
          push('');
        } else if(block.type === 'qa') {
          push(`${block.title}：`);
          list(block.items).forEach(q => { push(q.question); push(q.answer || '（未作答）'); push(''); });
        }
      });
      push('');
    });
    return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim() + '\n';
  }

  async function copyText(value){
    const output = text(value);
    if(navigator.clipboard?.writeText){ await navigator.clipboard.writeText(output); return; }
    const ta = document.createElement('textarea');
    ta.value = output; ta.readOnly = true;
    ta.style.position='fixed'; ta.style.opacity='0'; ta.style.pointerEvents='none';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0,ta.value.length);
    const ok = document.execCommand('copy'); ta.remove();
    if(!ok) throw new Error('瀏覽器拒絕剪貼簿操作。');
  }

  function safeFileName(name){
    return trim(name || 'CharacterData').replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim() || 'CharacterData';
  }

  async function exportDocx(model){
    const docx = global.docx;
    if (!docx?.Document || !docx?.Packer || !docx?.Paragraph || !docx?.TextRun) {
      throw new Error('docx.esm.js 尚未由 HTML 載入。');
    }
    const { Document, Packer, Paragraph, TextRun } = docx;
    const children = [];
    const para = (runs, options={}) => new Paragraph({ children:runs, ...options });
    const run = (value, options={}) => new TextRun({ text:text(value), size:WORD_FONT_SIZE, font:'Noto Sans TC', ...options });
    const blank = after => para([run('')], { spacing:{ after:after ?? 80 } });
    const divider = title => para([run(`—  ${title}  —`, { bold:true, color:'7DD3FC' })], {
      alignment:'center', shading:{ type:'clear', color:'auto', fill:'1A2633' }, spacing:{ before:240, after:120 }
    });
    const kvPara = block => para([
      run(block.label, { bold:true, color:'FFFFFF' }), run(block.value, { color:'CCFFFF' })
    ], { spacing:{ after:40 } });
    const textLines = (value, color='CCFFFF', after=60) => {
      text(value).split(/\r?\n/).forEach(lineValue => children.push(para([run(lineValue,{color})],{spacing:{after}})));
    };

    children.push(para([run(model?.title || 'CharacterData',{bold:true,color:'7DD3FC',size:40})],{alignment:'center',spacing:{after:220}}));

    list(model?.sections).forEach(sec => {
      children.push(divider(sec.title));
      if(!sec.blocks.length) children.push(para([run('（無資料）',{color:'A7B8C8'})],{spacing:{after:80}}));
      list(sec.blocks).forEach(block => {
        if(block.type === 'kv') children.push(kvPara(block));
        else if(block.type === 'line') children.push(para([run(block.value,{color:'CCFFFF'})],{spacing:{after:60}}));
        else if(block.type === 'detail') {
          if(block.label) children.push(para([run(block.label,{bold:true,color:'FFFFFF'})],{spacing:{after:40}}));
          textLines(block.value);
        } else if(block.type === 'bullets') {
          if(block.label) children.push(para([run(block.label,{bold:true,color:'FFFFFF'})],{spacing:{after:40}}));
          list(block.values).forEach(v => children.push(para([run(`• ${v}`,{color:'CCFFFF'})],{spacing:{after:40}})));
        } else if(block.type === 'item') {
          if(block.title) children.push(para([run(block.title,{bold:true,color:'7DD3FC'})],{spacing:{before:80,after:60}}));
          list(block.rows).forEach(row => children.push(kvPara(row)));
          if(has(block.body)) textLines(block.body);
          children.push(blank(100));
        } else if(block.type === 'qa') {
          children.push(para([run(block.title,{bold:true,color:'7DD3FC'})],{spacing:{before:80,after:80}}));
          list(block.items).forEach(q => {
            children.push(para([run(q.question,{bold:true,color:'7DD3FC'})],{spacing:{after:40}}));
            children.push(para([run(q.answer || '（未作答）',{color:q.answer === '（未作答）' ? 'A7B8C8' : 'CCFFFF'})],{spacing:{after:180}}));
          });
        }
      });
    });

    const footerSpec = { color:'CCCCCC', size:22 };
    children.push(para([run('')],{spacing:{before:320,after:80}}));
    children.push(para([run('────────────',footerSpec)],{alignment:'right',spacing:{after:80}}));
    children.push(para([run('平台：Oracle Shion',footerSpec)],{alignment:'right',spacing:{after:60}}));
    children.push(para([run('出品：莎緹亞™🥦',{color:'66CCFF',size:22})],{alignment:'right',spacing:{after:60}}));
    children.push(para([run('撰寫：Yukise',footerSpec)],{alignment:'right',spacing:{after:60}}));

    const doc = new Document({
      creator:'Yukise & Satia', lastModifiedBy:'Yukise & Satia',
      title:model?.title || 'Oracle Shion CharacterData', subject:'Oracle Shion',
      description:'Oracle Shion CharacterData export', keywords:'Oracle Shion, Satia, CharacterData',
      background:{color:'000000'},
      styles:{ default:{ document:{ run:{size:WORD_FONT_SIZE,font:'Noto Sans TC'}, paragraph:{spacing:{line:276}} } } },
      sections:[{properties:{},children}]
    });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${safeFileName(model?.title)}.docx`; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function showMessage(message, isError=false){
    if(typeof global.CDShowToast === 'function') global.CDShowToast(message, isError ? 2800 : 1800);
    else if(isError) alert(message);
  }

  function buildOptions(snapshot){
    const out=[];
    ['tl','rtl'].forEach(type => {
      const sandbox=snapshot?.[type]; if(!sandbox) return;
      list(sandbox.meta?.slots).forEach((meta,offset) => {
        const index=offset+1;
        const isCurrent=snapshot.current?.type===type && Number(snapshot.current?.index)===index;
        if(!meta?.enabled && !isCurrent) return;
        const status=sandbox.slots?.[offset];
        const name=trim(meta?.name)||'null';
        out.push({type,index,label:`${type.toUpperCase()}｜${branchId(type,index,status)}-${name}`});
      });
    });
    return out;
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style'); style.id=STYLE_ID;
    style.textContent=`
      .CDExportModal{position:fixed;inset:0;z-index:9090;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);backdrop-filter:blur(3px)}
      .CDExportModal[hidden]{display:none!important}.CDExportCard{width:min(92vw,560px);padding:10px;border-radius:10px;background:radial-gradient(circle at top,#2b323f 0,#141822 42%,#090b12 100%);border:1px solid rgba(183,143,255,.58);box-shadow:0 0 20px rgba(0,0,0,.78),inset 0 0 16px rgba(183,143,255,.08);color:#e8f4ff}
      .CDExportHead{font-weight:900;letter-spacing:.08em;padding-bottom:7px;border-bottom:1px solid rgba(183,143,255,.35);text-shadow:0 0 6px rgba(183,143,255,.55)}
      .CDExportHint{margin:8px 0 5px;color:#a9bdd2;font-size:12px;line-height:1.45}.CDExportSelect{width:100%;height:34px}
      .CDExportPreview{margin-top:8px;padding:7px 9px;border:1px solid rgba(120,210,255,.20);border-radius:7px;background:rgba(6,10,18,.72);color:#cceaff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .CDExportFoot{display:flex;justify-content:flex-end;gap:7px;margin-top:10px}`;
    document.head.appendChild(style);
  }

  function ensureModal(){
    injectStyle();
    let modal=document.getElementById(MODAL_ID); if(modal) return modal;
    modal=document.createElement('div'); modal.id=MODAL_ID; modal.className='CDExportModal'; modal.hidden=true;
    modal.innerHTML=`<div class="CDExportCard" role="dialog" aria-modal="true" aria-labelledby="CDExportTitle">
      <div class="CDExportHead" id="CDExportTitle">資料匯出</div>
      <div class="CDExportHint" id="CDExportHint">選擇要輸出的 TL／RTL。內容直接讀取 status，不讀取 Render DOM。</div>
      <select class="CDExportSelect" id="CDExportSelect"></select><div class="CDExportPreview" id="CDExportPreview"></div>
      <div class="CDExportFoot"><button type="button" id="CDExportCancel">取消</button><button type="button" id="CDExportConfirm">匯出</button></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal) modal.hidden=true;});
    modal.querySelector('#CDExportCancel')?.addEventListener('click',()=>{modal.hidden=true;});
    modal.querySelector('#CDExportSelect')?.addEventListener('change',updatePreview);
    modal.querySelector('#CDExportConfirm')?.addEventListener('click',async()=>{
      const mode=modal.dataset.mode || 'clipboard';
      try{
        const [type,rawIndex]=String(modal.querySelector('#CDExportSelect')?.value||'').split(':');
        const model=buildModel({snapshot:getSnapshot(),type,index:Number(rawIndex),title:currentTitle()});
        if(mode==='doc') { await exportDocx(model); showMessage('DOCX 已匯出 ✅'); }
        else { await copyText(formatText(model)); showMessage('已複製到剪貼簿 ✅'); }
        modal.hidden=true;
      }catch(error){
        console.error('[CDExportModel] export failed:',error);
        showMessage(`${mode==='doc'?'DOCX':'剪貼簿'}匯出失敗：${error?.message||error}`,true);
      }
    });
    return modal;
  }

  function updatePreview(){
    const modal=document.getElementById(MODAL_ID); if(!modal) return;
    const option=modal.querySelector('#CDExportSelect')?.selectedOptions?.[0];
    const preview=modal.querySelector('#CDExportPreview');
    if(preview) preview.textContent=option?`${currentTitle()}｜${option.textContent}`:'（尚未選擇）';
  }

  function open(mode){
    try{
      const snapshot=getSnapshot(); const options=buildOptions(snapshot);
      if(!options.length){showMessage('目前沒有可輸出的 TL／RTL。',true);return false;}
      const modal=ensureModal(); modal.dataset.mode=mode==='doc'?'doc':'clipboard';
      modal.querySelector('#CDExportTitle').textContent=mode==='doc'?'DOCX 匯出':'剪貼簿匯出';
      modal.querySelector('#CDExportConfirm').textContent=mode==='doc'?'匯出 Word':'複製到剪貼簿';
      const select=modal.querySelector('#CDExportSelect'); select.replaceChildren();
      options.forEach(row=>{const opt=document.createElement('option');opt.value=`${row.type}:${row.index}`;opt.textContent=row.label;select.appendChild(opt);});
      const cur=`${snapshot.current?.type==='rtl'?'rtl':'tl'}:${Math.max(1,Number(snapshot.current?.index)||1)}`;
      select.value=cur; if(select.selectedIndex<0) select.selectedIndex=0;
      updatePreview(); modal.hidden=false; return true;
    }catch(error){console.error('[CDExportModel] open failed:',error);showMessage(`匯出功能啟動失敗：${error?.message||error}`,true);return false;}
  }

  const api=Object.freeze({
    VERSION,
    buildModel,
    formatText,
    copyText,
    exportDocx,
    openClipboard:()=>open('clipboard'),
    openDoc:()=>open('doc'),
    getVersion:()=>VERSION
  });
  global.CDExportModel=api;
})(window);
