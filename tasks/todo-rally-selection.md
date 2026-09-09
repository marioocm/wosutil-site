# Todo: Rally Selection + Call Queue

## Task T1: Lógica pura + tests
**Description:** Crear `src/rally-selection.ts` (toggle, persistencia filtrada, max+3, `buildQueue` desc, trigger `==`, consumo `<` corriendo, restore) + `src/rally-selection.test.ts` con TDD RED→GREEN.
**Acceptance criteria:**
- [ ] Toggle añade/quita; nulos no seleccionables (`isSelectable` por efectivo).
- [ ] `getMaxMarchSec`/`getDefaultDurationSec` (+3) con ejemplo 66+38→69; null si vacío.
- [ ] `buildQueue` desc + desempate nombre; trigger solo en `==`; Pause no consume; restore limpia.
- [ ] Storage round-trip filtra ids inexistentes; corrupt → vacío sin throw.
**Verification:**
- [ ] `pnpm test` verde (nuevos tests fallan antes, pasan después).
- [ ] `pnpm typecheck` verde.
**Dependencies:** SPEC. **Files likely touched:** `src/rally-selection.ts`, `src/rally-selection.test.ts`. **Estimated scope:** S (2 files).

## Task T2: Selección UI en tarjetas
**Description:** Toggle en `src/components/rally-callers.ts`: li clicable salvo controles, check con `aria-pressed`, name `w-auto max-w` (hueco clicable), estilo seleccionado tokens, persistencia + `onSelectionChange`.
**Acceptance criteria:**
- [ ] Click fondo tarjeta hace toggle; click en nombre/march/Pets/papelera edita sin toggle.
- [ ] Teclado: check focuseable, `Enter/Espacio` toggle, `aria-pressed` + label `Select <name>`.
- [ ] Sin march: check `aria-disabled`, tooltip, click no selecciona.
- [ ] Recarga persiste selección; edit inline/pets intactos.
**Verification:**
- [ ] Manual click/teclado + `pnpm typecheck`.
- [ ] `pnpm test` sin regresiones.
**Dependencies:** T1. **Files likely touched:** `src/components/rally-callers.ts`. **Estimated scope:** S (1-2 files).

## Task T3a: Panel cola
**Description:** Crear `src/components/rally-queue.ts` + `section#rally-queue` en `countdown/index.html` (header + `Set Max +3s` + lista + empty states, flash `bg-primary`, salida con transición, `aria-live`).
**Acceptance criteria:**
- [ ] Filas `nombre + MM:SS tabular`, orden mayor-arriba; vacía: hint selección; todo hecho: hint Reset.
- [ ] En `display==callAtSec` corriendo: flash + `aria-live` "call now"; al bajar: sale y resto sube animado.
**Verification:**
- [ ] Manual con timer corto + `pnpm typecheck`.
**Dependencies:** T1. **Files likely touched:** `src/components/rally-queue.ts`, `countdown/index.html`. **Estimated scope:** M (2-3 files).

## Task T3b: Wiring timer
**Description:** En `src/main.ts`: suscribir selección→cola, auto híbrido (`configured==0 && !running`), botón Max+3 (habilitado con selección y parado), tick `displaySec+running`, restore en Reset/Clear/editar/replay.
**Acceptance criteria:**
- [ ] Seleccionar con `00:00` parado pone `max+3` (66+38→69); con tiempo manual no pisa.
- [ ] Botón pone `max+3` y restaura cola; deshabilitado sin selección o corriendo.
- [ ] Reset/Clear/editar inputs/Play-tras-finish restauran; Pause congela sin consumir.
**Verification:**
- [ ] Manual end-to-end + `pnpm typecheck && pnpm test`.
**Dependencies:** T2, T3a. **Files likely touched:** `src/main.ts`. **Estimated scope:** S (1-2 files).

## Task T4: Polish + DoD
**Description:** Tokens/a11y/responsive, `pnpm typecheck && pnpm test && pnpm build`, sanity `dist/`, review 5 ejes + simplificación.
**Acceptance criteria:**
- [ ] Sin hex fuera de tokens; Tab completo; 320/768/1024/1440 OK; consola limpia.
- [ ] `dist/countdown/index.html` tiene `#rally-queue` + `#rally-max3`; cola renderiza.
**Verification:**
- [ ] `pnpm typecheck && pnpm test && pnpm build` verde + inspección `dist/`.
**Dependencies:** T3b. **Files likely touched:** varios menores. **Estimated scope:** S.

## Checkpoints
- [ ] Tras T1: tests + typecheck.
- [ ] Tras T2: toggle persiste, edición intacta.
- [ ] Tras T3b: `1:09`, flash/salida/restore OK.
- [ ] Final: DoD verde + PR.
