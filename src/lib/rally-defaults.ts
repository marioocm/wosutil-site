import {
  ENEMY_STORAGE_KEY,
  PET_DURATION_MS,
  STORAGE_KEY,
  saveCallers,
} from './rally-callers'
import type { RallyCaller } from './rally-callers'
import { SELECTION_STORAGE_KEY, saveSelection } from './rally-selection'
import { hasExistingState } from './share'

const IDS = {
  player1: 'demo-player-1',
  example33: 'demo-example-33',
  jo: 'demo-jo',
  fernandoAlonso: 'demo-fernando-alonso',
} as const

export const DEFAULT_SELECTION_IDS: readonly string[] = [IDS.player1, IDS.example33, IDS.jo]

export function buildDefaultRallyCallers(now: number): RallyCaller[] {
  return [
    {
      id: IDS.player1,
      name: 'Player 1',
      baseMarchSec: 45,
      petActive: false,
      petMarchSec: null,
      petExpiresAt: null,
    },
    {
      id: IDS.example33,
      name: 'Example 33',
      baseMarchSec: 78,
      petActive: false,
      petMarchSec: null,
      petExpiresAt: null,
    },
    {
      id: IDS.jo,
      name: 'Jo',
      baseMarchSec: 78,
      petActive: true,
      petMarchSec: 70,
      petExpiresAt: now + PET_DURATION_MS,
    },
    {
      id: IDS.fernandoAlonso,
      name: 'Fernando Alonso',
      baseMarchSec: 65,
      petActive: false,
      petMarchSec: null,
      petExpiresAt: null,
    },
  ]
}

export function seedCountdownDefaults(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  now: number,
): boolean {
  if (hasExistingState(storage)) return false
  saveCallers(storage, buildDefaultRallyCallers(now), STORAGE_KEY)
  saveCallers(storage, [], ENEMY_STORAGE_KEY)
  saveSelection(storage, new Set(DEFAULT_SELECTION_IDS), SELECTION_STORAGE_KEY)
  return true
}
