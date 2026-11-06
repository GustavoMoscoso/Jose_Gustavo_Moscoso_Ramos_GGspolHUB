/* Perfiles ficticios para demostrar qué opciones corresponden a cada rol. */
(function (root) {
  "use strict";

  var ROLE_KEY = "ggspol_hub_demo_role";
  var passwords = { ADMIN: "admin123", ARBITRO: "arbitro123" };
  var labels = { ADMIN: "Administrador", ARBITRO: "Árbitro" };
  var permissions = {
    ADMIN: ["createTournament", "reviewRegistrations", "manageBracket", "deleteTournament"],
    ARBITRO: ["manageBracket"]
  };

  function AuthService() {}

  AuthService.prototype.getRole = function () {
    var role = root.sessionStorage.getItem(ROLE_KEY);
    return passwords[role] ? role : "PUBLIC";
  };

  AuthService.prototype.login = function (role, password) {
    if (!passwords[role] || passwords[role] !== password) {
      throw new Error("La clave de demostración no coincide con el perfil seleccionado.");
    }
    root.sessionStorage.setItem(ROLE_KEY, role);
    return role;
  };

  AuthService.prototype.logout = function () {
    root.sessionStorage.removeItem(ROLE_KEY);
  };

  AuthService.prototype.can = function (permission) {
    return (permissions[this.getRole()] || []).indexOf(permission) !== -1;
  };

  AuthService.prototype.getLabel = function () {
    return labels[this.getRole()] || "Vista pública";
  };

  root.AuthService = AuthService;
}(window));
