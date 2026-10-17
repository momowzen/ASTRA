import type { Lang, T } from './i18n';


const norm = (s: string): string => s.trim().toUpperCase();

export const TAB_KEYS: Record<string, string> = {
  'BASIC INFORMATION': 'tab.basicInformation',
  EQUIPMENT: 'tab.equipment',
  'BOSS COLLECTION': 'tab.bossCollection',
  'SUCCESSOR COLLECTION': 'tab.successorCollection',
  'EPIC +12 ACCESSORY COLLECTION': 'tab.epicAccessoryCollection',
  'CLOAK COLLECTION': 'tab.cloakCollection',
  'BOSS ATTENDANCE': 'tab.bossAttendance',
  'BOSS CONFIG': 'tab.bossConfig',
  'DISTRIBUTION HISTORY': 'tab.distributionHistory',
  'CP HISTORY': 'tab.cpHistory',
};

export const COL_KEYS: Record<string, string> = {
  NATION: 'col.nation',
  COUNTRY: 'col.nation',
  GUILD: 'col.guild',
  ROLE: 'col.role',
  STATUS: 'col.status',
  NICKNAME: 'col.nickname',
  NOTES: 'col.notes',
  'DATE JOINED': 'col.dateJoined',
  'LEGENDARY ACCE DISTRIBUTION': 'col.legendaryAccDistribution',
  'LEGENDARY ACCESSORY DISTRIBUTION': 'col.legendaryAccDistribution',
  'LEGENDARY CLOAK DISTRIBUTION': 'col.legendaryCloakDistribution',
  '5 PEICES SET ENCHANTMENT +15': 'col.fivePiece15',
  'GOLDBLOOD CLOAK+3': 'col.goldBloodCloak3',
  'GOLDBLOOD CLOAK+5': 'col.goldBloodCloak5',
  'MAIN WEAPON': 'col.mainWeapon',
  'SUB WEAPON': 'col.subWeapon',
  ARMOR: 'col.armor',
  NECKLACE: 'col.necklace',
  RING: 'col.ring',
  EARRING: 'col.earring',
  EARRINGS: 'col.earrings',
  BRACELET: 'col.bracelet',
  BELT: 'col.belt',
  'LEGENDARY CLOAK': 'col.legendaryCloak',
  POINTS: 'col.points',
  REWARD: 'col.reward',
  BOSS: 'col.boss',
  NECK: 'col.neck',
  VALOR: 'col.valor',
  ACCURACY: 'col.accuracy',
  PENETRATION: 'col.penetration',
  CRITICAL: 'col.critical',
  'ENCHANTMENT +10': 'col.enchantment10',
  'ONE OF EACH TYPE ENCHANTMENT +0': 'col.oneOfEach0',
  '5 PIECES SET ENCHATMENT +0': 'col.fivePiece0',
  'ONE OF EACH TYPE ENCHANTMENT +12': 'col.oneOfEach12',
  'GOLD BLOOD CLOAK+3': 'col.goldBloodCloak3',
  'GOLD BLOOD CLOAK+5': 'col.goldBloodCloak5',
  'DARK ORH CLOAK+3': 'col.darkOrhCloak3',
  'DARK ORH CLOAK+5': 'col.darkOrhCloak5',
  "SUCCESSOR'S CLOAK+3": 'col.successorCloak3',
  "SUCCESSOR'S CLOAK+5": 'col.successorCloak5',
};

export const BOSS_KEYS: Record<string, string> = {
  VENATUS: 'boss.venatus',
  VIORENT: 'boss.viorent',
  EGO: 'boss.ego',
  CLEMANTIS: 'boss.clemantis',
  LIVERA: 'boss.livera',
  ARANEO: 'boss.araneo',
  UNDOMIEL: 'boss.undomiel',
  SAPHIRUS: 'boss.saphirus',
  NEUTRO: 'boss.neutro',
  'LADY DALIA': 'boss.ladyDalia',
  'GENERAL AQULEUS': 'boss.generalAquleus',
  AQULEUS: 'boss.aquleus',
  THYMELE: 'boss.thymele',
  AMENTIS: 'boss.amentis',
  'BARON BRAUDMORE': 'boss.baronBraudmore',
  BRAUDMORE: 'boss.braudmore',
  MILAVY: 'boss.milavy',
  WANNITAS: 'boss.wannitas',
  METUS: 'boss.metus',
  DUPLICAN: 'boss.duplican',
  SHULIAR: 'boss.shuliar',
  RINGOR: 'boss.ringor',
  RODERICK: 'boss.roderick',
  GARETH: 'boss.gareth',
  TITORE: 'boss.titore',
  LARBA: 'boss.larba',
  CATENA: 'boss.catena',
  AURAQ: 'boss.auraq',
  SECRETA: 'boss.secreta',
  ORDO: 'boss.ordo',
  ASTA: 'boss.asta',
  SUPORE: 'boss.supore',
  CHAIFLOCK: 'boss.chaiflock',
  BENJI: 'boss.benji',
  LIBITINA: 'boss.libitina',
  RAKAJETH: 'boss.rakajeth',
  ICARUTHIA: 'boss.icaruthia',
  MOTTI: 'boss.motti',
  CAMALIA: 'boss.camalia',
  NEVAEH: 'boss.nevaeh',
  TUMIER: 'boss.tumier',
  LUCUS: 'boss.lucus',
  NERUCAS: 'boss.nerucas',
  'AZZAM HISSAN': 'boss.azzamHissan',
  SERAD: 'boss.serad',
  SERBIS: 'boss.serbis',
  'GRAY DAWN': 'boss.grayDawn',
  'BLACK THORN': 'boss.blackThorn',
  'EL SERA': 'boss.elSera',
  KRANSIA: 'boss.kransia',
};

export function tabLabel(raw: string, t: T, lang: Lang, fallback?: (s: string) => string): string {
  if (lang !== 'en') {
    const key = TAB_KEYS[norm(raw)];
    if (key) return t(key);
  }
  return fallback ? fallback(raw) : raw;
}

export function colLabel(raw: string, t: T, lang: Lang): string {
  if (lang !== 'en') {
    const key = COL_KEYS[norm(raw)] ?? BOSS_KEYS[norm(raw)];
    if (key) return t(key);
  }
  return raw;
}

export function bossLabel(raw: string, t: T, lang: Lang): string {
  if (lang !== 'en') {
    const key = BOSS_KEYS[norm(raw)];
    if (key) return t(key);
  }
  return raw;
}

export const VALUE_KEYS: Record<string, string> = {
  KOREA: 'opt.country.korea',
  PHILIPPINES: 'opt.country.philippines',
  CHINA: 'opt.country.china',
  THAILAND: 'opt.country.thailand',
  JAPAN: 'opt.country.japan',
  COLOMBIAN: 'opt.country.colombian',
  'GUILD LEADER': 'opt.role.guildLeader',
  'CO-LEADER': 'opt.role.coLeader',
  OFFICER: 'opt.role.officer',
  'GUILD SUPPORT': 'opt.role.guildSupport',
  SENIOR: 'opt.role.senior',
  CORE: 'opt.role.core',
  MEMBER: 'opt.role.member',
  ACTIVE: 'opt.status.active',
  BUSY: 'opt.status.busy',
  RESERVE: 'opt.status.reserve',
  PROBATION: 'opt.status.probation',
  'PENDING TRANSFER': 'opt.status.pendingTransfer',
  INACTIVE: 'opt.status.inactive',
  KNUCKLES: 'opt.weapon.knuckles',
  'SWORD AND SHIELD': 'opt.weapon.swordShield',
  'BATTLE STAFF': 'opt.weapon.battleStaff',
  'BATTLE SHIELD': 'opt.weapon.battleShield',
  GREATSWORD: 'opt.weapon.greatsword',
  SCYTHE: 'opt.weapon.scythe',
  STAFF: 'opt.weapon.staff',
  'DUAL DAGGERS': 'opt.weapon.dualDaggers',
  BOW: 'opt.weapon.bow',
  CROSSBOW: 'opt.weapon.crossbow',
  CLOTH: 'opt.armor.cloth',
  LEATHER: 'opt.armor.leather',
  PLATE: 'opt.armor.plate',
  RARE: 'opt.rarity.rare',
  EPIC: 'opt.rarity.epic',
  LEGEND: 'opt.rarity.legend',
  MYTHIC: 'opt.rarity.mythic',
};

export function valueLabel(raw: string, t: T, lang: Lang): string {
  if (lang !== 'en') {
    const key = VALUE_KEYS[norm(raw)];
    if (key) return t(key);
  }
  return raw;
}
