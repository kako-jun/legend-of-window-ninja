# 動画からステージ生成システム 仕様検討

## 概要

実際の道の歩道を車道側から撮影した動画を、**事前処理**で静止画背景とステージデータに変換するシステム。動画をリアルタイムで再生するのではなく、あらかじめステージデータを生成しておき、ゲームではそれを読み込んでプレイする。

## ワークフロー

```
スマホで動画撮影 (MP4)
  ↓
【事前処理ツール】
  1. 動画からフレーム抽出
  2. フレームを横に連結して背景画像生成
  3. 画像認識で足場を自動検出
  4. ステージデータ出力（背景画像 + 足場JSON）
  ↓
【ゲーム】
  ステージデータを読み込んでプレイ
```

## 目的

- リアルな背景でゲームの没入感を高める
- 画像認識による自動的な足場検出で、様々な動画を簡単にステージ化できる
- スマホで撮影した動画をそのまま使える手軽さ
- **事前処理なのでパフォーマンスを気にせず高度な画像認識が使える**

## 技術要件

### 入力

- **動画形式**: MP4（スマホ撮影）
- **想定解像度**: 1080p (1920x1080) または 720p (1280x720)
- **撮影方向**: 歩道を車道側から撮影（横スクロール視点）
- **撮影内容**: 縁石、歩道の段差など、足場として認識できる水平面

### 出力

- **背景画像**: PNG形式の横長画像（例: 10000 x 720 px）
- **足場データ**: JSON形式のステージデータ
  ```json
  {
    "backgroundImage": "stage01.png",
    "width": 10000,
    "height": 720,
    "platforms": [...]
  }
  ```

### 技術スタック

#### 【事前処理ツール】

1. **動画処理**
   - FFmpeg または Canvas API（フレーム抽出）
   - Canvas API（フレーム連結）
   - Sharp / Jimp（画像最適化）

2. **画像認識**
   - **OpenCV.js**: エッジ検出、輪郭抽出、直線検出（推奨）
   - **TensorFlow.js**: セマンティックセグメンテーション（高精度）
   - **カラーベース**: RGB値による簡易検出（プロトタイプ用）

3. **実装環境**
   - Node.js スクリプト（CLI ツール）
   - または React アプリ（GUI ツール）

#### 【ゲーム側】

1. **背景表示**
   - Phaser 3: Image / TileSprite で静止画背景を表示
   - カメラスクロールで横移動

2. **物理エンジン**
   - Arcade Physics: 生成された足場JSONから当たり判定を生成

## 実現手順

### フェーズ1: 動画からフレーム抽出・連結ツール

#### 1.1 フレーム抽出
動画から一定間隔でフレームを抽出し、横に連結して背景画像を生成。

**方法A: FFmpeg (推奨)**
```bash
# 1秒ごとにフレームを抽出
ffmpeg -i input.mp4 -vf "fps=1" frames/frame_%04d.png

# または特定の間隔で抽出（0.5秒ごと）
ffmpeg -i input.mp4 -vf "fps=2" frames/frame_%04d.png
```

**方法B: Canvas API（ブラウザ内）**
```typescript
// src/tools/FrameExtractor.ts
export class FrameExtractor {
  async extractFrames(video: HTMLVideoElement, interval: number = 1) {
    const frames: ImageData[] = []
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    for (let t = 0; t < video.duration; t += interval) {
      video.currentTime = t
      await new Promise(resolve => video.onseeked = resolve)

      ctx.drawImage(video, 0, 0)
      frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }

    return frames
  }
}
```

#### 1.2 フレーム連結
抽出したフレームを横に連結して、横長の背景画像を生成。

**実装ファイル**: `src/tools/FrameStitcher.ts`

```typescript
export class FrameStitcher {
  stitchFrames(frames: ImageData[]): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // 横長のキャンバスを作成
    canvas.width = frames[0].width * frames.length
    canvas.height = frames[0].height

    // フレームを横に並べる
    frames.forEach((frame, i) => {
      ctx.putImageData(frame, i * frame.width, 0)
    })

    return canvas
  }

  // Canvas を PNG として保存
  downloadAsPNG(canvas: HTMLCanvasElement, filename: string) {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob!)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    })
  }
}
```

#### 成果物
- [ ] 動画からフレームを抽出できる
- [ ] フレームを連結して横長背景画像を生成できる
- [ ] PNG として保存できる

---

### フェーズ2: 手動足場エディタ（静止画版）

#### 2.1 静止画ベースのエディタ
生成した背景画像を読み込み、手動で足場を設定するツール。

**実装ファイル**: `src/tools/PlatformEditor.tsx`

```typescript
export function PlatformEditor() {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement>()
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new Image()
    img.onload = () => setBackgroundImage(img)
    img.src = URL.createObjectURL(file)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentPoints([...currentPoints, { x, y }])
  }

  const finalizePlatform = () => {
    setPlatforms([...platforms, {
      id: `platform-${Date.now()}`,
      points: currentPoints,
      type: 'static'
    }])
    setCurrentPoints([])
  }

  const exportData = () => {
    const data = {
      backgroundImage: 'stage01.png',
      width: backgroundImage!.width,
      height: backgroundImage!.height,
      platforms
    }
    // JSON ダウンロード
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <canvas onClick={handleCanvasClick} />
      <button onClick={finalizePlatform}>Finalize Platform</button>
      <button onClick={exportData}>Export JSON</button>
    </div>
  )
}
```

**出力データ形式**:
```json
{
  "backgroundImage": "stage01.png",
  "width": 10000,
  "height": 720,
  "platforms": [
    {
      "id": "platform-1",
      "points": [
        { "x": 0, "y": 600 },
        { "x": 2000, "y": 580 },
        { "x": 4000, "y": 560 }
      ],
      "type": "static"
    }
  ]
}
```

#### 成果物
- [ ] 背景画像を読み込める
- [ ] クリックで足場ポイントを設定できる
- [ ] ステージデータを JSON で出力できる

---

### フェーズ3: カラーベース自動足場検出（事前処理）

#### 3.1 色ベースの足場検出
背景画像から特定の色（縁石の灰色など）を検出して、自動的に足場を生成。

**実装ファイル**: `src/tools/vision/ColorDetector.ts`

```typescript
export class ColorDetector {
  detectPlatforms(
    backgroundImage: HTMLImageElement,
    targetColor: RGB,
    threshold: number = 30
  ): Platform[] {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = backgroundImage.width
    canvas.height = backgroundImage.height
    ctx.drawImage(backgroundImage, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const platforms: Platform[] = []

    // 色マッチング: 各ピクセルが指定色に一致するかチェック
    const matchedPixels: boolean[][] = []
    for (let y = 0; y < canvas.height; y++) {
      matchedPixels[y] = []
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4
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
    for (let y = 0; y < canvas.height; y++) {
      let lineStart = -1

      for (let x = 0; x < canvas.width; x++) {
        if (matchedPixels[y][x]) {
          if (lineStart === -1) lineStart = x
        } else {
          if (lineStart !== -1 && x - lineStart > 50) {
            // 50px以上の線のみ
            platforms.push({
              id: `platform-${platforms.length}`,
              points: [
                { x: lineStart, y },
                { x: x - 1, y },
              ],
              type: 'static',
            })
          }
          lineStart = -1
        }
      }
    }

    return platforms
  }
}
```

#### 3.2 エディタに統合

```typescript
// PlatformEditor.tsx に追加
const autoDetectByColor = () => {
  const detector = new ColorDetector()
  const detectedPlatforms = detector.detectPlatforms(
    backgroundImage!,
    { r: 128, g: 128, b: 128 }, // 灰色
    30
  )
  setPlatforms(detectedPlatforms)
}
```

#### 成果物
- [ ] 特定色で水平線を自動検出
- [ ] 検出された足場をプレビュー表示
- [ ] 検出精度の検証（目視）

---

### フェーズ4: OpenCV.js による高度な画像認識（事前処理）

#### 4.1 OpenCV.js のセットアップ
```bash
npm install opencv.js
```

#### 4.2 エッジ検出・直線検出
背景画像からエッジと直線を検出して、高精度に足場を自動生成。

**実装ファイル**: `src/tools/vision/OpenCVDetector.ts`

```typescript
import cv from 'opencv.js'

export class OpenCVDetector {
  detectPlatforms(backgroundImage: HTMLImageElement): Platform[] {
    // 画像をCanvasに描画
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = backgroundImage.width
    canvas.height = backgroundImage.height
    ctx.drawImage(backgroundImage, 0, 0)

    // OpenCVで読み込み
    const src = cv.imread(canvas)
    const gray = new cv.Mat()
    const edges = new cv.Mat()
    const lines = new cv.Mat()

    // グレースケール変換
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    // Cannyエッジ検出
    cv.Canny(gray, edges, 50, 150, 3, false)

    // Hough変換で直線検出
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 80, 100, 10)

    // 水平線をフィルタリング（±10度以内）
    const platforms: Platform[] = []
    const threshold = (10 * Math.PI) / 180

    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4]
      const y1 = lines.data32S[i * 4 + 1]
      const x2 = lines.data32S[i * 4 + 2]
      const y2 = lines.data32S[i * 4 + 3]

      const angle = Math.abs(Math.atan2(y2 - y1, x2 - x1))

      if (angle < threshold || angle > Math.PI - threshold) {
        platforms.push({
          id: `platform-${i}`,
          points: [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ],
          type: 'static',
        })
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

#### 4.3 エディタに統合

```typescript
// PlatformEditor.tsx に追加
const autoDetectByOpenCV = async () => {
  const detector = new OpenCVDetector()
  const detectedPlatforms = detector.detectPlatforms(backgroundImage!)
  setPlatforms(detectedPlatforms)
}
```

#### 成果物
- [ ] OpenCV.js でエッジと直線を検出
- [ ] 水平線を足場として抽出
- [ ] 検出精度80%以上（カラーベースより高精度）

---

### フェーズ5: TensorFlow.js（オプション・高度）

セマンティックセグメンテーションで「歩道」「車道」「縁石」を自動分類し、超高精度に足場を検出。

**使用モデル**: DeepLab v3（事前学習済みモデル）

```typescript
import * as tf from '@tensorflow/tfjs'
import * as deeplab from '@tensorflow-models/deeplab'

export class TensorFlowDetector {
  async detectPlatforms(backgroundImage: HTMLImageElement): Promise<Platform[]> {
    const model = await deeplab.load()
    const segmentation = await model.segment(backgroundImage)

    // セグメンテーション結果から「歩道」領域を抽出
    // 歩道領域の上端を足場として使用
    const platforms: Platform[] = []

    // ... 詳細実装
    return platforms
  }
}
```

#### 成果物
- [ ] AI による超高精度な足場検出（90%以上）

---

### フェーズ6: ゲーム側での静止画背景表示

事前生成したステージデータをゲームで読み込み、プレイ可能にする。

#### 6.1 ステージデータの読み込み

**ディレクトリ構造**:
```
public/
  assets/
    stages/
      stage01/
        background.png    # 横長背景画像
        platforms.json    # 足場データ
```

**実装ファイル**: `src/game/stage/StageLoader.ts`

```typescript
export class StageLoader {
  async load(stageId: string): Promise<StageData> {
    const response = await fetch(`/assets/stages/${stageId}/platforms.json`)
    const data = await response.json()

    return {
      backgroundImage: `/assets/stages/${stageId}/background.png`,
      ...data,
    }
  }
}
```

#### 6.2 Phaserでの背景表示

```typescript
// src/game/MainScene.ts
import { StageLoader } from './stage/StageLoader'

export class MainScene extends Phaser.Scene {
  private stageLoader?: StageLoader
  private background?: Phaser.GameObjects.TileSprite

  async create() {
    // ステージデータを読み込み
    this.stageLoader = new StageLoader()
    const stageData = await this.stageLoader.load('stage01')

    // 背景を表示（TileSpriteで横スクロール）
    this.background = this.add.tileSprite(
      0,
      0,
      800,
      600,
      'background'
    )
    this.background.setOrigin(0, 0)
    this.background.setDepth(-1)

    // 足場を生成
    this.createPlatforms(stageData.platforms)

    // カメラ設定
    this.cameras.main.setBounds(0, 0, stageData.width, stageData.height)
    this.cameras.main.startFollow(this.ninja!)
  }

  update() {
    // 背景をスクロール
    this.background!.tilePositionX = this.cameras.main.scrollX
  }
}
```

#### 6.3 足場の生成

```typescript
private createPlatforms(platforms: Platform[]) {
  const group = this.physics.add.staticGroup()

  platforms.forEach(platform => {
    if (platform.points.length < 2) return

    for (let i = 0; i < platform.points.length - 1; i++) {
      const p1 = platform.points[i]
      const p2 = platform.points[i + 1]

      const centerX = (p1.x + p2.x) / 2
      const centerY = (p1.y + p2.y) / 2
      const width = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)

      const platformSprite = group.create(centerX, centerY, '')
      platformSprite.setDisplaySize(width, 10)
      platformSprite.setRotation(angle)
      platformSprite.body!.updateFromGameObject()
    }
  })

  this.physics.add.collider(this.ninja!, group)
}
```

#### 成果物
- [ ] 背景画像が横スクロール表示される
- [ ] 足場データから当たり判定が生成される
- [ ] 忍者が足場を歩ける
- [ ] カメラが忍者を追従する

---

## 実装の優先順位

### 推奨実装順序

1. **フェーズ1（必須）**: フレーム抽出・連結ツール ⭐⭐⭐
2. **フェーズ2（必須）**: 手動足場エディタ ⭐⭐⭐
3. **フェーズ6（必須）**: ゲーム側実装（静止画背景） ⭐⭐⭐
4. **フェーズ3（推奨）**: カラーベース自動検出 ⭐⭐
5. **フェーズ4（推奨）**: OpenCV.js 高度な検出 ⭐⭐
6. **フェーズ5（オプション）**: TensorFlow.js AI検出 ⭐

### 最小実装（MVP）

**目標**: 1週間で動くプロトタイプ

1. **フレーム抽出・連結ツール**（1日）
   - 動画からフレームを抽出
   - フレームを横に連結して背景画像を生成

2. **手動足場エディタ**（2日）
   - 背景画像を読み込み
   - クリックで足場を手動設定
   - JSONで出力

3. **ゲーム側実装**（2日）
   - 静止画背景を表示
   - 足場データを読み込み
   - 横スクロール動作

4. **カラーベース自動検出**（1日）
   - 簡易的に足場を自動検出

5. **統合テスト**（1日）

---

## 技術的課題と対策

### 課題1: 背景画像のサイズ
- **問題**: 横長画像が大きくなる（例: 10000x720 = 7.2MP）
- **対策**:
  - PNG圧縮（pngquant / tinypng）
  - WebP 形式の使用
  - 必要に応じてタイル分割

### 課題2: 検出精度
- **問題**: 照明条件や撮影角度で検出精度が変わる
- **対策**:
  - 撮影ガイドラインの作成（晴天時、一定角度）
  - 複数アルゴリズムの併用
  - ユーザーによる微調整機能（手動エディタで補正）

### 課題3: ブラウザ互換性
- **問題**: OpenCV.js のサイズが大きい（~8MB）
- **対策**:
  - **事前処理なのでゲーム側には不要**
  - エディタツール側のみで使用
  - 遅延ロード

### 課題4: フレーム抽出の精度
- **問題**: 動画のフレームレートや間隔で背景の見た目が変わる
- **対策**:
  - 抽出間隔を調整可能に（0.5秒、1秒、2秒など）
  - プレビュー機能で確認してから出力

---

## 開発環境セットアップ

### 必要なパッケージ

#### ゲーム本体
```json
{
  "dependencies": {
    "phaser": "^3.87.0"
  }
}
```

#### エディタツール（事前処理）
```json
{
  "dependencies": {
    "opencv.js": "^4.9.0",  // フェーズ4以降
    "sharp": "^0.32.0"      // 画像最適化（Node.js版）
  },
  "devDependencies": {
    "@tensorflow/tfjs": "^4.x",  // フェーズ5（オプション）
    "@tensorflow-models/deeplab": "^1.x"
  }
}
```

### 動画サンプル準備

スマホで撮影した動画を最適化（解像度とビットレート調整）：

```bash
# 720pに縮小、ビットレート圧縮、音声削除
ffmpeg -i raw_video.mp4 \
  -vf "scale=1280:720" \
  -c:v libx264 \
  -crf 23 \
  -preset medium \
  -an \
  optimized_video.mp4
```

### ワークフロー例

```bash
# 1. 動画を用意
# スマホで撮影 → PCに転送

# 2. エディタツールで変換
npm run editor
# → 動画アップロード
# → フレーム抽出・連結
# → 背景画像生成（background.png）
# → 手動 or 自動で足場設定
# → platforms.json 出力

# 3. ゲームで使用
# public/assets/stages/stage01/ に配置
# → ゲームでプレイ
```

---

## テスト計画

### ユニットテスト
- ColorDetector の色検出精度
- OpenCVDetector の直線検出精度
- 足場データの妥当性検証

### 統合テスト
- 動画再生 + 足場表示
- 当たり判定の正確性
- パフォーマンステスト（FPS維持）

### ユーザーテスト
- 異なる動画での検出精度
- プレイアビリティ

---

## 次のアクション

1. [ ] プロジェクト構造の確認・設計
2. [ ] 動画背景表示のプロトタイプ作成（フェーズ1）
3. [ ] テスト用動画の撮影（歩道の縁石を含む横スクロール視点）
4. [ ] 手動足場エディタの実装（フェーズ2）
5. [ ] カラーベース検出の実装（フェーズ3）

---

## 参考資料

- [Phaser 3 Video Documentation](https://photonstorm.github.io/phaser3-docs/Phaser.GameObjects.Video.html)
- [OpenCV.js Tutorials](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [TensorFlow.js Models](https://github.com/tensorflow/tfjs-models)
- [Hough Line Transform](https://docs.opencv.org/4.x/d9/db0/tutorial_hough_lines.html)
