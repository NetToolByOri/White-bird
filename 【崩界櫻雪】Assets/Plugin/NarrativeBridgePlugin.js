(function(global){
  'use strict';

  const VERSION='1.03';
  const DEFAULT_DATA_PATH='【崩界櫻雪】Assets/Registry/Collapse/Story/106-Narrative Bridge System.json';
  const cache=new Map();
  const pad=(value,size)=>String(Number(value)||0).padStart(size,'0');
  const nodeId=sequence=>`ST-${pad(sequence?.arc,2)}-${pad(sequence?.chapter,3)}-${pad(sequence?.section,2)}`;

  function sourceOf(value){
    if(!value||typeof value!=='object')return null;
    return {
      motherId:String(value.motherId||value.母體ID||''),
      branchSlot:Number(value.branchSlot||value.分支槽位||0),
      branchId:String(value.branchId||value.分支ID||''),
      era:String(value.era||value.時代||''),
      branchType:String(value.branchType||value.分支類型||''),
      branchNote:String(value.branchNote||value.分支備註||'')
    };
  }

  function migratePresence(value){
    const direct=value?.presenceMode||value?.節點狀態;
    if(['自動','初登場','一般登場','複習登場','完整重建','不注入'].includes(direct))return direct;
    const appearance=value?.appearance||value?.appearType||value?.登場類型||'';
    const anchor=value?.anchorMode||value?.注入模式||'自動';
    if(anchor==='不注入')return '不注入';
    if(anchor==='精簡')return '一般登場';
    if(anchor==='複習')return '複習登場';
    if(anchor==='完整')return appearance==='初登場'?'初登場':'完整重建';
    if(appearance==='初登場')return '初登場';
    if(appearance==='複習用')return '複習登場';
    return '自動';
  }

  function normalizeCast(value){
    const identity=value?.identity||value||{};
    const narrative=value?.narrative||value||{};
    const sex=String(identity.sex||identity.性別||'');
    return {
      name:String(identity.name||identity.名字||''),
      sex,
      race:String(identity.race||identity.種族||''),
      height:identity.height??identity.身高??'',
      hair:String(identity.hair||identity.髮色||''),
      eye:String(identity.eye||identity.瞳色||''),
      bust:sex==='女'?String(identity.bust||identity.胸圍||''):'',
      depth:String(narrative.depth||narrative.level||narrative.層級||'三級'),
      presenceMode:migratePresence(narrative),
      brief:String(narrative.brief||narrative.note||narrative.備註||''),
      source:sourceOf(value?.ref||value?.source||value?.來源)
    };
  }

  function normalizePov(value){
    const type=value?.type||value?.類型||((value?.role||value?.角色)==='混合'?'mixed':'single');
    const raw=Array.isArray(value?.characters||value?.角色陣列)?(value.characters||value.角色陣列):[];
    const normalizedNames=Array.isArray(value?.names)?value.names.map(name=>String(name||'')).filter(Boolean):[];
    const names=raw.map(ref=>String(ref?.name||ref?.名字||'')).filter(Boolean);
    const legacy=String(value?.role||value?.角色||'');
    return {
      type,
      names:names.length
        ? names
        : (
            normalizedNames.length
              ? normalizedNames
              : (
                  legacy
                    ? [legacy]
                    : ((type==='mixed'||type==='混合')?['混合']:[])
                )
          )
    };
  }

  function normalizeNode(raw){
    raw=raw||{};

    const sequence=raw.sequence?{
      arc:Number(raw.sequence.arc||0),
      chapter:Number(raw.sequence.chapter||0),
      section:Number(raw.sequence.section||0)
    }:raw.事件?{
      arc:Number(raw.事件.篇||0),
      chapter:Number(raw.事件.章||0),
      section:Number(raw.事件.節||0)
    }:{
      arc:Number(raw.event?.arc||0),
      chapter:Number(raw.event?.chapter||0),
      section:Number(raw.event?.section||0)
    };

    const world=raw.worldTime||raw.時間軸||raw.timeline||{};
    const scene=raw.scene||raw.定位||raw.position||{};
    const povRaw=raw.pov||raw.視角||{};
    const intelRaw=raw.intel||raw.情報清單||raw.intelList||[];
    const castRaw=raw.cast||raw.登場角色||raw.people||[];

    return {
      id:nodeId(sequence),
      sequence,

      worldTime:{
        date:String(world.date||world.日期||''),
        time:String(world.time||world.時間||'')
      },

      scene:{
        plotType:String(scene.plotType||scene.劇情||scene.plot||''),
        macroLevel:String(scene.macroLevel||scene.宏觀||scene.macro||''),
        subjectiveLevel:String(scene.subjectiveLevel||scene.主觀||scene.subjective||''),
        location:String(scene.location||scene.地點||''),
        faction:String(scene.faction||povRaw.faction||povRaw.陣營||'')
      },

      pov:normalizePov(povRaw),

      intel:(Array.isArray(intelRaw)?intelRaw:[]).map(info=>({
        attr:String(info?.attr||info?.屬性||''),
        visibility:String(info?.visibility||info?.category||info?.定位||''),
        type:String(info?.type||info?.種類||''),
        intelId:String(info?.intelId||info?.情報ID||''),
        summary:String(info?.summary||info?.intelsummary||info?.摘要||'')
      })),

      cast:(Array.isArray(castRaw)?castRaw:[]).map(normalizeCast),

      summary:String(raw.summary||raw.storysummary||raw.情報摘要||'')
    };
  }

  function normalizeDataset(data){
    const root=data&&typeof data==='object'?data:{};
    const nodes=(Array.isArray(root)?root:root.nodes)||[];

    return {
      schema:'OracleShion.NarrativeBridge',
      schemaVersion:Number(root.schemaVersion||3),
      storyProgress:Number(root.storyProgress||0),
      nodes:nodes.map(normalizeNode)
    };
  }

  function refId(ref){
    if(typeof ref==='string')return ref;

    return nodeId({
      arc:ref?.arc??ref?.篇,
      chapter:ref?.chapter??ref?.cha??ref?.章,
      section:ref?.section??ref?.sec??ref?.節
    });
  }

  function findNormalizedNode(dataset,ref){
    if(typeof ref==='object'&&ref){
      const arc=Number(ref.arc??ref.篇??0);
      const chapter=Number(ref.chapter??ref.cha??ref.章??0);
      const section=Number(ref.section??ref.sec??ref.節??0);

      return dataset.nodes.find(node=>
        node.sequence.arc===arc &&
        node.sequence.chapter===chapter &&
        node.sequence.section===section
      )||null;
    }

    const target=refId(ref);
    return dataset.nodes.find(node=>node.id===target)||null;
  }

  function resolveNode(data,ref){
    return findNormalizedNode(normalizeDataset(data),ref);
  }

  function sortKey(node){
    return `${pad(node.sequence.arc,4)}:${pad(node.sequence.chapter,8)}:${pad(node.sequence.section,4)}`;
  }

  function roleKey(role){
    return role.source?.motherId
      ? `source:${role.source.motherId}`
      : `name:${role.name}`;
  }

  function effectivePresence(role,node,nodes){
    if(role.presenceMode!=='自動')return role.presenceMode;

    const current=sortKey(node);
    const key=roleKey(role);
    const previous=[];

    nodes.forEach(candidate=>{
      if(sortKey(candidate)>=current)return;

      candidate.cast.forEach(person=>{
        if(roleKey(person)===key){
          previous.push({
            node:candidate,
            role:person
          });
        }
      });
    });

    previous.sort((a,b)=>
      sortKey(a.node).localeCompare(sortKey(b.node))
    );

    if(!previous.length)return '初登場';

    const last=previous.at(-1);

    if(
      last.role.source?.branchId &&
      role.source?.branchId &&
      last.role.source.branchId!==role.source.branchId
    ){
      return '複習登場';
    }

    if(
      node.sequence.chapter-last.node.sequence.chapter>=30
    ){
      return '複習登場';
    }

    return '一般登場';
  }

  function appearanceText(role){
    return [
      role.sex,
      role.race,
      role.height!==''?`${role.height}cm`:'',
      role.hair?`${role.hair}髮`:'',
      role.eye?`${role.eye}瞳`:'',
      role.sex==='女'&&role.bust?`${role.bust} Cup`:''
    ].filter(Boolean).join('・');
  }

  function buildAnchorModel(data,ref){
    const dataset=normalizeDataset(data);

    const node=
      typeof ref==='object'&&(ref.sequence||ref.事件||ref.event)
        ? normalizeNode(ref)
        : findNormalizedNode(dataset,ref);

    if(!node)return null;

    const cast=node.cast.map(role=>{
      const state=effectivePresence(role,node,dataset.nodes);

      if(state==='不注入')return null;

      const detailed=[
        '初登場',
        '複習登場',
        '完整重建'
      ].includes(state);

      return {
        ...role,
        state,
        detailed,
        appearance:detailed?appearanceText(role):''
      };
    }).filter(Boolean);

    return {
      node,
      cast
    };
  }

  function formatAnchorText(data,ref){
    const model=buildAnchorModel(data,ref);
    if(!model)return '';

    const {node,cast}=model;
    const s=node.sequence;
    const lines=[];

    lines.push(
      `## 敘事錨點｜第${pad(s.arc,2)}篇${pad(s.chapter,3)}章${pad(s.section,2)}節`
    );

    lines.push(
      `時間：${[node.worldTime.date,node.worldTime.time].filter(Boolean).join(' ')||'未設定'}`
    );

    lines.push(
      `定位：${[
        node.scene.plotType,
        node.scene.macroLevel,
        node.scene.subjectiveLevel,
        node.scene.location
      ].filter(Boolean).join('｜')||'－'}`
    );

    lines.push(
      `視角：${
        node.pov.names.join(
          node.pov.type==='dual'||node.pov.type==='雙人'
            ? ' × '
            : '、'
        )||'－'
      }`
    );

    lines.push(
      `陣營：${node.scene.faction||'－'}`
    );

    lines.push(
      `劇情：${node.summary||'（無摘要）'}`,
      '',
      '### 情報'
    );

    if(node.intel.length){
      node.intel.forEach(info=>{
        lines.push(
          `- ${info.intelId||'（無編號）'}｜${
            [info.attr,info.visibility,info.type]
              .filter(Boolean)
              .join('・')
          }｜${info.summary||'（無摘要）'}`
        );
      });
    }else{
      lines.push('- （無情報）');
    }

    lines.push(
      '',
      '### 角色'
    );

    if(!cast.length){
      lines.push('- （無需注入角色）');
    }

    cast.forEach(role=>{
      lines.push(
        `- ${[
          `${role.depth}・${role.state}｜${role.name||'未命名角色'}`,
          role.appearance,
          role.brief||'（無當節提示）'
        ].filter(Boolean).join('｜')}`
      );
    });

    return lines.join('\n');
  }

  function make(tag,className,text){
    const node=document.createElement(tag);

    if(className){
      node.className=className;
    }

    if(text!=null){
      node.textContent=text;
    }

    return node;
  }

  function pair(label,text){
    return make(
      'div',
      'pair-row',
      `${label}${text}`
    );
  }

  function renderAnchor(data,ref,options){
    const model=buildAnchorModel(data,ref);
    const showMissing=options?.showMissing!==false;

    if(!model){
      return showMissing
        ? make(
            'div',
            'RenderNarrativeAnchors NarrativeAnchorMissing',
            `敘事錨點未找到：${refId(ref)}`
          )
        : null;
    }

    const {node,cast}=model;
    const s=node.sequence;
    const wrap=make(
      'div',
      'RenderNarrativeAnchors'
    );

    const tags=make(
      'div',
      'NarrativeTagSection'
    );

    tags.appendChild(
      make(
        'div',
        'label',
        '敘事標籤'
      )
    );

    tags.appendChild(
      pair(
        '編號：',
        `${pad(s.arc,2)}篇${pad(s.chapter,3)}章${pad(s.section,2)}節`
      )
    );

    tags.appendChild(
      pair(
        '視角：',
        node.pov.names.join(
          node.pov.type==='dual'||node.pov.type==='雙人'
            ? ' × '
            : '、'
        )||'－'
      )
    );

    tags.appendChild(
      pair(
        '定位：',
        [
          node.scene.plotType,
          node.scene.macroLevel,
          node.scene.subjectiveLevel
        ].filter(Boolean).join(' / ')||'－'
      )
    );

    tags.appendChild(
      pair(
        '陣營：',
        node.scene.faction||'－'
      )
    );

    tags.appendChild(
      pair(
        '時間：',
        [
          node.worldTime.date,
          node.worldTime.time
        ].filter(Boolean).join(' ')||'未設定'
      )
    );

    if(node.scene.location){
      tags.appendChild(
        pair(
          '地點：',
          node.scene.location
        )
      );
    }

    tags.appendChild(
      pair(
        '摘要：',
        node.summary||'（無內容）'
      )
    );

    wrap.appendChild(tags);

    const intel=make(
      'div',
      'NarrativeIntelSection'
    );

    intel.appendChild(
      make(
        'div',
        'label',
        '敘事情報'
      )
    );

    if(node.intel.length){
      node.intel.forEach(info=>{
        const item=make(
          'div',
          'intel-item'
        );

        item.append(
          pair(
            '編號：',
            info.intelId||'（無編號）'
          ),
          pair(
            '屬性：',
            [
              info.attr,
              info.visibility,
              info.type
            ].filter(Boolean).join(' / ')
          ),
          pair(
            '摘要：',
            info.summary||'（無）'
          )
        );

        intel.appendChild(item);
      });
    }else{
      intel.appendChild(
        pair(
          '',
          '（無情報）'
        )
      );
    }

    wrap.appendChild(intel);

    const people=make(
      'div',
      'NarrativePeopleSection'
    );

    people.appendChild(
      make(
        'div',
        'label',
        '角色區域'
      )
    );

    if(cast.length){
      cast.forEach(role=>{
        const item=make(
          'div',
          'people-item'
        );

        item.appendChild(
          pair(
            '角色：',
            `${role.depth} / ${role.state} / ${role.name||'未命名角色'}`
          )
        );

        if(role.appearance){
          item.appendChild(
            pair(
              '外觀：',
              role.appearance
            )
          );
        }

        item.appendChild(
          pair(
            '簡介：',
            role.brief||'（無說明）'
          )
        );

        people.appendChild(item);
      });
    }else{
      people.appendChild(
        pair(
          '',
          '（無需注入角色）'
        )
      );
    }

    wrap.appendChild(people);

    return wrap;
  }

  function load(path,options){
    const target=path||DEFAULT_DATA_PATH;

    if(
      !options?.force &&
      cache.has(target)
    ){
      return cache.get(target);
    }

    const task=fetch(
      target,
      {
        cache:options?.cache||'no-store'
      }
    ).then(response=>{
      if(!response.ok){
        throw new Error(
          `Narrative Bridge HTTP ${response.status}`
        );
      }

      return response.json();
    }).catch(error=>{
      cache.delete(target);
      throw error;
    });

    cache.set(target,task);
    return task;
  }

  global.NarrativeBridgePlugin=Object.freeze({
    VERSION,
    DEFAULT_DATA_PATH,
    load,
    clearCache:path=>
      path
        ? cache.delete(path)
        : cache.clear(),
    normalizeNode,
    normalizeDataset,
    resolveNode,
    buildAnchorModel,
    formatAnchorText,
    renderAnchor,
    effectivePresence
  });
})(window);