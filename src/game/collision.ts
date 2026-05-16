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
 * X 軸を先に解く: めり込みの「浅い方向」に押し戻す (= 速度の符号ではなく深さで判定)
 * Y 軸を後に解く: 同じく深さで判定し、押し戻した方向に応じて床/天井ヒットを記録
 *
 * 速度の符号で押し戻し方向を決めると、1 矩形目で velocity.x=0 にした後の
 * 隣接する 2 矩形目で if/else どちらにも入らず押し戻されないバグになる。
 * めり込み深さ判定なら velocity=0 でも常に最短距離方向に押し戻せる。
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
  // 押し戻し方向の決定ロジック:
  //   1. 速度の符号が 0 でなければ、進行方向に基づき押し戻す (= 戻った方向)
  //   2. 速度が 0 になった後 (隣接矩形の 2 つ目など) は、めり込み深さの浅い方に押し戻す
  // これにより、1 矩形目で velocity.x=0 にした後でも 2 矩形目を正しく解決できる。
  const aabbX = playerAABBAt(resolvedX, resolvedY)
  for (const r of rects) {
    if (!aabbOverlaps(aabbX, r)) continue
    if (player.velocity.x > 0) {
      resolvedX = r.x - PLAYER.width / 2
    } else if (player.velocity.x < 0) {
      resolvedX = r.x + r.width + PLAYER.width / 2
    } else {
      // 速度 0: めり込み深さの浅い方向に押し戻す
      const overlapRight = aabbX.x + aabbX.width - r.x
      const overlapLeft = r.x + r.width - aabbX.x
      if (overlapRight < overlapLeft) {
        resolvedX = r.x - PLAYER.width / 2
      } else {
        resolvedX = r.x + r.width + PLAYER.width / 2
      }
    }
    player.velocity.x = 0
    hitWall = true
    aabbX.x = resolvedX - PLAYER.width / 2
  }

  // --- Y 軸 --- (同じく速度符号 → 0 ならめり込み深さ)
  resolvedY = nextY
  const aabbY = playerAABBAt(resolvedX, resolvedY)
  for (const r of rects) {
    if (!aabbOverlaps(aabbY, r)) continue
    if (player.velocity.y > 0) {
      resolvedY = r.y - PLAYER.height / 2
      isOnGround = true
    } else if (player.velocity.y < 0) {
      resolvedY = r.y + r.height + PLAYER.height / 2
      hitCeiling = true
    } else {
      const overlapDown = aabbY.y + aabbY.height - r.y
      const overlapUp = r.y + r.height - aabbY.y
      if (overlapDown < overlapUp) {
        resolvedY = r.y - PLAYER.height / 2
        isOnGround = true
      } else {
        resolvedY = r.y + r.height + PLAYER.height / 2
        hitCeiling = true
      }
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
