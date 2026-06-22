/* ============================================================
   Millwoods Grocery & Halal Meat — Site Data
   This is mock/demo data for the prototype. Replace with a real
   backend / CMS feed when wiring up live inventory & payments.
   ============================================================ */

/* ---- Store info -------------------------------------------- */
const STORE = {
  name: "Millwoods Grocery & Halal Meat",
  short: "Millwoods Halal",
  tagline: "Your one stop spot for fresh and frozen halal meat, South Asian groceries, and takeout.",
  since: "Serving the south Edmonton community since 2002.",
  phone: "+1 780-485-3504",
  email: "orders@millwoodshalal.ca",
  address: "9232 34 Ave NW, Edmonton, AB T6N 1C9",
  // Social links — replace the # with the store's real profile URLs.
  social: [
    { name: "Facebook",  icon: "📘", url: "#" },
    { name: "Instagram", icon: "📸", url: "#" },
  ],
  // Hours indexed by Date.getDay(): 0 = Sunday … 6 = Saturday
  hours: [
    { day: "Sunday",    open: "11 AM", close: "6 PM" },
    { day: "Monday",    open: "10 AM", close: "6 PM" },
    { day: "Tuesday",   closed: true },
    { day: "Wednesday", open: "10 AM", close: "8 PM" },
    { day: "Thursday",  open: "10 AM", close: "8 PM" },
    { day: "Friday",    open: "10 AM", close: "8 PM" },
    { day: "Saturday",  open: "10 AM", close: "8 PM" },
  ],
};

/* ---- Delivery zone (Canadian postal codes) ----------------
   Customers in Edmonton enter a postal code (e.g. "T6K 2A1"),
   not a US ZIP. We validate against the Mill Woods + south
   Edmonton forward sortation areas (FSAs — first 3 chars).
   ------------------------------------------------------------ */
const DELIVERY = {
  // Real store location — distances are computed from here (haversine).
  store: { postal: "T6N 1C9", address: "9232 34 Ave NW, Edmonton, AB", lat: 53.4654, lng: -113.4667 },
  baseFee: 5,          // flat $5 delivery...
  baseRadiusKm: 5,     // ...within 5 km of the store
  extendedFee: 8,      // 5–10 km
  maxRadiusKm: 10,     // we don't deliver past this
  freeThreshold: 100,  // free delivery over this order value
  // FSAs we deliver to, with centroid coordinates. Distance + ETA are
  // calculated at runtime from the store location (see Store.checkZone).
  zones: {
    "T6N": { area: "Davies / Mill Woods (West)",       lat: 53.4660, lng: -113.4670 },
    "T6K": { area: "Mill Woods (Central / Burnewood)", lat: 53.4625, lng: -113.4470 },
    "T6L": { area: "Mill Woods (Lakewood / Hillview)", lat: 53.4705, lng: -113.4300 },
    "T6H": { area: "Pleasantview / Duggan",            lat: 53.4815, lng: -113.5085 },
    "T6T": { area: "Mill Woods (Tamarack / Maple)",    lat: 53.4550, lng: -113.4050 },
    "T6J": { area: "Riverbend / Westbrook",            lat: 53.4800, lng: -113.5300 },
    "T6X": { area: "Charlesworth / Walker",            lat: 53.4300, lng: -113.4200 },
    "T6V": { area: "Ellerslie / Summerside",           lat: 53.4180, lng: -113.4700 },
    "T6R": { area: "Terwillegar",                      lat: 53.4600, lng: -113.5600 },
    "T6W": { area: "Heritage Valley",                  lat: 53.4050, lng: -113.5200 },
  },
};

/* ---- Halal badge definitions ------------------------------ */
const HALAL = {
  zabiha: {
    code: "zabiha",
    label: "Zabiha · Hand-Slaughtered",
    short: "Zabiha",
    color: "green",
    desc: "Hand-slaughtered by a Muslim with Tasmiyah recited over each animal.",
  },
  machine: {
    code: "machine",
    label: "Halal · Machine-Slaughtered",
    short: "Halal",
    color: "blue",
    desc: "Certified halal, machine-slaughtered under supervision.",
  },
  grocery: {
    code: "grocery",
    label: "Halal-Certified",
    short: "Halal",
    color: "green",
    desc: "Halal-certified packaged grocery item.",
  },
};

/* ---- Butcher option templates ----------------------------- */
const BUTCHER = {
  redmeat: {
    cut: ["Bone-in", "Boneless"],
    prep: ["Whole / As-is", "Curry cut (small pieces)", "Cubed", "Minced (Qeema)", "Sliced thin"],
    weights: [
      { label: "1 lb (0.45 kg)", factor: 1 },
      { label: "2 lb (0.9 kg)", factor: 2 },
      { label: "5 lb (2.3 kg)", factor: 5 },
      { label: "10 lb (4.5 kg)", factor: 10 },
    ],
  },
  poultry: {
    cut: ["Whole bird", "Bone-in pieces", "Boneless"],
    prep: ["Skin-on", "Skinless", "Curry cut", "Cubed", "Minced (Qeema)"],
    weights: [
      { label: "1 lb (0.45 kg)", factor: 1 },
      { label: "2 lb (0.9 kg)", factor: 2 },
      { label: "5 lb (2.3 kg)", factor: 5 },
    ],
  },
};

/* ---- Products --------------------------------------------- */
/* price = base price per the default weight (1 lb for meat).   */
const PRODUCTS = [
  // ---------------- Zabiha Red Meat ----------------
  {
    id: "goat-leg",
    name: "Goat Meat (Bakra)",
    category: "Zabiha Meat",
    halal: "zabiha",
    price: 11.99,
    unit: "lb",
    emoji: "🐐",
    butcher: "redmeat",
    badges: ["Local supplier", "Fresh daily"],
    desc: "Tender young goat from Sunrise Farms, Leduc County. Cut to order by our in-house butcher.",
  },
  {
    id: "lamb-shoulder",
    name: "Lamb Shoulder",
    category: "Zabiha Meat",
    halal: "zabiha",
    price: 13.49,
    unit: "lb",
    emoji: "🐑",
    butcher: "redmeat",
    badges: ["Local supplier"],
    desc: "Grass-fed Alberta lamb, perfect for slow-cooked curries and roasts.",
  },
  {
    id: "beef-undercut",
    name: "Beef (Bone-in)",
    category: "Zabiha Meat",
    halal: "zabiha",
    price: 8.99,
    unit: "lb",
    emoji: "🥩",
    butcher: "redmeat",
    badges: ["Fresh daily"],
    desc: "AAA Alberta beef. Choose your cut and preparation — from nihari pieces to qeema.",
  },
  {
    id: "veal",
    name: "Veal (Bachra)",
    category: "Zabiha Meat",
    halal: "zabiha",
    price: 10.49,
    unit: "lb",
    emoji: "🥩",
    butcher: "redmeat",
    desc: "Mild, tender veal cut fresh to order.",
  },
  // ---------------- Poultry ----------------
  {
    id: "chicken-whole",
    name: "Whole Chicken (Zabiha)",
    category: "Poultry",
    halal: "zabiha",
    price: 6.99,
    unit: "lb",
    emoji: "🐓",
    butcher: "poultry",
    badges: ["Fresh daily", "Local supplier"],
    desc: "Hand-slaughtered whole chicken. We'll skin, cut, or mince it exactly how you like.",
  },
  {
    id: "chicken-machine",
    name: "Chicken Breast (Halal)",
    category: "Poultry",
    halal: "machine",
    price: 7.49,
    unit: "lb",
    emoji: "🍗",
    butcher: "poultry",
    desc: "Machine-slaughtered halal-certified boneless breast. Great value for meal prep.",
  },
  // ---------------- Rice & Grains ----------------
  {
    id: "basmati",
    name: "Sela Basmati Rice 10kg",
    category: "Rice & Grains",
    halal: "grocery",
    price: 28.99,
    unit: "bag",
    emoji: "🍚",
    desc: "Aged extra-long sela basmati — the gold standard for biryani.",
  },
  {
    id: "atta",
    name: "Chakki Atta (Whole Wheat) 10kg",
    category: "Rice & Grains",
    halal: "grocery",
    price: 18.99,
    unit: "bag",
    emoji: "🌾",
    desc: "Stone-ground whole wheat flour for soft rotis.",
  },
  {
    id: "lentils",
    name: "Chana Daal 2kg",
    category: "Rice & Grains",
    halal: "grocery",
    price: 6.49,
    unit: "bag",
    emoji: "🫘",
    desc: "Split chickpea lentils.",
  },
  // ---------------- Spices ----------------
  {
    id: "biryani-masala",
    name: "Shan Biryani Masala",
    category: "Spices & Pantry",
    halal: "grocery",
    price: 2.49,
    unit: "box",
    emoji: "🧂",
    desc: "Classic biryani spice mix.",
  },
  {
    id: "garam-masala",
    name: "Garam Masala 100g",
    category: "Spices & Pantry",
    halal: "grocery",
    price: 3.99,
    unit: "pack",
    emoji: "🌶️",
    desc: "House-blend warming spices.",
  },
  {
    id: "kabab-masala",
    name: "Seekh Kabab Masala",
    category: "Spices & Pantry",
    halal: "grocery",
    price: 2.29,
    unit: "box",
    emoji: "🧂",
    desc: "Everything you need for smoky seekh kababs.",
  },
  {
    id: "ginger-garlic",
    name: "Ginger-Garlic Paste 750g",
    category: "Spices & Pantry",
    halal: "grocery",
    price: 4.99,
    unit: "jar",
    emoji: "🧄",
    desc: "Fresh-ground ginger and garlic paste.",
  },
  // ---------------- Produce ----------------
  {
    id: "onions",
    name: "Yellow Onions 5lb",
    category: "Produce",
    halal: "grocery",
    price: 4.49,
    unit: "bag",
    emoji: "🧅",
    desc: "Essential for every curry base.",
  },
  {
    id: "tomatoes",
    name: "Roma Tomatoes 3lb",
    category: "Produce",
    halal: "grocery",
    price: 4.99,
    unit: "bag",
    emoji: "🍅",
    desc: "Ripe roma tomatoes.",
  },
  {
    id: "yogurt",
    name: "Plain Yogurt 2kg",
    category: "Dairy & Frozen",
    halal: "grocery",
    price: 7.99,
    unit: "tub",
    emoji: "🥛",
    desc: "Creamy full-fat yogurt for marinades and raita.",
  },
  {
    id: "paratha",
    name: "Frozen Paratha 30pc",
    category: "Dairy & Frozen",
    halal: "grocery",
    price: 9.99,
    unit: "pack",
    emoji: "🫓",
    desc: "Flaky layered parathas, ready in minutes.",
  },

  // ---------------- Real in-store catalogue (from store photos) ----------------
  // Ghee & Oil
  {
    id: "nanak-ghee",
    name: "Nanak Desi Ghee",
    category: "Ghee & Oil",
    halal: "grocery",
    price: 13.99,
    unit: "jar",
    emoji: "🧈",
    desc: "Pure clarified butter (desi ghee) — rich aroma, perfect for everyday cooking.",
  },
  {
    id: "amul-ghee",
    name: "Amul Pure Ghee",
    category: "Ghee & Oil",
    halal: "grocery",
    price: 18.49,
    unit: "tin",
    emoji: "🧈",
    desc: "Amul pure cow ghee — a trusted favourite.",
  },
  // Dates & Dried Fruit
  {
    id: "fateel-rutab",
    name: "Fateel Rutab Dates 1.5 kg",
    category: "Dates & Dried Fruit",
    halal: "grocery",
    price: 12.99,
    unit: "box",
    emoji: "🌴",
    desc: "Soft, fresh Rutab dates — naturally sweet, 1.5 kg tray.",
  },
  {
    id: "fateel-sukkary",
    name: "Fateel Sukkary Dates",
    category: "Dates & Dried Fruit",
    halal: "grocery",
    price: 9.99,
    unit: "tub",
    emoji: "🌴",
    desc: "Premium Sukkary dates — crisp, golden, and mild.",
  },
  // Bakery
  {
    id: "aljazaa-cake-rusk",
    name: "Aljazaa Cake Rusk",
    category: "Bakery",
    halal: "grocery",
    price: 4.99,
    unit: "box",
    emoji: "🍞",
    desc: "Crunchy tea-time cake rusk. (Buy 2 get 1 free in-store special.)",
  },
  {
    id: "cakebake-bakarkhani",
    name: "Cake & Bake Bakarkhani",
    category: "Bakery",
    halal: "grocery",
    price: 4.99,
    unit: "pack",
    emoji: "🥮",
    desc: "Flaky traditional bakarkhani pastry — great with chai.",
  },
  // Drinks & Syrups
  {
    id: "qarshi-bazoori",
    name: "Qarshi Bazoori Sharbat",
    category: "Drinks & Syrups",
    halal: "grocery",
    price: 2.25,
    unit: "bottle",
    emoji: "🥤",
    desc: "Herbal Bazoori syrup — a refreshing summer cooler.",
  },
  {
    id: "qarshi-ilacheen",
    name: "Qarshi Ilacheen Sharbat",
    category: "Drinks & Syrups",
    halal: "grocery",
    price: 2.25,
    unit: "bottle",
    emoji: "🥤",
    desc: "Cardamom (ilaichi) flavoured sharbat syrup.",
  },
  // Pantry
  {
    id: "nestle-everyday",
    name: "Nestlé Everyday Milk Powder",
    category: "Spices & Pantry",
    halal: "grocery",
    price: 4.49,
    unit: "pack",
    emoji: "🥛",
    desc: "Classic 'khaas' tea whitener milk powder.",
  },
  // Fresh Fruit
  {
    id: "pakistani-mango",
    name: "Pakistani Mango (Box)",
    category: "Fresh Fruit",
    halal: null,
    price: 24.99,            // NOTE: price not provided — placeholder, please confirm
    unit: "box",
    emoji: "🥭",
    badges: ["Seasonal"],
    desc: "Sweet, fragrant Pakistani mangoes — seasonal favourite, sold by the box.",
  },
  // Household & Games
  {
    id: "carrom-board",
    name: 'Carrom Board 48" × 48"',
    category: "Household & Games",
    halal: null,
    price: 99.99,           // NOTE: price not provided — placeholder, please confirm
    unit: "each",
    emoji: "🎯",
    desc: "Full-size tournament carrom board for family game nights.",
  },
];

/* ---- Recipe-to-cart bundles ------------------------------- */
const RECIPES = [
  {
    id: "chicken-biryani",
    title: "Hyderabadi Chicken Biryani",
    author: "Ayesha · Mill Woods home cook",
    serves: "Serves 6",
    time: "75 min",
    emoji: "🍛",
    blurb: "Layered dum biryani with fragrant sela basmati and tender Zabiha chicken.",
    // each line: product id + quantity to add
    items: [
      { id: "chicken-whole", qty: 1 },
      { id: "basmati", qty: 1 },
      { id: "biryani-masala", qty: 2 },
      { id: "onions", qty: 1 },
      { id: "yogurt", qty: 1 },
      { id: "ginger-garlic", qty: 1 },
    ],
  },
  {
    id: "seekh-kabab",
    title: "Smoky Beef Seekh Kababs",
    author: "Bilal · Mill Woods home cook",
    serves: "Serves 4",
    time: "40 min",
    emoji: "🍢",
    blurb: "Minced beef qeema kababs with the perfect char. Great for the grill.",
    items: [
      { id: "beef-undercut", qty: 2 },
      { id: "kabab-masala", qty: 1 },
      { id: "ginger-garlic", qty: 1 },
      { id: "onions", qty: 1 },
    ],
  },
  {
    id: "goat-curry",
    title: "Slow-Cooked Goat Curry",
    author: "Fatima · Mill Woods home cook",
    serves: "Serves 5",
    time: "90 min",
    emoji: "🥘",
    blurb: "Bone-in goat simmered low and slow in a rich tomato-onion masala.",
    items: [
      { id: "goat-leg", qty: 3 },
      { id: "onions", qty: 1 },
      { id: "tomatoes", qty: 1 },
      { id: "garam-masala", qty: 1 },
      { id: "ginger-garlic", qty: 1 },
    ],
  },
];

/* ---- Suppliers (Our Standards page) ----------------------- */
const SUPPLIERS = [
  {
    name: "Sunrise Halal Farms",
    location: "Leduc County, AB",
    supplies: "Goat, Lamb",
    method: "zabiha",
    cert: "HMA Canada — Cert #CA-2231",
    note: "Hand-slaughtered on-farm; certificate renewed annually.",
  },
  {
    name: "Prairie Crescent Poultry",
    location: "Wetaskiwin, AB",
    supplies: "Whole chicken",
    method: "zabiha",
    cert: "HMS Canada — Cert #PC-1187",
    note: "Dedicated Zabiha line, Tasmiyah recited per bird.",
  },
  {
    name: "Alberta Prime Beef Co.",
    location: "Calgary, AB",
    supplies: "Beef, Veal",
    method: "zabiha",
    cert: "HMA Canada — Cert #AP-0904",
    note: "AAA grade, hand-slaughtered and supervised.",
  },
  {
    name: "Maple Crest Foods",
    location: "Edmonton, AB",
    supplies: "Boneless chicken breast",
    method: "machine",
    cert: "ISNA Canada — Cert #MC-5520",
    note: "Machine-slaughtered under continuous halal supervision.",
  },
];

/* ---- Community board + prayer times ----------------------- */
const PRAYER_TIMES = {
  date: "Friday, June 19, 2026",
  jummah: "1:30 PM & 2:30 PM",
  times: [
    { name: "Fajr", time: "3:48 AM" },
    { name: "Dhuhr", time: "1:28 PM" },
    { name: "Asr", time: "6:15 PM" },
    { name: "Maghrib", time: "9:58 PM" },
    { name: "Isha", time: "11:35 PM" },
  ],
  source: "Times shown for Edmonton (Mill Woods). Confirm with your local masjid.",
};

const COMMUNITY = [
  {
    title: "Mill Woods Jummah — two congregations",
    org: "Markaz-ul-Islam",
    date: "Every Friday",
    body: "Two Jummah prayers held to accommodate the community. Doors open 30 min early.",
    tag: "Prayer",
  },
  {
    title: "Eid-ul-Adha Qurbani sign-up open",
    org: "Millwoods Halal + Sunrise Farms",
    date: "Until July 10, 2026",
    body: "Reserve your Qurbani share early. Local Zabiha goat & lamb, processed and delivered fresh.",
    tag: "Announcement",
  },
];
