export type MatchMarket = {
  id: string;
  label: string;
  odds: number;
};

export type MatchCard = {
  id: string;
  league: string;
  kickoff: string;
  live?: boolean;
  minute?: string;
  home: string;
  away: string;
  score?: string;
  markets: MatchMarket[];
};

export const featuredMatches: MatchCard[] = [
  {
    id: "flamengo-palmeiras",
    league: "Brasileirao Serie A",
    kickoff: "Hoje, 21:30",
    home: "Flamengo",
    away: "Palmeiras",
    markets: [
      { id: "fla-win", label: "Flamengo", odds: 2.14 },
      { id: "draw", label: "Empate", odds: 3.28 },
      { id: "pal-win", label: "Palmeiras", odds: 3.44 },
    ],
  },
  {
    id: "real-city",
    league: "Champions Night",
    kickoff: "Hoje, 17:00",
    live: true,
    minute: "63'",
    home: "Real Madrid",
    away: "Manchester City",
    score: "2 - 1",
    markets: [
      { id: "real-live", label: "Real Madrid", odds: 1.95 },
      { id: "draw-live", label: "Empate", odds: 3.75 },
      { id: "city-live", label: "City", odds: 4.2 },
    ],
  },
  {
    id: "celtics-heat",
    league: "NBA",
    kickoff: "Amanhã, 20:00",
    home: "Boston Celtics",
    away: "Miami Heat",
    markets: [
      { id: "celtics", label: "Celtics", odds: 1.62 },
      { id: "heat", label: "Heat", odds: 2.38 },
      { id: "total-over", label: "Over 212.5", odds: 1.87 },
    ],
  },
  {
    id: "furia-navi",
    league: "Counter-Strike",
    kickoff: "Hoje, 18:45",
    home: "FURIA",
    away: "NAVI",
    markets: [
      { id: "furia", label: "FURIA", odds: 2.58 },
      { id: "navi", label: "NAVI", odds: 1.49 },
      { id: "map3", label: "3 mapas", odds: 2.05 },
    ],
  },
];

export const ticker = [
  "Saque medio: 2m 11s",
  "Cashout inteligente ativo",
  "Limites responsaveis configurados",
  "Mercados ao vivo atualizados em tempo real",
];
