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
  | "starlitLake";

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
export const DEFAULT_BACKGROUNDS: Record<BackgroundScreenKey, BackgroundImageId> = {
  welcome: "cairn",
  checkin: "lake",
  share: "companion",
  history: "goldenAutumnLake",
  journal: "dolomites",
  crisis: "mistyWater",
  recipients: "gardenBridge",
  login: "lanternBeach",
  signup: "azaleaFalls",
  settings: "forestPeaks",
};
