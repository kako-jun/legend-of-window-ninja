import { describe, expect, it } from 'vitest'
import { stepPlayerPhysics } from './physics'
import { createInitialPlayerState } from './types'
import {
  ASCENT_GRAVITY_HELD,
  ASCENT_GRAVITY_RELEASED,
  GRAVITY,
  PLAYER,
} from './constants'

// 60fps 基準 1 フレーム時間 (ms)。物理の dt は ms/1000。
const FRAME = 16.6667

const baseInput = {
  left: false,
  right: false,
  jumpHeld: false,
  jumpJustPressed: false,
}

describe('stepPlayerPhysics (影の伝説 実測値ベース)', () => {
  it('接地中 inputDir=+1 のとき velocity.x が walkAccel*dt 分だけ正方向に増える', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = true
    stepPlayerPhysics(p, { ...baseInput, right: true }, FRAME)
    // 1 フレーム加算量 = walkAccel * (FRAME/1000) = 1200 * 0.01666... ≒ 20
    const expected = PLAYER.walkAccel * (FRAME / 1000)
    expect(p.velocity.x).toBeCloseTo(expected, 1)
    expect(p.facing).toBe(1)
  })

  it('接地中 inputDir=+1 を継続しても velocity.x は walkMaxSpeed (120) を超えない', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = true
    // 1 秒分回す (60 フレーム) → walkAccel*1.0 = 1200 px/sec まで行く加速だが、120 でクランプされるはず
    for (let i = 0; i < 60; i++) {
      stepPlayerPhysics(p, { ...baseInput, right: true }, FRAME)
    }
    expect(p.velocity.x).toBeLessThanOrEqual(PLAYER.walkMaxSpeed)
    expect(p.velocity.x).toBeCloseTo(PLAYER.walkMaxSpeed, 1)
  })

  it('接地中 入力なしで velocity.x が groundFriction で減速し |vx|<1 で 0 に丸められる', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = true
    p.velocity.x = 50
    // 30 フレーム分摩擦をかける (groundFriction=0.7 を 30 回近く効かせれば 1 未満になる)
    for (let i = 0; i < 30; i++) {
      stepPlayerPhysics(p, baseInput, FRAME)
    }
    expect(p.velocity.x).toBe(0)
  })

  it('空中 (isOnGround=false) で left を入力しても velocity.x が変化しない', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = false
    p.velocity.x = 80 // 既にある横速度
    p.velocity.y = -50 // 上昇中 (重力分岐に注意)
    const before = p.velocity.x
    stepPlayerPhysics(p, { ...baseInput, left: true }, FRAME)
    expect(p.velocity.x).toBe(before)
  })

  it('接地中 inputDir=0 + jumpJustPressed で velocity.x が 0 にリセットされ velocity.y が jumpInitialVelocity になる', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = true
    p.velocity.x = 80 // 走り中にジャンプボタン押下したが、横入力は今フレームない (= 上ボタンのみ)
    stepPlayerPhysics(
      p,
      { ...baseInput, jumpHeld: true, jumpJustPressed: true },
      FRAME
    )
    expect(p.velocity.x).toBe(0)
    // jumpInitialVelocity = -210、ただし HELD 上昇重力で 1 フレーム分減速されて格納される
    // jump 直後の velocity.y = jumpInitialVelocity + ASCENT_GRAVITY_HELD * dt
    const expectedY =
      PLAYER.jumpInitialVelocity + ASCENT_GRAVITY_HELD * (FRAME / 1000)
    expect(p.velocity.y).toBeCloseTo(expectedY, 1)
    expect(p.isJumping).toBe(true)
    expect(p.isOnGround).toBe(false)
  })

  it('接地中 inputDir=+1 + jumpJustPressed では velocity.x が保持されたまま斜めジャンプになる', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = true
    p.velocity.x = 100
    stepPlayerPhysics(
      p,
      { ...baseInput, right: true, jumpHeld: true, jumpJustPressed: true },
      FRAME
    )
    // 横入力中はリセットされない (= 0 にならない)。walkAccel 分加速もされ得る
    expect(p.velocity.x).toBeGreaterThan(100)
    expect(p.velocity.x).toBeLessThanOrEqual(PLAYER.walkMaxSpeed)
    expect(p.isOnGround).toBe(false)
    expect(p.isJumping).toBe(true)
  })

  it('空中で jumpJustPressed を立てても二段ジャンプにならない (velocity.y が再セットされない)', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = false
    p.velocity.y = -50 // 上昇中
    p.isJumping = false // hold は既に終わっている想定
    stepPlayerPhysics(
      p,
      { ...baseInput, jumpHeld: true, jumpJustPressed: true },
      FRAME
    )
    // velocity.y は jumpInitialVelocity (-210) にならない。元の -50 から RELEASED 重力で減速して上に伸びるだけ
    expect(p.velocity.y).toBeGreaterThan(PLAYER.jumpInitialVelocity)
  })

  it('上昇中 jumpHeld=true かつ jumpHoldMs<maxJumpHoldMs では ASCENT_GRAVITY_HELD が適用される', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = false
    p.isJumping = true
    p.jumpHoldMs = 100 // まだ 333ms 未満
    p.velocity.y = -150 // 上昇中
    const before = p.velocity.y
    stepPlayerPhysics(p, { ...baseInput, jumpHeld: true }, FRAME)
    // 1 フレーム分 ASCENT_GRAVITY_HELD * dt 加算される
    const expected = before + ASCENT_GRAVITY_HELD * (FRAME / 1000)
    expect(p.velocity.y).toBeCloseTo(expected, 2)
  })

  it('上昇中 jumpHeld を離した瞬間に ASCENT_GRAVITY_RELEASED に切り替わり isJumping が false になる', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = false
    p.isJumping = true
    p.jumpHoldMs = 100
    p.velocity.y = -150
    const before = p.velocity.y
    stepPlayerPhysics(p, { ...baseInput, jumpHeld: false }, FRAME)
    // RELEASED 重力が適用される
    const expected = before + ASCENT_GRAVITY_RELEASED * (FRAME / 1000)
    expect(p.velocity.y).toBeCloseTo(expected, 2)
    expect(p.isJumping).toBe(false)
  })

  it('下降中 (velocity.y>0) は GRAVITY が適用され maxFallSpeed (400) でクランプされる', () => {
    const p = createInitialPlayerState(0, 0)
    p.isOnGround = false
    p.velocity.y = 10 // 下降開始
    // 適用前後で 1 フレームでは GRAVITY が乗ること
    const before = p.velocity.y
    stepPlayerPhysics(p, baseInput, FRAME)
    const expected = before + GRAVITY * (FRAME / 1000)
    expect(p.velocity.y).toBeCloseTo(expected, 2)
    expect(p.isJumping).toBe(false)
    // 長時間落下で maxFallSpeed を超えないこと
    for (let i = 0; i < 600; i++) {
      stepPlayerPhysics(p, baseInput, FRAME)
    }
    expect(p.velocity.y).toBeLessThanOrEqual(PLAYER.maxFallSpeed)
    expect(p.velocity.y).toBeCloseTo(PLAYER.maxFallSpeed, 1)
  })
})
