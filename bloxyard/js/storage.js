window.Bloxyard = window.Bloxyard || {};

const PREFIX = 'bloxyard.';

function loadProfile(){
  const { DEFAULT_COLORS, DEFAULT_ACCESSORIES } = window.Bloxyard.AvatarBuilder;
  const profile = {
    nickname: 'Player',
    charColors: { ...DEFAULT_COLORS },
    accessories: { ...DEFAULT_ACCESSORIES },
    inventory: [],
    ownedItems: [],
    coins: 0,
  };
  try { const n = localStorage.getItem(PREFIX+'nickname'); if (n) profile.nickname = n; } catch(e){}
  try { const c = localStorage.getItem(PREFIX+'charColors'); if (c) profile.charColors = JSON.parse(c); } catch(e){}
  // Merge onto the defaults rather than replacing outright, so saves made
  // before a new accessory type existed still get that field's default.
  try { const a = localStorage.getItem(PREFIX+'accessories'); if (a) profile.accessories = { ...profile.accessories, ...JSON.parse(a) }; } catch(e){}
  try { const i = localStorage.getItem(PREFIX+'inventory'); if (i) profile.inventory = JSON.parse(i); } catch(e){}
  try { const o = localStorage.getItem(PREFIX+'ownedItems'); if (o) profile.ownedItems = JSON.parse(o); } catch(e){}
  try {
    const co = localStorage.getItem(PREFIX+'coins');
    if (co !== null){
      profile.coins = parseInt(co, 10) || 0;
    } else if (profile.inventory.length){
      // One-time migration: earlier saves tracked "coins" as the total
      // item count instead of a real spendable wallet.
      profile.coins = totalCurrency(profile.inventory);
      saveCoins(profile.coins);
    }
  } catch(e){}
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

function saveOwnedItems(items){ try{ localStorage.setItem(PREFIX+'ownedItems', JSON.stringify(items)); }catch(e){} }
function saveCoins(n){ try{ localStorage.setItem(PREFIX+'coins', String(n)); }catch(e){} }

window.Bloxyard.Storage = {
  loadProfile, saveNickname, saveCharColors, saveAccessories, saveInventory, totalCurrency,
  getLastSeenUpdate, setLastSeenUpdate, loadBuild, saveBuild, saveOwnedItems, saveCoins,
};
