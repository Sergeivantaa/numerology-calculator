window.Bloxyard = window.Bloxyard || {};

const GAMES = [
  {
    id: 'retroyard',
    name: 'Retro Yard',
    desc: 'Classic obby & collect-a-thon. Grab coins, gems and keys!',
    badge: 'RETRO',
    grad: 'linear-gradient(135deg,#3ca03c,#1c5c1c)',
    available: true,
    create: window.Bloxyard.Games.retroyard,
  },
  {
    id: 'skyrace',
    name: 'Sky Race',
    desc: 'Jump across the sky platforms to the finish flag without falling!',
    badge: 'SKY RACE',
    grad: 'linear-gradient(135deg,#2e6fdb,#12315c)',
    available: true,
    create: window.Bloxyard.Games.skyrace,
  },
  {
    id: 'zombierush',
    name: 'Zombie Rush',
    desc: 'Survive 5 waves of zombies. Left-click to punch, don\'t let them corner you!',
    badge: 'ZOMBIE RUSH',
    grad: 'linear-gradient(135deg,#a33232,#4a1414)',
    available: true,
    create: window.Bloxyard.Games.zombierush,
  },
  {
    id: 'lavarush',
    name: 'Lava Rush',
    desc: 'Climb the spiral tower before the rising lava catches you!',
    badge: 'LAVA RUSH',
    grad: 'linear-gradient(135deg,#ff5a1e,#7a1e08)',
    available: true,
    create: window.Bloxyard.Games.lavarush,
  },
  {
    id: 'maze',
    name: 'Maze Escape',
    desc: 'Find the exit of a randomly generated maze before time runs out.',
    badge: 'MAZE ESCAPE',
    grad: 'linear-gradient(135deg,#6a5acd,#2a1a5e)',
    available: true,
    create: window.Bloxyard.Games.maze,
  },
];

window.Bloxyard.GAMES = GAMES;
