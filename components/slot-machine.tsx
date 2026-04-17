"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { slotProfiles, type SlotGame, type SlotProfile, type SlotSymbol } from "@/data/slots";

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
type SlotOverride = {
  profileId?: string;
  hitRate?: number;
  multiplierBoost?: number;
  freeSpinMultiplier?: number;
};

const walletKey = "pulsebet-slot-wallet";
const storagePrefix = "pulsebet-slot-machine";
const adminPrefix = "pulsebet-slot-admin";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function randomSymbol(pool: SlotSymbol[], exclude?: SlotSymbol) {
  const source = exclude ? pool.filter((symbol) => symbol !== exclude) : pool;
  return source[Math.floor(Math.random() * source.length)];
}

function createRandomBoard(game: SlotGame) {
  return Array.from({ length: game.rows }, () =>
    Array.from({ length: game.reels }, () => randomSymbol(game.symbols)),
  );
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
  freeSpinMultiplier: number,
): SpinResult {
  const lines: WinLine[] = [];
  const scatterCount = board.flat().filter((symbol) => symbol === game.scatterSymbol).length;

  game.paylines.forEach((line, lineIndex) => {
    const values = line.map((row, reelIndex) => board[row][reelIndex]);
    const baseSymbol = values.find(
      (value) => value !== game.wildSymbol && value !== game.scatterSymbol,
    );
    if (!baseSymbol) return;

    let count = 0;
    let usedWild = false;
    for (const value of values) {
      if (value === baseSymbol || value === game.wildSymbol) {
        if (value === game.wildSymbol) usedWild = true;
        count += 1;
      } else {
        break;
      }
    }
    if (count < 3) return;

    const baseMultiplier = game.paytable[baseSymbol]?.[count];
    if (!baseMultiplier) return;

    let payoutMultiplier = baseMultiplier * profile.multiplierBoost;
    if (usedWild && game.wildLineBonus) payoutMultiplier += game.wildLineBonus;
    if (inFreeSpin) payoutMultiplier *= freeSpinMultiplier;

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
    (stake * scatterMultiplier * (inFreeSpin ? freeSpinMultiplier : 1)).toFixed(2),
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

function formatLineSummary(lines: WinLine[], labels: Record<SlotSymbol, string>) {
  return lines
    .map((line) => {
      const suffix = line.usedWild ? " +wild" : "";
      return `L${line.lineIndex} ${labels[line.symbol]} x${line.count}${suffix}`;
    })
    .join(" | ");
}

export function SlotMachine({ game }: { game: SlotGame }) {
  const [walletBalance, setWalletBalance] = useState(0);
  const [slotStake, setSlotStake] = useState("5");
  const [profileId, setProfileId] = useState(slotProfiles[1].id);
  const [board, setBoard] = useState<SlotBoard>(game.initialBoard);
  const [message, setMessage] = useState(`${game.title} carregado.`);
  const [lastPayout, setLastPayout] = useState(0);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [stats, setStats] = useState<SlotStats>({ spins: 0, wagered: 0, won: 0 });
  const [override, setOverride] = useState<SlotOverride>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const rawWallet = window.localStorage.getItem(walletKey);
    const rawStats = window.localStorage.getItem(`${storagePrefix}:${game.id}`);
    const rawAdmin = window.localStorage.getItem(`${adminPrefix}:${game.id}`);

    setWalletBalance(rawWallet ? Number(rawWallet) : 1280.45);

    if (rawStats) {
      const parsed = JSON.parse(rawStats) as {
        stats?: SlotStats;
        freeSpinsRemaining?: number;
        profileId?: string;
      };
      setStats(parsed.stats ?? { spins: 0, wagered: 0, won: 0 });
      setFreeSpinsRemaining(parsed.freeSpinsRemaining ?? 0);
      setProfileId(parsed.profileId ?? slotProfiles[1].id);
    }

    if (rawAdmin) {
      setOverride(JSON.parse(rawAdmin) as SlotOverride);
    }

    setHydrated(true);
  }, [game.id]);

  useEffect(() => {
    setBoard(game.initialBoard);
    setMessage(`${game.title} carregado. ${game.featureLabel}.`);
  }, [game]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(walletKey, walletBalance.toFixed(2));
    window.localStorage.setItem(
      `${storagePrefix}:${game.id}`,
      JSON.stringify({ stats, freeSpinsRemaining, profileId }),
    );
  }, [freeSpinsRemaining, game.id, hydrated, profileId, stats, walletBalance]);

  const selectedProfile = useMemo(() => {
    const base = slotProfiles.find((profile) => profile.id === profileId) ?? slotProfiles[1];
    return {
      ...base,
      hitRate: override.hitRate ?? base.hitRate,
      multiplierBoost: override.multiplierBoost ?? base.multiplierBoost,
    };
  }, [override.hitRate, override.multiplierBoost, profileId]);

  const activeFreeSpinMultiplier = override.freeSpinMultiplier ?? game.freeSpinMultiplier;
  const realizedRtp = stats.wagered ? Number(((stats.won / stats.wagered) * 100).toFixed(1)) : 0;

  const spin = () => {
    const stake = Number(slotStake) || 0;
    const inFreeSpin = freeSpinsRemaining > 0;
    if (!inFreeSpin && (stake <= 0 || stake > walletBalance)) {
      setMessage("Saldo insuficiente para girar.");
      return;
    }

    const nextBoard = createRandomBoard(game);
    if (Math.random() < 0.1) injectScatter(nextBoard, game, [3, 3, 4, 5][Math.floor(Math.random() * 4)]);

    const result = evaluateBoard(
      nextBoard,
      stake,
      selectedProfile,
      game,
      inFreeSpin,
      activeFreeSpinMultiplier,
    );

    const cost = inFreeSpin ? 0 : stake;
    setBoard(nextBoard);
    setWalletBalance(Number((walletBalance - cost + result.payout).toFixed(2)));
    setLastPayout(result.payout);
    setFreeSpinsRemaining(
      Math.max(0, freeSpinsRemaining - (inFreeSpin ? 1 : 0)) + result.freeSpinsAwarded,
    );
    setStats((current) => ({
      spins: current.spins + 1,
      wagered: Number((current.wagered + cost).toFixed(2)),
      won: Number((current.won + result.payout).toFixed(2)),
    }));

    const parts: string[] = [];
    if (result.lines.length) {
      parts.push(`Linhas ${formatLineSummary(result.lines, game.symbolLabel)}.`);
    }
    if (result.scatterPayout) {
      parts.push(`Scatter ${result.scatterCount}x pagou ${currency.format(result.scatterPayout)}.`);
    }
    if (result.freeSpinsAwarded) {
      parts.push(`Free spins +${result.freeSpinsAwarded}.`);
    }
    if (!parts.length) {
      parts.push("Rodada sem premio.");
    }
    setMessage(
      `${parts.join(" ")} Total ${currency.format(result.payout)}${
        inFreeSpin ? " em rodada gratis." : "."
      }`,
    );
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
              <p className="eyebrow">PulseBet Slot</p>
              <h1>{game.title}</h1>
            </div>
          </div>

          <div className="balance-card">
            <span>Saldo da carteira demo</span>
            <strong>{currency.format(walletBalance)}</strong>
            <small>
              Perfil: {selectedProfile.name} - free spins: {freeSpinsRemaining}
            </small>
          </div>
        </header>

        <div className="hero-grid">
          <article className="hero-copy panel glass">
            <p className="eyebrow accent">Gameplay</p>
            <h2>{game.featureLabel}</h2>
            <p className="muted">{game.description}</p>
            <div className="hero-stats">
              <div>
                <strong>{stats.spins}</strong>
                <span>spins</span>
              </div>
              <div>
                <strong>{realizedRtp}%</strong>
                <span>RTP realizado</span>
              </div>
              <div>
                <strong>{currency.format(lastPayout)}</strong>
                <span>ultimo premio</span>
              </div>
            </div>
            <div className="action-row">
              <Link className="ghost-link" href="/">
                Voltar ao lobby
              </Link>
              <Link className="ghost-link" href="/admin/sandbox">
                Abrir admin sandbox
              </Link>
            </div>
          </article>

          <aside className="launcher panel">
            <div className="launcher-head">
              <div>
                <p className="eyebrow accent">Sandbox</p>
                <h3>{game.title}</h3>
              </div>
              <span className="live-pill">{freeSpinsRemaining ? `${freeSpinsRemaining} free spins` : "demo"}</span>
            </div>

            <div className="launcher-screen" style={{ background: game.accent }}>
              <div className="launcher-overlay">
                <span>Slot proprio</span>
                <strong>{game.title}</strong>
                <p>{message}</p>
              </div>
              <div
                className="reels slot-grid"
                style={{ gridTemplateColumns: `repeat(${game.reels}, minmax(0, 1fr))` }}
              >
                {board.map((row, rowIndex) =>
                  row.map((symbol, colIndex) => (
                    <span className={`slot-symbol slot-${symbol.toLowerCase()}`} key={`${rowIndex}-${colIndex}`}>
                      {game.symbolLabel[symbol]}
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
                <span>Perfil matematico</span>
                <select className="select-input" onChange={(event) => setProfileId(event.target.value)} value={profileId}>
                  {slotProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} - RTP {Math.round(profile.targetRtp * 100)}%
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="launcher-actions">
              <button className="place-bet" onClick={spin} type="button">
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

            <div className="paytable-grid">
              {game.lineSymbols.map((symbol) => (
                <div className="paytable-card" key={symbol}>
                  <strong>{game.symbolLabel[symbol]}</strong>
                  <span>3x {game.paytable[symbol][3]}x</span>
                  <span>4x {game.paytable[symbol][4]}x</span>
                  <span>5x {game.paytable[symbol][5]}x</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
