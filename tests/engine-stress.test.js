/* Prueba de estrés del motor: recorre tamaños, participantes y resultados aleatorios (semilla fija). */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { Date, Math, Number, JSON, Error };
context.window = context;
vm.createContext(context);
for (const file of ["ParticipantPool.js", "BracketEngine.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "structures", file), "utf8"), context, { filename: file });
}
const { BracketEngine, ParticipantPool } = context;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function players(n) {
  return Array.from({ length: n }, (_, i) => ({ id: "p" + (i + 1), name: "P" + (i + 1), faculty: "F", poolPoints: n - i }));
}
function play(engine, bracket, random) {
  let guard = 0;
  while (bracket.status !== "COMPLETED") {
    const match = bracket.matches.find((m) => m.status !== "COMPLETED" && m.status !== "NOT_NEEDED" &&
      m.a && m.b && !m.a.isBye && !m.b.isBye);
    assert.ok(match, "debe existir una partida jugable mientras el torneo no termina");
    const aWins = random() < 0.5;
    bracket = engine.recordResult(bracket, match.id, aWins ? 2 : 0, aWins ? 0 : 2);
    assert.ok(++guard < 1000, "el torneo no debe quedar en bucle");
  }
  return bracket;
}

const sizes = [2, 4, 8, 16, 32];
for (const capacity of sizes) {
  for (const format of ["SIMPLE", "DOBLE"]) {
    for (const thirdPlace of [true, false]) {
      test(`bracket ${format} capacity ${capacity} thirdPlace=${thirdPlace} completes for all entrant counts`, () => {
        const engine = new BracketEngine();
        const random = rng(capacity * 31 + (format === "DOBLE" ? 7 : 0) + (thirdPlace ? 3 : 0));
        const counts = [2, 3, Math.ceil(capacity / 2), capacity - 1, capacity].filter((n) => n >= 2 && n <= capacity);
        for (const n of new Set(counts)) {
          for (let run = 0; run < 4; run += 1) {
            const qualified = new ParticipantPool(players(n)).qualify(capacity);
            let bracket = engine.generate(qualified, capacity, format, thirdPlace);
            bracket = play(engine, bracket, random);
            const ids = new Set(qualified.map((p) => p.id));
            assert.ok(ids.has(bracket.championId), `campeón fuera del pool (n=${n})`);
            assert.ok(ids.has(bracket.runnerUpId), `subcampeón fuera del pool (n=${n})`);
            assert.notEqual(bracket.championId, bracket.runnerUpId, `campeón y subcampeón repetidos (n=${n})`);
            if (thirdPlace && n >= 3) {
              assert.ok(ids.has(bracket.thirdPlaceId), `sin tercer puesto (n=${n}, ${format})`);
              assert.notEqual(bracket.thirdPlaceId, bracket.championId, `tercer puesto repetido con campeón (n=${n})`);
              assert.notEqual(bracket.thirdPlaceId, bracket.runnerUpId, `tercer puesto repetido con subcampeón (n=${n})`);
            }
          }
        }
      });
    }
  }
}
