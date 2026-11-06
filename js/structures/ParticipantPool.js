/* La piscina conserva las solicitudes aprobadas antes de crear las llaves. */
(function (root) {
  "use strict";

  function ParticipantPool(participants) {
    this.participants = Array.isArray(participants) ? participants.slice() : [];
  }

  ParticipantPool.prototype.add = function (participant) {
    if (!participant || !participant.id || !participant.name) {
      throw new Error("El participante necesita un identificador y un nombre.");
    }
    if (this.participants.some(function (item) { return item.id === participant.id; })) {
      throw new Error("El participante ya está en la piscina.");
    }
    this.participants.push(participant);
  };

  ParticipantPool.prototype.rank = function () {
    return this.participants.slice().sort(function (a, b) {
      var points = Number(b.poolPoints || 0) - Number(a.poolPoints || 0);
      if (points !== 0) return points;
      return String(a.name).localeCompare(String(b.name), "es");
    });
  };

  ParticipantPool.prototype.qualify = function (capacity) {
    if (!Number.isInteger(capacity) || capacity < 2 || (capacity & (capacity - 1)) !== 0) {
      throw new Error("El tamaño del bracket debe ser una potencia de 2 mayor o igual a 2.");
    }
    if (this.participants.length < 2) {
      throw new Error("Se necesitan al menos dos participantes aprobados para generar las llaves.");
    }
    return this.rank().slice(0, capacity);
  };

  root.ParticipantPool = ParticipantPool;
}(window));
