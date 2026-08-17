// Custom Create ingredients for NeoForge 1.21.1 / KubeJS
// Put this folder into the game directory: <instance>/kubejs

StartupEvents.registry('item', event => {
  event.create('couchuk')
    .maxStackSize(64)
    .rarity('common')
    .displayName('Каучуковая масса')

  event.create('resine_sheet')
    .maxStackSize(64)
    .rarity('common')
    .displayName('Резиновая пластина')

  event.create('armour_resine')
    .maxStackSize(64)
    .rarity('uncommon')
    .displayName('Армированная резина')

  event.create('copper_spool')
    .maxStackSize(64)
    .rarity('uncommon')
    .displayName('Медная обмотка')

  event.create('brass_frame')
    .maxStackSize(64)
    .rarity('uncommon')
    .displayName('Латунная рамка')

  event.create('gear')
    .maxStackSize(64)
    .rarity('common')
    .displayName('Зубчатая заготовка')

  event.create('paste')
    .maxStackSize(64)
    .rarity('common')
    .displayName('Смазочная паста')

  event.create('graphite_sheet')
    .maxStackSize(64)
    .rarity('uncommon')
    .displayName('Графитовая пластина')

  event.create('metal_alloy')
    .maxStackSize(64)
    .rarity('uncommon')
    .displayName('Жаростойкий сплав')

  event.create('alloy_zink_brass')
    .maxStackSize(64)
    .rarity('uncommon')
    .displayName('Латунно-цинковый сплав')

  event.create('steel_mechanism')
    .maxStackSize(64)
    .rarity('rare')
    .displayName('Стальной механизм')

  event.create('sealed_mechanism')
    .maxStackSize(64)
    .rarity('rare')
    .displayName('Герметичный механизм')

  event.create('sync_mechanism')
    .maxStackSize(64)
    .rarity('rare')
    .displayName('Механизм синхронизации')

  event.create('quartz_mechanism')
    .maxStackSize(64)
    .rarity('epic')
    .displayName('Кварцевый механизм точности')

  event.create('induction_mechanism')
    .maxStackSize(64)
    .rarity('epic')
    .displayName('Индукционный механизм')

})
