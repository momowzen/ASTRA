

    /* ASTRA Web Viewer - Core Logic. All business logic, data, and Firebase integration is preserved. */

    firebase.initializeApp({
      apiKey: "AIzaSyAboQqH7BmtLCO0ciHUvgGIUOU6SMzHnzo",
      authDomain: "astra-boss-timer-759e5.firebaseapp.com",
      projectId: "astra-boss-timer-759e5",
      storageBucket: "astra-boss-timer-759e5.firebasestorage.app",
      messagingSenderId: "136730864029",
      appId: "1:136730864029:web:62fc717006db8f36e8e774"
    });
    const db = firebase.firestore();

    const BOSSES=[
  {id:"Venatus",name:"Venatus",lvl:60,rs:36000},
  {id:"Viorent",name:"Viorent",lvl:65,rs:36000},
  {id:"Ego",name:"Ego",lvl:70,rs:75600},
  {id:"Clemantis",name:"Clemantis",lvl:70,wr:[{d:1,h:12,m:30},{d:4,h:20,m:0}]},
  {id:"Livera",name:"Livera",lvl:75,rs:86400},
  {id:"Araneo",name:"Araneo",lvl:75,rs:86400},
  {id:"Undomiel",name:"Undomiel",lvl:80,rs:86400},
  {id:"Saphirus",name:"Saphirus",lvl:80,wr:[{d:0,h:18,m:0},{d:2,h:12,m:30}]},
  {id:"Neutro",name:"Neutro",lvl:80,wr:[{d:2,h:20,m:0},{d:4,h:12,m:30}]},
  {id:"LadyDalia",name:"Lady Dalia",lvl:85,rs:64800},
  {id:"GeneralAquleus",name:"General Aquleus",lvl:85,rs:104400},
  {id:"Thymele",name:"Thymele",lvl:85,wr:[{d:1,h:20,m:0},{d:3,h:12,m:30}]},
  {id:"Amentis",name:"Amentis",lvl:88,rs:104400},
  {id:"BaronBraudmore",name:"Baron Braudmore",lvl:88,rs:115200},
  {id:"Milavy",name:"Milavy",lvl:90,wr:[{d:6,h:16,m:0}]},
  {id:"Wannitas",name:"Wannitas",lvl:93,rs:172800},
  {id:"Metus",name:"Metus",lvl:93,rs:172800},
  {id:"Duplican",name:"Duplican",lvl:93,rs:172800},
  {id:"Shuliar",name:"Shuliar",lvl:95,rs:126000},
  {id:"Ringor",name:"Ringor",lvl:95,wr:[{d:6,h:18,m:0}]},
  {id:"Roderick",name:"Roderick",lvl:95,wr:[{d:5,h:20,m:0}]},
  {id:"Gareth",name:"Gareth",lvl:98,rs:115200},
  {id:"Titore",name:"Titore",lvl:98,rs:133200},
  {id:"Larba",name:"Larba",lvl:98,rs:126000},
  {id:"Catena",name:"Catena",lvl:100,rs:126000},
  {id:"Auraq",name:"Auraq",lvl:100,wr:[{d:5,h:23,m:0},{d:3,h:22,m:0}]},
  {id:"Secreta",name:"Secreta",lvl:100,rs:223200},
  {id:"Ordo",name:"Ordo",lvl:100,rs:223200},
  {id:"Asta",name:"Asta",lvl:100,rs:223200},
  {id:"Supore",name:"Supore",lvl:100,rs:223200},
  {id:"Chaiflock",name:"Chaiflock",lvl:120,wr:[{d:0,h:16,m:0}]},
  {id:"Benji",name:"Benji",lvl:120,wr:[{d:0,h:22,m:0}]},
  {id:"Libitina",name:"Libitina",lvl:130,wr:[{d:1,h:22,m:0},{d:6,h:22,m:0}]},
  {id:"Rakajeth",name:"Rakajeth",lvl:130,wr:[{d:2,h:23,m:0},{d:0,h:20,m:0}]},
  {id:"Icaruthia",name:"Icaruthia",lvl:135,wr:[{d:2,h:22,m:0},{d:5,h:22,m:0}]},
  {id:"Motti",name:"Motti",lvl:135,wr:[{d:3,h:20,m:0},{d:6,h:20,m:0}]},
  {id:"Camalia",name:"Camalia",lvl:135,wr:[{d:4,h:22,m:0}]},
  {id:"Nevaeh",name:"Nevaeh",lvl:140,wr:[{d:0,h:23,m:0}]},
  {id:"Tumier",name:"Tumier",lvl:140,wr:[{d:0,h:20,m:0}]},
  {id:"Lucus",name:"Lucus",lvl:145,wr:[{d:6,h:23,m:0}]}
];

    const LOCS={
  en:{Venatus:"Corrupted River Stream",Viorent:"Gill Stream",Ego:"Reclaimed Gathering Point",Clemantis:"White Witch's Cradle",Livera:"Black Storm Peninsula",Araneo:"Lower Tomb of Tyriosa 1F",Undomiel:"Test Subject Lab",Saphirus:"Moonlight Shackle",Neutro:"Battlefield of Love and Hatred",LadyDalia:"Bloody Shadow",GeneralAquleus:"Lower Tomb of Tyriosa 2F",Thymele:"Mark of Rampage",Amentis:"Limestone Cape",BaronBraudmore:"Rosevine Bridge",Milavy:"Lower Tomb of Tyriosa 3F",Wannitas:"Snare Swamp",Metus:"Follower's Field",Duplican:"Open-Eyed Puppet's Throne",Shuliar:"Masquerade of Hounds",Ringor:"Torchlight Highway",Roderick:"Garbana Underground Waterway 1F",Gareth:"Deadman's Land District 1",Titore:"Deadman's Land District 2",Larba:"Garbana Reclaimed Land",Catena:"Deadman's Land District 3",Auraq:"Garbana Underground Waterway 2F",Secreta:"Kallion's Tomb",Ordo:"Successor's Paradise",Asta:"Goldblood Plain",Supore:"Goldblood Plain",Chaiflock:"Kallion's Tomb",Benji:"Nest of Vengeance",Libitina:"Chapel of Eternal Vassalage",Rakajeth:"Secreta's Punishment",Icaruthia:"Royal Valley",Motti:"Evelyn's Outer Court",Camalia:"Controlled Laboratory",Nevaeh:"Celine's Courtyard",Tumier:"Garbana Underground Waterway 3F",Lucus:"Silent Smelter"},
  ja:{Venatus:"汚染された川の流れ",Viorent:"ギルの小川",Ego:"奪還された集結地点",Clemantis:"白魔女のゆりかご",Livera:"黒嵐の半島",Araneo:"ティリオサ地下墓所1F",Undomiel:"実験体研究所",Saphirus:"月光の束縛",Neutro:"愛憎の戦場",LadyDalia:"血染めの影",GeneralAquleus:"ティリオサ地下墓所2F",Thymele:"暴走の刻印",Amentis:"石灰岩の岬",BaronBraudmore:"薔薇蔦の橋",Milavy:"ティリオサ地下墓所3F",Wannitas:"罠の沼",Metus:"追従者の野原",Duplican:"開眼の人形の玉座",Shuliar:"猟犬の仮面舞踏会",Ringor:"松明の街道",Roderick:"ガルバナ地下水路1F",Gareth:"死者の地 第1区域",Titore:"死者の地 第2区域",Larba:"ガルバナ奪還地",Catena:"死者の地 第3区域",Auraq:"ガルバナ地下水路2F",Secreta:"カリオンの墓",Ordo:"継承者の楽園",Asta:"黄金血の平原",Supore:"黄金血の平原",Chaiflock:"カリオンの墓",Benji:"復讐の巣",Libitina:"永遠の臣従の礼拝堂",Rakajeth:"セクレタの刑罰",Icaruthia:"王族の谷",Motti:"エブリンの外庭",Camalia:"管理された研究所",Nevaeh:"セリーヌの中庭",Tumier:"ガルバナ地下水路3F",Lucus:"静寂の精錬所"},
  ko:{Venatus:"오염된 강줄기",Viorent:"길의 시냇물",Ego:"탈환된 집결지",Clemantis:"백마녀의 요람",Livera:"검은 폭풍의 반도",Araneo:"티리오사 지하묘지 1층",Undomiel:"실험체 연구소",Saphirus:"달빛의 속박",Neutro:"애증의 전장",LadyDalia:"핏빛 그림자",GeneralAquleus:"티리오사 지하묘지 2층",Thymele:"폭주의 낙인",Amentis:"석회암 곶",BaronBraudmore:"장미넝쿨 다리",Milavy:"티리오사 지하묘지 3층",Wannitas:"덫의 늪",Metus:"추종자의 들판",Duplican:"눈을 뜬 인형의 옥좌",Shuliar:"사냥개의 가면무도회",Ringor:"횃불의 가도",Roderick:"가르바나 지하수로 1층",Gareth:"죽은 자의 땅 제1구역",Titore:"죽은 자의 땅 제2구역",Larba:"가르바나 탈환지",Catena:"죽은 자의 땅 제3구역",Auraq:"가르바나 지하수로 2층",Secreta:"칼리온의 무덤",Ordo:"계승자의 낙원",Asta:"황금피의 평원",Supore:"황금피의 평원",Chaiflock:"칼리온의 무덤",Benji:"복수의 둥지",Libitina:"영원한 신종의 예배당",Rakajeth:"세크레타의 형벌",Icaruthia:"왕족의 계곡",Motti:"에블린의 외정",Camalia:"통제된 연구소",Nevaeh:"셀린의 안뜰",Tumier:"가르바나 지하수로 3층",Lucus:"침묵의 제련소"}
};

    const TO=9*3600000;

    const LANG={
  en:{brand:'ASTRA',dash:'Dashboard',bsTab:'Bosses',live:'Live',offline:'Offline',nextSpawn:'Next Spawn',upcoming:'Upcoming',today:'Today',tomorrow:'Tomorrow',noSpawns:'No spawns',schedTag:'Schedule',schedTitle:'SCHEDULED',ivTag:'Interval',ivTitle:'Interval',every:'Every',lv:'Lv.',spawned:'SPAWNED',now:'Now',updated:'Updated',ago:'ago',tracker:'TRACKER',hiddenClass:'HIDDEN CLASS',history:'Activity',killed:'killed',missed:'missed',days:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],timeRemaining:'Time Remaining',relic:'Relic',relicLevels:'Relic Levels',current:'Current',goal:'Goal',totalTP:'Total Temporal Pieces',rareDism:'Rare dismantles (84 TP each)',epicDism:'Epic dismantles (450 TP each)',marketPrices:'Live Market Prices',origin:'Origin',refresh:'Refresh',bestPerTP:'Best $/TP',buyQty:(n,t)=>'Buy '+t+' ['+fmtNum(n)+']',updated:'Updated',mktLoading:'Fetching market prices...',mktErr:'Offline — showing cached prices',mktEmpty:'Set your relic goals above to see market prices',mktNoL:'No chest listings on Origin market',priceLabel:'Price',recoTitle:'Recommended Purchase',gPieces:'Temporal Piece',gUp:'Total Levels',gCp:'Combat Power',cpRef:'CP Reference',chestMarket:'Temporal Piece Market',per1k:'/1k',chests:'Chests',chest:'Chest',setGoal:'Set levels to calculate',piecesNeeded:'pieces needed',cpTotal:'CP total',bestTag:'Best / 1k',viewBest:'View Best',att:'Attack',def:'Defense',res:'Resource',pve:'PvE',pvp:'PvP',oth:'Other',snipe:'snipe',best:'best',memDeal:'Memory deal',cpUnit:'per',nm:['Venatus','Viorent','Ego','Clemantis','Livera','Araneo','Undomiel','Saphirus','Neutro','Lady Dalia','General Aquleus','Thymele','Amentis','Baron Braudmore','Milavy','Wannitas','Metus','Duplican','Shuliar','Ringor','Roderick','Gareth','Titore','Larba','Catena','Auraq','Secreta','Ordo','Asta','Supore','Chaiflock','Benji','Libitina','Rakajeth','Icaruthia','Motti','Camalia','Nevaeh','Tumier','Lucus'],ttsIn:(n,m)=>`${n} spawns in ${m} minute${m!==1?'s':''}.`,ttsSpawned:n=>`${n} has spawned.`,ttsWbIn:(m)=>`World Boss spawns in ${m} minute${m!==1?'s':''}.`,ttsWbSpawned:`World Boss has spawned.`,age:(m)=>{if(m<1)return 'just now';if(m<60)return m+'m ago';const h=Math.floor(m/60);return h<24?h+'h ago':Math.floor(h/24)+'d ago'},relicNames:['Origin of Destruction','Barrier Protection','Crystal of Life','Magic Storm'],mktInsight:'Cost & Efficiency',mktCostCp:'per 1 CP',mktBestTier:'Best tier to buy',mktBestTip:'Cheapest per 1,000 pieces.',mktCalc:'How it is calculated',mktCalcPieces:'Pieces needed = sum of level costs',mktCalcCp:'CP gained = milestones + base stat',mktCalcCost:'Cost = pieces / chest size x price',mktTable:'Relic Efficiency',mktHRelic:'Relic',mktHLevel:'Level',mktHCp:'CP',mktHCost:'Cost',mktHCpCur:'per CP',mktSavings:'Savings',mktSavingsMsg:'Buying the cheapest tier saves',mktAlreadyBest:'You are already buying the best-value chest',mktEffic:'most CP per currency',mktFromTo:'to',mktPerChunk:'per 1,000',mktExpand:'Expand details',mktCollapse:'Collapse'},
  ja:{brand:'ASTRA',dash:'ダッシュボード',bsTab:'ボス',live:'オンライン',offline:'オフライン',nextSpawn:'次のスポーン',upcoming:'予定',today:'今日',tomorrow:'明日',noSpawns:'スポーンなし',schedTag:'スケジュール',schedTitle:'予定',ivTag:'インターバル',ivTitle:'インターバル',every:'毎',lv:'Lv.',spawned:'出現中',now:'今',updated:'更新',ago:'前',tracker:'追跡',hiddenClass:'隠しクラス',history:'履歴',killed:'討伐',missed:'取り逃し',days:['日','月','火','水','木','金','土'],timeRemaining:'残り時間',relic:'レリック',relicLevels:'レリックレベル',current:'現在',goal:'目標',totalTP:'必要TP合計',rareDism:'レア分解（TP 84/個）',epicDism:'エピック分解（TP 450/個）',marketPrices:'ライブ市場価格',origin:'Origin',refresh:'更新',bestPerTP:'最安 $/TP',buyQty:(n,t)=>t+' を購入 ['+fmtNum(n)+']',updated:'更新',mktLoading:'市場価格を取得中...',mktErr:'オフライン — キャッシュ表示',mktEmpty:'上でレリック目標を設定してください',mktNoL:'Origin市場に出品なし',priceLabel:'価格',recoTitle:'推奨購入',gPieces:'テンポラルピース',gUp:'合計レベル',gCp:'戦闘力',cpRef:'CP参考',chestMarket:'テンポラルピース市場',per1k:'/1k',chests:'チェスト',chest:'チェスト',setGoal:'レベルを設定すると計算します',piecesNeeded:'必要ピース',cpTotal:'CP合計',bestTag:'最良/1k',viewBest:'最良を表示',att:'攻撃',def:'防御',res:'資源',pve:'PvE',pvp:'PvP',oth:'その他',snipe:'狙い目',best:'最良',memDeal:'メモリー特価',cpUnit:'単位',nm:['ベナトゥス','ビオレント','エゴ','クレメンティス','リベラ','アラネオ','アンドゥミエル','サピルス','ネウトロ','レディ·ダリア','将軍アクレウス','テュメレ','アメンティス','ブラウドモア','ミラベ','ワニタス','メトゥス','デュプリカン','シュライヤー','リンゴル','ロデリック','ガレス','ティトル','ラルバ','カテナ','アウラーク','セクレタ','オルド','アスタ','スポル','シャイフロック','ベンジー','リビティーナ','ラカゼス','イカルシア','モティ','カマリア','ネバ','トゥミエル','ルクス'],ttsIn:(n,m)=>`${n}は${m}分後に出現します。`,ttsSpawned:n=>`${n}が出現しました。`,ttsWbIn:(m)=>`ワールドボスは${m}分後に出現します。`,ttsWbSpawned:`ワールドボスが出現しました。`,age:(m)=>{if(m<1)return 'たった今';if(m<60)return m+'分前';const h=Math.floor(m/60);return h<24?h+'時間前':Math.floor(h/24)+'日前'},relicNames:['破壊の根源','結界の守護','生命の結晶','魔力の嵐'],mktInsight:'コストと効率',mktCostCp:'CPあたり',mktBestTier:'購入する最良のティア',mktBestTip:'1,000個あたり最安。',mktCalc:'計算方法',mktCalcPieces:'必要ピース = レベルコストの合計',mktCalcCp:'獲得CP = マイルストーン + 基礎ステータス',mktCalcCost:'コスト = ピース ÷ 箱サイズ × 価格',mktTable:'レリック効率',mktHRelic:'レリック',mktHLevel:'レベル',mktHCp:'CP',mktHCost:'コスト',mktHCpCur:'CPあたり',mktSavings:'節約',mktSavingsMsg:'最安ティアを買うと節約',mktAlreadyBest:'すでに最良の箱を購入しています',mktEffic:'通貨あたりCPが最も高い',mktFromTo:'→',mktPerChunk:'1,000個あたり',mktExpand:'詳細を展開',mktCollapse:'閉じる'},
  ko:{brand:'ASTRA',dash:'대시보드',bsTab:'보스',live:'온라인',offline:'오프라인',nextSpawn:'다음 스폰',upcoming:'예정',today:'오늘',tomorrow:'내일',noSpawns:'스폰 없음',schedTag:'일정',schedTitle:'일정',ivTag:'간격',ivTitle:'간격',every:'매',lv:'레벨',spawned:'출현중',now:'지금',updated:'업데이트',ago:'전',tracker:'추적',hiddenClass:'비밀 클래스',history:'활동',killed:'처치',missed:'놓침',days:['일','월','화','수','목','금','토'],timeRemaining:'남은 시간',relic:'유물',relicLevels:'유물 레벨',current:'현재',goal:'목표',totalTP:'필요 TP 합계',rareDism:'레어 분해 (TP 84/개)',epicDism:'에픽 분해 (TP 450/개)',marketPrices:'실시간 시장 가격',origin:'Origin',refresh:'새로고침',bestPerTP:'최저 $/TP',buyQty:(n,t)=>t+' 구매 ['+fmtNum(n)+']',updated:'업데이트',mktLoading:'시장 가격 불러오는 중...',mktErr:'오프라인 — 캐시 표시',mktEmpty:'위에서 유물 목표를 설정하세요',mktNoL:'Origin 시장에 등록 없음',priceLabel:'가격',recoTitle:'추천 구매',gPieces:'시간 조각',gUp:'총 레벨',gCp:'전투력',cpRef:'CP 참고',chestMarket:'시간 조각 시장',per1k:'/1k',chests:'상자',chest:'상자',setGoal:'레벨을 설정하면 계산합니다',piecesNeeded:'필요 조각',cpTotal:'CP 합계',bestTag:'최적/1k',viewBest:'최적 보기',att:'공격',def:'방어',res:'자원',pve:'PvE',pvp:'PvP',oth:'기타',snipe:'노려야 할',best:'최적',memDeal:'메모리 특가',cpUnit:'단위',nm:['베나투스','비오렌트','에고','클레멘티스','리베라','아라네오','안두미엘','사피루스','네우트로','레이디 달리아','장군 아클레우스','튜메레','아멘티스','남작 브라우드모어','미라베','와니타스','메투스','듀플리칸','슈라이어','링고르','로데릭','가레스','티토르','라르바','카테나','아우라크','세크레타','오르도','아스타','스포르','샤이플록','벤지','리비티나','라카제스','이카루시아','모티','카말리아','네바','투미엘','루크스'],ttsIn:(n,m)=>`${n}${koParticle(n,'subj')} ${m}분 후에 출현합니다.`,ttsSpawned:n=>`${n}${koParticle(n,'subj')} 출현했습니다.`,ttsWbIn:(m)=>`월드 보스가 ${m}분 후 출현합니다.`,ttsWbSpawned:`월드 보스가 출현했습니다.`,age:(m)=>{if(m<1)return '방금 전';if(m<60)return m+'분 전';const h=Math.floor(m/60);return h<24?h+'시간 전':Math.floor(h/24)+'일 전'},relicNames:['파괴의 근원','결계의 수호','생명의 수정','마력의 폭풍'],mktInsight:'비용 및 효율',mktCostCp:'CP당',mktBestTier:'구매 최적 티어',mktBestTip:'1,000개당 최저.',mktCalc:'계산 방법',mktCalcPieces:'필요 조각 = 레벨 비용 합계',mktCalcCp:'획득 CP = 마일스톤 + 기본 스탯',mktCalcCost:'비용 = 조각 ÷ 상자 크기 × 가격',mktTable:'유물 효율',mktHRelic:'유물',mktHLevel:'레벨',mktHCp:'CP',mktHCost:'비용',mktHCpCur:'CP당',mktSavings:'절약',mktSavingsMsg:'최저 티어 구매 시 절약',mktAlreadyBest:'이미 최고 가치 상자를 구매 중입니다',mktEffic:'통화당 CP 최대',mktFromTo:'→',mktPerChunk:'1,000개당',mktExpand:'세부 정보 펼치기',mktCollapse:'닫기'},
};

    function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
    function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}

    let lang='en';
function t(k){return LANG[lang][k]||k}
function bn(b){const i=BOSSES.indexOf(b);return LANG[lang].nm[i]||b.name}
function locOf(id){return (LOCS[lang]&&LOCS[lang][id])||LOCS.en[id]||''}
function koParticle(n,t){const c=n.charCodeAt(n.length-1),b=(c-0xAC00)%28!==0;const p={subj:['이','가'],obj:['을','를'],top:['은','는']};return b?p[t][0]:p[t][1]}
function langNext(){
  const ls=['en','ja','ko','zh'];
  lang=ls[(ls.indexOf(lang)+1)%ls.length];
  lsSet('astralang',lang);
  applyLang();
  loadPrices(true);
  rAll();
}


    const FLAGS={en:'EN',ja:'JP',ko:'KR'};
    function applyLang(){
      fmtDCache.clear();fmtTCache.clear();
      document.title=t('brand');
      $('brand').querySelector('.brand-text').textContent=t('brand');
      $('nextLbl').textContent=t('nextSpawn');
      $('upcomingLbl').textContent=t(currentUpView==='tomorrow'?'tomorrow':'today');
      $('upTodayLbl').textContent=t('today');
      $('upTmrwLbl').textContent=t('tomorrow');
      $('viewTitle').textContent=t(currentView==='schedule'?'schedTitle':'ivTitle');
      $('ivBtnLbl').textContent=t('ivTag');
      $('schedBtnLbl').textContent=t('schedTag');
      $('navTracker').textContent=t('tracker');
      $('navHidden').textContent=t('hiddenClass');
      $('relicNavLbl').textContent=t('relic');
      $('relicLbl').textContent=t('relicLevels');
      $('relicGrandLblP').textContent=t('gPieces');
      $('relicGrandLblU').textContent=t('gUp');
      $('relicGrandLblC').textContent=t('gCp');
      $('mktLbl').textContent=t('chestMarket');
      $('mktRealm').textContent=t('origin');
      const mtBtn=$('mktDetailsToggle');
      if(mtBtn){const lbl=$('mktDetailsToggleLbl');if(lbl)lbl.textContent=t(mktExpanded?'mktCollapse':'mktExpand');}
      $('mktRefresh').setAttribute('aria-label',t('refresh'));
      document.querySelectorAll('#relicSettings .relic-field-label').forEach((f,idx)=>f.textContent=idx%2===0?t('current'):t('goal'));
      $('langText').textContent=FLAGS[lang];
      const lp=$('livePill'),lt=$('liveText');
      const isOn=lp.classList.contains('on');
      lt.textContent=isOn?t('live'):t('offline');
      $('nextCdLabel').textContent = t('timeRemaining');
      rRelic();
      requestAnimationFrame(()=>requestAnimationFrame(positionNavIndicator));
    }

    let alarmOn=false;
    const ttsSpoken=new Set();
    const ttsArmed=new Map();
    function toggleAlarm(){
      alarmOn=!alarmOn;
      lsSet('astraalarm',alarmOn?'1':'0');
      updateAlarmBtn();
      if(!alarmOn)ttsStop();
      if(alarmOn){ttsSpoken.clear();ttsArmed.clear();if(window.speechSynthesis){syncVoices();window.speechSynthesis.speak(new SpeechSynthesisUtterance(''))}}
    }
    function updateAlarmBtn(){
      const b=$('alarmBtn');
      b.classList.toggle('on',alarmOn);
      const icon = alarmOn
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
      b.innerHTML=icon;
      if(window.ASTRA_TOOLS&&window.ASTRA_TOOLS.onAlarmChange)window.ASTRA_TOOLS.onAlarmChange(alarmOn);
    }
    let ttsVoices=[];
    function ttsVoice(){
      if(!window.speechSynthesis)return null;
      const sv=lsGet('astraVoice_'+lang);
      if(sv){const m=ttsVoices.find(v=>v.name===sv);if(m)return m}
  const want={en:'en-US',ja:'ja-JP',ko:'ko-KR',zh:'zh-CN'}[lang];
  const edge={en:'en-US-AriaNeural',ko:'ko-KR-SunHiNeural',ja:'ja-JP-NanamiNeural',zh:'zh-CN-XiaoxiaoNeural'}[lang];
  const m=ttsVoices.find(v=>v.name.includes(edge))||ttsVoices.find(v=>v.voiceURI===edge)||ttsVoices.find(v=>v.lang===want)||ttsVoices.find(v=>v.lang.startsWith(lang));
      return m||null;
    }
    const EDGE_VOICE={en:'en-US-AriaNeural',ja:'ja-JP-NanamiNeural',ko:'ko-KR-SunHiNeural',zh:'zh-CN-XiaoxiaoNeural'};
    function ttsVoiceName(){return lsGet('astraVoice_'+lang)||EDGE_VOICE[lang]||EDGE_VOICE.en}
    function ttsApiBase(){const b=(window.ASTRA_TOOLS&&window.ASTRA_TOOLS.apiBase)||'/api';return String(b).replace(/\/+$/,'')}
    function speakBuiltin(text,enText){
      if(!window.speechSynthesis)return;
      const v=ttsVoice();
      const u=new SpeechSynthesisUtterance(v?text:(enText||text));
      if(v){u.voice=v;u.lang=v.lang}else{u.lang='en-US'}
      u.rate=1;u.pitch=1;
      window.speechSynthesis.speak(u);
    }
    let ttsQueue=[],ttsPlaying=false,ttsAudio=null;
    function ttsPlayNext(){
      if(ttsPlaying)return;
      const blob=ttsQueue.shift();
      if(!blob)return;
      const url=URL.createObjectURL(blob);
      const a=new Audio(url);
      ttsAudio=a;ttsPlaying=true;
      const done=()=>{try{URL.revokeObjectURL(url)}catch(e){}if(ttsAudio===a)ttsAudio=null;ttsPlaying=false;ttsPlayNext()};
      a.onended=done;a.onerror=done;
      const p=a.play();
      if(p&&p.catch)p.catch(()=>done());
    }
    function ttsStop(){ttsQueue=[];if(ttsAudio){try{ttsAudio.pause()}catch(e){}ttsAudio=null}ttsPlaying=false;if(window.speechSynthesis)window.speechSynthesis.cancel()}
    function speak(text,enText){
      if(!text)return;
      const base=ttsApiBase();
      const token=lsGet('astra.token');
      const headers=Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{});
      const ctrl=('AbortController'in window)?new AbortController():null;
      const timer=ctrl?setTimeout(()=>ctrl.abort(),8000):null;
      const clear=()=>{if(timer)clearTimeout(timer)};
      fetch(base+'/tts',{method:'POST',headers:headers,body:JSON.stringify({input:text,voice:ttsVoiceName()}),signal:ctrl?ctrl.signal:undefined})
        .then(r=>{clear();if(!r.ok)throw new Error('tts '+r.status);return r.blob()})
        .then(b=>{if(!b||!b.size)throw new Error('tts empty');ttsQueue.push(b);ttsPlayNext()})
        .catch(()=>{clear();speakBuiltin(text,enText)});
    }
    function ttsCheck(){
      if(!alarmOn||!window.speechSynthesis)return;
      const n=now();
      for(const b of BOSSES){
        const tm=timers[b.id];
        if(!tm||!tm.endTime)continue;
        const rem=tm.endTime-n;
        if(rem>0)ttsArmed.set(b.id,tm.endTime);
        if(rem>0&&rem<=5*60000){
          const m=Math.ceil(rem/60000);
          const key=`${b.id}_${tm.endTime}_${m}`;
          if(!ttsSpoken.has(key)){ttsSpoken.add(key);speak(t('ttsIn')(bn(b),m),`${b.name} spawns in ${m} minute${m!==1?'s':''}.`)}
        }else if(rem<=0&&rem>-300000){
          const armedEnd=ttsArmed.get(b.id);
          if(armedEnd===tm.endTime){
            const key=`${b.id}_${tm.endTime}_spawned`;
            if(!ttsSpoken.has(key)){ttsSpoken.add(key);speak(t('ttsSpawned')(bn(b)),`${b.name} has spawned.`);ttsArmed.delete(b.id)}
          }
        }
      }
      wbTtsCheck(n);
    }

    const WORLD_BOSS_TIMES=[{hour:12,minute:0},{hour:21,minute:0}];
    const ttsWbMinutes=new Map();
    const sentWbSpawned=new Set();
    let wbDay='';
    function wbTtsCheck(n){
      try{
        const jstNow=new Date(n+TO);
        let nextSpawn=null;
        for(const {hour,minute} of WORLD_BOSS_TIMES){
          const s=Date.UTC(jstNow.getUTCFullYear(),jstNow.getUTCMonth(),jstNow.getUTCDate(),hour-9,minute);
          let ts=s;
          if(ts<n-300000)ts+=86400000;
          if(!nextSpawn||ts<nextSpawn)nextSpawn=ts;
        }
        if(!nextSpawn)return;
        const remainingMs=nextSpawn-n;
        const d=new Date(nextSpawn+TO);
        const spawnKey=`${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}_${String(d.getUTCHours()).padStart(2,'0')}${String(d.getUTCMinutes()).padStart(2,'0')}`;
        if(remainingMs>0&&remainingMs<=5*60000){
          const minutesLeft=Math.ceil(remainingMs/60000);
          const spokeKey=`${spawnKey}_${minutesLeft}`;
          if(!ttsWbMinutes.has(spokeKey)){ttsWbMinutes.set(spokeKey,true);speak(t('ttsWbIn')(minutesLeft),`World Boss spawns in ${minutesLeft} minute${minutesLeft!==1?'s':''}.`)}
        }
        if(remainingMs<=0&&remainingMs>-300000&&!sentWbSpawned.has(spawnKey)){
          sentWbSpawned.add(spawnKey);
          speak(t('ttsWbSpawned'),`World Boss has spawned.`);
        }
        const todayStr=`${String(jstNow.getUTCMonth()+1).padStart(2,'0')}${String(jstNow.getUTCDate()).padStart(2,'0')}`;
        if(wbDay!==todayStr){
          wbDay=todayStr;
          for(const k of sentWbSpawned)if(!k.startsWith(todayStr))sentWbSpawned.delete(k);
          ttsWbMinutes.clear();
        }
      }catch(e){}
    }

    let timers={};
    let guildNames={};
    let rotation={};
    function getGuildDisplay(bossId){
      let raw=null;
      if(rotation.bossGuild&&rotation.bossGuild[bossId]!=null){raw=String(rotation.bossGuild[bossId])}
      else if(rotation[bossId]!=null){raw=String(rotation[bossId])}
      if(raw==null)return null;
      const display=guildNames[raw]||raw;
      let idx=null;
      if(rotation.order){
        const i=rotation.order.indexOf(raw);
        if(i>=0)idx=i;
      }
      if(idx==null&&rotation[raw]!=null)idx=Number(rotation[raw]);
      return{display,idx};
    }
    let nxtBoss=null,nxtTime=null;

    function p2(n){return String(n).padStart(2,'0')}
    function now(){return Date.now()}
    function fmtNum(n){return (Number(n)||0).toLocaleString('en-US')}
    function fmtCompact(n){const v=Number(n)||0;const a=Math.abs(v);if(a>=1e6)return trimK(v/1e6)+'M';if(a>=1e4)return trimK(v/1e3)+'k';if(a>=1e3)return (v/1e3).toFixed(1).replace(/\.0$/,'')+'k';return fmtNum(v)}
    function trimK(x){const s=(Math.round(x*10)/10).toFixed(1).replace(/\.0$/,'');return s}

    const LOC={en:'en-US',ja:'ja-JP',ko:'ko-KR'};
    const fmtDCache=new Map(),fmtTCache=new Map();
    function fmt(ms){return new Date(ms).toLocaleString(LOC[lang],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:lang==='en'})}
    function fmtD(ms){
      const k=Math.floor(ms/86400000);
      const c=fmtDCache.get(k);
      if(c)return c;
      const v=new Date(ms).toLocaleDateString(LOC[lang],{month:'short',day:'numeric'});
      fmtDCache.set(k,v);
      return v;
    }
    function fmtT(ms){
      const k=Math.floor(ms/60000);
      const c=fmtTCache.get(k);
      if(c)return c;
      const v=new Date(ms).toLocaleTimeString(LOC[lang],{hour:'2-digit',minute:'2-digit',hour12:lang==='en'});
      fmtTCache.set(k,v);
      return v;
    }
    const UNITS={en:{d:'d',h:'h',m:'m',s:'s'},ja:{d:'\u65E5',h:'\u6642\u9593',m:'\u5206',s:'\u79D2'},ko:{d:'\uC77C',h:'\uC2DC\uAC04',m:'\uBD84',s:'\uCD08'}};
    function fmtDur(ms){if(ms<=0)return t('spawned');const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),u=UNITS[lang],sp=lang==='ja'?'':' ';return d?`${d}${u.d}${sp}${h}${u.h}`:h?`${h}${u.h}${sp}${m}${u.m}`:`${m}${u.m}${sp}${p2(s%60)}${u.s}`}
    function fmtShort(ms){if(ms<=0)return t('now');const s=Math.floor(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),u=UNITS[lang];return d?`${d}${u.d}`:h?`${h}${u.h}`:`${m}${u.m}`}
    function fmtInt(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),u=UNITS[lang],sp=lang==='ja'?'':' ';return m?`${h}${u.h}${sp}${m}${u.m}`:`${h}${u.h}`}

    function nextSpawn(b){return nextSpawnAt(b,now())}
    function nextSpawnAt(b,baseMs){
      const t=timers[b.id];
      if(b.rs){return t?.endTime?new Date(t.endTime):null}
      if(b.wr){const n=baseMs,base=new Date(n+TO);let best=null;for(const w of b.wr){const c=new Date(base),del=(w.d+7-base.getUTCDay())%7;c.setUTCDate(base.getUTCDate()+del);c.setUTCHours(w.h,w.m,0,0);let r=c.getTime()-TO;if(r<n)r+=604800000;if(!best||r<best)best=r}return best?new Date(best):null}
      return null
    }
    function prevSpawn(b,baseMs){
      const n=baseMs,base=new Date(n+TO);let best=null;
      for(const w of b.wr){const c=new Date(base),del=(w.d+7-base.getUTCDay())%7;c.setUTCDate(base.getUTCDate()+del);c.setUTCHours(w.h,w.m,0,0);let r=c.getTime()-TO;if(r>=n)r-=604800000;if(!best||r>best)best=r}
      return best?new Date(best):null
    }
    function schedB(){return BOSSES.filter(b=>b.wr)}
    function intB(){return BOSSES.filter(b=>b.rs)}
    function grpInt(){const g={};for(const b of intB()){const k=b.rs;if(!g[k])g[k]={s:k,b:[]};g[k].b.push(b)}return Object.values(g).sort((a,b)=>a.s-b.s)}

    function urgencyClass(ms) {
      if (ms <= 0) return 'alive';
      if (ms <= 5 * 60000) return 'urgent';
      if (ms <= 30 * 60000) return 'soon';
      return '';
    }
    function statusClassFor(ms) {
      if (ms <= 0) return 'status-alive';
      if (ms <= 5 * 60000) return 'status-danger';
      if (ms <= 30 * 60000) return 'status-soon';
      return '';
    }

    function rNext(){
      let bb=null,bs=null,cn=now();
      for(const b of BOSSES){const n=nextSpawn(b);if(n&&n.getTime()>cn&&(!bs||n.getTime()<bs.getTime())){bs=n;bb=b}}
      if(bb&&bs){
        $('nextName').textContent=bn(bb);$('nextLv').textContent=t('lv')+bb.lvl;
        $('nextLoc').textContent=locOf(bb.id);
        const isInt=!!bb.rs;$('nextTag').textContent=isInt?t('ivTag'):t('schedTag');
        $('nextTag').className='hero-tag '+(isInt?'interval':'scheduled');
        $('nextAt').textContent=fmtD(bs.getTime())+' '+fmtT(bs.getTime());
        nxtBoss=bb;nxtTime=bs;
        const gd=getGuildDisplay(bb.id);
        const gEl=$('nextGuild');
        if(gd){gEl.textContent=gd.display;gEl.className='hero-guild-badge guild-'+gd.idx;gEl.hidden=false}else{gEl.hidden=true}
        const im=$('heroBossImg'),url='assets/'+bb.id+'.png';
        if(im.getAttribute('src')!==url){im.style.opacity=0;im.onload=()=>{im.style.opacity=1};im.src=url}
      }else if(nxtBoss){
        $('nextName').textContent='--';$('nextLv').textContent='';$('nextLoc').textContent='';$('nextTag').textContent='';$('nextAt').textContent='';$('nextGuild').hidden=true;nxtBoss=null;nxtTime=null;
        $('heroBossImg').style.opacity=0;
      }
    }

    const RING_CIRCUMFERENCE = 2 * Math.PI * 44;
    function rNextCd(){
      const el=$('nextCd');
      if(nxtTime){
        const r=Math.max(0,nxtTime.getTime()-now());
        const text=fmtDur(r);
        if (el.textContent !== text) el.textContent=text;
        const cls='hero-countdown-value '+urgencyClass(r);
        if(el.className!==cls) el.className=cls;
        const ring=$('heroProgress');
        if (ring) {
          let maxSpan = 24 * 3600000;
          if (nxtBoss) {
            if (nxtBoss.rs) maxSpan = nxtBoss.rs * 1000;
            else if (nxtBoss.wr) {
              const prev = prevSpawn(nxtBoss, nxtTime.getTime() - 1000);
              maxSpan = prev ? nxtTime.getTime() - prev.getTime() : 604800000;
            }
          }
          const offset = RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, r / maxSpan)));
          if(ring.style.strokeDashoffset!==offset+'px')ring.style.strokeDashoffset=offset;
        }
      } else {
        if (el.textContent !== '--:--:--') el.textContent='--:--:--';
        const cls='hero-countdown-value';
        if(el.className!==cls) el.className=cls;
        const ring=$('heroProgress');
        if (ring) ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
      }
    }
    const SCHED_SPAWN_EXPIRE_MS=120000;
    function expireSchedSpawn(){
      if(nxtBoss&&nxtBoss.wr&&nxtTime&&now()-nxtTime.getTime()>=SCHED_SPAWN_EXPIRE_MS)rNext();
    }
    function rNextCdTick(){
      if(document.hidden)return;
      const tr=$('pageTracker');
      if(tr&&!tr.classList.contains('active'))return;
      expireSchedSpawn();
      visualRefresh();
      rNextCd();
    }
    setInterval(rNextCdTick,1000)
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){expireSchedSpawn();visualRefresh();rNextCd()}});

    let lastUpHtml={today:'',tomorrow:''};
    function rUpcoming(){
      const n=now(),tKey=Math.floor((n+TO)/86400000),tmKey=tKey+1;
      const dayKey=t=>Math.floor((t+TO)/86400000);
      const list={today:[],tomorrow:[]};
      const push=(b,t)=>{
        if(t<=n){list.today.push({b,t});return}
        const dk=dayKey(t);
        if(dk===tKey)list.today.push({b,t});
        else if(dk===tmKey)list.tomorrow.push({b,t});
      };
      for(const b of BOSSES){
        if(b.rs){
          const et=timers[b.id]?.endTime;
          if(et)push(b,et);
        }else if(b.wr){
          const x=nextSpawn(b);if(x&&x.getTime()>n)push(b,x.getTime());
          const p=prevSpawn(b,n);if(p&&n-p.getTime()<=SCHED_SPAWN_EXPIRE_MS)push(b,p.getTime());
        }
      }
      list.today.sort((a,b)=>a.t-b.t);list.tomorrow.sort((a,b)=>a.t-b.t);
      for(const v of ['today','tomorrow']){
        const e=v==='today'?$('upcomingList'):$('upcomingTmrw');
        let h;
        if(!list[v].length){
          h='<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><p>'+t('noSpawns')+'</p></div>';
        }else{
          h='<div class="boss-list">'+list[v].map(x=>{
            const rem=x.t-n;
            const cls=statusClassFor(rem);
            const gd=getGuildDisplay(x.b.id);
            const badge=gd?'<span class="guild-badge guild-'+gd.idx+'">'+gd.display+'</span>':'';
            return '<div class="boss-card '+cls+'" data-t="'+x.t+'"><div class="boss-card-main"><span class="boss-card-name">'+bn(x.b)+'</span>'+badge+'</div><div class="boss-card-time"><span class="boss-card-time-value">'+(rem<=0?t('spawned'):fmtT(x.t))+'</span></div></div>';
          }).join('')+'</div>';
        }
        if(h!==lastUpHtml[v]){e.innerHTML=h;lastUpHtml[v]=h;}
      }
    }

    let lastSchedHtml='';
    function rSched(){
      const j=new Date(now()+TO),cd=j.getUTCDay();
      const order=[1,2,3,4,5,6,0];
      const by=order.map(d=>({d,n:t('days')[d],es:[]}));
      for(const b of schedB())for(const w of b.wr){const col=by.find(x=>x.d===w.d);if(col)col.es.push({b,t:p2(w.h)+':'+p2(w.m)})}
      for(const d of by)d.es.sort((a,b)=>a.t.localeCompare(b.t))
      const h='<div class="schedule-grid">'+by.map((d,i)=>{
        return '<div class="day-card '+(d.d===cd?'today':'')+'"><div class="day-header"><span>'+d.n+'</span><span>'+(d.d===cd?t('today'):'')+'</span></div><div class="day-events">'+(d.es.length?d.es.map(e=>'<div class="day-event"><span class="day-event-name">'+bn(e.b)+'</span><span class="day-event-time">'+e.t+'</span></div>').join(''):'<div class="day-empty">--</div>')+'</div></div>';
      }).join('')+'</div>';
      if(h===lastSchedHtml)return;
      const sg=$('schedGrid');sg.innerHTML=h;lastSchedHtml=h;fitPanelCards(sg);
    }

    let lastIntHtml='';
    function rInt(){
      const n=now();
      const h='<div class="interval-grid">'+grpInt().map((g,i)=>{
        const isNext=nxtBoss&&g.b.includes(nxtBoss);
        return '<div class="interval-card '+(isNext?'highlight':'')+'"><div class="interval-header"><div class="interval-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg><span>'+t('every')+' '+fmtInt(g.s)+'</span></div><span class="interval-count">'+g.b.length+'</span></div><div class="interval-rows">'+g.b.map(b=>{const et=timers[b.id]?.endTime,al=et&&et>n;return'<div class="interval-row" data-t="'+(et||0)+'"><span class="interval-row-name">'+bn(b)+'</span><span class="interval-row-time '+(al?'live':'na')+'">'+(al?fmtShort(et-n):'--')+'</span></div>'}).join('')+'</div></div>';
      }).join('')+'</div>';
      if(h===lastIntHtml)return;
      const ig=$('ivGrid');ig.innerHTML=h;lastIntHtml=h;fitPanelCards(ig);
    }

    function rAll(){rNext();rUpcoming();rSched();rInt();rHidden();rNextCd()}

    function visualRefresh(){rUpcoming();rSched();rInt()}

    const RELIC_COST=[
0,15,25,36,48,62,78,96,116,138,163,192,225,263,306,355,410,471,539,614,697,790,890,990,1090,1190,1340,1490,1760,1964,2172,2400,2650,2924,3224,3552,3910,4300,4724,5184,5682,6220,6800,7424,8094,8812,9580,10400,11274,12204,13192,14240,15350,16524,17764,19072,20450,21900,23424,25024,26702,28460,30300,32224,34234,36332,38520,40800,43174,45644,48212,50880,53650,56524,59504,62592,65790,69100,72524,76064,79722,83500,87400,91424,95574,99852,104260,108800,113474,118284,123232,128320,133550,138924,144444,150112,155930,161900,168024,174304];
    const RELIC_STORM_COST=[
0,5000,5104,5219,5346,5485,5637,5802,5981,6174,6382,6610,6860,7134,7434,7762,8120,8510,8934,9394,9892,10430,11010,11634,12304,13022,13790,14610,15484,16414,17402,18450,19560,20734,21974,23282,24660,26110,27634,29234,30912,32670,34510,36434,38444,40542,42730,45010,47384,49854,52422,55090,57860,60734,63714,66802,70000,73310,76734,80274,83932,87710,91610,95634,99784,104062,108470,113010,117684,122494,127442,132530,137760,143134,148654,154322,160140,166110,172234,178514,184952,191550,198310,205234,212324,219582,227010,234610,242384,250334,258462,266770,275260,283934,292794,301842,311080,320510,330134,339954];
    const RELIC_TABLES=[RELIC_COST,RELIC_COST,RELIC_COST,RELIC_STORM_COST];
    const RELIC_NAMES=['Origin of Destruction','Barrier Protection','Crystal of Life','Magic Storm'];
    const CHESTS=[
      {key:'T1',qty:1000},
      {key:'T2',qty:5000},
      {key:'T3',qty:10000},
      {key:'T4',qty:50000},
      {key:'T5',qty:100000}
    ];
    const CURR={usd:{sym:'$',rate:'usd'},php:{sym:'\u20B1',rate:'php'},jpy:{sym:'\u00A5',rate:'jpy'},krw:{sym:'\u20A9',rate:'krw'}};
    // NEXT Market grade palette (from next-market css vars) + tile gradients (142deg)
    const NEXT_BG_COLOR={NONE:'#ffffff',GREEN:'#34d361',BLUE:'#3b9cff',MAGENTA:'#9d66ff',ORANGE:'#ff9500',RED:'#ef4444',YELLOW:'#ffc83d'};
    const NEXT_BG_TILE={NONE:'linear-gradient(142deg,#282a2b,#4c4c4c)',GREY:'linear-gradient(142deg,#474a4c,#6a6e71)',GREEN:'linear-gradient(142deg,#243128,#325539)',BLUE:'linear-gradient(142deg,#1d273b,#214075)',MAGENTA:'linear-gradient(142deg,#282131,#422958)',YELLOW:'linear-gradient(142deg,#46391c,#8b6a1b)',ORANGE:'linear-gradient(142deg,#37291f,#6f441b)',RED:'linear-gradient(142deg,#412022,#7e1b1d)'};
    function gradeColor(g){return NEXT_BG_COLOR[g]||'';}
    function gradeBg(g){return NEXT_BG_TILE[g]||'';}
    const RELIC_API='https://relic-prices.arianthonyungsod.workers.dev/prices';
    const LS_PKEY='astraprices';

    let relicState=[[1,1],[1,1],[1,1],[1,1]];
    let relicPrices=null,relicFx=null,relicUpdated=null,relicCurrency='usd',relicLoading=false;
    let relicTier='auto';
    let mktExpanded=false;
    const PRICE_MEMORY_KEY='relic_price_memory_v1';

    const RELIC_IDS=['destruction','protection','life','storm'];
    const RELIC_COLORS=['#ef4444','#3b82f6','#22c55e','#eab308'];
    const RELIC_STATS={
      destruction:['Defense Penetration + 10','Accuracy + 10','Melee Critical Hit Resistance + 10','Damage to Boss Monsters Increase + 2%','Max MP + 20'],
      protection:['Defense Penetration + 10','Evasion + 10','Ranged Critical Hit Resistance + 10','Damage to Elite Monsters Increase + 2%','Max MP + 20'],
      life:['Defense Penetration + 10','Potion Recovery + 3','Magic Critical Hit Resistance + 10','Damage to Normal Monsters Increase + 2%','Max MP + 20'],
      storm:['Basic Attack Damage Received Decrease in PvP + 1%','MP Recovery in Battle + 9','Critical Hit + 10','Potion Recovery + 3','Global Cooldown Decrease + 0.03 sec']
    };
    const STAT_CP={
      'Defense Penetration + 10':100,'Accuracy + 10':60,
      'Melee Critical Hit Resistance + 10':20,'Ranged Critical Hit Resistance + 10':20,'Magic Critical Hit Resistance + 10':20,
      'Damage to Boss Monsters Increase + 2%':40,'Damage to Elite Monsters Increase + 2%':44,'Damage to Normal Monsters Increase + 2%':44,
      'Max MP + 20':2,'Evasion + 10':40,'Potion Recovery + 3':30,'MP Recovery in Battle + 9':90,'Critical Hit + 10':80,
      'Basic Attack Damage Received Decrease in PvP + 1%':44,'Global Cooldown Decrease + 0.03 sec':0
    };
    const PROTECTION_DEF=[0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,6,6,6,6,6,6,6,7,7,7,7,7,7,8,8,8,8,8,8,9,9,9,9,10,10,10,10,10,11,11,11,11,12,12,12,13,13,13,13,14,14,14,15,15,15,16,16,16,17,17,17,18,18,18,19,19,19,20,20,21,22,22,23,23];
    const DESTRUCTION_ATTACK_TOTALS=(()=>{
      const anchors=[[1,0],[20,90],[21,97],[47,339],[48,351],[52,401],[53,413],[60,510],[61,525],[80,830],[81,848],[89,992],[95,1122],[96,1156],[97,1190],[98,1226],[99,1262],[100,1300]];
      const totals=Array(101).fill(0);
      for(let i=0;i<anchors.length-1;i++){
        const [fl,ft]=anchors[i],[tl,tt]=anchors[i+1];
        const span=tl-fl;
        for(let lv=fl;lv<=tl;lv++){
          if(lv===fl){totals[lv]=ft;continue;}
          if(lv===tl){totals[lv]=tt;continue;}
          totals[lv]=Math.round(ft+((tt-ft)*(lv-fl)/span));
        }
      }
      return totals;
    })();
    const LIFE_HP_TOTALS=DESTRUCTION_ATTACK_TOTALS.map(v=>v*10);

    function relicTP(from,to,idx){
      const tbl=RELIC_TABLES[idx];
      if(!tbl||!(from>=1)||!(to>from)||to>tbl.length)return 0;
      let s=0;
      for(let i=from;i<to;i++)s+=tbl[i];
      return s;
    }
    function relicMilestones(idx,from,to){
      const stats=RELIC_STATS[RELIC_IDS[idx]];if(!stats)return[];
      const ms=[];
      for(let lv=10;lv<=100;lv+=2)if(lv>from&&lv<=to)ms.push({level:lv,stat:stats[((lv-10)/2)%stats.length]});
      return ms;
    }
    function relicBreakdown(idx,from,to){
      const ms=relicMilestones(idx,from,to);
      const totals={};let mCP=0;
      for(const m of ms){
        const match=m.stat.match(/^(.+?)\s*[+\-]\s*(.+)$/);
        if(!match)continue;
        const name=match[1].trim(),val=parseFloat(match[2].replace('%','')),isP=match[2].includes('%'),cp=STAT_CP[m.stat]||0;
        if(!totals[name])totals[name]={val:0,isP,cp:0};
        totals[name].val+=val;totals[name].cp+=cp;mCP+=cp;
      }
      let bName=null,bGain=0,bCP=0;
      const id=RELIC_IDS[idx];
      if(id==='destruction'){bName='Attack';bGain=DESTRUCTION_ATTACK_TOTALS[to]-DESTRUCTION_ATTACK_TOTALS[from];bCP=bGain*10;}
      else if(id==='life'){bName='HP';bGain=LIFE_HP_TOTALS[to]-LIFE_HP_TOTALS[from];bCP=Math.floor(bGain/10);}
      else if(id==='protection'){bName='Defense';for(let l=from;l<to;l++)bGain+=PROTECTION_DEF[l]||0;bCP=bGain*8;}
      return {totals,mCP,bName,bGain,bCP,totalCP:mCP+bCP};
    }
    function relicCurConv(usdt){
      const r=(relicFx&&relicFx[CURR[relicCurrency].rate])||0;
      return r>0?(usdt*r):(relicCurrency==='usd'?usdt:null);
    }
    function relicFmt(usdt){
      const v=relicCurConv(usdt);
      if(v===null)return '\u2014';
      const fixed=v.toFixed(2).split('.');
      fixed[0]=fmtNum(fixed[0]);
      return CURR[relicCurrency].sym+fixed.join('.');
    }
    function cachePrices(){
      if(!relicPrices)return;
      lsSet(LS_PKEY,JSON.stringify({p:relicPrices,fx:relicFx,u:relicUpdated,ts:Date.now()}));
    }
    function readCache(){
      try{
        const raw=lsGet(LS_PKEY);
        if(!raw)return;
        const d=JSON.parse(raw);
        if(d&&d.p&&typeof d.p==='object'){relicPrices=d.p;relicFx=d.fx||null;relicUpdated=d.u||null;}
      }catch(e){}
    }
    async function loadPrices(force){
      if(relicLoading)return;
      relicLoading=true;
      rRelic();
      try{
        const url=RELIC_API+'?lang='+lang+(force?'&force=1&_='+Date.now():'&_='+Date.now());
        const r=await fetch(url,{cache:'no-store'});
        if(!r.ok)throw Error(r.status);
        const d=await r.json();
        if(!d.success)throw Error(d.message||'bad');
        relicPrices=d.prices||null;
        relicFx=d.fx||null;
        relicUpdated=d.lastUpdated||null;
        $('mktSave').textContent='';
        cachePrices();
      }catch(e){
        readCache();
        $('mktSave').textContent=t('mktErr');
      }finally{
        relicLoading=false;
        rRelic();
      }
    }
    function mktUpdatedLabel(){
      if(!relicUpdated)return '--';
      const mins=Math.floor((now()-new Date(relicUpdated).getTime())/60000);
      return t('updated')+': '+t('age')(mins);
    }

    function pricedRows(){
      if(!relicPrices)return[];
      return CHESTS.filter(c=>relicPrices[c.key]).map(c=>{
        const p=relicPrices[c.key];
        const usdt=p.priceUSDT;
        return {key:c.key,qty:c.qty,usdt,per1k:usdt/c.qty*1000,name:p.name||c.key,imageUrl:p.imageUrl||'',bg:p.bg||'NONE'};
}).sort((a,b)=>a.per1k-b.per1k);
    }

    function playPing(){
      try{
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(!Ctx)return;
        const ctx=new Ctx(),osc=ctx.createOscillator(),gain=ctx.createGain();
        const nowMs=ctx.currentTime;
        osc.type='sine';
        osc.frequency.setValueAtTime(980,nowMs);
        osc.frequency.exponentialRampToValueAtTime(740,nowMs+0.24);
        gain.gain.setValueAtTime(0.0001,nowMs);
        gain.gain.exponentialRampToValueAtTime(0.10,nowMs+0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001,nowMs+0.26);
        osc.connect(gain);gain.connect(ctx.destination);
        osc.start(nowMs);osc.stop(nowMs+0.26);
        setTimeout(()=>ctx.close().catch(()=>{}),420);
      }catch(e){}
    }
    function relicPieceCost(pieces){
      if(!pieces||pieces<=0||!relicPrices)return null;
      const rows=pricedRows();
      if(!rows.length)return null;
      let best=rows[0];
      if(relicTier&&relicTier!=='auto'){
        const pick=rows.find(r=>r.key===relicTier);
        if(pick)best=pick;
      }
      if(!(best.usdt>0)||!(best.qty>0))return null;
      return pieces*(best.usdt/best.qty);
    }
    function rRelic(){
      let total=0,gUp=0,gCP=0,per=[],bd=[];
      for(let i=0;i<4;i++){
        const tp=relicTP(relicState[i][0],relicState[i][1],i);
        per.push(tp);total+=tp;
        gUp+=Math.max(0,relicState[i][1]-relicState[i][0]);
        bd.push(relicBreakdown(i,relicState[i][0],relicState[i][1]));
        gCP+=bd[i].totalCP;
      }
      for(let i=0;i<4;i++){
        const row=$('relicRow'+i);
        $('relicName'+i).textContent=(LANG[lang].relicNames||RELIC_NAMES)[i];
        $('relicFrom'+i).value=relicState[i][0];
        $('relicTo'+i).value=relicState[i][1];
        row.classList.toggle('active',per[i]>0);
        const b=bd[i],hex=RELIC_COLORS[i];
        const el=$('relicResult'+i);
        const cost=relicPieceCost(per[i]);
        $('relicCp'+i).textContent='';
        if(per[i]<=0){el.innerHTML='';continue;}
        let h='<div class="relic-result-cp" style="color:'+hex+'">+'+fmtNum(b.totalCP)+' CP</div><div class="relic-result-pieces" style="color:'+hex+'">'+fmtCompact(per[i])+'</div><div class="relic-result-price">'+(cost?relicFmt(cost):'\u2014')+'</div>';
        el.innerHTML=h;
      }
      $('relicGrandPieces').textContent=fmtCompact(total);
      $('relicGrandUp').textContent=fmtNum(gUp);
      $('relicGrandCp').textContent='+'+fmtCompact(gCP);
      $('mktUpdated').textContent=mktUpdatedLabel();
      renderMkt(total);
      requestAnimationFrame(()=>{fitRelic();fitMarketInsight()});
    }
    function renderMkt(total){
      const state=$('mktState'),save=$('mktSave'),tier=$('tierList');
      document.querySelectorAll('.mkt-currency .seg-btn').forEach(b=>{
        const avail=relicCurrency==='usd'||((relicFx&&relicFx[CURR[b.dataset.cur].rate])||0)>0;
        b.classList.toggle('active',b.dataset.cur===relicCurrency);
        b.classList.toggle('off',!avail);
      });
      const clear=(txt)=>{state.textContent=txt;state.classList.add('show');tier.innerHTML='';};
      if(relicLoading){clear(t('mktLoading'));return;}
      if(!relicPrices){clear(t('mktErr'));return;}
      const rows=pricedRows();
      if(!rows.length){clear(t('mktNoL'));return;}
      state.classList.remove('show');
      const byKey={};rows.forEach(r=>byKey[r.key]=r);
      const ordered=CHESTS.filter(c=>byKey[c.key]).map(c=>byKey[c.key]);
      const best=rows[0];
      tier.innerHTML=ordered.map(row=>{
        const need=total>0?Math.ceil(total/row.qty):1;
        const isBest=row===best;
        const isSel=row.key===relicTier;
        const rowName=(row.name&&row.name!==row.key)?row.name:row.key;
        const rc=gradeColor(row.bg),rb=gradeBg(row.bg);
        return '<div class="tier-row'+(isBest?' best-value':'')+(isSel?' selected':'')+'" data-tier="'+row.key+'">'+(row.imageUrl?'<span class="tier-ico '+(rb?'g':'')+'" '+(rb?'style="background:'+rb+'"':'')+'><img class="tier-img" src="'+row.imageUrl+'" alt="" loading="lazy" onerror="this.style.display=\'none\'"></span>':'')+'<span class="tier-name"><span class="tier-real" style="color:'+(rc||'')+'">'+rowName+'</span>'+(isBest?'<i class="chk-ico" title="'+t('bestTag')+'"></i>':'')+'</span><span class="tier-cost">'+relicFmt(row.usdt)+'</span></div>';
      }).join('');
      tier.hidden=false;
      renderInsight(total);
    }
    function renderInsight(total){
      const host=$('mktInsight');
      const syncToggle=(show)=>{const b=$('mktDetailsToggle');if(!b)return;b.hidden=!show;const lbl=$('mktDetailsToggleLbl');if(lbl)lbl.textContent=t(mktExpanded?'mktCollapse':'mktExpand');b.setAttribute('aria-expanded',mktExpanded?'true':'false');b.classList.toggle('open',mktExpanded);};
      if(!host){syncToggle(false);return;}
      const rows=pricedRows();
      if(!rows.length){host.innerHTML='';syncToggle(false);return;}
      if(total<=0){
        host.innerHTML='<div class="mkt-insight-card mkt-insight-empty">'+t('setGoal')+'</div>';
        syncToggle(false);
        return;
      }
      const per=[],bd=[];let gCP=0;
      for(let i=0;i<4;i++){
        per.push(relicTP(relicState[i][0],relicState[i][1],i));
        const b=relicBreakdown(i,relicState[i][0],relicState[i][1]);
        bd.push(b);gCP+=b.totalCP;
      }
      if(gCP<=0){host.innerHTML='';syncToggle(false);return;}
      const totalCost=relicPieceCost(total);
      const costCP=(totalCost>0&&gCP>0)?(totalCost/gCP):null;
      const best=rows[0];
      const pick=relicTier&&rows.find(r=>r.key===relicTier)?rows.find(r=>r.key===relicTier):best;
      const bestQ=Math.ceil(total/best.qty),bestCost=best.usdt*bestQ;
      const pickQ=Math.ceil(total/pick.qty),pickCost=pick.usdt*pickQ;
      const save=pickCost>bestCost+0.001?(pickCost-bestCost):0;
      const savePct=save>0&&pickCost>0?(save/pickCost*100):0;
      const eff=[];for(let i=0;i<4;i++){
        if(per[i]<=0||bd[i].totalCP<=0)continue;
        const c=relicPieceCost(per[i]);
        eff.push({i,cp:bd[i].totalCP,cost:c,cpc:c>0?c/bd[i].totalCP:null,pieces:per[i]});
      }
      eff.sort((a,b)=>(a.cpc??1e18)-(b.cpc??1e18));
      let h='';
      h+='<div class="mkt-insight-card mkt-cost-card"><div class="mkt-insight-title">'+t('mktInsight')+'</div><div class="mkt-cost-cp"><span class="mkt-cost-cp-val">'+(costCP!==null?relicFmt(costCP):'\u2014')+'</span><span class="mkt-cost-cp-unit">'+t('mktCostCp')+'</span></div></div>';
      h+='<div class="mkt-insight-card mkt-best-card"><div class="mkt-insight-title">'+t('mktBestTier')+'</div><div class="mkt-best-row"><span class="tier-real" style="color:'+(gradeColor(best.bg)||'')+'">'+(best.name&&best.name!==best.key?best.name:best.key)+'</span><span class="mkt-best-meta">'+relicFmt(best.per1k)+' / '+fmtNum(1000)+'</span></div><div class="mkt-best-cta">'+t('mktBestTip')+' '+relicFmt(bestCost)+' <span class="mkt-qty">('+fmtNum(bestQ)+')</span></div></div>';
      h+='<div class="mkt-details">';
      h+='<div class="mkt-insight-card"><div class="mkt-insight-title">'+t('mktCalc')+'</div><div class="mkt-calc-row"><span>'+t('mktCalcPieces')+'</span><b>'+fmtCompact(total)+'</b></div><div class="mkt-calc-row"><span>'+t('mktCalcCp')+'</span><b>+'+fmtCompact(gCP)+'</b></div><div class="mkt-calc-row"><span>'+t('mktCalcCost')+'</span><b>'+relicFmt(totalCost)+'</b></div></div>';

      if(eff.length){
        let th='<div class="mkt-tbl-row mkt-tbl-head"><span>'+t('mktHRelic')+'</span><span class="mkt-tbl-lv">'+t('mktHLevel')+'</span><span>'+t('mktHCp')+'</span><span>'+t('mktHCost')+'</span><span>'+t('mktHCpCur')+'</span></div>';
        th+=eff.map(e=>{
          const name=(LANG[lang].relicNames||RELIC_NAMES)[e.i];
          const from=relicState[e.i][0],to=relicState[e.i][1];
          return '<div class="mkt-tbl-row"><span class="mkt-tbl-name"><span class="relic-dot re-'+e.i+'" aria-hidden="true"></span>'+name+'</span><span class="mkt-t-lv">'+fmtNum(from)+' '+t('mktFromTo')+' '+fmtNum(to)+'</span><span>+'+fmtCompact(e.cp)+'</span><span>'+relicFmt(e.cost)+'</span><span class="mkt-t-cpc">'+(e.cpc?relicFmt(e.cpc):'\u2014')+'</span></div>';
        }).join('');
        h+='<div class="mkt-insight-card mkt-table-card"><div class="mkt-insight-title">'+t('mktTable')+' <span class="mkt-insight-sub">'+t('mktEffic')+'</span></div>'+th+'</div>';
      }

      if(save>0){
        h+='<div class="mkt-insight-card mkt-save-card"><div class="mkt-insight-title">'+t('mktSavings')+'</div><div class="mkt-save-row"><div class="mkt-save-msg">'+t('mktSavingsMsg')+'</div><div class="mkt-save-amt">'+relicFmt(save)+' <span class="mkt-save-pct">('+savePct.toFixed(1)+'%)</span></div></div></div>';
      }else{
        h+='<div class="mkt-insight-card mkt-save mkt-save-ok"><div class="mkt-insight-title">'+t('mktSavings')+'</div><div class="mkt-save-msg">'+t('mktAlreadyBest')+'</div></div>';
      }
      h+='</div>';
      host.innerHTML=h;
      syncToggle(true);
    }
    function rRelicSoft(){
      if(!$('pageRelic').classList.contains('active'))return;
      $('mktUpdated').textContent=mktUpdatedLabel();
    }
    function resetRelic(){
      relicState=[[1,1],[1,1],[1,1],[1,1]];
      relicCurrency='usd';
      relicTier='auto';
      setMktExpanded(false);
      rRelic();
    }
    function setMktExpanded(v){
      mktExpanded=!!v;
      const mb=$('mktBody');
      if(mb)mb.classList.toggle('expanded',mktExpanded);
      const btn=$('mktDetailsToggle');
      if(btn){const lbl=$('mktDetailsToggleLbl');if(lbl)lbl.textContent=t(mktExpanded?'mktCollapse':'mktExpand');btn.setAttribute('aria-expanded',mktExpanded?'true':'false');btn.classList.toggle('open',mktExpanded);}
      requestAnimationFrame(()=>{fitRelic();fitMarketInsight()});
      setTimeout(()=>{fitRelic();fitMarketInsight()},300);
    }

function fitRelic(){
      const page=$('pageRelic');
      if(!page||!page.classList.contains('active'))return;
      const panel=document.querySelector('#pageRelic .relic-grid > .panel');
      const body=panel?panel.querySelector('.panel-body'):null;
      if(!body)return;
      body.style.removeProperty('transform');
      if(window.matchMedia('(max-width: 900px)').matches)return;
      const avail=body.clientHeight;
      const need=body.scrollHeight;
      if(avail<=1||need<=avail+1)return;
      const s=Math.max(0.5,avail/need);
      body.style.transformOrigin='top center';
      body.style.transform='scale('+s+')';
    }
    function fitMarketInsight(){
      const page=$('pageRelic');
      if(!page||!page.classList.contains('active'))return;
      const ins=$('mktInsight');
      if(!ins||!ins.innerHTML)return;
      ins.style.setProperty('--fit','1');
      if(window.matchMedia('(max-width: 900px)').matches)return;
      if(mktExpanded)return;
      const avail=ins.clientHeight;
      if(avail<=1)return;
      let fit=1;
      for(let i=0;i<8;i++){
        if(ins.scrollHeight<=avail+1)break;
        fit=Math.max(0.5,fit*avail/ins.scrollHeight);
        ins.style.setProperty('--fit',fit);
      }
    }
    function fitPanelCards(root){
      const cards=[...root.querySelectorAll('.day-card,.interval-card')];
      if(!cards.length)return;
      cards.forEach(c=>c.style.removeProperty('font-size'));
      const cardFrac=c=>{
        const area=c.querySelector('.day-events,.interval-rows');
        if(!area)return 1;
        const avail=area.clientHeight,need=area.scrollHeight;
        if(avail<=1||need<=avail+1)return 1;
        return Math.max(0.5,(avail/need)*0.97);
      };
      let cur=16;
      for(let i=0;i<6;i++){
        let frac=1;
        for(const c of cards)frac=Math.min(frac,cardFrac(c));
        if(frac>=1)break;
        const next=Math.max(8,cur*frac);
        if(Math.abs(next-cur)<0.1){cur=next;break}
        cur=next;
        cards.forEach(c=>c.style.setProperty('font-size',cur+'px'));
      }
      cards.forEach(c=>c.style.setProperty('font-size',cur+'px'));
    }

    const HIDDEN_CLASSES=[{className:"Sword Master",skillName:"Exalted Will",skill:"Basic Attacks have a 25% chance of dealing Extra Combined Damage.",pairs:[{skills:[{name:"Deathblow",type:"Enhance"},{name:"Time Haste",type:"Trick"}]},{skills:[{name:"Secreta's Talent",type:"Recon"},{name:"Parry",type:"Defense"}]},{skills:[{name:"Wild Dance",type:"Combat"},{name:"Deliberate Attack",type:"Support"}]}],milestones:[{lvl:100,desc:"Melee Defense Penetration +50"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Melee Attack +50 / All Damage +3.5%"},{lvl:600,desc:"When hit, increases the caster's All Damage and decreases Damage Received for 6 sec."},{lvl:700,desc:"Defense Power +100"},{lvl:800,desc:"Deals 30% + 30% bonus Combined Damage within a 7m radius around the caster, and inflicts Stun for 2 sec with a +60% chance. Afterwards, deals 30% + 30% bonus Combined Damage 3 times, deals Combined Critical Hit Damage on the final attack. (Up to 10 targets)"}]},
{className:"Destroyer",skillName:"Land Crush",skill:"Jumps to a target within a 7m radius and deals Combined Damage around the target and inflicts Knockdown for 2 sec with a +60% chance. (Up to 10 targets) Gains Damage Immunity for 2 sec.",pairs:[{skills:[{name:"Hellfire Weapon",type:"Enhance"},{name:"Honed Weaponry",type:"Recon"}]},{skills:[{name:"Blink",type:"Trick"},{name:"Power of Darkness",type:"Spell"}]},{skills:[{name:"Polish Weapon",type:"Combat"},{name:"Gamble",type:"Support"}]}],milestones:[{lvl:100,desc:"Defense Penetration +50"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Skill Damage +7% / Cooldown Decrease +10%"},{lvl:600,desc:"Landing Attack increases the caster's Attack Power and Defense Power for 60 sec."},{lvl:700,desc:"Attack Power +100 / Defense Power +100"},{lvl:800,desc:"Causes an Earthquake around the caster for 10 sec. Deals 75% extra Physical Damage to targets within range every 2 sec, and inflicts Stun for 1 sec with a +50% chance. (Up to 20 targets)"}]},
{className:"Frost Knight",skillName:"Frost Curse",skill:"Deals Combined Damage to the target and inflicts Frozen for 4 sec with a +60% chance. When Frozen ends, reduces Movement Speed for 10 sec. Reduces Movement Speed around the target for 10 sec. (Up to 5 targets)",pairs:[{skills:[{name:"Frost Weapon",type:"Spell"},{name:"Earth Shock",type:"Combat"}]},{skills:[{name:"Cutting Strike",type:"Enhance"},{name:"Life Tap",type:"Trick"}]},{skills:[{name:"Leech",type:"Vitality"},{name:"Anatomy",type:"Support"}]}],milestones:[{lvl:100,desc:"Endurance Ignore +50"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Critical Hit +100 / Critical Hit Damage +7%"},{lvl:600,desc:"When HP is at 50% or below, increases the caster's Endurance."},{lvl:700,desc:"Attack Power +100"},{lvl:800,desc:"Causes an Ice Storm around the target for 10 sec. Deals 50% extra Magic Damage to targets within range every second, and reduces Movement Speed for 3 sec. (Up to 20 targets)"}]},
{className:"Ancient Protector",skillName:"Ancient Protector",skill:"Landing a Basic Attack has a 100% chance of increasing All Damage and Damage to Monster. Stacks up to 20 times.",pairs:[{skills:[{name:"Create Zone",type:"Defense"},{name:"Deliberate Attack",type:"Support"}]},{skills:[{name:"Overcome",type:"Vitality"},{name:"Fire Spirit",type:"Enhance"}]},{skills:[{name:"Spell Infusion",type:"Spell"},{name:"Wanderer",type:"Trick"}]}],milestones:[{lvl:100,desc:"Defense Power +50"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Defense Power +75 / Attack Power +100"},{lvl:600,desc:"Increases the caster's Attack Power and Defense Power per 4% of HP lost. (Lost HP increases up to 80%.)"},{lvl:700,desc:"Defense Power +100 / Endurance +30"},{lvl:800,desc:"Increases All Damage of the caster and allies within a 10m radius for 30 sec, and reduces Damage Received. (Up to 10 targets)"}]},
{className:"Immortal Knight",skillName:"Immortality",skill:"When the caster's HP is at 10% or below, becomes Immortal and immune to all Damage, Status Effects, and Debuffs for 5 sec. When Immortal ends, recovers HP equal to 30% of Max HP. [Recovery cannot exceed Max 15,000.]",pairs:[{skills:[{name:"Chase",type:"Combat"},{name:"Defensive Stance",type:"Defense"}]},{skills:[{name:"Deathblow",type:"Enhance"},{name:"Supersense",type:"Recon"}]},{skills:[{name:"Install Bomb",type:"Trick"},{name:"Secreta's Talent",type:"Recon"}]}],milestones:[{lvl:100,desc:"Defense Penetration +50"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Attack Power +75 / Damage Received Decrease +3.5%"},{lvl:600,desc:"Landing Attack increases the caster's Accuracy and Critical Hit for 30 sec."},{lvl:700,desc:"Defense Power +100"},{lvl:800,desc:"Grants Petrify to the caster for 5 sec."}]},
{className:"Trinity",skillName:"Everlasting Flow",skill:"Basic Attacks have a 100% chance to grant an Effect to the caster for a short duration. Effects are applied in the order of Attack Speed, Defense Penetration, and Critical Hit, circulating every 25 stacks.",pairs:[{skills:[{name:"Cutting Strike",type:"Enhance"},{name:"Magic Ignition",type:"Vitality"}]},{skills:[{name:"Magic Circulation",type:"Vitality"},{name:"Supersense",type:"Recon"}]},{skills:[{name:"Weapon of Destruction",type:"Trick"},{name:"Weak Spot Analysis",type:"Support"}]}],milestones:[{lvl:100,desc:"Defense Power +50"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Attack Power +75 / All Damage +3.5%"},{lvl:600,desc:"Landing Attack Skill increases the caster's Attack Power, Accuracy, and Critical Hit for 60 sec."},{lvl:700,desc:"Attack Power +100 / Attack Speed +5%"},{lvl:800,desc:"Deals Combined Damage around the caster and inflicts Stun for 5 sec with a +60% chance. (Up to 10 targets)"}]},
{className:"Harbinger of Storms",skillName:"Raging Storm",skill:"Summons a Storm Area to pull targets toward the caster with a +60% chance and significantly reduces their Movement Speed. Storm Area deals fixed damage 8 times and deals a powerful Combined Damage 3 sec later. (Up to 10 targets) While Storm Area is summoned, the caster becomes immune to all Status Effects.",pairs:[{skills:[{name:"Mirror Shield",type:"Defense"},{name:"War Cry",type:"Vitality"}]},{skills:[{name:"Ice Spirit",type:"Enhance"},{name:"Power of Darkness",type:"Spell"}]},{skills:[{name:"Spread Venom",type:"Recon"},{name:"Magnetic Field",type:"Spell"}]}],milestones:[{lvl:100,desc:"Skill Damage +7%"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Skill Damage +15%"},{lvl:600,desc:"Landing Attack Skill increases the caster's Movement Speed for 30 sec."},{lvl:700,desc:"Attack Power +100 / Attack Speed +5%"},{lvl:800,desc:"Increases the caster's Max HP, Defense Power, Attack Speed, and Movement Speed for 30 sec. [Recovery cannot exceed Max 20,000.]"}]},
{className:"Goddess of Blessings",skillName:"Hands of the Goddess",skill:"Increases Attack Power, Movement Speed, and Status Effects Resistance of the caster and allies within a 15m radius for 10 sec. (Up to 10 targets)",pairs:[{skills:[{name:"Create Zone",type:"Defense"},{name:"Lightning Spirit",type:"Enhance"}]},{skills:[{name:"Leech",type:"Vitality"},{name:"Time Haste",type:"Trick"}]},{skills:[{name:"Wanderer",type:"Trick"},{name:"Continuous Curing",type:"Support"}]}],milestones:[{lvl:100,desc:"Endurance +50"},{lvl:200,desc:"Movement Speed +8%"},{lvl:300,desc:"Attack Speed +8%"},{lvl:400,desc:"Attack Power +70"},{lvl:500,desc:"Defense Power +75 / Cooldown Decrease +10%"},{lvl:600,desc:"Landing Attack Skill increases the caster's Attack Power, Defense Power, and Attack Speed for 60 sec."},{lvl:700,desc:"Attack Power +100 / Attack Speed +5%"},{lvl:800,desc:"Recovers HP of the caster and party members within a 10m radius equal to 10% of Max HP every 2 sec for 10 sec. Reduces Healing Received for 60 sec. [Recovery cannot exceed Max 5,000 per instance.]"}]}];

    const HT={ko:{},ja:{}};(function(){
  const add=(en,ko,ja)=>{HT.ko[en]=ko;HT.ja[en]=ja};
  add("Sword Master","검술 마스터","剣術マスター");
  add("Destroyer","파괴자","破壊者");
  add("Frost Knight","서리 기사","氷霜の騎士");
  add("Ancient Protector","고대 수호자","古代守護者");
  add("Immortal Knight","불멸 기사","不死の騎士");
  add("Trinity","삼위일체","三位一体");
  add("Harbinger of Storms","폭풍의 전조","嵐の先駆け");
  add("Goddess of Blessings","축복의 여신","祝福の女神");
  add("Exalted Will","고귀한 의지","高貴なる意志");
  add("Land Crush","대지 분쇄","大地粉砕");
  add("Frost Curse","서리 저주","氷霜の呪い");
  add("Immortality","불멸","不死");
  add("Everlasting Flow","영원한 흐름","永劫の流れ");
  add("Raging Storm","폭풍우","荒れ狂う嵐");
  add("Hands of the Goddess","여신의 손길","女神の御手");
  add("Basic Attacks have a 25% chance of dealing Extra Combined Damage.","기본 공격 시 25% 확률로 추가 합산 피해를 입힙니다.","基本攻撃時、25%の確率で追加の合算ダメージを与える。");
  add("Jumps to a target within a 7m radius and deals Combined Damage around the target and inflicts Knockdown for 2 sec with a +60% chance. (Up to 10 targets) Gains Damage Immunity for 2 sec.","7m 반경 내 대상에게 도약하여 대상 주변에 합산 피해를 입히고 +60% 확률로 2초간 넉다운시킵니다. (최대 10명) 2초간 피해 면역을 얻습니다.","7m半径内の対象に跳躍し、対象の周囲に合算ダメージを与え、+60%の確率で2秒間ノックダウンさせる。(最大10体) 2秒間ダメージ無効を得る。");
  add("Deals Combined Damage to the target and inflicts Frozen for 4 sec with a +60% chance. When Frozen ends, reduces Movement Speed for 10 sec. Reduces Movement Speed around the target for 10 sec. (Up to 5 targets)","대상에게 합산 피해를 입히고 +60% 확률로 4초간 빙결 상태로 만듭니다. 빙결 종료 시 10초간 이동 속도를 감소시킵니다. 대상 주변의 이동 속도를 10초간 감소시킵니다. (최대 5명)","対象に合算ダメージを与え、+60%の確率で4秒間凍結状態にする。凍結終了時、10秒間移動速度を低下させる。対象の周囲の移動速度を10秒間低下させる。(最大5体)");
  add("Landing a Basic Attack has a 100% chance of increasing All Damage and Damage to Monster. Stacks up to 20 times.","기본 공격 적중 시 100% 확률로 모든 피해와 몬스터 대상 피해가 증가합니다. 최대 20회까지 중첩됩니다.","基本攻撃命中時、100%の確率で全ダメージとモンスターへのダメージが増加する。最大20回まで累積する。");
  add("When the caster's HP is at 10% or below, becomes Immortal and immune to all Damage, Status Effects, and Debuffs for 5 sec. When Immortal ends, recovers HP equal to 30% of Max HP. [Recovery cannot exceed Max 15,000.]","시전자의 HP가 10% 이하일 때 5초간 불사 상태가 되어 모든 피해, 상태 효과, 디버프에 면역이 됩니다. 불사 종료 시 최대 HP의 30%를 회복합니다. [회복량은 최대 15,000을 초과할 수 없습니다.]","術者のHPが10%以下の時、5秒間不死状態となり全てのダメージ、状態異常、デバフに免疫となる。不死終了時、最大HPの30%を回復する。[回復量は最大15,000を超えない]");
  add("Basic Attacks have a 100% chance to grant an Effect to the caster for a short duration. Effects are applied in the order of Attack Speed, Defense Penetration, and Critical Hit, circulating every 25 stacks.","기본 공격 시 100% 확률로 시전자에게 짧은 시간 동안 효과를 부여합니다. 효과는 공격 속도, 방어 관통, 치명타 순서로 적용되며 25회 중첩마다 순환합니다.","基本攻撃時、100%の確率で術者に短時間効果を付与する。効果は攻撃速度、防御貫通、クリティカルの順で適用され、25スタック毎に循環する。");
  add("Summons a Storm Area to pull targets toward the caster with a +60% chance and significantly reduces their Movement Speed. Storm Area deals fixed damage 8 times and deals a powerful Combined Damage 3 sec later. (Up to 10 targets) While Storm Area is summoned, the caster becomes immune to all Status Effects.","폭풍 지대를 소환하여 +60% 확률로 대상을 시전자 쪽으로 끌어당기고 이동 속도를 크게 감소시킵니다. 폭풍 지대는 고정 피해를 8회 입히고 3초 후 강력한 합산 피해를 입힙니다. (최대 10명) 폭풍 지대가 소환된 동안 시전자는 모든 상태 효과에 면역이 됩니다.","嵐の領域を召喚し、+60%の確率で対象を術者へ引き寄せ、移動速度を大幅に低下させる。嵐の領域は固定ダメージを8回与え、3秒後に強力な合算ダメージを与える。(最大10体) 嵐の領域召喚中、術者は全ての状態異常に免疫となる。");
  add("Increases Attack Power, Movement Speed, and Status Effects Resistance of the caster and allies within a 15m radius for 10 sec. (Up to 10 targets)","15m 반경 내 시전자와 아군의 공격력, 이동 속도, 상태 효과 저항을 10초간 증가시킵니다. (최대 10명)","15m半径内の術者と味方の攻撃力、移動速度、状態異常耐性を10秒間増加させる。(最大10体)");
  add("Deathblow","필살 일격","必殺の一撃");
  add("Time Haste","시간 가속","時空加速");
  add("Secreta's Talent","세크레타의 재능","セクレタの才能");
  add("Parry","받아넘기기","受け流し");
  add("Wild Dance","광란의 춤","乱舞");
  add("Deliberate Attack","신중한 공격","精密攻撃");
  add("Hellfire Weapon","지옥불 무기","地獄火の武器");
  add("Honed Weaponry","연마된 무기","研磨された武器");
  add("Blink","점멸","ブリンク");
  add("Power of Darkness","어둠의 힘","闇の力");
  add("Polish Weapon","무기 연마","武器研磨");
  add("Gamble","도박","ギャンブル");
  add("Frost Weapon","서리 무기","氷霜の武器");
  add("Earth Shock","대지 충격","大地衝撃");
  add("Cutting Strike","베어내기","斬撃");
  add("Life Tap","생명력 전환","生命転換");
  add("Leech","흡혈","吸血");
  add("Anatomy","해부학","解剖学");
  add("Create Zone","영역 생성","領域生成");
  add("Overcome","극복","克服");
  add("Fire Spirit","불의 정령","火の精霊");
  add("Spell Infusion","주문 주입","呪文注入");
  add("Wanderer","방랑자","放浪者");
  add("Chase","추격","追撃");
  add("Defensive Stance","방어 태세","防御態勢");
  add("Supersense","초감각","超感覚");
  add("Install Bomb","폭탄 설치","爆弾設置");
  add("Magic Ignition","마법 점화","魔力点火");
  add("Magic Circulation","마법 순환","魔力循環");
  add("Weapon of Destruction","파괴의 무기","破壊の武器");
  add("Weak Spot Analysis","약점 분석","弱点分析");
  add("Mirror Shield","거울 방패","鏡の盾");
  add("War Cry","전투의 함성","戦の雄叫び");
  add("Ice Spirit","얼음 정령","氷の精霊");
  add("Spread Venom","맹독 살포","猛毒散布");
  add("Magnetic Field","자기장","磁場");
  add("Lightning Spirit","번개 정령","雷の精霊");
  add("Continuous Curing","지속 치유","持続治療");
  add("Combat","전투","戦闘");
  add("Recon","정찰","偵察");
  add("Defense","방어","防御");
  add("Spell","주문","呪文");
  add("Enhance","강화","強化");
  add("Support","지원","支援");
  add("Vitality","생명력","生命力");
  add("Trick","술책","策略");
  add("Melee Defense Penetration +50","근접 방어 관통 +50","近接防御貫通 +50");
  add("Movement Speed +8%","이동 속도 +8%","移動速度 +8%");
  add("Attack Speed +8%","공격 속도 +8%","攻撃速度 +8%");
  add("Attack Power +70","공격력 +70","攻撃力 +70");
  add("Melee Attack +50 / All Damage +3.5%","근접 공격 +50 / 모든 피해 +3.5%","近接攻撃 +50 / 全ダメージ +3.5%");
  add("When hit, increases the caster's All Damage and decreases Damage Received for 6 sec.","피격 시 시전자의 모든 피해가 증가하고 6초간 받는 피해가 감소합니다.","被弾時、術者の全ダメージが増加し、6秒間被ダメージが減少する。");
  add("Defense Power +100","방어력 +100","防御力 +100");
  add("Deals 30% + 30% bonus Combined Damage within a 7m radius around the caster, and inflicts Stun for 2 sec with a +60% chance. Afterwards, deals 30% + 30% bonus Combined Damage 3 times, deals Combined Critical Hit Damage on the final attack. (Up to 10 targets)","시전자 주변 7m 반경에 30% + 30% 보너스 합산 피해를 입히고 +60% 확률로 2초간 기절시킵니다. 이후 30% + 30% 보너스 합산 피해를 3회 입히고 마지막 공격은 합산 치명타 피해를 입힙니다. (최대 10명)","術者の周囲7m半径に30% + 30%ボーナス合算ダメージを与え、+60%の確率で2秒間スタンさせる。その後、30% + 30%ボーナス合算ダメージを3回与え、最後の攻撃は合算クリティカルダメージを与える。(最大10体)");
  add("Defense Penetration +50","방어 관통 +50","防御貫通 +50");
  add("Skill Damage +7% / Cooldown Decrease +10%","스킬 피해 +7% / 쿨다운 감소 +10%","スキルダメージ +7% / クールダウン減少 +10%");
  add("Landing Attack increases the caster's Attack Power and Defense Power for 60 sec.","공격 적중 시 60초간 시전자의 공격력과 방어력이 증가합니다.","攻撃命中時、60秒間術者の攻撃力と防御力が増加する。");
  add("Attack Power +100 / Defense Power +100","공격력 +100 / 방어력 +100","攻撃力 +100 / 防御力 +100");
  add("Causes an Earthquake around the caster for 10 sec. Deals 75% extra Physical Damage to targets within range every 2 sec, and inflicts Stun for 1 sec with a +50% chance. (Up to 20 targets)","시전자 주변에 10초간 지진을 일으킵니다. 2초마다 범위 내 대상에게 75% 추가 물리 피해를 입히고 +50% 확률로 1초간 기절시킵니다. (최대 20명)","術者の周囲に10秒間地震を発生させる。2秒毎に範囲内の対象に75%追加物理ダメージを与え、+50%の確率で1秒間スタンさせる。(最大20体)");
  add("Endurance Ignore +50","인내 무시 +50","耐久無視 +50");
  add("Critical Hit +100 / Critical Hit Damage +7%","치명타 +100 / 치명타 피해 +7%","クリティカル +100 / クリティカルダメージ +7%");
  add("When HP is at 50% or below, increases the caster's Endurance.","HP가 50% 이하일 때 시전자의 인내가 증가합니다.","HPが50%以下の時、術者の耐久が増加する。");
  add("Causes an Ice Storm around the target for 10 sec. Deals 50% extra Magic Damage to targets within range every second, and reduces Movement Speed for 3 sec. (Up to 20 targets)","대상 주변에 10초간 얼음 폭풍을 일으킵니다. 매초 범위 내 대상에게 50% 추가 마법 피해를 입히고 3초간 이동 속도를 감소시킵니다. (최대 20명)","対象の周囲に10秒間氷の嵐を発生させる。毎秒範囲内の対象に50%追加魔法ダメージを与え、3秒間移動速度を低下させる。(最大20体)");
  add("Defense Power +50","방어력 +50","防御力 +50");
  add("Defense Power +75 / Attack Power +100","방어력 +75 / 공격력 +100","防御力 +75 / 攻撃力 +100");
  add("Increases the caster's Attack Power and Defense Power per 4% of HP lost. (Lost HP increases up to 80%.)","HP가 4% 손실될 때마다 시전자의 공격력과 방어력이 증가합니다. (손실 HP는 최대 80%까지 증가)","HPが4%失われるごとに術者の攻撃力と防御力が増加する。(失ったHPは最大80%まで増加)");
  add("Defense Power +100 / Endurance +30","방어력 +100 / 인내 +30","防御力 +100 / 耐久 +30");
  add("Increases All Damage of the caster and allies within a 10m radius for 30 sec, and reduces Damage Received. (Up to 10 targets)","10m 반경 내 시전자와 아군의 모든 피해를 30초간 증가시키고 받는 피해를 감소시킵니다. (최대 10명)","10m半径内の術者と味方の全ダメージを30秒間増加させ、被ダメージを減少させる。(最大10体)");
  add("Attack Power +75 / Damage Received Decrease +3.5%","공격력 +75 / 받는 피해 감소 +3.5%","攻撃力 +75 / 被ダメージ減少 +3.5%");
  add("Landing Attack increases the caster's Accuracy and Critical Hit for 30 sec.","공격 적중 시 30초간 시전자의 명중률과 치명타가 증가합니다.","攻撃命中時、30秒間術者の命中率とクリティカルが増加する。");
  add("Grants Petrify to the caster for 5 sec.","시전자에게 5초간 석화 부여.","術者に5秒間石化を付与。");
  add("Attack Power +75 / All Damage +3.5%","공격력 +75 / 모든 피해 +3.5%","攻撃力 +75 / 全ダメージ +3.5%");
  add("Landing Attack Skill increases the caster's Attack Power, Accuracy, and Critical Hit for 60 sec.","공격 스킬 적중 시 60초간 시전자의 공격력, 명중률, 치명타가 증가합니다.","攻撃スキル命中時、60秒間術者の攻撃力、命中率、クリティカルが増加する。");
  add("Attack Power +100 / Attack Speed +5%","공격력 +100 / 공격 속도 +5%","攻撃力 +100 / 攻撃速度 +5%");
  add("Deals Combined Damage around the caster and inflicts Stun for 5 sec with a +60% chance. (Up to 10 targets)","시전자 주변에 합산 피해를 입히고 +60% 확률로 5초간 기절시킵니다. (최대 10명)","術者の周囲に合算ダメージを与え、+60%の確率で5秒間スタンさせる。(最大10体)");
  add("Skill Damage +7%","스킬 피해 +7%","スキルダメージ +7%");
  add("Skill Damage +15%","스킬 피해 +15%","スキルダメージ +15%");
  add("Landing Attack Skill increases the caster's Movement Speed for 30 sec.","공격 스킬 적중 시 30초간 시전자의 이동 속도가 증가합니다.","攻撃スキル命中時、30秒間術者の移動速度が増加する。");
  add("Increases the caster's Max HP, Defense Power, Attack Speed, and Movement Speed for 30 sec. [Recovery cannot exceed Max 20,000.]","30초간 시전자의 최대 HP, 방어력, 공격 속도, 이동 속도를 증가시킵니다. [회복량은 최대 20,000을 초과할 수 없습니다.]","30秒間、術者の最大HP、防御力、攻撃速度、移動速度を増加させる。[回復量は最大20,000を超えない]");
  add("Endurance +50","인내 +50","耐久 +50");
  add("Defense Power +75 / Cooldown Decrease +10%","방어력 +75 / 쿨다운 감소 +10%","防御力 +75 / クールダウン減少 +10%");
  add("Landing Attack Skill increases the caster's Attack Power, Defense Power, and Attack Speed for 60 sec.","공격 스킬 적중 시 60초간 시전자의 공격력, 방어력, 공격 속도가 증가합니다.","攻撃スキル命中時、60秒間術者の攻撃力、防御力、攻撃速度が増加する。");
  add("Recovers HP of the caster and party members within a 10m radius equal to 10% of Max HP every 2 sec for 10 sec. Reduces Healing Received for 60 sec. [Recovery cannot exceed Max 5,000 per instance.]","10m 반경 내 시전자와 파티원의 최대 HP의 10%에 해당하는 HP를 10초간 2초마다 회복합니다. 60초간 받는 치유 감소. [회복량은 회당 최대 5,000을 초과할 수 없습니다.]","10m半径内の術者とパーティーメンバーの最大HPの10%相当のHPを10秒間2秒毎に回復する。60秒間被治癒量が減少。[回復量は1回につき最大5,000を超えない]");
})();
    let lastHiddenLang='';
    function rHidden(){
      if(lastHiddenLang===lang)return;
      lastHiddenLang=lang;
      const ht=(en)=>(HT[lang]&&HT[lang][en])||en;
      const expandedSet=new Set([...document.querySelectorAll('.class-card.expanded')].map(c=>c.dataset.key));
      $('hiddenList').innerHTML=HIDDEN_CLASSES.map((c,i)=>{
        const exp=expandedSet.has(c.className);
        const pairs=c.pairs.map(p=>'<div class="skill-pair">'+p.skills.map(s=>'<span class="skill-pair-item skill-pair-'+s.type+'"><img src="assets/'+s.type.toLowerCase()+'.png" alt="" class="hc-type-icon" loading="lazy" decoding="async"><span class="skill-pair-name">'+ht(s.name)+'</span></span>').join('')+'</div>').join('');
        const mils=c.milestones.map(m=>'<div class="milestone-item"><span class="milestone-lvl">'+m.lvl+'</span><span class="milestone-desc">'+ht(m.desc).replace(/(\+\d+(?:\.\d+)?%?)/g,'<span class="stat-val">$1</span>')+'</span></div>').join('');
        return '<div class="class-card'+(exp?' expanded':'')+'" tabindex="0" aria-expanded="'+exp+'" data-key="'+c.className+'"><div class="class-card-header"><div class="class-icon"><img src="assets/'+c.className+'.png" alt="" class="class-icon-img" loading="lazy" decoding="async"></div><div class="class-title-group"><span class="class-name">'+ht(c.className)+'</span></div><span class="class-toggle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span></div><div class="class-card-body"><div class="skill-block"><div class="skill-block-label">'+ht(c.skillName)+'</div><div class="skill-block-text">'+ht(c.skill)+'</div></div><div class="skill-pairs">'+pairs+'</div><div class="milestones"><div class="milestone-title">'+t('milestones')+'</div><div class="milestone-list">'+mils+'</div></div></div></div>';
      }).join('');
      fitPairTexts();
      fitExpandedCards();
      fitCollapsedCards();
    }

    function fitPairTexts(){
      document.querySelectorAll('#hiddenList .skill-pair-name').forEach(n=>{
        const item=n.closest('.skill-pair-item');
        const w=n.clientWidth;
        if(!w) return;
        const tx=n.style.transition,ix=item.style.transition;
        n.style.transition='none';item.style.transition='none';
        n.style.fontSize='';
        if(n.scrollWidth>w){
          let fs=parseFloat(getComputedStyle(n).fontSize);
          while(fs>10&&n.scrollWidth>w){fs=Math.max(10,fs-0.5);n.style.fontSize=fs+'px';}
        }
        n.style.transition=tx;item.style.transition=ix;
      });
    }

    function fitClassCard(card){
      const body=card.querySelector('.class-card-body');
      if(!body)return;
      body.style.removeProperty('zoom');
      const avail=body.clientHeight;
      if(avail<=1)return;
      const need=body.scrollHeight;
      if(need<=avail+1)return;
      let z=Math.min(1,(avail/need)*0.97);
      if(z<0.5)z=0.5;
      body.style.zoom=z;
      if(z>0.5&&body.scrollHeight>avail+1){
        z=Math.max(0.5,z*(avail/body.scrollHeight)*0.97);
        body.style.zoom=z;
      }
    }

    function fitExpandedCards(){
      if(window.innerWidth>900)return;
      document.querySelectorAll('#hiddenList .class-card .class-card-body').forEach(b=>b.style.removeProperty('zoom'));
      document.querySelectorAll('#hiddenList .class-card.expanded').forEach(fitClassCard);
    }

    function fitCollapsedCards(){
      if(window.innerWidth>900)return;
      const cards=[...document.querySelectorAll('#hiddenList .class-card')];
      for(const c of cards){
        const h=c.querySelector('.class-card-header');
        if(h)h.style.removeProperty('zoom');
      }
      for(const c of cards){
        if(c.classList.contains('expanded'))continue;
        const h=c.querySelector('.class-card-header');
        if(!h)continue;
        const availW=h.clientWidth,availH=h.clientHeight;
        if(availW<=1||availH<=1)continue;
        const needW=h.scrollWidth,needH=h.scrollHeight;
        if(needW<=availW+1&&needH<=availH+1)continue;
        let z=Math.min(1,Math.min(availW/needW,availH/needH)*0.97);
        if(z<0.5)z=0.5;
        h.style.zoom=z;
        if(z>0.5&&(h.scrollHeight>availH+1||h.scrollWidth>availW+1)){
          z=Math.max(0.5,z*Math.min(availW/h.scrollWidth,availH/h.scrollHeight)*0.97);
          h.style.zoom=z;
        }
      }
    }

    const $=(id)=>document.getElementById(id);

    $('langBtn').onclick=langNext;
    $('alarmBtn').onclick=toggleAlarm;

    for(let i=0;i<4;i++)(function(idx){
      const from=$('relicFrom'+idx),to=$('relicTo'+idx);
      const setPair=(a,b)=>{relicState[idx]=[Math.max(1,Math.min(100,a)),Math.max(1,Math.min(100,b))];rRelic();};
      const upd=()=>{
        let a=parseInt(from.value,10)||1,b=parseInt(to.value,10)||1;
        a=Math.max(1,Math.min(100,a));b=Math.max(1,Math.min(100,b));
        from.value=a;to.value=b;
        setPair(a,b);
      };
      from.addEventListener('input',upd);
      to.addEventListener('input',upd);
    })(i);

    document.getElementById('relicSettings').addEventListener('click',(e)=>{
      const btn=e.target.closest('.relic-stepper');
      if(!btn)return;
      const idx=+btn.dataset.idx,field=btn.dataset.field,dir=+btn.dataset.dir;
      const inp=$('relic'+(field[0].toUpperCase()+field.slice(1))+idx);
      const cur=Math.max(1,Math.min(100,parseInt(inp.value,10)||1));
      const nxt=Math.max(1,Math.min(100,cur+dir));
      inp.value=nxt;
      relicState[idx]=[field==='from'?nxt:relicState[idx][0],field==='to'?nxt:relicState[idx][1]];
      rRelic();
    });

    const refreshBtn=$('mktRefresh');
    refreshBtn.onclick=()=>{
      if(refreshBtn.dataset.lock)return;
      loadPrices(true);
      let left=5;
      refreshBtn.dataset.lock='1';
      refreshBtn.classList.add('locked');
      refreshBtn.textContent='';
      const tick=()=>{
        refreshBtn.textContent=left;
        if(left<=0){
          delete refreshBtn.dataset.lock;
          refreshBtn.classList.remove('locked');
          refreshBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><polyline points="21 3 21 9 15 9"></polyline></svg>';
          clearInterval(iv);
          return;
        }
        left--;
      };
      tick();
      const iv=setInterval(tick,1000);
    };
    document.querySelectorAll('.mkt-currency .seg-btn').forEach(b=>b.onclick=()=>{
      if(b.classList.contains('off'))return;
      relicCurrency=b.dataset.cur;
      rRelic();
    });
    document.querySelectorAll('.tier-list').forEach(l=>l.addEventListener('click',(e)=>{
      const row=e.target.closest('.tier-row');
      if(!row)return;
      const key=row.dataset.tier;
      relicTier=(relicTier===key)?'auto':key;
      rRelic();
    }));
    document.addEventListener('click',(e)=>{
      const btn=e.target.closest('#mktDetailsToggle');
      if(!btn)return;
      setMktExpanded(!mktExpanded);
    });

    function positionNavIndicator(){
      const pill=document.querySelector('.nav-pill');
      const active=document.querySelector('.nav-btn.active');
      const ind=pill&&pill.querySelector('.nav-indicator');
      if(!pill||!active||!ind)return;
      const pillLeft=pill.getBoundingClientRect().left;
      const r=active.getBoundingClientRect();
      ind.style.left=Math.max(0,r.left-pillLeft)+'px';
      ind.style.width=Math.max(0,r.width)+'px';
    }
    function debounceNav(fn,ms){let t;return()=>{clearTimeout(t);t=setTimeout(fn,ms)}}

    document.querySelectorAll('.nav-btn').forEach(btn=>btn.onclick=()=>{
      const leavingRelic=$('pageRelic').classList.contains('active')&&btn.dataset.page!=='relic';
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      if(leavingRelic)resetRelic();
      const PAGES={tracker:'pageTracker',hidden:'pageHidden',relic:'pageRelic'};
      $((PAGES[btn.dataset.page]||'pageTracker')).classList.add('active');
      requestAnimationFrame(()=>{fitPairTexts();fitExpandedCards();fitCollapsedCards();const ap=document.querySelector('.page.active');if(ap){fitPanelCards(ap)};if(ap&&ap===document.getElementById('pageRelic'))rRelic();});
      requestAnimationFrame(()=>{requestAnimationFrame(fitRelic);});
      requestAnimationFrame(positionNavIndicator);
    });

    document.addEventListener('click',(e)=>{
      const hdr=e.target.closest('.class-card-header');
      if(!hdr) return;
      const card=hdr.closest('.class-card');
      if(window.innerWidth<=900&&!card.classList.contains('expanded'))document.querySelectorAll('.class-card.expanded').forEach(c=>{
        if(c!==card){c.classList.remove('expanded');c.setAttribute('aria-expanded','false');}
      });
      card.classList.toggle('expanded');
      const expanded=card.classList.contains('expanded');
      card.setAttribute('aria-expanded',expanded);
      fitPairTexts();
      fitExpandedCards();
      fitCollapsedCards();
      if(expanded&&window.innerWidth<=900)requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'start'}));
    });

    document.addEventListener('keydown',(e)=>{
      if(e.key!=='Enter'&&e.key!==' ') return;
      const card=e.target.closest('.class-card');
      if(!card) return;
      e.preventDefault();
      if(window.innerWidth<=900&&!card.classList.contains('expanded'))document.querySelectorAll('.class-card.expanded').forEach(c=>{
        if(c!==card){c.classList.remove('expanded');c.setAttribute('aria-expanded','false');}
      });
      card.classList.toggle('expanded');
      const expanded=card.classList.contains('expanded');
      card.setAttribute('aria-expanded',expanded);
      fitPairTexts();
      fitExpandedCards();
      fitCollapsedCards();
      if(expanded&&window.innerWidth<=900)requestAnimationFrame(()=>card.scrollIntoView({behavior:'smooth',block:'start'}));
    });

    let fitTimer;
    window.addEventListener('resize',()=>{clearTimeout(fitTimer);fitTimer=setTimeout(()=>{fitPairTexts();fitExpandedCards();fitCollapsedCards();const ap=document.querySelector('.page.active');if(ap){fitPanelCards(ap)};fitRelic();fitMarketInsight()},150);});
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{fitPairTexts();fitExpandedCards();fitCollapsedCards();const ap=document.querySelector('.page.active');if(ap)fitPanelCards(ap);fitRelic();fitMarketInsight()});

    const ptrEl=$('ptrIndicator');
    let ptrY=0,ptrReady=false,ptrActive=false;
    document.addEventListener('touchstart',(e)=>{
      if(window.innerWidth>900||!ptrEl)return;
      let el=e.target,scrollable=false;
      while(el&&el!==document.body&&el!==document.documentElement){
        if(el.scrollHeight>el.clientHeight+1){
          scrollable=true;
          if(el.scrollTop>1)return;
        }
        el=el.parentElement;
      }
      if(!scrollable)return;
      ptrY=e.touches[0].clientY;ptrReady=true;ptrActive=false;
    },{passive:true});
    document.addEventListener('touchmove',(e)=>{
      if(!ptrReady)return;
      const dy=e.touches[0].clientY-ptrY;
      if(dy>0){
        ptrActive=true;
        ptrEl.style.top=Math.min(120,dy*0.5)+'px';
        ptrEl.style.opacity=Math.min(1,dy/100);
        if(e.cancelable)e.preventDefault();
      }
    },{passive:false});
    function ptrReset(){ptrReady=false;ptrActive=false;ptrEl.classList.remove('loading');ptrEl.style.top='';ptrEl.style.opacity='';}
    document.addEventListener('touchend',(e)=>{
      if(!ptrReady)return;
      ptrReady=false;
      const dy=e.changedTouches[0].clientY-ptrY;
      if(ptrActive&&dy>=80){
        ptrEl.classList.add('loading');
        location.reload();
        return;
      }
      ptrReset();
    },{passive:true});
    document.addEventListener('touchcancel',ptrReset,{passive:true});

    let currentView='interval',currentUpView='today';
    const segBtns=document.querySelectorAll('.segmented .seg-btn[data-view]');
    const viewBodies={interval:$('ivGrid'),schedule:$('schedGrid')};
    segBtns.forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentView=btn.dataset.view;
        segBtns.forEach(b=>{
          b.classList.toggle('active',b===btn);
          b.setAttribute('aria-selected',b===btn?'true':'false');
        });
        viewBodies[currentView].hidden=false;
        Object.entries(viewBodies).forEach(([k,el])=>{if(k!==currentView) el.hidden=true;});
        $('viewTitle').textContent=t(currentView==='schedule'?'schedTitle':'ivTitle');
        fitPanelCards(viewBodies[currentView]);
      });
    });
    const upSegBtns=document.querySelectorAll('.segmented .seg-btn[data-upview]');
    const upViewBodies={today:$('upcomingList'),tomorrow:$('upcomingTmrw')};
    upSegBtns.forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentUpView=btn.dataset.upview;
        upSegBtns.forEach(b=>{
          b.classList.toggle('active',b===btn);
          b.setAttribute('aria-selected',b===btn?'true':'false');
        });
        upViewBodies[currentUpView].hidden=false;
        Object.entries(upViewBodies).forEach(([k,el])=>{if(k!==currentUpView) el.hidden=true;});
        $('upcomingLbl').textContent=t(currentUpView==='tomorrow'?'tomorrow':'today');
        rUpcoming();
      });
    });

    let dataOnline=false;
    function setOnline(on){
      dataOnline=on;
      try{ if(window.ASTRA_TOOLS&&window.ASTRA_TOOLS.onStatusChange) window.ASTRA_TOOLS.onStatusChange(on); }catch(e){}
      const lp=$('livePill'),lt=$('liveText');
      if(lp)lp.className='live-pill '+(on?'on':'off');
      if(lt)lt.textContent=on?t('live'):t('offline');
      const sb=$('exportInfo');
      if(sb){sb.classList.toggle('online',on);sb.classList.toggle('offline',!on);}
    }

    function listenData(){
      db.doc('timers/global').onSnapshot({includeMetadataChanges:true},snap=>{
        if(snap.exists){
          const d=snap.data().timers||{};
          const c=Object.keys(d).length;
          if(c!==Object.keys(timers).length||JSON.stringify(d)!==JSON.stringify(timers)){
            timers=d;rAll();ttsCheck();setOnline(true)
          }
        }
      },()=>{setOnline(false)});
      db.doc('config/discordBot').onSnapshot({includeMetadataChanges:true},snap=>{
        if(snap.exists){
          const sd=snap.data();
          const gn=sd.guildNames||{};
          const rot=sd.rotation||{};
          if(JSON.stringify(gn)!==JSON.stringify(guildNames)||JSON.stringify(rot)!==JSON.stringify(rotation)){
            guildNames=gn;rotation=rot;rUpcoming();rNext();
          }
        }
      },()=>{});
    }
    async function pollData(){
      if(dataOnline)return;
      try{
        const r=await fetch('https://firestore.googleapis.com/v1/projects/astra-boss-timer-759e5/databases/(default)/documents/timers/global?key=AIzaSyAboQqH7BmtLCO0ciHUvgGIUOU6SMzHnzo');
        if(!r.ok)throw Error(r.status);
        const d=await r.json();
        if(d.fields&&d.fields.timers&&d.fields.timers.mapValue){
          const parsed={};
          for(const [id,val] of Object.entries(d.fields.timers.mapValue.fields)){
            const m=val.mapValue.fields;
            parsed[id]={endTime:Number(m.endTime.integerValue||m.endTime.doubleValue),startedAt:Number(m.startedAt.integerValue||m.startedAt.doubleValue),guild:m.guild?Number(m.guild.integerValue||m.guild.doubleValue):undefined};
          }
          if(JSON.stringify(parsed)!==JSON.stringify(timers)){timers=parsed;rAll();ttsCheck();setOnline(true)}
        }
      }catch(e){setOnline(false)}
      $('exportInfo').querySelector('span').textContent='Last sync: '+new Date().toLocaleTimeString();
      setTimeout(pollData,30000);
    }
    async function pollGuildData(){
      try{
        const r=await fetch('https://firestore.googleapis.com/v1/projects/astra-boss-timer-759e5/databases/(default)/documents/config/discordBot?key=AIzaSyAboQqH7BmtLCO0ciHUvgGIUOU6SMzHnzo');
        if(!r.ok)throw Error(r.status);
        const d=await r.json();
        function parseFsVal(v){
          if(!v)return null;
          if(v.stringValue!=null)return v.stringValue;
          if(v.integerValue!=null)return Number(v.integerValue);
          if(v.doubleValue!=null)return Number(v.doubleValue);
          if(v.booleanValue!=null)return v.booleanValue;
          if(v.nullValue!=null)return null;
          if(v.arrayValue&&v.arrayValue.values)return v.arrayValue.values.map(parseFsVal);
          if(v.mapValue&&v.mapValue.fields){
            const o={};for(const[k,val] of Object.entries(v.mapValue.fields))o[k]=parseFsVal(val);return o;
          }
          return null;
        }
        if(d.fields&&d.fields.guildNames){
          const gn=parseFsVal(d.fields.guildNames);
          if(gn&&typeof gn==='object')guildNames=gn;
        }
        if(d.fields&&d.fields.rotation){
          const rot=parseFsVal(d.fields.rotation);
          if(rot&&typeof rot==='object')rotation=rot;
        }
      }catch(e){}
      setTimeout(pollGuildData,60000);
    }

    function syncVoices(){
      if(!window.speechSynthesis)return;
      const v=window.speechSynthesis.getVoices();
      if(!v.length)return;
      ttsVoices=v;
    }
    if(window.speechSynthesis){window.speechSynthesis.getVoices();window.speechSynthesis.addEventListener('voiceschanged',()=>syncVoices());setTimeout(()=>syncVoices(),500)}

    function checkForUpdate(){
      try{
        fetch('version.json?_='+Date.now(),{cache:'no-store'})
          .then(r=>{if(!r.ok)throw Error(r.status);return r.json()})
          .then(d=>{
            const v=d&&d.v;
            if(!v)return;
            const prev=lsGet('astraver');
            if(prev&&prev!==v){
              lsSet('astraver',v);
              try{localStorage.removeItem(LS_PKEY);localStorage.removeItem(PRICE_MEMORY_KEY)}catch(e){}
              location.reload();
            }else if(!prev){
              lsSet('astraver',v);
            }
          })
          .catch(()=>{});
      }catch(e){}
    }

    function softTick(){
      const n=now();
      expireSchedSpawn();
      visualRefresh();
      document.querySelectorAll('#upcomingList .boss-card[data-t],#upcomingTmrw .boss-card[data-t]').forEach(card=>{
        const tm=+card.dataset.t;
        if(!tm)return;
        const rem=tm-n;
        const cls='boss-card '+statusClassFor(rem);
        if(card.className!==cls)card.className=cls;
        const val=card.querySelector('.boss-card-time-value');
        const text=rem<=0?t('spawned'):fmtT(tm);
        if(val&&val.textContent!==text)val.textContent=text;
      });
      document.querySelectorAll('#ivGrid .interval-row[data-t]').forEach(row=>{
        const tm=+row.dataset.t;
        const time=row.querySelector('.interval-row-time');
        if(!tm||!time)return;
        const al=tm>n;
        time.textContent=al?fmtShort(tm-n):'--';
        time.className='interval-row-time '+(al?'live':'na');
      });
      rRelicSoft();
    }

    /* ---- Chinese (zh) language pack (added for the ASTRA member embed) ---- */
    LOCS.zh={Venatus:"被污染的河流",Viorent:"吉尔溪流",Ego:"夺回的集结地",Clemantis:"白魔女的摇篮",Livera:"黑风暴半岛",Araneo:"提里奥萨地下墓地 1层",Undomiel:"实验体研究所",Saphirus:"月光的束缚",Neutro:"爱憎战场",LadyDalia:"血色之影",GeneralAquleus:"提里奥萨地下墓地 2层",Thymele:"暴走的刻印",Amentis:"石灰岩海角",BaronBraudmore:"蔷薇藤桥",Milavy:"提里奥萨地下墓地 3层",Wannitas:"陷阱沼泽",Metus:"追随者的原野",Duplican:"睁眼人偶的王座",Shuliar:"猎犬的假面舞会",Ringor:"火炬大道",Roderick:"加尔巴纳地下水道 1层",Gareth:"死者之地 第1区",Titore:"死者之地 第2区",Larba:"加尔巴纳夺回地",Catena:"死者之地 第3区",Auraq:"加尔巴纳地下水道 2层",Secreta:"卡利昂之墓",Ordo:"继承者的乐园",Asta:"黄金血平原",Supore:"黄金血平原",Chaiflock:"卡利昂之墓",Benji:"复仇之巢",Libitina:"永恒臣服礼拜堂",Rakajeth:"赛克瑞塔的惩罚",Icaruthia:"王族之谷",Motti:"伊芙琳的外庭",Camalia:"受控研究所",Nevaeh:"赛琳的中庭",Tumier:"加尔巴纳地下水道 3层",Lucus:"寂静的冶炼所"};
    LANG.zh={brand:'ASTRA',dash:'仪表盘',bsTab:'首领',live:'在线',offline:'离线',nextSpawn:'下次刷新',upcoming:'即将到来',today:'今天',tomorrow:'明天',noSpawns:'无刷新',schedTag:'时间表',schedTitle:'时间表',ivTag:'间隔',ivTitle:'间隔',every:'每',lv:'等级',spawned:'已刷新',now:'现在',updated:'已更新',ago:'前',tracker:'追踪',hiddenClass:'隐藏职业',history:'活动',killed:'已击杀',missed:'已错过',days:['日','一','二','三','四','五','六'],timeRemaining:'剩余时间',relic:'遗物',relicLevels:'遗物等级',current:'当前',goal:'目标',totalTP:'所需时空碎片总数',rareDism:'稀有分解（每个 84 TP）',epicDism:'史诗分解（每个 450 TP）',marketPrices:'实时市场价格',origin:'起源',refresh:'刷新',bestPerTP:'最佳 $/TP',buyQty:(n,t)=>'购买 '+t+' ['+fmtNum(n)+']',mktLoading:'正在获取市场价格...',mktErr:'离线 — 显示缓存价格',mktEmpty:'在上方设置遗物目标以查看市场价格',mktNoL:'起源市场无宝箱挂单',priceLabel:'价格',recoTitle:'推荐购买',gPieces:'时空碎片',gUp:'总等级',gCp:'战斗力',cpRef:'CP 参考',chestMarket:'时空碎片市场',per1k:'/1千',chests:'宝箱',chest:'宝箱',setGoal:'设置等级以计算',piecesNeeded:'所需碎片',cpTotal:'CP 合计',bestTag:'最佳 / 1千',viewBest:'查看最佳',att:'攻击',def:'防御',res:'资源',pve:'PvE',pvp:'PvP',oth:'其他',snipe:'抄底',best:'最佳',memDeal:'记忆特价',cpUnit:'每',nm:['贝纳图斯','比欧兰特','艾果','克莱曼蒂斯','黎维菈','爱拉诺','温多米尔','塞费洛丝','奈特洛','达利亚女士','将军雅奎勒司','希梅','亚曼蒂斯','男爵布劳德莫尔','弥拉威','汪尼塔偲','美图思','杜普利坎','修莱儿','林格','洛德利','卡雷司','帝朵','拉娃','卡戴纳','奥拉克','赛克瑞塔','欧多','阿斯达','苏波尔','夏普洛','斑吉','利毕提娜','拉卡爵司','伊卡露西雅','莫蒂','卡玛莉雅','涅巴','图米尔','鲁库斯'],ttsIn:(n,m)=>`${n} 将在 ${m} 分钟后刷新。`,ttsSpawned:n=>`${n} 已刷新。`,ttsWbIn:(m)=>`世界首领将在 ${m} 分钟后刷新。`,ttsWbSpawned:`世界首领已刷新。`,age:(m)=>{if(m<1)return '刚刚';if(m<60)return m+'分钟前';const h=Math.floor(m/60);return h<24?h+'小时前':Math.floor(h/24)+'天前'},relicNames:['毁灭之源','结界守护','生命结晶','魔力风暴'],mktInsight:'成本与效率',mktCostCp:'每 1 CP',mktBestTier:'最佳购买档位',mktBestTip:'每 1,000 个碎片最便宜。',mktCalc:'计算方法',mktCalcPieces:'所需碎片 = 等级成本之和',mktCalcCp:'获得 CP = 里程碑 + 基础属性',mktCalcCost:'成本 = 碎片 ÷ 宝箱数量 × 价格',mktTable:'遗物效率',mktHRelic:'遗物',mktHLevel:'等级',mktHCp:'CP',mktHCost:'成本',mktHCpCur:'每 CP',mktSavings:'节省',mktSavingsMsg:'购买最便宜的档位可节省',mktAlreadyBest:'您已在购买性价比最高的宝箱',mktEffic:'每货币获得最多 CP',mktFromTo:'至',mktPerChunk:'每 1,000',mktExpand:'展开详情',mktCollapse:'收起'};
    FLAGS.zh='CN';
    LOC.zh='zh-CN';
    UNITS.zh={d:'天',h:'小时',m:'分',s:'秒'};
    LANG.en.milestones='Milestones';LANG.ja.milestones='マイルストーン';LANG.ko.milestones='마일스톤';LANG.zh.milestones='里程碑';
    HT.zh={};(function(){const add=(en,zh)=>{HT.zh[en]=zh};
      add("Sword Master","剑术大师");
      add("Destroyer","破坏者");
      add("Frost Knight","霜之骑士");
      add("Ancient Protector","古代守护者");
      add("Immortal Knight","不朽骑士");
      add("Trinity","三位一体");
      add("Harbinger of Storms","风暴先驱");
      add("Goddess of Blessings","祝福女神");
      add("Exalted Will","崇高意志");
      add("Land Crush","大地粉碎");
      add("Frost Curse","霜之诅咒");
      add("Immortality","不朽");
      add("Everlasting Flow","永恒之流");
      add("Raging Storm","狂怒风暴");
      add("Hands of the Goddess","女神之手");
      add("Basic Attacks have a 25% chance of dealing Extra Combined Damage.","普通攻击有 25% 几率造成额外合计伤害。");
      add("Jumps to a target within a 7m radius and deals Combined Damage around the target and inflicts Knockdown for 2 sec with a +60% chance. (Up to 10 targets) Gains Damage Immunity for 2 sec.","跃向 7m 半径内的目标，对目标周围造成合计伤害，并有 +60% 几率使其击倒 2 秒。（最多 10 个目标）获得 2 秒伤害免疫。");
      add("Deals Combined Damage to the target and inflicts Frozen for 4 sec with a +60% chance. When Frozen ends, reduces Movement Speed for 10 sec. Reduces Movement Speed around the target for 10 sec. (Up to 5 targets)","对目标造成合计伤害，并有 +60% 几率使其冻结 4 秒。冻结结束时，降低移动速度 10 秒。降低目标周围移动速度 10 秒。（最多 5 个目标）");
      add("Landing a Basic Attack has a 100% chance of increasing All Damage and Damage to Monster. Stacks up to 20 times.","普通攻击命中时有 100% 几率提升所有伤害和对怪物伤害。最多叠加 20 次。");
      add("When the caster's HP is at 10% or below, becomes Immortal and immune to all Damage, Status Effects, and Debuffs for 5 sec. When Immortal ends, recovers HP equal to 30% of Max HP. [Recovery cannot exceed Max 15,000.]","当施法者 HP 低于 10% 时，进入不朽状态，5 秒内免疫所有伤害、状态效果和减益。不朽结束时，恢复相当于最大 HP 30% 的 HP。[恢复量不能超过最大 15,000。]");
      add("Basic Attacks have a 100% chance to grant an Effect to the caster for a short duration. Effects are applied in the order of Attack Speed, Defense Penetration, and Critical Hit, circulating every 25 stacks.","普通攻击有 100% 几率为施法者赋予短时间效果。效果按攻击速度、防御穿透、暴击的顺序应用，每 25 层循环一次。");
      add("Summons a Storm Area to pull targets toward the caster with a +60% chance and significantly reduces their Movement Speed. Storm Area deals fixed damage 8 times and deals a powerful Combined Damage 3 sec later. (Up to 10 targets) While Storm Area is summoned, the caster becomes immune to all Status Effects.","召唤风暴区域，以 +60% 几率将目标拉向施法者并大幅降低其移动速度。风暴区域造成 8 次固定伤害，并在 3 秒后造成强力合计伤害。（最多 10 个目标）风暴区域存在期间，施法者免疫所有状态效果。");
      add("Increases Attack Power, Movement Speed, and Status Effects Resistance of the caster and allies within a 15m radius for 10 sec. (Up to 10 targets)","10 秒内提升施法者及 15m 半径内友方的攻击力、移动速度和状态效果抗性。（最多 10 个目标）");
      add("Deathblow","致命一击");
      add("Time Haste","时间加速");
      add("Secreta's Talent","赛克瑞塔的才能");
      add("Parry","招架");
      add("Wild Dance","狂乱之舞");
      add("Deliberate Attack","谨慎攻击");
      add("Hellfire Weapon","地狱火武器");
      add("Honed Weaponry","精炼武器");
      add("Blink","闪现");
      add("Power of Darkness","黑暗之力");
      add("Polish Weapon","武器打磨");
      add("Gamble","赌博");
      add("Frost Weapon","霜之武器");
      add("Earth Shock","大地冲击");
      add("Cutting Strike","斩击");
      add("Life Tap","生命转换");
      add("Leech","吸血");
      add("Anatomy","解剖学");
      add("Create Zone","生成领域");
      add("Overcome","克服");
      add("Fire Spirit","火之精灵");
      add("Spell Infusion","咒文注入");
      add("Wanderer","流浪者");
      add("Chase","追击");
      add("Defensive Stance","防御姿态");
      add("Supersense","超感官");
      add("Install Bomb","安装炸弹");
      add("Magic Ignition","魔力点火");
      add("Magic Circulation","魔力循环");
      add("Weapon of Destruction","毁灭武器");
      add("Weak Spot Analysis","弱点分析");
      add("Mirror Shield","镜之盾");
      add("War Cry","战吼");
      add("Ice Spirit","冰之精灵");
      add("Spread Venom","猛毒散布");
      add("Magnetic Field","磁场");
      add("Lightning Spirit","雷之精灵");
      add("Continuous Curing","持续治疗");
      add("Combat","战斗");
      add("Recon","侦察");
      add("Defense","防御");
      add("Spell","咒文");
      add("Enhance","强化");
      add("Support","支援");
      add("Vitality","生命力");
      add("Trick","诡计");
      add("Melee Defense Penetration +50","近战防御穿透 +50");
      add("Movement Speed +8%","移动速度 +8%");
      add("Attack Speed +8%","攻击速度 +8%");
      add("Attack Power +70","攻击力 +70");
      add("Melee Attack +50 / All Damage +3.5%","近战攻击 +50 / 所有伤害 +3.5%");
      add("When hit, increases the caster's All Damage and decreases Damage Received for 6 sec.","被击中时，提升施法者的所有伤害并降低受到的伤害，持续 6 秒。");
      add("Defense Power +100","防御力 +100");
      add("Deals 30% + 30% bonus Combined Damage within a 7m radius around the caster, and inflicts Stun for 2 sec with a +60% chance. Afterwards, deals 30% + 30% bonus Combined Damage 3 times, deals Combined Critical Hit Damage on the final attack. (Up to 10 targets)","对施法者周围 7m 半径造成 30% + 30% 额外合计伤害，并有 +60% 几率使其眩晕 2 秒。随后造成 3 次 30% + 30% 额外合计伤害，最后一次攻击造成合计暴击伤害。（最多 10 个目标）");
      add("Defense Penetration +50","防御穿透 +50");
      add("Skill Damage +7% / Cooldown Decrease +10%","技能伤害 +7% / 冷却缩减 +10%");
      add("Landing Attack increases the caster's Attack Power and Defense Power for 60 sec.","攻击命中时，提升施法者的攻击力和防御力，持续 60 秒。");
      add("Attack Power +100 / Defense Power +100","攻击力 +100 / 防御力 +100");
      add("Causes an Earthquake around the caster for 10 sec. Deals 75% extra Physical Damage to targets within range every 2 sec, and inflicts Stun for 1 sec with a +50% chance. (Up to 20 targets)","在施法者周围引发 10 秒地震。每 2 秒对范围内目标造成 75% 额外物理伤害，并有 +50% 几率使其眩晕 1 秒。（最多 20 个目标）");
      add("Endurance Ignore +50","耐久无视 +50");
      add("Critical Hit +100 / Critical Hit Damage +7%","暴击 +100 / 暴击伤害 +7%");
      add("When HP is at 50% or below, increases the caster's Endurance.","当 HP 低于 50% 时，提升施法者的耐久。");
      add("Causes an Ice Storm around the target for 10 sec. Deals 50% extra Magic Damage to targets within range every second, and reduces Movement Speed for 3 sec. (Up to 20 targets)","在目标周围引发 10 秒冰风暴。每秒对范围内目标造成 50% 额外魔法伤害，并降低移动速度 3 秒。（最多 20 个目标）");
      add("Defense Power +50","防御力 +50");
      add("Defense Power +75 / Attack Power +100","防御力 +75 / 攻击力 +100");
      add("Increases the caster's Attack Power and Defense Power per 4% of HP lost. (Lost HP increases up to 80%.)","每损失 4% HP，提升施法者的攻击力和防御力。（损失 HP 最多累计至 80%。）");
      add("Defense Power +100 / Endurance +30","防御力 +100 / 耐久 +30");
      add("Increases All Damage of the caster and allies within a 10m radius for 30 sec, and reduces Damage Received. (Up to 10 targets)","30 秒内提升施法者及 10m 半径内友方的所有伤害，并降低受到的伤害。（最多 10 个目标）");
      add("Attack Power +75 / Damage Received Decrease +3.5%","攻击力 +75 / 受到伤害降低 +3.5%");
      add("Landing Attack increases the caster's Accuracy and Critical Hit for 30 sec.","攻击命中时，提升施法者的命中和暴击，持续 30 秒。");
      add("Grants Petrify to the caster for 5 sec.","使施法者石化 5 秒。");
      add("Attack Power +75 / All Damage +3.5%","攻击力 +75 / 所有伤害 +3.5%");
      add("Landing Attack Skill increases the caster's Attack Power, Accuracy, and Critical Hit for 60 sec.","攻击技能命中时，提升施法者的攻击力、命中和暴击，持续 60 秒。");
      add("Attack Power +100 / Attack Speed +5%","攻击力 +100 / 攻击速度 +5%");
      add("Deals Combined Damage around the caster and inflicts Stun for 5 sec with a +60% chance. (Up to 10 targets)","对施法者周围造成合计伤害，并有 +60% 几率使其眩晕 5 秒。（最多 10 个目标）");
      add("Skill Damage +7%","技能伤害 +7%");
      add("Skill Damage +15%","技能伤害 +15%");
      add("Landing Attack Skill increases the caster's Movement Speed for 30 sec.","攻击技能命中时，提升施法者的移动速度，持续 30 秒。");
      add("Increases the caster's Max HP, Defense Power, Attack Speed, and Movement Speed for 30 sec. [Recovery cannot exceed Max 20,000.]","30 秒内提升施法者的最大 HP、防御力、攻击速度和移动速度。[恢复量不能超过最大 20,000。]");
      add("Endurance +50","耐久 +50");
      add("Defense Power +75 / Cooldown Decrease +10%","防御力 +75 / 冷却缩减 +10%");
      add("Landing Attack Skill increases the caster's Attack Power, Defense Power, and Attack Speed for 60 sec.","攻击技能命中时，提升施法者的攻击力、防御力和攻击速度，持续 60 秒。");
      add("Recovers HP of the caster and party members within a 10m radius equal to 10% of Max HP every 2 sec for 10 sec. Reduces Healing Received for 60 sec. [Recovery cannot exceed Max 5,000 per instance.]","10 秒内每 2 秒恢复施法者及 10m 半径内队员相当于最大 HP 10% 的 HP。60 秒内降低受到的治疗效果。[每次恢复量不能超过最大 5,000。]");
    })();

    // ---- ASTRA host bridge (same-origin iframe) ----
    // The host app drives navigation, language and reads the alarm/online state.
    window.ASTRA_TOOLS={
      onStatusChange:null,
      onAlarmChange:null,
      apiBase:'',
      setPage:function(p){var b=document.querySelector('.nav-btn[data-page="'+p+'"]');if(b)b.click();},
      getPage:function(){var b=document.querySelector('.nav-btn.active');return b?b.dataset.page:'tracker';},
      setLang:function(l){if(['en','ja','ko','zh'].indexOf(l)<0)l='en';if(l===lang)return;lang=l;lsSet('astralang',l);applyLang();loadPrices(true);rAll();},
      getLang:function(){return lang},
      toggleAlarm:toggleAlarm,
      alarmOn:function(){return alarmOn}
    };

    try{
      lang=lsGet('astralang')||'en';
      alarmOn=lsGet('astraalarm')==='1';
      applyLang();
      updateAlarmBtn();
      listenData();
      pollData();
      pollGuildData();
      rAll();
      readCache();
      rRelic();
      loadPrices();
      setInterval(ttsCheck,3000);
      setInterval(softTick,30000);
      const onNavResize=debounceNav(positionNavIndicator,150);
      window.addEventListener('resize',onNavResize);
      document.addEventListener('visibilitychange',()=>{
        document.querySelector('.bg-canvas').classList.toggle('bg-still',document.hidden);
      });
      requestAnimationFrame(()=>requestAnimationFrame(positionNavIndicator));
      if(document.fonts&&document.fonts.ready){document.fonts.ready.then(()=>requestAnimationFrame(positionNavIndicator));}
    }catch(e){$('exportInfo').querySelector('span').textContent='Init error: '+e.message}
    
  