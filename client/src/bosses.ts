export interface Boss {
  id: string;
  name: string;
  level: number;
  respawn?: number;
  weekly?: boolean;
  cat?: 'field' | 'kransia' | 'corrosion';
}

export const BOSSES: Boss[] = [
  { id: 'Venatus', name: 'Venatus', level: 60, respawn: 36000, cat: 'field' },
  { id: 'Viorent', name: 'Viorent', level: 65, respawn: 36000, cat: 'field' },
  { id: 'Ego', name: 'Ego', level: 70, respawn: 75600, cat: 'field' },
  { id: 'Clemantis', name: 'Clemantis', level: 70, weekly: true, cat: 'field' },
  { id: 'Livera', name: 'Livera', level: 75, respawn: 86400, cat: 'field' },
  { id: 'Araneo', name: 'Araneo', level: 75, respawn: 86400, cat: 'field' },
  { id: 'Undomiel', name: 'Undomiel', level: 80, respawn: 86400, cat: 'field' },
  { id: 'Saphirus', name: 'Saphirus', level: 80, weekly: true, cat: 'field' },
  { id: 'Neutro', name: 'Neutro', level: 80, weekly: true, cat: 'field' },
  { id: 'LadyDalia', name: 'Lady Dalia', level: 85, respawn: 64800, cat: 'field' },
  { id: 'GeneralAquleus', name: 'General Aquleus', level: 85, respawn: 104400, cat: 'field' },
  { id: 'Thymele', name: 'Thymele', level: 85, weekly: true, cat: 'field' },
  { id: 'Amentis', name: 'Amentis', level: 88, respawn: 104400, cat: 'field' },
  { id: 'BaronBraudmore', name: 'Baron Braudmore', level: 88, respawn: 115200, cat: 'field' },
  { id: 'Milavy', name: 'Milavy', level: 90, weekly: true, cat: 'field' },
  { id: 'Wannitas', name: 'Wannitas', level: 93, respawn: 172800, cat: 'field' },
  { id: 'Metus', name: 'Metus', level: 93, respawn: 172800, cat: 'field' },
  { id: 'Duplican', name: 'Duplican', level: 93, respawn: 172800, cat: 'field' },
  { id: 'Shuliar', name: 'Shuliar', level: 95, respawn: 126000, cat: 'field' },
  { id: 'Ringor', name: 'Ringor', level: 95, weekly: true, cat: 'field' },
  { id: 'Roderick', name: 'Roderick', level: 95, weekly: true, cat: 'field' },
  { id: 'Gareth', name: 'Gareth', level: 98, respawn: 115200, cat: 'field' },
  { id: 'Titore', name: 'Titore', level: 98, respawn: 133200, cat: 'field' },
  { id: 'Larba', name: 'Larba', level: 98, respawn: 126000, cat: 'field' },
  { id: 'Catena', name: 'Catena', level: 100, respawn: 126000, cat: 'field' },
  { id: 'Auraq', name: 'Auraq', level: 100, weekly: true, cat: 'field' },
  { id: 'Secreta', name: 'Secreta', level: 100, respawn: 223200, cat: 'field' },
  { id: 'Ordo', name: 'Ordo', level: 100, respawn: 223200, cat: 'field' },
  { id: 'Asta', name: 'Asta', level: 100, respawn: 223200, cat: 'field' },
  { id: 'Supore', name: 'Supore', level: 100, respawn: 223200, cat: 'field' },
  { id: 'Chaiflock', name: 'Chaiflock', level: 120, weekly: true, cat: 'field' },
  { id: 'Benji', name: 'Benji', level: 120, weekly: true, cat: 'field' },
  { id: 'Libitina', name: 'Libitina', level: 130, weekly: true, cat: 'field' },
  { id: 'Rakajeth', name: 'Rakajeth', level: 130, weekly: true, cat: 'field' },
  { id: 'Camalia', name: 'Camalia', level: 135, weekly: true, cat: 'field' },
  { id: 'Tumier', name: 'Tumier', level: 140, weekly: true, cat: 'field' },
  { id: 'Nerucas', name: 'Nerucas', level: 140, weekly: true, cat: 'field' },
  { id: 'Dumenta', name: 'Dumenta', level: 140, weekly: true, cat: 'field' },
  { id: 'Icaruthia', name: 'Icaruthia', level: 135, weekly: true, cat: 'kransia' },
  { id: 'Motti', name: 'Motti', level: 135, weekly: true, cat: 'kransia' },
  { id: 'Nevaeh', name: 'Nevaeh', level: 140, weekly: true, cat: 'kransia' },
  { id: 'Lucus', name: 'Lucus', level: 145, weekly: true, cat: 'kransia' },
  { id: 'Bahel', name: 'Bahel', level: 0, cat: 'corrosion' },
];

export function respawnLabel(boss: Boss): string {
  if (boss.respawn) {
    const hours = Math.round(boss.respawn / 3600);
    return `${hours}h`;
  }
  return 'Weekly';
}