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

window.Bloxyard.Storage = { loadProfile, saveNickname, saveCharColors, saveAccessories, saveInventory, totalCurrency };
