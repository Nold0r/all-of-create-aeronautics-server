const REPLACE_MAP = {
  'cataclysm:mech_eye': 'catafalk:ancient_factory_eye',
  'cataclysm:flame_eye': 'catafalk:burning_arena_eye',
  'cataclysm:desert_eye': 'catafalk:cursed_pyramid_eye',
  'cataclysm:cursed_eye': 'catafalk:frosted_prison_eye',
  'cataclysm:monstrous_eye': 'catafalk:soul_black_smith_eye',
  'cataclysm:abyss_eye': 'catafalk:sunken_city_eye'
};

let tick = 0;

PlayerEvents.tick(e => {
  if (e.level.isClientSide()) return;

  tick++;
  if (tick < 20) return;
  tick = 0;

  let player = e.player;

  let inv = player.getInventory();
  let count = inv.getContainerSize();
  //player.tell(Text.gold('[DEBUG] Слотов: ' + count));

  let changed = false;

  for (let i = 0; i < count; i++) {
    let stack = inv.getItem(i);
    if (stack.isEmpty()) continue;

    let id = '' + stack.getId();
    //player.tell(Text.lightPurple('[DEBUG] Слот ' + i + ': ' + id + ' x' + stack.getCount()));

    let target = REPLACE_MAP[id];
    if (!target) continue;

    let amount = stack.getCount();
    //player.tell(Text.aqua('[DEBUG] ЗАМЕНЯЮ: ' + id + ' → ' + target));

    inv.setItem(i, Item.of(target, amount));
    changed = true;
  }

  if (changed) {
    
    player.inventoryMenu.broadcastChanges();
    
  }
});
