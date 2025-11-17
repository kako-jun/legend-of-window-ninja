# 動画背景システム 実装計画

## 実装ロードマップ

### 🎯 MVP（最小実装版）- 推定1週間

スマホで撮影したMP4動画を背景にして、簡易的な足場検出でプレイできる状態を目指す。

---

## Phase 1: 動画背景の実装 📹

**期間**: 1日
**目標**: 動画が背景として再生され、忍者が前面に表示される

### 実装タスク

#### 1.1 プロジェクト構造の準備

```
public/
  assets/
    videos/
      stage01.mp4          # テスト用動画
src/
  game/
    video/
      VideoBackground.ts   # 動画背景クラス
      VideoManager.ts      # 動画管理
    MainScene.ts           # 既存シーンを拡張
```

#### 1.2 VideoBackground.ts の実装

```typescript
// src/game/video/VideoBackground.ts
import Phaser from 'phaser'

export class VideoBackground {
  private video?: Phaser.GameObjects.Video
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  preload(key: string, path: string) {
    this.scene.load.video(key, path)
  }

  create(key: string, x: number, y: number, width: number, height: number) {
    this.video = this.scene.add.video(x, y, key)
    this.video.setDisplaySize(width, height)
    this.video.setDepth(-1) // 背景レイヤー
    this.video.play(true) // ループ再生
  }

  destroy() {
    this.video?.destroy()
  }
}
```

#### 1.3 MainScene への統合

```typescript
// src/game/MainScene.ts に追加
import { VideoBackground } from './video/VideoBackground'

export class MainScene extends Phaser.Scene {
  private videoBackground?: VideoBackground

  preload() {
    this.videoBackground = new VideoBackground(this)
    this.videoBackground.preload('stage01', 'assets/videos/stage01.mp4')
  }

  create() {
    // 動画背景を作成
    this.videoBackground!.create('stage01', 400, 300, 800, 600)

    // 既存の処理（忍者、敵など）
    // ...
  }
}
```

#### 1.4 テスト用動画の準備

スマホで撮影した動画を以下のコマンドで最適化：

```bash
# 解像度を1280x720に縮小、音声削除、圧縮
ffmpeg -i input.mp4 \
  -vf "scale=1280:720" \
  -c:v libx264 \
  -crf 23 \
  -preset medium \
  -an \
  public/assets/videos/stage01.mp4
```

### 完了条件

- [ ] 動画が背景として再生される
- [ ] 忍者が動画の前面に表示される
- [ ] 既存のゲームロジックが正常に動作

---

## Phase 2: 手動足場エディタ 🛠️

**期間**: 2日
**目標**: 動画を見ながら手動で足場を設定できるツールを作成

### 実装タスク

#### 2.1 エディタコンポーネントの作成

```
src/
  tools/
    PlatformEditor.tsx     # 足場エディタUI
    PlatformEditor.css     # スタイル
  types/
    Platform.ts            # 足場データ型定義
```

#### 2.2 Platform型定義

```typescript
// src/types/Platform.ts
export interface Point {
  x: number
  y: number
}

export interface Platform {
  id: string
  points: Point[]
  type: 'static' | 'moving'
}

export interface PlatformData {
  videoFile: string
  platforms: Platform[]
}
```

#### 2.3 PlatformEditor.tsx の実装

```typescript
// src/tools/PlatformEditor.tsx
import { useState, useRef, useEffect } from 'react'
import type { Platform, Point } from '../types/Platform'

export function PlatformEditor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentPoints([...currentPoints, { x, y }])
  }

  const finalizePlatform = () => {
    if (currentPoints.length < 2) return

    const newPlatform: Platform = {
      id: `platform-${Date.now()}`,
      points: currentPoints,
      type: 'static',
    }

    setPlatforms([...platforms, newPlatform])
    setCurrentPoints([])
  }

  const exportData = () => {
    const data = {
      videoFile: 'stage01.mp4',
      platforms,
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'platforms.json'
    a.click()
  }

  // Canvas描画ロジック
  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 動画フレームを描画
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 既存の足場を描画
    platforms.forEach(platform => {
      ctx.strokeStyle = 'lime'
      ctx.lineWidth = 3
      ctx.beginPath()
      platform.points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    })

    // 現在編集中のポイントを描画
    currentPoints.forEach((point, i) => {
      ctx.fillStyle = 'red'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2)
      ctx.fill()

      if (i > 0) {
        ctx.strokeStyle = 'yellow'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(currentPoints[i - 1].x, currentPoints[i - 1].y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
      }
    })
  })

  return (
    <div className="platform-editor">
      <h2>Platform Editor</h2>
      <div className="video-container">
        <video ref={videoRef} src="/assets/videos/stage01.mp4" controls />
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onClick={handleCanvasClick}
        />
      </div>
      <div className="controls">
        <button onClick={finalizePlatform}>Finalize Platform</button>
        <button onClick={() => setCurrentPoints([])}>Clear Current</button>
        <button onClick={exportData}>Export JSON</button>
      </div>
      <div className="platform-list">
        <h3>Platforms ({platforms.length})</h3>
        {platforms.map(p => (
          <div key={p.id}>
            {p.id}: {p.points.length} points
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### 2.4 App.tsx への統合

```typescript
// src/App.tsx に追加
import { PlatformEditor } from './tools/PlatformEditor'

function App() {
  const [mode, setMode] = useState<'game' | 'editor'>('game')

  return (
    <div className="App">
      <button onClick={() => setMode(mode === 'game' ? 'editor' : 'game')}>
        {mode === 'game' ? 'Open Editor' : 'Back to Game'}
      </button>

      {mode === 'game' ? <PhaserGame /> : <PlatformEditor />}
    </div>
  )
}
```

### 完了条件

- [ ] 動画を一時停止して足場ポイントをクリック指定できる
- [ ] 複数の足場を作成できる
- [ ] platforms.json として出力できる

---

## Phase 3: 足場データのゲーム適用 🎮

**期間**: 1日
**目標**: JSONファイルから足場を読み込み、ゲーム内で当たり判定として機能させる

### 実装タスク

#### 3.1 PlatformLoader.ts の実装

```typescript
// src/game/platform/PlatformLoader.ts
import type { PlatformData, Platform } from '../../types/Platform'

export class PlatformLoader {
  private scene: Phaser.Scene
  private platforms: Phaser.Physics.Arcade.StaticGroup

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.platforms = scene.physics.add.staticGroup()
  }

  async load(jsonPath: string) {
    const response = await fetch(jsonPath)
    const data: PlatformData = await response.json()

    data.platforms.forEach(platform => {
      this.createPlatform(platform)
    })

    return this.platforms
  }

  private createPlatform(platform: Platform) {
    if (platform.points.length < 2) return

    // 2点間を線で結んで足場を作成
    for (let i = 0; i < platform.points.length - 1; i++) {
      const p1 = platform.points[i]
      const p2 = platform.points[i + 1]

      const centerX = (p1.x + p2.x) / 2
      const centerY = (p1.y + p2.y) / 2
      const width = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)

      const platform = this.platforms.create(centerX, centerY, '')
      platform.setDisplaySize(width, 10)
      platform.setRotation(angle)
      platform.body!.updateFromGameObject()

      // デバッグ用の描画
      const graphics = this.scene.add.graphics()
      graphics.lineStyle(3, 0x00ff00, 1)
      graphics.lineBetween(p1.x, p1.y, p2.x, p2.y)
    }
  }

  getPlatforms() {
    return this.platforms
  }
}
```

#### 3.2 MainScene への統合

```typescript
// src/game/MainScene.ts
import { PlatformLoader } from './platform/PlatformLoader'

export class MainScene extends Phaser.Scene {
  private platformLoader?: PlatformLoader

  async create() {
    // 動画背景
    this.videoBackground!.create('stage01', 400, 300, 800, 600)

    // 足場を読み込み
    this.platformLoader = new PlatformLoader(this)
    const platforms = await this.platformLoader.load('/assets/platforms/stage01.json')

    // 忍者を作成
    this.createNinja()

    // 衝突判定
    this.physics.add.collider(this.ninja!, platforms)
  }
}
```

### 完了条件

- [ ] platforms.json から足場が読み込まれる
- [ ] 忍者が足場に乗れる（当たり判定が機能）
- [ ] 動画背景と足場が一致している

---

## Phase 4: カラーベース簡易画像認識 🎨

**期間**: 2日
**目標**: 特定の色（縁石の灰色など）を検出して自動的に足場を生成

### 実装タスク

#### 4.1 ColorDetector.ts の実装

```typescript
// src/game/vision/ColorDetector.ts
export interface RGB {
  r: number
  g: number
  b: number
}

export class ColorDetector {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  constructor() {
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d')!
  }

  detectPlatforms(
    video: HTMLVideoElement,
    targetColor: RGB,
    threshold: number = 30
  ) {
    // Canvas に動画フレームを描画
    this.canvas.width = video.videoWidth
    this.canvas.height = video.videoHeight
    this.ctx.drawImage(video, 0, 0)

    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    )

    // 色マッチング
    const matchedPixels: boolean[][] = []
    for (let y = 0; y < this.canvas.height; y++) {
      matchedPixels[y] = []
      for (let x = 0; x < this.canvas.width; x++) {
        const idx = (y * this.canvas.width + x) * 4
        const r = imageData.data[idx]
        const g = imageData.data[idx + 1]
        const b = imageData.data[idx + 2]

        const match =
          Math.abs(r - targetColor.r) < threshold &&
          Math.abs(g - targetColor.g) < threshold &&
          Math.abs(b - targetColor.b) < threshold

        matchedPixels[y][x] = match
      }
    }

    // 水平線を検出
    const platforms = this.findHorizontalLines(matchedPixels)
    return platforms
  }

  private findHorizontalLines(pixels: boolean[][]) {
    const platforms: { y: number; x1: number; x2: number }[] = []
    const minLineLength = 50 // 最小50px

    for (let y = 0; y < pixels.length; y++) {
      let lineStart = -1

      for (let x = 0; x < pixels[y].length; x++) {
        if (pixels[y][x]) {
          if (lineStart === -1) lineStart = x
        } else {
          if (lineStart !== -1) {
            const length = x - lineStart
            if (length >= minLineLength) {
              platforms.push({ y, x1: lineStart, x2: x })
            }
            lineStart = -1
          }
        }
      }
    }

    return platforms
  }
}
```

#### 4.2 UI でのカラーピッカー追加

```typescript
// src/tools/PlatformEditor.tsx に追加
const [targetColor, setTargetColor] = useState<RGB>({ r: 128, g: 128, b: 128 })

const autoDetect = () => {
  const detector = new ColorDetector()
  const platforms = detector.detectPlatforms(videoRef.current!, targetColor, 30)

  // 検出結果を足場データに変換
  const newPlatforms = platforms.map((p, i) => ({
    id: `auto-${i}`,
    points: [
      { x: p.x1, y: p.y },
      { x: p.x2, y: p.y },
    ],
    type: 'static' as const,
  }))

  setPlatforms(newPlatforms)
}

// UI
<div className="color-picker">
  <label>Target Color (Gray):</label>
  <input
    type="range"
    min="0"
    max="255"
    value={targetColor.r}
    onChange={e =>
      setTargetColor({ r: +e.target.value, g: +e.target.value, b: +e.target.value })
    }
  />
  <button onClick={autoDetect}>Auto Detect</button>
</div>
```

### 完了条件

- [ ] 指定した色（グレースケール）で水平線を検出
- [ ] 検出された線が足場として表示される
- [ ] 精度が60%以上（目視確認）

---

## Phase 5: OpenCV.js による高度な検出（オプション）⚡

**期間**: 3日
**目標**: エッジ検出と直線検出で高精度な足場認識

### 実装タスク

#### 5.1 OpenCV.js のインストール

```bash
npm install opencv.js
```

#### 5.2 OpenCVDetector.ts の実装

```typescript
// src/game/vision/OpenCVDetector.ts
import cv from 'opencv.js'

export class OpenCVDetector {
  detectPlatforms(video: HTMLVideoElement) {
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)

    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    const edges = new cv.Mat()
    const lines = new cv.Mat()

    // グレースケール変換
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    // Canny エッジ検出
    cv.Canny(gray, edges, 50, 150, 3, false)

    // Hough 変換で直線検出
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 80, 100, 10)

    // 水平線をフィルタリング（±10度以内）
    const platforms: { x1: number; y1: number; x2: number; y2: number }[] = []

    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4]
      const y1 = lines.data32S[i * 4 + 1]
      const x2 = lines.data32S[i * 4 + 2]
      const y2 = lines.data32S[i * 4 + 3]

      const angle = Math.abs(Math.atan2(y2 - y1, x2 - x1))
      const threshold = (10 * Math.PI) / 180

      if (angle < threshold || angle > Math.PI - threshold) {
        platforms.push({ x1, y1, x2, y2 })
      }
    }

    // メモリ解放
    src.delete()
    gray.delete()
    edges.delete()
    lines.delete()

    return platforms
  }
}
```

### 完了条件

- [ ] OpenCV.js でエッジ検出が動作
- [ ] 水平線が高精度で検出される
- [ ] 検出精度が80%以上

---

## Phase 6: パフォーマンス最適化 🚀

**期間**: 1日

### 実装タスク

#### 6.1 Web Worker での画像処理

```typescript
// src/workers/visionWorker.ts
import { ColorDetector } from '../game/vision/ColorDetector'

self.onmessage = (e) => {
  const { imageData, targetColor, threshold } = e.data
  const detector = new ColorDetector()
  const platforms = detector.detectPlatforms(imageData, targetColor, threshold)

  self.postMessage({ platforms })
}
```

#### 6.2 足場データのキャッシュ

```typescript
// 動画の各フレームごとに足場データをキャッシュ
const platformCache = new Map<number, Platform[]>()

function getPlatformsForFrame(frameNumber: number) {
  if (platformCache.has(frameNumber)) {
    return platformCache.get(frameNumber)
  }

  // 検出処理
  const platforms = detector.detectPlatforms(...)
  platformCache.set(frameNumber, platforms)
  return platforms
}
```

### 完了条件

- [ ] 60FPS を維持
- [ ] メモリ使用量が500MB以下

---

## 開発スケジュール

| Phase | タスク | 期間 | 開始日 | 完了予定 |
|-------|--------|------|--------|----------|
| 1 | 動画背景実装 | 1日 | Day 1 | Day 1 |
| 2 | 手動足場エディタ | 2日 | Day 2 | Day 3 |
| 3 | 足場データ適用 | 1日 | Day 4 | Day 4 |
| 4 | カラーベース検出 | 2日 | Day 5 | Day 6 |
| 5 | 統合テスト | 1日 | Day 7 | Day 7 |

**合計**: 7日間

---

## リリース基準

### MVP リリース条件

- [ ] スマホで撮影したMP4動画が背景として再生される
- [ ] 手動エディタで足場を設定できる
- [ ] 設定した足場でゲームプレイ可能
- [ ] カラーベース検出で簡易的に足場を自動生成できる
- [ ] 60FPS で動作（デスクトップ）
- [ ] モバイルでも30FPS 以上

### 将来のバージョン

- [ ] OpenCV.js による高精度検出
- [ ] 複数ステージ対応
- [ ] ステージエディタのUI改善
- [ ] オンラインステージ共有機能

---

## 次のステップ

1. **動画撮影ガイドライン作成**
   - 横スクロール視点
   - 縁石がはっきり見える
   - 晴天時の撮影推奨

2. **テスト動画撮影**
   - 実際に歩道を撮影
   - 10秒程度のテスト素材

3. **Phase 1 の実装開始**
   - VideoBackground.ts の作成
   - MainScene への統合

準備が整い次第、Phase 1 から順次実装を開始できます！
