// 本編シーン (Issue #4-#8 統合)
// - 地形描画 + プレイヤー (PIXI.Graphics)
// - 影の伝説物理 + 自前 AABB 衝突解決
// - 手裏剣 (オブジェクトプール) と 敵 (歩行/落下) の処理
// - プレイヤーが敵に触れたら GameOverScene へ

import { Container, Graphics, Text } from 'pixi.js'
import { Scene } from '../Scene'
import { App } from '../App'
import { PLAYER, STAGE_HEIGHT, STAGE_WIDTH } from '../constants'
import {
  createInitialState,
  initWithState,
  type GameState,
} from '../types'
import { stepPlayerPhysics, integratePosition } from '../physics'
import { resolveCollisions } from '../collision'
import { createDefaultStage, renderTerrain, type CollisionRect } from '../terrain'
import { ShurikenSystem } from '../shuriken'
import { EnemySystem } from '../enemy'

const HUD_STYLE = {
  fill: 0xffffff,
  fontSize: 18,
  fontFamily: 'sans-serif',
}
const HINT_STYLE = {
  fill: 0x888888,
  fontSize: 12,
  fontFamily: 'sans-serif',
}

export class GameScene extends Scene {
  private app: App
  private state: GameState
  private rects: CollisionRect[]
  private playerGfx: Graphics
  private scoreText: Text
  private shurikenLayer: Container
  private enemyLayer: Container
  private shurikens: ShurikenSystem
  private enemies: EnemySystem

  constructor(app: App, initialState?: GameState) {
    super()
    this.app = app
    this.state = initWithState(initialState, () =>
      createInitialState('game', PLAYER.spawnX, PLAYER.spawnY)
    )

    // --- 地形 ---
    this.rects = createDefaultStage()
    this.addChild(renderTerrain(this.rects))

    // --- 敵 / 手裏剣レイヤー (敵の手前に手裏剣を描画) ---
    this.enemyLayer = new Container()
    this.addChild(this.enemyLayer)
    this.shurikenLayer = new Container()
    this.addChild(this.shurikenLayer)

    this.enemies = new EnemySystem(this.enemyLayer)
    this.shurikens = new ShurikenSystem(this.shurikenLayer)

    // --- プレイヤー (PIXI.Graphics で忍者を描画) ---
    this.playerGfx = this.makeNinjaGfx()
    this.playerGfx.x = this.state.player.position.x
    this.playerGfx.y = this.state.player.position.y
    this.addChild(this.playerGfx)

    // --- HUD ---
    this.scoreText = new Text({
      text: `スコア: ${this.state.score}`,
      style: HUD_STYLE,
    })
    this.scoreText.x = 16
    this.scoreText.y = 12
    this.addChild(this.scoreText)

    const hint = new Text({
      text: '← → 移動 / ↑/Space ジャンプ / Z/X/Enter 手裏剣 / Esc タイトル',
      style: HINT_STYLE,
    })
    hint.x = 16
    hint.y = STAGE_HEIGHT - 22
    this.addChild(hint)
  }

  private makeNinjaGfx(): Graphics {
    const g = new Graphics()
    // 三角形 (旧 Phaser 版を踏襲)
    const w = PLAYER.width
    const h = PLAYER.height
    g.poly([0, -h / 2, w / 2, h / 2, -w / 2, h / 2]).fill({
      color: PLAYER.color,
    })
    return g
  }

  override update(deltaMs: number): void {
    this.state.elapsedMs += deltaMs

    const input = this.app.input.state

    if (input.backJustPressed) {
      this.exit({ mode: 'title', finalScore: this.state.score })
      return
    }

    // --- 物理 ---
    stepPlayerPhysics(
      this.state.player,
      {
        left: input.left,
        right: input.right,
        jumpHeld: input.jump,
        jumpJustPressed: input.jumpJustPressed,
      },
      deltaMs
    )
    const { nextX, nextY } = integratePosition(this.state.player, deltaMs)
    const result = resolveCollisions(
      this.state.player,
      nextX,
      nextY,
      this.rects
    )
    this.state.player.position.x = result.x
    this.state.player.position.y = result.y
    this.state.player.isOnGround = result.isOnGround

    // 左右画面外で止める
    const minX = PLAYER.width / 2
    const maxX = STAGE_WIDTH - PLAYER.width / 2
    if (this.state.player.position.x < minX) {
      this.state.player.position.x = minX
      this.state.player.velocity.x = 0
    } else if (this.state.player.position.x > maxX) {
      this.state.player.position.x = maxX
      this.state.player.velocity.x = 0
    }

    // フェイルセーフ (落下リスポーン)
    if (this.state.player.position.y > STAGE_HEIGHT + 100) {
      this.state.player.position.x = PLAYER.spawnX
      this.state.player.position.y = PLAYER.spawnY
      this.state.player.velocity.x = 0
      this.state.player.velocity.y = 0
    }

    // --- 手裏剣発射 ---
    if (input.fireJustPressed) {
      this.shurikens.tryFire(
        this.state.player.position.x,
        this.state.player.position.y,
        this.state.player.facing,
        this.state.elapsedMs
      )
    }
    this.shurikens.update(deltaMs)

    // --- 敵 ---
    this.enemies.update(deltaMs, {
      random: Math.random,
      rects: this.rects,
    })

    // --- 手裏剣 vs 敵 ---
    this.enemies.forEachAlive(e => {
      const ea = {
        x: e.x - 15,
        y: e.y - 15,
        width: 30,
        height: 30,
      }
      const hits = this.shurikens.collectHits(ea)
      if (hits.length > 0) {
        this.shurikens.recycleIndex(hits[0])
        if (this.enemies.kill(e.id)) {
          this.state.score += 10
          this.scoreText.text = `スコア: ${this.state.score}`
        }
      }
    })

    // --- プレイヤー vs 敵 → GameOver ---
    const playerAabb = {
      x: this.state.player.position.x - PLAYER.width / 2,
      y: this.state.player.position.y - PLAYER.height / 2,
      width: PLAYER.width,
      height: PLAYER.height,
    }
    if (this.enemies.collidesWithPlayer(playerAabb)) {
      this.state.player.alive = false
      this.enemies.stopSpawning()
      this.exit({ mode: 'gameover', finalScore: this.state.score })
      return
    }

    // 描画反映
    this.playerGfx.x = this.state.player.position.x
    this.playerGfx.y = this.state.player.position.y
    // facing で左右反転
    this.playerGfx.scale.x = this.state.player.facing
  }

  override destroyScene(): void {
    this.shurikens.destroy()
    this.enemies.destroy()
    super.destroyScene()
  }
}
