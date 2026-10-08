const MARKET_BASE = 'https://api.nextmarket.games/l9asia';
const FX_URL      = 'https://open.er-api.com/v6/latest/USD';
const TTL         = 60000; // serve cached prices for 60s before refetching
const PAGE_SIZE   = 500;
const MARKET_SIZE = 100;   // max listings returned for the gear market section
const DETAIL_CONCURRENCY = 8; // parallel detail (price-trend) fetches

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};

// Accept-Language headers used to request localized item names from NEXT Market.
const LANGS = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP' };

// NEXT Market background colors per tier (T1..T5) observed from the live API.
const BG_BY_TIER = { T1:'NONE', T2:'GREEN', T3:'BLUE', T4:'MAGENTA', T5:'ORANGE' };

let mem = {}; // keyed by realmCode+'|'+lang -> { ts, json }

// Preset tree used by the gear market. Top-level category ids map to sub-types;
// grade ids are used as a second entry in presetIdList.
const MARKET_PRESETS = {
  '1':    { name: 'Weapon', sub: { 2:'Knuckles', 58:'Gadgets', 60:'Scythe', 3:'Sword and Shield', 4:'Battle Staff', 5:'Battle Shield', 6:'Greatsword', 7:'Staff', 8:'Dual Daggers', 9:'Bow', 10:'Crossbow' } },
  '11':   { name: 'Cloth Armor', sub: { 12:'Helm', 13:'Upper Armor', 14:'Lower Armor', 15:'Gloves', 16:'Boots' } },
  '17':   { name: 'Leather Armor', sub: { 18:'Helm', 19:'Upper Armor', 20:'Lower Armor', 21:'Gloves', 22:'Boots' } },
  '23':   { name: 'Plate Armor', sub: { 24:'Helm', 25:'Upper Armor', 26:'Lower Armor', 27:'Gloves', 28:'Boots' } },
  '53':   { name: 'Cloak', sub: { 54:'Battle Cloak', 55:'Destruction Cloak', 56:'Spirit Cloak', 57:'Valor Cloak' } },
  '29':   { name: 'Accessories', sub: { 30:'Necklace', 31:'Earrings', 32:'Bracelet', 33:'Ring', 34:'Belt' } }
};
const MARKET_GRADES = { '51': 'Legendary', '52': 'Mythic' };
const MARKET_SORTS = { 'PRICE_ASC': 'PRICE_ASC', 'PRICE_DESC': 'PRICE_DESC', 'RECENT': '' };

// Fetch a single page of marketplace listings. The NEXT Market search API is
// a POST to /v1/sale/c2c with a JSON body; listings are returned cheapest-first
// when sort=PRICE_ASC is provided.
async function fetchPage(page, realmCode, acceptLang) {
  const headers = { 'Content-Type': 'application/json' };
  if (acceptLang) headers['Accept-Language'] = acceptLang;
  const r = await fetch(
    `${MARKET_BASE}/v1/sale/c2c?page=${page}&size=${PAGE_SIZE}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ presetIdList: [36], realmCode, sort: 'PRICE_ASC' })
    }
  );
  if (!r.ok) throw new Error('market ' + r.status);
  return r.json();
}

// Scan all pages for the given language, returning { tier: { priceUSDT, name, imageUrl, sku, bg } }.
// Tier detection relies on the English naming ("T1 ... x1,000"), so this is only
// reliable with Accept-Language: en-US.
async function scanPages(realmCode, acceptLang) {
  const page0 = await fetchPage(0, realmCode, acceptLang);
  const total = page0.totalElements || 0;
  const pagesNeeded = Math.min(Math.ceil(total / PAGE_SIZE), 6);
  const pages = [page0];
  for (let p = 1; p < pagesNeeded; p++) {
    try { pages.push(await fetchPage(p, realmCode, acceptLang)); } catch (e) {}
  }

  const cheap = {};
  for (const page of pages) {
    for (const it of (page.content || [])) {
      const item = it.item || {};
      const m = item.name ? String(item.name).match(/T(\d)\b.*?x([\d,]+)/) : null;
      if (!m) continue;
      const tier = 'T' + m[1];
      const price = +(it.cryptoPriceInfo && it.cryptoPriceInfo.price);
      if (!isFinite(price) || price <= 0) continue;
      if (!(tier in cheap) || price < cheap[tier].priceUSDT) {
        cheap[tier] = {
          priceUSDT: price,
          name: item.name,
          imageUrl: item.imageUrl || '',
          sku: item.sku || '',
          bg: BG_BY_TIER[tier] || it.backgroundColor || 'NONE'
        };
      }
    }
  }
  return cheap;
}

// Scan pages in the requested locale and collect every chest listing's SKU ->
// localized name. SKUs are language-independent, so we can overlay the translated
// names onto the English-detected tiers without parsing localized text.
async function scanNames(realmCode, acceptLang) {
  const page0 = await fetchPage(0, realmCode, acceptLang);
  const total = page0.totalElements || 0;
  const pagesNeeded = Math.min(Math.ceil(total / PAGE_SIZE), 6);
  const pages = [page0];
  for (let p = 1; p < pagesNeeded; p++) {
    try { pages.push(await fetchPage(p, realmCode, acceptLang)); } catch (e) {}
  }
  const names = {};
  for (const page of pages) {
    for (const it of (page.content || [])) {
      const item = it.item || {};
      if (item.sku && item.name) names[String(item.sku)] = item.name;
    }
  }
  return names;
}

// Build cheapest-per-tier prices for the requested language. Tier detection runs
// against English names; when a non-English lang is requested, we overlay the
// localized names by SKU (language-independent).
async function fetchCheapest(realmCode, lang) {
  const acceptLang = LANGS[lang] || 'en-US';
  const en = await scanPages(realmCode, 'en-US');
  if (!Object.keys(en).length) throw new Error('no listings');
  if (acceptLang === 'en-US') return en;

  const names = await scanNames(realmCode, acceptLang);
  for (const tier of Object.keys(en)) {
    const localized = names[en[tier].sku];
    if (localized) en[tier].name = localized;
  }
  return en;
}

async function getFx() {
  try {
    const r = await fetch(FX_URL);
    if (!r.ok) throw new Error('fx ' + r.status);
    const d = await r.json();
    const rates = (d && d.rates) || {};
    return { usd: 1, php: +rates.PHP || 0, jpy: +rates.JPY || 0, krw: +rates.KRW || 0 };
  } catch {
    return { usd: 1, php: 0, jpy: 0, krw: 0 };
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

// Search a category+grade on the NEXT Market C2C API. Returns listings with the
// fields the app needs (icon, name, current USDT price, grade color, enhance, preset).
async function fetchMarketList({ category, sub, grade, sort, realmCode }) {
  const presetIdList = [];
  if (category) presetIdList.push(+category);
  if (sub) {
    // Use subtype INSTEAD of top-level category when a subtype is chosen.
    presetIdList.length = 0;
    presetIdList.push(+sub);
  }
  if (grade) presetIdList.push(+grade);
  const sortVal = MARKET_SORTS[sort];
  const body = { presetIdList, realmCode };
  if (sortVal) body.sort = sortVal;
  const r = await fetch(`${MARKET_BASE}/v1/sale/c2c?page=0&size=${MARKET_SIZE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('market ' + r.status);
  const d = await r.json();
  const items = (d.content || []).map(it => {
    const item = it.item || {};
    const enhance = findEnhance(it.abilityOptionList);
    return {
      id: it.id,
      name: item.name || '',
      sku: item.sku || '',
      imageUrl: item.imageUrl || '',
      priceUSDT: +(it.cryptoPriceInfo && it.cryptoPriceInfo.price) || 0,
      backgroundColor: it.backgroundColor || 'NONE',
      enhance,
      displayAmount: it.displayAmount || 1
    };
  });
  return { total: d.totalElements || items.length, items };
}

function findEnhance(abilityOptionList) {
  if (!Array.isArray(abilityOptionList)) return null;
  for (const o of abilityOptionList) {
    if (o && String(o.code || '').includes('Enhance_LVL_NUM')) return +(o.value);
  }
  return null;
}

// Fetch listing details (prices + stats) for a batch of ids.
function normalizeStats(abilityOptionList) {
  if (!Array.isArray(abilityOptionList)) return [];
  return abilityOptionList.map(o => ({
    code: (o && o.code) || '',
    name: (o && o.name) || '',
    value: o && o.value != null ? +o.value : 0,
    unitType: (o && o.unitType) || 'NONE',
    optionType: (o && o.optionType) || '',
    color: (o && o.color) || 'NONE'
  }));
}

async function fetchMarketDetails(ids) {
  const out = {};
  const queue = ids.map(id => () =>
    fetch(`${MARKET_BASE}/v1/sale/c2c/${id}`, { method: 'GET' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        const t = d.cryptoPriceTrend || {};
        const item = d.item || {};
        out[id] = {
          current: t.currentPrice != null ? +t.currentPrice : null,
          todayFloor: t.todayFloorPrice != null ? +t.todayFloorPrice : null,
          prevDayAvg: t.prevDayAvgPrice != null ? +t.prevDayAvgPrice : null,
          prevDayFloor: t.prevDayFloorPrice != null ? +t.prevDayFloorPrice : null,
          name: item.name || '',
          imageUrl: item.imageUrl || '',
          backgroundColor: d.backgroundColor || 'NONE',
          enhance: findEnhance(d.abilityOptionList),
          stats: normalizeStats(d.abilityOptionList)
        };
      })
      .catch(() => {})
  );
  let idx = 0;
  const workers = new Array(Math.min(DETAIL_CONCURRENCY, queue.length))
    .fill(0).map(async () => {
      while (idx < queue.length) {
        const fn = queue[idx++];
        await fn();
      }
    });
  await Promise.all(workers);
  return out;
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1';
    const realmCode = url.searchParams.get('realm') || 'OLD_REALM';
    const lang = url.searchParams.get('lang') || 'en';
    const path = url.searchParams.get('path');

    if (path === 'market') {
      const category = url.searchParams.get('category');
      const sub = url.searchParams.get('sub');
      const grade = url.searchParams.get('grade') || '51';
      const sort = url.searchParams.get('sort') || 'RECENT';
      const list = await fetchMarketList({ category, sub, grade, sort, realmCode });
      const fx = await getFx();
      return json({ success: true, ...list, fx, lastUpdated: new Date().toISOString() });
    }

    if (path === 'marketDetail') {
      const ids = (url.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 30);
      const details = await fetchMarketDetails(ids);
      return json({ success: true, details, lastUpdated: new Date().toISOString() });
    }

    try {
      const now = Date.now();
      const cacheKey = realmCode + '|' + lang;
      const slot = mem[cacheKey];
      if (!force && slot && now - slot.ts < TTL) {
        return json({ ...slot.json, cached: true });
      }

      const cheap = await fetchCheapest(realmCode, lang);
      if (!Object.keys(cheap).length) throw new Error('no listings');

      // Build the prices object in the { tier: { priceUSDT, name, imageUrl } } shape the app expects
      const prices = {};
      for (const tier of ['T1','T2','T3','T4','T5']) {
        if (cheap[tier]) prices[tier] = cheap[tier];
      }
      if (!Object.keys(prices).length) throw new Error('no prices');

      const fx = await getFx();
      if (fx.php <= 0) fx.php = 0;

      const payload = {
        success: true,
        realm: realmCode,
        lang,
        prices,
        fx,
        lastUpdated: new Date(now).toISOString(),
        cached: false
      };
      mem[cacheKey] = { json: payload, ts: now };
      return json(payload);
    } catch (e) {
      const slot = mem[realmCode + '|' + lang];
      if (slot) return json({ ...slot.json, cached: true });
      return json({ success: false, message: 'Failed to load prices: ' + e.message }, 502);
    }
  }
};