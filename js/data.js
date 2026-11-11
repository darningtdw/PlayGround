/* ADA Super League - Basketball
   Static game data: leagues, teams, kits, courts, leaderboard seeds. */

export const GAME_TITLE = 'ADA Super League';
export const ACADEMY_WA = '6281234567890'; // demo number, replace with ADA academy number
export const PLAYER_TEAM = { name: 'ADA Sparks', mascot: '🔥', color: '#FF6B1A', color2: '#FFD166' };

export const LEAGUES = [
  {
    id: 'bronze', name: 'Liga Perunggu', short: 'PERUNGGU', icon: '🥉',
    color: '#C97B3D', color2: '#F3C28B', difficulty: 0.82,
    coinReward: 150, xpReward: 100,
    teams: [
      { id: 'rockets', name: 'Rookie Rockets', mascot: '🚀', color: '#EF5B4C', color2: '#FFD166', rating: 55, taunt: 'Kita baru mulai, tapi kita ngebut!' },
      { id: 'dragons', name: 'Dunk Dragons', mascot: '🐲', color: '#2FBF71', color2: '#FFE066', rating: 58, taunt: 'Naga suka dunk panas!' },
      { id: 'lakers', name: 'Mini Lakers', mascot: '🏀', color: '#7B5CE0', color2: '#FFC93C', rating: 61, taunt: 'Kecil-kecil jago nembak!' }
    ]
  },
  {
    id: 'silver', name: 'Liga Perak', short: 'PERAK', icon: '🥈',
    color: '#9AA7B8', color2: '#E6EDF7', difficulty: 0.9,
    coinReward: 220, xpReward: 150,
    teams: [
      { id: 'tigers', name: 'Turbo Tigers', mascot: '🐯', color: '#FF8A1E', color2: '#14264A', rating: 64, taunt: 'Awas cakar cepat kami!' },
      { id: 'hawks', name: 'Sky Hawks', mascot: '🦅', color: '#3C8DFF', color2: '#EAF4FF', rating: 67, taunt: 'Kami terbang di atas ring!' },
      { id: 'panthers', name: 'Pixel Panthers', mascot: '🐆', color: '#FF5CA8', color2: '#2B1A4A', rating: 70, taunt: 'Gerak kami secepat pixel!' }
    ]
  },
  {
    id: 'gold', name: 'Liga Emas', short: 'EMAS', icon: '🥇',
    color: '#E8B021', color2: '#FFF0B8', difficulty: 0.98,
    coinReward: 300, xpReward: 210,
    teams: [
      { id: 'gorillas', name: 'Golden Gorillas', mascot: '🦍', color: '#D9A514', color2: '#3B2A0A', rating: 73, taunt: 'Kuat, besar, dan siap menang!' },
      { id: 'cobras', name: 'Comet Cobras', mascot: '🐍', color: '#18B5A4', color2: '#0A2B33', rating: 76, taunt: 'Satu lirikan, bola hilang!' },
      { id: 'monkeys', name: 'Mega Monkeys', mascot: '🐵', color: '#B0723A', color2: '#FFE0B2', rating: 78, taunt: 'Lompatan kami setinggi pohon!' }
    ]
  },
  {
    id: 'platinum', name: 'Liga Platinum', short: 'PLATINUM', icon: '💎',
    color: '#5CC8FF', color2: '#DDF6FF', difficulty: 1.07,
    coinReward: 420, xpReward: 290,
    teams: [
      { id: 'ninjas', name: 'Neon Ninjas', mascot: '🥷', color: '#8B5CF6', color2: '#25F4C1', rating: 80, taunt: 'Kami tak terlihat... sampai skor!' },
      { id: 'crocs', name: 'Cosmic Crocs', mascot: '🐊', color: '#16C6D9', color2: '#3A1A66', rating: 82, taunt: 'Gigi kami tajam di paint area!' },
      { id: 'hippos', name: 'Hyper Hippos', mascot: '🦛', color: '#E850A8', color2: '#2A0F3A', rating: 84, taunt: 'Hati-hati, kami menabrak!' }
    ]
  },
  {
    id: 'champion', name: 'ADA Champion League', short: 'CHAMPION', icon: '👑',
    color: '#FF6B1A', color2: '#FFD166', difficulty: 1.18,
    coinReward: 650, xpReward: 420,
    teams: [
      { id: 'kings', name: 'Crown Kings', mascot: '👑', color: '#FFC93C', color2: '#14264A', rating: 86, taunt: 'Takhta ini milik kami!' },
      { id: 'foxes', name: 'Fire Foxes', mascot: '🦊', color: '#FF4D3D', color2: '#FFD166', rating: 89, taunt: 'Cepat, licik, dan panas!' },
      { id: 'bears', name: 'Titan Bears', mascot: '🐻', color: '#4A6FA5', color2: '#EAF4FF', rating: 92, taunt: 'Pegang kuat, kami datang!' }
    ]
  }
];

export const JERSEYS = [
  { id: 'training', name: 'Jersey Latihan', price: 0, primary: '#FF7A1A', secondary: '#14264A', accent: '#FFFFFF', tag: 'GRATIS' },
  { id: 'ada-orange', name: 'ADA Orange Jersey', price: 300, primary: '#FF5200', secondary: '#0B1830', accent: '#FFD166', tag: 'FAVORIT' },
  { id: 'navy-storm', name: 'Navy Storm', price: 450, primary: '#16294A', secondary: '#FF6B1A', accent: '#FFFFFF', tag: 'KEREN' },
  { id: 'mint', name: 'Mint Fresh', price: 550, primary: '#2ED3A6', secondary: '#0E1B33', accent: '#FFF6E8', tag: 'SEGAR' },
  { id: 'gold', name: 'Juara Gold', price: 800, primary: '#FFC93C', secondary: '#14264A', accent: '#FFFFFF', tag: 'LEGENDARIS' }
];

export const COURTS = [
  {
    id: 'school', name: 'School Court', price: 0, tag: 'GRATIS', style: 'school',
    floor: '#D98B4A', floor2: '#C97A3D', line: '#FFF6E8', out: '#63B97E', bg: '#8ED6A5',
    sky: '#BFE9FF', crowd: ['#FFD166', '#FF7A1A', '#4CC9F0', '#FFFFFF']
  },
  {
    id: 'park', name: 'Park Court', price: 350, tag: 'OUTDOOR', style: 'park',
    floor: '#4E7C8A', floor2: '#446F7C', line: '#EAF6FF', out: '#7FA36B', bg: '#A8C9A0',
    sky: '#CFE8FF', crowd: ['#FFD166', '#FF6B1A', '#2ED3A6', '#FFFFFF']
  },
  {
    id: 'ada-arena', name: 'ADA Arena', price: 800, tag: 'PRO', style: 'arena',
    floor: '#C98245', floor2: '#B8743C', line: '#FFF4E0', out: '#0E1B33', bg: '#08111F',
    sky: '#08111F', crowd: ['#FF6B1A', '#FFD166', '#5CC8FF', '#FF5CA8', '#FFFFFF']
  }
];

export const STARTER_PLAYERS = [
  { id: 'bima', name: 'Bima', number: 7, role: 'Point Guard', skin: '#F2B27E', hair: '#2B1B12', hairStyle: 'spiky', stats: { speed: 64, shoot: 58, dribble: 66, defense: 55 } },
  { id: 'raka', name: 'Raka', number: 11, role: 'Shooting Guard', skin: '#C98A5B', hair: '#1B1210', hairStyle: 'fade', stats: { speed: 58, shoot: 68, dribble: 55, defense: 56 } },
  { id: 'naya', name: 'Naya', number: 3, role: 'Small Forward', skin: '#8D5524', hair: '#24140D', hairStyle: 'bun', stats: { speed: 68, shoot: 56, dribble: 64, defense: 52 } },
  { id: 'dito', name: 'Dito', number: 23, role: 'Power Forward', skin: '#E8A76B', hair: '#3A2416', hairStyle: 'curly', stats: { speed: 55, shoot: 60, dribble: 52, defense: 66 } },
  { id: 'sari', name: 'Sari', number: 9, role: 'Center', skin: '#F6C79C', hair: '#4A2C1A', hairStyle: 'pony', stats: { speed: 52, shoot: 62, dribble: 58, defense: 68 } }
];

export const RANKS = [
  'Pemula', 'Bintang Muda', 'Pemain Inti', 'Kapten Tim', 'MVP Sekolah',
  'Rising Star', 'ADA Allstar', 'Legenda Liga'
];

export const SCHOOLS = [
  'SDN 01 Jakarta', 'SD Al-Azhar', 'SDN Sukamaju', 'SD Bina Ceria', 'SDN 05 Bandung',
  'SD Tunas Bangsa', 'SDN Mekar Jaya', 'SD Cendekia', 'SDN 12 Surabaya', 'SD Pelita Hati'
];

export const LEADERBOARD_SEED = [
  { name: 'Arka', age: 12, school: 'SDN 01 Jakarta', xp: 2840 },
  { name: 'Zahra', age: 11, school: 'SD Al-Azhar', xp: 2660 },
  { name: 'Kenzo', age: 13, school: 'SD Bina Ceria', xp: 2510 },
  { name: 'Mika', age: 10, school: 'SDN Sukamaju', xp: 2380 },
  { name: 'Bintang', age: 14, school: 'SDN 05 Bandung', xp: 2210 },
  { name: 'Alesha', age: 9, school: 'SD Tunas Bangsa', xp: 2090 },
  { name: 'Rafi', age: 12, school: 'SD Cendekia', xp: 1975 },
  { name: 'Nayla', age: 11, school: 'SDN 12 Surabaya', xp: 1840 },
  { name: 'Daffa', age: 15, school: 'SD Pelita Hati', xp: 1760 },
  { name: 'Sena', age: 8, school: 'SDN Mekar Jaya', xp: 1690 },
  { name: 'Kirana', age: 13, school: 'SDN 01 Jakarta', xp: 1580 },
  { name: 'Aldo', age: 10, school: 'SD Al-Azhar', xp: 1505 },
  { name: 'Vino', age: 14, school: 'SDN Sukamaju', xp: 1440 },
  { name: 'Chelsea', age: 12, school: 'SD Bina Ceria', xp: 1375 },
  { name: 'Farel', age: 9, school: 'SDN 05 Bandung', xp: 1300 },
  { name: 'Juno', age: 11, school: 'SD Tunas Bangsa', xp: 1240 },
  { name: 'Rania', age: 15, school: 'SD Cendekia', xp: 1180 },
  { name: 'Gilang', age: 13, school: 'SDN 12 Surabaya', xp: 1110 },
  { name: 'Tari', age: 8, school: 'SD Pelita Hati', xp: 1050 },
  { name: 'Omar', age: 10, school: 'SDN Mekar Jaya', xp: 990 },
  { name: 'Lia', age: 12, school: 'SDN 01 Jakarta', xp: 930 },
  { name: 'Yudha', age: 14, school: 'SD Al-Azhar', xp: 870 },
  { name: 'Sasha', age: 9, school: 'SD Bina Ceria', xp: 815 },
  { name: 'Reno', age: 11, school: 'SDN Sukamaju', xp: 760 },
  { name: 'Maya', age: 13, school: 'SD Tunas Bangsa', xp: 700 },
  { name: 'Iqbal', age: 15, school: 'SD Cendekia', xp: 645 },
  { name: 'Dinda', age: 10, school: 'SDN 12 Surabaya', xp: 590 },
  { name: 'Rizky', age: 12, school: 'SD Pelita Hati', xp: 535 },
  { name: 'Alya', age: 8, school: 'SDN Mekar Jaya', xp: 480 },
  { name: 'Bima', age: 14, school: 'SDN 05 Bandung', xp: 430 },
  { name: 'Nina', age: 11, school: 'SD Al-Azhar', xp: 380 },
  { name: 'Tio', age: 13, school: 'SDN 01 Jakarta', xp: 330 }
];

export const CARD_POOL = [
  { type: 'coins', amount: 60, weight: 24, icon: '🪙', name: '60 Koin' },
  { type: 'coins', amount: 120, weight: 18, icon: '💰', name: '120 Koin' },
  { type: 'coins', amount: 250, weight: 8, icon: '💰', name: '250 Koin' },
  { type: 'xp', amount: 80, weight: 14, icon: '⭐', name: '80 XP' },
  { type: 'boost', amount: 3, weight: 18, icon: '💪', name: 'Boost +3 Stat' },
  { type: 'jersey', id: 'ada-orange', weight: 6, icon: '👕', name: 'ADA Orange Jersey' },
  { type: 'jersey', id: 'navy-storm', weight: 4, icon: '👕', name: 'Navy Storm' },
  { type: 'court', id: 'park', weight: 5, icon: '🏟️', name: 'Park Court' },
  { type: 'court', id: 'ada-arena', weight: 3, icon: '🏟️', name: 'ADA Arena' }
];

export const MESSAGES = {
  tip: [
    'Geser joystick untuk jalan. Tekan SHOOT kalau dekat ring!',
    'Swipe ke atas di lapangan untuk nembak. Gampang!',
    'Tekan PASS buat kasih bola ke teman yang kosong.',
    'Tekan STEAL saat lawan pegang bola. Rebut bolanya!',
    'Dekat ring? Tekan SHOOT buat DUNK keren!'
  ],
  make: ['SWISH!', 'MASUK!', 'KEREN!', 'BANG!', 'MANTAP!'],
  miss: ['AH, HAMPIR!', 'BELUM MASUK', 'COBA LAGI!'],
  steal: ['STEAL!', 'BOLA KITA!', 'CURIAN!'],
  block: ['BLOK!', 'DITOLAK!', 'TIDAK BISA!'],
  dunk: ['DUNK!', 'BOOM!', 'GILA KEREN!']
};
