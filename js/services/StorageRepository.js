/* Centraliza el uso de localStorage para que los módulos no escriban datos por su cuenta. */
(function (root) {
  "use strict";

  var STORAGE_KEY = "ggspol_hub_etapa1";

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function demoParticipants(prefix, names, faculty, type, emails) {
    return names.map(function (name, index) {
      return {
        id: prefix + "-" + (index + 1),
        type: type,
        name: name,
        alias: type === "INDIVIDUAL" ? name : "",
        faculty: faculty[index % faculty.length],
        email: emails[index % emails.length],
        roster: type === "EQUIPO" ? "Capitán: " + name + "\nJugador 2\nJugador 3" : "",
        poolPoints: names.length - index
      };
    });
  }

  function makeDemoState() {
    var engine = new root.BracketEngine();
    var completedParticipants = demoParticipants(
      "cup",
      ["FIEC Phoenix", "FCNM Titans", "FADCOM Foxes", "FCSH Wolves"],
      ["FIEC", "FCNM", "FADCOM", "FCSH"],
      "EQUIPO",
      ["phoenix@example.com", "titans@example.com", "foxes@example.com", "wolves@example.com"]
    );
    var completedBracket = engine.generate(completedParticipants, 4, "SIMPLE", true);
    var nextMatch = function () {
      return completedBracket.matches.find(function (match) {
        return match.status !== "COMPLETED" && match.status !== "NOT_NEEDED" && match.a && match.b && !match.a.isBye && !match.b.isBye;
      });
    };
    var counter = 0;
    while (completedBracket.status !== "COMPLETED" && counter < 12) {
      var ready = nextMatch();
      if (!ready) break;
      completedBracket = engine.recordResult(completedBracket, ready.id, 2, 0);
      counter += 1;
    }

    var currentParticipants = demoParticipants(
      "valorant",
      ["ESPOL Sentinels", "FIEC Nova", "FIMCP Storm", "FCNM Pulse"],
      ["ESPOL / otra", "FIEC", "FIMCP", "FCNM"],
      "EQUIPO",
      ["sentinels@example.com", "nova@example.com", "storm@example.com", "pulse@example.com"]
    );

    var now = new Date();
    var start = function (offset) {
      var date = new Date(now.getTime() + offset * 86400000);
      return date.toISOString().slice(0, 10);
    };

    return {
      version: 1,
      tournaments: [
        {
          id: "cup-2026",
          name: "GGspol Arena Cup",
          game: "Super Smash Bros. Ultimate",
          format: "EQUIPO",
          bracketFormat: "SIMPLE",
          capacity: 4,
          status: "CULMINADO",
          startDate: start(-20),
          registrationClose: start(-23),
          prize: "Medallas para el podio",
          requirements: "Torneo de demostración. La facultad es referencial.",
          thirdPlace: true,
          bracket: completedBracket,
          createdAt: new Date().toISOString()
        },
        {
          id: "valorant-2026",
          name: "Valorant Interfacultades",
          game: "Valorant",
          format: "EQUIPO",
          bracketFormat: "DOBLE",
          capacity: 4,
          status: "EN_CURSO",
          startDate: start(5),
          registrationClose: start(-2),
          prize: "Reconocimiento GGspol",
          requirements: "Plantilla referencial de hasta cinco jugadores.",
          thirdPlace: true,
          bracket: engine.generate(currentParticipants, 4, "DOBLE", true),
          createdAt: new Date().toISOString()
        },
        {
          id: "smash-open",
          name: "Smash Open 1v1",
          game: "Super Smash Bros. Ultimate",
          format: "INDIVIDUAL",
          bracketFormat: "SIMPLE",
          capacity: 8,
          status: "INSCRIPCIONES",
          startDate: start(15),
          registrationClose: start(10),
          prize: "Premio por anunciar",
          requirements: "Inscripción individual. Correo de contacto válido.",
          thirdPlace: true,
          bracket: null,
          createdAt: new Date().toISOString()
        }
      ],
      registrations: [
        {
          id: "req-smash-1", tournamentId: "smash-open", type: "INDIVIDUAL",
          name: "Gustavo M.", alias: "GGspolG", email: "gamer@example.com",
          faculty: "FIEC", roster: "", status: "PENDING", poolPoints: 0,
          createdAt: new Date().toISOString()
        },
        {
          id: "req-smash-2", tournamentId: "smash-open", type: "INDIVIDUAL",
          name: "Andrea P.", alias: "AndiFox", email: "andi@example.com",
          faculty: "FADCOM", roster: "", status: "APPROVED", poolPoints: 4,
          createdAt: new Date().toISOString()
        },
        {
          id: "req-smash-3", tournamentId: "smash-open", type: "INDIVIDUAL",
          name: "Luis R.", alias: "LRocket", email: "luis@example.com",
          faculty: "FCNM", roster: "", status: "PENDING", poolPoints: 0,
          createdAt: new Date().toISOString()
        }
        ].concat(completedParticipants.concat(currentParticipants).map(function (participant) {
          return {
            id: participant.id,
            tournamentId: participant.id.indexOf("cup-") === 0 ? "cup-2026" : "valorant-2026",
            type: participant.type,
            name: participant.name, alias: "", email: participant.email,
            faculty: participant.faculty, roster: participant.roster,
            status: "APPROVED", poolPoints: participant.poolPoints, createdAt: new Date().toISOString()
          };
        })),
      notifications: [
        {
          id: "notice-demo", email: "gamer@example.com",
          subject: "Solicitud recibida · Smash Open 1v1",
          message: "Tu solicitud está pendiente de revisión por el staff.",
          createdAt: new Date().toISOString(),
          simulated: true
        }
      ]
    };
  }

  function StorageRepository() {
    this.state = null;
  }

  StorageRepository.prototype.initialize = function () {
    var raw;
    try {
      raw = root.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.state = makeDemoState();
        this._save();
        return;
      }
      this.state = JSON.parse(raw);
      if (!this.state || this.state.version !== 1 || !Array.isArray(this.state.tournaments) ||
          !Array.isArray(this.state.registrations) || !Array.isArray(this.state.notifications)) {
        throw new Error("Los datos guardados no tienen el formato esperado. Restaura la demostración para continuar.");
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("No se pudieron leer los datos guardados. Restaura la demostración desde el panel de staff.");
      }
      throw error;
    }
  };

  StorageRepository.prototype._save = function () {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      throw new Error("No se pudieron guardar los cambios en este navegador: " + error.message);
    }
  };

  StorageRepository.prototype.getState = function () {
    if (!this.state) throw new Error("El almacenamiento todavía no se ha inicializado.");
    return copy(this.state);
  };

  StorageRepository.prototype._transaction = function (change) {
    var previous = copy(this.state);
    try {
      change(this.state);
      this._save();
    } catch (error) {
      this.state = previous;
      throw error;
    }
  };

  StorageRepository.prototype.restoreDemo = function () {
    this.state = makeDemoState();
    this._save();
  };

  StorageRepository.prototype.createTournament = function (data) {
    var self = this;
    var tournament = copy(data);
    tournament.id = "t-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    tournament.status = "INSCRIPCIONES";
    tournament.bracket = null;
    tournament.createdAt = new Date().toISOString();
    this._transaction(function (state) {
      state.tournaments.unshift(tournament);
    });
    return self.getTournament(tournament.id);
  };

  StorageRepository.prototype.getTournament = function (id) {
    return this.state.tournaments.find(function (tournament) { return tournament.id === id; }) || null;
  };

  StorageRepository.prototype.createRegistration = function (data) {
    var registration = copy(data);
    registration.id = "req-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    registration.status = "PENDING";
    registration.poolPoints = 0;
    registration.createdAt = new Date().toISOString();
    var tournament = this.getTournament(registration.tournamentId);
    if (!tournament || tournament.status !== "INSCRIPCIONES") {
      throw new Error("Este torneo no está recibiendo inscripciones.");
    }
    var duplicate = this.state.registrations.some(function (item) {
      return item.tournamentId === registration.tournamentId &&
        (item.email.toLowerCase() === registration.email.toLowerCase() ||
         item.name.trim().toLowerCase() === registration.name.trim().toLowerCase()) &&
        item.status !== "REJECTED";
    });
    if (duplicate) throw new Error("Ya existe una solicitud con ese correo o nombre en este torneo.");
    this._transaction(function (state) {
      state.registrations.push(registration);
      state.notifications.unshift({
        id: "notice-" + Date.now().toString(36),
        email: registration.email,
        subject: "Solicitud recibida · " + tournament.name,
        message: "Tu solicitud quedó pendiente de revisión. Esta notificación es una simulación local.",
        createdAt: new Date().toISOString(),
        simulated: true
      });
    });
    return copy(registration);
  };

  StorageRepository.prototype.updateRegistration = function (id, changes) {
    var registration = this.state.registrations.find(function (item) { return item.id === id; });
    if (!registration) throw new Error("No se encontró la solicitud.");
    var nextStatus = changes.status || registration.status;
    if (["PENDING", "APPROVED", "REJECTED"].indexOf(nextStatus) === -1) {
      throw new Error("Estado de inscripción no reconocido.");
    }
    var self = this;
    this._transaction(function (state) {
      var item = state.registrations.find(function (entry) { return entry.id === id; });
      if (changes.poolPoints !== undefined) {
        var points = Number(changes.poolPoints);
        if (!Number.isFinite(points) || points < 0) throw new Error("El puntaje debe ser un número igual o mayor que cero.");
        item.poolPoints = points;
      }
      if (changes.status) {
        item.status = nextStatus;
        if (nextStatus === "APPROVED" && item.status !== "REJECTED") {
          state.notifications.unshift({
            id: "notice-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
            email: item.email,
            subject: "Solicitud actualizada",
            message: "Tu solicitud para " + (self.getTournament(item.tournamentId) || {}).name + " fue " +
              (nextStatus === "APPROVED" ? "aprobada" : nextStatus === "REJECTED" ? "rechazada" : "actualizada") +
              ". Notificación simulada: el sistema no envió un correo.",
            createdAt: new Date().toISOString(),
            simulated: true
          });
        }
      }
    });
    return this.state.registrations.find(function (entry) { return entry.id === id; });
  };

  StorageRepository.prototype.generateBracket = function (tournamentId) {
    var tournament = this.getTournament(tournamentId);
    if (!tournament) throw new Error("No se encontró el torneo.");
    if (tournament.bracket) throw new Error("Este torneo ya tiene llaves generadas.");
    var approved = this.state.registrations.filter(function (item) {
      return item.tournamentId === tournamentId && item.status === "APPROVED";
    }).map(function (item) {
      return {
        id: item.id,
        type: item.type,
        name: item.name,
        alias: item.alias,
        email: item.email,
        faculty: item.faculty,
        roster: item.roster,
        poolPoints: item.poolPoints
      };
    });
    var pool = new root.ParticipantPool(approved);
    var qualified = pool.qualify(Number(tournament.capacity));
    var engine = new root.BracketEngine();
    var bracket = engine.generate(qualified, Number(tournament.capacity), tournament.bracketFormat, tournament.thirdPlace);
    this._transaction(function (state) {
      var item = state.tournaments.find(function (entry) { return entry.id === tournamentId; });
      item.bracket = bracket;
      item.status = "EN_CURSO";
    });
    return this.getTournament(tournamentId);
  };

  StorageRepository.prototype.recordResult = function (tournamentId, matchId, scoreA, scoreB) {
    var tournament = this.getTournament(tournamentId);
    if (!tournament || !tournament.bracket) throw new Error("Este torneo no tiene llaves activas.");
    var engine = new root.BracketEngine();
    var bracket = engine.recordResult(tournament.bracket, matchId, scoreA, scoreB);
    this._transaction(function (state) {
      var item = state.tournaments.find(function (entry) { return entry.id === tournamentId; });
      item.bracket = bracket;
      if (bracket.status === "COMPLETED") item.status = "CULMINADO";
    });
    return this.getTournament(tournamentId);
  };

  StorageRepository.prototype.setTournamentStatus = function (tournamentId, status) {
    if (["INSCRIPCIONES", "EN_CURSO", "CULMINADO"].indexOf(status) === -1) {
      throw new Error("Estado de torneo no reconocido.");
    }
    var tournament = this.getTournament(tournamentId);
    if (!tournament) throw new Error("No se encontró el torneo.");
    if (status === "CULMINADO" && (!tournament.bracket || tournament.bracket.status !== "COMPLETED")) {
      throw new Error("El torneo solo puede culminar cuando se registra un campeón.");
    }
    this._transaction(function (state) {
      state.tournaments.find(function (item) { return item.id === tournamentId; }).status = status;
    });
  };

  StorageRepository.prototype.deleteTournament = function (tournamentId) {
    this._transaction(function (state) {
      state.tournaments = state.tournaments.filter(function (item) { return item.id !== tournamentId; });
      state.registrations = state.registrations.filter(function (item) { return item.tournamentId !== tournamentId; });
    });
  };

  root.StorageRepository = StorageRepository;
}(window));
