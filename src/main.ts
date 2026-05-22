// PixiJS v8 エントリーポイント

import 'pixi.js/text'
import 'pixi.js/graphics'

import { Application } from 'pixi.js'
import { App } from './game/App'
import { STAGE_WIDTH, STAGE_HEIGHT } from './game/constants'

const STAGE_ASPECT = STAGE_WIDTH / STAGE_HEIGHT

const setLoadingProgress = (ratio: number): void => {
  const bar = document.querySelector<HTMLDivElement>('#loading-bar > div')
  if (bar) bar.style.width = `${Math.floor(ratio * 100)}%`
}

const removeLoading = (): void => {
  const el = document.getElementById('loading')
  if (el) el.remove()
}

const main = async (): Promise<void> => {
  const pixiApp = new Application()
  await pixiApp.init({
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    background: '#000000',
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  })

  const host = document.getElementById('game') ?? document.body
  host.appendChild(pixiApp.canvas)
  const resizeCanvas = (): void => {
    const windowAspect = window.innerWidth / window.innerHeight
    const displayH =
      windowAspect > STAGE_ASPECT
        ? Math.floor(window.innerHeight)
        : Math.floor(window.innerWidth / STAGE_ASPECT)
    const displayW = Math.floor(displayH * STAGE_ASPECT)
    pixiApp.renderer.resize(displayW, displayH)
    pixiApp.stage.scale.set(displayW / STAGE_WIDTH)
    pixiApp.canvas.style.width = `${displayW}px`
    pixiApp.canvas.style.height = `${displayH}px`
  }
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  setLoadingProgress(0.5)

  const app = new App(pixiApp)
  await app.startTitle()

  setLoadingProgress(1)
  removeLoading()
}

main().catch(err => {
  console.error(err)
})
