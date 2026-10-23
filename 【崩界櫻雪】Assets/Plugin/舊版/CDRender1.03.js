(function(global){
  'use strict';

  const VERSION = '1.03';
  const STYLE_ID = 'CDRenderPluginStyle';

  const QA_GROUPS = [
    { title:'心靈問答', key:'mind', questions:[
      ['q1','有什麼一直在做的事情？是自願的還是被迫的？'],
      ['q2','期望自己成為什麼樣的人？而實際上別人怎麼看你？'],
      ['q3','如果你不在這世界上，對世界會有什麼影響？'],
      ['q4','曾經後悔過什麼事情嗎？'],
      ['q5','你唯一願意的示弱對象是誰？']
    ]},
    { title:'社交問答', key:'social', questions:[
      ['q1','目前的工作是什麼？工作態度為何？'],
      ['q2','家庭狀況如何？有無特殊背景或成長經歷？'],
      ['q3','現階段有無親密友人？'],
      ['q4','對戀愛的積極度與心態為何？'],
      ['q5','最敬佩或是最喜歡的人是誰？']
    ]},
    { title:'外在形象', key:'appearance', questions:[
      ['q1','給人的外在印象為何？個性與長相？'],
      ['q2','有無特殊技能或興趣？大家有何看法？']
    ]}
  ];

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      body.cd-render-active #CDEditRoot{display:none!important}
      body:not(.cd-render-active) #CDRenderRoot{display:none!important}
      body.cd-render-active #CDRenderRoot{display:block!important}
      .CDRPage{display:flex;flex-direction:column;gap:7px;padding-bottom:24px}
      .CDRBlock{border:1px solid rgba(100,145,185,.42);border-radius:10px;background:linear-gradient(90deg,rgba(15,22,34,.93),rgba(6,9,15,.96));padding:6px 8px;box-shadow:0 0 10px rgba(40,100,180,.10)}
      .CDRTitle{margin:0 0 5px;padding:5px 9px;border-left:4px solid var(--cdr-accent,#6cf);border-radius:6px;background:rgba(255,255,255,.045);font-size:16px;color:#eaf8ff}
      .CDRBlock[data-render-block="system"],.CDRBlock[data-render-block="pictures"]{--cdr-accent:#b78fff}
      .CDRBlock[data-render-block="basic"],.CDRBlock[data-render-block="personality"],.CDRBlock[data-render-block="topics"]{--cdr-accent:#4cf}
      .CDRBlock[data-render-block="region"],.CDRBlock[data-render-block="design"]{--cdr-accent:#00ff00}
      .CDRBlock[data-render-block="education"],.CDRBlock[data-render-block="employmentMilitary"],.CDRBlock[data-render-block="employmentGeneral"],.CDRBlock[data-render-block="qa"],.CDRBlock[data-render-block="family"]{--cdr-accent:gold}
      .CDRBlock[data-render-block="combat"],.CDRBlock[data-render-block="weapons"]{--cdr-accent:#c33}
      .CDRRow{display:flex;align-items:flex-start;min-height:24px;padding:2px 2px}
      .CDRLabel{flex:0 0 auto;font-weight:800;color:#fff;padding-right:2px}
      .CDRValue{flex:1 1 auto;color:#cceaff;white-space:pre-wrap;overflow-wrap:anywhere;min-height:1.35em}
      .CDRSequenceItem,.CDRCard{border:1px solid rgba(130,180,220,.20);border-radius:7px;padding:5px 7px;margin:4px 0;background:rgba(255,255,255,.025)}
      .CDRSequenceItem+.CDRSequenceItem{border-top:1px solid rgba(170,210,235,.22);margin-top:7px;padding-top:7px}
      .CDRItemHead{font-weight:800;color:#fff;margin-bottom:3px}
      .CDRDetails,.CDRTopicDetails{margin:5px 0;border:1px solid rgba(155,185,205,.22);border-radius:7px;background:rgba(0,0,0,.16);overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
      .CDRDetails>summary,.CDRTopicDetails>summary{position:relative;cursor:pointer;padding:6px 9px 6px 24px;color:#c9d9e4;font-weight:650;background:rgba(255,255,255,.025);list-style:none}
      .CDRDetails>summary::-webkit-details-marker,.CDRTopicDetails>summary::-webkit-details-marker{display:none}
      .CDRDetails>summary::before,.CDRTopicDetails>summary::before{content:'▸';position:absolute;left:8px;top:50%;transform:translateY(-50%);color:var(--cdr-accent,#7db7d8);font-size:11px;transition:transform .14s ease}
      .CDRDetails[open]>summary::before,.CDRTopicDetails[open]>summary::before{transform:translateY(-50%) rotate(90deg)}
      .CDRDetails[open]>summary,.CDRTopicDetails[open]>summary{border-bottom:1px solid rgba(155,185,205,.18);background:rgba(255,255,255,.035)}
      .CDRDetailsBody,.CDRTopicBody{padding:7px 10px 9px;white-space:pre-wrap;color:#e8f4ff;line-height:1.5;background:transparent}
      .CDREmploymentRow{display:flex;align-items:stretch;margin:4px 0;min-width:0}
      .CDREmploymentYear{width:72px;flex:0 0 72px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(180,220,255,.26);border-radius:5px;background:rgba(255,255,255,.035);color:#fff;font-weight:800;white-space:nowrap}
      .CDREmploymentBody{display:flex;flex:1 1 auto;min-width:0;flex-wrap:nowrap}
      .CDREmploymentInfo,.CDREmploymentPosition{display:flex;align-items:center;justify-content:flex-start;min-width:0;padding:3px 6px;color:#cceaff;border:1px solid rgba(180,220,255,.16);background:rgba(255,255,255,.018)}
      .CDREmploymentInfo{flex:1 1 50%}.CDREmploymentPosition{flex:1 1 50%}
      .CDREmploymentRow.is-general .CDREmploymentBody{flex-wrap:nowrap}
      .CDREmploymentRow.is-general .CDREmploymentInfo{flex:1 1 auto}
      .CDREmploymentRow.is-general .CDREmploymentPosition{flex:0 1 auto;border-left:0}
      .CDRRankIcon{height:24px;width:auto;max-width:90px;object-fit:contain;flex:0 0 auto;margin-right:5px}
      .CDRRankText,.CDRPositionText{white-space:nowrap}.CDRPositionText{margin-left:4px}
      .CDRQAGroup{margin:7px 0 3px;padding:3px 8px;border-left:4px solid #fc6;background:rgba(255,255,255,.035);font-weight:800;color:#ffecb3}
      .CDRQA{padding:5px 6px;margin:3px 0;border:1px solid rgba(255,235,160,.13);border-radius:6px}
      .CDRQ{font-weight:800;color:#fff;white-space:pre-wrap}
      .CDRA{color:#cceaff;white-space:pre-wrap;margin-top:3px;min-height:1.35em}
      .CDRDirect{white-space:pre-wrap;color:#e8f4ff;min-height:1.5em;padding:4px 3px}
      .CDRMuted{color:#8294a8}
      .CDRWeaponGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px}
      .CDRMeta{font-size:12px;color:#8ea8bd;text-align:right;padding:2px 3px 0}
      @media(max-width:700px){.CDRWeaponGrid{grid-template-columns:1fr}.CDREmploymentBody{flex-wrap:wrap}.CDREmploymentInfo,.CDREmploymentPosition{flex:1 1 100%}.CDREmploymentRow.is-general .CDREmploymentBody{flex-wrap:nowrap}.CDREmploymentRow.is-general .CDREmploymentInfo{flex:1 1 auto}.CDREmploymentRow.is-general .CDREmploymentPosition{flex:0 1 auto}.CDREmploymentYear{width:72px;flex-basis:72px}}
    `;
    document.head.appendChild(style);
  }

  const text=v=>String(v??'');
  const nonEmpty=v=>text(v).trim()!=='' && text(v).trim()!=='－';
  const clone=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v??null));
  function el(tag,className,textContent){const n=document.createElement(tag);if(className)n.className=className;if(textContent!==undefined)n.textContent=textContent;return n;}
  function field(status,key){return status?.fields?.[key]??'';}
  function block(title,key){const section=el('section','CDRBlock');section.dataset.renderBlock=key;section.appendChild(el('h2','CDRTitle',title));return section;}
  function row(label,value){const r=el('div','CDRRow');r.append(el('div','CDRLabel',label),el('div','CDRValue',text(value)));return r;}
  function directBlock(title,key,value){const b=block(title,key);b.appendChild(el('div','CDRDirect',text(value)));return b;}
  function detail(summary,body,className='CDRDetails',bodyClass='CDRDetailsBody'){const d=el('details',className);const s=el('summary','',summary);const c=el('div',bodyClass,text(body));d.append(s,c);return d;}
  function makeAge(status){
    const y=Number((text(field(status,'SysMeta.dataYear')).match(/\d{3,4}/)||[])[0]);
    const b=Number((text(field(status,'basic.birthday')).match(/\d{3,4}/)||[])[0]);
    return Number.isFinite(y)&&Number.isFinite(b)&&y>=b?String(y-b):'';
  }
  function renderFixed(status,title,key,defs){const b=block(title,key);defs.forEach(([label,k,derive])=>b.appendChild(row(label,derive?derive(status):field(status,k))));return b;}

  function joinWithNote(main,note){const a=text(main).trim();const b=text(note).trim();return `${a}${nonEmpty(b)?`（${b}）`:''}`;}
  function renderRegion(status){
    const b=block('地域資訊','region');
    b.appendChild(row('出生都市：',joinWithNote(field(status,'region.birth.city'),field(status,'region.birth.note'))));
    const list=Array.isArray(status?.managers?.region)?status.managers.region:[];
    list.filter(x=>x&&x.enabled!==false&&(nonEmpty(x.city)||nonEmpty(x.note))).forEach(x=>b.appendChild(row('居住都市：',joinWithNote(x.city,x.note))));
    return b;
  }

  function renderEducation(status){
    const b=block('學業資訊','education');
    const list=Array.isArray(status?.managers?.education)?status.managers.education:[];
    list.filter(x=>x&&x.enabled!==false).forEach(x=>{
      const card=el('div','CDRSequenceItem');
      card.appendChild(row('學歷：',joinWithNote(x.school,x.note)));
      (Array.isArray(x.items)?x.items:[]).filter(d=>d&&d.enabled!==false&&(nonEmpty(d.class)||nonEmpty(d.dept)||nonEmpty(d.group))).forEach(d=>card.appendChild(row('科系：',[d.class,d.dept,d.group].filter(nonEmpty).join(' / '))));
      b.appendChild(card);
    });
    return b;
  }

  function renderEmployment(status,kind,title,key){
    const b=block(title,key); const list=Array.isArray(status?.managers?.[kind])?status.managers[kind]:[];
    list.filter(x=>x&&x.enabled!==false).forEach(x=>{
      const item=el('div',`CDREmploymentRow${kind==='employmentGeneral'?' is-general':''}`);
      const year=el('div','CDREmploymentYear',nonEmpty(x.year)?`${text(x.year).replace(/年$/,'')}年`:'');
      const body=el('div','CDREmploymentBody');
      const info=el('div','CDREmploymentInfo',text(x.org));
      const position=el('div','CDREmploymentPosition');
      if('rank' in x&&nonEmpty(x.rank)){
        const img=el('img','CDRRankIcon');
        img.src=`【崩界櫻雪】Assets/Picture/MilitaryRank/${encodeURIComponent(text(x.rank))}.png`;
        img.alt=text(x.rank);img.addEventListener('error',()=>img.remove(),{once:true});
        position.append(img,el('span','CDRRankText',text(x.rank)));
      }
      if(nonEmpty(x.position)) position.appendChild(el('span','CDRPositionText',`${nonEmpty(x.org)||('rank' in x&&nonEmpty(x.rank))?'－':''}${text(x.position)}`));
      body.append(info,position);item.append(year,body);b.appendChild(item);
    });return b;
  }

  function renderPersonality(status){const b=block('基本個性','personality');b.append(detail('公開特徵',field(status,'personality.public')),detail('非公開特徵',field(status,'personality.secret')));return b;}

  function renderTopics(status,globalData){
    const b=block('主題紀錄','topics'); const slots=status?.managers?.topicSlots||{};
    const registry=Array.isArray(globalData?.topic?.registry)?globalData.topic.registry:[];
    const sort=Array.isArray(globalData?.topic?.sort)?globalData.topic.sort:registry;
    sort.filter(n=>registry.includes(n)).forEach(n=>{const x=slots[String(n)]||slots[`slot${String(n).padStart(2,'0')}`];if(!x||x.enabled===false||(!nonEmpty(x.title)&&!nonEmpty(x.body)))return;b.appendChild(detail(x.title||`主題 ${n}`,x.body,'CDRDetails CDRTopicDetails','CDRDetailsBody CDRTopicBody'));});
    return b;
  }

  function renderCombat(status){
    const b=block('戰力設定','combat');
    b.append(row('戰測階級：',field(status,'combat.rank')),row('主要適性：',field(status,'combat.mainRole')),row('戰鬥特色：',field(status,'combat.feature')));
    const apts=[];Object.entries(status?.fields||{}).forEach(([k,v])=>{if(k.startsWith('combat.aptitudes.')&&(v===true||v==='true'||v==='on'))apts.push(k.split('.').pop());});
    b.appendChild(row('具備適性：',apts.join('、')));b.appendChild(detail('戰鬥能力設定',field(status,'combat.detail')));return b;
  }

  function renderWeapons(status,globalData){
    const b=block('武器設定','weapons');const slots=status?.managers?.weaponSlots||{};
    const registry=Array.isArray(globalData?.weapon?.registry)?globalData.weapon.registry:[];
    const ownSort=Array.isArray(status?.managers?.weaponSort)?status.managers.weaponSort:[];
    const order=[...ownSort.filter(n=>registry.includes(n)),...registry.filter(n=>!ownSort.includes(n))];
    order.forEach(n=>{const x=slots[String(n)]||slots[`slot${String(n).padStart(2,'0')}`];if(!x||x.enabled===false)return;const card=el('div','CDRCard');card.appendChild(el('div','CDRItemHead',x.name||`武器 ${n}`));const grid=el('div','CDRWeaponGrid');[['武器群組',x.groupType],['數量',x.count],['分類',x.category],['類型',x.type],['型式',x.style],['品級',x.grade],['機制',x.mechanism]].forEach(([l,v])=>grid.appendChild(row(`${l}：`,v)));card.appendChild(grid);if(nonEmpty(x.detail))card.appendChild(detail('詳細資料',x.detail));b.appendChild(card);});
    return b;
  }

  function renderQA(status){const b=block('角色問答','qa');QA_GROUPS.forEach(g=>{b.appendChild(el('div','CDRQAGroup',g.title));g.questions.forEach(([id,q])=>{const item=el('div','CDRQA');item.append(el('div','CDRQ',`題目：${q}`),el('div','CDRA',`答：${text(field(status,`qa.${g.key}.${id}`))}`));b.appendChild(item);});});return b;}

  function render(root,payload){
    if(!(root instanceof Element)) throw new TypeError('CDRender.render 需要有效的掛載元素。');
    injectStyle();
    const safe=clone(payload||{})||{};const status=safe.status||{fields:{},managers:{}};const globalData=safe.global||{};
    root.replaceChildren();const page=el('div','CDRPage');
    page.append(
      renderFixed(status,'System+Meta資訊','system',[
        ['角色ID：','SysMeta.characterIndex'],['設定層級：','SysMeta.settingLayer'],['演算層級：','SysMeta.computeLayer'],['所屬世代：','SysMeta.generation'],['數據年份：','SysMeta.dataYear'],['分支註記：','SysMeta.branch']
      ]),
      renderFixed(status,'基本資訊','basic',[
        ['全名：','basic.fullname'],['讀音：','basic.nameRuby'],['語系：','basic.nameTag'],['性別：','basic.gender'],['種族：','basic.race'],['身高：','basic.height'],['胸圍：','basic.cupSize'],['髮色：','basic.haircolor'],['瞳色：','basic.eyescolor'],['生日：','basic.birthday'],['年齡：','',makeAge]
      ]),
      renderRegion(status),renderEducation(status),
      renderEmployment(status,'employmentMilitary','就業資訊－軍','employmentMilitary'),
      renderEmployment(status,'employmentGeneral','就業資訊－民','employmentGeneral'),
      renderPersonality(status),renderTopics(status,globalData),renderCombat(status),renderWeapons(status,globalData),renderQA(status),
      directBlock('家族成員','family',field(status,'chara.family')),
      directBlock('設計雜談','design',field(status,'design.Info'))
    );
    const meta=el('div','CDRMeta',`${text(safe.meta?.sandboxType||'').toUpperCase()}${text(safe.meta?.slotNo||'')}｜CDRender v${VERSION}`);page.appendChild(meta);
    root.appendChild(page);return root;
  }

  function clear(root){if(root instanceof Element)root.replaceChildren();}
  global.CDRender=Object.freeze({VERSION,render,clear,getVersion:()=>VERSION});
})(window);
