/* Player model: skills, xp, inventory, equipment, position.
 * Pure data + logic, no rendering. Emits events via a tiny callback bus. */
window.RW = window.RW || {};

RW.Player = class {
  constructor(saved) {
    this.listeners = {};
    this.tileX = RW.SPAWNS.player.x;
    this.tileY = RW.SPAWNS.player.y;
    this.inventory = []; // [{ id, qty }]
    this.equipment = {}; // slot -> id
    this.skills = {};
    RW.SKILLS.forEach((s) => { this.skills[s.id] = { xp: 0 }; });
    // Everyone starts with 10 Hitpoints (1154 xp), RS07 style.
    this.skills.hitpoints.xp = RW.XP_FOR_LEVEL[10];

    if (saved) this.restore(saved);
    else this.giveStarterKit();

    this.hp = this.maxHp();
  }

  giveStarterKit() {
    this.addItem('training_saber', 1);
    this.addItem('credits', 50);
    this.addItem('ration_pack', 3);
    this.equip('training_saber');
  }

  /* --- events --- */
  on(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach((fn) => fn(data)); }

  /* --- skills --- */
  level(skillId) { return RW.levelForXp(this.skills[skillId].xp); }

  combatLevel() {
    const l = (s) => this.level(s);
    const base = 0.25 * (l('lightsaber') + l('blaster') + l('hitpoints') + l('force'));
    return Math.floor(base + 1.3 * Math.max(l('lightsaber'), l('blaster')) / 2);
  }

  totalLevel() {
    return RW.SKILLS.reduce((sum, s) => sum + this.level(s.id), 0);
  }

  addXp(skillId, amount) {
    const sk = this.skills[skillId];
    if (!sk) return;
    const before = RW.levelForXp(sk.xp);
    sk.xp += amount;
    const after = RW.levelForXp(sk.xp);
    this.emit('xp', { skillId, amount, level: after });
    if (after > before) {
      this.emit('levelup', { skillId, level: after });
      if (skillId === 'hitpoints') this.hp = this.maxHp();
    }
  }

  maxHp() { return this.level('hitpoints'); }

  damage(n) {
    this.hp = Math.max(0, this.hp - n);
    this.emit('hp', { hp: this.hp, max: this.maxHp() });
    return this.hp <= 0;
  }

  heal(n) {
    this.hp = Math.min(this.maxHp(), this.hp + n);
    this.emit('hp', { hp: this.hp, max: this.maxHp() });
  }

  /* --- inventory --- */
  addItem(id, qty = 1) {
    const def = RW.itemDef(id);
    if (def.stackable) {
      const slot = this.inventory.find((s) => s.id === id);
      if (slot) { slot.qty += qty; this.emit('inventory'); return true; }
    }
    if (this.inventory.length >= 28 && !(def.stackable)) {
      this.emit('message', 'Your inventory is full.');
      return false;
    }
    this.inventory.push({ id, qty: def.stackable ? qty : 1 });
    this.emit('inventory');
    return true;
  }

  removeItem(id, qty = 1) {
    const idx = this.inventory.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    const slot = this.inventory[idx];
    if (RW.itemDef(id).stackable) {
      slot.qty -= qty;
      if (slot.qty <= 0) this.inventory.splice(idx, 1);
    } else {
      this.inventory.splice(idx, 1);
    }
    this.emit('inventory');
    return true;
  }

  countItem(id) {
    return this.inventory.filter((s) => s.id === id).reduce((n, s) => n + s.qty, 0);
  }

  equip(id) {
    const def = RW.itemDef(id);
    if (!def.slot) return;
    this.equipment[def.slot] = id;
    this.emit('equipment');
  }

  /* --- persistence --- */
  toJSON() {
    return {
      tileX: this.tileX, tileY: this.tileY, hp: this.hp,
      inventory: this.inventory, equipment: this.equipment,
      skills: this.skills,
    };
  }

  restore(s) {
    this.tileX = s.tileX ?? this.tileX;
    this.tileY = s.tileY ?? this.tileY;
    this.inventory = s.inventory || [];
    this.equipment = s.equipment || {};
    if (s.skills) this.skills = s.skills;
    this.hp = s.hp ?? this.maxHp();
  }
};
