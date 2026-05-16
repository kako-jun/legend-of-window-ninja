import { describe, expect, it } from 'vitest'
import { Container } from 'pixi.js'
import { ShurikenSystem } from './shuriken'
import { SHURIKEN, STAGE_WIDTH } from './constants'

describe('ShurikenSystem (Issue #7)', () => {
  it('初回 tryFire は成功し activeCount=1 になる', () => {
    const layer = new Container()
    const sys = new ShurikenSystem(layer)
    const ok = sys.tryFire(100, 100, 1, 0)
    expect(ok).toBe(true)
    expect(sys.activeCount()).toBe(1)
  })

  it('lastFiredMs から fireRateMs (300) 未満で tryFire を呼ぶと false で active 数は増えない', () => {
    const layer = new Container()
    const sys = new ShurikenSystem(layer)
    sys.tryFire(100, 100, 1, 0)
    const ok = sys.tryFire(100, 100, 1, SHURIKEN.fireRateMs - 1)
    expect(ok).toBe(false)
    expect(sys.activeCount()).toBe(1)
  })

  it('fireRateMs 経過後の tryFire は再び成功する', () => {
    const layer = new Container()
    const sys = new ShurikenSystem(layer)
    sys.tryFire(100, 100, 1, 0)
    const ok = sys.tryFire(100, 100, 1, SHURIKEN.fireRateMs)
    expect(ok).toBe(true)
    expect(sys.activeCount()).toBe(2)
  })

  it('poolSize (20) まで詰めた状態で fireRateMs 経過後の tryFire は false を返す', () => {
    const layer = new Container()
    const sys = new ShurikenSystem(layer)
    // poolSize 個発射
    for (let i = 0; i < SHURIKEN.poolSize; i++) {
      const t = i * SHURIKEN.fireRateMs
      const ok = sys.tryFire(100, 100, 1, t)
      expect(ok).toBe(true)
    }
    expect(sys.activeCount()).toBe(SHURIKEN.poolSize)
    // pool が満杯 → fireRate は経過していても空きスロットがない
    const ok = sys.tryFire(100, 100, 1, SHURIKEN.poolSize * SHURIKEN.fireRateMs)
    expect(ok).toBe(false)
    expect(sys.activeCount()).toBe(SHURIKEN.poolSize)
  })

  it('facing=-1 で発射すると vx が負 (-SHURIKEN.speed) になる', () => {
    const layer = new Container()
    const sys = new ShurikenSystem(layer)
    sys.tryFire(400, 300, -1, 0)
    // 1 フレーム update で左に動くことで vx の符号を確認する (内部 vx は private のため挙動で間接確認)
    // 100ms 進めると 500 px/sec * 0.1 = 50px 左に動くはず
    // (前フレームの位置はおおむね 400 + facing*20 = 380)
    sys.update(100)
    // recycle されない範囲で左にずれる
    expect(sys.activeCount()).toBe(1)
    // 画面外 (-50 未満) に出るとは限らないが、x 軸はリリース時の facing で決まる方向だけに進むので、
    // 1000ms 後には -50 を超えて recycle される
    sys.update(1000)
    expect(sys.activeCount()).toBe(0)
  })

  it('画面右外 (STAGE_WIDTH + 50 超え) に出た active 手裏剣は recycle されて activeCount が減る', () => {
    const layer = new Container()
    const sys = new ShurikenSystem(layer)
    // STAGE_WIDTH 寄りで右向きに発射
    sys.tryFire(STAGE_WIDTH - 100, 300, 1, 0)
    expect(sys.activeCount()).toBe(1)
    // 500 px/sec で右に進む。150 + 50 余裕 → 0.5s 弱で出ていく
    sys.update(600)
    expect(sys.activeCount()).toBe(0)
  })

  it('update の rotation 進行量が deltaMs に比例 (60fps で rotationPerFrame ぴったり、120ms で 2 倍)', () => {
    const layer = new Container()
    const sys = new ShurikenSystem(layer)
    sys.tryFire(100, 100, 1, 0)
    // 内部の Graphics 参照を取るため layer の子を覗く (1 個発射時は最初の active gfx を見つける)
    const activeGfx = layer.children.find(c => c.visible === true)
    expect(activeGfx).toBeDefined()
    const initial = activeGfx!.rotation
    // 1 フレーム (60fps 想定 = 1000/60ms) → 増分は rotationPerFrame
    const FRAME60 = 1000 / 60
    sys.update(FRAME60)
    expect(activeGfx!.rotation).toBeCloseTo(
      initial + SHURIKEN.rotationPerFrame,
      4
    )
    // さらに 2 フレーム分 (120ms) 進める → 増分は rotationPerFrame * (120/16.667) ≒ 2 倍より少し多い
    const before = activeGfx!.rotation
    sys.update(120)
    const expectedDelta = SHURIKEN.rotationPerFrame * (120 / FRAME60)
    expect(activeGfx!.rotation - before).toBeCloseTo(expectedDelta, 4)
  })
})
