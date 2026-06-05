/* Item registry. Each item has an id, name, an icon color (placeholder art),
 * stackable flag, and optional metadata. */
window.RW = window.RW || {};

RW.ITEMS = {
  credits:        { id: 'credits',        name: 'Credits',            color: '#ffd23f', stackable: true },
  training_saber: { id: 'training_saber', name: 'Training Lightsaber', color: '#3fa9ff', stackable: false, slot: 'weapon', bonus: { lightsaber: 2 } },
  blaster_pistol: { id: 'blaster_pistol', name: 'Blaster Pistol',      color: '#ff5a3c', stackable: false, slot: 'weapon', bonus: { blaster: 3 } },
  kyber_shard:    { id: 'kyber_shard',    name: 'Kyber Shard',         color: '#9fe8ff', stackable: true },
  ration_pack:    { id: 'ration_pack',    name: 'Ration Pack',         color: '#7fbf5f', stackable: true, heal: 8 },
  scrap_metal:    { id: 'scrap_metal',    name: 'Scrap Metal',         color: '#a8a8a8', stackable: true },
  power_cell:     { id: 'power_cell',     name: 'Power Cell',          color: '#3fff8a', stackable: true },
};

RW.itemDef = function (id) {
  return RW.ITEMS[id] || { id: id, name: id, color: '#888', stackable: false };
};
