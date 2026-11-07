/* Centraliza el uso de localStorage para que los módulos no escriban datos por su cuenta. */
(function (root) {
  "use strict";

  var STORAGE_KEY = "ggspol_hub_etapa1";

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function StorageRepository() {
    this.state = null;
  }

  StorageRepository.prototype.initialize = function () {
    var raw;
    try {
      raw = root.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.state = root.GGSPOL_crearDatosDemo();
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
    this.state = root.GGSPOL_crearDatosDemo();
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
      state.notifications.unshift(root.NotificationService.recepcion(registration, tournament));
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
    this._transaction(function (state) {
      var item = state.registrations.find(function (entry) { return entry.id === id; });
      if (changes.poolPoints !== undefined) {
        var points = Number(changes.poolPoints);
        if (!Number.isFinite(points) || points < 0) throw new Error("El puntaje debe ser un número igual o mayor que cero.");
        item.poolPoints = points;
      }
      if (changes.status) {
        item.status = nextStatus;
        var torneo = state.tournaments.find(function (t) { return t.id === item.tournamentId; });
        if (nextStatus === "APPROVED") state.notifications.unshift(root.NotificationService.aprobacion(item, torneo));
        if (nextStatus === "REJECTED") state.notifications.unshift(root.NotificationService.rechazo(item, torneo));
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
      state.notifications = root.NotificationService.llaves(item, bracket).concat(state.notifications);
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
