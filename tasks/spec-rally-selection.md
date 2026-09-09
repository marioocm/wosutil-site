# Spec: Rally Selection + Call Queue

## Objective
Coordinar rally calls: click en tarjetas de rally callers las selecciona; una cola a la derecha muestra `nombre + MM:SS` (march efectivo). Cuando el countdown muestra ese segundo, la tarjeta hace flash y al segundo siguiente desaparece (el resto sube). Reset/Clear/editar/replay restauran la cola. El timer se ajusta a `max march + 3s` en modo híbrido (auto solo si está en `00:00` y parado, si no botón manual).

Usuario: rally lead con marchas distintas. Éxito: selecciona con click/teclado, cola ordenada mayor-arriba, flash+salida, `1:06 + 0:38 → 1:09`, restore total.

## Assumptions
1. `callAtSec = getEffectiveMarchSec(caller)` (con pets si activo); trigger cuando `displaySeconds == callAtSec` y `running`.
2. Selección persiste en `localStorage "wosutil:rally-selection:v1"` (array de ids); consumidos son efímeros (no persisten, reload restaura cola completa).
3. Sin march (`null`) no seleccionable (no rompe `max+3`).
4. Pause congela (no consume, mantiene flash); cualquier otra acción (Reset, Clear, editar inputs, Play tras finish) restaura consumidos.
5. Cola ordenada desc por `callAtSec`, desempate nombre.
6. Sin sonido, sin drag-order, sin persistir cola a medias.

## Tech Stack
Vite + TypeScript + Tailwind CSS v4, pnpm, Vitest. Light-only (`docs/DESIGN.md`).

## Commands
Build: `pnpm build`
Test: `pnpm test`
Typecheck: `pnpm typecheck`
Dev: `pnpm dev`

## Project Structure
```
countdown/index.html               → añadir section#rally-queue en columna derecha + botón Max+3s
src/rally-callers.ts               → existente (tipos, efectivo, sort); NO romper
src/rally-selection.ts             → NUEVO: selección + cola pura (testeado)
src/rally-selection.test.ts        → NUEVO: tests Vitest
src/components/rally-callers.ts    → MOD: toggle selección, name button angosto, check accesible
src/components/rally-queue.ts      → NUEVO: renderer cola (flash, salida animada, empty states)
src/main.ts                        → MOD: wiring selección↔cola↔timer, híbrido max+3, restore
tasks/spec-rally-selection.md      → este spec
tasks/plan-rally-selection.md      → plan
tasks/todo-rally-selection.md      → tareas
```

## Code Style
- Lógica pura en `rally-selection.ts` (sin DOM); DOM solo en `components/*`.
- IDs kebab-case con prefijo `rally-` (`rally-queue`, `rally-queue-list`, `rally-max3`, `rally-select-<id>`).
- Reusar `getEffectiveMarchSec`, `formatMarchSec`, `sortCallers`-style de `rally-callers.ts`.
- Tokens Tailwind del theme (`border-primary-deep`, `bg-primary/10`, `bg-canvas-soft`, `text-ink-mute`); sin hex sueltos; componentes <200 líneas.
- Selección: `li[data-selected="true"]` + botón check con `aria-pressed` / `role="checkbox"` pattern accesible; nombre `w-auto max-w-[10rem] truncate` (antes `flex-1`) para dejar hueco clicable; click en `li` salvo `button/input/a` hace toggle.

## Testing Strategy
- Vitest (`pnpm test`) para `rally-selection.ts`: toggle, persistencia (filtra ids inexistentes), `getMaxMarchSec`, `getDefaultDurationSec` (+3), `buildQueue` (desc+nombre), trigger `==` no `<=`, no consume en pausa, restore limpia consumidos, null no seleccionable.
- Manual + `dist/` sanity: click/teclado selecciona, pets cambian efectivo, Max+3 pone `1:09`, flash en segundo exacto y salida al siguiente, resto sube con transición, Reset/Clear/editar/replay restauran, reload persiste selección pero no consumidos, responsive 320/768/1024/1440, Tab completo, consola limpia.
- `pnpm typecheck && pnpm test && pnpm build` verde antes de push (CI).

## Boundaries
- Always: TDD para lógica pura; slices verticales que dejan build verde; no tocar `redirect.ts`/`404.html`.
- Ask first: cambiar esquema `wosutil:rally-callers:v1`, nuevas dependencias, cambios CI.
- Never: secretos, auto-pisar tiempo manual sin regla híbrida, sonido/notificaciones.

## Success Criteria
- [ ] Click en tarjeta (fuera de controles) hace toggle; `Enter/Espacio` en check también; `aria-pressed` correcto.
- [ ] Seleccionada: `border-primary-deep` + `bg-primary/10` + `-translate-y-px` + check visible; no seleccionable sin march con tooltip.
- [ ] Cola derecha bajo status: filas `nombre + MM:SS tabular`, orden mayor-arriba, empty states claros.
- [ ] `Mario 1:06 + Pedro 0:38 →` auto/botón pone `1:09`; botón `Max +3s` solo habilitado con selección y parado.
- [ ] Corriendo: en `display == callAtSec` flash (`bg-primary`, `aria-live` "call now"); al siguiente segundo desaparece con transición y resto sube.
- [ ] Reset/Clear/editar/replay restauran cola completa; Pause congela.
- [ ] Recarga: selección persiste, consumidos no.
- [ ] `pnpm typecheck && pnpm test && pnpm build` verde + `dist/` verificado.

## Open Questions
- Ninguna bloqueante. Si `Pause` debiera restaurar también (descartado: rompería el flash), reabrir.
