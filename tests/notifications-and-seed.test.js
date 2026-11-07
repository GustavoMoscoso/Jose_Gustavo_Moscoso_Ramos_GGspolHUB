/* Pruebas de avisos al armar llaves y del seed de demostración. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = { Date, Math, Number, JSON, Error, String };
context.window = context;
vm.createContext(context);
for (const file of ["config/datos.js", "structures/ParticipantPool.js", "structures/BracketEngine.js", "services/NotificationService.js"]) {
  const full = path.join(__dirname, "..", "js", file.startsWith("config") ? "" : "", file);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", file), "utf8"), context, { filename: file });
}
const { BracketEngine, NotificationService, GGSPOL_crearDatosDemo } = context;

function players(n) {
  return Array.from({ length: n }, (_, i) => ({ id: "p" + (i + 1), name: "Equipo " + (i + 1), email: "e" + (i + 1) + "@x.com", poolPoints: n - i }));
}

test("bracket notices give each participant the date and a real first rival", () => {
  const engine = new BracketEngine();
  const bracket = engine.generate(players(4), 4, "SIMPLE", true);
  const torneo = { name: "Copa Prueba", startDate: "2026-11-20" };
  const avisos = NotificationService.llaves(torneo, bracket);
  assert.equal(avisos.length, 4);
  for (const aviso of avisos) {
    assert.match(aviso.message, /Fecha de inicio: 20\/11\/2026/);
    assert.match(aviso.message, /Tu primer rival: Equipo \d/);
    assert.equal(aviso.simulated, true);
  }
  // La primera ronda de 4 enfrenta a seeds 1-4 y 2-3: el rival de cada participante es el de su partida.
  const first = avisos.find((aviso) => aviso.email === "e1@x.com");
  const match = bracket.matches.find((m) => m.stage === "WINNERS" && m.round === 1 && m.a.id === "p1");
  assert.match(first.message, new RegExp("Tu primer rival: " + match.b.name + "\\."));
});

test("a BYE in the first round is reported as direct passage, not as a real rival", () => {
  const engine = new BracketEngine();
  const bracket = engine.generate(players(3), 4, "SIMPLE", false);
  const avisos = NotificationService.llaves({ name: "T", startDate: "" }, bracket);
  assert.ok(avisos.some((aviso) => /Pase directo \(BYE\)/.test(aviso.message)));
  assert.ok(avisos.every((aviso) => /Fecha de inicio: Por anunciar/.test(aviso.message)));
});

test("registration notices name the tournament and state the outcome", () => {
  const torneo = { name: "Smash Open" };
  const reg = { email: "a@b.com" };
  assert.match(NotificationService.aprobacion(reg, torneo).subject, /aprobada · Smash Open/);
  assert.match(NotificationService.rechazo(reg, torneo).subject, /rechazada · Smash Open/);
  assert.match(NotificationService.recepcion(reg, torneo).subject, /Solicitud recibida · Smash Open/);
});

test("demo seed contains one finished, one running and one open tournament with valid brackets", () => {
  const datos = GGSPOL_crearDatosDemo();
  const estados = [...datos.tournaments.map((t) => t.status)].sort();
  assert.deepEqual(estados, ["CULMINADO", "EN_CURSO", "INSCRIPCIONES"]);
  const culminado = datos.tournaments.find((t) => t.status === "CULMINADO");
  assert.equal(culminado.bracket.status, "COMPLETED");
  assert.ok(culminado.bracket.championId);
  const enCurso = datos.tournaments.find((t) => t.status === "EN_CURSO");
  assert.equal(enCurso.bracket.format, "DOBLE");
  assert.equal(enCurso.bracket.status, "IN_PROGRESS");
});
