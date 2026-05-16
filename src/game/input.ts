// 入力管理 (Issue #9): キーボード + タッチ。バーチャルパッド (丸い十字キー UI) 禁止。
//
// タッチ仕様:
//   - 画面左半分長押し  = 左移動
//   - 画面右半分長押し  = 右移動
//   - 短タップ (200ms 以内 + 移動量 10px 未満) = 手裏剣
//   - 上スワイプ (pointerdown 開始位置から y が -30px 以上) = ジャンプ
//
// 「半分タッチ」を最優先する関係でタッチ開始時点で left/right は有効になる。
// 短タップ判定は pointerup 時に「移動 / スワイプジャンプが発火していない」場合のみ採用する。

import { Application } from 'pixi.js'
import { TOUCH, STAGE_WIDTH } from './constants'

export interface InputState {
  left: boolean
  right: boolean
  jump: boolean
  /** Space/↑ が「今フレームで押し始められた」かどうか */
  jumpJustPressed: boolean
  /** Z/X/Enter/タップなど、手裏剣を投げたい入力 (edge トリガ) */
  fireJustPressed: boolean
  back: boolean
  backJustPressed: boolean
}

interface TouchTrack {
  pointerId: number
  startX: number
  startY: number
  startTimeMs: number
  side: 'left' | 'right'
  /** スワイプ判定で jump 発火済みなら true */
  jumpFired: boolean
  /** 移動量 (短タップ判定用) */
  maxMoveDist: number
}

export class InputManager {
  state: InputState = {
    left: false,
    right: false,
    jump: false,
    jumpJustPressed: false,
    fireJustPressed: false,
    back: false,
    backJustPressed: false,
  }

  private app: Application
  private prevJump = false
  private prevBack = false
  private touches: Map<number, TouchTrack> = new Map()
  /** 次フレームで fireJustPressed を true にしたいときにセット */
  private firePending = false

  private keyDown = (ev: KeyboardEvent): void => {
    switch (ev.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = true
        break
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = true
        break
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.state.jump = true
        ev.preventDefault()
        break
      case 'KeyZ':
      case 'KeyX':
      case 'Enter':
        this.firePending = true
        break
      case 'Escape':
        this.state.back = true
        break
    }
  }

  private keyUp = (ev: KeyboardEvent): void => {
    switch (ev.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = false
        break
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = false
        break
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.state.jump = false
        break
      case 'Escape':
        this.state.back = false
        break
    }
  }

  private onPointerDown = (ev: PointerEvent): void => {
    // canvas 上以外も拾う (ステージ全体が「半分タッチ」のヒット領域)
    const canvas = this.app.canvas as HTMLCanvasElement
    if (ev.target !== canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = STAGE_WIDTH / rect.width
    const x = (ev.clientX - rect.left) * scaleX
    const side: 'left' | 'right' = x < STAGE_WIDTH / 2 ? 'left' : 'right'

    const track: TouchTrack = {
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      startTimeMs: performance.now(),
      side,
      jumpFired: false,
      maxMoveDist: 0,
    }
    this.touches.set(ev.pointerId, track)

    // 半分タッチ = 移動入力
    if (side === 'left') this.state.left = true
    else this.state.right = true

    // 両半分同時タッチ判定: 反対 side のアクティブな指が存在すればジャンプ発火。
    // 短タップ判定で誤って fire しないように jumpFired を立てる。
    const opposite: 'left' | 'right' = side === 'left' ? 'right' : 'left'
    let hasOpposite = false
    for (const t of this.touches.values()) {
      if (t.pointerId === ev.pointerId) continue
      if (t.side === opposite) {
        hasOpposite = true
        break
      }
    }
    if (hasOpposite) {
      track.jumpFired = true
      this.state.jump = true
    }
  }

  private onPointerMove = (ev: PointerEvent): void => {
    const track = this.touches.get(ev.pointerId)
    if (!track) return

    const dx = ev.clientX - track.startX
    const dy = ev.clientY - track.startY
    const dist = Math.hypot(dx, dy)
    if (dist > track.maxMoveDist) track.maxMoveDist = dist

    // 上スワイプ判定
    if (!track.jumpFired && -dy >= TOUCH.swipeUpThresholdPx) {
      track.jumpFired = true
      this.state.jump = true
      // 次フレームで jumpJustPressed が拾える
      // pointerup で jump = false に戻す
    }
  }

  private endTouch = (ev: PointerEvent): void => {
    const track = this.touches.get(ev.pointerId)
    if (!track) return

    const heldMs = performance.now() - track.startTimeMs
    const isShortTap =
      heldMs <= TOUCH.tapMaxMs &&
      track.maxMoveDist <= TOUCH.tapMaxMoveDist &&
      !track.jumpFired

    // 移動入力解除 (他の指で同じ side が押されていればそちらが維持される)
    let anyLeft = false
    let anyRight = false
    let anyJumpFired = false
    for (const [id, t] of this.touches) {
      if (id === ev.pointerId) continue
      if (t.side === 'left') anyLeft = true
      else anyRight = true
      if (t.jumpFired) anyJumpFired = true
    }
    if (track.side === 'left' && !anyLeft) this.state.left = false
    if (track.side === 'right' && !anyRight) this.state.right = false

    // jump の解除条件:
    // - この指が jumpFired (スワイプジャンプ or 両半分同時タッチ) を立てていて
    //   かつ残っている指のいずれも jumpFired を立てていない場合に false にする
    // - 両半分同時タッチで両側の指が残っていれば jump 維持
    if (track.jumpFired && !anyJumpFired) this.state.jump = false

    if (isShortTap) {
      this.firePending = true
    }

    this.touches.delete(ev.pointerId)
  }

  // Pixi の eventMode で受けるとシーン切替時のリスナ残留が面倒なので
  // window レベルで pointer 系を受ける。canvas 上のみ反応するよう判定で絞る。
  constructor(app: Application) {
    this.app = app
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.endTouch)
    window.addEventListener('pointercancel', this.endTouch)
  }

  /** フレーム頭で呼ぶ。edge 系フラグの更新 */
  tick(): void {
    this.state.jumpJustPressed = this.state.jump && !this.prevJump
    this.prevJump = this.state.jump
    this.state.backJustPressed = this.state.back && !this.prevBack
    this.prevBack = this.state.back
    this.state.fireJustPressed = this.firePending
    this.firePending = false
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.endTouch)
    window.removeEventListener('pointercancel', this.endTouch)
  }
}
