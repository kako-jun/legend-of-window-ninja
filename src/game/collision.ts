// 自前 AABB 衝突判定 (Issue #6)
// X 軸 → Y 軸 を分離して解決することですり抜けと壁ずりを防ぐ。
// 戻り値: 「次フレームの位置」と「接地フラグ」など。

import type { CollisionRect } from './terrain'
import type { PlayerState } from './types'
import { PLAYER } from './constants'

export interface AABB {
  x: number
  y: number
  width: number
  height: number
}

export const aabbOverlaps = (a: AABB, b: AABB): boolean => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

const playerAABBAt = (x: number, y: number): AABB => ({
  x: x - PLAYER.width / 2,
  y: y - PLAYER.height / 2,
  width: PLAYER.width,
  height: PLAYER.height,
})

export interface ResolveResult {
  x: number
  y: number
  isOnGround: boolean
  hitCeiling: boolean
  hitWall: boolean
}

/**
 * X 軸を先に解く: dx 方向にめり込むなら壁の手前に押し戻す
 * Y 軸を後に解く: dy 方向にめり込むなら床/天井の手前に押し戻し、接地/天井ヒットを記録
 */
export const resolveCollisions = (
  player: PlayerState,
  nextX: number,
  nextY: number,
  rects: ReadonlyArray<CollisionRect>
): ResolveResult => {
  let resolvedX = nextX
  let resolvedY = player.position.y
  let hitWall = false
  let hitCeiling = false
  let isOnGround = false

  // --- X 軸 ---
  const aabbX = playerAABBAt(resolvedX, resolvedY)
  for (const r of rects) {
    if (!aabbOverlaps(aabbX, r)) continue
    if (player.velocity.x > 0) {
      resolvedX = r.x - PLAYER.width / 2
    } else if (player.velocity.x < 0) {
      resolvedX = r.x + r.width + PLAYER.width / 2
    }
    player.velocity.x = 0
    hitWall = true
    aabbX.x = resolvedX - PLAYER.width / 2
  }

  // --- Y 軸 ---
  resolvedY = nextY
  const aabbY = playerAABBAt(resolvedX, resolvedY)
  for (const r of rects) {
    if (!aabbOverlaps(aabbY, r)) continue
    if (player.velocity.y > 0) {
      // 下方向: 床に着地
      resolvedY = r.y - PLAYER.height / 2
      isOnGround = true
    } else if (player.velocity.y < 0) {
      // 上方向: 天井ヒット
      resolvedY = r.y + r.height + PLAYER.height / 2
      hitCeiling = true
    }
    player.velocity.y = 0
    aabbY.y = resolvedY - PLAYER.height / 2
  }

  return {
    x: resolvedX,
    y: resolvedY,
    isOnGround,
    hitCeiling,
    hitWall,
  }
}
