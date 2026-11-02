// Writes the current poe.ninja league for each game into leagues.json.
// The website reads that file so the "Find Builds" button always opens the current league.
// Run with Node 18 or newer: node tools/update-leagues.mjs
import { readFile, writeFile } from "node:fs/promises";

const GAMES = {
  poe2: "https://poe.ninja/poe2/api/data/build-index-state",
  poe1: "https://poe.ninja/poe1/api/data/build-index-state",
};
const OUTPUT = new URL("../leagues.json", import.meta.url);

// poe.ninja lists the newest league first. We want the newest active challenge league
// in its plain softcore trade version (not Hardcore, SSF, Ruthless, events or private leagues).
export function pickCurrentLeague(leagueBuilds) {
  const league = leagueBuilds.find((entry) => {
    return (
      entry.status === 0 &&
      entry.category === 0 &&
      entry.hardcore === false &&
      !/^(HC|Hardcore|SSF|Ruthless|R)\b/i.test(entry.leagueName) &&
      !/qualifier|event|\(PL\d+\)/i.test(entry.leagueName) &&
      /^[a-z0-9]+$/.test(entry.leagueUrl)
    );
  });

  return league ? league.leagueUrl : null;
}

async function main() {
  const previous = JSON.parse(await readFile(OUTPUT, "utf8").catch(() => "{}"));
  const next = { ...previous };
  let changed = false;

  for (const [game, url] of Object.entries(GAMES)) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "class-picker-league-updater" } });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const league = pickCurrentLeague((await response.json()).leagueBuilds || []);

      if (!league) {
        throw new Error("no current league found");
      }

      if (next[game] !== league) {
        console.log(`${game}: ${next[game] || "(none)"} -> ${league}`);
        next[game] = league;
        changed = true;
      } else {
        console.log(`${game}: still ${league}`);
      }
    } catch (error) {
      // Keep the last known league rather than writing something wrong.
      console.warn(`${game}: kept ${next[game] || "(none)"} (${error.message})`);
    }
  }

  if (changed) {
    next.updatedAt = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    await writeFile(OUTPUT, `${JSON.stringify(next, null, 2)}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("update-leagues.mjs")) {
  main();
}
