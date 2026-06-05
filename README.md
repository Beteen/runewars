# RuneWars ⚔️🌌

A 2007-RuneScape-style **Star Wars** RPG that runs entirely in your browser. Single-player, built with [Phaser 3](https://phaser.io/). No build step, no server — just open it and play.

> The Force, but with XP drops.

## Play

Because browsers block `localStorage` and module loading from `file://` in some
cases, serve the folder over HTTP:

```bash
# any one of these from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly — it works in most browsers too.

## Controls

- **Click** an empty tile to walk there (BFS pathfinding around obstacles).
- **Click an NPC** (◆) to talk — dialog trees with rewards.
- **Click a Womp Rat** to fight it with your Lightsaber.
- **Click a Protocol Droid** to Slice it.
- **Click a Kyber Vein** to Mine it.
- **Inventory tab**: click items to eat Ration Packs (heal) or equip gear.

Progress autosaves to `localStorage` every 15 seconds and on exit.

## Skills

Lightsaber · Force · Blaster · Piloting · Slicing · Engineering · Mining · Hitpoints

XP uses the authentic RS07 curve (level 99 = 13,034,431 xp).

## Project layout

```
index.html              # loads Phaser + all modules
src/
  style.css             # RS07-style chrome
  main.js               # Phaser bootstrap
  data/
    skills.js           # skill defs + XP curve
    items.js            # item registry
    npcs.js             # NPC dialog trees + interactable nodes
    world.js            # tile map + entity spawns (Tatooine)
  systems/
    save.js             # localStorage persistence
    player.js           # player model (skills/xp/inventory/hp)
    pathfinding.js      # BFS click-to-move
  ui/
    hud.js              # DOM tab panel + chat log
  scenes/
    BootScene.js
    WorldScene.js       # the playable zone
```

## Roadmap

- [ ] More zones (Coruscant undercity, Hoth) with map transitions
- [ ] Force powers as an ability bar
- [ ] Banking & a Credits shop
- [ ] Quests with multi-step state
- [ ] Equipment stats affecting combat
- [ ] Sprite art to replace placeholder shapes

## License

MIT
