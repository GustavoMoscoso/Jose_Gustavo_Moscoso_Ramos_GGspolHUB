# Manual de usuario — GGspol Hub

## 1. Acerca de este manual

Este manual explica cómo utilizar el prototipo GGspol Hub desde dos perfiles: visitante y Administrador. La aplicación permite consultar torneos, registrar solicitudes de participación, gestionar competencias y visualizar llaves y resultados.

GGspol Hub es un prototipo académico de frontend. No se debe utilizar para administrar datos privados ni torneos reales.

## 2. Antes de empezar

- Abre el sitio en un navegador actualizado. Para cargar Bootstrap desde su CDN se necesita conexión a Internet.
- No necesitas crear una cuenta para navegar ni enviar una solicitud.
- Los datos se guardan en el almacenamiento local (`localStorage`) del navegador.
- En el sitio publicado, cada navegador y dispositivo mantiene sus propios datos. Las inscripciones y cambios realizados en el navegador de un visitante **no se comparten automáticamente** con el navegador del Administrador. Para una demostración compartida, utiliza el mismo navegador y perfil.
- Las confirmaciones y notificaciones son simuladas dentro de la aplicación. No se envían correos electrónicos.
- El acceso de staff y sus claves son demostrativos; no protegen información real.

## 3. Guía para visitantes

### 3.1 Navegar por el sitio

Utiliza la barra de navegación para abrir:

- **Inicio:** resumen y accesos rápidos.
- **Torneos:** competencias disponibles y sus fechas, modalidad, premios y estado.
- **Estadísticas:** campeones de torneos culminados.
- **Nosotros:** propósito de GGspol Hub e información del club.

En **Torneos**, puedes escribir parte del nombre o videojuego en el buscador y filtrar por estado: inscripciones, en curso o culminado. En pantallas pequeñas, abre el menú con el botón ☰.

### 3.2 Enviar una solicitud de inscripción

1. Entra en **Torneos** y elige **Inscribirme** en un torneo con inscripciones abiertas. También puedes usar el acceso **Inscribirme** de Inicio.
2. Selecciona el torneo. Los campos cambian según su modalidad:
   - **Individual:** nombre, alias de juego, correo y facultad.
   - **Equipos:** nombre del equipo, correo de contacto, facultad y roster (un jugador por línea).
3. Si el torneo tiene restricción por facultad, selecciona esa facultad.
4. Marca la casilla de confirmación y pulsa **Enviar solicitud**.
5. La página indicará que la solicitud quedó **Pendiente**. La respuesta se almacena solo en ese navegador.

Si no aparece el torneo en la lista, comprueba que siga abierto para inscripciones. Los campos obligatorios y el formato del correo deben ser válidos.

### 3.3 Consultar una solicitud

En el formulario de inscripción, busca **Consultar mi solicitud**, escribe el correo usado al inscribirte y pulsa **Consultar**. Se mostrarán las solicitudes locales asociadas a ese correo y su estado: pendiente, aprobada o rechazada. Si no aparece ninguna, confirma que escribiste el correo igual que en el formulario y que estás usando el mismo navegador donde enviaste la solicitud.

### 3.4 Consultar llaves y resultados

Desde una tarjeta de torneo que ya tenga llaves, selecciona **Ver llaves**. La vista muestra las rondas, participantes, BYEs, resultados y podio cuando estén disponibles. En doble eliminación puede aparecer una gran final de reset si el participante que llega desde el bracket de perdedores gana la primera gran final.

En **Estadísticas** puedes consultar el historial de campeones registrados al culminar torneos.

## 4. Guía para Administradores

### 4.1 Entrar al panel de staff

1. Pulsa **Acceso staff** en la barra superior.
2. Selecciona **Administrador**.
3. Escribe la clave de demostración `admin123` y pulsa **Entrar al panel**.
4. Al terminar, usa **Salir** para cerrar el perfil simulado.

La clave está visible en el código del prototipo y no constituye una contraseña segura. No la reutilices en otros servicios.

### 4.2 Crear un torneo

En **Gestión de torneos**, completa **Crear torneo**:

1. Escribe el nombre y selecciona el videojuego.
2. Elige la modalidad individual o equipos.
3. Elige eliminación simple o doble.
4. Define el tamaño del bracket. Las capacidades disponibles son 2, 4, 8, 16, 32 y 64 participantes.
5. Indica fecha de inicio y cierre de inscripción. El cierre debe ser el mismo día o anterior al inicio.
6. Completa, si corresponde, el premio, la restricción por facultad y los requisitos.
7. Deja marcada la opción de podio de tres puestos si quieres habilitar la asignación del bronce.
8. Pulsa **Crear torneo**. El torneo aparecerá disponible para inscripciones en este navegador.

### 4.3 Revisar solicitudes y administrar el pool

1. En **Solicitudes y pool**, selecciona el torneo.
2. En **Pendientes**, pulsa **Aprobar** para aceptar una solicitud o **Rechazar** para descartarla. Una solicitud rechazada se puede volver a revisar.
3. Las solicitudes aprobadas aparecen en **Pool aprobado**. Puedes cambiar su puntaje de piscina y pulsar **Guardar seed** para guardar el orden de clasificación.
4. Cuando existan al menos dos participantes aprobados, pulsa **Cerrar pool y generar llaves**.

El sistema ordena a los aprobados por puntaje y clasifica hasta el límite del bracket. Si hay menos aprobados que cupos, los espacios restantes se completan con BYEs; si hay más, el corte lo determina el puntaje. Al generar las llaves, el pool se cierra y comienza el torneo.

Las notificaciones de esta sección son registros locales de demostración, no mensajes enviados por correo.

### 4.4 Registrar resultados

1. Abre las llaves del torneo desde la tabla **Administrar estados y llaves** o la vista de torneos.
2. En una partida que tenga dos participantes listos, pulsa **Registrar resultado**.
3. Escribe un marcador entero para cada lado y pulsa **Guardar resultado**. No se permiten empates.
4. El bracket avanzará automáticamente y habilitará los encuentros siguientes cuando sus participantes estén definidos.

El Administrador también puede editar un resultado ya registrado. Cambiarlo puede invalidar resultados posteriores que dependían de ese partido; revisa de nuevo las rondas avanzadas.

El podio de eliminación simple utiliza un partido por el tercer puesto cuando corresponde; con tres clasificados puede asignar el bronce automáticamente. Con menos de tres clasificados no se asigna. En doble eliminación, cuando hay suficientes clasificados, el tercer puesto corresponde a quien pierde la final del bracket de perdedores.

### 4.5 Reabrir o eliminar un torneo

- **Abrir inscripciones:** permite volver a abrir inscripciones para un torneo que aún no tiene llaves.
- **Eliminar:** elimina un torneo sin bracket y sus solicitudes asociadas. La aplicación solicita confirmación antes de hacerlo.

Un torneo que ya tiene bracket no ofrece la acción de eliminación desde la tabla.

### 4.6 Restaurar datos de demostración

El botón **Restaurar datos demo** reemplaza los datos locales actuales con los datos iniciales de demostración. Esta acción puede borrar torneos y solicitudes creados en ese navegador. Confirma solo si realmente quieres descartar esos cambios.

## 5. Límites importantes del prototipo

- No hay servidor, base de datos ni sincronización entre usuarios o dispositivos.
- Inscripciones, torneos, resultados y notificaciones se guardan localmente en el navegador que los creó.
- No se envían correos electrónicos reales.
- Los perfiles y permisos son simulados; no protegen operaciones ni datos frente a usuarios.
- Los datos de demostración pueden restaurarse desde el panel de staff, reemplazando los cambios locales.
