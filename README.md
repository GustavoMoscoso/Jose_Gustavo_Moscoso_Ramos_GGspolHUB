# GGspol Hub

Prototipo web académico para consultar torneos, enviar solicitudes de inscripción y demostrar la gestión de participantes y brackets del club GGspol.

Consulta el [Manual de usuario](./MANUAL_USUARIO.md) para ver los pasos de uso como visitante y Administrador.

## Alcance de esta etapa

Esta versión sigue la Guía de Proyecto – Etapa 1: utiliza HTML, CSS, Bootstrap y JavaScript, con datos de demostración y persistencia local en `localStorage`. No tiene backend, base de datos, APIs, integración con Challonge ni aplicación móvil.

El acceso de staff y los roles son simulados. Las notificaciones se guardan y muestran dentro del navegador para demostrar el flujo; **no se envían correos reales**. No usar este prototipo para información privada ni torneos reales.

## Cómo probarlo

1. Abre `index.html` directamente en un navegador o usa Live Server desde Visual Studio Code.
2. Se recomienda conexión a Internet para cargar Bootstrap desde su CDN. La lógica del prototipo y sus datos permanecen locales.
3. Explora los torneos e intenta una inscripción pública. Se aceptan correos de cualquier dominio.
4. En **Acceso staff**, usa `admin123` para el perfil Administrador o `arbitro123` para el perfil Árbitro. Estas claves son únicamente de demostración.
5. El Administrador puede revisar solicitudes, cambiar el puntaje de clasificación, crear torneos, cerrar el pool y generar llaves. Administrador y Árbitro pueden registrar resultados.
6. La vista pública permite consultar brackets, estados e historial de campeones.
7. En el panel staff, **Restaurar datos demo** reemplaza los cambios locales con los datos iniciales.

## Estructura principal

- `index.html`: navegación y vistas del prototipo.
- `css/styles.css`: estilos y adaptación a pantallas móviles.
- `assets/img/` y `assets/videos/`: logotipo, fotografías de actividades y videos mostrados en “Nosotros”.
- `js/config/catalogos.js`: videojuegos, facultades y tamaños de bracket.
- `js/structures/ParticipantPool.js`: puntajes, orden y corte de clasificados.
- `js/structures/BracketEngine.js`: generación y avance de eliminación simple y doble.
- `js/services/StorageRepository.js`: datos iniciales, validaciones y persistencia local.
- `js/services/AuthService.js`: permisos de los perfiles ficticios.
- `js/controllers/app.js`: interacción de formularios, navegación y renderizado.
- `tests/bracket-engine.test.js`: pruebas automáticas del pool y del motor de brackets.

## Pruebas automáticas

Con Node.js instalado, ejecuta desde la carpeta del proyecto:

```bash
node --test tests/bracket-engine.test.js
```

Los cambios guardados viven en el almacenamiento local del navegador actual. Para borrarlos manualmente, elimina la clave `ggspol_hub_etapa1` del almacenamiento del sitio o usa **Restaurar datos demo**.
