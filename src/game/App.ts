// SceneManager: Title ↔ Game ↔ GameOver の遷移 (Issue #10)

import { Application } from 'pixi.js'
import { InputManager } from './input'
import { Scene, SceneExitParam } from './Scene'

export class App {
  app: Application
  input: InputManager
  private currentScene: Scene | null = null
  // 動的 import 中に別シーンへの遷移が走った場合、後勝ちで上書きされ
  // 2 重 replaceScene が走るのを防ぐためのガード
  private isTransitioning = false

  constructor(app: Application) {
    this.app = app
    this.input = new InputManager(app)
    this.app.ticker.add(ticker => {
      this.input.tick()
      // タブ非アクティブから戻ったとき deltaMS が数百〜数千 ms になり、
      // 一発で画面外まで飛ぶ / すり抜ける問題を防ぐため 33ms (30fps 相当) で頭打ち。
      const deltaMs = Math.min(ticker.deltaMS, 33)
      this.currentScene?.update(deltaMs)
    })
  }

  async startTitle(finalScore?: number): Promise<void> {
    if (this.isTransitioning) return
    this.isTransitioning = true
    try {
      const { TitleScene } = await import('./scenes/TitleScene')
      this.replaceScene(new TitleScene(this, finalScore))
    } finally {
      this.isTransitioning = false
    }
  }

  async startGame(): Promise<void> {
    if (this.isTransitioning) return
    this.isTransitioning = true
    try {
      const { GameScene } = await import('./scenes/GameScene')
      this.replaceScene(new GameScene(this))
    } finally {
      this.isTransitioning = false
    }
  }

  async startGameOver(finalScore: number): Promise<void> {
    if (this.isTransitioning) return
    this.isTransitioning = true
    try {
      const { GameOverScene } = await import('./scenes/GameOverScene')
      this.replaceScene(new GameOverScene(this, finalScore))
    } finally {
      this.isTransitioning = false
    }
  }

  private replaceScene(scene: Scene): void {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene)
      this.currentScene.destroyScene()
    }
    this.currentScene = scene
    scene.setExitHandler(param => this.handleExit(param))
    this.app.stage.addChild(scene)
  }

  private handleExit(param: SceneExitParam): void {
    if (param.mode === 'game') {
      void this.startGame()
    } else if (param.mode === 'gameover') {
      void this.startGameOver(param.finalScore ?? 0)
    } else {
      void this.startTitle(param.finalScore)
    }
  }
}
