window.Bloxyard = window.Bloxyard || {};

const PREFIX = 'bloxyard.';

function loadProfile(){
  const { DEFAULT_COLORS, DEFAULT_ACCESSORIES } = window.Bloxyard.AvatarBuilder;
  const profile = {
    nickname: 'Player',
    charColors: { ...DEFAULT_COLORS },
    accessories: { ...DEFAULT_ACCESSORIES },
    inventory: [],
  };
  try { const n = localStorage.getItem(PREFIX+'nickname'); if (n) profile.nickname = n; } catch(e){}
  try { const c = localStorage.getItem(PREFIX+'charColors'); if (c) profile.charColors = JSON.parse(c); } catch(e){}
  try { const a = localStorage.getItem(PREFIX+'accessories'); if (a) profile.accessories = JSON.parse(a); } catch(e){}
  try { const i = localStorage.getItem(PREFIX+'inventory'); if (i) profile.inventory = JSON.parse(i); } catch(e){}
  return profile;
}

function saveNickname(n){ try{ localStorage.setItem(PREFIX+'nickname', n); }catch(e){} }
function saveCharColors(c){ try{ localStorage.setItem(PREFIX+'charColors', JSON.stringify(c)); }catch(e){} }
function saveAccessories(a){ try{ localStorage.setItem(PREFIX+'accessories', JSON.stringify(a)); }catch(e){} }
function saveInventory(inv){ try{ localStorage.setItem(PREFIX+'inventory', JSON.stringify(inv)); }catch(e){} }

function totalCurrency(inventory){
  return inventory.reduce((sum, item)=> sum + item.count, 0);
}

function getLastSeenUpdate(){
  try{ return parseInt(localStorage.getItem(PREFIX+'lastSeenUpdate') || '0', 10) || 0; }catch(e){ return 0; }
}
function setLastSeenUpdate(id){ try{ localStorage.setItem(PREFIX+'lastSeenUpdate', String(id)); }catch(e){} }

function loadBuild(){
  try{ const b = localStorage.getItem(PREFIX+'build'); return b ? JSON.parse(b) : []; }catch(e){ return []; }
}
function saveBuild(objects){ try{ localStorage.setItem(PREFIX+'build', JSON.stringify(objects)); }catch(e){} }

window.Bloxyard.Storage = {
  loadProfile, saveNickname, saveCharColors, saveAccessories, saveInventory, totalCurrency,
  getLastSeenUpdate, setLastSeenUpdate, loadBuild, saveBuild,
};
