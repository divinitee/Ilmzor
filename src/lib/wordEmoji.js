// Emoji / symbol clues for concrete vocabulary words.
// Only words that map cleanly to ONE unambiguous emoji are included — Picture
// Match filters the pool to these, so abstract words are skipped automatically.
// That is a structural ceiling of the mechanic, not a bug: most B2/C1 vocabulary
// is abstract and will never be drawable. The game populates well for
// concrete-noun-heavy units and gracefully sits out of the rest.
//
// Expanded 2026-09-07 from ~150 to ~470 entries, cross-referenced against the
// live VocabularyWord pool (1,814 unique English entries) plus the concrete
// nouns any A1–B2 course is likely to add. Authored offline — never generated
// at play time. Fixes made in the same pass:
//   table "餐桌" (literal Chinese text, not an emoji) — removed, no table emoji
//   head "🗣️" (speaking head), neck "🦴" (bone), skin "🧑" (a person),
//   belt "👘" (kimono), skirt "🩱" (swimsuit), sugar "🧂" (salt) — removed,
//     no correct emoji exists for any of them
//   room "🚪" / roof "🏠" — removed, duplicated door / house
//   alias pants → skirt — replaced by a real pants "👖" entry
//   aliases mother / father / child pointed at keys that did not exist — added
//   chicken2 / camera2 / umbrella2 — unreachable dead keys (WORD_EMOJI is not
//     exported, so nothing else could read them) — removed
//
// Two words may legitimately share an emoji (sea / ocean, plane / flight).
// pickEmojiPairs() dedupes by emoji so a round never shows two identical
// pictures, which would make the pair ambiguous.

const WORD_EMOJI = {
  // food & drink
  apple: "🍎", bread: "🍞", cheese: "🧀", milk: "🥛", water: "💧", coffee: "☕",
  tea: "🍵", rice: "🍚", fish: "🐟", egg: "🥚", meat: "🥩", chicken: "🐔",
  cake: "🎂", banana: "🍌", orange: "🍊", lemon: "🍋", grape: "🍇", tomato: "🍅",
  potato: "🥔", onion: "🧅", carrot: "🥕", salad: "🥗", soup: "🍲", pizza: "🍕",
  burger: "🍔", sandwich: "🥪", icecream: "🍦", honey: "🍯", salt: "🧂",
  strawberry: "🍓", watermelon: "🍉", pear: "🍐", peach: "🍑", cherry: "🍒",
  pineapple: "🍍", mango: "🥭", kiwi: "🥝", melon: "🍈", coconut: "🥥", avocado: "🥑",
  corn: "🌽", pepper: "🌶️", cucumber: "🥒", broccoli: "🥦", eggplant: "🍆", garlic: "🧄",
  mushroom: "🍄", nut: "🥜", chestnut: "🌰", bean: "🫘", olive: "🫒", butter: "🧈",
  chocolate: "🍫", candy: "🍬", lollipop: "🍭", cookie: "🍪", doughnut: "🍩", pie: "🥧",
  cupcake: "🧁", dessert: "🍰", pancake: "🥞", waffle: "🧇", croissant: "🥐", pretzel: "🥨",
  bagel: "🥯", bacon: "🥓", hotdog: "🌭", taco: "🌮", fries: "🍟", popcorn: "🍿",
  noodles: "🍜", pasta: "🍝", sushi: "🍣", dumpling: "🥟", curry: "🍛", cereal: "🥣",
  lunch: "🍱", dinner: "🍽️", juice: "🧃", beverage: "🥤", beer: "🍺", wine: "🍷",
  cocktail: "🍸", champagne: "🍾", shrimp: "🦐", crab: "🦀", flour: "🌾",
  // body
  hair: "💇", eye: "👁️", ear: "👂", nose: "👃", mouth: "👄", tooth: "🦷",
  hand: "✋", foot: "🦶", leg: "🦵", arm: "💪", heart: "❤️", brain: "🧠",
  bone: "🦴", finger: "👆", fist: "✊", lungs: "🫁", blood: "🩸", skeleton: "💀",
  skull: "💀", muscle: "💪", lip: "👄", sweat: "💦", tongue: "👅",
  // animals
  dog: "🐶", cat: "🐱", horse: "🐴", cow: "🐮", pig: "🐷", sheep: "🐑",
  goat: "🐐", lion: "🦁", tiger: "🐯", bear: "🐻", monkey: "🐵", rabbit: "🐰",
  bird: "🐦", duck: "🦆", snake: "🐍", elephant: "🐘", mouse: "🐭",
  bee: "🐝", spider: "🕷️", frog: "🐸", wolf: "🐺", deer: "🦌",
  camel: "🐫", giraffe: "🦒", zebra: "🦓", kangaroo: "🦘", panda: "🐼", fox: "🦊",
  squirrel: "🐿️", bat: "🦇", ant: "🐜", butterfly: "🦋", snail: "🐌", mosquito: "🦟",
  caterpillar: "🐛", worm: "🪱", insect: "🐞", cattle: "🐄", reptile: "🦎", lizard: "🦎",
  whale: "🐳", dolphin: "🐬", shark: "🦈", octopus: "🐙", turtle: "🐢", penguin: "🐧",
  owl: "🦉", eagle: "🦅", parrot: "🦜", swan: "🦢", peacock: "🦚", crocodile: "🐊",
  dinosaur: "🦖", unicorn: "🦄", dragon: "🐉", hedgehog: "🦔", rooster: "🐓", turkey: "🦃",
  // nature & weather
  sun: "☀️", moon: "🌙", star: "⭐", cloud: "☁️", rain: "🌧️", snow: "❄️",
  wind: "🌬️", storm: "⛈️", fire: "🔥", tree: "🌳", flower: "🌸", grass: "🌱",
  leaf: "🍃", mountain: "⛰️", river: "🏞️", sea: "🌊", beach: "🏖️", rock: "🪨",
  forest: "🌲", desert: "🏜️", island: "🏝️", sky: "🌌", earth: "🌍", rainbow: "🌈",
  ocean: "🌊", lightning: "⚡", fog: "🌫️", typhoon: "🌀", tornado: "🌪️", volcano: "🌋",
  lava: "🌋", dawn: "🌅", eclipse: "🌘", planet: "🪐", asteroid: "☄️", comet: "☄️",
  cactus: "🌵", palm: "🌴", pine: "🌲", rose: "🌹", tulip: "🌷", sunflower: "🌻",
  daisy: "🌼", blossom: "🌸", plant: "🪴", wheat: "🌾", harvest: "🌾", wood: "🪵",
  ice: "🧊", flame: "🔥", thermometer: "🌡️", temperature: "🌡️", globe: "🌍",
  // places & buildings
  house: "🏠", door: "🚪", window: "🪟", school: "🏫", hospital: "🏥", bank: "🏦",
  hotel: "🏨", church: "⛪", shop: "🛒", market: "🏪", city: "🏙️", village: "🏘️",
  road: "🛣️", bridge: "🌉", airport: "✈️", station: "🚉", park: "🏞️", garden: "🪴",
  farm: "🚜", factory: "🏭", castle: "🏰", tower: "🗼", cottage: "🏡", hut: "🛖",
  office: "🏢", museum: "🏛️", mosque: "🕌", temple: "🛕", shrine: "⛩️", stadium: "🏟️",
  university: "🎓", laboratory: "🔬", gym: "🏋️", circus: "🎪", cemetery: "🪦",
  fountain: "⛲", harbor: "⚓", tent: "⛺", rail: "🛤️", traffic: "🚦", bakery: "🥖",
  barber: "💈", pharmacy: "⚕️", theatre: "🎭", cinema: "🎬",
  // transport
  car: "🚗", bus: "🚌", train: "🚆", plane: "✈️", ship: "🚢", boat: "⛵",
  bike: "🚲", truck: "🚚", taxi: "🚕", subway: "🚇", helicopter: "🚁", rocket: "🚀",
  motorcycle: "🏍️", scooter: "🛵", ambulance: "🚑", tram: "🚊", ferry: "⛴️", cruise: "🛳️",
  vehicle: "🚙", flight: "✈️", wheel: "🛞", fuel: "⛽", sled: "🛷", satellite: "🛰️",
  tractor: "🚜", canoe: "🛶", anchor: "⚓",
  // objects & household
  book: "📚", pen: "🖊️", pencil: "✏️", phone: "📱", clock: "🕐", watch: "⌚",
  key: "🔑", lock: "🔒", lamp: "💡", chair: "🪑", bed: "🛏️", sofa: "🛋️",
  cup: "☕", glass: "🥃", plate: "🍽️", bowl: "🥣", spoon: "🥄", knife: "🔪",
  fork: "🍴", bottle: "🍼", bag: "👜", box: "📦", gift: "🎁", mirror: "🪞",
  scissors: "✂️", brush: "🪮", umbrella: "☂️", camera: "📷", radio: "📻", tv: "📺",
  computer: "💻", laptop: "💻", letter: "✉️", envelope: "✉️", map: "🗺️", candle: "🕯️",
  battery: "🔋", bulb: "💡", flashlight: "🔦", broom: "🧹", bucket: "🪣", basket: "🧺",
  laundry: "🧺", soap: "🧼", sponge: "🧽", toothbrush: "🪥", toilet: "🚽", bath: "🛁",
  shower: "🚿", tap: "🚰", razor: "🪒", shampoo: "🧴", kettle: "🫖", teapot: "🫖",
  jar: "🫙", tin: "🥫", drawer: "🗄️", ladder: "🪜", hammer: "🔨", saw: "🪚",
  ax: "🪓", wrench: "🔧", screwdriver: "🪛", screw: "🔩", tool: "🛠️", hook: "🪝",
  rope: "🪢", chain: "⛓️", magnet: "🧲", needle: "🪡", thread: "🧵", wool: "🧶",
  brick: "🧱", barrel: "🛢️", bomb: "💣", sword: "⚔️", shield: "🛡️", armor: "🛡️",
  gun: "🔫", bell: "🔔", hourglass: "⏳", telescope: "🔭", microscope: "🔬",
  keyboard: "⌨️", printer: "🖨️", telephone: "☎️", newspaper: "📰", magazine: "📰",
  ticket: "🎫", paperclip: "📎", ruler: "📏", file: "📁", certificate: "📜",
  receipt: "🧾", bill: "🧾", parcel: "📦", mail: "📬", mailbox: "📮", email: "📧",
  message: "💬", medicine: "💊", pill: "💊", vaccine: "💉", syringe: "💉",
  bandage: "🩹", crutch: "🩼", mask: "😷", stethoscope: "🩺", passport: "🛂",
  purse: "👛", wallet: "👛", coin: "🪙", money: "💰", currency: "💱", diamond: "💎",
  ring: "💍", necklace: "📿", crown: "👑", flag: "🚩", ball: "⚽", balloon: "🎈",
  music: "🎵", song: "🎶", game: "🎮", dice: "🎲", puzzle: "🧩", kite: "🪁",
  glasses: "👓", backpack: "🎒", wheelchair: "🦽", compass: "🧭", plug: "🔌",
  litter: "🗑️", trash: "🗑️", genome: "🧬", germ: "🦠", chemical: "⚗️", poison: "☠️",
  wifi: "📶", internet: "🌐", identitycard: "🪪", mobilephone: "📱", phonecall: "📞",
  videogame: "🎮", fireworks: "🎆", portrait: "🖼️", exhibition: "🖼️", sculpture: "🗿",
  drawing: "🖍️", paint: "🖌️", art: "🎨", film: "🎬", guitar: "🎸", piano: "🎹",
  drum: "🥁", violin: "🎻", trumpet: "🎺", microphone: "🎤", headphones: "🎧",
  medal: "🥇", trophy: "🏆", champion: "🏆", goal: "🥅", examination: "📝",
  election: "🗳️", coffin: "⚰️",
  // clothing
  shirt: "👕", dress: "👗", shoe: "👟", hat: "👒", cap: "🧢", coat: "🧥",
  sock: "🧦", glove: "🧤", tie: "👔", boots: "🥾", pants: "👖", scarf: "🧣",
  shorts: "🩳", swimsuit: "🩱", bikini: "👙", sandal: "👡", heels: "👠", helmet: "⛑️",
  lipstick: "💄", kimono: "👘", baggage: "🧳",
  // people & family
  man: "👨", woman: "👩", boy: "👦", girl: "👧", baby: "👶", child: "🧒",
  mother: "👩", father: "👨", grandmother: "👵", grandfather: "👴", family: "👨‍👩‍👧",
  king: "👑", queen: "👸", prince: "🤴", doctor: "👨‍⚕️", nurse: "🧑‍⚕️", teacher: "👩‍🏫",
  student: "🧑‍🎓", soldier: "💂", chef: "👨‍🍳", police: "👮", firefighter: "🧑‍🚒",
  farmer: "🧑‍🌾", pilot: "🧑‍✈️", captain: "👨‍✈️", astronaut: "🧑‍🚀", mechanic: "🧑‍🔧",
  scientist: "🧑‍🔬", chemist: "🧑‍🔬", judge: "👨‍⚖️", detective: "🕵️", artist: "🧑‍🎨",
  actor: "🎭", singer: "🧑‍🎤", musician: "🎸", athlete: "🏃", hero: "🦸", wizard: "🧙",
  fairy: "🧚", pirate: "🏴‍☠️", ghost: "👻", robot: "🤖", alien: "👽", clown: "🤡",
  zombie: "🧟", vampire: "🧛", mermaid: "🧜", angel: "👼", devil: "😈", bride: "👰",
  // time & seasons
  day: "📅", night: "🌃", year: "🗓️", month: "📆", week: "🗓️", hour: "⏰",
  summer: "☀️", winter: "⛄", spring: "🌷", autumn: "🍂", birthday: "🎂",
  wedding: "💒", party: "🎉", christmas: "🎄", pumpkin: "🎃",
  // sports & hobbies
  football: "⚽", basketball: "🏀", tennis: "🎾", volleyball: "🏐", baseball: "⚾",
  golf: "⛳", boxing: "🥊", swimming: "🏊", skiing: "⛷️", surfing: "🏄", cycling: "🚴",
  chess: "♟️", bowling: "🎳", fishing: "🎣", archery: "🏹", skateboard: "🛹",
  yoga: "🧘", sport: "🏅", flu: "🤧",
};

// Plurals, synonyms, regional spellings and multi-word forms → a WORD_EMOJI key.
const ALIASES = {
  mum: "mother", mom: "mother", dad: "father", pa: "father",
  kid: "child", kids: "child", children: "child", infant: "baby",
  puppy: "dog", kitten: "cat",
  automobile: "car", auto: "car", lorry: "truck", van: "truck",
  aeroplane: "plane", airplane: "plane", bicycle: "bike", cycle: "bike",
  cellphone: "phone", mobile: "phone", "mobile phone": "mobilephone", "phone call": "phonecall",
  television: "tv", notebook: "book", novel: "book", library: "book", mug: "cup",
  trousers: "pants", jeans: "pants", jacket: "coat", sneakers: "shoe", trainers: "shoe",
  couch: "sofa", luggage: "baggage", suitcase: "baggage", gymnasium: "gym",
  physician: "doctor", cook: "chef", baker: "chef", cop: "police", policeman: "police",
  "ice cream": "icecream", "ice-cream": "icecream", donut: "doughnut", spaghetti: "pasta",
  chips: "fries", "hot dog": "hotdog", steak: "meat", peanut: "nut", sweets: "candy",
  "identity card": "identitycard", "video game": "videogame", "board game": "dice",
  axe: "ax", torch: "flashlight", "light bulb": "bulb", lightbulb: "bulb",
  faucet: "tap", loo: "toilet", bin: "trash", rubbish: "trash", garbage: "trash",
  cash: "money", jewel: "diamond", present: "gift", apartment: "house",
  woods: "forest", motorbike: "motorcycle",
  aircraft: "plane", jet: "plane", vessel: "ship", tyre: "wheel", tire: "wheel",
  petrol: "fuel", gasoline: "fuel",
  teeth: "tooth", feet: "foot", mice: "mouse",
  handbag: "bag", spectacles: "glasses", sunglasses: "glasses",
  theater: "theatre", movie: "film", movies: "film", exam: "examination",
};

export function getEmoji(word) {
  if (!word) return null;
  const w = String(word).trim().toLowerCase();
  if (WORD_EMOJI[w]) return WORD_EMOJI[w];
  // strip simple plurals
  const singular = w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
  if (WORD_EMOJI[singular]) return WORD_EMOJI[singular];
  if (ALIASES[w]) return getEmoji(ALIASES[w]);
  if (ALIASES[singular]) return getEmoji(ALIASES[singular]);
  return null;
};

export function isEmojiMapped(word) {
  return !!getEmoji(word);
};

// Every word in `words` that has an emoji, deduped by word AND by emoji so no
// two cards in a round ever show the same picture. Keeps the original row
// (with any _provenance tag from roundComposition) and adds `emoji`.
export function emojiMappable(words) {
  const seenWord = new Set();
  const seenEmoji = new Set();
  const out = [];
  for (const w of words || []) {
    const emoji = getEmoji(w?.english);
    const key = String(w?.english || "").trim().toLowerCase();
    if (!emoji || !key || seenWord.has(key) || seenEmoji.has(emoji)) continue;
    seenWord.add(key); seenEmoji.add(emoji);
    out.push({ ...w, emoji });
  }
  return out;
}

// pick up to `n` words that have an emoji, returns [{word, emoji, meaning}]
export function pickEmojiPairs(words, n) {
  const unique = emojiMappable(words).map((w) => ({
    word: w.english,
    emoji: w.emoji,
    meaning: (w.uzbek || w.russian || w.description || w.english || "").trim(),
  }));
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, n);
};