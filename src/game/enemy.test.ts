import { describe, expect, it, vi } from 'vitest'
import { Container } from 'pixi.js'
import { EnemySystem, type SpawnContext } from './enemy'
import { ENEMY, STAGE_WIDTH } from './constants'
import type { CollisionRect } from './terrain'

// 標準地面 (createDefaultStage の地面相当)
const groundRect: CollisionRect = {
  x: 0,
  y: 560,
  width: STAGE_WIDTH,
  height: 40,
}

const makeCtx = (random: () => number, rects = [groundRect]): SpawnContext => ({
  random,
  rects,
})

describe('EnemySystem (Issue #8)', () => {
  it('update を spawnIntervalMs (2000ms) 未満で呼んでも spawn しない', () => {
    const layer = new Container()
    const sys = new EnemySystem(layer)
    const random = vi.fn(() => 0.1) // walker, fromLeft
    sys.update(ENEMY.spawnIntervalMs - 1, makeCtx(random))
    expect(sys.aliveCount()).toBe(0)
    expect(random).not.toHaveBeenCalled()
  })

  it('update を spawnIntervalMs ちょうど経過させると 1 体スポーンされる', () => {
    const layer = new Container()
    const sys = new EnemySystem(layer)
    const random = vi.fn(() => 0.1) // walker, fromLeft
    sys.update(ENEMY.spawnIntervalMs, makeCtx(random))
    expect(sys.aliveCount()).toBe(1)
  })

  it('random()<0.5 のとき walker、>=0.5 のとき faller が生成される', () => {
    const layer = new Container()
    const sys = new EnemySystem(layer)

    // 1 回目: walker (kind 判定 0.1 + fromLeft 判定 0.1)
    const randomWalker = vi.fn()
    randomWalker.mockReturnValueOnce(0.1).mockReturnValueOnce(0.1)
    sys.update(ENEMY.spawnIntervalMs, makeCtx(randomWalker))
    expect(sys.aliveCount()).toBe(1)
    let kinds: string[] = []
    sys.forEachAlive(e => kinds.push(e.kind))
    expect(kinds).toContain('walker')

    // 2 回目: faller (kind 判定 0.9 + x 判定 0.5 + vy 判定 0.5)
    const layer2 = new Container()
    const sys2 = new EnemySystem(layer2)
    const randomFaller = vi.fn()
    randomFaller
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
    sys2.update(ENEMY.spawnIntervalMs, makeCtx(randomFaller))
    expect(sys2.aliveCount()).toBe(1)
    kinds = []
    sys2.forEachAlive(e => kinds.push(e.kind))
    expect(kinds).toContain('faller')
  })

  it('walker は地面の端 (足元 ground が消える x) に到達すると walkerDir が反転する', () => {
    const layer = new Container()
    const sys = new EnemySystem(layer)
    // findGroundY が groundY=STAGE_HEIGHT (=600) を返す状況 (STAGE 全幅を覆う地面がない)。
    // → walker は y=585、足元 587 にスポーン。
    // 短い地面 (x=0..200) を置いて、x<=200 では hasGroundUnder=true、x>200 で hasGroundUnder=false。
    // fromLeft=true で生成し、+walkerSpeed=60px/sec で右に進ませる → 200 を超える時点で反転する想定。
    const platform: CollisionRect = { x: 0, y: 585, width: 200, height: 30 }
    // kind=walker (0.1), fromLeft=true (0.1)
    const random = vi.fn()
    random.mockReturnValueOnce(0.1).mockReturnValueOnce(0.1)
    sys.update(ENEMY.spawnIntervalMs, makeCtx(random, [platform]))
    expect(sys.aliveCount()).toBe(1)

    // 開始時点は x=-15, walkerDir=+1。十分時間を進めて端 (x>200) を踏み外させる
    // 追加 spawn が起きると finalX の特定が困難になるので止める
    sys.stopSpawning()
    sys.update(5000, makeCtx(random, [platform]))
    let dirAfter: number | undefined
    sys.forEachAlive(e => (dirAfter = e.walkerDir))
    // 端を踏み外して反転 (=-1)、もしくは反転後さらに左へ進んで左端でまた反転している可能性
    // が、いずれにせよ「一度は反転している」ことを確認するため、初期 +1 と異なる、または偶数回反転で +1 戻った
    // 状況を許容するのではなく、端 (x>200) で必ず反転が起きる挙動だけを担保する。
    // x=-15 から +60px/sec、5000ms = 5s で +300px 進む。途中 x=200 で反転して左へ進み戻ってくる。
    // 反転後 x が 0 を割って再反転する場合があるので、|walkerDir|=1 でかつ少なくとも 1 回反転を経たことを確認する。
    expect(dirAfter === 1 || dirAfter === -1).toBe(true)
    // 開始位置 (-15) よりも左ではない状態だと「端で反転して戻ってきている」ことを確認する代わりに、
    // 反転が起きたことを保証するため、x の歴史を辿る代替手段がないので、5s で +300px 真っ直ぐ進めば x=285。
    // 端で反転した場合は x < 285 になる。
    let finalX: number | undefined
    sys.forEachAlive(e => (finalX = e.x))
    expect(finalX).toBeDefined()
    expect(finalX!).toBeLessThan(285)
  })

  it('faller がプラットフォーム矩形と aabbOverlap かつ vy>0 のとき killVisual される', () => {
    const layer = new Container()
    const sys = new EnemySystem(layer)
    // kind=faller (0.9), x=400 (0.5), vy=middle (0.5)
    const random = vi.fn()
    random
      .mockReturnValueOnce(0.9)
      .mockReturnValueOnce((400 - 40) / (STAGE_WIDTH - 80))
      .mockReturnValueOnce(0.5)
    // 床は y=300 に置く (faller は中心 x=400, y=-15 で生成、AABB は 385..415 x 値、x=300..500 の floor と重なる)
    const floor: CollisionRect = { x: 300, y: 300, width: 200, height: 30 }
    sys.update(ENEMY.spawnIntervalMs, makeCtx(random, [floor]))
    expect(sys.aliveCount()).toBe(1)

    // 1 度の update に大きな dt を渡すと AABB チェックを飛び越えてしまうので、
    // 1 フレーム (≒16.67ms) を細かく刻んで前進させる。stopSpawning で 2 体目以降を止める。
    sys.stopSpawning()
    for (let i = 0; i < 600 && sys.aliveCount() > 0; i++) {
      sys.update(16.67, makeCtx(random, [floor]))
    }
    expect(sys.aliveCount()).toBe(0)
  })

  it('STAGE_HEIGHT+80 を超えて落ちた enemy は alive=false にされ aliveCount が減る', () => {
    const layer = new Container()
    const sys = new EnemySystem(layer)
    // 床がない状況で faller を 1 体生成
    const random = vi.fn()
    random
      .mockReturnValueOnce(0.9) // faller
      .mockReturnValueOnce(0.5) // x 中央
      .mockReturnValueOnce(0.5) // vy 中間
    sys.update(ENEMY.spawnIntervalMs, makeCtx(random, []))
    expect(sys.aliveCount()).toBe(1)
    // 1 体目以降の spawn を止め、落下のみで画面下 (y>STAGE_HEIGHT+80) を通過させる
    sys.stopSpawning()
    for (let i = 0; i < 600 && sys.aliveCount() > 0; i++) {
      sys.update(16.67, makeCtx(random, []))
    }
    expect(sys.aliveCount()).toBe(0)
  })

  it('stopSpawning() を呼ぶと以降 update で spawnIntervalMs を超過させてもスポーンが発生しない', () => {
    const layer = new Container()
    const sys = new EnemySystem(layer)
    sys.stopSpawning()
    const random = vi.fn(() => 0.1)
    // 余裕を持って 100 倍の spawnIntervalMs 進めても spawn しない (spawnTimer が -Infinity から戻らない)
    sys.update(ENEMY.spawnIntervalMs * 100, makeCtx(random))
    expect(sys.aliveCount()).toBe(0)
  })
})
