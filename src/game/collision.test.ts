import { describe, expect, it } from 'vitest'
import { aabbOverlaps, resolveCollisions, type AABB } from './collision'
import { createInitialPlayerState } from './types'
import { PLAYER } from './constants'
import type { CollisionRect } from './terrain'

describe('aabbOverlaps', () => {
  it('重ならない 2 AABB に対して aabbOverlaps が false を返す', () => {
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 }
    const b: AABB = { x: 20, y: 20, width: 10, height: 10 }
    expect(aabbOverlaps(a, b)).toBe(false)
  })

  it('辺が完全に一致する 2 AABB は aabbOverlaps が false (strict less-than 境界)', () => {
    // a の右端 = b の左端。a.x + a.width === b.x で、実装は < で判定するため重なりとみなさない
    const a: AABB = { x: 0, y: 0, width: 10, height: 10 }
    const b: AABB = { x: 10, y: 0, width: 10, height: 10 }
    expect(aabbOverlaps(a, b)).toBe(false)
  })
})

describe('resolveCollisions (X→Y 分離)', () => {
  it('右向き移動でめり込んだ場合 X 軸が壁の手前 (r.x - PLAYER.width/2) に押し戻され velocity.x が 0 になる', () => {
    const p = createInitialPlayerState(100, 100)
    p.velocity.x = 200 // 右向き
    p.velocity.y = 0
    // 右側の壁矩形
    const wall: CollisionRect = { x: 110, y: 80, width: 20, height: 60 }
    const rects = [wall]
    // めり込むような次フレーム位置 (player の AABB は中心基準で width/height=30)
    const result = resolveCollisions(p, 130, 100, rects)
    expect(result.x).toBe(wall.x - PLAYER.width / 2)
    expect(p.velocity.x).toBe(0)
    expect(result.hitWall).toBe(true)
  })

  it('下向き移動で床にめり込んだ場合 Y 軸が r.y - PLAYER.height/2 に補正され isOnGround=true / velocity.y=0', () => {
    const p = createInitialPlayerState(100, 100)
    p.velocity.x = 0
    p.velocity.y = 300 // 下向き
    const floor: CollisionRect = { x: 50, y: 130, width: 200, height: 40 }
    const rects = [floor]
    const result = resolveCollisions(p, 100, 140, rects)
    expect(result.y).toBe(floor.y - PLAYER.height / 2)
    expect(result.isOnGround).toBe(true)
    expect(p.velocity.y).toBe(0)
  })

  it('上向き移動で天井ヒットした場合 Y 軸が r.y + r.height + PLAYER.height/2 に補正され hitCeiling=true / velocity.y=0', () => {
    const p = createInitialPlayerState(100, 100)
    p.velocity.x = 0
    p.velocity.y = -300 // 上向き
    const ceiling: CollisionRect = { x: 50, y: 60, width: 200, height: 20 }
    const rects = [ceiling]
    // めり込む位置
    const result = resolveCollisions(p, 100, 90, rects)
    expect(result.y).toBe(ceiling.y + ceiling.height + PLAYER.height / 2)
    expect(result.hitCeiling).toBe(true)
    expect(p.velocity.y).toBe(0)
  })

  it('X 解決 → Y 解決の順序で壁にめり込まずに床に降りる (角ですり抜けない)', () => {
    // 床と壁が直角で接している L 字配置。プレイヤーが斜め下に降りて角に同時に刺さる
    const p = createInitialPlayerState(100, 100)
    p.velocity.x = 200 // 右向き
    p.velocity.y = 200 // 下向き
    // 床: y=120 から。プレイヤー中心 100 → next 130 で足が y=115..145、床 (120..160) と重なる
    // 壁: x=130 から。プレイヤー中心 100 → next 140 で右端 x=125..155、壁 (130..150) と重なる
    const floor: CollisionRect = { x: 50, y: 120, width: 80, height: 40 }
    const wall: CollisionRect = { x: 130, y: 60, width: 20, height: 80 }
    const rects = [floor, wall]
    const result = resolveCollisions(p, 140, 130, rects)
    // X が先に解決されて壁の手前 (= 130 - 15 = 115) に戻る
    expect(result.x).toBe(wall.x - PLAYER.width / 2)
    // 続けて Y を解決すると床の上 (= 120 - 15 = 105) に着地する。
    // X 解決で壁の手前 115 に止まっているため、AABB(x=100..130, y=115..145) は床 (50..130, 120..160) と
    // 依然重なり、Y 軸で床の上に押し戻される (= 角ですり抜けないことの確認)。
    expect(result.y).toBe(floor.y - PLAYER.height / 2)
    expect(result.isOnGround).toBe(true)
    expect(result.hitWall).toBe(true)
  })

  it('rects が空配列のときは入力位置がそのまま返り isOnGround=false', () => {
    const p = createInitialPlayerState(100, 100)
    p.velocity.x = 50
    p.velocity.y = 50
    const result = resolveCollisions(p, 150, 160, [])
    expect(result.x).toBe(150)
    expect(result.y).toBe(160)
    expect(result.isOnGround).toBe(false)
    expect(result.hitCeiling).toBe(false)
    expect(result.hitWall).toBe(false)
  })
})
