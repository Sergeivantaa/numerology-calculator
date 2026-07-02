window.Bloxyard = window.Bloxyard || {};

const GAMES = [
  {
    id: 'retroyard',
    name: 'Retro Yard',
    desc: 'Classic obby & collect-a-thon. Grab coins, gems and keys!',
    badge: 'RETRO',
    grad: 'linear-gradient(135deg,#3ca03c,#1c5c1c)',
    playing: 312,
    available: true,
    create: window.Bloxyard.Games.retroyard,
  },
  {
    id: 'skyrace',
    name: 'Sky Race',
    desc: 'Jump across the sky platforms to the finish flag without falling!',
    badge: 'SKY RACE',
    grad: 'linear-gradient(135deg,#2e6fdb,#12315c)',
    playing: 187,
    available: true,
    create: window.Bloxyard.Games.skyrace,
  },
  {
    id: 'zombierush',
    name: 'Zombie Rush',
    desc: 'Coming soon',
    badge: 'SOON',
    grad: 'linear-gradient(135deg,#a33232,#4a1414)',
    playing: 0,
    available: false,
    create: null,
  },
];

window.Bloxyard.GAMES = GAMES;
