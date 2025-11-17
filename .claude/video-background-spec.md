# 動画背景 + 画像認識足場システム 仕様検討

## 概要

実際の道の歩道を車道側から撮影した動画を使用し、ゲームの背景として表示しながら、画像認識技術で足場（歩道の縁石など）の当たり判定を自動生成するシステム。

## 目的

- リアルな背景でゲームの没入感を高める
- 画像認識による自動的な足場検出で、様々な動画を簡単にステージ化できる
- スマホで撮影した動画をそのまま使える手軽さ

## 技術要件

### 入力

- **動画形式**: MP4（スマホ撮影）
- **想定解像度**: 1080p (1920x1080) または 720p (1280x720)
- **撮影方向**: 歩道を車道側から撮影（横スクロール視点）
- **撮影内容**: 縁石、歩道の段差など、足場として認識できる水平面

### 技術スタック

1. **動画処理**
   - HTML5 Video API（背景動画の再生）
   - Canvas API（フレーム抽出・処理）

2. **画像認識**
   - **OpenCV.js**: エッジ検出、輪郭抽出、直線検出
   - または **TensorFlow.js**: セマンティックセグメンテーション
   - **代替案**: カラーベースの簡易検出（開発初期段階）

3. **ゲームエンジン統合**
   - Phaser 3: 動画テクスチャ、物理エンジン連携
   - Arcade Physics: 生成された足場の当たり判定

## 実現手順

### フェーズ1: 動画背景の実装（基礎）

#### 1.1 動画アセットの準備
```
public/
  assets/
    videos/
      stage01.mp4  # テスト用の歩道動画
```

#### 1.2 Phaserでの動画背景表示
- Phaser の Video Game Object を使用
- 動画をループ再生
- ゲーム画面サイズに合わせてスケーリング

**実装ファイル**: `src/game/VideoBackground.ts`

```typescript
export class VideoBackground {
  private video: Phaser.GameObjects.Video

  create(scene: Phaser.Scene, key: string) {
    this.video = scene.add.video(400, 300, key)
    this.video.setDisplaySize(800, 600)
    this.video.play(true) // ループ再生
  }
}
```

#### 成果物
- [ ] 動画が背景として再生されるプロトタイプ
- [ ] 忍者が動画の前に表示される

---

### フェーズ2: 画像認識による足場検出（手動設定）

#### 2.1 足場エディタの作成
まずは画像認識の前に、手動で足場を設定できるツールを作成。

**実装内容**:
- Canvas上に動画のフレームを表示
- マウスクリックで足場のポイントを指定
- ポイントを結んで足場ポリゴンを生成
- JSON形式で足場データを出力

**実装ファイル**: `src/tools/PlatformEditor.tsx`

```json
// 出力例: platforms.json
{
  "platforms": [
    {
      "points": [
        { "x": 0, "y": 400 },
        { "x": 200, "y": 380 },
        { "x": 400, "y": 360 },
        { "x": 600, "y": 350 }
      ]
    }
  ]
}
```

#### 2.2 足場データのゲームへの適用
- JSON読み込み
- Phaser の Physics Body として足場を生成

#### 成果物
- [ ] 足場エディタツール
- [ ] 手動で設定した足場データでゲームプレイ可能

---

### フェーズ3: カラーベース簡易画像認識

#### 3.1 色ベースの足場検出
本格的な画像認識の前に、特定の色（縁石の灰色など）を検出する簡易版を実装。

**アルゴリズム**:
1. 動画の特定フレームを Canvas に描画
2. ImageData から各ピクセルの RGB 値を取得
3. 指定色範囲（例: 灰色 R:100-150, G:100-150, B:100-150）に一致するピクセルを抽出
4. 連続した水平線を検出
5. 足場として登録

**実装ファイル**: `src/game/vision/ColorDetector.ts`

```typescript
export class ColorDetector {
  detectPlatforms(imageData: ImageData, targetColor: RGB, threshold: number) {
    // 色検出ロジック
    return platforms
  }
}
```

#### 成果物
- [ ] 特定色で足場を自動検出
- [ ] 検出精度の検証

---

### フェーズ4: OpenCV.js による高度な画像認識

#### 4.1 OpenCV.js のセットアップ
```bash
npm install opencv.js
```

#### 4.2 エッジ検出・直線検出
**アルゴリズム**:
1. **グレースケール変換**: カラー動画をグレースケールに
2. **Canny エッジ検出**: 縁石などのエッジを検出
3. **Hough 変換**: 直線を検出（歩道の縁、段差）
4. **水平線のフィルタリング**: ほぼ水平な線のみを足場候補に
5. **足場ポリゴン生成**: 検出された線から足場を生成

**実装ファイル**: `src/game/vision/OpenCVDetector.ts`

```typescript
import cv from 'opencv.js'

export class OpenCVDetector {
  detectPlatforms(videoFrame: HTMLCanvasElement) {
    const src = cv.imread(videoFrame)
    const gray = new cv.Mat()
    const edges = new cv.Mat()

    // グレースケール変換
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    // Cannyエッジ検出
    cv.Canny(gray, edges, 50, 150)

    // Hough変換で直線検出
    const lines = new cv.Mat()
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 50, 50, 10)

    // 水平線をフィルタリング
    const platforms = this.filterHorizontalLines(lines)

    return platforms
  }

  private filterHorizontalLines(lines: cv.Mat) {
    // 角度が±10度以内の直線のみ抽出
    // ...
  }
}
```

#### 4.3 リアルタイム処理の最適化
- Worker スレッドで画像処理を実行
- 数フレームごとに処理（60FPSすべては処理しない）
- キャッシュ機構

#### 成果物
- [ ] OpenCV.js で縁石・段差を自動検出
- [ ] リアルタイム処理が60FPS維持できる

---

### フェーズ5: TensorFlow.js（オプション・高度）

セマンティックセグメンテーションで「歩道」「車道」「縁石」を識別。

**使用モデル**: DeepLab v3（事前学習済みモデル）

```typescript
import * as tf from '@tensorflow/tfjs'
import * as deeplab from '@tensorflow-models/deeplab'

const model = await deeplab.load()
const segmentation = await model.segment(imageData)
// 歩道領域の上端を足場として使用
```

#### 成果物
- [ ] AI による高精度な足場検出

---

### フェーズ6: ゲームプレイ統合

#### 6.1 動的足場生成
- 動画の再生位置に応じて足場を動的に生成/削除
- スクロール対応

#### 6.2 複数ステージ対応
- 異なる動画を複数用意
- ステージ選択UI

#### 6.3 パフォーマンス最適化
- 足場のプリレンダリング
- 物理演算の最適化

#### 成果物
- [ ] 動画背景＋自動足場でプレイ可能
- [ ] 複数ステージ実装

---

## 実装の優先順位

### 推奨実装順序

1. **フェーズ1（必須）**: 動画背景表示 ⭐⭐⭐
2. **フェーズ2（必須）**: 手動足場エディタ ⭐⭐⭐
3. **フェーズ3（推奨）**: カラーベース簡易検出 ⭐⭐
4. **フェーズ4（推奨）**: OpenCV.js 高度な検出 ⭐⭐
5. **フェーズ5（オプション）**: TensorFlow.js AI検出 ⭐
6. **フェーズ6（必須）**: ゲーム統合 ⭐⭐⭐

### 最小実装（MVP）

**目標**: 1週間で動くプロトタイプ

1. 動画背景表示（1日）
2. 手動足場エディタ（2日）
3. 足場データでゲームプレイ（1日）
4. カラーベース簡易検出（2日）
5. 統合テスト（1日）

---

## 技術的課題と対策

### 課題1: パフォーマンス
- **問題**: 動画再生 + 画像認識でFPS低下
- **対策**:
  - Worker スレッド活用
  - 画像認識は数フレームおきに実行
  - 足場データのキャッシュ

### 課題2: 検出精度
- **問題**: 照明条件や撮影角度で検出精度が変わる
- **対策**:
  - 撮影ガイドラインの作成（晴天時、一定角度）
  - 複数アルゴリズムの併用
  - ユーザーによる微調整機能

### 課題3: ブラウザ互換性
- **問題**: OpenCV.js のサイズが大きい（~8MB）
- **対策**:
  - 遅延ロード
  - WASM 版の使用
  - 軽量版の検討

### 課題4: 動画サイズ
- **問題**: MP4ファイルが大きくなる
- **対策**:
  - FFmpeg で圧縮（H.264, CRF=23）
  - 解像度を720pに制限
  - ストリーミング対応

---

## 開発環境セットアップ

### 必要なパッケージ

```json
{
  "dependencies": {
    "phaser": "^3.87.0",
    "opencv.js": "^4.9.0"  // フェーズ4以降
  },
  "devDependencies": {
    "@tensorflow/tfjs": "^4.x",  // フェーズ5（オプション）
    "@tensorflow-models/deeplab": "^1.x"
  }
}
```

### 動画サンプル準備

```bash
# FFmpegで動画を最適化
ffmpeg -i raw_video.mp4 \
  -vf "scale=1280:720" \
  -c:v libx264 \
  -crf 23 \
  -preset medium \
  -an \
  public/assets/videos/stage01.mp4
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
