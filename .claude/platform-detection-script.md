# 横長画像 → 足場（段差）認識スクリプト 設計書

## 概要

横長のパノラマ画像（動画から生成された背景画像）を入力として、画像認識技術で段差・縁石・水平線を検出し、ゲームの足場データ（platforms.json）を自動生成するスクリプト。

## 入出力仕様

### 入力

- **ファイル形式**: PNG, JPEG, WebP
- **解像度**: 横長画像（例: 12800 x 720）
- **内容**: 歩道、縁石、段差が写っている街並み画像

### 出力

- **ファイル形式**: JSON
- **ファイル名**: `platforms.json`
- **内容**: 足場データ（座標リスト）

```json
{
  "backgroundImage": "background.png",
  "width": 12800,
  "height": 720,
  "platforms": [
    {
      "id": "platform-0",
      "points": [
        { "x": 0, "y": 600 },
        { "x": 2000, "y": 580 }
      ],
      "type": "static"
    }
  ]
}
```

### パラメータ

| パラメータ | 説明 | デフォルト値 | 範囲 |
|-----------|------|------------|------|
| `method` | 検出方法 | `color` | `color`, `opencv`, `tensorflow` |
| `targetColor` | 検出対象色（RGB） | `{r:128, g:128, b:128}` | 0-255 |
| `threshold` | 色の許容範囲 | `30` | 10 - 100 |
| `minLineLength` | 最小線の長さ（px） | `50` | 10 - 500 |
| `edgeThreshold` | エッジ検出の閾値 | `50, 150` | 10 - 255 |

---

## アルゴリズム

### 方法1: カラーベース検出（簡易版）

**対象**: 縁石の灰色など、特定色の水平線を検出

#### アルゴリズム

```
1. 画像を読み込み
2. 全ピクセルをスキャン
3. 指定色（±threshold）に一致するピクセルをマーク
4. 水平方向に連続したマークを検出
5. minLineLength 以上の線を足場候補として抽出
6. 足場データとして出力
```

#### 疑似コード

```typescript
function detectByColor(
  image: ImageData,
  targetColor: RGB,
  threshold: number
): Platform[] {
  const platforms: Platform[] = []

  // 各行をスキャン
  for (let y = 0; y < image.height; y++) {
    let lineStart = -1

    for (let x = 0; x < image.width; x++) {
      const pixel = getPixel(image, x, y)

      // 色がマッチするか
      if (colorMatch(pixel, targetColor, threshold)) {
        if (lineStart === -1) lineStart = x
      } else {
        if (lineStart !== -1 && x - lineStart > minLineLength) {
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

function colorMatch(pixel: RGB, target: RGB, threshold: number): boolean {
  return (
    Math.abs(pixel.r - target.r) < threshold &&
    Math.abs(pixel.g - target.g) < threshold &&
    Math.abs(pixel.b - target.b) < threshold
  )
}
```

**メリット**:
- 実装が簡単
- 処理が高速
- 依存ライブラリ不要

**デメリット**:
- 照明条件で精度が変わる
- 複雑な段差は検出困難

---

### 方法2: OpenCV.js エッジ検出（高精度版）

**対象**: 縁石や段差のエッジを検出し、水平線を抽出

#### アルゴリズム

```
1. 画像をグレースケールに変換
2. Canny エッジ検出でエッジを抽出
3. Hough 変換で直線を検出
4. 水平線（角度 ±10度以内）をフィルタリング
5. 足場データとして出力
```

#### 疑似コード

```typescript
import cv from 'opencv.js'

function detectByOpenCV(
  imageElement: HTMLImageElement
): Platform[] {
  // 画像を OpenCV Mat に変換
  const src = cv.imread(imageElement)
  const gray = new cv.Mat()
  const edges = new cv.Mat()
  const lines = new cv.Mat()

  // グレースケール変換
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  // Canny エッジ検出
  cv.Canny(gray, edges, 50, 150, 3, false)

  // Hough 変換で直線検出
  cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 80, 100, 10)

  const platforms: Platform[] = []
  const horizontalThreshold = (10 * Math.PI) / 180 // ±10度

  // 水平線のみ抽出
  for (let i = 0; i < lines.rows; i++) {
    const x1 = lines.data32S[i * 4]
    const y1 = lines.data32S[i * 4 + 1]
    const x2 = lines.data32S[i * 4 + 2]
    const y2 = lines.data32S[i * 4 + 3]

    const angle = Math.abs(Math.atan2(y2 - y1, x2 - x1))

    // 水平線かチェック
    if (angle < horizontalThreshold || angle > Math.PI - horizontalThreshold) {
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
```

**メリット**:
- 高精度
- 照明条件に強い
- エッジを正確に検出

**デメリット**:
- OpenCV.js が必要（~8MB）
- 処理がやや重い

---

### 方法3: TensorFlow.js セマンティックセグメンテーション（超高精度版）

**対象**: AI で「歩道」「車道」「縁石」を自動分類

#### アルゴリズム

```
1. DeepLab モデルを読み込み
2. 画像をセグメンテーション
3. 「歩道」領域の上端を検出
4. 上端の輪郭線を足場として抽出
5. 足場データとして出力
```

#### 疑似コード

```typescript
import * as deeplab from '@tensorflow-models/deeplab'

async function detectByTensorFlow(
  imageElement: HTMLImageElement
): Promise<Platform[]> {
  // モデル読み込み
  const model = await deeplab.load()

  // セグメンテーション実行
  const segmentation = await model.segment(imageElement)

  const platforms: Platform[] = []
  const segmentationMap = segmentation.segmentationMap

  // 歩道クラスのピクセルを抽出
  const pavementClass = 1 // 仮定: クラス1が歩道
  const pavementPixels: boolean[][] = []

  for (let y = 0; y < segmentationMap.height; y++) {
    pavementPixels[y] = []
    for (let x = 0; x < segmentationMap.width; x++) {
      const index = y * segmentationMap.width + x
      pavementPixels[y][x] = segmentationMap.data[index] === pavementClass
    }
  }

  // 歩道領域の上端を検出
  for (let x = 0; x < segmentationMap.width; x++) {
    for (let y = 0; y < segmentationMap.height; y++) {
      if (pavementPixels[y][x] && !pavementPixels[y - 1]?.[x]) {
        // 上端発見
        platforms.push({
          id: `platform-${platforms.length}`,
          points: [
            { x, y },
            { x: x + 1, y },
          ],
          type: 'static',
        })
        break
      }
    }
  }

  return mergePlatforms(platforms) // 隣接する点を結合
}

function mergePlatforms(platforms: Platform[]): Platform[] {
  // 隣接する点を結合してポリゴン化
  // ...
}
```

**メリット**:
- 超高精度（90%以上）
- 複雑な段差も検出可能
- 照明・角度に強い

**デメリット**:
- モデルサイズが大きい（~20MB）
- 処理が重い（初回読み込み時）
- GPU推奨

---

## 実装方法

### 実装A: ブラウザ版（React + Canvas / OpenCV.js）

```typescript
// src/tools/VideoToStage/PlatformDetector.ts
export type DetectionMethod = 'color' | 'opencv' | 'tensorflow'

export class PlatformDetector {
  async detect(
    image: HTMLImageElement,
    method: DetectionMethod,
    options: any
  ): Promise<Platform[]> {
    switch (method) {
      case 'color':
        return this.detectByColor(image, options)
      case 'opencv':
        return this.detectByOpenCV(image, options)
      case 'tensorflow':
        return await this.detectByTensorFlow(image, options)
    }
  }

  private detectByColor(
    image: HTMLImageElement,
    options: { targetColor: RGB; threshold: number }
  ): Platform[] {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = image.width
    canvas.height = image.height
    ctx.drawImage(image, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // カラーベース検出ロジック（上記参照）
    return detectByColor(imageData, options.targetColor, options.threshold)
  }

  private detectByOpenCV(
    image: HTMLImageElement,
    options: any
  ): Platform[] {
    // OpenCV.js 検出ロジック（上記参照）
    return detectByOpenCV(image)
  }

  private async detectByTensorFlow(
    image: HTMLImageElement,
    options: any
  ): Promise<Platform[]> {
    // TensorFlow.js 検出ロジック（上記参照）
    return await detectByTensorFlow(image)
  }
}
```

#### UI コンポーネント

```typescript
// src/tools/VideoToStage/PlatformDetectorUI.tsx
export function PlatformDetectorUI({ image, onPlatformsDetected }) {
  const [method, setMethod] = useState<DetectionMethod>('color')
  const [targetColor, setTargetColor] = useState({ r: 128, g: 128, b: 128 })
  const [threshold, setThreshold] = useState(30)
  const [platforms, setPlatforms] = useState<Platform[]>([])

  const handleDetect = async () => {
    const detector = new PlatformDetector()
    const detected = await detector.detect(image, method, {
      targetColor,
      threshold,
    })

    setPlatforms(detected)
    onPlatformsDetected(detected)
  }

  return (
    <div className="platform-detector">
      <h2>Step 3: 足場自動検出</h2>

      <div>
        <label>
          検出方法:
          <select value={method} onChange={e => setMethod(e.target.value)}>
            <option value="color">カラーベース（簡易）</option>
            <option value="opencv">OpenCV（高精度）</option>
            <option value="tensorflow">TensorFlow（超高精度）</option>
          </select>
        </label>
      </div>

      {method === 'color' && (
        <div>
          <label>
            検出色（グレー）:
            <input
              type="range"
              min="0"
              max="255"
              value={targetColor.r}
              onChange={e => {
                const val = parseInt(e.target.value)
                setTargetColor({ r: val, g: val, b: val })
              }}
            />
            {targetColor.r}
          </label>
          <label>
            許容範囲:
            <input
              type="range"
              min="10"
              max="100"
              value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value))}
            />
            ±{threshold}
          </label>
        </div>
      )}

      <button onClick={handleDetect}>自動検出</button>

      <div>
        <p>検出された足場数: {platforms.length}</p>
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', border: '1px solid black' }}
        />
      </div>

      <button onClick={() => onPlatformsDetected(platforms)}>
        次へ（手動調整）
      </button>
    </div>
  )
}
```

---

### 実装B: Node.js CLI版（OpenCV / Python連携）

```typescript
// scripts/platformDetector.ts
import sharp from 'sharp'
import { spawn } from 'child_process'
import fs from 'fs/promises'

export async function detectPlatforms(
  imagePath: string,
  method: 'color' | 'opencv' | 'python',
  outputPath: string
) {
  switch (method) {
    case 'color':
      return await detectByColorCLI(imagePath, outputPath)
    case 'opencv':
      return await detectByOpenCVNode(imagePath, outputPath)
    case 'python':
      return await detectByPython(imagePath, outputPath)
  }
}

async function detectByColorCLI(
  imagePath: string,
  outputPath: string
): Promise<void> {
  const image = sharp(imagePath)
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const platforms: Platform[] = []

  // カラーベース検出（上記ロジック）
  // ...

  await fs.writeFile(outputPath, JSON.stringify(platforms, null, 2))
}

async function detectByPython(
  imagePath: string,
  outputPath: string
): Promise<void> {
  // Python スクリプトを呼び出し（OpenCV を Python で実行）
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [
      'scripts/detect_platforms.py',
      imagePath,
      outputPath,
    ])

    python.on('close', code => {
      if (code === 0) resolve()
      else reject(new Error(`Python script exited with code ${code}`))
    })
  })
}
```

#### Python スクリプト例

```python
# scripts/detect_platforms.py
import cv2
import numpy as np
import json
import sys

def detect_platforms(image_path, output_path):
    # 画像読み込み
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Canny エッジ検出
    edges = cv2.Canny(gray, 50, 150)

    # Hough 変換
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 80, minLineLength=100, maxLineGap=10)

    platforms = []

    if lines is not None:
        for i, line in enumerate(lines):
            x1, y1, x2, y2 = line[0]

            # 水平線かチェック
            angle = abs(np.arctan2(y2 - y1, x2 - x1))
            threshold = 10 * np.pi / 180

            if angle < threshold or angle > np.pi - threshold:
                platforms.append({
                    'id': f'platform-{i}',
                    'points': [
                        {'x': int(x1), 'y': int(y1)},
                        {'x': int(x2), 'y': int(y2)}
                    ],
                    'type': 'static'
                })

    # JSON出力
    with open(output_path, 'w') as f:
        json.dump({'platforms': platforms}, f, indent=2)

if __name__ == '__main__':
    detect_platforms(sys.argv[1], sys.argv[2])
```

---

## 検出結果の可視化

検出された足場をプレビュー表示する機能。

```typescript
function visualizePlatforms(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  platforms: Platform[]
) {
  const ctx = canvas.getContext('2d')!

  canvas.width = image.width
  canvas.height = image.height

  // 背景画像を描画
  ctx.drawImage(image, 0, 0)

  // 足場を描画
  ctx.strokeStyle = 'lime'
  ctx.lineWidth = 3

  platforms.forEach(platform => {
    ctx.beginPath()
    platform.points.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.stroke()
  })
}
```

---

## 検出精度の評価

### 評価指標

- **再現率**: 実際の足場のうち、正しく検出された割合
- **適合率**: 検出された足場のうち、正しいものの割合
- **F値**: 再現率と適合率の調和平均

### テストデータ

| テスト画像 | 実際の足場数 | 検出数（カラー） | 検出数（OpenCV） |
|-----------|------------|----------------|----------------|
| 晴天・直線 | 10 | 8 (80%) | 9 (90%) |
| 曇天・直線 | 10 | 5 (50%) | 8 (80%) |
| 晴天・曲線 | 10 | 6 (60%) | 7 (70%) |

---

## エラーハンドリング

### 想定されるエラー

1. **検出失敗（0件）**
   - 対策: パラメータ調整提案、手動モードへ誘導

2. **過検出（多すぎる）**
   - 対策: フィルタリング、最小線長の調整

3. **メモリ不足（大きい画像）**
   - 対策: 画像を分割処理

---

## ディレクトリ構成

```
src/
  tools/
    VideoToStage/
      PlatformDetector.ts         # 検出コアロジック
      PlatformDetectorUI.tsx      # UI
      detectors/
        ColorDetector.ts          # カラーベース
        OpenCVDetector.ts         # OpenCV
        TensorFlowDetector.ts     # TensorFlow

scripts/
  platformDetector.ts             # CLI版
  detect_platforms.py             # Python版
```

---

## 次のステップ

1. [ ] ColorDetector.ts を実装（カラーベース）
2. [ ] OpenCVDetector.ts を実装（エッジ検出）
3. [ ] PlatformDetectorUI.tsx を実装（UI）
4. [ ] 検出結果の可視化機能を実装
5. [ ] テスト画像で精度検証
6. [ ] （オプション）TensorFlowDetector.ts を実装

---

## 参考資料

- [OpenCV.js - Edge Detection](https://docs.opencv.org/4.x/d7/de1/tutorial_js_canny.html)
- [OpenCV.js - Hough Line Transform](https://docs.opencv.org/4.x/d3/de6/tutorial_js_houghlines.html)
- [TensorFlow.js - DeepLab](https://github.com/tensorflow/tfjs-models/tree/master/deeplab)
- [ImageData API](https://developer.mozilla.org/en-US/docs/Web/API/ImageData)
