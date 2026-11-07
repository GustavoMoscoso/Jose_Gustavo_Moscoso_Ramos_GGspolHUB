/* Construye los avisos simulados que se guardan localmente. No envía correos: solo deja el registro en localStorage. */
(function (root) {
  "use strict";

  var counter = 0;

  function nuevoId() {
    counter += 1;
    return "notice-" + Date.now().toString(36) + "-" + counter;
  }

  function formatearFecha(fecha) {
    var partes = String(fecha || "").split("-");
    return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : "Por anunciar";
  }

  function aviso(email, asunto, mensaje) {
    return {
      id: nuevoId(),
      email: email,
      subject: asunto,
      message: mensaje + " Notificación simulada: no se envió ningún correo.",
      createdAt: new Date().toISOString(),
      simulated: true
    };
  }

  /* Primer enfrentamiento de la ronda 1 en el que aparece el participante. */
  function primerRival(bracket, participantId) {
    var partidas = bracket.matches
      .filter(function (m) {
        return m.stage === "WINNERS" && ((m.a && m.a.id === participantId) || (m.b && m.b.id === participantId));
      })
      .sort(function (x, y) { return x.round - y.round || x.number - y.number; });
    var partida = partidas[0];
    if (!partida) return "Por definir";
    var rival = partida.a && partida.a.id === participantId ? partida.b : partida.a;
    if (!rival) return "Por definir";
    if (rival.isBye) return "Pase directo (BYE) en la primera ronda";
    return rival.name;
  }

  var NotificationService = {
    recepcion: function (registration, torneo) {
      return aviso(registration.email, "Solicitud recibida · " + torneo.name,
        "Tu solicitud quedó pendiente de revisión por el staff.");
    },
    aprobacion: function (registration, torneo) {
      return aviso(registration.email, "Solicitud aprobada · " + (torneo ? torneo.name : "Torneo"),
        "Tu participación fue aprobada. Revisaremos tu lugar en el pool de clasificación.");
    },
    rechazo: function (registration, torneo) {
      return aviso(registration.email, "Solicitud rechazada · " + (torneo ? torneo.name : "Torneo"),
        "Tu solicitud no fue aceptada. Puedes consultar al staff para más detalles.");
    },
    /* Un aviso por participante clasificado, con fecha de inicio y primer rival. */
    llaves: function (torneo, bracket) {
      return bracket.participants.map(function (participante) {
        return aviso(participante.email, "Llaves publicadas · " + torneo.name,
          "Fecha de inicio: " + formatearFecha(torneo.startDate) + ". Tu primer rival: " +
          primerRival(bracket, participante.id) + ".");
      });
    }
  };

  root.NotificationService = NotificationService;
}(window));
