// 手裏剣 (Issue #7)
// - オブジェクトプール (最大 SHURIKEN.poolSize = 20 発)
// - 発射レート SHURIKEN.fireRateMs = 300ms 以上空ける
// - 速度 SHURIKEN.speed = 500 px/sec、向きは player.facing
// - 画面外で回収 (再利用)
// - 毎フレーム rotation += SHURIKEN.rotationPerFrame (= 0.3 / 60fps 換算)

import { Container, Graphics } from 'pixi.js'
import { SHURIKEN, STAGE_WIDTH } from './constants'
import type { AABB } from './collision'

interface ShurikenInstance {
  gfx: Graphics
  active: boolean
  x: number
  y: number
  vx: number
}

export class ShurikenSystem {
  private pool: ShurikenInstance[] = []
  private layer: Container
  private lastFiredMs = -Infinity

  constructor(layer: Container) {
    this.layer = layer
    for (let i = 0; i < SHURIKEN.poolSize; i++) {
      const gfx = this.makeShurikenGfx()
      gfx.visible = false
      this.layer.addChild(gfx)
      this.pool.push({ gfx, active: false, x: 0, y: 0, vx: 0 })
    }
  }

  private makeShurikenGfx(): Graphics {
    const g = new Graphics()
    const s = SHURIKEN.width / 2
    // 4 角の十字風 (回転で映える形)
    g.poly([0, -s, s, 0, 0, s, -s, 0]).fill({ color: SHURIKEN.color })
    return g
  }

  /** elapsedMs はアプリ時計の現在値 (モノトーン増加)。プレイヤー向きで発射する */
  tryFire(
    playerX: number,
    playerY: number,
    facing: 1 | -1,
    elapsedMs: number
  ): boolean {
    if (elapsedMs - this.lastFiredMs < SHURIKEN.fireRateMs) return false

    // 空きスロットを取る
    const slot = this.pool.find(s => !s.active)
    if (!slot) return false

    slot.active = true
    slot.x = playerX + facing * 20
    slot.y = playerY
    slot.vx = facing * SHURIKEN.speed
    slot.gfx.x = slot.x
    slot.gfx.y = slot.y
    slot.gfx.rotation = 0
    slot.gfx.visible = true

    this.lastFiredMs = elapsedMs
    return true
  }

  /** 1 フレーム進める */
  update(deltaMs: number): void {
    const dt = deltaMs / 1000
    // rotationPerFrame は 60fps 基準なので deltaMs/16.667 倍にスケール
    const rotStep = SHURIKEN.rotationPerFrame * (deltaMs / (1000 / 60))
    for (const s of this.pool) {
      if (!s.active) continue
      s.x += s.vx * dt
      s.gfx.x = s.x
      s.gfx.rotation += rotStep
      // 画面外回収
      if (s.x < -50 || s.x > STAGE_WIDTH + 50) {
        this.recycle(s)
      }
    }
  }

  private recycle(s: ShurikenInstance): void {
    s.active = false
    s.gfx.visible = false
  }

  /** 敵 AABB と重なっているアクティブ手裏剣のインデックスを返す (ヒット判定後 recycle するため) */
  collectHits(enemyAabb: AABB): number[] {
    const hits: number[] = []
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i]
      if (!s.active) continue
      // 手裏剣 AABB
      const sa: AABB = {
        x: s.x - SHURIKEN.width / 2,
        y: s.y - SHURIKEN.height / 2,
        width: SHURIKEN.width,
        height: SHURIKEN.height,
      }
      if (
        sa.x < enemyAabb.x + enemyAabb.width &&
        sa.x + sa.width > enemyAabb.x &&
        sa.y < enemyAabb.y + enemyAabb.height &&
        sa.y + sa.height > enemyAabb.y
      ) {
        hits.push(i)
      }
    }
    return hits
  }

  recycleIndex(i: number): void {
    const s = this.pool[i]
    if (s) this.recycle(s)
  }

  /** テスト用: アクティブな手裏剣の数 */
  activeCount(): number {
    return this.pool.filter(s => s.active).length
  }

  destroy(): void {
    // layer.destroy({children:true}) で gfx も破棄される想定なので、参照だけ捨てる
    this.pool = []
  }
}
