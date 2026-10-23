(function(global){
  'use strict';

  const VERSION = '1.06';
  const STYLE_ID = 'CDRenderPluginStyle';
  const PATH_IDCARD = '【崩界櫻雪】Standard/04【崩界櫻雪】圖片庫/23-【角色】證件/';
  const PATH_FULLBODY = '【崩界櫻雪】Standard/04【崩界櫻雪】圖片庫/22-【角色】人設圖/';
  const PATH_FS = '【崩界櫻雪】Standard/04【崩界櫻雪】圖片庫/21-【角色】FirstShow/';
  const IMAGE_EXT = '.png';

  const QA_GROUPS = [
    { title:'心靈問答（本人回答）', key:'mind', questions:[
      ['q1','有什麼一直在做的事情？是自願的還是被迫的？'],
      ['q2','期望自己成為什麼樣的人？而實際上別人怎麼看你？'],
      ['q3','如果你不在這世界上，對世界會有什麼影響？'],
      ['q4','曾經後悔過什麼事情嗎？'],
      ['q5','你唯一願意的示弱對象是誰？']
    ]},
    { title:'社交問答（本人回答）', key:'social', questions:[
      ['q1','目前的工作是什麼？工作態度為何？'],
      ['q2','家庭狀況如何？有無特殊背景或成長經歷？'],
      ['q3','現階段有無親密友人？'],
      ['q4','對戀愛的積極度與心態為何？'],
      ['q5','最敬佩或是最喜歡的人是誰？']
    ]},
    { title:'外在形象（他人描述）', key:'appearance', questions:[
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
      .CDRDetailsBody,.CDRTopicBody{padding:7px 10px 9px;white-space:pre-wrap;line-height:1.5;background:transparent}
      .CDREmploymentRow{display:flex;align-items:stretch;margin:4px 0;min-width:0}
      .CDREmploymentYear{width:72px;flex:0 0 72px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(180,220,255,.26);border-radius:5px;background:rgba(255,255,255,.035);color:#fff;font-weight:800;white-space:nowrap}
      .CDREmploymentBody{display:flex;flex:1 1 auto;min-width:0;flex-wrap:nowrap}
      .CDREmploymentInfo,.CDREmploymentPosition{display:flex;align-items:center;justify-content:flex-start;min-width:0;padding:3px 6px;color:#cceaff;border:1px solid rgba(180,220,255,.16);background:rgba(255,255,255,.018)}
      .CDREmploymentInfo{flex:1 1 50%}.CDREmploymentPosition{flex:1 1 50%}
      .CDREmploymentRow.is-general .CDREmploymentBody{flex-wrap:nowrap}
      .CDREmploymentRow.is-general .CDREmploymentInfo{flex:1 1 100%;justify-content:flex-start}
      .CDRRankIcon{height:24px;width:auto;max-width:90px;object-fit:contain;flex:0 0 auto;margin-right:5px}
      .CDRRankText,.CDRPositionText{white-space:nowrap}.CDRPositionText{margin-left:0}
      .CDRCombatAptRow{display:flex;align-items:center;flex-wrap:nowrap}
      .CDRCombatAptIcons{display:inline-flex;align-items:center;gap:8px;flex-wrap:nowrap;min-height:24px}
      .CDRCombatIcon{width:24px;height:24px;object-fit:contain;vertical-align:middle}
      .CDRQASection{margin:6px 0 9px}
      .CDRQAGroup{margin:8px 0 4px;padding:3px 10px;border:1px solid rgba(153,255,255,.30);border-left:4px solid #4cf;border-radius:6px;background:#222;font-size:13px;font-weight:800;color:#ddd}
      .CDRQA{padding:2px 3px 6px;margin:0}
      .CDRQ{font-weight:600;color:#ffecb3;white-space:pre-wrap;margin-bottom:2px}
      .CDRA{color:#cceaff;white-space:pre-wrap;min-height:1.35em}
      .CDRDirect{white-space:pre-wrap;color:#e8f4ff;min-height:1.5em;padding:4px 3px}
      .CDRMuted{color:#8294a8}
      .CDRWeaponGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px}
      .CDRPictureBody{padding:7px;background:rgba(0,0,0,.12)}
      .CDRIDDesktop{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .CDRIDDesktop img,.CDRIDFace img{display:block;width:100%;height:auto;object-fit:contain;border-radius:6px;background:#05070a}
      .CDRIDEmpty{min-height:120px;border:1px dashed rgba(183,143,255,.22);border-radius:6px;background:rgba(255,255,255,.018)}
      .CDRIDFlip{display:none;perspective:1000px;cursor:pointer;touch-action:manipulation}
      .CDRIDFlipInner{position:relative;width:100%;transform-style:preserve-3d;transition:transform .32s cubic-bezier(.2,.7,.2,1)}
      .CDRIDFlip.is-back .CDRIDFlipInner{transform:rotateY(180deg)}
      .CDRIDFace{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
      .CDRIDFace.is-back{transform:rotateY(180deg)}
      .CDRIDFlipSizer{display:block;width:100%;height:auto;visibility:hidden;pointer-events:none}
      .CDRFullMain{width:100%;aspect-ratio:3240/1920;display:flex;align-items:center;justify-content:center;border:1px solid rgba(183,143,255,.22);border-radius:7px;background:#05070a;overflow:hidden;cursor:pointer;touch-action:manipulation}
      .CDRFullMain img{display:block;width:100%;height:100%;object-fit:contain;opacity:1;transition:opacity .14s ease}
      .CDRFullMain img.is-fading{opacity:0}
      .CDRFullEmpty{color:#718093;font-size:13px;padding:40px 10px;text-align:center}
      .CDRFullRail{display:flex;gap:6px;margin-top:7px;overflow-x:auto;overflow-y:hidden;padding:2px 1px 5px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
      .CDRFullRail::-webkit-scrollbar{display:none}
      .CDRFullThumb{flex:0 0 clamp(72px,22%,150px);height:clamp(72px,18vw,180px);border:1px solid rgba(183,143,255,.20);border-radius:6px;background:rgba(255,255,255,.018);padding:2px;overflow:hidden;cursor:pointer;position:relative}
      .CDRFullThumb.is-empty{cursor:default;border-style:dashed;opacity:.55}
      .CDRFullThumb.is-active{border-color:#b78fff;box-shadow:inset 0 0 0 1px rgba(183,143,255,.48),0 0 8px rgba(183,143,255,.16)}
      .CDRFullThumb img{display:block;width:100%;height:100%;object-fit:cover;border-radius:4px}
      .CDRFullSlotNo{position:absolute;left:4px;bottom:3px;padding:1px 4px;border-radius:4px;background:rgba(0,0,0,.68);color:#d9c6ff;font-size:10px;font-family:monospace}
      .CDRBasicWithFS{position:relative;overflow:hidden}
      .CDRFS{position:absolute;right:6px;bottom:6px;height:clamp(205px,34vw,340px);max-width:55%;pointer-events:none;z-index:2;padding:5px;border-radius:6px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09),0 0 0 1px rgba(0,0,0,.5)}
      .CDRFS img{display:block;height:100%;width:auto;max-width:100%;object-fit:contain}
      .CDRMeta{font-size:12px;color:#8ea8bd;text-align:right;padding:2px 3px 0}
      @media(max-width:700px){.CDRWeaponGrid{grid-template-columns:1fr}.CDRIDDesktop{display:none}.CDRIDFlip{display:block}.CDRFS{height:clamp(180px,58vw,245px);max-width:62%}.CDREmploymentBody{flex-wrap:wrap}.CDREmploymentInfo,.CDREmploymentPosition{flex:1 1 100%}.CDREmploymentRow.is-general .CDREmploymentBody{flex-wrap:nowrap}.CDREmploymentRow.is-general .CDREmploymentInfo{flex:1 1 100%}.CDREmploymentYear{width:72px;flex-basis:72px}}
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
  function imageSrc(basePath,filename){const name=text(filename).trim();return name?`${basePath}${encodeURIComponent(name)}${/\.[a-z0-9]+$/i.test(name)?'':IMAGE_EXT}`:'';}
  function imageNode(className,src,alt){const img=el('img',className);img.alt=alt||'';img.decoding='async';img.loading='lazy';if(src)img.src=src;return img;}
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
      const isGeneral=kind==='employmentGeneral';
      const item=el('div',`CDREmploymentRow${isGeneral?' is-general':''}`);
      const year=el('div','CDREmploymentYear',nonEmpty(x.year)?`${text(x.year).replace(/年$/,'')}年`:'');
      const body=el('div','CDREmploymentBody');
      if(isGeneral){
        const generalText=[x.org,x.position].filter(nonEmpty).join('-');
        body.appendChild(el('div','CDREmploymentInfo',generalText));
      }else{
        const info=el('div','CDREmploymentInfo',text(x.org));
        const position=el('div','CDREmploymentPosition');
        if(nonEmpty(x.rank)){
          const img=el('img','CDRRankIcon');
          img.src=`【崩界櫻雪】Assets/Picture/MilitaryRank/${encodeURIComponent(text(x.rank))}.png`;
          img.alt=text(x.rank);img.addEventListener('error',()=>img.remove(),{once:true});
          position.append(img,el('span','CDRRankText',text(x.rank)));
        }
        if(nonEmpty(x.position)) position.appendChild(el('span','CDRPositionText',`${nonEmpty(x.rank)?'-':''}${text(x.position)}`));
        body.append(info,position);
      }
      item.append(year,body);b.appendChild(item);
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
    b.append(row('戰測階級：',field(status,'combat.rank')),row('主要適性：',field(status,'combat.mainRole')));
    const aptMap={
      '前衛':'前衛.png','防衛者':'防衛.png','中衛':'中衛.png','狙擊':'狙擊.png',
      '前衛魔導士':'前法.png','後衛魔導士':'後法.png','輔助':'輔助.png','治療':'治療.png'
    };
    const aptOrder=['前衛','防衛者','中衛','狙擊','前衛魔導士','後衛魔導士','輔助','治療'];
    const aptRow=el('div','CDRRow CDRCombatAptRow');
    aptRow.appendChild(el('div','CDRLabel','具備適性：'));
    const icons=el('div','CDRValue CDRCombatAptIcons');
    let hasAny=false;
    aptOrder.forEach(name=>{
      const value=field(status,`combat.aptitudes.${name}`);
      if(!(value===true||value==='true'||value==='on'))return;
      const img=el('img','CDRCombatIcon');
      img.src=`【崩界櫻雪】Assets/Picture/BattleIcon/${encodeURIComponent(aptMap[name])}`;
      img.alt=name;img.title=name;img.addEventListener('error',()=>img.remove(),{once:true});
      icons.appendChild(img);hasAny=true;
    });
    if(!hasAny) icons.textContent='－';
    aptRow.appendChild(icons);b.appendChild(aptRow);
    b.append(row('戰鬥特色：',field(status,'combat.feature')));
    b.appendChild(detail('戰鬥能力設定',field(status,'combat.detail')));return b;
  }

  function renderWeapons(status,globalData){
    const b=block('武器設定','weapons');
    const slots=status?.managers?.weaponSlots||{};
    const registry=Array.isArray(globalData?.weapon?.registry)?globalData.weapon.registry:[];
    const ownSort=Array.isArray(status?.managers?.weaponSort)?status.managers.weaponSort:[];
    const order=[...ownSort.filter(n=>registry.includes(n)),...registry.filter(n=>!ownSort.includes(n))];
    const joinParts=(...values)=>values.filter(nonEmpty).map(text).join(' / ')||'－';

    order.forEach(n=>{
      const x=slots[String(n)]||slots[`slot${String(n).padStart(2,'0')}`];
      if(!x||x.enabled===false)return;

      const name=nonEmpty(x.name)?text(x.name):`武器 ${n}`;
      const title=x.groupType==='套裝武器'?`${name}x${text(x.count)}`:name;
      const det=el('details','CDRDetails CDRWeaponDetails');
      det.appendChild(el('summary','',title));

      const body=el('div','CDRDetailsBody CDRWeaponBody');
      body.appendChild(row('武器種類：',joinParts(x.category,x.type,x.style)));
      body.appendChild(row('武器規格：',joinParts(x.grade,x.mechanism)));
      body.appendChild(row('武器細節：',x.detail));
      det.appendChild(body);
      b.appendChild(det);
    });
    return b;
  }

  function renderQA(status){
    const b=block('角色問答','qa');
    QA_GROUPS.forEach(g=>{
      const section=el('div','CDRQASection');
      section.appendChild(el('div','CDRQAGroup',g.title));
      g.questions.forEach(([id,q])=>{
        const item=el('div','CDRQA');
        item.append(el('div','CDRQ',q),el('div','CDRA',text(field(status,`qa.${g.key}.${id}`))||'－'));
        section.appendChild(item);
      });
      b.appendChild(section);
    });
    return b;
  }

  function renderIDCard(status){
    const det=el('details','CDRDetails CDRPictureDetails');
    det.appendChild(el('summary','','證件照'));
    const body=el('div','CDRDetailsBody CDRPictureBody');
    const files=[
      {side:'front',name:field(status,'picture.idCard.front'),label:'證件照正面'},
      {side:'back',name:field(status,'picture.idCard.back'),label:'證件照背面'}
    ];
    const available=files.filter(x=>nonEmpty(x.name));
    const desktop=el('div','CDRIDDesktop');
    files.forEach(x=>{
      const src=imageSrc(PATH_IDCARD,x.name);
      if(src){const img=imageNode('',src,x.label);img.addEventListener('error',()=>img.replaceWith(el('div','CDRIDEmpty')),{once:true});desktop.appendChild(img);}
      else desktop.appendChild(el('div','CDRIDEmpty'));
    });
    body.appendChild(desktop);
    if(available.length){
      const flip=el('div','CDRIDFlip');
      flip.setAttribute('role','button');flip.tabIndex=0;
      const inner=el('div','CDRIDFlipInner');
      const frontData=available[0];
      const backData=available[1]||available[0];
      const front=el('div','CDRIDFace is-front');
      const back=el('div','CDRIDFace is-back');
      const frontImg=imageNode('',imageSrc(PATH_IDCARD,frontData.name),frontData.label);
      const backImg=imageNode('',imageSrc(PATH_IDCARD,backData.name),backData.label);
      const sizer=imageNode('CDRIDFlipSizer',imageSrc(PATH_IDCARD,frontData.name),'');
      front.appendChild(frontImg);back.appendChild(backImg);inner.append(sizer,front,back);flip.appendChild(inner);
      const toggle=()=>{if(available.length>1)flip.classList.toggle('is-back');};
      flip.addEventListener('click',toggle);
      flip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
      body.appendChild(flip);
    }else body.appendChild(el('div','CDRIDEmpty'));
    det.appendChild(body);return det;
  }

  function renderFullBody(status,globalData){
    const det=el('details','CDRDetails CDRPictureDetails');
    det.appendChild(el('summary','','全身照'));
    const body=el('div','CDRDetailsBody CDRPictureBody');
    const library=globalData?.picture?.library||{};
    const playlist=status?.managers?.picturePlaylist||{sort:[],enabled:{}};
    const incoming=Array.isArray(playlist.sort)?playlist.sort.map(Number):[];
    const seen=new Set();
    const order=[...incoming.filter(n=>n>=1&&n<=9&&!seen.has(n)&&seen.add(n)),...Array.from({length:9},(_,i)=>i+1).filter(n=>!seen.has(n))];
    const enabled=playlist.enabled||{};
    const items=order.map(slot=>{
      const data=library[String(slot)]||library[String(slot).padStart(2,'0')]||{};
      return {slot,note:text(data.note),fileB:text(data.fileB),fileW:text(data.fileW),enabled:!!(enabled[String(slot)]??enabled[String(slot).padStart(2,'0')])};
    });
    let tone='B';
    let current=items.find(x=>x.enabled&&nonEmpty(x.fileB));
    if(!current) current=items.find(x=>x.enabled&&(nonEmpty(x.fileB)||nonEmpty(x.fileW)))||null;
    const main=el('div','CDRFullMain');
    const rail=el('div','CDRFullRail');
    let mainImg=null;
    const fileFor=item=>tone==='W'?item?.fileW:item?.fileB;
    const refreshActive=()=>rail.querySelectorAll('.CDRFullThumb').forEach(node=>node.classList.toggle('is-active',current&&Number(node.dataset.slot)===current.slot));
    const refreshThumbs=()=>{
      items.forEach(item=>{
        const node=rail.querySelector(`.CDRFullThumb[data-slot="${item.slot}"]`);
        if(!node)return;
        const old=node.querySelector('img');if(old)old.remove();
        const file=item.enabled?fileFor(item):'';
        node.classList.toggle('is-empty',!nonEmpty(file));
        if(nonEmpty(file)){const img=imageNode('',imageSrc(PATH_FULLBODY,file),item.note||`全身圖 ${item.slot}`);img.addEventListener('error',()=>{img.remove();node.classList.add('is-empty');},{once:true});node.prepend(img);}
      });
      refreshActive();
    };
    const showCurrent=(animate=true)=>{
      if(!current||!nonEmpty(fileFor(current))){main.replaceChildren(el('div','CDRFullEmpty','目前顯示模式沒有可用圖片'));mainImg=null;return;}
      const src=imageSrc(PATH_FULLBODY,fileFor(current));
      const apply=()=>{
        const img=imageNode('',src,current.note||`全身圖 ${current.slot}`);
        img.addEventListener('error',()=>{img.replaceWith(el('div','CDRFullEmpty','圖片載入失敗'));mainImg=null;},{once:true});
        img.addEventListener('load',()=>requestAnimationFrame(()=>img.classList.remove('is-fading')),{once:true});
        if(animate)img.classList.add('is-fading');
        main.replaceChildren(img);mainImg=img;
      };
      if(animate&&mainImg){mainImg.classList.add('is-fading');setTimeout(apply,70);}else apply();
    };
    items.forEach(item=>{
      const thumb=el('div','CDRFullThumb');thumb.dataset.slot=String(item.slot);thumb.title=item.note||`Slot ${item.slot}`;
      thumb.appendChild(el('span','CDRFullSlotNo',String(item.slot).padStart(2,'0')));
      thumb.addEventListener('click',()=>{if(!item.enabled||!nonEmpty(fileFor(item)))return;current=item;showCurrent(true);refreshActive();});
      rail.appendChild(thumb);
    });
    main.addEventListener('click',()=>{
      const next=tone==='B'?'W':'B';
      if(!current||!nonEmpty(next==='W'?current.fileW:current.fileB))return;
      tone=next;refreshThumbs();showCurrent(true);
    });
    refreshThumbs();showCurrent(false);body.append(main,rail);det.appendChild(body);return det;
  }

  function renderPictures(status,globalData){
    const b=block('圖片區域','pictures');
    b.append(renderIDCard(status),renderFullBody(status,globalData));
    return b;
  }

  function appendFS(basic,status){
    const name=field(status,'picture.fs.filename');
    if(!nonEmpty(name))return;
    basic.classList.add('CDRBasicWithFS');
    const shell=el('div','CDRFS');
    const img=imageNode('',imageSrc(PATH_FS,name),'FS');
    img.addEventListener('error',()=>shell.remove(),{once:true});shell.appendChild(img);basic.appendChild(shell);
  }

  function render(root,payload){
    if(!(root instanceof Element)) throw new TypeError('CDRender.render 需要有效的掛載元素。');
    injectStyle();
    const safe=clone(payload||{})||{};const status=safe.status||{fields:{},managers:{}};const globalData=safe.global||{};
    root.replaceChildren();const page=el('div','CDRPage');
    const basicBlock=renderFixed(status,'基本資訊','basic',[
      ['全名：','basic.fullname'],['讀音：','basic.nameRuby'],['語系：','basic.nameTag'],['性別：','basic.gender'],['種族：','basic.race'],['身高：','basic.height'],['胸圍：','basic.cupSize'],['髮色：','basic.haircolor'],['瞳色：','basic.eyescolor'],['生日：','basic.birthday'],['年齡：','',makeAge]
    ]);
    appendFS(basicBlock,status);
    page.append(
      renderPictures(status,globalData),
      renderFixed(status,'System+Meta資訊','system',[
        ['角色ID：','SysMeta.characterIndex'],['設定層級：','SysMeta.settingLayer'],['演算層級：','SysMeta.computeLayer'],['所屬世代：','SysMeta.generation'],['數據年份：','SysMeta.dataYear'],['分支註記：','SysMeta.branch']
      ]),
      basicBlock,
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
