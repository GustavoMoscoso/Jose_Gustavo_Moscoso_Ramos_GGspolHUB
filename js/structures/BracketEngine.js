/* Construye los brackets y mueve ganadores/perdedores sin depender de APIs externas. */
(function (root) {
  "use strict";

  function clone(value) {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function isParticipant(slot) {
    return Boolean(slot && slot.id && !slot.isBye);
  }

  function BracketEngine() {}

  BracketEngine.prototype.generate = function (participants, capacity, format, thirdPlace) {
    if (!Number.isInteger(capacity) || capacity < 2 || (capacity & (capacity - 1)) !== 0) {
      throw new Error("El tamaño del bracket debe ser una potencia de 2 mayor o igual a 2.");
    }
    if (!Array.isArray(participants) || participants.length < 2) {
      throw new Error("Se necesitan al menos dos clasificados para crear las llaves.");
    }
    if (participants.length > capacity) {
      throw new Error("La cantidad de clasificados no puede superar el tamaño del bracket.");
    }
    if (format !== "SIMPLE" && format !== "DOBLE") {
      throw new Error("Formato de eliminación no reconocido.");
    }

    var seeded = participants.slice();
    while (seeded.length < capacity) seeded.push({ id: "BYE-" + seeded.length, name: "BYE", isBye: true });

    var rounds = Math.log2(capacity);
    var bracket = {
      format: format,
      capacity: capacity,
      participants: clone(participants),
      matches: [],
      championId: null,
      runnerUpId: null,
      thirdPlaceId: null,
      thirdPlaceEnabled: Boolean(thirdPlace),
      status: "IN_PROGRESS"
    };

    if (format === "SIMPLE") {
      this._generateSingle(bracket, seeded, rounds);
    } else {
      this._generateDouble(bracket, seeded, rounds);
    }
    this._advanceByes(bracket);
    this._refresh(bracket);
    return bracket;
  };

  BracketEngine.prototype._seedOrder = function (capacity) {
    var order = [1, 2];
    while (order.length < capacity) {
      var next = [];
      var size = order.length * 2 + 1;
      order.forEach(function (seed) {
        next.push(seed);
        next.push(size - seed);
      });
      order = next;
    }
    return order;
  };

  BracketEngine.prototype._createMatch = function (bracket, stage, round, number) {
    var match = {
      id: stage + "-R" + round + "-M" + number,
      stage: stage,
      round: round,
      number: number,
      a: null,
      b: null,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      loserId: null,
      status: "WAITING",
      nextWinner: null,
      nextLoser: null
    };
    bracket.matches.push(match);
    return match;
  };

  BracketEngine.prototype._connect = function (from, property, to, slot) {
    from[property] = { matchId: to.id, slot: slot };
  };

  BracketEngine.prototype._generateSingle = function (bracket, seeded, rounds) {
    var roundsList = [];
    var round;
    var i;
    for (round = 1; round <= rounds; round += 1) {
      var count = bracket.capacity / Math.pow(2, round);
      var matches = [];
      for (i = 0; i < count; i += 1) matches.push(this._createMatch(bracket, "WINNERS", round, i + 1));
      roundsList.push(matches);
    }
    roundsList.forEach(function (matches, roundIndex) {
      matches.forEach(function (match, index) {
        if (roundIndex < roundsList.length - 1) {
          var next = roundsList[roundIndex + 1][Math.floor(index / 2)];
          this._connect(match, "nextWinner", next, index % 2 === 0 ? "a" : "b");
        }
      }, this);
    }, this);

    var seedOrder = this._seedOrder(bracket.capacity);
    var seeds = {};
    seeded.forEach(function (participant, index) { seeds[index + 1] = participant; });
    roundsList[0].forEach(function (match, index) {
      match.a = clone(seeds[seedOrder[index * 2]]);
      match.b = clone(seeds[seedOrder[index * 2 + 1]]);
    });

    if (bracket.thirdPlaceEnabled && rounds >= 2 && bracket.participants.length >= 4) {
      var bronze = this._createMatch(bracket, "THIRD_PLACE", rounds, 1);
      var semifinalMatches = roundsList[rounds - 2];
      this._connect(semifinalMatches[0], "nextLoser", bronze, "a");
      this._connect(semifinalMatches[1], "nextLoser", bronze, "b");
      bracket.thirdPlaceMatchId = bronze.id;
    } else if (bracket.thirdPlaceEnabled && bracket.participants.length === 3) {
      bracket.thirdPlaceAuto = true;
    }
    bracket.finalMatchId = roundsList[rounds - 1][0].id;
  };

  BracketEngine.prototype._generateDouble = function (bracket, seeded, rounds) {
    var winnersRounds = [];
    var losersRounds = [];
    var round;
    var index;
    for (round = 1; round <= rounds; round += 1) {
      var matches = [];
      for (index = 0; index < bracket.capacity / Math.pow(2, round); index += 1) {
        matches.push(this._createMatch(bracket, "WINNERS", round, index + 1));
      }
      winnersRounds.push(matches);
    }
    for (round = 1; round <= Math.max(0, rounds * 2 - 2); round += 1) {
      var exponent = Math.floor((round + 1) / 2) + 1;
      var losersCount = bracket.capacity / Math.pow(2, exponent);
      matches = [];
      for (index = 0; index < losersCount; index += 1) {
        matches.push(this._createMatch(bracket, "LOSERS", round, index + 1));
      }
      losersRounds.push(matches);
    }

    var grandFinal = this._createMatch(bracket, "GRAND_FINAL", 1, 1);
    var resetFinal = this._createMatch(bracket, "GRAND_FINAL_RESET", 2, 1);
    bracket.grandFinalMatchId = grandFinal.id;
    bracket.resetFinalMatchId = resetFinal.id;
    bracket.finalMatchId = grandFinal.id;

    winnersRounds.forEach(function (matchesInRound, roundIndex) {
      matchesInRound.forEach(function (match, matchIndex) {
        if (roundIndex < winnersRounds.length - 1) {
          this._connect(match, "nextWinner", winnersRounds[roundIndex + 1][Math.floor(matchIndex / 2)], matchIndex % 2 === 0 ? "a" : "b");
        } else {
          this._connect(match, "nextWinner", grandFinal, "a");
        }

        if (roundIndex === winnersRounds.length - 1) {
          var finalLosers = losersRounds[losersRounds.length - 1];
          this._connect(match, "nextLoser", finalLosers ? finalLosers[matchIndex] : grandFinal, "b");
        } else if (roundIndex === 0) {
          var firstLosers = losersRounds[0];
          this._connect(match, "nextLoser", firstLosers[Math.floor(matchIndex / 2)], matchIndex % 2 === 0 ? "a" : "b");
        } else {
          var loserRound = losersRounds[roundIndex * 2 - 1];
          this._connect(match, "nextLoser", loserRound[matchIndex], "b");
        }
      }, this);
    }, this);

    losersRounds.forEach(function (matchesInRound, roundIndex) {
      matchesInRound.forEach(function (match, matchIndex) {
        if (roundIndex === losersRounds.length - 1) {
          this._connect(match, "nextWinner", grandFinal, "b");
        } else if (roundIndex % 2 === 0) {
          this._connect(match, "nextWinner", losersRounds[roundIndex + 1][matchIndex], "a");
        } else {
          this._connect(match, "nextWinner", losersRounds[roundIndex + 1][Math.floor(matchIndex / 2)], matchIndex % 2 === 0 ? "a" : "b");
        }
      }, this);
    }, this);

    if (rounds === 1) {
      this._connect(winnersRounds[0][0], "nextLoser", grandFinal, "b");
      grandFinal.a = null;
      grandFinal.b = null;
    }

    var seedOrder = this._seedOrder(bracket.capacity);
    var seeds = {};
    seeded.forEach(function (participant, seedIndex) { seeds[seedIndex + 1] = participant; });
    winnersRounds[0].forEach(function (match, matchIndex) {
      match.a = clone(seeds[seedOrder[matchIndex * 2]]);
      match.b = clone(seeds[seedOrder[matchIndex * 2 + 1]]);
    });
    resetFinal.status = "NOT_NEEDED";
    if (bracket.thirdPlaceEnabled) bracket.thirdPlaceRule = "El tercer puesto corresponde a quien pierde la final de perdedores.";
  };

  BracketEngine.prototype._findMatch = function (bracket, matchId) {
    return bracket.matches.find(function (match) { return match.id === matchId; });
  };

  BracketEngine.prototype._resetProgress = function (bracket, matchId, visited) {
    var match = this._findMatch(bracket, matchId);
    if (!match || visited[matchId]) return;
    visited[matchId] = true;
    match.scoreA = null;
    match.scoreB = null;
    match.winnerId = null;
    match.loserId = null;
    if (match.stage === "GRAND_FINAL_RESET") {
      match.a = null;
      match.b = null;
      match.status = "NOT_NEEDED";
    } else {
      match.status = "WAITING";
    }
    if (bracket.format === "DOBLE" && matchId === bracket.grandFinalMatchId) {
      var resetFinal = this._findMatch(bracket, bracket.resetFinalMatchId);
      resetFinal.a = null;
      resetFinal.b = null;
      resetFinal.scoreA = null;
      resetFinal.scoreB = null;
      resetFinal.winnerId = null;
      resetFinal.loserId = null;
      resetFinal.status = "NOT_NEEDED";
    }
    if (match.nextWinner) this._resetProgress(bracket, match.nextWinner.matchId, visited);
    if (match.nextLoser) this._resetProgress(bracket, match.nextLoser.matchId, visited);
  };

  BracketEngine.prototype._place = function (bracket, destination, participant) {
    if (!destination) return;
    var target = this._findMatch(bracket, destination.matchId);
    if (!target) throw new Error("No se encontró la siguiente partida del bracket.");
    var key = destination.slot;
    var previous = target[key];
    var previousId = isParticipant(previous) ? previous.id : null;
    var nextId = isParticipant(participant) ? participant.id : null;
    if (previousId !== nextId && target.winnerId) {
      this._resetProgress(bracket, target.id, {});
    }
    target[key] = participant ? clone(participant) :
      (target.stage === "LOSERS" ? { id: "BYE", name: "BYE", isBye: true } : null);
  };

  BracketEngine.prototype._advanceByes = function (bracket) {
    var changed = true;
    var safety = bracket.matches.length * 3;
    while (changed && safety > 0) {
      changed = false;
      safety -= 1;
      bracket.matches.forEach(function (match) {
        if (match.status === "COMPLETED" || match.status === "NOT_NEEDED") return;
        var aIsPlayer = isParticipant(match.a);
        var bIsPlayer = isParticipant(match.b);
        var aIsBye = Boolean(match.a && match.a.isBye);
        var bIsBye = Boolean(match.b && match.b.isBye);
        var winner = null;
        if (aIsPlayer && bIsBye) winner = match.a;
        if (bIsPlayer && aIsBye) winner = match.b;
        if (aIsBye && bIsBye) winner = match.a;
        if (winner) {
          match.winnerId = isParticipant(winner) ? winner.id : null;
          match.loserId = null;
          match.status = "COMPLETED";
          this._place(bracket, match.nextWinner, winner);
          if (match.nextLoser) this._place(bracket, match.nextLoser, null);
          changed = true;
        }
      }, this);
    }
    if (safety === 0 && changed) throw new Error("No se pudo completar el avance automático de los BYEs.");
  };

  BracketEngine.prototype._resolveFinals = function (bracket) {
    if (bracket.format !== "DOBLE") return;
    var grandFinal = this._findMatch(bracket, bracket.grandFinalMatchId);
    var resetFinal = this._findMatch(bracket, bracket.resetFinalMatchId);
    if (!grandFinal || !resetFinal) return;
    if (grandFinal.status !== "COMPLETED") {
      resetFinal.a = null;
      resetFinal.b = null;
      resetFinal.status = "NOT_NEEDED";
      return;
    }
    if (grandFinal.winnerId === grandFinal.b.id) {
      if (resetFinal.status !== "COMPLETED") {
        resetFinal.a = clone(grandFinal.a);
        resetFinal.b = clone(grandFinal.b);
        resetFinal.status = "READY";
      }
    } else {
      resetFinal.status = "NOT_NEEDED";
      resetFinal.a = null;
      resetFinal.b = null;
    }
  };

  BracketEngine.prototype._refresh = function (bracket) {
    this._resolveFinals(bracket);
    var completedFinal;
    if (bracket.format === "DOBLE") {
      var firstFinal = this._findMatch(bracket, bracket.grandFinalMatchId);
      var reset = this._findMatch(bracket, bracket.resetFinalMatchId);
      completedFinal = reset.status === "COMPLETED" ? reset :
        (firstFinal.status === "COMPLETED" && firstFinal.winnerId === firstFinal.b.id ? null : firstFinal);
    } else {
      completedFinal = this._findMatch(bracket, bracket.finalMatchId);
    }
    if (completedFinal && completedFinal.winnerId) {
      bracket.championId = completedFinal.winnerId;
      bracket.runnerUpId = completedFinal.loserId;
      if (bracket.format === "DOBLE" && bracket.thirdPlaceEnabled) {
        var loserMatches = bracket.matches.filter(function (match) { return match.stage === "LOSERS"; });
        var lowerFinal = loserMatches.length ? loserMatches[loserMatches.length - 1] : null;
        bracket.thirdPlaceId = lowerFinal && lowerFinal.loserId || null;
      } else if (bracket.format === "SIMPLE" && bracket.thirdPlaceMatchId) {
        var bronze = this._findMatch(bracket, bracket.thirdPlaceMatchId);
        bracket.thirdPlaceId = bronze && bronze.winnerId || null;
      } else if (bracket.format === "SIMPLE" && bracket.thirdPlaceAuto) {
        var finalistLoser = bracket.runnerUpId;
        var semifinalLoser = bracket.matches.find(function (match) {
          return match.stage === "WINNERS" && match.id !== bracket.finalMatchId && match.loserId && match.loserId !== finalistLoser;
        });
        bracket.thirdPlaceId = semifinalLoser ? semifinalLoser.loserId : null;
      }
      var bronzeMatch = bracket.thirdPlaceMatchId && this._findMatch(bracket, bracket.thirdPlaceMatchId);
      bracket.status = bronzeMatch && bronzeMatch.status !== "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    } else {
      bracket.championId = null;
      bracket.runnerUpId = null;
      bracket.thirdPlaceId = null;
      bracket.status = "IN_PROGRESS";
    }
  };

  BracketEngine.prototype.recordResult = function (bracket, matchId, scoreA, scoreB) {
    var match = this._findMatch(bracket, matchId);
    if (!match) throw new Error("No se encontró esa partida.");
    if (match.status === "NOT_NEEDED") throw new Error("Esta partida no se juega con el resultado actual.");
    if (!isParticipant(match.a) || !isParticipant(match.b)) throw new Error("La partida todavía no tiene dos participantes listos.");
    scoreA = Number(scoreA);
    scoreB = Number(scoreB);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA < 0 || scoreB < 0) {
      throw new Error("Los marcadores deben ser números iguales o mayores que cero.");
    }
    if (scoreA === scoreB) throw new Error("La partida no puede terminar empatada.");

    var winner = scoreA > scoreB ? match.a : match.b;
    var loser = scoreA > scoreB ? match.b : match.a;
    if (match.winnerId && match.winnerId !== winner.id) {
      if (match.nextWinner) this._resetProgress(bracket, match.nextWinner.matchId, {});
      if (match.nextLoser) this._resetProgress(bracket, match.nextLoser.matchId, {});
      if (match.stage === "GRAND_FINAL" && bracket.resetFinalMatchId) {
        var reset = this._findMatch(bracket, bracket.resetFinalMatchId);
        reset.a = null;
        reset.b = null;
        reset.status = "NOT_NEEDED";
      }
    }

    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.winnerId = winner.id;
    match.loserId = loser.id;
    match.status = "COMPLETED";
    this._place(bracket, match.nextWinner, winner);
    this._place(bracket, match.nextLoser, loser);
    this._advanceByes(bracket);
    this._refresh(bracket);
    return clone(bracket);
  };

  BracketEngine.prototype.getPodium = function (bracket) {
    var find = function (id) {
      return bracket.participants.find(function (participant) { return participant.id === id; }) || null;
    };
    return {
      champion: find(bracket.championId),
      runnerUp: find(bracket.runnerUpId),
      thirdPlace: find(bracket.thirdPlaceId)
    };
  };

  root.BracketEngine = BracketEngine;
}(window));
