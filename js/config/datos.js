/* Datos iniciales de demostración. Se cargan al iniciar o al pulsar "Restaurar datos demo".
   Las altas, ediciones y eliminaciones NO modifican este archivo: se guardan en localStorage. */
(function (root) {
  "use strict";

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

  root.GGSPOL_crearDatosDemo = makeDemoState;
}(window));
