import { ImageSourcePropType } from "react-native";

// Full background photo library (Pixabay, free for commercial use). Free
// tier gets one fixed photo per screen; Pro unlocks picking any of these
// for any screen (Settings > Backgrounds). Grouped by category purely to
// make the picker easier to browse now that there are 30+ options.
export type BackgroundCategory = "solitude" | "mountains" | "water" | "coast" | "forest" | "garden" | "seasonal" | "abstract";

export type BackgroundImageId =
  | "cairn"
  | "lake"
  | "companion"
  | "fuji"
  | "dolomites"
  | "mistyWater"
  | "forestPeaks"
  | "alpineHut"
  | "alpineVista"
  | "lighthouseCoast"
  | "alpineMeadowLake"
  | "lanternBeach"
  | "beachHuts"
  | "azaleaFalls"
  | "starryNight"
  | "auroraTrees"
  | "dolomitesCabin"
  | "autumnCanal"
  | "mistyForestLake"
  | "gardenBridge"
  | "dewSpiderweb"
  | "sunbeamLake"
  | "tropicalBeach"
  | "goldenTunnel"
  | "turquoiseCabin"
  | "cloudyBeach"
  | "blossomTree"
  | "solitaryDock"
  | "restingGrass"
  | "goldenAutumnLake"
  | "sunsetJetty"
  | "quietDock"
  | "snowyPath"
  | "roseArchway"
  | "oceanSunsetRocks"
  | "figureSunset"
  | "starlitLake"
  | "coastView1"
  | "coastView2"
  | "coastView3"
  | "forestPath1"
  | "forestPath2"
  | "forestPath3"
  | "forestPath4"
  | "gardenView1"
  | "gardenView2"
  | "gardenView3"
  | "gardenView4"
  | "mountainLake1"
  | "mountainLake2"
  | "mountainLake3"
  | "mountainLake4"
  | "seasonalView1"
  | "seasonalView2"
  | "seasonalView3"
  | "seasonalView4"
  | "solitudeView1"
  | "solitudeView2"
  | "solitudeView3"
  | "solitudeView4"
  | "solitudeView5"
  | "waterView1"
  | "waterView2";

export type BackgroundScreenKey =
  | "welcome"
  | "checkin"
  | "share"
  | "history"
  | "journal"
  | "crisis"
  | "recipients"
  | "login"
  | "signup"
  | "settings";

type BackgroundEntry = { label: string; category: BackgroundCategory; source: ImageSourcePropType };

export const BACKGROUND_IMAGES: Record<BackgroundImageId, BackgroundEntry> = {
  cairn: { label: "Stone Cairn at Sunrise", category: "solitude", source: require("../../assets/backgrounds/welcome.jpg") },
  lake: { label: "Turquoise Mountain Lake", category: "water", source: require("../../assets/backgrounds/checkin.jpg") },
  companion: { label: "Dog by the Lake", category: "solitude", source: require("../../assets/backgrounds/share.jpg") },
  fuji: { label: "Sunrise Over Mount Fuji", category: "mountains", source: require("../../assets/backgrounds/fuji.jpg") },
  dolomites: { label: "Autumn Reflections", category: "mountains", source: require("../../assets/backgrounds/dolomites.jpg") },
  mistyWater: { label: "Misty Waters", category: "water", source: require("../../assets/backgrounds/misty-water.jpg") },
  forestPeaks: { label: "Forest Peaks", category: "mountains", source: require("../../assets/backgrounds/forest-peaks.jpg") },
  alpineHut: { label: "Alpine Hut", category: "mountains", source: require("../../assets/backgrounds/alpine-hut.jpg") },
  alpineVista: { label: "Alpine Vista", category: "mountains", source: require("../../assets/backgrounds/alpine-vista.jpg") },

  lighthouseCoast: { label: "Lighthouse Coast", category: "coast", source: require("../../assets/backgrounds/lighthouse-coast.jpg") },
  alpineMeadowLake: { label: "Alpine Meadow Lake", category: "mountains", source: require("../../assets/backgrounds/alpine-meadow-lake.jpg") },
  lanternBeach: { label: "Lantern at Dusk", category: "coast", source: require("../../assets/backgrounds/lantern-beach-dusk.jpg") },
  beachHuts: { label: "Colorful Beach Huts", category: "coast", source: require("../../assets/backgrounds/colorful-beach-huts.jpg") },
  azaleaFalls: { label: "Azalea Garden Falls", category: "garden", source: require("../../assets/backgrounds/azalea-garden-falls.jpg") },
  starryNight: { label: "Starry Night Sky", category: "solitude", source: require("../../assets/backgrounds/starry-night-sky.jpg") },
  auroraTrees: { label: "Night Sky Over Trees", category: "solitude", source: require("../../assets/backgrounds/night-aurora-trees.jpg") },
  dolomitesCabin: { label: "Dolomites Lake Cabin", category: "mountains", source: require("../../assets/backgrounds/dolomites-lake-cabin.jpg") },
  autumnCanal: { label: "Autumn Canal", category: "seasonal", source: require("../../assets/backgrounds/autumn-canal-trees.jpg") },
  mistyForestLake: { label: "Misty Forest Lake", category: "forest", source: require("../../assets/backgrounds/misty-forest-lake.jpg") },
  gardenBridge: { label: "Garden Bridge", category: "garden", source: require("../../assets/backgrounds/garden-bridge-lake.jpg") },
  dewSpiderweb: { label: "Morning Dew", category: "abstract", source: require("../../assets/backgrounds/dew-spiderweb.jpg") },
  sunbeamLake: { label: "Sunbeams Over the Lake", category: "mountains", source: require("../../assets/backgrounds/sunbeam-mountain-lake.jpg") },
  tropicalBeach: { label: "Tropical Beach", category: "coast", source: require("../../assets/backgrounds/tropical-beach-footprints.jpg") },
  goldenTunnel: { label: "Golden Tree Tunnel", category: "seasonal", source: require("../../assets/backgrounds/golden-tree-tunnel.jpg") },
  turquoiseCabin: { label: "Turquoise Lake Cabin", category: "mountains", source: require("../../assets/backgrounds/turquoise-lake-cabin.jpg") },
  cloudyBeach: { label: "Cloudy Beach", category: "coast", source: require("../../assets/backgrounds/cloudy-beach-waves.jpg") },
  blossomTree: { label: "Blossom Tree", category: "seasonal", source: require("../../assets/backgrounds/blossom-tree-field.jpg") },
  solitaryDock: { label: "Solitary Dock", category: "solitude", source: require("../../assets/backgrounds/solitary-dock-reflection.jpg") },
  restingGrass: { label: "Resting in the Grass", category: "solitude", source: require("../../assets/backgrounds/resting-in-the-grass.jpg") },
  goldenAutumnLake: { label: "Golden Autumn Lake", category: "seasonal", source: require("../../assets/backgrounds/golden-autumn-lake.jpg") },
  sunsetJetty: { label: "Sunset Jetty", category: "water", source: require("../../assets/backgrounds/sunset-jetty-boat.jpg") },
  quietDock: { label: "Quiet Dock at Sunset", category: "solitude", source: require("../../assets/backgrounds/quiet-dock-sunset.jpg") },
  snowyPath: { label: "Snowy Forest Path", category: "seasonal", source: require("../../assets/backgrounds/snowy-forest-path.jpg") },
  roseArchway: { label: "Rose Archway", category: "garden", source: require("../../assets/backgrounds/rose-archway-path.jpg") },
  oceanSunsetRocks: { label: "Ocean Sunset", category: "coast", source: require("../../assets/backgrounds/ocean-sunset-rocks.jpg") },
  figureSunset: { label: "Alone at Sunset", category: "solitude", source: require("../../assets/backgrounds/figure-ocean-sunset.jpg") },
  starlitLake: { label: "Starlit Mountain Lake", category: "mountains", source: require("../../assets/backgrounds/starlit-mountain-lake.jpg") },

  // Added July 2026 - user-supplied batch to round out the thinner
  // categories (water and coast only had 3 and 6 respectively before this).
  coastView1: { label: "Coast View 1", category: "coast", source: require("../../assets/backgrounds/coast-1.jpg") },
  coastView2: { label: "Coast View 2", category: "coast", source: require("../../assets/backgrounds/coast-2.jpg") },
  coastView3: { label: "Coast View 3", category: "coast", source: require("../../assets/backgrounds/coast-3.jpg") },
  forestPath1: { label: "Forest Path 1", category: "forest", source: require("../../assets/backgrounds/forest-1.jpg") },
  forestPath2: { label: "Forest Path 2", category: "forest", source: require("../../assets/backgrounds/forest-2.jpg") },
  forestPath3: { label: "Forest Path 3", category: "forest", source: require("../../assets/backgrounds/forest-3.jpg") },
  forestPath4: { label: "Forest Path 4", category: "forest", source: require("../../assets/backgrounds/forest-4.jpg") },
  gardenView1: { label: "Garden View 1", category: "garden", source: require("../../assets/backgrounds/garden-1.jpg") },
  gardenView2: { label: "Garden View 2", category: "garden", source: require("../../assets/backgrounds/garden-2.jpg") },
  gardenView3: { label: "Garden View 3", category: "garden", source: require("../../assets/backgrounds/garden-3.jpg") },
  gardenView4: { label: "Garden View 4", category: "garden", source: require("../../assets/backgrounds/garden-4.jpg") },
  mountainLake1: { label: "Mountain Lake 1", category: "mountains", source: require("../../assets/backgrounds/mountain-lake-1.jpg") },
  mountainLake2: { label: "Mountain Lake 2", category: "mountains", source: require("../../assets/backgrounds/mountain-lake-2.jpg") },
  mountainLake3: { label: "Mountain Lake 3", category: "mountains", source: require("../../assets/backgrounds/mountain-lake-3.jpg") },
  mountainLake4: { label: "Mountain Lake 4", category: "mountains", source: require("../../assets/backgrounds/mountain-lake-4.jpg") },
  seasonalView1: { label: "Seasonal View 1", category: "seasonal", source: require("../../assets/backgrounds/seasonal-photo-1.jpg") },
  seasonalView2: { label: "Seasonal View 2", category: "seasonal", source: require("../../assets/backgrounds/seasonal-photo-2.jpg") },
  seasonalView3: { label: "Seasonal View 3", category: "seasonal", source: require("../../assets/backgrounds/seasonal-photo-3.jpg") },
  seasonalView4: { label: "Seasonal View 4", category: "seasonal", source: require("../../assets/backgrounds/seasonal-photo-4.jpg") },
  solitudeView1: { label: "Quiet Moment 1", category: "solitude", source: require("../../assets/backgrounds/solitude-1.jpg") },
  solitudeView2: { label: "Quiet Moment 2", category: "solitude", source: require("../../assets/backgrounds/solitude-2.jpg") },
  solitudeView3: { label: "Quiet Moment 3", category: "solitude", source: require("../../assets/backgrounds/solitude-3.jpg") },
  solitudeView4: { label: "Quiet Moment 4", category: "solitude", source: require("../../assets/backgrounds/solitude-4.jpg") },
  solitudeView5: { label: "Quiet Moment 5", category: "solitude", source: require("../../assets/backgrounds/solitude-5.jpg") },
  waterView1: { label: "Water View 1", category: "water", source: require("../../assets/backgrounds/water-1.jpg") },
  waterView2: { label: "Water View 2", category: "water", source: require("../../assets/backgrounds/water-2.jpg") },
};

export const CATEGORY_LABELS: Record<BackgroundCategory, string> = {
  solitude: "Quiet & Solitude",
  mountains: "Mountains & Lakes",
  water: "Water",
  coast: "Coast",
  forest: "Forest",
  garden: "Gardens",
  seasonal: "Seasonal",
  abstract: "Abstract",
};

export const CATEGORY_ORDER: BackgroundCategory[] = [
  "solitude",
  "mountains",
  "water",
  "coast",
  "forest",
  "garden",
  "seasonal",
  "abstract",
];

export const BACKGROUND_SCREEN_LABELS: Record<BackgroundScreenKey, string> = {
  welcome: "Welcome screen",
  checkin: "Daily check-in",
  share: "Share screen",
  history: "History screen",
  journal: "Journal screen",
  crisis: "Support screen",
  recipients: "Shared with screen",
  login: "Log in screen",
  signup: "Sign up screen",
  settings: "Settings screen",
};

// The default (free-tier) photo for each screen - matches what every user
// sees out of the box, chosen for tone: welcome = calm/grounding, checkin =
// daily grounding, share = companionship, history = looking back over time,
// journal = quiet reflection, crisis = muted/gentle (never showy on this
// one), recipients = connection, login/signup = fresh start, settings =
// neutral backdrop.
// Midnight Signal rebrand (full pass): every screen now defaults to
// dusk/night photography so the whole out-of-box app lives in the same
// deep-indigo brand world as the website. Chosen for tone within that
// world: welcome = wonder, checkin = quiet grounding, share = handing a
// light to someone, history = looking back under a big sky, journal =
// private night thoughts, crisis = deliberately the most muted and still,
// recipients = warmth at dusk, login/signup = return and fresh start.
// The full daytime library is still there for anyone to pick (Pro).
export const DEFAULT_BACKGROUNDS: Record<BackgroundScreenKey, BackgroundImageId> = {
  welcome: "auroraTrees",
  checkin: "mistyForestLake",
  share: "lanternBeach",
  history: "starlitLake",
  journal: "starryNight",
  crisis: "mistyWater",
  recipients: "sunsetJetty",
  login: "quietDock",
  signup: "auroraTrees",
  settings: "mistyForestLake",
};
