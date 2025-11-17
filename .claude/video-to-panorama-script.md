# 動画 → 横長画像変換スクリプト 設計書

## 概要

スマホで撮影したMP4動画を入力として、フレームを抽出して横に連結し、ゲーム背景用の横長画像（パノラマ画像）を生成するスクリプト。

## 入出力仕様

### 入力

- **ファイル形式**: MP4, MOV, AVI など一般的な動画形式
- **解像度**: 任意（推奨: 720p または 1080p）
- **長さ**: 10秒〜60秒程度
- **撮影方法**: 車窓・電車窓から横向きに撮影

### 出力

- **ファイル形式**: PNG（または WebP）
- **解像度**: `元の高さ × (フレーム数 × 元の幅)`
  - 例: 720p動画、1秒間隔で10秒分 → `720 × 12800` (10フレーム × 1280)
- **ファイル名**: `background.png` または `stage_[タイムスタンプ].png`

### パラメータ

| パラメータ | 説明 | デフォルト値 | 範囲 |
|-----------|------|------------|------|
| `interval` | フレーム抽出間隔（秒） | 1.0 | 0.1 - 5.0 |
| `quality` | 出力画質（PNG圧縮レベル） | 6 | 0 - 9 |
| `format` | 出力形式 | `png` | `png`, `webp` |
| `maxHeight` | 最大高さ（リサイズ） | `720` | 360 - 1080 |

---

## アルゴリズム

### 1. 動画メタデータの取得

```
入力: video.mp4
↓
duration = 動画の長さ（秒）
fps = フレームレート
width, height = 解像度
```

### 2. フレーム抽出

```
for t in range(0, duration, interval):
  video.currentTime = t
  frame = video.captureFrame()
  frames.append(frame)
```

**抽出されるフレーム数**: `Math.floor(duration / interval)`

例: 10秒の動画、1秒間隔 → 10フレーム

### 3. フレーム連結（パノラマ生成）

```
panorama = new Canvas(width: totalWidth, height: height)
totalWidth = frameWidth * frameCount

for i, frame in enumerate(frames):
  panorama.drawImage(frame, x: i * frameWidth, y: 0)
```

### 4. 画像出力

```
panorama.save('background.png')
```

---

## 実装方法

### 実装A: ブラウザ版（React + Canvas API）

**メリット**:
- GUI で操作しやすい
- ユーザーがブラウザで直接変換可能
- プレビュー機能が実装しやすい

**デメリット**:
- 大きい動画の処理が重い
- メモリ制限がある

#### コード例

```typescript
// src/tools/VideoToStage/VideoToPanorama.ts
export class VideoToPanorama {
  async convert(
    videoFile: File,
    options: {
      interval: number
      maxHeight: number
    }
  ): Promise<HTMLCanvasElement> {
    const video = await this.loadVideo(videoFile)

    // フレーム抽出
    const frames = await this.extractFrames(video, options.interval)

    // リサイズ（必要に応じて）
    const resizedFrames = this.resizeFrames(frames, options.maxHeight)

    // 連結
    const panorama = this.stitchFrames(resizedFrames)

    return panorama
  }

  private async loadVideo(file: File): Promise<HTMLVideoElement> {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(file)

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video)
      video.onerror = reject
    })
  }

  private async extractFrames(
    video: HTMLVideoElement,
    interval: number
  ): Promise<ImageData[]> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const frames: ImageData[] = []

    for (let t = 0; t < video.duration; t += interval) {
      video.currentTime = t

      await new Promise<void>(resolve => {
        video.onseeked = () => resolve()
      })

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }

    return frames
  }

  private resizeFrames(
    frames: ImageData[],
    maxHeight: number
  ): ImageData[] {
    if (frames[0].height <= maxHeight) return frames

    const scale = maxHeight / frames[0].height
    const newWidth = Math.floor(frames[0].width * scale)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = newWidth
    canvas.height = maxHeight

    return frames.map(frame => {
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frame.width
      tempCanvas.height = frame.height
      tempCanvas.getContext('2d')!.putImageData(frame, 0, 0)

      ctx.drawImage(tempCanvas, 0, 0, newWidth, maxHeight)
      return ctx.getImageData(0, 0, newWidth, maxHeight)
    })
  }

  private stitchFrames(frames: ImageData[]): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    canvas.width = frames[0].width * frames.length
    canvas.height = frames[0].height

    frames.forEach((frame, i) => {
      ctx.putImageData(frame, i * frame.width, 0)
    })

    return canvas
  }

  downloadPNG(canvas: HTMLCanvasElement, filename: string) {
    canvas.toBlob(blob => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }
}
```

#### 使用例

```typescript
// React コンポーネント内
const converter = new VideoToPanorama()

const handleConvert = async (file: File) => {
  const panorama = await converter.convert(file, {
    interval: 1.0,
    maxHeight: 720,
  })

  converter.downloadPNG(panorama, 'background.png')
}
```

---

### 実装B: Node.js CLI版（FFmpeg + Sharp）

**メリット**:
- 高速処理
- 大きい動画も処理可能
- バッチ処理に適している

**デメリット**:
- FFmpeg のインストールが必要
- GUI がない（CLI操作）

#### コード例

```typescript
// scripts/videoToPanorama.ts
import ffmpeg from 'fluent-ffmpeg'
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'

interface Options {
  interval: number
  maxHeight: number
  outputFormat: 'png' | 'webp'
}

export async function videoToPanorama(
  videoPath: string,
  outputPath: string,
  options: Options
) {
  const tempDir = path.join(__dirname, 'temp_frames')
  await fs.mkdir(tempDir, { recursive: true })

  console.log('フレーム抽出中...')
  await extractFrames(videoPath, tempDir, options.interval)

  console.log('画像リサイズ中...')
  const frames = await loadAndResizeFrames(tempDir, options.maxHeight)

  console.log('パノラマ画像生成中...')
  await stitchFrames(frames, outputPath, options.outputFormat)

  console.log('一時ファイル削除中...')
  await fs.rm(tempDir, { recursive: true })

  console.log(`完成: ${outputPath}`)
}

async function extractFrames(
  videoPath: string,
  outputDir: string,
  interval: number
) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-vf fps=1/${interval}`])
      .output(path.join(outputDir, 'frame_%04d.png'))
      .on('end', () => resolve())
      .on('error', err => reject(err))
      .run()
  })
}

async function loadAndResizeFrames(
  frameDir: string,
  maxHeight: number
): Promise<sharp.Sharp[]> {
  const files = await fs.readdir(frameDir)
  const framePaths = files
    .filter(f => f.endsWith('.png'))
    .sort()
    .map(f => path.join(frameDir, f))

  const frames: sharp.Sharp[] = []

  for (const framePath of framePaths) {
    const image = sharp(framePath)
    const metadata = await image.metadata()

    if (metadata.height! > maxHeight) {
      frames.push(image.resize({ height: maxHeight }))
    } else {
      frames.push(image)
    }
  }

  return frames
}

async function stitchFrames(
  frames: sharp.Sharp[],
  outputPath: string,
  format: 'png' | 'webp'
) {
  // 全フレームのメタデータ取得
  const metadatas = await Promise.all(frames.map(f => f.metadata()))

  const totalWidth = metadatas.reduce((sum, m) => sum + m.width!, 0)
  const height = metadatas[0].height!

  // 横長のキャンバス作成
  const canvas = sharp({
    create: {
      width: totalWidth,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })

  // フレームを横に並べる
  const composites: sharp.OverlayOptions[] = []
  let xOffset = 0

  for (let i = 0; i < frames.length; i++) {
    const buffer = await frames[i].toBuffer()
    composites.push({
      input: buffer,
      left: xOffset,
      top: 0,
    })
    xOffset += metadatas[i].width!
  }

  // 出力
  await canvas.composite(composites).toFormat(format).toFile(outputPath)
}

// CLI実行
if (require.main === module) {
  const args = process.argv.slice(2)
  const videoPath = args[0]
  const outputPath = args[1] || 'background.png'

  videoToPanorama(videoPath, outputPath, {
    interval: 1.0,
    maxHeight: 720,
    outputFormat: 'png',
  })
}
```

#### package.json に追加

```json
{
  "scripts": {
    "video-to-panorama": "ts-node scripts/videoToPanorama.ts"
  },
  "dependencies": {
    "fluent-ffmpeg": "^2.1.2",
    "sharp": "^0.32.0"
  },
  "devDependencies": {
    "@types/fluent-ffmpeg": "^2.1.21"
  }
}
```

#### 使用例

```bash
# 基本的な使い方
npm run video-to-panorama input.mp4 output.png

# スクリプトを直接実行
ts-node scripts/videoToPanorama.ts input.mp4 background.png
```

---

## 実装方法の比較

| 項目 | ブラウザ版 | Node.js CLI版 |
|------|-----------|--------------|
| **実装難易度** | 中 | 高 |
| **処理速度** | 遅い | 速い |
| **メモリ使用量** | 多い | 少ない |
| **大きい動画** | △（制限あり） | ○ |
| **GUI** | ○ | × |
| **依存関係** | なし | FFmpeg必要 |
| **バッチ処理** | × | ○ |
| **推奨用途** | エディタツール内蔵 | 大量処理・本番環境 |

---

## 推奨実装戦略

### フェーズ1: ブラウザ版（MVP）

1週間のMVPでは**ブラウザ版**を実装。
- エディタツール内に組み込む
- ユーザーがブラウザで完結
- 小さめの動画（10〜30秒）で動作確認

### フェーズ2: Node.js CLI版（最適化）

MVP完成後、パフォーマンス向上のために**CLI版**を追加。
- 大きい動画の処理
- バッチ処理スクリプト
- GitHub Actions で自動生成

---

## パフォーマンス最適化

### ブラウザ版の最適化

1. **Web Worker で処理**
   - メインスレッドをブロックしない
   - 複数フレームを並列処理

2. **オフスクリーン Canvas**
   - `OffscreenCanvas` を使用
   - メモリ効率向上

3. **プログレスバー表示**
   - ユーザー体験向上
   - 処理状況を可視化

### CLI版の最適化

1. **FFmpeg の最適化オプション**
   ```bash
   ffmpeg -i input.mp4 -vf "fps=1" -q:v 2 frames/frame_%04d.png
   ```

2. **並列処理**
   - Sharp の並列リサイズ
   - Promise.all で複数フレーム同時処理

3. **ストリーミング処理**
   - 大きい画像はストリームで処理
   - メモリ使用量削減

---

## エラーハンドリング

### 想定されるエラー

1. **動画読み込み失敗**
   - 対策: 対応形式チェック、エラーメッセージ表示

2. **メモリ不足**
   - 対策: フレーム数制限、リサイズ推奨

3. **出力ファイル書き込み失敗**
   - 対策: 権限チェック、代替パス提示

### エラーハンドリングコード

```typescript
try {
  const panorama = await converter.convert(file, options)
  converter.downloadPNG(panorama, 'background.png')
} catch (error) {
  if (error.message.includes('memory')) {
    alert('メモリ不足です。動画を短くするか、間隔を長くしてください。')
  } else if (error.message.includes('format')) {
    alert('この動画形式は対応していません。MP4を使用してください。')
  } else {
    alert(`エラー: ${error.message}`)
  }
}
```

---

## テストケース

### テストデータ

| ケース | 動画長 | 解像度 | 間隔 | 期待出力 |
|--------|--------|--------|------|----------|
| 小規模 | 10秒 | 720p | 1秒 | 12800x720 |
| 中規模 | 30秒 | 1080p | 0.5秒 | 115200x1080 |
| 大規模 | 60秒 | 1080p | 1秒 | 115200x1080 |

### 検証項目

- [ ] フレーム抽出が正確か（指定間隔通り）
- [ ] 連結画像がずれていないか
- [ ] 色が正しく保持されているか
- [ ] ファイルサイズが妥当か

---

## ディレクトリ構成

```
src/
  tools/
    VideoToStage/
      VideoToPanorama.ts        # ブラウザ版コアロジック
      VideoToPanoramaUI.tsx     # UI コンポーネント

scripts/
  videoToPanorama.ts            # CLI版スクリプト

public/
  assets/
    stages/
      stage01/
        background.png          # 生成された背景画像
        platforms.json          # 足場データ
```

---

## 次のステップ

1. [ ] ブラウザ版 VideoToPanorama.ts を実装
2. [ ] VideoToPanoramaUI.tsx を実装（進捗表示付き）
3. [ ] VideoToStageApp.tsx に統合
4. [ ] テスト動画で動作確認
5. [ ] （オプション）CLI版を実装

---

## 参考資料

- [Canvas API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
- [Sharp - High performance Node.js image processing](https://sharp.pixelplumbing.com/)
- [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
