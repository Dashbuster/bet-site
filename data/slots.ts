export type SlotProfile = {
  id: string;
  name: string;
  hitRate: number;
  targetRtp: number;
  multiplierBoost: number;
  note: string;
};

export type SlotSymbol = string;

export type SlotGame = {
  id: string;
  title: string;
  accent: string;
  description: string;
  badge: string;
  demoWin: string;
  volatility: string;
  tone: string;
  featureLabel: string;
  rows: number;
  reels: number;
  symbols: SlotSymbol[];
  lineSymbols: SlotSymbol[];
  wildSymbol: SlotSymbol;
  scatterSymbol: SlotSymbol;
  symbolLabel: Record<SlotSymbol, string>;
  paylines: number[][];
  paytable: Record<SlotSymbol, Record<number, number>>;
  scatterPaytable: Partial<Record<number, number>>;
  freeSpinAwards: Partial<Record<number, number>>;
  freeSpinMultiplier: number;
  wildLineBonus: number;
  initialBoard: SlotSymbol[][];
};

export const slotProfiles: SlotProfile[] = [
  {
    id: "steady",
    name: "Steady",
    hitRate: 0.23,
    targetRtp: 0.91,
    multiplierBoost: 0.94,
    note: "Perfil de teste mais seco, usado para validar estabilidade de saldo.",
  },
  {
    id: "balanced",
    name: "Balanced",
    hitRate: 0.31,
    targetRtp: 0.95,
    multiplierBoost: 1,
    note: "Perfil padrao de sandbox para revisar hit rate e retorno medio.",
  },
  {
    id: "showcase",
    name: "Showcase",
    hitRate: 0.39,
    targetRtp: 0.98,
    multiplierBoost: 1.16,
    note: "Perfil de apresentacao visual, com mais premios e ritmo mais alto.",
  },
];

const basePaylines = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
];

export const slotGames: SlotGame[] = [
  {
    id: "golden-claw",
    title: "Golden Claw",
    accent: "linear-gradient(135deg, #f7a11d 0%, #ffe26f 100%)",
    description: "Slot felino com reliquias solares, linhas classicas e free spins dobrados.",
    badge: "Original",
    demoWin: "Max demo x1400",
    volatility: "Media-alta",
    tone: "Gold heat",
    featureLabel: "Free spins com x2",
    rows: 3,
    reels: 5,
    symbols: ["CLAW", "SUN", "GEM", "ROAR", "WILD", "SCATTER"],
    lineSymbols: ["CLAW", "SUN", "GEM", "ROAR"],
    wildSymbol: "WILD",
    scatterSymbol: "SCATTER",
    symbolLabel: {
      CLAW: "CL",
      SUN: "SU",
      GEM: "GM",
      ROAR: "RR",
      WILD: "WD",
      SCATTER: "SC",
    },
    paylines: basePaylines,
    paytable: {
      CLAW: { 3: 4, 4: 8, 5: 14 },
      SUN: { 3: 5, 4: 10, 5: 18 },
      GEM: { 3: 6, 4: 12, 5: 22 },
      ROAR: { 3: 8, 4: 16, 5: 30 },
    },
    scatterPaytable: { 3: 4, 4: 10, 5: 18 },
    freeSpinAwards: { 3: 5, 4: 8, 5: 12 },
    freeSpinMultiplier: 2,
    wildLineBonus: 0,
    initialBoard: [
      ["CLAW", "SUN", "GEM", "ROAR", "SUN"],
      ["ROAR", "WILD", "SUN", "GEM", "CLAW"],
      ["GEM", "CLAW", "ROAR", "SUN", "SCATTER"],
    ],
  },
  {
    id: "neon-grove",
    title: "Neon Grove",
    accent: "linear-gradient(135deg, #28e0b9 0%, #2f7bff 100%)",
    description: "Slot synth-botanico com wild energizado e linhas em zigue-zague.",
    badge: "New",
    demoWin: "Max demo x1100",
    volatility: "Media",
    tone: "Electric cyan",
    featureLabel: "Wild soma +1x na linha",
    rows: 3,
    reels: 5,
    symbols: ["BLOOM", "DROP", "BEAM", "ORBIT", "WILD", "SCATTER"],
    lineSymbols: ["BLOOM", "DROP", "BEAM", "ORBIT"],
    wildSymbol: "WILD",
    scatterSymbol: "SCATTER",
    symbolLabel: {
      BLOOM: "BL",
      DROP: "DR",
      BEAM: "BM",
      ORBIT: "OR",
      WILD: "WD",
      SCATTER: "SC",
    },
    paylines: [
      ...basePaylines,
      [0, 0, 1, 2, 2],
      [2, 2, 1, 0, 0],
      [1, 0, 1, 2, 1],
    ],
    paytable: {
      BLOOM: { 3: 3, 4: 7, 5: 12 },
      DROP: { 3: 4, 4: 8, 5: 14 },
      BEAM: { 3: 5, 4: 10, 5: 18 },
      ORBIT: { 3: 7, 4: 14, 5: 26 },
    },
    scatterPaytable: { 3: 5, 4: 12, 5: 20 },
    freeSpinAwards: { 3: 4, 4: 7, 5: 10 },
    freeSpinMultiplier: 1,
    wildLineBonus: 1,
    initialBoard: [
      ["BLOOM", "DROP", "BEAM", "ORBIT", "DROP"],
      ["WILD", "BEAM", "DROP", "BLOOM", "SCATTER"],
      ["ORBIT", "BLOOM", "WILD", "DROP", "BEAM"],
    ],
  },
  {
    id: "moon-vault",
    title: "Moon Vault",
    accent: "linear-gradient(135deg, #7b72ff 0%, #1d233e 100%)",
    description: "Slot lunar com cofre antigo, scatters fortes e rodadas gratis retrigger.",
    badge: "Vault",
    demoWin: "Max demo x1700",
    volatility: "Alta",
    tone: "Midnight violet",
    featureLabel: "Scatter forte e retrigger",
    rows: 3,
    reels: 5,
    symbols: ["MOON", "KEY", "COMET", "VAULT", "WILD", "SCATTER"],
    lineSymbols: ["MOON", "KEY", "COMET", "VAULT"],
    wildSymbol: "WILD",
    scatterSymbol: "SCATTER",
    symbolLabel: {
      MOON: "MN",
      KEY: "KY",
      COMET: "CM",
      VAULT: "VT",
      WILD: "WD",
      SCATTER: "SC",
    },
    paylines: [
      ...basePaylines,
      [1, 0, 0, 0, 1],
      [1, 2, 2, 2, 1],
    ],
    paytable: {
      MOON: { 3: 4, 4: 9, 5: 16 },
      KEY: { 3: 5, 4: 11, 5: 20 },
      COMET: { 3: 6, 4: 13, 5: 24 },
      VAULT: { 3: 9, 4: 18, 5: 34 },
    },
    scatterPaytable: { 3: 6, 4: 14, 5: 28 },
    freeSpinAwards: { 3: 6, 4: 9, 5: 14 },
    freeSpinMultiplier: 1.5,
    wildLineBonus: 0,
    initialBoard: [
      ["MOON", "KEY", "COMET", "VAULT", "SCATTER"],
      ["COMET", "WILD", "KEY", "MOON", "VAULT"],
      ["KEY", "COMET", "WILD", "KEY", "MOON"],
    ],
  },
];
