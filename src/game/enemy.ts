// 敵スポーンと挙動 (Issue #8)
// - 歩行敵 (walker): プラットフォーム上を walkerSpeed で歩き、端で折り返す
// - 落下敵 (faller): 画面上から落ちる、速度はランダム
// - スポーン: setTimeout ではなく累積 ms による spawn timer (ticker 経由)
// - プレイヤーとの AABB overlap で GameOver (判定は GameScene 側)
// - 手裏剣ヒットでスコア +10 (判定は GameScene 側)

import { Container, Graphics } from 'pixi.js'
import { ENEMY, GRAVITY, STAGE_HEIGHT, STAGE_WIDTH } from './constants'
import type { CollisionRect } from './terrain'
import { aabbOverlaps, type AABB } from './collision'

export type EnemyKind = 'walker' | 'faller'

export interface EnemyInstance {
  id: number
  kind: EnemyKind
  x: number
  y: number
  vx: number
  vy: number
  gfx: Graphics
  alive: boolean
  /** walker の進行方向 (折り返し判定用) */
  walkerDir: 1 | -1
}

export interface SpawnContext {
  /** 0..1 の乱数。テスト時に決定的にできる */
  random: () => number
  /** プラットフォーム矩形 (walker のスポーン位置 + 着地判定で使う) */
  rects: ReadonlyArray<CollisionRect>
}

export class EnemySystem {
  private enemies: EnemyInstance[] = []
  private layer: Container
  private nextId = 1
  private spawnTimerMs = 0

  constructor(layer: Container) {
    this.layer = layer
  }

  /** 1 フレーム進める。spawn / 移動 / 物理 / 画面外回収 */
  update(deltaMs: number, ctx: SpawnContext): void {
    const dt = deltaMs / 1000

    this.spawnTimerMs += deltaMs
    while (this.spawnTimerMs >= ENEMY.spawnIntervalMs) {
      this.spawnTimerMs -= ENEMY.spawnIntervalMs
      this.spawnOne(ctx)
    }

    for (const e of this.enemies) {
      if (!e.alive) continue
      if (e.kind === 'walker') {
        this.updateWalker(e, dt, ctx.rects)
      } else {
        this.updateFaller(e, dt, ctx.rects)
      }
    }

    // 画面外で alive=false に
    for (const e of this.enemies) {
      if (!e.alive) continue
      if (e.y > STAGE_HEIGHT + 80 || e.x < -80 || e.x > STAGE_WIDTH + 80) {
        this.killVisual(e)
      }
    }

    // 配列圧縮
    if (this.enemies.length > 64) {
      this.enemies = this.enemies.filter(e => e.alive)
    }
  }

  private spawnOne(ctx: SpawnContext): void {
    const r = ctx.random()
    if (r < 0.5) {
      this.spawnWalker(ctx)
    } else {
      this.spawnFaller(ctx)
    }
  }

  private spawnWalker(ctx: SpawnContext): void {
    const fromLeft = ctx.random() < 0.5
    const x = fromLeft ? -ENEMY.width / 2 : STAGE_WIDTH + ENEMY.width / 2
    // 地面の上に乗せる (地面は y=560 が top, ENEMY.height=30 → 中心 y = 545)
    const groundY = this.findGroundY(ctx.rects)
    const y = groundY - ENEMY.height / 2

    const gfx = new Graphics()
      .rect(-ENEMY.width / 2, -ENEMY.height / 2, ENEMY.width, ENEMY.height)
      .fill({ color: ENEMY.walkerColor })
    gfx.x = x
    gfx.y = y
    this.layer.addChild(gfx)

    const dir: 1 | -1 = fromLeft ? 1 : -1
    this.enemies.push({
      id: this.nextId++,
      kind: 'walker',
      x,
      y,
      vx: dir * ENEMY.walkerSpeed,
      vy: 0,
      gfx,
      alive: true,
      walkerDir: dir,
    })
  }

  private spawnFaller(ctx: SpawnContext): void {
    const x = 40 + ctx.random() * (STAGE_WIDTH - 80)
    const y = -ENEMY.height / 2
    const vy =
      ENEMY.fallerSpeedMin +
      ctx.random() * (ENEMY.fallerSpeedMax - ENEMY.fallerSpeedMin)

    const gfx = new Graphics()
      .circle(0, 0, ENEMY.width / 2)
      .fill({ color: ENEMY.fallerColor })
    gfx.x = x
    gfx.y = y
    this.layer.addChild(gfx)

    this.enemies.push({
      id: this.nextId++,
      kind: 'faller',
      x,
      y,
      vx: 0,
      vy,
      gfx,
      alive: true,
      walkerDir: 1,
    })
  }

  private updateWalker(
    e: EnemyInstance,
    dt: number,
    rects: ReadonlyArray<CollisionRect>
  ): void {
    e.x += e.vx * dt
    // 簡易: 足元の地面がなくなったら折り返す
    if (!this.hasGroundUnder(e.x, e.y + ENEMY.height / 2 + 2, rects)) {
      e.walkerDir = (e.walkerDir * -1) as 1 | -1
      e.vx = e.walkerDir * ENEMY.walkerSpeed
      // 1 フレーム分戻して張り出さないように
      e.x += e.vx * dt
    }
    e.gfx.x = e.x
    e.gfx.y = e.y
  }

  private updateFaller(
    e: EnemyInstance,
    dt: number,
    rects: ReadonlyArray<CollisionRect>
  ): void {
    // 弱い重力で落下加速 (上限あり)
    e.vy = Math.min(e.vy + GRAVITY * 0.5 * dt, ENEMY.fallerSpeedMax)
    e.y += e.vy * dt
    // プラットフォームに当たったら止まる (見た目: その場で消える)
    const a: AABB = {
      x: e.x - ENEMY.width / 2,
      y: e.y - ENEMY.height / 2,
      width: ENEMY.width,
      height: ENEMY.height,
    }
    for (const r of rects) {
      if (aabbOverlaps(a, r) && e.vy > 0) {
        // 床に到達 → 消滅 (歩き敵化はしない、シンプルに)
        this.killVisual(e)
        return
      }
    }
    e.gfx.x = e.x
    e.gfx.y = e.y
  }

  private hasGroundUnder(
    x: number,
    yProbe: number,
    rects: ReadonlyArray<CollisionRect>
  ): boolean {
    for (const r of rects) {
      if (
        x >= r.x &&
        x <= r.x + r.width &&
        yProbe >= r.y &&
        yProbe <= r.y + r.height
      ) {
        return true
      }
    }
    return false
  }

  private findGroundY(rects: ReadonlyArray<CollisionRect>): number {
    // 地面: ステージ全幅を覆う矩形の最も上の top を返す。
    // walker は全てここに沿ってスポーンする (中段プラットフォームへのスポーンは現状未対応)。
    let ground = STAGE_HEIGHT
    for (const r of rects) {
      if (r.x <= 0 && r.x + r.width >= STAGE_WIDTH && r.y < ground) {
        ground = r.y
      }
    }
    return ground
  }

  /** プレイヤーと overlap している敵を返す */
  collidesWithPlayer(playerAabb: AABB): EnemyInstance | null {
    for (const e of this.enemies) {
      if (!e.alive) continue
      const ea: AABB = {
        x: e.x - ENEMY.width / 2,
        y: e.y - ENEMY.height / 2,
        width: ENEMY.width,
        height: ENEMY.height,
      }
      if (aabbOverlaps(ea, playerAabb)) return e
    }
    return null
  }

  /** 全 alive 敵を反復 */
  forEachAlive(fn: (e: EnemyInstance) => void): void {
    for (const e of this.enemies) {
      if (e.alive) fn(e)
    }
  }

  /** 1 体倒す。手裏剣ヒット時に呼ぶ */
  kill(id: number): boolean {
    const e = this.enemies.find(e => e.id === id)
    if (!e || !e.alive) return false
    this.killVisual(e)
    return true
  }

  private killVisual(e: EnemyInstance): void {
    e.alive = false
    if (e.gfx.parent) e.gfx.parent.removeChild(e.gfx)
    e.gfx.destroy()
  }

  /** スポーン抑止 (GameOver 時など) */
  stopSpawning(): void {
    this.spawnTimerMs = -Infinity
  }

  /** テスト用 */
  aliveCount(): number {
    return this.enemies.filter(e => e.alive).length
  }

  destroy(): void {
    for (const e of this.enemies) {
      if (e.alive) this.killVisual(e)
    }
    this.enemies = []
  }
}
