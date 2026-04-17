"use client";

import { useEffect, useState } from "react";
import { slotGames, slotProfiles } from "@/data/slots";

type SlotOverride = {
  profileId?: string;
  hitRate?: number;
  multiplierBoost?: number;
  freeSpinMultiplier?: number;
};

const storagePrefix = "pulsebet-slot-admin";

export function AdminSandboxPanel() {
  const [overrides, setOverrides] = useState<Record<string, SlotOverride>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next: Record<string, SlotOverride> = {};
    slotGames.forEach((game) => {
      const raw = window.localStorage.getItem(`${storagePrefix}:${game.id}`);
      next[game.id] = raw ? (JSON.parse(raw) as SlotOverride) : {};
    });
    setOverrides(next);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    Object.entries(overrides).forEach(([gameId, value]) => {
      window.localStorage.setItem(`${storagePrefix}:${gameId}`, JSON.stringify(value));
    });
  }, [hydrated, overrides]);

  return (
    <main className="page-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <section className="hero">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-chip">PB</span>
            <div>
              <p className="eyebrow">Admin Sandbox</p>
              <h1>Ajustes locais de matematica para os tres slots.</h1>
            </div>
          </div>
        </header>

        <div className="admin-grid">
          {slotGames.map((game) => {
            const current = overrides[game.id] ?? {};
            return (
              <section className="panel glass" key={game.id}>
                <p className="eyebrow accent">{game.title}</p>
                <h3>{game.featureLabel}</h3>
                <div className="slot-controls">
                  <label className="stake-input">
                    <span>Perfil padrao</span>
                    <select
                      className="select-input"
                      onChange={(event) =>
                        setOverrides((state) => ({
                          ...state,
                          [game.id]: { ...state[game.id], profileId: event.target.value },
                        }))
                      }
                      value={current.profileId ?? slotProfiles[1].id}
                    >
                      {slotProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="stake-input">
                    <span>Hit rate</span>
                    <input
                      max="0.95"
                      min="0.01"
                      onChange={(event) =>
                        setOverrides((state) => ({
                          ...state,
                          [game.id]: { ...state[game.id], hitRate: Number(event.target.value) },
                        }))
                      }
                      step="0.01"
                      type="number"
                      value={current.hitRate ?? slotProfiles[1].hitRate}
                    />
                  </label>

                  <label className="stake-input">
                    <span>Multiplier boost</span>
                    <input
                      max="3"
                      min="0.5"
                      onChange={(event) =>
                        setOverrides((state) => ({
                          ...state,
                          [game.id]: { ...state[game.id], multiplierBoost: Number(event.target.value) },
                        }))
                      }
                      step="0.05"
                      type="number"
                      value={current.multiplierBoost ?? slotProfiles[1].multiplierBoost}
                    />
                  </label>

                  <label className="stake-input">
                    <span>Free spin multiplier</span>
                    <input
                      max="5"
                      min="1"
                      onChange={(event) =>
                        setOverrides((state) => ({
                          ...state,
                          [game.id]: { ...state[game.id], freeSpinMultiplier: Number(event.target.value) },
                        }))
                      }
                      step="0.1"
                      type="number"
                      value={current.freeSpinMultiplier ?? game.freeSpinMultiplier}
                    />
                  </label>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
