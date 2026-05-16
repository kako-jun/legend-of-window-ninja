// ゲーム状態の型定義 (Issue #3)
// State をシーン外でも引き回せるように純粋データとして定義し、initWithState で
// テスト・リスタート時の初期化を一貫させる。

export type GameMode = 'title' | 'game' | 'gameover'

export interface Vec2 {
  x: number
  y: number
}

export interface PlayerState {
  position: Vec2
  velocity: Vec2
  isOnGround: boolean
  isJumping: boolean
  jumpHoldMs: number
  facing: 1 | -1
  alive: boolean
}

export interface GameState {
  mode: GameMode
  player: PlayerState
  score: number
  elapsedMs: number
}

export const createInitialPlayerState = (
  spawnX: number,
  spawnY: number
): PlayerState => ({
  position: { x: spawnX, y: spawnY },
  velocity: { x: 0, y: 0 },
  isOnGround: false,
  isJumping: false,
  jumpHoldMs: 0,
  facing: 1,
  alive: true,
})

export const createInitialState = (
  mode: GameMode,
  spawnX: number,
  spawnY: number
): GameState => ({
  mode,
  player: createInitialPlayerState(spawnX, spawnY),
  score: 0,
  elapsedMs: 0,
})

/**
 * 既存 state があればそれを使い、なければ factory() で新規作成する。
 * テストでの state 注入 / シーンリスタートでの初期化に使う。
 */
export const initWithState = <T extends GameState>(
  state: T | undefined,
  factory: () => T
): T => {
  return state ?? factory()
}
