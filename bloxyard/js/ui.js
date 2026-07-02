window.Bloxyard = window.Bloxyard || {};

const PALETTE = {
  head:  [0xf2d74e, 0xf5cfa0, 0xe8a33c, 0xd97a7a, 0xc47ee0, 0x7ecfe0],
  torso: [0x1fa347, 0x2e6fdb, 0xdb3c3c, 0xdba33c, 0x8a3cdb, 0x333333],
  pants: [0x2e4fa3, 0x2c2c34, 0x5c3a1e, 0x3ca03c, 0x7a1f1f, 0x555555],
  hat:   [0x333333, 0xdb3c3c, 0x2e6fdb, 0xffb100, 0xffffff],
};

function toCss(hex){ return '#' + hex.toString(16).padStart(6,'0'); }

function initNav(onNavigate){
  document.querySelectorAll('[data-screen]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.preventDefault();
      onNavigate(el.getAttribute('data-screen'));
    });
  });
}

function showScreen(name){
  document.querySelectorAll('.screen').forEach(el=>{
    el.classList.toggle('active', el.id === 'screen-' + name);
  });
  document.getElementById('topbar').classList.toggle('active', name !== 'login' && name !== 'play');
  document.getElementById('canvasWrap').classList.toggle('active', name === 'play');
  document.querySelectorAll('#mainNav a, .sideNav a').forEach(a=>{
    a.classList.toggle('active', a.getAttribute('data-screen') === name);
  });
}

function renderTopbar(profile){
  document.getElementById('topNick').textContent = profile.nickname;
  document.getElementById('homeNick').textContent = profile.nickname;
  document.getElementById('currencyCount').textContent =
    profile.inventory.reduce((a,b)=>a+b.count,0);
}

function renderMiniFigure(charColors){
  document.getElementById('mfHead').style.background = toCss(charColors.head);
  document.getElementById('mfTorso').style.background = toCss(charColors.torso);
  document.getElementById('mfLegL').style.background = toCss(charColors.pants);
  document.getElementById('mfLegR').style.background = toCss(charColors.pants);
}

function gameCard(game, onPlay){
  const card = document.createElement('div');
  card.className = 'gameCard';
  card.innerHTML =
    "<div class='gameThumb' style='background:" + game.grad + "'>" + game.badge +
    (game.available ? "<div class='playerCount'>" + game.playing + ' playing</div>' : '') +
    '</div>' +
    "<div class='gameInfo'>" +
      "<div class='gameName'>" + game.name + '</div>' +
      "<div class='gameDesc'>" + game.desc + '</div>' +
      "<button class='joinBtn" + (game.available ? '' : ' locked') + "'>" + (game.available ? 'PLAY' : 'SOON') + '</button>' +
    '</div>';
  const btn = card.querySelector('.joinBtn');
  if (game.available) btn.addEventListener('click', ()=> onPlay(game.id));
  return card;
}

function renderGameGrid(containerEl, games, onPlay){
  containerEl.innerHTML = '';
  games.forEach(g => containerEl.appendChild(gameCard(g, onPlay)));
}

function renderInventoryGrid(containerEl, inventory){
  containerEl.innerHTML = '';
  if (!inventory.length){
    const msg = document.createElement('div');
    msg.className = 'emptyMsg';
    msg.textContent = 'No items yet — play a game to find some!';
    containerEl.appendChild(msg);
    return;
  }
  inventory.forEach(item=>{
    const slot = document.createElement('div');
    slot.className = 'invSlot';
    slot.innerHTML = '<div>' + item.name + "</div><div class='cnt'>x" + item.count + '</div>';
    containerEl.appendChild(slot);
  });
}

function renderSwatches(charColors, accessories, onChangeColor, onChangeHatColor){
  document.querySelectorAll('.swatchRow').forEach(row=>{
    const part = row.getAttribute('data-part');
    row.innerHTML = '';
    PALETTE[part].forEach(hex=>{
      const sw = document.createElement('div');
      const current = part === 'hat' ? accessories.hatColor : charColors[part];
      sw.className = 'swatch' + (current === hex ? ' selected' : '');
      sw.style.background = toCss(hex);
      sw.addEventListener('click', ()=>{
        if (part === 'hat') onChangeHatColor(hex);
        else onChangeColor(part, hex);
      });
      row.appendChild(sw);
    });
  });
}

function showPickupToast(text){
  const toast = document.getElementById('pickupToast');
  toast.textContent = text;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>{ toast.style.opacity = '0'; }, 1200);
}

function showCenterToast(text, duration){
  const toast = document.getElementById('centerToast');
  toast.textContent = text;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>{ toast.style.opacity = '0'; }, duration || 2200);
}

function setNickTag(text){ document.getElementById('nickTag').textContent = text; }
function setGameTitleTag(text){ document.getElementById('gameTitleTag').textContent = text; }
function setInvCount(n){ document.getElementById('invCount').textContent = n; }

function toggleInventoryPanel(open, inventory){
  document.getElementById('inventoryPanel').classList.toggle('active', open);
  if (open) renderInventoryGrid(document.getElementById('invGrid'), inventory);
}

function showSavedMsg(){
  const el = document.getElementById('avatarSavedMsg');
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove('show'), 1400);
}

window.Bloxyard.UI = {
  PALETTE, initNav, showScreen, renderTopbar, renderMiniFigure, renderGameGrid,
  renderInventoryGrid, renderSwatches, showPickupToast, showCenterToast,
  setNickTag, setGameTitleTag, setInvCount, toggleInventoryPanel, showSavedMsg,
};
