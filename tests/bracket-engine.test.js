const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const browserContext = { Date, Math, Number, JSON };
browserContext.window = browserContext;
vm.createContext(browserContext);

for (const file of ["ParticipantPool.js", "BracketEngine.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "structures", file), "utf8");
  vm.runInContext(source, browserContext, { filename: file });
}

const BracketEngine = browserContext.BracketEngine;
const ParticipantPool = browserContext.ParticipantPool;

function createParticipants(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: "p" + (index + 1),
    name: "Player " + (index + 1),
    faculty: "F" + (index + 1),
    poolPoints: count - index
  }));
}

function finishBracket(engine, bracket, winnerA) {
  let attempts = 0;
  while (bracket.status !== "COMPLETED" && attempts < 500) {
    const match = bracket.matches.find((item) =>
      item.status !== "COMPLETED" && item.status !== "NOT_NEEDED" &&
      item.a && item.b && !item.a.isBye && !item.b.isBye
    );
    assert.ok(match, "the bracket should always have a playable match until completion");
    const aWins = typeof winnerA === "function" ? winnerA(match, attempts) : winnerA;
    bracket = engine.recordResult(bracket, match.id, aWins ? 2 : 0, aWins ? 0 : 2);
    attempts += 1;
  }
  assert.equal(bracket.status, "COMPLETED");
  return bracket;
}

test("ParticipantPool ranks by points and selects the configured cut", () => {
  const pool = new ParticipantPool(createParticipants(5));
  assert.deepEqual(pool.qualify(4).map((participant) => participant.id), ["p1", "p2", "p3", "p4"]);
});

test("ParticipantPool rejects invalid capacities and fewer than two entrants", () => {
  assert.throws(() => new ParticipantPool(createParticipants(3)).qualify(6), /potencia de 2/);
  assert.throws(() => new ParticipantPool(createParticipants(1)).qualify(4), /al menos dos/);
});

test("single elimination handles byes and completes a third-place match", () => {
  const engine = new BracketEngine();
  const bracket = finishBracket(engine, engine.generate(createParticipants(4), 8, "SIMPLE", true), true);
  assert.ok(bracket.championId);
  assert.ok(bracket.runnerUpId);
  assert.ok(bracket.thirdPlaceId);
  assert.equal(bracket.matches.some((match) =>
    (match.a && match.a.isBye) || (match.b && match.b.isBye)
  ), true);
});

test("single elimination derives third place automatically with three entrants", () => {
  const engine = new BracketEngine();
  const bracket = finishBracket(engine, engine.generate(createParticipants(3), 8, "SIMPLE", true), true);
  assert.ok(bracket.thirdPlaceId);
  assert.equal(bracket.thirdPlaceMatchId, undefined);
});

test("double elimination ends without a reset when the winners champion wins", () => {
  const engine = new BracketEngine();
  const bracket = finishBracket(engine, engine.generate(createParticipants(6), 8, "DOBLE", true), true);
  assert.ok(bracket.championId);
  assert.ok(bracket.runnerUpId);
  assert.ok(bracket.thirdPlaceId);
  assert.equal(bracket.matches.find((match) => match.stage === "GRAND_FINAL_RESET").status, "NOT_NEEDED");
});

test("double elimination requires and completes a reset when the losers champion wins", () => {
  const engine = new BracketEngine();
  const bracket = finishBracket(engine, engine.generate(createParticipants(4), 4, "DOBLE", true), false);
  assert.ok(bracket.championId);
  assert.notEqual(bracket.championId, bracket.matches.find((match) => match.stage === "GRAND_FINAL").a.id);
  assert.equal(bracket.matches.find((match) => match.stage === "GRAND_FINAL_RESET").status, "COMPLETED");
});

test("double elimination advances empty BYE matches even when only two of eight slots qualify", () => {
  const engine = new BracketEngine();
  const bracket = finishBracket(engine, engine.generate(createParticipants(2), 8, "DOBLE", true), false);
  assert.ok(bracket.championId);
  assert.ok(bracket.runnerUpId);
});

test("changing a semifinal winner invalidates results that depended on it", () => {
  const engine = new BracketEngine();
  let bracket = engine.generate(createParticipants(4), 4, "SIMPLE", true);
  const semifinals = bracket.matches.filter((match) => match.stage === "WINNERS" && match.round === 1);
  bracket = engine.recordResult(bracket, semifinals[0].id, 2, 0);
  bracket = engine.recordResult(bracket, semifinals[1].id, 2, 0);
  const final = bracket.matches.find((match) => match.id === bracket.finalMatchId);
  bracket = engine.recordResult(bracket, final.id, 2, 0);
  const revisedSemifinal = bracket.matches.find((match) => match.id === semifinals[0].id);
  bracket = engine.recordResult(bracket, revisedSemifinal.id, 0, 2);
  const revisedFinal = bracket.matches.find((match) => match.id === bracket.finalMatchId);
  assert.equal(revisedFinal.status, "WAITING");
  assert.equal(bracket.championId, null);
});

test("result validation rejects ties and matches without two ready participants", () => {
  const engine = new BracketEngine();
  const bracket = engine.generate(createParticipants(2), 2, "SIMPLE", false);
  const match = bracket.matches[0];
  assert.throws(() => engine.recordResult(bracket, match.id, 1, 1), /no puede terminar empatada/);
  assert.throws(() => engine.recordResult(bracket, "missing", 2, 0), /No se encontró/);
});
