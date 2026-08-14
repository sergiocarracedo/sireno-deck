# Checklist de integración con el SO — beta

Pulsa cada botón del deck principal y comprueba el resultado. Si algo falla,
anota OS + versión + nombre del botón + pega el log (`~/.sireno-deck/daemon.log`).

## 1. Inyección de emoji (key-macro + clipboard)

- [ ] Abre el selector de emoji y elige 😀 → debe escribirse en el campo de texto enfocado.
- [ ] Elige 🔥 y 🎉 — confirma que salen en orden, sin pegar dos veces.
- [ ] Cierra y reabre el deck — el emoji debe seguir inyectándose igual.

## 2. Macros de teclado (key-macro)

- [ ] Acción `type://Hello World` → aparece "Hello World" en el editor enfocado.
- [ ] Combo `ctrl+l` → enfoca la barra de direcciones del navegador.
- [ ] Combo `cmd+space` (mac) / `super` (linux) / `win` (win) → abre launcher del SO.
- [ ] Modificadores combinados: `ctrl+shift+t` reabre la última pestaña cerrada.

## 3. Portapapeles (clipboard)

- [ ] Botón "Copiar texto" del deck → pega en otra app con Ctrl/⌘+V y aparece.
- [ ] Cierra y reabre la app destino — el texto sigue ahí (no se sobrescribe).

## 4. Notificaciones del SO (notification)

- [ ] Dispara una notificación desde un botón → aparece toast nativo del SO.
- [ ] Confirma que el toast se cierra solo y no deja la app colgada.

## 5. Sesión / bloqueo / idle (session)

- [ ] Botón "session-info" → muestra tu usuario real y tiempo de sesión.
- [ ] Bloquea la pantalla (Win+L / Ctrl+⌘+Q / super+L) → el deck refleja estado `locked`.
- [ ] Deja el equipo idle 1 min → el deck refleja `idle` y vuelve a `active` al mover el ratón.

## 6. Detección de ventana activa (active-app)

- [ ] Botón "active-app" → muestra el nombre de la app en primer plano (Terminal, Chrome, etc.).
- [ ] Cambia a otra app y vuelve a pulsar → el nombre debe actualizarse en <1 s.
- [ ] Minimiza todo → debe devolver `""` o `"Desktop"` (lo que decida el provider del SO).
- [ ] macOS: comprueba que requiere permiso de Accesibilidad (prompt en la primera ejecución).

## 7. Audio / medios (media)

- [ ] Botones `volume-up` / `volume-down` / `mute` → la barra del SO refleja el cambio.
- [ ] `play-pause` / `next` / `prev` → controlan Spotify / navegador / reproductor nativo.
- [ ] Reproduce algo, abre Discord, pulsa otra vez `play-pause` → ahora controla Discord.

## 8. Brillo (brightness)

- [ ] `brightness-down` x3 → la pantalla baja visiblemente.
- [ ] `brightness-up` x3 → vuelve al nivel anterior.
- [ ] Linux sin `light` ni `xbacklight` → el botón debe mostrar `core:temporary-error` y decir "check logs".

## 9. Acción arbitraria (action button)

- [ ] Configura un botón con `command: xdotool key super` (linux) / `osascript -e ...` (mac) / `powershell ...` (win) → debe ejecutarse.
- [ ] Acción con exit code != 0 → el botón debe ponerse rojo 5 s (variant `error`).

## 10. Métricas (system-status, sin shell-out)

- [ ] El deck muestra CPU / RAM / GPU actualizándose cada ~1 s.
- [ ] Abre una app pesada (compilador, navegador con 30 tabs) → los % suben.

## Si algo falla

1. OS + versión (`win11 23H2`, `macOS 14.4`, `ubuntu 24.04`, compositor...)
2. Botón exacto que falló
3. ¿Salió el toast rojo `core:temporary-error`? Transcríbelo.
4. Últimas 50 líneas de `~/.sireno-deck/daemon.log`
