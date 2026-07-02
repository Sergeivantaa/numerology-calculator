(function(){
  "use strict";

  const { createEngine } = window.Bloxyard.Engine;
  const { createAvatarPreview } = window.Bloxyard.AvatarPreview;
  const { buildCharacter } = window.Bloxyard.AvatarBuilder;
  const { createMotionState, stepMotion, stepWalkAnim } = window.Bloxyard.Physics;
  const storage = window.Bloxyard.Storage;
  const ui = window.Bloxyard.UI;
  const audio = window.Bloxyard.Audio;
  const GAMES = window.Bloxyard.GAMES;
  const UPDATES = window.Bloxyard.UPDATES;

  const profile = storage.loadProfile();

  const engine = createEngine(document.getElementById('canvasWrap'));
  const avatarPreview = createAvatarPreview(document.getElementById('avatarCanvasArea'));

  let currentScreen = 'login';
  let invOpen = false;
  let currentLevel = null;
  let playerChar = null;
  let motionState = null;

  function refreshChrome(){
    ui.renderTopbar(profile);
    ui.renderMiniFigure(profile.charColors);
  }

  function goScreen(name){
    currentScreen = name;
    ui.showScreen(name);
    avatarPreview.setActive(name === 'avatar');
    if (name !== 'play') engine.setActive(false);

    if (name === 'home'){
      ui.renderGameGrid(document.getElementById('homeFeatured'), GAMES, startGame);
      ui.renderInventoryGrid(document.getElementById('homeInventory'), profile.inventory);
      refreshChrome();
    } else if (name === 'games'){
      ui.renderGameGrid(document.getElementById('gamesGrid'), GAMES, startGame);
      refreshChrome();
    } else if (name === 'avatar'){
      avatarPreview.setCharacter(profile.charColors, profile.accessories);
      document.getElementById('avatarNickInput').value = profile.nickname;
      document.getElementById('hatToggle').checked = !!profile.accessories.hat;
      ui.renderSwatches(profile.charColors, profile.accessories, onChangeColor, onChangeHatColor);
      refreshChrome();
    }
  }

  /* ===== login ===== */
  function doLogin(){
    const user = document.getElementById('loginUser').value.trim();
    profile.nickname = (user || 'Player').slice(0, 16);
    storage.saveNickname(profile.nickname);
    audio.sfxClick();
    goScreen('home');
  }
  document.getElementById('loginBtn').addEventListener('click', doLogin);
  ['loginUser','loginPass'].forEach(id=>{
    document.getElementById(id).addEventListener('keydown', (e)=>{ if (e.key === 'Enter') doLogin(); });
  });

  document.getElementById('logoutBtn').addEventListener('click', ()=>{
    if (currentScreen === 'play') engine.setActive(false);
    goScreen('login');
  });

  /* ===== notifications ===== */
  function refreshNotifDot(){
    const lastSeen = storage.getLastSeenUpdate();
    ui.setNotifDotVisible(UPDATES.some(u => u.id > lastSeen));
  }
  document.getElementById('notifBtn').addEventListener('click', (e)=>{
    e.stopPropagation();
    const panel = document.getElementById('notifPanel');
    const opening = !panel.classList.contains('open');
    ui.toggleNotifPanel(opening);
    if (opening){
      ui.renderNotifList(UPDATES);
      storage.setLastSeenUpdate(Math.max(...UPDATES.map(u => u.id)));
      ui.setNotifDotVisible(false);
    }
  });
  document.addEventListener('click', (e)=>{
    if (!document.getElementById('notifWrapEl').contains(e.target)) ui.toggleNotifPanel(false);
  });

  /* ===== avatar customization ===== */
  function onChangeColor(part, hex){
    profile.charColors[part] = hex;
    storage.saveCharColors(profile.charColors);
    avatarPreview.setCharacter(profile.charColors, profile.accessories);
    ui.renderSwatches(profile.charColors, profile.accessories, onChangeColor, onChangeHatColor);
    ui.renderMiniFigure(profile.charColors);
  }
  function onChangeHatColor(hex){
    profile.accessories.hatColor = hex;
    storage.saveAccessories(profile.accessories);
    avatarPreview.setCharacter(profile.charColors, profile.accessories);
    ui.renderSwatches(profile.charColors, profile.accessories, onChangeColor, onChangeHatColor);
  }
  document.getElementById('hatToggle').addEventListener('change', (e)=>{
    profile.accessories.hat = e.target.checked;
    storage.saveAccessories(profile.accessories);
    avatarPreview.setCharacter(profile.charColors, profile.accessories);
  });
  document.getElementById('avatarSaveBtn').addEventListener('click', ()=>{
    const nick = document.getElementById('avatarNickInput').value.trim();
    profile.nickname = (nick || 'Player').slice(0, 16);
    storage.saveNickname(profile.nickname);
    storage.saveCharColors(profile.charColors);
    storage.saveAccessories(profile.accessories);
    refreshChrome();
    ui.showSavedMsg();
    audio.sfxClick();
  });

  /* ===== gameplay ===== */
  function collectItem(name){
    let entry = profile.inventory.find(i => i.name === name);
    if (entry) entry.count++;
    else profile.inventory.push({ name, count: 1 });
    storage.saveInventory(profile.inventory);
    ui.setInvCount(storage.totalCurrency(profile.inventory));
    ui.showPickupToast('+1 ' + name);
    audio.sfxPickup();
    if (invOpen) ui.toggleInventoryPanel(true, profile.inventory);
  }

  function startGame(id){
    const game = GAMES.find(g => g.id === id);
    if (!game || !game.available) return;

    engine.clearScene();
    engine.resetCamera();
    currentLevel = game.create(engine.scene);

    playerChar = buildCharacter(profile.charColors, profile.accessories);
    playerChar.group.position.set(currentLevel.spawn.x, currentLevel.spawn.y, currentLevel.spawn.z);
    engine.scene.add(playerChar.group);

    motionState = createMotionState();
    invOpen = false;
    ui.toggleInventoryPanel(false, profile.inventory);
    ui.setNickTag(profile.nickname);
    ui.setGameTitleTag(game.name);
    ui.setInvCount(storage.totalCurrency(profile.inventory));

    goScreen('play');
    engine.setUpdate(gameLoop);
    engine.setActive(true);
  }

  function exitGame(){
    engine.setActive(false);
    goScreen('games');
  }

  function gameLoop(dt){
    const { moving, running, grounded } = stepMotion(dt, {
      keys: engine.keys,
      invOpen,
      playerGroup: playerChar.group,
      state: motionState,
      cameraYaw: engine.camState.yaw,
      groundHeightAt: currentLevel.groundHeightAt,
      bounds: currentLevel.bounds,
      onJump: audio.sfxJump,
      onLand: audio.sfxLand,
    });

    const footstep = stepWalkAnim(dt, playerChar, motionState, moving, running, grounded);
    if (footstep) audio.sfxFootstep();

    currentLevel.update(dt, playerChar.group, {
      onCollect: collectItem,
      onCheckpoint: ()=>{ audio.sfxCheckpoint(); ui.showCenterToast('Checkpoint!', 900); },
      onFinish: ()=>{
        audio.sfxFinish();
        ui.showCenterToast('Finish! Great job, ' + profile.nickname + '!', 2600);
        collectItem('Sky Trophy');
      },
      onFall: ()=>{ audio.sfxFall(); ui.showCenterToast('Fell off — back to checkpoint', 1000); },
    });

    engine.followCamera(playerChar.group.position);
  }

  window.addEventListener('keydown', (e)=>{
    if (currentScreen !== 'play') return;
    if (e.code === 'Escape') exitGame();
    if (e.code === 'KeyE'){
      invOpen = !invOpen;
      ui.toggleInventoryPanel(invOpen, profile.inventory);
    }
  });

  /* ===== boot ===== */
  ui.initNav(goScreen);
  if (profile.nickname && profile.nickname !== 'Player'){
    document.getElementById('loginUser').value = profile.nickname;
  }
  refreshChrome();
  refreshNotifDot();
  goScreen('login');

})();
