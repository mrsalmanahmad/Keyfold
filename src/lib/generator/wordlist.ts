/**
 * A starter word list for passphrase generation — 220 common, unambiguous English words,
 * each used once. This is NOT the full 7,776-word EFF diceware list (more entropy per
 * word, better audited); it's a lighter list to ship something real now. At 220 words,
 * each word contributes ~7.78 bits of entropy, so a 6-word passphrase is ~47 bits —
 * reasonable but swap in the full EFF list before relying on this for anything high-value.
 */
export const WORDLIST = [
  'anchor', 'anvil', 'apple', 'arrow', 'autumn', 'badge', 'badger', 'bamboo', 'banjo', 'barrel',
  'basil', 'beacon', 'beaver', 'bramble', 'breeze', 'bridge', 'bronze', 'canyon', 'cedar', 'chalk',
  'chapel', 'cherry', 'chisel', 'cinder', 'clover', 'cobalt', 'comet', 'compass', 'coral', 'cotton',
  'cradle', 'crane', 'crater', 'cricket', 'crimson', 'crystal', 'dahlia', 'dawn', 'delta', 'desert',
  'diamond', 'dolphin', 'dove', 'dragon', 'drift', 'drizzle', 'eagle', 'ember', 'emerald', 'falcon',
  'feather', 'fern', 'fiddle', 'field', 'finch', 'fireside', 'flagstone', 'flame', 'flint', 'forest',
  'forge', 'fossil', 'fountain', 'fox', 'frost', 'garden', 'gazelle', 'ginger', 'glacier', 'glow',
  'granite', 'grove', 'gull', 'harbor', 'harvest', 'hawk', 'hazel', 'heather', 'hemlock', 'heron',
  'hickory', 'hollow', 'honey', 'hornbeam', 'hummingbird', 'hyacinth', 'ivory', 'ivy', 'jade', 'jasmine',
  'juniper', 'kestrel', 'kindle', 'lagoon', 'lantern', 'larch', 'lark', 'lavender', 'leaf', 'lemon',
  'lichen', 'lighthouse', 'lilac', 'linen', 'lotus', 'lumber', 'lupine', 'lynx', 'magnolia', 'mallard',
  'maple', 'marble', 'marigold', 'marsh', 'meadow', 'meridian', 'mesa', 'mint', 'mist', 'moss',
  'mountain', 'mulberry', 'myrtle', 'nectar', 'nest', 'nettle', 'nickel', 'nutmeg', 'oak', 'oasis',
  'obsidian', 'ocean', 'olive', 'onyx', 'opal', 'orbit', 'orchard', 'orchid', 'osprey', 'otter',
  'paddle', 'palm', 'pansy', 'parsley', 'peak', 'pebble', 'pecan', 'pepper', 'periwinkle', 'petal',
  'pheasant', 'pine', 'plaza', 'plum', 'pond', 'poplar', 'poppy', 'prairie', 'primrose', 'quail',
  'quarry', 'quartz', 'quince', 'rabbit', 'raccoon', 'ragweed', 'rain', 'raven', 'reed', 'ridge',
  'river', 'robin', 'rosemary', 'rowan', 'saffron', 'sage', 'sandpiper', 'sapling', 'sapphire', 'savanna',
  'sequoia', 'shale', 'shore', 'sienna', 'silver', 'sparrow', 'spruce', 'squirrel', 'starling', 'stone',
  'stork', 'stream', 'summit', 'sunrise', 'swallow', 'sycamore', 'tangerine', 'thicket', 'thistle', 'thrush',
  'thyme', 'tide', 'timber', 'topaz', 'trellis', 'tulip', 'tundra', 'turquoise', 'valley', 'violet',
  'walnut', 'warbler', 'wheat', 'willow', 'wisteria', 'wolf', 'woodland', 'wren', 'yarrow', 'zephyr',
]

if (WORDLIST.length !== 220) {
  throw new Error(`WORDLIST must have exactly 220 entries, has ${WORDLIST.length}`)
}
if (new Set(WORDLIST).size !== WORDLIST.length) {
  throw new Error('WORDLIST contains duplicate entries')
}
