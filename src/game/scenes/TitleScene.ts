// タイトル画面 (Issue #10)
// - タイトル文字 + 「Start (Space / Tap)」
// - Space 押下 or タップで GameScene へ
// - 前回スコアがあれば表示

import { Graphics, Text } from 'pixi.js'
import { Scene } from '../Scene'
import { App } from '../App'
import { STAGE_HEIGHT, STAGE_WIDTH } from '../constants'

const TITLE_STYLE = {
  fill: 0xffffff,
  fontSize: 48,
  fontFamily: 'sans-serif',
  fontWeight: 'bold' as const,
}
const SUBTITLE_STYLE = {
  fill: 0xcccccc,
  fontSize: 18,
  fontFamily: 'sans-serif',
}
const HINT_STYLE = {
  fill: 0xffffff,
  fontSize: 22,
  fontFamily: 'sans-serif',
}
const SCORE_STYLE = {
  fill: 0xffaa00,
  fontSize: 20,
  fontFamily: 'sans-serif',
}

export class TitleScene extends Scene {
  private app: App
  private hint: Text
  private blinkMs = 0

  constructor(app: App, finalScore?: number) {
    super()
    this.app = app

    const title = new Text({
      text: 'ウィンドウ忍者伝説',
      style: TITLE_STYLE,
    })
    title.anchor.set(0.5)
    title.x = STAGE_WIDTH / 2
    title.y = STAGE_HEIGHT / 3
    this.addChild(title)

    const sub = new Text({
      text: 'Legend of Window Ninja',
      style: SUBTITLE_STYLE,
    })
    sub.anchor.set(0.5)
    sub.x = STAGE_WIDTH / 2
    sub.y = STAGE_HEIGHT / 3 + 50
    this.addChild(sub)

    if (finalScore !== undefined && finalScore > 0) {
      const scoreText = new Text({
        text: `前回スコア: ${finalScore}`,
        style: SCORE_STYLE,
      })
      scoreText.anchor.set(0.5)
      scoreText.x = STAGE_WIDTH / 2
      scoreText.y = STAGE_HEIGHT / 3 + 90
      this.addChild(scoreText)
    }

    // Start ボタン (見た目)
    const btnW = 320
    const btnH = 56
    const btnY = STAGE_HEIGHT * 0.6
    const bg = new Graphics()
      .rect(-btnW / 2, -btnH / 2, btnW, btnH)
      .fill({ color: 0x222222 })
      .stroke({ color: 0xffffff, width: 2 })
    bg.x = STAGE_WIDTH / 2
    bg.y = btnY
    this.addChild(bg)

    this.hint = new Text({
      text: 'Start (Space / Tap)',
      style: HINT_STYLE,
    })
    this.hint.anchor.set(0.5)
    this.hint.x = STAGE_WIDTH / 2
    this.hint.y = btnY
    this.addChild(this.hint)

    const ctrl = new Text({
      text: '← → 移動  ↑/Space ジャンプ  Z/X/Enter 手裏剣',
      style: SUBTITLE_STYLE,
    })
    ctrl.anchor.set(0.5)
    ctrl.x = STAGE_WIDTH / 2
    ctrl.y = STAGE_HEIGHT - 60
    this.addChild(ctrl)
  }

  override update(deltaMs: number): void {
    this.blinkMs += deltaMs
    this.hint.alpha = 0.5 + 0.5 * Math.sin(this.blinkMs / 200)

    // Space or fireJustPressed (Z/X/Enter) or タップで開始
    const input = this.app.input.state
    if (input.jumpJustPressed || input.fireJustPressed) {
      this.exit({ mode: 'game' })
    }
  }
}
