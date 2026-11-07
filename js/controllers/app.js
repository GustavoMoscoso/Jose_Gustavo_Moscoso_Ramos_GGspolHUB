/* Conecta los formularios y las vistas con las estructuras y el almacenamiento. */
(function (root) {
  "use strict";

  var repository = new root.StorageRepository();
  var auth = new root.AuthService();
  var activeBracketId = null;
  var openMatchId = null;

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function state() { return repository.getState(); }
  function tournamentById(id) {
    return state().tournaments.find(function (item) { return item.id === id; }) || null;
  }
  function registrationsFor(id) {
    return state().registrations.filter(function (item) { return item.tournamentId === id; });
  }
  function dateLabel(value) {
    if (!value) return "Por anunciar";
    var parts = value.split("-");
    return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : value;
  }
  function stateLabel(value) {
    return { INSCRIPCIONES: "Inscripciones", EN_CURSO: "En curso", CULMINADO: "Culminado" }[value] || value;
  }
  function stateClass(value) {
    return { INSCRIPCIONES: "state-registration", EN_CURSO: "state-progress", CULMINADO: "state-complete" }[value] || "";
  }
  function formatLabel(value) { return value === "EQUIPO" ? "Equipos" : "Individual"; }
  function bracketLabel(value) { return value === "DOBLE" ? "Doble eliminación" : "Eliminación simple"; }
  function showMessage(element, message, isError) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("error", Boolean(isError));
  }
  function toast(message) {
    var card = document.createElement("div");
    card.className = "toast-card";
    card.textContent = message;
    byId("toast-region").appendChild(card);
    root.setTimeout(function () { card.remove(); }, 4200);
  }
  function handleError(error, element) {
    showMessage(element, error.message, true);
    if (!element) toast(error.message);
  }
  function currentRole() { return auth.getRole(); }

  function navigate(viewName) {
    if (viewName === "admin" && currentRole() === "PUBLIC") {
      showLogin();
      return;
    }
    document.querySelectorAll(".view").forEach(function (section) {
      section.classList.toggle("active", section.id === "view-" + viewName);
    });
    document.querySelectorAll("[data-view]").forEach(function (link) {
      if (link.classList.contains("nav-link")) link.classList.toggle("active", link.getAttribute("data-view") === viewName);
    });
    byId("main-menu").classList.remove("open");
    if (viewName === "bracket") renderBracket();
    if (viewName === "admin") renderAdmin();
    if (viewName === "estadisticas") renderStatistics();
    root.location.hash = viewName === "inicio" ? "inicio" : viewName;
    root.scrollTo(0, 0);
  }

  function showLogin() {
    byId("login-modal").classList.remove("d-none");
    byId("login-password").value = "";
    showMessage(byId("login-message"), "", false);
    byId("login-password").focus();
  }
  function hideLogin() { byId("login-modal").classList.add("d-none"); }

  function renderAuth() {
    var loggedIn = currentRole() !== "PUBLIC";
    byId("staff-access").classList.toggle("d-none", loggedIn);
    byId("logout").classList.toggle("d-none", !loggedIn);
    byId("staff-panel-link").classList.toggle("d-none", !loggedIn);
    byId("current-role").textContent = auth.getLabel();
  }

  function tournamentCard(tournament, featured) {
    var approvedCount = registrationsFor(tournament.id).filter(function (item) { return item.status === "APPROVED"; }).length;
    var open = tournament.status === "INSCRIPCIONES";
    return '<div class="' + (featured ? "col-md-6 col-xl-4" : "col-md-6 col-xl-4") + '">' +
      '<article class="tournament-card"><div class="card-top"><span class="game-mark">' + escapeHtml(tournament.game.slice(0, 2).toUpperCase()) +
      '</span><span class="state-badge ' + stateClass(tournament.status) + '">' + stateLabel(tournament.status) + '</span></div>' +
      '<h3>' + escapeHtml(tournament.name) + '</h3><p class="description">' + escapeHtml(tournament.requirements || "Competencia GGspol") + '</p>' +
      '<div class="card-meta"><span class="meta-chip">' + escapeHtml(tournament.game) + '</span><span class="meta-chip">' + formatLabel(tournament.format) +
      '</span><span class="meta-chip">' + (tournament.capacity ? "Top " + tournament.capacity : "Sin llaves") + '</span></div>' +
      '<p class="small-muted">Inicio ' + dateLabel(tournament.startDate) + ' · ' + approvedCount + ' aprobado(s)</p>' +
      '<div class="d-flex gap-2">' +
      (open ? '<button class="btn btn-primary btn-sm flex-grow-1" data-action="register" data-id="' + escapeHtml(tournament.id) + '">Inscribirme</button>' : "") +
      (tournament.bracket ? '<button class="btn btn-outline-light btn-sm flex-grow-1" data-action="bracket" data-id="' + escapeHtml(tournament.id) + '">Ver llaves</button>' : "") +
      '</div></article></div>';
  }

  function renderHome() {
    var tournaments = state().tournaments;
    byId("featured-tournaments").innerHTML = tournaments.slice(0, 3).map(function (item) {
      return tournamentCard(item, true);
    }).join("") || '<div class="col-12"><div class="empty-state">Todavía no hay torneos publicados.</div></div>';
    var registrations = state().registrations;
    var stats = [
      { label: "Torneos publicados", number: tournaments.length },
      { label: "Solicitudes recibidas", number: registrations.length },
      { label: "Torneos en curso", number: tournaments.filter(function (item) { return item.status === "EN_CURSO"; }).length }
    ];
    byId("home-stats").innerHTML = stats.map(statCard).join("");
  }

  function statCard(item) {
    return '<div class="col-sm-4"><div class="stat-card"><span class="label">' + escapeHtml(item.label) +
      '</span><span class="number">' + escapeHtml(item.number) + '</span></div></div>';
  }

  function renderTournaments() {
    var search = byId("tournament-search").value.trim().toLowerCase();
    var filter = byId("tournament-filter").value;
    var results = state().tournaments.filter(function (item) {
      var searchable = (item.name + " " + item.game).toLowerCase();
      return (!search || searchable.indexOf(search) !== -1) && (!filter || item.status === filter);
    });
    byId("tournament-list").innerHTML = results.map(function (item) { return tournamentCard(item, false); }).join("");
    byId("tournament-empty").classList.toggle("d-none", results.length > 0);
    renderRegistrationOptions();
  }

  function renderRegistrationOptions() {
    var select = byId("registration-tournament");
    var previous = select.value;
    var open = state().tournaments.filter(function (item) { return item.status === "INSCRIPCIONES"; });
    select.innerHTML = '<option value="">Selecciona un torneo</option>' + open.map(function (item) {
      return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + " · " + formatLabel(item.format) + '</option>';
    }).join("");
    if (open.some(function (item) { return item.id === previous; })) select.value = previous;
    renderRegistrationFields();
  }

  function renderRegistrationFields() {
    var tournament = tournamentById(byId("registration-tournament").value);
    var container = byId("registration-fields");
    if (!tournament || tournament.status !== "INSCRIPCIONES") {
      container.innerHTML = '<div class="notice notice-info">' +
        (state().tournaments.some(function (item) { return item.status === "INSCRIPCIONES"; }) ?
          "Elige un torneo abierto para ver los campos de inscripción." : "No hay torneos con inscripciones abiertas en este momento.") +
        '</div>';
      return;
    }
    var requiredFaculty = tournament.requiredFaculty;
    var facultyOptions = root.GGSPOL_CATALOGOS.facultades.map(function (faculty) {
      return '<option value="' + escapeHtml(faculty) + '"' + (faculty === requiredFaculty ? " selected" : "") + '>' + escapeHtml(faculty) + '</option>';
    }).join("");
    var common = '<label class="form-label" for="registration-email">Correo de contacto</label>' +
      '<input class="form-control mb-3" id="registration-email" type="email" required maxlength="120" placeholder="tu-correo@ejemplo.com">' +
      '<label class="form-label" for="registration-faculty">Facultad</label>' +
      '<select class="form-select mb-3" id="registration-faculty" required><option value="">Selecciona una facultad</option>' + facultyOptions + '</select>';
    var fields;
    if (tournament.format === "EQUIPO") {
      fields = '<label class="form-label" for="registration-name">Nombre del equipo</label>' +
        '<input class="form-control mb-3" id="registration-name" required maxlength="60" placeholder="Ej. FIEC Phoenix">' +
        common +
        '<label class="form-label" for="registration-roster">Roster / alias de jugadores</label>' +
        '<textarea class="form-control mb-3" id="registration-roster" required rows="4" maxlength="800" placeholder="Un jugador por línea"></textarea>';
    } else {
      fields = '<label class="form-label" for="registration-name">Nombre completo</label>' +
        '<input class="form-control mb-3" id="registration-name" required maxlength="60">' +
        '<label class="form-label" for="registration-alias">Alias de juego</label>' +
        '<input class="form-control mb-3" id="registration-alias" required maxlength="40">' +
        common;
    }
    if (requiredFaculty) fields = '<div class="notice notice-info mb-3">Este torneo requiere participantes de ' + escapeHtml(requiredFaculty) + '.</div>' + fields;
    container.innerHTML = fields;
  }

  function renderAdmin() {
    renderAuth();
    var role = currentRole();
    byId("create-tournament-form").classList.toggle("d-none", !auth.can("createTournament"));
    var tournaments = state().tournaments;
    var select = byId("manage-tournament");
    var previous = select.value;
    select.innerHTML = tournaments.map(function (item) {
      return '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.name) + '</option>';
    }).join("");
    if (tournaments.some(function (item) { return item.id === previous; })) select.value = previous;
    else {
      var firstOpen = tournaments.find(function (item) { return item.status === "INSCRIPCIONES"; });
      if (firstOpen) select.value = firstOpen.id;
    }
    renderRegistrationManagement();
    byId("admin-tournament-list").innerHTML = tournaments.map(function (item) {
      var count = registrationsFor(item.id).filter(function (entry) { return entry.status === "APPROVED"; }).length;
      var action = item.bracket
        ? '<button class="btn btn-outline-light btn-xs" data-action="bracket" data-id="' + escapeHtml(item.id) + '">Ver llaves</button>'
        : (auth.can("reviewRegistrations") && item.status !== "CULMINADO" ?
          '<button class="btn btn-outline-light btn-xs" data-action="reopen" data-id="' + escapeHtml(item.id) + '">Abrir inscripciones</button>' : "");
      if (auth.can("deleteTournament") && !item.bracket) {
        action += ' <button class="btn btn-outline-danger btn-xs" data-action="delete-tournament" data-id="' + escapeHtml(item.id) + '">Eliminar</button>';
      }
      return '<tr><td><b>' + escapeHtml(item.name) + '</b><div class="small-muted">' + escapeHtml(item.game) + '</div></td>' +
        '<td>' + count + '</td><td><span class="state-badge ' + stateClass(item.status) + '">' + stateLabel(item.status) + '</span></td>' +
        '<td><div class="admin-actions">' + action + '</div></td></tr>';
    }).join("") || '<tr><td colspan="4" class="small-muted">No hay torneos creados.</td></tr>';
  }

  function renderRegistrationManagement() {
    var tournament = tournamentById(byId("manage-tournament").value);
    var container = byId("registration-management");
    if (!tournament) {
      container.innerHTML = '<div class="empty-state">Crea un torneo para empezar.</div>';
      return;
    }
    var registrations = registrationsFor(tournament.id);
    var approved = registrations.filter(function (item) { return item.status === "APPROVED"; });
    var pending = registrations.filter(function (item) { return item.status === "PENDING"; });
    var canReview = auth.can("reviewRegistrations") && tournament.status === "INSCRIPCIONES";
    var poolRows = approved.map(function (item) {
      return '<div class="registration-row"><div class="registration-name"><b>' + escapeHtml(item.name) + '</b><span>' +
        escapeHtml(item.faculty) + ' · ' + escapeHtml(item.email) + '</span></div><span class="meta-chip">Aprobado</span>' +
        '<input class="form-control form-control-sm pool-score" type="number" min="0" step="1" value="' + Number(item.poolPoints || 0) +
        '" aria-label="Puntaje de piscina" data-points-id="' + escapeHtml(item.id) + '"' + (canReview ? "" : " disabled") + '>' +
        '<div class="registration-actions">' +
        (canReview ? '<button class="btn btn-outline-light btn-xs" data-action="save-points" data-id="' + escapeHtml(item.id) + '">Guardar seed</button>' +
          '<button class="btn btn-outline-danger btn-xs" data-action="reject-registration" data-id="' + escapeHtml(item.id) + '">Quitar</button>' : "") +
        '</div></div>';
    }).join("");
    var pendingRows = pending.map(function (item) {
      return '<div class="registration-row"><div class="registration-name"><b>' + escapeHtml(item.name) + '</b><span>' +
        escapeHtml(item.faculty) + ' · ' + escapeHtml(item.email) + '</span></div><span class="meta-chip">Pendiente</span><span></span>' +
        '<div class="registration-actions">' +
        (canReview ? '<button class="btn btn-primary btn-xs" data-action="approve-registration" data-id="' + escapeHtml(item.id) + '">Aprobar</button>' +
          '<button class="btn btn-outline-danger btn-xs" data-action="reject-registration" data-id="' + escapeHtml(item.id) + '">Rechazar</button>' : "") +
        '</div></div>';
    }).join("");
    var rejectedRows = registrations.filter(function (item) { return item.status === "REJECTED"; }).map(function (item) {
      return '<div class="registration-row"><div class="registration-name"><b>' + escapeHtml(item.name) + '</b><span>' +
        escapeHtml(item.faculty) + ' · ' + escapeHtml(item.email) + '</span></div><span class="meta-chip">Rechazado</span><span></span>' +
        '<div class="registration-actions">' + (canReview ? '<button class="btn btn-outline-light btn-xs" data-action="approve-registration" data-id="' +
          escapeHtml(item.id) + '">Revisar de nuevo</button>' : "") + '</div></div>';
    }).join("");
    var generation = "";
    if (auth.can("manageBracket") && tournament.status !== "CULMINADO" && !tournament.bracket) {
      var canGenerate = approved.length >= 2 && tournament.status === "INSCRIPCIONES";
      generation = '<div class="pool-summary"><div><b>Pool de clasificación</b><span>' + approved.length + ' aprobado(s) · corte Top ' +
        Number(tournament.capacity) + '</span></div><button class="btn btn-primary btn-sm" data-action="generate-bracket" data-id="' +
        escapeHtml(tournament.id) + '"' + (canGenerate ? "" : " disabled") + '>Cerrar pool y generar llaves</button></div>' +
        (approved.length > Number(tournament.capacity) ? '<p class="small-muted mt-2">Se clasificarán los mejores seeds según el puntaje de piscina; los demás quedarán fuera del bracket.</p>' : "") +
        (approved.length > 0 && approved.length < Number(tournament.capacity) ? '<p class="small-muted mt-2">Los cupos vacíos se completarán con BYEs.</p>' : "");
    }
    var notices = state().notifications.slice(0, 3).map(function (item) {
      return '<div class="notification-item"><b>' + escapeHtml(item.subject) + '</b><span>' + escapeHtml(item.email) + ' · ' +
        escapeHtml(item.message) + '</span></div>';
    }).join("");
    container.innerHTML = '<div class="pool-metrics"><span>' + pending.length + ' pendiente(s)</span><span>' + approved.length +
      ' aprobado(s)</span><span>' + registrations.filter(function (item) { return item.status === "REJECTED"; }).length + ' rechazado(s)</span></div>' +
      '<h3 class="subheading">Pendientes</h3>' + (pendingRows || '<p class="small-muted">No hay solicitudes pendientes.</p>') +
      '<h3 class="subheading mt-3">Pool aprobado · define el orden de clasificación</h3>' +
      (poolRows || '<p class="small-muted">Aún no hay participantes aprobados.</p>') +
      (rejectedRows ? '<h3 class="subheading mt-3">Rechazados</h3>' + rejectedRows : "") +
      generation +
      '<div class="notice notice-info mt-3">Los avisos se registran localmente como demostración. No se envían correos.</div>' +
      '<h3 class="subheading mt-3">Notificaciones simuladas recientes</h3>' + (notices || '<p class="small-muted">Sin notificaciones.</p>');
  }

  function matchParticipant(slot) {
    if (!slot) return { name: "Esperando clasificado", bye: false };
    if (slot.isBye) return { name: "BYE · pase directo", bye: true };
    return { name: slot.name, bye: false };
  }

  function matchCard(match, tournament) {
    var a = matchParticipant(match.a);
    var b = matchParticipant(match.b);
    var canEdit = auth.can("manageBracket") && isReady(match) && match.status !== "NOT_NEEDED";
    var winnerName = match.winnerId;
    var editForm = openMatchId === match.id && canEdit
      ? '<form class="match-edit" data-result-form="' + escapeHtml(match.id) + '">' +
        '<div class="d-flex gap-2 mb-2"><input class="form-control form-control-sm" name="scoreA" type="number" min="0" step="1" required placeholder="Marcador A">' +
        '<input class="form-control form-control-sm" name="scoreB" type="number" min="0" step="1" required placeholder="Marcador B"></div>' +
        '<button class="btn btn-primary btn-sm w-100" type="submit">Guardar resultado</button></form>' : "";
    var hasBye = Boolean((match.a && match.a.isBye) || (match.b && match.b.isBye));
    var status = match.status === "COMPLETED" ? (hasBye ? "Pase directo" : "Finalizada") : match.status === "NOT_NEEDED" ? "No requerida" :
      isReady(match) ? "Lista para jugar" : "Esperando clasificados";
    return '<article class="match-card"><div class="match-head"><span>' + escapeHtml(match.id) + '</span><span>' + status + '</span></div>' +
      '<div class="match-slot ' + (winnerName === (match.a && match.a.id) ? "winner" : "") + (a.bye ? " bye" : "") + '">' +
      '<span>' + escapeHtml(a.name) + '</span><span class="match-score">' + (match.scoreA === null ? "–" : match.scoreA) + '</span></div>' +
      '<div class="match-slot ' + (winnerName === (match.b && match.b.id) ? "winner" : "") + (b.bye ? " bye" : "") + '">' +
      '<span>' + escapeHtml(b.name) + '</span><span class="match-score">' + (match.scoreB === null ? "–" : match.scoreB) + '</span></div>' +
      (canEdit ? '<button class="btn btn-outline-light btn-xs m-2" data-action="score-match" data-id="' + escapeHtml(match.id) + '">' +
        (match.status === "COMPLETED" ? "Editar resultado" : "Registrar resultado") + '</button>' : "") + editForm + '</article>';
  }

  function isReady(match) {
    return Boolean(match && match.a && match.b && !match.a.isBye && !match.b.isBye);
  }

  function stageLabel(stage) {
    return { WINNERS: "Winners bracket", LOSERS: "Losers bracket", THIRD_PLACE: "Tercer puesto",
      GRAND_FINAL: "Gran final", GRAND_FINAL_RESET: "Gran final · reset" }[stage] || stage;
  }

  function renderBracket() {
    var tournament = tournamentById(activeBracketId);
    if (!tournament || !tournament.bracket) {
      navigate("torneos");
      return;
    }
    var bracket = tournament.bracket;
    byId("bracket-title").textContent = tournament.name;
    byId("bracket-subtitle").textContent = tournament.game + " · " + formatLabel(tournament.format) + " · " +
      bracketLabel(tournament.bracketFormat || bracket.format) + " · Top " + bracket.capacity;
    var engine = new root.BracketEngine();
    var podium = engine.getPodium(bracket);
    var thirdPlaceUnavailable = bracket.participants.length < 3;
    var podiumPlaces = [
      { title: "🥇 Campeón", participant: podium.champion, style: "gold" },
      { title: "🥈 Subcampeón", participant: podium.runnerUp, style: "silver" },
      { title: "🥉 Tercer puesto", participant: podium.thirdPlace, style: "bronze" }
    ].filter(function (place) { return place.style !== "bronze" || tournament.thirdPlace; });
    byId("bracket-podium").innerHTML = podiumPlaces.map(function (place) {
      return '<div class="podium-card ' + place.style + '"><span>' + place.title + '</span><b>' +
        (place.participant ? escapeHtml(place.participant.name) :
          (place.style === "bronze" && thirdPlaceUnavailable ? "No asignado" : "Por definir")) + '</b>' +
        (place.participant ? '<span>' + escapeHtml(place.participant.faculty || "") + '</span>' : "") + '</div>';
    }).join("");
    var notice = "";
    if (bracket.format === "DOBLE" && bracket.thirdPlaceEnabled) {
      notice = '<div class="notice notice-info">En doble eliminación, el tercer puesto corresponde a quien pierde la final de perdedores. ' +
        (thirdPlaceUnavailable ? "No se asigna bronce porque hay menos de tres clasificados. " : "") +
        'Si el perdedor del Winners gana la gran final, se juega un reset para decidir el campeón.</div>';
    } else if (tournament.thirdPlace && !bracket.thirdPlaceMatchId && bracket.format === "SIMPLE") {
      if (thirdPlaceUnavailable) {
        notice = '<div class="notice notice-info">No se asigna bronce porque hay menos de tres clasificados.</div>';
      } else if (bracket.thirdPlaceAuto) {
        notice = '<div class="notice notice-info">El tercer puesto se asigna al único participante eliminado antes de la final.</div>';
      }
    }
    byId("bracket-notice").innerHTML = notice;
    var groups = {};
    bracket.matches.forEach(function (match) {
      var group = match.stage + "-" + match.round;
      if (!groups[group]) groups[group] = { stage: match.stage, round: match.round, matches: [] };
      groups[group].matches.push(match);
    });
    var orderedGroups = Object.keys(groups).map(function (key) { return groups[key]; }).sort(function (a, b) {
      var order = { WINNERS: 0, LOSERS: 1, GRAND_FINAL: 2, GRAND_FINAL_RESET: 3, THIRD_PLACE: 4 };
      if (order[a.stage] !== order[b.stage]) return order[a.stage] - order[b.stage];
      return a.round - b.round;
    });
    byId("bracket-content").innerHTML = orderedGroups.length ? '<div class="bracket-board">' +
      orderedGroups.map(function (group) {
        return '<section class="bracket-round"><h3>' + stageLabel(group.stage) + (group.stage.indexOf("FINAL") === -1 && group.stage !== "THIRD_PLACE" ?
          " · Ronda " + group.round : "") + '</h3>' +
          group.matches.map(function (match) { return matchCard(match, tournament); }).join("") + '</section>';
      }).join("") + '</div>' : '<div class="empty-state">Las llaves todavía no tienen partidas.</div>';
  }

  function renderStatistics() {
    var tournaments = state().tournaments;
    var completed = tournaments.filter(function (item) { return item.bracket && item.bracket.status === "COMPLETED"; });
    var winners = completed.map(function (tournament) {
      var participant = new root.BracketEngine().getPodium(tournament.bracket).champion;
      return { tournament: tournament, participant: participant };
    }).filter(function (item) { return item.participant; });
    var games = {};
    winners.forEach(function (item) { games[item.tournament.game] = (games[item.tournament.game] || 0) + 1; });
    var topGame = Object.keys(games).sort(function (a, b) { return games[b] - games[a]; })[0] || "—";
    byId("stats-summary").innerHTML = [
      { label: "Torneos culminados", number: completed.length },
      { label: "Campeones registrados", number: winners.length },
      { label: "Juego con más campeones", number: topGame }
    ].map(statCard).join("");
    byId("champions-table").innerHTML = winners.map(function (item) {
      return '<tr><td><b>' + escapeHtml(item.tournament.name) + '</b></td><td>' + escapeHtml(item.tournament.game) +
        '</td><td>' + formatLabel(item.tournament.format) + '</td><td>' + escapeHtml(item.participant.name) +
        '</td><td>' + escapeHtml(item.participant.faculty || "—") + '</td></tr>';
    }).join("");
    byId("champions-empty").classList.toggle("d-none", winners.length > 0);
  }

  function fillCatalogs() {
    byId("new-game").innerHTML = root.GGSPOL_CATALOGOS.juegos.map(function (game) {
      return '<option value="' + escapeHtml(game) + '">' + escapeHtml(game) + '</option>';
    }).join("");
    byId("new-capacity").innerHTML = root.GGSPOL_CATALOGOS.capacidadesBracket.map(function (size) {
      return '<option value="' + size + '"' + (size === 8 ? " selected" : "") + '>' + size + ' participantes</option>';
    }).join("");
    var faculty = byId("new-faculty");
    if (faculty) faculty.innerHTML = '<option value="">Sin restricción por facultad</option>' +
      root.GGSPOL_CATALOGOS.facultades.map(function (item) { return '<option value="' + escapeHtml(item) + '">' + escapeHtml(item) + '</option>'; }).join("");
  }

  function submitRegistration(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var tournament = tournamentById(byId("registration-tournament").value);
    var message = byId("registration-message");
    showMessage(message, "", false);
    if (!tournament) return handleError(new Error("Selecciona un torneo abierto."), message);
    if (!form.reportValidity()) return;
    var name = byId("registration-name").value.trim();
    var email = byId("registration-email").value.trim();
    var faculty = byId("registration-faculty").value;
    var roster = tournament.format === "EQUIPO" ? byId("registration-roster").value.trim() : "";
    var alias = tournament.format === "INDIVIDUAL" ? byId("registration-alias").value.trim() : "";
    if (tournament.requiredFaculty && faculty !== tournament.requiredFaculty) {
      return handleError(new Error("Este torneo está limitado a " + tournament.requiredFaculty + "."), message);
    }
    try {
      var created = repository.createRegistration({
        tournamentId: tournament.id,
        type: tournament.format,
        name: name,
        alias: alias,
        email: email,
        faculty: faculty,
        roster: roster
      });
      form.reset();
      renderRegistrationOptions();
      showMessage(message, "Solicitud enviada para " + created.name + ". Su estado inicial es Pendiente.", false);
      toast("Solicitud recibida. La confirmación es local y no se envió un correo.");
      renderHome();
      renderTournaments();
    } catch (error) {
      handleError(error, message);
    }
  }

  function lookupRegistration(event) {
    event.preventDefault();
    var email = byId("lookup-email").value.trim().toLowerCase();
    var results = state().registrations.filter(function (item) { return item.email.toLowerCase() === email; });
    var target = byId("lookup-results");
    target.innerHTML = results.length ? results.map(function (item) {
      var tournament = tournamentById(item.tournamentId);
      var labels = { PENDING: "Pendiente de revisión", APPROVED: "Aprobada", REJECTED: "Rechazada" };
      return '<div class="notification-item"><b>' + escapeHtml(tournament ? tournament.name : "Torneo") + '</b><span>' +
        escapeHtml(item.name) + ' · ' + labels[item.status] + '</span></div>';
    }).join("") : '<p class="small-muted">No encontramos solicitudes con ese correo.</p>';
  }

  function submitTournament(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var message = byId("create-message");
    showMessage(message, "", false);
    if (!form.reportValidity()) return;
    var start = byId("new-start").value;
    var close = byId("new-close").value;
    if (close > start) return handleError(new Error("El cierre de inscripción debe ser el mismo día o anterior al inicio del torneo."), message);
    var capacity = Number(byId("new-capacity").value);
    if (root.GGSPOL_CATALOGOS.capacidadesBracket.indexOf(capacity) === -1) {
      return handleError(new Error("Selecciona una capacidad válida en potencia de dos."), message);
    }
    try {
      var tournament = repository.createTournament({
        name: byId("new-name").value.trim(),
        game: byId("new-game").value,
        format: byId("new-format").value,
        bracketFormat: byId("new-bracket").value,
        capacity: capacity,
        startDate: start,
        registrationClose: close,
        prize: byId("new-prize").value.trim(),
        requirements: byId("new-requirements").value.trim(),
        requiredFaculty: byId("new-faculty").value,
        thirdPlace: byId("new-third-place").checked
      });
      form.reset();
      fillCatalogs();
      showMessage(message, "Torneo creado: " + tournament.name + ".", false);
      toast("Torneo creado y disponible para inscripción.");
      renderEverything();
    } catch (error) {
      handleError(error, message);
    }
  }

  function handleAction(button) {
    var action = button.getAttribute("data-action");
    var id = button.getAttribute("data-id");
    try {
      if (action === "register") {
        navigate("inscripcion");
        byId("registration-tournament").value = id;
        renderRegistrationFields();
        return;
      }
      if (action === "bracket") {
        activeBracketId = id;
        openMatchId = null;
        navigate("bracket");
        return;
      }
      if (action === "approve-registration") {
        if (!auth.can("reviewRegistrations")) throw new Error("Este perfil no puede revisar solicitudes.");
        repository.updateRegistration(id, { status: "APPROVED" });
        toast("Participante aprobado. La notificación fue simulada localmente.");
      } else if (action === "reject-registration") {
        if (!auth.can("reviewRegistrations")) throw new Error("Este perfil no puede revisar solicitudes.");
        repository.updateRegistration(id, { status: "REJECTED" });
      } else if (action === "save-points") {
        if (!auth.can("reviewRegistrations")) throw new Error("Este perfil no puede modificar el pool.");
        var input = document.querySelector('[data-points-id="' + CSS.escape(id) + '"]');
        repository.updateRegistration(id, { poolPoints: input.value });
        toast("Seed de clasificación guardado.");
      } else if (action === "generate-bracket") {
        if (!auth.can("manageBracket")) throw new Error("Este perfil no puede generar llaves.");
        var generated = repository.generateBracket(id);
        activeBracketId = generated.id;
        toast("Pool cerrado. Llaves generadas; los BYEs avanzan automáticamente.");
        renderEverything();
        navigate("bracket");
        return;
      } else if (action === "score-match") {
        if (!auth.can("manageBracket")) throw new Error("Este perfil no puede ingresar resultados.");
        openMatchId = openMatchId === id ? null : id;
        renderBracket();
        return;
      } else if (action === "reopen") {
        if (!auth.can("reviewRegistrations")) throw new Error("Este perfil no puede reabrir inscripciones.");
        repository.setTournamentStatus(id, "INSCRIPCIONES");
        toast("Se reabrieron las inscripciones.");
      } else if (action === "delete-tournament") {
        if (!auth.can("deleteTournament")) throw new Error("Este perfil no puede eliminar torneos.");
        var tournament = tournamentById(id);
        if (!root.confirm("¿Eliminar el torneo " + tournament.name + " y sus solicitudes?")) return;
        repository.deleteTournament(id);
        toast("Torneo eliminado.");
      }
      renderEverything();
    } catch (error) {
      toast(error.message);
    }
  }

  function submitResult(event) {
    var form = event.target.closest("[data-result-form]");
    if (!form) return;
    event.preventDefault();
    if (!auth.can("manageBracket")) return toast("Este perfil no puede registrar resultados.");
    var tournament = tournamentById(activeBracketId);
    try {
      repository.recordResult(tournament.id, form.getAttribute("data-result-form"),
        form.elements.scoreA.value, form.elements.scoreB.value);
      openMatchId = null;
      renderEverything();
      navigate("bracket");
      toast("Resultado guardado. El bracket avanzó automáticamente.");
    } catch (error) {
      toast(error.message);
    }
  }

  function submitLogin(event) {
    event.preventDefault();
    try {
      auth.login(byId("login-role").value, byId("login-password").value);
      hideLogin();
      renderAuth();
      renderAdmin();
      navigate("admin");
    } catch (error) {
      showMessage(byId("login-message"), error.message, true);
    }
  }

  function renderEverything() {
    renderAuth();
    renderHome();
    renderTournaments();
    renderAdmin();
    renderStatistics();
    if (activeBracketId) renderBracket();
  }

  function initialize() {
    try {
      repository.initialize();
      fillCatalogs();
      renderEverything();
    } catch (error) {
      document.querySelector("main").innerHTML = '<section class="container section-block"><div class="notice notice-danger">' +
        escapeHtml(error.message) + '</div><p class="small-muted mt-3">No se borraron tus datos automáticamente. Si lo necesitas, borra la clave ' +
        '<code>ggspol_hub_etapa1</code> del almacenamiento local del navegador y vuelve a cargar la página.</p></section>';
      return;
    }

    document.addEventListener("click", function (event) {
      var viewButton = event.target.closest("[data-view]");
      if (viewButton) {
        event.preventDefault();
        navigate(viewButton.getAttribute("data-view"));
        return;
      }
      var actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        var action = actionButton.getAttribute("data-action");
        if (action === "toggle-menu") byId("main-menu").classList.toggle("open");
        else if (action === "close-login") hideLogin();
        else handleAction(actionButton);
      }
    });
    document.addEventListener("submit", submitResult);
    byId("registration-form").addEventListener("submit", submitRegistration);
    byId("create-tournament-form").addEventListener("submit", submitTournament);
    byId("login-form").addEventListener("submit", submitLogin);
    byId("registration-tournament").addEventListener("change", renderRegistrationFields);
    byId("tournament-search").addEventListener("input", renderTournaments);
    byId("tournament-filter").addEventListener("change", renderTournaments);
    byId("manage-tournament").addEventListener("change", renderRegistrationManagement);
    byId("lookup-form").addEventListener("submit", lookupRegistration);
    byId("staff-access").addEventListener("click", showLogin);
    byId("logout").addEventListener("click", function () {
      auth.logout();
      renderAuth();
      navigate("inicio");
      toast("Sesión simulada cerrada.");
    });
    byId("reset-demo").addEventListener("click", function () {
      if (!root.confirm("Se reemplazarán los cambios locales por los datos iniciales de demostración. ¿Continuar?")) return;
      try {
        repository.restoreDemo();
        activeBracketId = null;
        openMatchId = null;
        renderEverything();
        navigate("admin");
        toast("Datos de demostración restaurados.");
      } catch (error) { toast(error.message); }
    });
    root.addEventListener("hashchange", function () {
      var requested = root.location.hash.replace("#", "") || "inicio";
      if (requested === "admin" && currentRole() === "PUBLIC") return navigate("inicio");
      var exists = byId("view-" + requested);
      navigate(exists ? requested : "inicio");
    });
    if (root.location.hash) {
      var requestedView = root.location.hash.replace("#", "");
      if (requestedView === "admin" && currentRole() !== "PUBLIC") navigate("admin");
      else if (requestedView !== "admin" && requestedView !== "bracket") navigate(byId("view-" + requestedView) ? requestedView : "inicio");
    }
  }

  root.addEventListener("DOMContentLoaded", initialize);
}(window));
