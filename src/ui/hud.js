/* DOM-based RS07-style HUD: tab panel (skills / inventory / equipment),
 * chat/message log, and floating hitsplats/xp drops are handled in-scene.
 * The HUD reads from the live Player and re-renders on player events. */
window.RW = window.RW || {};

RW.HUD = class {
  constructor(player) {
    this.player = player;
    this.activeTab = 'skills';
    this.build();
    this.bind();
    this.renderAll();
  }

  build() {
    const shell = document.getElementById('game-shell');
    const panel = document.createElement('div');
    panel.id = 'rw-hud';
    panel.innerHTML = `
      <div id="rw-stats" class="rs-font"></div>
      <div id="rw-tabs">
        <button data-tab="skills" class="rw-tab active">Skills</button>
        <button data-tab="inventory" class="rw-tab">Inventory</button>
        <button data-tab="equipment" class="rw-tab">Worn</button>
      </div>
      <div id="rw-tab-body" class="rs-font"></div>
      <div id="rw-chat" class="rs-font"></div>
    `;
    shell.appendChild(panel);
    this.injectStyles();

    this.statsEl = panel.querySelector('#rw-stats');
    this.bodyEl = panel.querySelector('#rw-tab-body');
    this.chatEl = panel.querySelector('#rw-chat');

    panel.querySelectorAll('.rw-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        panel.querySelectorAll('.rw-tab').forEach((b) => b.classList.toggle('active', b === btn));
        this.renderBody();
      });
    });
  }

  injectStyles() {
    if (document.getElementById('rw-hud-style')) return;
    const css = document.createElement('style');
    css.id = 'rw-hud-style';
    css.textContent = `
      #game-shell { gap: 6px; }
      #rw-hud { width: 230px; height: 480px; display: flex; flex-direction: column;
        background: #3e3529; border: 2px solid #1a140c; border-radius: 4px;
        color: #ffd23f; font-size: 12px; }
      #rw-stats { padding: 6px; line-height: 1.5; border-bottom: 2px solid #1a140c; }
      #rw-tabs { display: flex; }
      .rw-tab { flex: 1; background: #2a2218; color: #c9a86a; border: 1px solid #1a140c;
        padding: 5px 0; cursor: pointer; font-size: 11px; }
      .rw-tab.active { background: #5a4a30; color: #ffea8a; }
      #rw-tab-body { flex: 1; overflow-y: auto; padding: 6px; }
      #rw-chat { height: 110px; overflow-y: auto; padding: 5px; background: #d9c9a8;
        color: #1a140c; border-top: 2px solid #1a140c; font-size: 11px; line-height: 1.4; }
      .rw-skill { display: flex; justify-content: space-between; padding: 2px 4px;
        background: #2a2218; margin: 2px 0; border-radius: 2px; }
      .rw-inv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
      .rw-inv-cell { aspect-ratio: 1; background: #2a2218; border: 1px solid #1a140c;
        border-radius: 3px; position: relative; display: flex; align-items: center;
        justify-content: center; cursor: pointer; }
      .rw-inv-dot { width: 60%; height: 60%; border-radius: 3px; }
      .rw-inv-qty { position: absolute; top: 1px; left: 2px; color: #ffea8a; font-size: 9px; }
      .rw-inv-cell:hover { outline: 1px solid #ffea8a; }
    `;
    document.head.appendChild(css);
  }

  bind() {
    const p = this.player;
    p.on('xp', () => this.renderStats());
    p.on('levelup', (d) => {
      const name = RW.SKILLS.find((s) => s.id === d.skillId).name;
      this.log(`<b>Congratulations! You reached ${name} level ${d.level}.</b>`);
      this.renderStats();
    });
    p.on('hp', () => this.renderStats());
    p.on('inventory', () => { if (this.activeTab === 'inventory') this.renderBody(); });
    p.on('equipment', () => { if (this.activeTab === 'equipment') this.renderBody(); });
    p.on('message', (m) => this.log(m));
  }

  renderAll() { this.renderStats(); this.renderBody(); }

  renderStats() {
    const p = this.player;
    this.statsEl.innerHTML = `
      <div>Combat Lvl: <b>${p.combatLevel()}</b> &nbsp; Total: <b>${p.totalLevel()}</b></div>
      <div style="color:#ff6e8a">HP: ${p.hp}/${p.maxHp()}</div>
      <div style="color:#ffd23f">Credits: ${p.countItem('credits')}</div>
    `;
  }

  renderBody() {
    if (this.activeTab === 'skills') return this.renderSkills();
    if (this.activeTab === 'inventory') return this.renderInventory();
    if (this.activeTab === 'equipment') return this.renderEquipment();
  }

  renderSkills() {
    const p = this.player;
    this.bodyEl.innerHTML = RW.SKILLS.map((s) => {
      const lvl = p.level(s.id);
      const xp = Math.floor(p.skills[s.id].xp);
      return `<div class="rw-skill" title="${s.desc}\n${xp} xp">
        <span style="color:${s.color}">${s.name}</span><span>${lvl}/99</span></div>`;
    }).join('');
  }

  renderInventory() {
    const p = this.player;
    let cells = '';
    for (let i = 0; i < 28; i++) {
      const slot = p.inventory[i];
      if (slot) {
        const def = RW.itemDef(slot.id);
        const qty = def.stackable && slot.qty > 1 ? `<span class="rw-inv-qty">${slot.qty}</span>` : '';
        cells += `<div class="rw-inv-cell" data-idx="${i}" title="${def.name}">
          ${qty}<div class="rw-inv-dot" style="background:${def.color}"></div></div>`;
      } else {
        cells += `<div class="rw-inv-cell"></div>`;
      }
    }
    this.bodyEl.innerHTML = `<div class="rw-inv-grid">${cells}</div>`;
    this.bodyEl.querySelectorAll('.rw-inv-cell[data-idx]').forEach((cell) => {
      cell.addEventListener('click', () => this.useItem(+cell.dataset.idx));
    });
  }

  renderEquipment() {
    const p = this.player;
    const slots = ['weapon', 'armor', 'shield'];
    this.bodyEl.innerHTML = slots.map((slot) => {
      const id = p.equipment[slot];
      const def = id ? RW.itemDef(id) : null;
      return `<div class="rw-skill"><span style="text-transform:capitalize">${slot}</span>
        <span style="color:${def ? def.color : '#777'}">${def ? def.name : '— empty —'}</span></div>`;
    }).join('');
  }

  useItem(idx) {
    const p = this.player;
    const slot = p.inventory[idx];
    if (!slot) return;
    const def = RW.itemDef(slot.id);
    if (def.heal) {
      if (p.hp >= p.maxHp()) { this.log('You are already at full health.'); return; }
      p.heal(def.heal);
      p.removeItem(slot.id, 1);
      this.log(`You consume the ${def.name} and recover ${def.heal} HP.`);
    } else if (def.slot) {
      p.equip(slot.id);
      this.log(`You equip the ${def.name}.`);
    } else {
      this.log(`${def.name}: nothing interesting happens.`);
    }
  }

  log(msg) {
    const line = document.createElement('div');
    line.innerHTML = msg;
    this.chatEl.appendChild(line);
    this.chatEl.scrollTop = this.chatEl.scrollHeight;
    // Trim old lines
    while (this.chatEl.children.length > 60) this.chatEl.removeChild(this.chatEl.firstChild);
  }
};
