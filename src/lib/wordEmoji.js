// Emoji / symbol clues for concrete vocabulary words.
// Only words that map cleanly to a single emoji are included — Picture Match
// filters the pool to these, so abstract words are skipped automatically.

const WORD_EMOJI = {
  // food & drink
  apple: "🍎", bread: "🍞", cheese: "🧀", milk: "🥛", water: "💧", coffee: "☕",
  tea: "🍵", rice: "🍚", fish: "🐟", egg: "🥚", meat: "🥩", chicken: "🐔",
  cake: "🎂", banana: "🍌", orange: "🍊", lemon: "🍋", grape: "🍇", tomato: "🍅",
  potato: "🥔", onion: "🧅", carrot: "🥕", salad: "🥗", soup: "🍲", pizza: "🍕",
  burger: "🍔", sandwich: "🥪", icecream: "🍦", sugar: "🧂", honey: "🍯", salt: "🧂",
  // body
  head: "🗣️", hair: "💇", eye: "👁️", ear: "👂", nose: "👃", mouth: "👄",
  tooth: "🦷", hand: "✋", foot: "🦶", leg: "🦵", arm: "💪", heart: "❤️",
  brain: "🧠", bone: "🦴", finger: "👆", neck: "🦴", skin: "🧑",
  // animals
  dog: "🐶", cat: "🐱", horse: "🐴", cow: "🐮", pig: "🐷", sheep: "🐑",
  goat: "🐐", lion: "🦁", tiger: "🐯", bear: "🐻", monkey: "🐵", rabbit: "🐰",
  bird: "🐦", duck: "🦆", chicken2: "🐔", snake: "🐍", elephant: "🐘", mouse: "🐭",
  bee: "🐝", spider: "🕷️", frog: "🐸", wolf: "🐺", deer: "🦌",
  // nature & weather
  sun: "☀️", moon: "🌙", star: "⭐", cloud: "☁️", rain: "🌧️", snow: "❄️",
  wind: "🌬️", storm: "⛈️", fire: "🔥", tree: "🌳", flower: "🌸", grass: "🌱",
  leaf: "🍃", mountain: "⛰️", river: "🏞️", sea: "🌊", beach: "🏖️", rock: "🪨",
  forest: "🌲", desert: "🏜️", island: "🏝️", sky: "🌌", earth: "🌍", rainbow: "🌈",
  // places & buildings
  house: "🏠", door: "🚪", window: "🪟", room: "🚪", roof: "🏠", school: "🏫",
  hospital: "🏥", bank: "🏦", hotel: "🏨", church: "⛪", shop: "🛒", market: "🏪",
  city: "🏙️", village: "🏘️", road: "🛣️", bridge: "🌉", airport: "✈️", station: "🚉",
  park: "🏞️", garden: "🪴", farm: "🚜", factory: "🏭", castle: "🏰", tower: "🗼",
  // transport
  car: "🚗", bus: "🚌", train: "🚆", plane: "✈️", ship: "🚢", boat: "⛵",
  bike: "🚲", truck: "🚚", taxi: "🚕", subway: "🚇", helicopter: "🚁", rocket: "🚀",
  // objects & household
  book: "📚", pen: "🖊️", pencil: "✏️", phone: "📱", clock: "🕐", watch: "⌚",
  key: "🔑", lock: "🔒", lamp: "💡", chair: "🪑", table: "餐桌", bed: "🛏️",
  sofa: "🛋️", cup: "☕", glass: "🥃", plate: "🍽️", bowl: "🥣", spoon: "🥄",
  knife: "🔪", fork: "🍴", bottle: "🍼", bag: "👜", box: "📦", gift: "🎁",
  mirror: "🪞", scissors: "✂️", brush: "🪮", umbrella: "☂️", camera: "📷", radio: "📻",
  tv: "📺", computer: "💻", letter: "✉️", map: "🗺️", candle: "🕯️", battery: "🔋",
  // clothing
  shirt: "👕", dress: "👗", shoe: "👟", hat: "👒", cap: "🧢", coat: "🧥",
  sock: "🧦", glove: "🧤", tie: "👔", skirt: "🩱", boots: "🥾", belt: "👘",
  // people & family
  man: "👨", woman: "👩", boy: "👦", girl: "👧", baby: "👶", king: "👑",
  queen: "👸", doctor: "👨‍⚕️", teacher: "👩‍🏫", student: "🧑‍🎓", soldier: "💂", chef: "👨‍🍳",
  // time & abstract-but-iconic
  day: "📅", night: "🌃", year: "🗓️", month: "📆", week: "🗓️", hour: "⏰",
  summer: "☀️", winter: "⛄", spring: "🌷", autumn: "🍂",
  // symbols / misc concrete
  money: "💰", coin: "🪙", diamond: "💎", ring: "💍", crown: "👑", flag: "🚩",
  ball: "⚽", balloon: "🎈", music: "🎵", camera2: "📸", game: "🎮", dice: "🎲",
  umbrella2: "🌂", glasses: "👓", backpack: "🎒", wheelchair: "🦽", compass: "🧭",
};

const ALIASES = {
  mum: "mother", mom: "mother", dad: "father", pa: "father",
  kid: "child", kids: "child", puppy: "dog", kitten: "cat",
  automobile: "car", auto: "car", lorry: "truck", van: "truck",
  aeroplane: "plane", airplane: "plane", bicycle: "bike", cycle: "bike",
  cellphone: "phone", mobile: "phone", television: "tv",
  notebook: "book", novel: "book", mug: "cup", pillow: "bed",
  trousers: "pants", pants: "skirt", jeans: "skirt",
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

// pick up to `n` words that have an emoji, returns [{word, emoji, meaning}]
export function pickEmojiPairs(words, n) {
  const usable = (words || [])
    .map((w) => {
      const emoji = getEmoji(w.english);
      const meaning = (w.uzbek || w.russian || w.description || w.english || "").trim();
      return emoji && meaning ? { word: w.english, emoji, meaning } : null;
    })
    .filter(Boolean);
  // dedupe by word
  const seen = new Set();
  const unique = usable.filter((p) => (seen.has(p.word) ? false : (seen.add(p.word), true)));
  // shuffle
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  return unique.slice(0, n);
};