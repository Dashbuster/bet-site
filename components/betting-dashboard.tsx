"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { featuredMatches, ticker, type MatchCard, type MatchMarket } from "@/data/matches";
import { slotGames, slotProfiles, type SlotGame, type SlotProfile, type SlotSymbol } from "@/data/slots";

type BetPick = {
  matchId: string;
  matchLabel: string;
  marketId: string;
  marketLabel: string;
  odds: number;
};

type PlacedBet = {
  id: string;
  createdAt: string;
  selections: number;
  stake: number;
  combinedOdds: number;
  potentialReturn: number;
  status: "Aberta" | "Liquidada";
};

type WithdrawalRequest = {
  id: string;
  createdAt: string;
  amount: number;
  pixKey: string;
  status: "Em analise" | "Aprovado";
};

type SlotBoard = SlotSymbol[][];
type WinLine = {
  lineIndex: number;
  symbol: SlotSymbol;
  count: number;
  payoutMultiplier: number;
  usedWild: boolean;
};
type SpinResult = {
  lines: WinLine[];
  payout: number;
  scatterCount: number;
  scatterPayout: number;
  freeSpinsAwarded: number;
};
type SlotStats = {
  spins: number;
  wagered: number;
  won: number;
};

const STORAGE_KEY = "pulsebet-demo-state-v2";
const categories = ["Todos", "Slots"];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function initialStatsByGame() {
  return Object.fromEntries(
    slotGames.map((game) => [
      game.id,
      {
        spins: 0,
        wagered: 0,
        won: 0,
      } satisfies SlotStats,
    ]),
  ) as Record<string, SlotStats>;
}

function nowLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function randomSymbol(pool: SlotSymbol[], exclude?: SlotSymbol) {
  const source = exclude ? pool.filter((symbol) => symbol !== exclude) : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function createRandomBoard(game: SlotGame) {
  return Array.from({ length: game.rows }, () =>
    Array.from({ length: game.reels }, () => randomSymbol(game.symbols)),
  );
}

function setLineSymbol(board: SlotBoard, line: number[], reelIndex: number, symbol: SlotSymbol) {
  const rowIndex = line[reelIndex];
  board[rowIndex][reelIndex] = symbol;
}

function clearLineTail(board: SlotBoard, line: number[], startAt: number, game: SlotGame, blockSymbol: SlotSymbol) {
  for (let reelIndex = startAt; reelIndex < game.reels; reelIndex += 1) {
    board[line[reelIndex]][reelIndex] = randomSymbol(game.lineSymbols, blockSymbol);
  }
}

function injectScatter(board: SlotBoard, game: SlotGame, count: number) {
  let placed = 0;

  while (placed < count) {
    const rowIndex = Math.floor(Math.random() * game.rows);
    const reelIndex = Math.floor(Math.random() * game.reels);
    if (board[rowIndex][reelIndex] !== game.scatterSymbol) {
      board[rowIndex][reelIndex] = game.scatterSymbol;
      placed += 1;
    }
  }
}

function evaluateBoard(
  board: SlotBoard,
  stake: number,
  profile: SlotProfile,
  game: SlotGame,
  inFreeSpin: boolean,
): SpinResult {
  const lines: WinLine[] = [];
  const scatterCount = board.flat().filter((symbol) => symbol === game.scatterSymbol).length;

  game.paylines.forEach((line, lineIndex) => {
    const values = line.map((row, reelIndex) => board[row][reelIndex]);
    const baseSymbol = values.find(
      (value) => value !== game.wildSymbol && value !== game.scatterSymbol,
    );

    if (!baseSymbol) {
      return;
    }

    let count = 0;
    let usedWild = false;

    for (const value of values) {
      if (value === baseSymbol || value === game.wildSymbol) {
        if (value === game.wildSymbol) {
          usedWild = true;
        }
        count += 1;
      } else {
        break;
      }
    }

    if (count < 3) {
      return;
    }

    const baseMultiplier = game.paytable[baseSymbol]?.[count];
    if (!baseMultiplier) {
      return;
    }

    let payoutMultiplier = baseMultiplier * profile.multiplierBoost;
    if (usedWild && game.wildLineBonus) {
      payoutMultiplier += game.wildLineBonus;
    }
    if (inFreeSpin) {
      payoutMultiplier *= game.freeSpinMultiplier;
    }

    lines.push({
      lineIndex: lineIndex + 1,
      symbol: baseSymbol,
      count,
      payoutMultiplier: Number(payoutMultiplier.toFixed(2)),
      usedWild,
    });
  });

  const linePayout = lines.reduce((total, line) => total + stake * line.payoutMultiplier, 0);
  const scatterMultiplier = game.scatterPaytable[scatterCount] ?? 0;
  const scatterPayout = Number(
    (stake * scatterMultiplier * (inFreeSpin ? game.freeSpinMultiplier : 1)).toFixed(2),
  );
  const freeSpinsAwarded = game.freeSpinAwards[scatterCount] ?? 0;

  return {
    lines,
    payout: Number((linePayout + scatterPayout).toFixed(2)),
    scatterCount,
    scatterPayout,
    freeSpinsAwarded,
  };
}

function createWinningBoard(
  game: SlotGame,
  profile: SlotProfile,
  stake: number,
  inFreeSpin: boolean,
): { board: SlotBoard; result: SpinResult } {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const board = createRandomBoard(game);
    const line = game.paylines[Math.floor(Math.random() * game.paylines.length)];
    const lineSymbol = randomSymbol(game.lineSymbols);
    const targetCount = [3, 3, 4, 4, 5][Math.floor(Math.random() * 5)];

    for (let reelIndex = 0; reelIndex < targetCount; reelIndex += 1) {
      setLineSymbol(
        board,
        line,
        reelIndex,
        Math.random() < 0.18 ? game.wildSymbol : lineSymbol,
      );
    }
    clearLineTail(board, line, targetCount, game, lineSymbol);

    if (Math.random() < 0.12) {
      injectScatter(board, game, 3);
    }

    const result = evaluateBoard(board, stake, profile, game, inFreeSpin);
    if (result.lines.length || result.scatterPayout) {
      return { board, result };
    }
  }

  const fallback = createRandomBoard(game);
  injectScatter(fallback, game, 3);
  return {
    board: fallback,
    result: evaluateBoard(fallback, stake, profile, game, inFreeSpin),
  };
}

function createLosingBoard(
  game: SlotGame,
  profile: SlotProfile,
  stake: number,
  inFreeSpin: boolean,
): { board: SlotBoard; result: SpinResult } {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const board = createRandomBoard(game);
    const result = evaluateBoard(board, stake, profile, game, inFreeSpin);
    if (!result.lines.length && !result.scatterPayout) {
      return { board, result };
    }
  }

  const board = game.initialBoard.map((row) => [...row]);
  return {
    board,
    result: evaluateBoard(board, stake, profile, game, inFreeSpin),
  };
}

function createScatterBoard(
  game: SlotGame,
  profile: SlotProfile,
  stake: number,
  inFreeSpin: boolean,
): { board: SlotBoard; result: SpinResult } {
  const board = createRandomBoard(game);
  const scatterCount = [3, 3, 4, 5][Math.floor(Math.random() * 4)];
  injectScatter(board, game, scatterCount);
  const result = evaluateBoard(board, stake, profile, game, inFreeSpin);
  return result.scatterPayout || result.freeSpinsAwarded
    ? { board, result }
    : createWinningBoard(game, profile, stake, inFreeSpin);
}

function formatLineSummary(lines: WinLine[], labels: Record<SlotSymbol, string>) {
  return lines
    .map((line) => {
      const suffix = line.usedWild ? " +wild" : "";
      return `L${line.lineIndex} ${labels[line.symbol]} x${line.count}${suffix}`;
    })
    .join(" | ");
}

export function BettingDashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [selections, setSelections] = useState<BetPick[]>([]);
  const [sportsStake, setSportsStake] = useState("25");
  const [casinoCategory, setCasinoCategory] = useState("Todos");
  const [activeGameId, setActiveGameId] = useState(slotGames[0].id);
  const [slotStake, setSlotStake] = useState("5");
  const [walletBalance, setWalletBalance] = useState(1280.45);
  const [slotProfileId, setSlotProfileId] = useState(slotProfiles[1].id);
  const [slotBoard, setSlotBoard] = useState<SlotBoard>(slotGames[0].initialBoard);
  const [slotMessage, setSlotMessage] = useState("Escolha um dos tres slots e rode a primeira aposta.");
  const [lastPayout, setLastPayout] = useState(0);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState("150");
  const [withdrawPixKey, setWithdrawPixKey] = useState("");
  const [slotStatsByGame, setSlotStatsByGame] = useState<Record<string, SlotStats>>(initialStatsByGame);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([
    {
      id: "seed-1",
      createdAt: "Hoje, 14:32",
      selections: 3,
      stake: 20,
      combinedOdds: 6.42,
      potentialReturn: 128.4,
      status: "Liquidada",
    },
  ]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as {
        walletBalance?: number;
        placedBets?: PlacedBet[];
        withdrawals?: WithdrawalRequest[];
        slotStatsByGame?: Record<string, SlotStats>;
        slotProfileId?: string;
        activeGameId?: string;
        freeSpinsRemaining?: number;
      };

      setWalletBalance(parsed.walletBalance ?? 1280.45);
      setPlacedBets(parsed.placedBets ?? []);
      setWithdrawals(parsed.withdrawals ?? []);
      setSlotStatsByGame(parsed.slotStatsByGame ?? initialStatsByGame());
      setSlotProfileId(parsed.slotProfileId ?? slotProfiles[1].id);
      setActiveGameId(parsed.activeGameId ?? slotGames[0].id);
      setFreeSpinsRemaining(parsed.freeSpinsRemaining ?? 0);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        walletBalance,
        placedBets,
        withdrawals,
        slotStatsByGame,
        slotProfileId,
        activeGameId,
        freeSpinsRemaining,
      }),
    );
  }, [
    activeGameId,
    freeSpinsRemaining,
    hydrated,
    placedBets,
    slotProfileId,
    slotStatsByGame,
    walletBalance,
    withdrawals,
  ]);

  const filteredGames = useMemo(() => {
    if (casinoCategory === "Todos") {
      return slotGames;
    }

    return slotGames;
  }, [casinoCategory]);

  const activeGame = filteredGames.find((game) => game.id === activeGameId) ?? filteredGames[0];
  const slotProfile = slotProfiles.find((profile) => profile.id === slotProfileId) ?? slotProfiles[1];
  const activeStats = slotStatsByGame[activeGame.id] ?? { spins: 0, wagered: 0, won: 0 };

  const combinedOdds = useMemo(() => {
    if (!selections.length) {
      return 0;
    }

    return Number(
      selections.reduce((total, selection) => total * selection.odds, 1).toFixed(2),
    );
  }, [selections]);

  const sportsStakeValue = Number(sportsStake) || 0;
  const slotStakeValue = Number(slotStake) || 0;
  const potentialReturn = Number((sportsStakeValue * combinedOdds).toFixed(2));
  const realizedRtp = activeStats.wagered
    ? Number(((activeStats.won / activeStats.wagered) * 100).toFixed(1))
    : 0;
  const pendingWithdrawals = withdrawals
    .filter((withdrawal) => withdrawal.status === "Em analise")
    .reduce((total, withdrawal) => total + withdrawal.amount, 0);

  useEffect(() => {
    setSlotBoard(activeGame.initialBoard);
    setSlotMessage(`${activeGame.title} carregado. ${activeGame.featureLabel}.`);
  }, [activeGame]);

  const toggleSelection = (match: MatchCard, market: MatchMarket) => {
    const key = `${match.id}:${market.id}`;

    setSelections((current) => {
      const exists = current.some(
        (selection) => `${selection.matchId}:${selection.marketId}` === key,
      );

      if (exists) {
        return current.filter(
          (selection) => `${selection.matchId}:${selection.marketId}` !== key,
        );
      }

      return [
        ...current,
        {
          matchId: match.id,
          matchLabel: `${match.home} x ${match.away}`,
          marketId: market.id,
          marketLabel: market.label,
          odds: market.odds,
        },
      ];
    });
  };

  const placeSportsBet = () => {
    if (!selections.length || sportsStakeValue <= 0 || sportsStakeValue > walletBalance) {
      setSlotMessage("Saldo insuficiente ou bilhete vazio para a aposta esportiva.");
      return;
    }

    setWalletBalance((current) => Number((current - sportsStakeValue).toFixed(2)));
    setPlacedBets((current) => [
      {
        id: crypto.randomUUID(),
        createdAt: nowLabel(),
        selections: selections.length,
        stake: sportsStakeValue,
        combinedOdds,
        potentialReturn,
        status: "Aberta",
      },
      ...current,
    ]);
    setSelections([]);
    setSportsStake("25");
  };

  const runSlotSpin = () => {
    const inFreeSpin = freeSpinsRemaining > 0;

    if (!inFreeSpin && (slotStakeValue <= 0 || slotStakeValue > walletBalance)) {
      setSlotMessage("Saldo insuficiente para girar.");
      return;
    }

    const eventRoll = Math.random();
    const payload =
      eventRoll < 0.09
        ? createScatterBoard(activeGame, slotProfile, slotStakeValue, inFreeSpin)
        : eventRoll < slotProfile.hitRate
          ? createWinningBoard(activeGame, slotProfile, slotStakeValue, inFreeSpin)
          : createLosingBoard(activeGame, slotProfile, slotStakeValue, inFreeSpin);

    const cost = inFreeSpin ? 0 : slotStakeValue;
    const nextBalance = Number((walletBalance - cost + payload.result.payout).toFixed(2));

    setWalletBalance(nextBalance);
    setSlotBoard(payload.board);
    setSlotStatsByGame((current) => ({
      ...current,
      [activeGame.id]: {
        spins: (current[activeGame.id]?.spins ?? 0) + 1,
        wagered: Number(((current[activeGame.id]?.wagered ?? 0) + cost).toFixed(2)),
        won: Number(((current[activeGame.id]?.won ?? 0) + payload.result.payout).toFixed(2)),
      },
    }));
    setLastPayout(payload.result.payout);
    setFreeSpinsRemaining((current) =>
      Math.max(0, current - (inFreeSpin ? 1 : 0)) + payload.result.freeSpinsAwarded,
    );

    const parts: string[] = [];

    if (payload.result.lines.length) {
      parts.push(`Linhas ${formatLineSummary(payload.result.lines, activeGame.symbolLabel)}.`);
    }
    if (payload.result.scatterPayout) {
      parts.push(
        `Scatter ${payload.result.scatterCount}x pagou ${currency.format(payload.result.scatterPayout)}.`,
      );
    }
    if (payload.result.freeSpinsAwarded) {
      parts.push(`Free spins +${payload.result.freeSpinsAwarded}.`);
    }
    if (!parts.length) {
      parts.push("Rodada sem premio.");
    }

    setSlotMessage(
      `${parts.join(" ")} Total ${currency.format(payload.result.payout)}${
        inFreeSpin ? " em rodada gratis." : "."
      }`,
    );
  };

  const submitWithdrawal = () => {
    const amount = Number(withdrawAmount) || 0;

    if (amount <= 0 || amount > walletBalance) {
      setSlotMessage("Valor de saque invalido para o saldo atual.");
      return;
    }

    if (!withdrawPixKey.trim()) {
      setSlotMessage("Informe uma chave PIX antes de solicitar saque.");
      return;
    }

    const request: WithdrawalRequest = {
      id: crypto.randomUUID(),
      createdAt: nowLabel(),
      amount,
      pixKey: withdrawPixKey.trim(),
      status: "Em analise",
    };

    setWalletBalance((current) => Number((current - amount).toFixed(2)));
    setWithdrawals((current) => [request, ...current]);
    setWithdrawAmount("150");
    setWithdrawPixKey("");
    setSlotMessage(`Saque de ${currency.format(amount)} enviado para analise.`);
  };

  return (
    <main className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <section className="hero">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-chip">PB</span>
            <div>
              <p className="eyebrow">PulseBet</p>
              <h1>Bet simples, clara e no estilo que o publico brasileiro entende rapido.</h1>
            </div>
          </div>

          <div className="balance-card">
            <span>Saldo principal</span>
            <strong>{currency.format(walletBalance)}</strong>
            <small>
              Pendente em saque: {currency.format(pendingWithdrawals)} - estado salvo no navegador
            </small>
          </div>
        </header>

        <nav className="quick-nav panel">
          <Link className="ghost-link" href="#esportes">
            Esportes
          </Link>
          <Link className="ghost-link" href="#cassino">
            Cassino
          </Link>
          <Link className="ghost-link" href={`/slots/${activeGame.id}`}>
            Jogar slot
          </Link>
          <Link className="ghost-link" href="#saques">
            Saques
          </Link>
          <Link className="ghost-link" href="/admin/sandbox">
            Admin
          </Link>
        </nav>

        <div className="hero-grid">
          <article className="hero-copy panel glass">
            <p className="eyebrow accent">Inicio rapido</p>
            <h2>Aposte em esportes, jogue nos slots e acompanhe tudo no mesmo saldo.</h2>
            <p className="muted">
              A home foi organizada como as bets brasileiras mais conhecidas: atalhos no topo,
              carteira visivel, jogos em destaque, slip lateral e area de saque sem excesso de
              informacao.
            </p>

            <div className="hero-stats">
              <div>
                <strong>{activeStats.spins}</strong>
                <span>spins em {activeGame.title}</span>
              </div>
              <div>
                <strong>{realizedRtp}%</strong>
                <span>RTP realizado</span>
              </div>
              <div>
                <strong>{slotProfile.targetRtp * 100}%</strong>
                <span>meta do perfil</span>
              </div>
            </div>

            <div className="ticker">
              {ticker.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="action-row">
              <Link className="ghost-link" href={`/slots/${activeGame.id}`}>
                Abrir slot
              </Link>
              <Link className="ghost-link" href="/admin/sandbox">
                Painel sandbox
              </Link>
            </div>
          </article>

          <aside className="spotlight panel casino-spotlight">
            <p className="eyebrow accent">Jogo em destaque</p>
            <div className="casino-banner" style={{ background: activeGame.accent }}>
              <div>
                <span>{activeGame.badge}</span>
                <strong>{activeGame.title}</strong>
                <small>{activeGame.demoWin}</small>
              </div>
              <mark>Ao vivo demo</mark>
            </div>

            <div className="spotlight-metrics">
              <div>
                <strong>{currency.format(activeStats.wagered)}</strong>
                <span>Total apostado</span>
              </div>
              <div>
                <strong>{currency.format(activeStats.won)}</strong>
                <span>Total retornado</span>
              </div>
              <div>
                <strong>{freeSpinsRemaining}</strong>
                <span>Free spins restantes</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="casino-section panel glass" id="cassino">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cassino</p>
            <h3>Slots populares com acesso direto e leitura simples.</h3>
          </div>
          <div className="category-row">
            {categories.map((category) => (
              <button
                className={`ghost-button ${casinoCategory === category ? "is-active" : ""}`}
                key={category}
                onClick={() => setCasinoCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="casino-grid">
          <div className="casino-cards">
            {filteredGames.map((game) => (
              <Link
                className={`casino-card ${activeGame.id === game.id ? "active" : ""}`}
                href={`/slots/${game.id}`}
                key={game.id}
                onMouseEnter={() => setActiveGameId(game.id)}
              >
                <div className="casino-card-visual" style={{ background: game.accent }}>
                  <span>{game.badge}</span>
                  <strong>Slot</strong>
                </div>
                <div className="casino-card-copy">
                  <h4>{game.title}</h4>
                  <p>{game.description}</p>
                  <div className="casino-card-meta">
                    <span>{game.demoWin}</span>
                    <span>{game.volatility}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <aside className="launcher panel">
            <div className="launcher-head">
              <div>
                <p className="eyebrow accent">Original slot</p>
                <h3>{activeGame.title}</h3>
              </div>
              <span className="live-pill">
                {freeSpinsRemaining ? `${freeSpinsRemaining} free spins` : "Sandbox"}
              </span>
            </div>

            <div className="launcher-screen" style={{ background: activeGame.accent }}>
              <div className="launcher-overlay">
                <span>Slot proprio</span>
                <strong>{activeGame.title}</strong>
                <p>
                  {activeGame.description} {activeGame.featureLabel}. Ultimo premio:{" "}
                  {currency.format(lastPayout)}.
                </p>
              </div>
              <div
                className="reels slot-grid"
                style={{ gridTemplateColumns: `repeat(${activeGame.reels}, minmax(0, 1fr))` }}
              >
                {slotBoard.map((row, rowIndex) =>
                  row.map((symbol, colIndex) => (
                    <span className={`slot-symbol slot-${symbol.toLowerCase()}`} key={`${rowIndex}-${colIndex}`}>
                      {activeGame.symbolLabel[symbol]}
                    </span>
                  )),
                )}
              </div>
            </div>

            <div className="slot-controls">
              <label className="stake-input">
                <span>Valor por spin</span>
                <input
                  inputMode="decimal"
                  min="1"
                  onChange={(event) => setSlotStake(event.target.value)}
                  type="number"
                  value={slotStake}
                />
              </label>

              <label className="stake-input">
                <span>Perfil matematico demo</span>
                <select
                  className="select-input"
                  onChange={(event) => setSlotProfileId(event.target.value)}
                  value={slotProfileId}
                >
                  {slotProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} - RTP {Math.round(profile.targetRtp * 100)}%
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="launcher-actions">
              <button className="place-bet" onClick={runSlotSpin} type="button">
                {freeSpinsRemaining ? "Usar free spin" : "Girar slot"}
              </button>
              <button
                className="ghost-button"
                onClick={() => setWalletBalance((current) => Number((current + 200).toFixed(2)))}
                type="button"
              >
                Deposito demo +200
              </button>
            </div>

            <div className="responsible-note">
              <strong>{activeGame.featureLabel}</strong>
              <span>{slotProfile.note}</span>
            </div>

            <div className="paytable-grid">
              {activeGame.lineSymbols.map((symbol) => (
                <div className="paytable-card" key={symbol}>
                  <strong>{activeGame.symbolLabel[symbol]}</strong>
                  <span>3x {activeGame.paytable[symbol][3]}x</span>
                  <span>4x {activeGame.paytable[symbol][4]}x</span>
                  <span>5x {activeGame.paytable[symbol][5]}x</span>
                </div>
              ))}
            </div>

            <p className="slot-message">{slotMessage}</p>
          </aside>
        </div>
      </section>

      <section className="wallet-grid">
        <section className="panel glass" id="saques">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Saques</p>
              <h3>Aba funcional para o cliente solicitar retirada.</h3>
            </div>
          </div>

          <div className="withdraw-layout">
            <label className="stake-input">
              <span>Valor do saque</span>
              <input
                inputMode="decimal"
                min="1"
                onChange={(event) => setWithdrawAmount(event.target.value)}
                type="number"
                value={withdrawAmount}
              />
            </label>

            <label className="stake-input">
              <span>Chave PIX</span>
              <input
                onChange={(event) => setWithdrawPixKey(event.target.value)}
                placeholder="email, cpf ou telefone"
                type="text"
                value={withdrawPixKey}
              />
            </label>

            <button className="place-bet" onClick={submitWithdrawal} type="button">
              Solicitar saque
            </button>
          </div>

          <div className="slip-summary">
            <div>
              <span>Saldo disponivel</span>
              <strong>{currency.format(walletBalance)}</strong>
            </div>
            <div>
              <span>Em analise</span>
              <strong>{currency.format(pendingWithdrawals)}</strong>
            </div>
          </div>
        </section>

        <aside className="panel glass">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Historico de saques</p>
              <h3>Fila local de solicitacoes.</h3>
            </div>
          </div>
          <div className="selection-list">
            {withdrawals.length ? (
              withdrawals.map((withdrawal) => (
                <div className="selection-item" key={withdrawal.id}>
                  <div>
                    <strong>{currency.format(withdrawal.amount)}</strong>
                    <span>{withdrawal.createdAt} - {withdrawal.pixKey}</span>
                  </div>
                  <b>{withdrawal.status}</b>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nenhum saque registrado</strong>
                <span>As solicitacoes aparecem aqui assim que o cliente enviar.</span>
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="content-grid" id="esportes">
        <section className="matches-area">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Esportes</p>
              <h3>Jogos em destaque com odds diretas e bilhete facil de fechar.</h3>
            </div>
            <button className="ghost-button" type="button">
              Todos os esportes
            </button>
          </div>

          <div className="match-list">
            {featuredMatches.map((match) => (
              <article className="match-card panel glass" key={match.id}>
                <div className="match-header">
                  <div>
                    <p>{match.league}</p>
                    <strong>{match.home}</strong>
                    <strong>{match.away}</strong>
                  </div>
                  <div className="match-meta">
                    {match.live ? <span className="live-pill">Ao vivo</span> : null}
                    <small>{match.live ? match.minute : match.kickoff}</small>
                    {match.score ? <strong>{match.score}</strong> : null}
                  </div>
                </div>

                <div className="markets">
                  {match.markets.map((market) => {
                    const active = selections.some(
                      (selection) =>
                        selection.matchId === match.id && selection.marketId === market.id,
                    );

                    return (
                      <button
                        className={`market-button ${active ? "active" : ""}`}
                        key={market.id}
                        onClick={() => toggleSelection(match, market)}
                        type="button"
                      >
                        <span>{market.label}</span>
                        <strong>{market.odds.toFixed(2)}</strong>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="betslip panel">
          <div className="betslip-head">
            <div>
              <p className="eyebrow accent">Bet slip</p>
              <h3>Fechamento de aposta</h3>
            </div>
            <span>{selections.length} selecoes</span>
          </div>

          <div className="selection-list">
            {selections.length ? (
              selections.map((selection) => (
                <div className="selection-item" key={`${selection.matchId}-${selection.marketId}`}>
                  <div>
                    <strong>{selection.marketLabel}</strong>
                    <span>{selection.matchLabel}</span>
                  </div>
                  <b>{selection.odds.toFixed(2)}</b>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <strong>Nenhuma odd selecionada</strong>
                <span>Clique em qualquer mercado para montar seu bilhete.</span>
              </div>
            )}
          </div>

          <label className="stake-input">
            <span>Valor da aposta</span>
            <input
              inputMode="decimal"
              min="0"
              onChange={(event) => setSportsStake(event.target.value)}
              type="number"
              value={sportsStake}
            />
          </label>

          <div className="slip-summary">
            <div>
              <span>Odds combinadas</span>
              <strong>{combinedOdds ? combinedOdds.toFixed(2) : "--"}</strong>
            </div>
            <div>
              <span>Retorno potencial</span>
              <strong>{potentialReturn ? currency.format(potentialReturn) : "--"}</strong>
            </div>
          </div>

          <button className="place-bet" onClick={placeSportsBet} type="button">
            Apostar agora
          </button>

          <div className="responsible-note">
            <strong>Jogo responsavel</strong>
            <span>Em producao, conecte isso a KYC, limites e trilha de auditoria.</span>
          </div>
        </aside>
      </section>

      <section className="history-section panel glass">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Atividade</p>
            <h3>Historico de apostas esportivas e estado atual da carteira demo.</h3>
          </div>
        </div>

        <div className="history-grid">
          {placedBets.map((bet) => (
            <article className="history-card" key={bet.id}>
              <span>{bet.createdAt}</span>
              <strong>{bet.selections} selecoes - {bet.status}</strong>
              <p>
                Stake {currency.format(bet.stake)} - odds {bet.combinedOdds.toFixed(2)}
              </p>
              <b>{currency.format(bet.potentialReturn)}</b>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
