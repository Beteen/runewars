/* NPC definitions: villagers with dialog trees, and resource/combat nodes.
 * Dialog trees are arrays of nodes keyed by id; each node has text and options. */
window.RW = window.RW || {};

RW.NPCS = {
  moisture_farmer: {
    id: 'moisture_farmer',
    name: 'Owen the Moisture Farmer',
    color: '#c8a06a',
    examine: 'A weathered farmer tending vaporators.',
    dialog: 'start',
    tree: {
      start: {
        text: "Welcome to the Dune Sea, traveler. These vaporators won't fix themselves.",
        options: [
          { label: 'Who are you?', goto: 'who' },
          { label: 'Got any work?', goto: 'work' },
          { label: 'Goodbye.', goto: null },
        ],
      },
      who: {
        text: "Name's Owen. I pull water from the air out here. Honest living.",
        options: [{ label: 'Got any work?', goto: 'work' }, { label: 'Goodbye.', goto: null }],
      },
      work: {
        text: "Bash some womp rats with that training saber and you'll get the hang of combat. Try the rats to the east.",
        options: [{ label: "I'll do that.", goto: null }],
        reward: { credits: 25 },
      },
    },
  },
  rodian_slicer: {
    id: 'rodian_slicer',
    name: 'Greeza the Slicer',
    color: '#5fae5f',
    examine: 'A Rodian with twitchy fingers and a datapad.',
    dialog: 'start',
    tree: {
      start: {
        text: "*chirps* You want into that terminal? Slicing takes practice. Find a droid and crack it open.",
        options: [
          { label: 'Teach me slicing.', goto: 'teach' },
          { label: 'Goodbye.', goto: null },
        ],
      },
      teach: {
        text: "Slice the protocol droids near the cantina. Each crack grants Slicing experience. Off you go.",
        options: [{ label: 'Thanks.', goto: null }],
      },
    },
  },
};

/* Interactable nodes placed in the world (combat dummies, resource nodes). */
RW.NODES = {
  womp_rat: {
    id: 'womp_rat', name: 'Womp Rat', color: '#8a6a4a', kind: 'combat',
    hp: 12, skill: 'lightsaber', xp: 18, respawn: 5000,
    drops: [{ item: 'scrap_metal', qty: 1, chance: 0.5 }, { item: 'credits', qty: 8, chance: 1 }],
  },
  protocol_droid: {
    id: 'protocol_droid', name: 'Protocol Droid', color: '#d4af37', kind: 'slice',
    skill: 'slicing', xp: 22, respawn: 6000,
    drops: [{ item: 'power_cell', qty: 1, chance: 0.7 }, { item: 'credits', qty: 12, chance: 1 }],
  },
  kyber_node: {
    id: 'kyber_node', name: 'Kyber Vein', color: '#9fe8ff', kind: 'mine',
    skill: 'mining', xp: 15, respawn: 8000,
    drops: [{ item: 'kyber_shard', qty: 1, chance: 1 }],
  },
};
