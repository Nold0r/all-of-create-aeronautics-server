// Progression recipe guards for NeoForge 1.21.1 / KubeJS 2101.x.
// Keep this in server_scripts. It removes shortcut recipes by output and re-adds only the gated versions.

ServerEvents.recipes(event => {
  const colors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black']

  // Remove known vanilla/mod recipes by ID or ID regex only.
  ;[
    'kubejs:crafting/copper_spool',
    'kubejs:crafting/rotation_speed_controller_induction_upgrade',
    'aeronautics:mechanical_crafting/mounted_potato_cannon',
    'sophisticatedbackpacks:backpack',
    'sophisticatedbackpacks:upgrade_base'
  ].forEach(id => event.remove({ id: id }))

  ;[
    /^create:.*electron_tube.*$/,
    /^create:.*empty_blaze_burner.*$/,
    /^create:.*mechanical_pump.*$/,
    /^create:.*hose_pulley.*$/,
    /^create:.*brass_casing.*$/,
    /^create:.*rotation_speed_controller.*$/,
    /^create_sa:.*heat_engine.*$/,
    /^create_sa:.*hydraulic_engine.*$/,
    /^aeronautics:.*mounted_potato_cannon.*$/,
    /^aeronautics:.*_envelope.*$/,
    /^sophisticatedbackpacks:.*backpack.*$/,
    /^sophisticatedbackpacks:.*upgrade_base.*$/
  ].forEach(id => event.remove({ id: id }))

  event.custom({
    type: 'minecraft:crafting_shaped',
    category: 'misc',
    pattern: [' C ', 'CRC', ' C '],
    key: {
      C: { item: 'create:copper_sheet' },
      R: { item: 'kubejs:resine_sheet' }
    },
    result: { id: 'kubejs:copper_spool', count: 2 }
  }).id('kubejs:progression/copper_spool')

  event.custom({
    type: 'minecraft:crafting_shaped',
    category: 'misc',
    pattern: ['L', 'S', 'N'],
    key: {
      L: { item: 'create:polished_rose_quartz' },
      S: { item: 'kubejs:copper_spool' },
      N: { tag: 'c:plates/iron' }
    },
    result: { id: 'create:electron_tube' }
  }).id('kubejs:progression/electron_tube')

  event.custom({
    type: 'minecraft:crafting_shaped',
    category: 'misc',
    pattern: [' I ', 'IAI', ' B '],
    key: {
      I: { tag: 'c:plates/iron' },
      A: { item: 'create:andesite_casing' },
      B: { item: 'minecraft:netherrack' }
    },
    result: { id: 'create:empty_blaze_burner' }
  }).id('kubejs:progression/empty_blaze_burner')

  event.custom({
    type: 'minecraft:crafting_shaped',
    category: 'misc',
    pattern: [' C ', 'FPF', ' S '],
    key: {
      C: { item: 'create:copper_sheet' },
      F: { item: 'create:fluid_pipe' },
      P: { item: 'kubejs:copper_spool' },
      S: { item: 'create:shaft' }
    },
    result: { id: 'create:mechanical_pump' }
  }).id('kubejs:progression/mechanical_pump')

  event.custom({
    type: 'minecraft:crafting_shaped',
    category: 'misc',
    pattern: ['BHB', ' S ', ' C '],
    key: {
      B: { item: 'create:copper_casing' },
      H: { item: 'create_sa:hydraulic_engine' },
      S: { item: 'kubejs:sealed_mechanism' },
      C: { tag: 'c:plates/copper' }
    },
    result: { id: 'create:hose_pulley' }
  }).id('kubejs:progression/hose_pulley')

  event.custom({
    type: 'create:item_application',
    ingredients: [{ tag: 'c:stripped_logs' }, { tag: 'c:plates/brass' }],
    results: [{ id: 'create:brass_casing' }]
  }).id('kubejs:progression/brass_casing_from_log')

  event.custom({
    type: 'create:item_application',
    ingredients: [{ tag: 'c:stripped_woods' }, { tag: 'c:plates/brass' }],
    results: [{ id: 'create:brass_casing' }]
  }).id('kubejs:progression/brass_casing_from_wood')

  event.custom({
    type: 'create:mechanical_crafting',
    accept_mirrored: true,
    category: 'misc',
    pattern: [' S ', 'SIS', ' S '],
    key: {
      S: { item: 'create:brass_sheet' },
      I: { item: 'kubejs:induction_mechanism' }
    },
    result: { id: 'create:rotation_speed_controller' }
  }).id('kubejs:progression/rotation_speed_controller')

  event.custom({
    type: 'create:sequenced_assembly',
    ingredient: { item: 'create:andesite_alloy' },
    loops: 3,
    results: [{ id: 'create_sa:heat_engine', chance: 120.0 }, { id: 'create:zinc_nugget', chance: 8.0 }],
    sequence: [
      { type: 'create:deploying', ingredients: [{ item: 'create_sa:incomplete_heat_engine' }, { item: 'kubejs:gear' }], results: [{ id: 'create_sa:incomplete_heat_engine' }] },
      { type: 'create:deploying', ingredients: [{ item: 'create_sa:incomplete_heat_engine' }, { item: 'kubejs:paste' }], results: [{ id: 'create_sa:incomplete_heat_engine' }] },
      { type: 'create:deploying', ingredients: [{ item: 'create_sa:incomplete_heat_engine' }, { item: 'minecraft:blaze_powder' }], results: [{ id: 'create_sa:incomplete_heat_engine' }] },
      { type: 'create:deploying', ingredients: [{ item: 'create_sa:incomplete_heat_engine' }, { item: 'create:large_cogwheel' }], results: [{ id: 'create_sa:incomplete_heat_engine' }] },
      { type: 'create:pressing', ingredients: [{ item: 'create_sa:incomplete_heat_engine' }], results: [{ id: 'create_sa:incomplete_heat_engine' }] }
    ],
    transitional_item: { id: 'create_sa:incomplete_heat_engine' }
  }).id('kubejs:progression/heat_engine')

  event.custom({
    type: 'create:sequenced_assembly',
    ingredient: { item: 'create:copper_sheet' },
    loops: 3,
    results: [{ id: 'create_sa:hydraulic_engine', chance: 120.0 }, { id: 'create:copper_sheet', chance: 8.0 }],
    sequence: [
      { type: 'create:filling', ingredients: [{ item: 'create_sa:incomplete_hydraulic_engine' }, { type: 'fluid_stack', fluid: 'minecraft:water', amount: 250 }], results: [{ id: 'create_sa:incomplete_hydraulic_engine' }] },
      { type: 'create:deploying', ingredients: [{ item: 'create_sa:incomplete_hydraulic_engine' }, { item: 'kubejs:resine_sheet' }], results: [{ id: 'create_sa:incomplete_hydraulic_engine' }] },
      { type: 'create:deploying', ingredients: [{ item: 'create_sa:incomplete_hydraulic_engine' }, { item: 'kubejs:copper_spool' }], results: [{ id: 'create_sa:incomplete_hydraulic_engine' }] },
      { type: 'create:pressing', ingredients: [{ item: 'create_sa:incomplete_hydraulic_engine' }], results: [{ id: 'create_sa:incomplete_hydraulic_engine' }] }
    ],
    transitional_item: { id: 'create_sa:incomplete_hydraulic_engine' }
  }).id('kubejs:progression/hydraulic_engine')

  event.custom({
    type: 'create:sequenced_assembly',
    ingredient: { item: 'kubejs:resine_sheet' },
    loops: 2,
    results: [{ id: 'kubejs:armour_resine', chance: 0.8 }, { id: 'kubejs:resine_sheet', chance: 0.12 }, { id: 'minecraft:string', chance: 0.08 }],
    sequence: [
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:armour_resine' }, { tag: 'c:plates/iron' }], results: [{ id: 'kubejs:armour_resine' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:armour_resine' }, { item: 'minecraft:string' }], results: [{ id: 'kubejs:armour_resine' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:armour_resine' }, { item: 'kubejs:alloy_zink_brass' }], results: [{ id: 'kubejs:armour_resine' }] },
      { type: 'create:pressing', ingredients: [{ item: 'kubejs:armour_resine' }], results: [{ id: 'kubejs:armour_resine' }] }
    ],
    transitional_item: { id: 'kubejs:armour_resine' }
  }).id('kubejs:progression/armour_resine')

  event.custom({
    type: 'create:sequenced_assembly',
    ingredient: { item: 'kubejs:gear' },
    loops: 4,
    results: [{ id: 'kubejs:steel_mechanism', chance: 0.72 }, { id: 'kubejs:gear', chance: 0.1 }, { id: 'createnuclear:steel_nugget', chance: 0.18 }],
    sequence: [
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:steel_mechanism' }, { item: 'createnuclear:steel_ingot' }], results: [{ id: 'kubejs:steel_mechanism' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:steel_mechanism' }, { item: 'kubejs:metal_alloy' }], results: [{ id: 'kubejs:steel_mechanism' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:steel_mechanism' }, { item: 'kubejs:copper_spool' }], results: [{ id: 'kubejs:steel_mechanism' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:steel_mechanism' }, { item: 'create:large_cogwheel' }], results: [{ id: 'kubejs:steel_mechanism' }] },
      { type: 'create:pressing', ingredients: [{ item: 'kubejs:steel_mechanism' }], results: [{ id: 'kubejs:steel_mechanism' }] }
    ],
    transitional_item: { id: 'kubejs:steel_mechanism' }
  }).id('kubejs:progression/steel_mechanism')

  event.custom({
    type: 'create:sequenced_assembly',
    ingredient: { item: 'kubejs:brass_frame' },
    loops: 3,
    results: [{ id: 'kubejs:sync_mechanism', chance: 0.76 }, { id: 'kubejs:brass_frame', chance: 0.08 }, { id: 'minecraft:redstone', chance: 0.16 }],
    sequence: [
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:sync_mechanism' }, { item: 'create:electron_tube' }], results: [{ id: 'kubejs:sync_mechanism' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:sync_mechanism' }, { item: 'kubejs:metal_alloy' }], results: [{ id: 'kubejs:sync_mechanism' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:sync_mechanism' }, { item: 'kubejs:copper_spool' }], results: [{ id: 'kubejs:sync_mechanism' }] },
      { type: 'create:deploying', ingredients: [{ item: 'kubejs:sync_mechanism' }, { tag: 'c:dusts/redstone' }], results: [{ id: 'kubejs:sync_mechanism' }] },
      { type: 'create:pressing', ingredients: [{ item: 'kubejs:sync_mechanism' }], results: [{ id: 'kubejs:sync_mechanism' }] }
    ],
    transitional_item: { id: 'kubejs:sync_mechanism' }
  }).id('kubejs:progression/sync_mechanism')

  colors.forEach(color => {
    event.custom({
      type: 'create:deploying',
      ingredients: [{ item: `minecraft:${color}_wool` }, { item: 'kubejs:resine_sheet' }],
      results: [{ id: `aeronautics:${color}_envelope`, count: 3 }]
    }).id(`kubejs:progression/envelope_${color}`)
  })

  event.custom({
    type: 'create:mechanical_crafting',
    accept_mirrored: true,
    category: 'misc',
    pattern: ['SRB  ', 'KCPPB', 'SRB  '],
    key: {
      C: { item: 'create:cogwheel' },
      K: { item: 'minecraft:dried_kelp_block' },
      P: { item: 'create:fluid_pipe' },
      R: { item: 'minecraft:redstone' },
      S: { item: 'create:copper_sheet' },
      B: { item: 'kubejs:armour_resine' }
    },
    result: { id: 'aeronautics:mounted_potato_cannon', count: 1 }
  }).id('kubejs:progression/mounted_potato_cannon')

  event.custom({
    type: 'sophisticatedbackpacks:basic_backpack',
    category: 'misc',
    pattern: ['RVR', 'LBL', 'RVR'],
    key: {
      R: { item: 'kubejs:resine_sheet' },
      V: { item: 'create_sa:vault_component' },
      L: { tag: 'c:leathers' },
      B: { item: 'kubejs:brass_frame' }
    },
    result: { id: 'sophisticatedbackpacks:backpack', count: 1 }
  }).id('kubejs:progression/backpack')

  event.custom({
    type: 'minecraft:crafting_shaped',
    category: 'misc',
    pattern: ['RVR', 'LCL', 'RVR'],
    key: {
      R: { item: 'kubejs:resine_sheet' },
      V: { item: 'create_sa:vault_component' },
      L: { tag: 'c:leathers' },
      C: { item: 'create:brass_casing' }
    },
    result: { id: 'sophisticatedbackpacks:upgrade_base', count: 1 }
  }).id('kubejs:progression/upgrade_base')
})
