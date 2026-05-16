// プラットフォーム矩形をハードコードで配置 (Issue #4 / #6 用の地形ソース)。
//
// endroll-jumpers の detectTerrain は本リポでは使わない (Canvas 輝度認識は不要)。
// 影の伝説的なフラットなステージ + 複数段の足場を 800x600 で組む。
// Phaser 版 (旧 MainScene) の構成 (地面 y=560、画面下中央寄りに歩ける足場) を踏襲。

import { Graphics, Container } from 'pixi.js'
import { STAGE_WIDTH } from './constants'

export interface CollisionRect {
  x: number
  y: number
  width: number
  height: number
  /** 表示色 (オプション、なければ茶色) */
  color?: number
}

/** デフォルトのステージ地形 (800x600) */
export const createDefaultStage = (): CollisionRect[] => {
  const groundColor = 0x8b4513 // 茶色
  const platColor = 0x6b4423

  return [
    // 地面 (y=560 から 40px)
    { x: 0, y: 560, width: STAGE_WIDTH, height: 40, color: groundColor },

    // 中段 (左右)
    { x: 80, y: 450, width: 180, height: 14, color: platColor },
    { x: 540, y: 450, width: 180, height: 14, color: platColor },

    // 中央上
    { x: 320, y: 370, width: 160, height: 14, color: platColor },

    // 上段 (左右)
    { x: 130, y: 290, width: 140, height: 14, color: platColor },
    { x: 530, y: 290, width: 140, height: 14, color: platColor },

    // 最上段
    { x: 320, y: 200, width: 160, height: 14, color: platColor },
  ]
}

/** 矩形群を PIXI.Graphics で描画して Container として返す (Issue #4) */
export const renderTerrain = (rects: ReadonlyArray<CollisionRect>): Container => {
  const layer = new Container()
  const g = new Graphics()
  for (const r of rects) {
    g.rect(r.x, r.y, r.width, r.height).fill({
      color: r.color ?? 0x8b4513,
    })
  }
  layer.addChild(g)
  return layer
}
