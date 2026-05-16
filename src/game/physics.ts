// 影の伝説 (NES) 実機計測準拠の物理 (Issue #5)。constants.ts の定数を参照。
//
// マリオ3 物理 (endroll-jumpers) との大きな違い:
// - ダッシュ概念なし。横速度は walkMaxSpeed (120 px/sec) 固定
// - 空中制御なし: ジャンプ開始時の velocity.x を保持し、空中で left/right を入力しても velocity.x は変えない
// - 「走り中に上ボタンのみ」= 横入力していなければ velocity.x を 0 にしてから垂直ジャンプ
// - 上昇 HELD / 上昇 RELEASED / 下降 で 3 段階重力
//     → HELD と RELEASED で短/長ジャンプの高度差を作り、頂点で速度が小さい時間を伸ばすことで宙浮き感を出す
//     → 下降は上昇 HELD の 1.5 倍
// - 天井ヒットで velocity.y=0 リセット (collision.ts 側)

import {
  ASCENT_GRAVITY_HELD,
  ASCENT_GRAVITY_RELEASED,
  GRAVITY,
  PLAYER,
} from './constants'
import type { PlayerState } from './types'

export interface PhysicsInput {
  left: boolean
  right: boolean
  jumpHeld: boolean
  jumpJustPressed: boolean
}

const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n))

/**
 * プレイヤーの速度を 1 フレーム分進める。位置反映は integratePosition で別途。
 * isOnGround は前フレームの衝突解決結果として渡される前提。
 */
export const stepPlayerPhysics = (
  player: PlayerState,
  input: PhysicsInput,
  deltaMs: number
): void => {
  const dt = deltaMs / 1000

  const inputDir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  const onGround = player.isOnGround

  // --- 横移動 ---
  // 空中では一切 velocity.x を変えない (空中制御なしルール)
  if (onGround) {
    if (inputDir !== 0) {
      player.facing = inputDir > 0 ? 1 : -1
      // 入力方向に加速 (1200 px/sec² で 100ms かけて max に到達)
      player.velocity.x += PLAYER.walkAccel * inputDir * dt
      player.velocity.x = clamp(
        player.velocity.x,
        -PLAYER.walkMaxSpeed,
        PLAYER.walkMaxSpeed
      )
    } else {
      // 摩擦 (1F 60fps あたり groundFriction 倍)
      player.velocity.x *= Math.pow(PLAYER.groundFriction, dt * 60)
      if (Math.abs(player.velocity.x) < 1) player.velocity.x = 0
    }
  }
  // 空中は airFriction = 1.0 で慣性維持。何もしない (velocity.x 据え置き)。

  // --- ジャンプ開始 ---
  if (input.jumpJustPressed && onGround) {
    // 「走り中に上ボタンのみ」= 横入力していなければ垂直ジャンプ。
    // 横入力中はそのときの velocity.x を保持して斜めジャンプ。
    if (inputDir === 0) {
      player.velocity.x = 0
    }
    player.velocity.y = PLAYER.jumpInitialVelocity
    player.isJumping = true
    player.jumpHoldMs = 0
    player.isOnGround = false
  }

  // --- 重力 (上昇中は A 押下/解放で分岐、下降中は GRAVITY) ---
  let gravityToApply: number
  if (player.velocity.y < 0) {
    const stillInHoldPhase =
      player.isJumping &&
      input.jumpHeld &&
      player.jumpHoldMs < PLAYER.maxJumpHoldMs
    if (stillInHoldPhase) {
      gravityToApply = ASCENT_GRAVITY_HELD
      player.jumpHoldMs += deltaMs
    } else {
      gravityToApply = ASCENT_GRAVITY_RELEASED
      player.isJumping = false
    }
  } else {
    gravityToApply = GRAVITY
    player.isJumping = false
  }
  player.velocity.y += gravityToApply * dt
  if (player.velocity.y > PLAYER.maxFallSpeed) {
    player.velocity.y = PLAYER.maxFallSpeed
  }
}

/** velocity を反映した次フレームの位置を計算。衝突解決は別途。 */
export const integratePosition = (
  player: PlayerState,
  deltaMs: number
): { nextX: number; nextY: number } => {
  const dt = deltaMs / 1000
  return {
    nextX: player.position.x + player.velocity.x * dt,
    nextY: player.position.y + player.velocity.y * dt,
  }
}
