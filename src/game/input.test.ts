// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Application } from 'pixi.js'
import { InputManager } from './input'
import { STAGE_WIDTH, TOUCH } from './constants'

// PixiJS の Application 全体は不要。canvas プロパティだけを持つ最小モックを渡す。
// pointerdown ハンドラ内で `ev.target !== canvas` を判定するため、jsdom 上の canvas を渡す。
const makeApp = (canvas: HTMLCanvasElement): Application =>
  ({ canvas }) as unknown as Application

const setupCanvas = (): HTMLCanvasElement => {
  const c = document.createElement('canvas')
  // getBoundingClientRect が 0 だと x 判定が常に left になるのでサイズを与える
  c.getBoundingClientRect = (() =>
    ({
      left: 0,
      top: 0,
      right: STAGE_WIDTH,
      bottom: 600,
      width: STAGE_WIDTH,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect) as HTMLCanvasElement['getBoundingClientRect']
  document.body.appendChild(c)
  return c
}

const dispatchKey = (type: 'keydown' | 'keyup', code: string): void => {
  const ev = new KeyboardEvent(type, { code, bubbles: true })
  window.dispatchEvent(ev)
}

interface PointerOpts {
  pointerId?: number
  clientX?: number
  clientY?: number
  target?: EventTarget
}

const dispatchPointer = (
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  opts: PointerOpts = {}
): void => {
  const ev = new Event(type, { bubbles: true }) as PointerEvent
  // jsdom の PointerEvent が無い場合に備えて、必要なフィールドを定義する
  Object.defineProperty(ev, 'pointerId', {
    value: opts.pointerId ?? 1,
    configurable: true,
  })
  Object.defineProperty(ev, 'clientX', {
    value: opts.clientX ?? 0,
    configurable: true,
  })
  Object.defineProperty(ev, 'clientY', {
    value: opts.clientY ?? 0,
    configurable: true,
  })
  if (opts.target) {
    Object.defineProperty(ev, 'target', {
      value: opts.target,
      configurable: true,
    })
  }
  window.dispatchEvent(ev)
}

let inputManagers: InputManager[] = []
afterEach(() => {
  // 残ったリスナを必ず外す (テスト間で keydown が漏れないように)
  for (const m of inputManagers) m.destroy()
  inputManagers = []
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const createInput = (): { im: InputManager; canvas: HTMLCanvasElement } => {
  const canvas = setupCanvas()
  const im = new InputManager(makeApp(canvas))
  inputManagers.push(im)
  return { im, canvas }
}

describe('InputManager (Issue #9) キーボード', () => {
  it('keydown ArrowRight で state.right=true、keyup ArrowRight で state.right=false', () => {
    const { im } = createInput()
    dispatchKey('keydown', 'ArrowRight')
    expect(im.state.right).toBe(true)
    dispatchKey('keyup', 'ArrowRight')
    expect(im.state.right).toBe(false)
  })

  it('keydown Space で 1 回目の tick() は jumpJustPressed=true、続けて tick() を呼ぶと false に戻る (edge 検出)', () => {
    const { im } = createInput()
    dispatchKey('keydown', 'Space')
    im.tick()
    expect(im.state.jumpJustPressed).toBe(true)
    im.tick()
    // ボタンは押しっぱなしでも 2 回目は edge ではないので false
    expect(im.state.jumpJustPressed).toBe(false)
    expect(im.state.jump).toBe(true)
  })

  it('KeyZ で firePending が立ち、次の tick() で fireJustPressed=true、その次の tick() で false に戻る', () => {
    const { im } = createInput()
    dispatchKey('keydown', 'KeyZ')
    im.tick()
    expect(im.state.fireJustPressed).toBe(true)
    im.tick()
    expect(im.state.fireJustPressed).toBe(false)
  })
})

describe('InputManager (Issue #9) タッチ', () => {
  it('タッチ pointerdown が画面左半分のとき state.left=true、右半分のとき state.right=true', () => {
    const { im, canvas } = createInput()
    // 左半分
    dispatchPointer('pointerdown', {
      pointerId: 1,
      clientX: 100,
      clientY: 300,
      target: canvas,
    })
    expect(im.state.left).toBe(true)
    expect(im.state.right).toBe(false)
    // 別 pointer で右半分
    dispatchPointer('pointerdown', {
      pointerId: 2,
      clientX: STAGE_WIDTH - 100,
      clientY: 300,
      target: canvas,
    })
    expect(im.state.right).toBe(true)
  })

  it('200ms 以内 + 移動量 10px 未満の pointerup で firePending が立つ (短タップ = 手裏剣)', () => {
    const { im, canvas } = createInput()
    // performance.now() を制御して短タップ条件を確実にする
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValueOnce(1000) // pointerdown 時刻
    dispatchPointer('pointerdown', {
      pointerId: 1,
      clientX: 100,
      clientY: 300,
      target: canvas,
    })
    nowSpy.mockReturnValueOnce(1100) // pointerup 時刻 (100ms 経過)
    dispatchPointer('pointerup', {
      pointerId: 1,
      clientX: 100,
      clientY: 300,
      target: canvas,
    })
    im.tick()
    expect(im.state.fireJustPressed).toBe(true)
  })

  it('pointerdown から y が -30px 以上動いた pointermove で state.jump=true / jumpFired=true になり 短タップとして fire は発火しない', () => {
    const { im, canvas } = createInput()
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValueOnce(1000) // pointerdown
    dispatchPointer('pointerdown', {
      pointerId: 1,
      clientX: 100,
      clientY: 300,
      target: canvas,
    })
    // 上に 30px 以上動く → -dy = 30 で TOUCH.swipeUpThresholdPx 以上
    dispatchPointer('pointermove', {
      pointerId: 1,
      clientX: 100,
      clientY: 300 - TOUCH.swipeUpThresholdPx,
      target: canvas,
    })
    expect(im.state.jump).toBe(true)
    // pointerup の時に jumpFired=true なら短タップ判定にならない
    nowSpy.mockReturnValueOnce(1050) // pointerup
    dispatchPointer('pointerup', {
      pointerId: 1,
      clientX: 100,
      clientY: 300 - TOUCH.swipeUpThresholdPx,
      target: canvas,
    })
    im.tick()
    expect(im.state.fireJustPressed).toBe(false)
    // jump は離されている
    expect(im.state.jump).toBe(false)
  })

  it('同じ side (例: 両方左半分) を 2 本指でタッチして片方を離しても state.left=true が維持される', () => {
    const { im, canvas } = createInput()
    dispatchPointer('pointerdown', {
      pointerId: 1,
      clientX: 80,
      clientY: 300,
      target: canvas,
    })
    dispatchPointer('pointerdown', {
      pointerId: 2,
      clientX: 150,
      clientY: 400,
      target: canvas,
    })
    expect(im.state.left).toBe(true)
    // 1 本指 (id=1) を離す → もう 1 本 (id=2) が同じ左 side なので維持される
    dispatchPointer('pointerup', {
      pointerId: 1,
      clientX: 80,
      clientY: 300,
      target: canvas,
    })
    expect(im.state.left).toBe(true)
    // 2 本目も離して初めて false
    dispatchPointer('pointerup', {
      pointerId: 2,
      clientX: 150,
      clientY: 400,
      target: canvas,
    })
    expect(im.state.left).toBe(false)
  })
})

describe('InputManager destroy()', () => {
  it("destroy() 後に window.dispatchEvent('keydown') しても state が変化しない (リスナ解除済み)", () => {
    const { im } = createInput()
    im.destroy()
    // destroy で外したリスナは登録解除済みなので、ここでイベントを撒いても state は変わらない
    inputManagers = inputManagers.filter(m => m !== im)
    dispatchKey('keydown', 'ArrowRight')
    expect(im.state.right).toBe(false)
    dispatchKey('keydown', 'Space')
    expect(im.state.jump).toBe(false)
  })
})
