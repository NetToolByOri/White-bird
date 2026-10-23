/* ==================================================
   Oracle Shion CharacterData Legacy Bridge
   Version : 1.00

   一次性過渡橋接器：
   CharacterData 2.x JSON → 匯入目前開啟的 CharacterData 4.x。
   本插件不負責匯出；確認資料後請使用 CharacterData 原生匯出功能。
   ================================================== */
(() => {
  "use strict";

  if (window.CDLegacyBridge) return;

  const CDLegacyBridge = (() => {
    const clone = value => JSON.parse(JSON.stringify(value ?? null));
    const toArray = raw => Array.isArray(raw)
      ? raw.filter(Boolean)
      : raw && typeof raw === "object"
        ? Object.keys(raw).sort((a,b)=>Number(a)-Number(b)).map(key=>raw[key]).filter(Boolean)
        : [];
    const text = value => value == null ? "" : String(value);
    const city = value => text(value).replace(/城$/, "");
    const defaultPlaylist = () => ({
      sort:Array.from({length:9},(_,i)=>i+1),
      enabled:Object.fromEntries(Array.from({length:9},(_,i)=>[String(i+1),false]))
    });

    function emptySlot(){
      return {
        initialized:true,
        fields:{},
        managers:{
          region:[], education:[], employmentMilitary:[], employmentGeneral:[],
          topicSlots:{}, weaponSlots:{}, weaponSort:[], picturePlaylist:defaultPlaylist()
        },
        modes:{}
      };
    }

    function setField(slot,key,value){
      if (value !== undefined && value !== null) slot.fields[key] = typeof value === "boolean" ? value : text(value);
    }

    function mapSimpleFields(slot, oldTL){
      const meta=oldTL.SysMeta||{}, basic=oldTL.basic||{}, per=oldTL.personality||{}, qa=oldTL.qa||{}, chr=oldTL.chara||{}, design=oldTL.design||{};
      [
        ["SysMeta.characterIndex",meta.characterIndex], ["SysMeta.settingLayer",meta.settingLayer],
        ["SysMeta.computeLayer",meta.computeLayer], ["SysMeta.generation",meta.generation],
        ["SysMeta.dataYear",meta.dataYear], ["SysMeta.branch",meta.branch],
        ["basic.fullname",basic.fullname], ["basic.nameRuby",basic.nameRuby],
        ["basic.nameTag",basic.nameTag], ["basic.gender",basic.gender], ["basic.race",basic.race],
        ["basic.height",basic.height], ["basic.cupSize",basic.cupSize], ["basic.haircolor",basic.haircolor],
        ["basic.eyescolor",basic.eyescolor], ["basic.birthday",basic.birthday],
        ["personality.public",per.public], ["personality.secret",per.secret],
        ["chara.family",chr.family], ["design.Info",design.Info]
      ].forEach(([k,v])=>setField(slot,k,v));
      ["mind","social","appearance"].forEach(group=>{
        Object.entries(qa[group]||{}).forEach(([q,v])=>setField(slot,`qa.${group}.${q}`,v));
      });
    }

    function mapRegion(slot, oldTL){
      const region=oldTL.region||{};
      setField(slot,"region.birth.city",city(region.birth?.city));
      setField(slot,"region.birth.note",region.birth?.note);
      slot.managers.region=toArray(region.residence).slice(0,10).map(item=>({
        enabled:true, city:city(item?.city), note:text(item?.note)
      }));
    }

    function mapEducation(slot, oldTL){
      slot.managers.education=toArray(oldTL.education?.list).slice(0,5).map(row=>{
        const items=toArray(row?.items).slice(0,5);
        return {
          school:text(items[0]?.school||row?.school), note:text(row?.note), deptCount:Math.max(1,items.length||1),
          items:items.map(item=>({ enabled:true, class:text(item?.class||"－"), dept:text(item?.dept||"－"), group:text(item?.group||"－") }))
        };
      });
    }

    function mapEmployment(slot, oldTL){
      const emp=oldTL.employment||{};
      slot.managers.employmentMilitary=toArray(emp.military).slice(0,10).map(item=>({
        enabled:true, year:text(item?.year), org:text(item?.org), rank:text(item?.rank), position:text(item?.position)
      }));
      slot.managers.employmentGeneral=toArray(emp.general).slice(0,5).map(item=>({
        enabled:true, year:text(item?.year), org:text(item?.org), position:text(item?.position)
      }));
    }

    function mapCombat(slot, oldTL){
      const combat=oldTL.combat||{};
      const a=combat.A, b=combat.B, c=combat.C;
      if (a) {
        setField(slot,"combat.rank",a.tier);
        setField(slot,"combat.mainRole",a.role);
        ["前衛","防衛者","中衛","狙擊","前衛魔導士","後衛魔導士","治療","支援"].forEach(name=>{
          const oldName=name==="支援"?"輔助":name;
          setField(slot,`combat.aptitudes.${name}`,!!a.aptitudes?.[oldName]);
        });
        setField(slot,"combat.feature",a.feature);
        setField(slot,"combat.detail",a.desc);
      } else if (b) {
        setField(slot,"combat.rank",b.tier);
        setField(slot,"combat.mainRole",b.role);
      } else if (c) {
        setField(slot,"combat.rank","C");
        setField(slot,"combat.mainRole","－");
        setField(slot,"combat.detail",c.note||"無戰鬥能力");
      }
    }

    function mapPictures(slot, oldTL){
      const pic=oldTL.Picture||{};
      setField(slot,"picture.fs.filename",pic.FS);
      const cards=toArray(pic.IDCard);
      setField(slot,"picture.idCard.front",cards[0]);
      setField(slot,"picture.idCard.back",cards[1]);
      slot.managers.picturePlaylist=defaultPlaylist();
    }

    function parseWeaponName(raw){
      const source=text(raw).trim();
      const match=source.match(/^(.*?)(?:\s*[xX×]\s*(\d+))$/);
      if (!match) return {name:source,count:"1"};
      return {name:match[1].trim(),count:String(Math.max(1,Number(match[2])||1))};
    }

    function mapWeapons(slot, oldTL, registry){
      const list=toArray(oldTL.weapons?.items).slice(0,20);
      list.forEach((item,index)=>{
        const n=index+1, parsed=parseWeaponName(item?.name);
        registry.add(n);
        slot.managers.weaponSlots[String(n)]={
          slot:n, enabled:true,
          groupType:text(item?.setType||"單件武器"), name:parsed.name, count:parsed.count,
          category:text(item?.category), type:text(item?.category), style:"",
          grade:text(item?.grade), mechanism:text(item?.material), detail:text(item?.detail)
        };
        slot.managers.weaponSort.push(n);
      });
    }

    function mapTopics(slot, oldTL, registry, globalSort){
      const list=toArray(oldTL.experience?.entries).slice(0,20);
      list.forEach((item,index)=>{
        const n=index+1;
        registry.add(n);
        if (!globalSort.includes(n)) globalSort.push(n);
        slot.managers.topicSlots[String(n)]={
          slot:n, enabled:String(item?.open??"1")!=="0", title:text(item?.title), body:text(item?.content)
        };
      });
    }

    function buildPictureLibrary(fsName){
      const raw=text(fsName).trim().replace(/FS$/i,"");
      const matched=raw.match(/^(\d+)-(.+)$/);
      if (!matched) return {};
      const rawId=matched[1], name=matched[2].trim();
      const baseId=`${rawId.slice(0,-1)}0`;
      const replaceTail=tail=>`${baseId.slice(0,-1)}${tail}`;
      const library={};
      for(let slot=1;slot<=9;slot++){
        const id=replaceTail(slot);
        library[String(slot)]={ slot, note:"", fileB:`${id}-${name}PRT-01B`, fileW:`${id}-${name}PRT-02W` };
      }
      return library;
    }

    function modeKeysFor(slot, topicRegistry, weaponRegistry){
      const keys=Object.keys(window.CD_MODE_REGISTRY||{}).filter(key=>key!=="qa.*"&&!/^topicRecords\.\d+$/.test(key)&&!/^weapons\.\d+$/.test(key)&&key!=="weapons");
      Object.keys(slot.fields).filter(key=>key.startsWith("qa.")).forEach(key=>keys.push(key));
      topicRegistry.forEach(n=>keys.push(`topicRecords.${n}`));
      weaponRegistry.forEach(n=>keys.push(`weapons.${n}`));
      return [...new Set(keys)];
    }

    function applyModes(slot, tlIndex, multiple, topicRegistry, weaponRegistry){
      const registry=window.CD_MODE_REGISTRY||{};
      modeKeysFor(slot,topicRegistry,weaponRegistry).forEach(key=>{
        const raw=registry[key]||(/^qa\./.test(key)?registry["qa.*"]:null)||["field","field",false];
        const locked=!!raw[2], scope=raw[0];
        let mode=raw[1];
        if (multiple) mode=locked?"shared":(tlIndex===1?"field":"override");
        slot.modes[key]={mode,locked,scope};
      });
    }

    function validateOld(data){
      if (!data||typeof data!=="object"||!data.data||!Array.isArray(data.timelines)) throw new Error("這不是可辨識的 CharacterData 2.x JSON。");
      if (!data.timelines.length) throw new Error("舊版 JSON 沒有 Timeline。");
      if (data.timelines.length>9) throw new Error("舊版 Timeline 超過新版上限 9 槽。");
    }

    function convert(oldData){
      validateOld(oldData);
      const base=window.CDTimelineCore?.getState?.();
      if (!base) throw new Error("CharacterData Timeline Core 尚未就緒。");
      const state=clone(base);
      const ordered=[...oldData.timelines].sort((a,b)=>Number(a.index)-Number(b.index));
      const multiple=ordered.length>1;
      const topicRegistry=new Set(), weaponRegistry=new Set(), topicSort=[];

      state.current={type:"tl",index:1};
      state.tl.zero=emptySlot();
      state.tl.global={topic:{registry:[],sort:[]},weapon:{registry:[]},picture:{library:{}}};
      state.tl.slots=Array.from({length:9},()=>emptySlot());
      state.tl.meta.slots=state.tl.meta.slots.map((meta,index)=>({index:index+1,name:"",enabled:false}));

      ordered.forEach((meta,index)=>{
        const oldTL=oldData.data[meta.id]||{};
        const slot=state.tl.slots[index];
        mapSimpleFields(slot,oldTL); mapRegion(slot,oldTL); mapEducation(slot,oldTL); mapEmployment(slot,oldTL);
        mapCombat(slot,oldTL); mapPictures(slot,oldTL); mapTopics(slot,oldTL,topicRegistry,topicSort); mapWeapons(slot,oldTL,weaponRegistry);
        state.tl.meta.slots[index]={index:index+1,name:text(meta.description),enabled:true};
      });

      const defaultIndex=Math.max(1,ordered.findIndex(item=>item.id===oldData.defaultTimelineId||item.renderDefault)+1);
      state.tl.meta.defaultActive=String(defaultIndex).padStart(2,"0");
      state.tl.global.topic.registry=[...topicRegistry].sort((a,b)=>a-b);
      state.tl.global.topic.sort=topicSort;
      state.tl.global.weapon.registry=[...weaponRegistry].sort((a,b)=>a-b);
      const firstFS=ordered.map(meta=>oldData.data[meta.id]?.Picture?.FS).find(Boolean)||"";
      state.tl.global.picture.library=buildPictureLibrary(firstFS);

      state.tl.slots.forEach((slot,index)=>applyModes(slot,index+1,multiple,state.tl.global.topic.registry,state.tl.global.weapon.registry));
      state.tl.zero=clone(state.tl.slots[0]);
      state.tl.zero.managers.picturePlaylist=defaultPlaylist();

      state.rtl.meta.slots=state.rtl.meta.slots.map((meta,index)=>({index:index+1,name:"",enabled:false}));
      state.rtl.zero=emptySlot();
      state.rtl.global={topic:{registry:[],sort:[]},weapon:{registry:[]},picture:{library:{}}};
      state.rtl.slots=Array.from({length:9},()=>emptySlot());
      return state;
    }

    async function chooseAndConvert(){
      try{
        const input=document.createElement("input");
        input.type="file"; input.accept=".json,application/json";
        const file=await new Promise(resolve=>{
          input.addEventListener("change",()=>resolve(input.files?.[0]||null),{once:true});
          input.click();
        });
        if(!file)return false;
        const oldData=JSON.parse(await file.text());
        const state=convert(oldData);
        window.CDTimelineCore.importState(state);
        const title=text(oldData.pageTitle).trim()||"CharacterData";
        window.CodexHeader?.setTitle?.(title); document.title=title;
        window.CDTimelineContextBar?.rebuild?.();
        window.CDShowToast?.("舊版資料已匯入，請檢查後使用 CD 原生匯出",2200);
        return true;
      }catch(error){
        console.error("Legacy Bridge import failed:",error);
        alert("舊版匯入失敗：\n"+(error?.message||error));
        return false;
      }
    }

    function mount(){
      const bar=document.getElementById("CDContextBar");
      if(!bar||document.getElementById("CDLegacyConvertBtn"))return;
      const button=document.createElement("button");
      button.id="CDLegacyConvertBtn"; button.type="button";
      button.textContent="舊版轉檔"; button.title="上傳 CharacterData 2.x JSON 並匯入目前開啟的 CharacterData";
      button.addEventListener("click",chooseAndConvert);
      bar.appendChild(button);
    }

    return Object.freeze({version:"1.00",mount,convert,chooseAndConvert});
  })();
  window.CDLegacyBridge=CDLegacyBridge;
  const mountBridge = () => requestAnimationFrame(() => CDLegacyBridge.mount());
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountBridge, { once:true });
  } else {
    mountBridge();
  }
})();
