# Implementation Plan: Rally Selection + Call Queue

## Overview
Selección por click en tarjetas (con check accesible) + cola `nombre + MM:SS` a la derecha que hace flash en `display == march` y sale al segundo siguiente. Timer híbrido `max+3`. Slices verticales: pura→selección UI→cola+timer, cada uno deja build verde.

## Architecture Decisions
- `src/rally-selection.ts` puro: `Selection = Set<string>` + cola derivada; persistencia aparte (`wosutil:rally-selection:v1`); consumidos efímeros en memoria del componente cola, no en storage.
- `components/rally-callers.ts` expone `onSelectionChange + getSelection + getCallers`; no engorda `main.ts` con DOM de callers.
- `components/rally-queue.ts` expone `setSelected(), tick(displaySec, running), restore(), onUseMax3()`; animación con clases Tailwind + `transition-all`.
- Trigger exacto `==` (no `<=`) para no disparar tarde si el tab durmió; consumo al bajar de `callAtSec` corriendo.
- Botón `rally-max3` en header de la cola (co-localizado) + auto solo si `configured==0 && !running`.

## Task List

### Phase 1: Foundation (pura + tests)
- [ ] T1: `src/rally-selection.ts` + `src/rally-selection.test.ts`

### Checkpoint: Foundation
- [ ] `pnpm test` (nuevos RED→GREEN) + `pnpm typecheck` verde.

### Phase 2: Selección UI
- [ ] T2: toggle en `components/rally-callers.ts` (li click salvo controles, check `aria-pressed`, name angosto, no-seleccionable sin march, persistencia, callback).

### Checkpoint: Selección
- [ ] Click/teclado hace toggle, recarga persiste, typecheck verde, sin romper edit inline/pets.

### Phase 3: Cola + timer
- [ ] T3a: `components/rally-queue.ts` + `section#rally-queue` (lista desc, flash, salida, empty states, `aria-live`).
- [ ] T3b: wiring `main.ts` (auto híbrido, botón Max+3, tick `displaySec`, restore en Reset/Clear/editar/replay).

### Checkpoint: Integración
- [ ] `1:06+0:38→1:09`, flash exacto y salida, restore total, pause congela.

### Phase 4: Polish + DoD
- [ ] T4: responsive/a11y tokens, `pnpm typecheck && pnpm test && pnpm build`, sanity `dist/`, review 5 ejes.

Tasks tracked in `tasks/todo-rally-selection.md`.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Click selección rompe edit inline | High | `closest('button,input,a')` guarda edición; tests manuales click en cada control |
| Re-render roba foco | Med | no re-render cola con foco; solo `textContent`/clases en tick |
| Dormir tab salta segundos | Med | trigger `==` + consumo `<` corriendo; si salta, consume sin flash (aceptado) |
| Pets cambian efectivo mid-race | Low | cola re-deriva en `setSelected`/tick con efectivo actual |
| Colores fuera de tokens | Low | solo `primary/canvas/ink/hairline`, review visual |

## Open Questions
- Ninguna. Reabrir solo si Pause debiera restaurar.
