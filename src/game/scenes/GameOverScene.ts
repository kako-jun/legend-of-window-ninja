// ゲームオーバー画面 (Issue #10)
// - スコア表示 + 「Restart (Space / Tap)」
// - Space or タップで TitleScene に戻る (TitleScene が finalScore を受けて前回スコア表示)

import { Graphics, Text } from 'pixi.js'
import { Scene } from '../Scene'
import { App } from '../App'
import { STAGE_HEIGHT, STAGE_WIDTH } from '../constants'

const TITLE_STYLE = {
  fill: 0xff4444,
  fontSize: 64,
  fontFamily: 'sans-serif',
  fontWeight: 'bold' as const,
}
const SCORE_STYLE = {
  fill: 0xffaa00,
  fontSize: 32,
  fontFamily: 'sans-serif',
}
const HINT_STYLE = {
  fill: 0xffffff,
  fontSize: 22,
  fontFamily: 'sans-serif',
}

export class GameOverScene extends Scene {
  private app: App
  private hint: Text
  private blinkMs = 0
  /** 直前の入力で誤って即時遷移するのを防ぐ */
  private inputDelayMs = 400

  constructor(app: App, finalScore: number) {
    super()
    this.app = app

    const title = new Text({ text: 'GAME OVER', style: TITLE_STYLE })
    title.anchor.set(0.5)
    title.x = STAGE_WIDTH / 2
    title.y = STAGE_HEIGHT / 3
    this.addChild(title)

    const score = new Text({
      text: `スコア: ${finalScore}`,
      style: SCORE_STYLE,
    })
    score.anchor.set(0.5)
    score.x = STAGE_WIDTH / 2
    score.y = STAGE_HEIGHT / 3 + 80
    this.addChild(score)

    const btnW = 360
    const btnH = 56
    const btnY = STAGE_HEIGHT * 0.65
    const bg = new Graphics()
      .rect(-btnW / 2, -btnH / 2, btnW, btnH)
      .fill({ color: 0x222222 })
      .stroke({ color: 0xffffff, width: 2 })
    bg.x = STAGE_WIDTH / 2
    bg.y = btnY
    this.addChild(bg)

    this.hint = new Text({
      text: 'Restart (Space / Tap)',
      style: HINT_STYLE,
    })
    this.hint.anchor.set(0.5)
    this.hint.x = STAGE_WIDTH / 2
    this.hint.y = btnY
    this.addChild(this.hint)
  }

  override update(deltaMs: number): void {
    this.blinkMs += deltaMs
    this.hint.alpha = 0.5 + 0.5 * Math.sin(this.blinkMs / 200)

    if (this.inputDelayMs > 0) {
      this.inputDelayMs -= deltaMs
      return
    }

    const input = this.app.input.state
    if (input.jumpJustPressed || input.fireJustPressed) {
      // 直接タイトルに戻る (TitleScene 経由でリスタートさせる)
      this.exit({ mode: 'title' })
    }
  }
}
