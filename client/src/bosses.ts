export interface Boss {
  id: string;
  name: string;
  level: number;
  /** Respawn interval in seconds for interval bosses. */
  respawn?: number;
  /** True for bosses that spawn on a weekly schedule instead of an interval. */
  weekly?: boolean;
}

/** Boss catalog mirrored from the ASTRA-Boss-Timer repo (translations.js). */
export const BOSSES: Boss[] = [
  { id: 'Venatus', name: 'Venatus', level: 60, respawn: 36000 },
  { id: 'Viorent', name: 'Viorent', level: 65, respawn: 36000 },
  { id: 'Ego', name: 'Ego', level: 70, respawn: 75600 },
  { id: 'Clemantis', name: 'Clemantis', level: 70, weekly: true },
  { id: 'Livera', name: 'Livera', level: 75, respawn: 86400 },
  { id: 'Araneo', name: 'Araneo', level: 75, respawn: 86400 },
  { id: 'Undomiel', name: 'Undomiel', level: 80, respawn: 86400 },
  { id: 'Saphirus', name: 'Saphirus', level: 80, weekly: true },
  { id: 'Neutro', name: 'Neutro', level: 80, weekly: true },
  { id: 'LadyDalia', name: 'Lady Dalia', level: 85, respawn: 64800 },
  { id: 'GeneralAquleus', name: 'General Aquleus', level: 85, respawn: 104400 },
  { id: 'Thymele', name: 'Thymele', level: 85, weekly: true },
  { id: 'Amentis', name: 'Amentis', level: 88, respawn: 104400 },
  { id: 'BaronBraudmore', name: 'Baron Braudmore', level: 88, respawn: 115200 },
  { id: 'Milavy', name: 'Milavy', level: 90, weekly: true },
  { id: 'Wannitas', name: 'Wannitas', level: 93, respawn: 172800 },
  { id: 'Metus', name: 'Metus', level: 93, respawn: 172800 },
  { id: 'Duplican', name: 'Duplican', level: 93, respawn: 172800 },
  { id: 'Shuliar', name: 'Shuliar', level: 95, respawn: 126000 },
  { id: 'Ringor', name: 'Ringor', level: 95, weekly: true },
  { id: 'Roderick', name: 'Roderick', level: 95, weekly: true },
  { id: 'Gareth', name: 'Gareth', level: 98, respawn: 115200 },
  { id: 'Titore', name: 'Titore', level: 98, respawn: 133200 },
  { id: 'Larba', name: 'Larba', level: 98, respawn: 126000 },
  { id: 'Catena', name: 'Catena', level: 100, respawn: 126000 },
  { id: 'Auraq', name: 'Auraq', level: 100, weekly: true },
  { id: 'Secreta', name: 'Secreta', level: 100, respawn: 223200 },
  { id: 'Ordo', name: 'Ordo', level: 100, respawn: 223200 },
  { id: 'Asta', name: 'Asta', level: 100, respawn: 223200 },
  { id: 'Supore', name: 'Supore', level: 100, respawn: 223200 },
  { id: 'Chaiflock', name: 'Chaiflock', level: 120, weekly: true },
  { id: 'Benji', name: 'Benji', level: 120, weekly: true },
  { id: 'Libitina', name: 'Libitina', level: 130, weekly: true },
  { id: 'Rakajeth', name: 'Rakajeth', level: 130, weekly: true },
  { id: 'Icaruthia', name: 'Icaruthia', level: 135, weekly: true },
  { id: 'Motti', name: 'Motti', level: 135, weekly: true },
  { id: 'Camalia', name: 'Camalia', level: 135, weekly: true },
  { id: 'Nevaeh', name: 'Nevaeh', level: 140, weekly: true },
  { id: 'Tumier', name: 'Tumier', level: 140, weekly: true },
  { id: 'Lucus', name: 'Lucus', level: 145, weekly: true },
];

export function respawnLabel(boss: Boss): string {
  if (boss.respawn) {
    const hours = Math.round(boss.respawn / 3600);
    return `${hours}h`;
  }
  return 'Weekly';
}
