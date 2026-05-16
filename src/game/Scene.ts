import { Container } from 'pixi.js'

export interface SceneExitParam {
  mode?: 'title' | 'game' | 'gameover'
  /** GameOver から TitleScene に渡す最終スコア */
  finalScore?: number
}

export type SceneExitHandler = (param: SceneExitParam) => void

export class Scene extends Container {
  private exitHandler: SceneExitHandler | null = null

  setExitHandler(handler: SceneExitHandler): void {
    this.exitHandler = handler
  }

  exit(param: SceneExitParam = {}): void {
    this.exitHandler?.(param)
  }

  update(_deltaMs: number): void {
    // override in subclass
  }

  destroyScene(): void {
    // destroy({ children: true }) が子要素を removeChild + destroy するので
    // 事前の removeChildren() は不要 (PixiJS v8 仕様)。
    this.destroy({ children: true })
  }
}
