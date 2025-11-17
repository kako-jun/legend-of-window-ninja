# TODO - Legend of Window Ninja

## 🎯 MVP（1週間）タスクリスト

### Phase 1: フレーム抽出・連結ツール（1日）⏳

#### 準備
- [ ] `src/tools/VideoToStage/` ディレクトリ作成
- [ ] `src/types/` ディレクトリ作成
- [ ] 型定義ファイル作成

#### 型定義（30分）
- [ ] `src/types/Platform.ts` 作成
  ```typescript
  export interface Point {
    x: number
    y: number
  }

  export interface Platform {
    id: string
    points: Point[]
    type: 'static' | 'moving'
  }

  export interface StageData {
    backgroundImage: string
    width: number
    height: number
    platforms: Platform[]
  }
  ```

#### FrameStitcher.ts（1時間）
- [ ] `src/tools/VideoToStage/FrameStitcher.ts` 作成
- [ ] `stitchFrames()` メソッド実装
  - [ ] Canvas作成ロジック
  - [ ] フレーム連結ロジック
- [ ] `downloadAsPNG()` メソッド実装
  - [ ] Blob生成
  - [ ] ダウンロード処理
- [ ] エラーハンドリング追加

#### FrameExtractor.tsx（2時間）
- [ ] `src/tools/VideoToStage/FrameExtractor.tsx` 作成
- [ ] UI実装
  - [ ] 動画アップロード input
  - [ ] video要素（プレビュー）
  - [ ] 間隔設定 input
  - [ ] 抽出ボタン
  - [ ] 進捗表示
- [ ] `extractFrames()` 実装
  - [ ] video.currentTime ループ
  - [ ] Canvas描画
  - [ ] ImageData取得
- [ ] Props定義（onFramesExtracted）

#### VideoToStageApp.tsx（2時間）
- [ ] `src/tools/VideoToStage/VideoToStageApp.tsx` 作成
- [ ] ステート管理
  - [ ] step（1: 抽出, 2: プレビュー, 3: エディタ）
  - [ ] frames
  - [ ] stitchedCanvas
- [ ] Step 1: FrameExtractor
- [ ] Step 2: プレビュー画面
  - [ ] Canvas表示
  - [ ] サイズ表示
  - [ ] ダウンロードボタン
- [ ] フロー制御ロジック

#### App.tsx統合（30分）
- [ ] `src/App.tsx` 修正
- [ ] mode ステート追加（'game' | 'editor'）
- [ ] モード切り替えボタン
- [ ] VideoToStageApp インポート・表示

#### テスト（1時間）
- [ ] テスト用動画準備（10秒程度）
- [ ] フレーム抽出テスト（1秒間隔）
- [ ] 連結画像のダウンロードテスト
- [ ] 画像サイズ確認
- [ ] エッジケーステスト
  - [ ] 短い動画（3秒）
  - [ ] 長い動画（60秒）
  - [ ] 様々な間隔（0.5秒、2秒）

---

### Phase 2: 手動足場エディタ（2日）⏳

#### PlatformEditor.tsx（4時間）
- [ ] `src/tools/VideoToStage/PlatformEditor.tsx` 作成
- [ ] ステート管理
  - [ ] backgroundImage
  - [ ] platforms
  - [ ] currentPoints（編集中）
  - [ ] zoom（拡大率）
  - [ ] scrollPosition
- [ ] UI実装
  - [ ] 画像アップロード
  - [ ] Canvas（背景表示）
  - [ ] ツールバー
    - [ ] Finalize Platform ボタン
    - [ ] Clear Current ボタン
    - [ ] Undo ボタン
    - [ ] Export JSON ボタン
  - [ ] 足場リスト表示
- [ ] Canvas描画ロジック
  - [ ] 背景画像描画
  - [ ] 既存足場描画（緑）
  - [ ] 編集中ポイント描画（赤）
  - [ ] 編集中ライン描画（黄）
- [ ] クリックハンドラ
  - [ ] ポイント追加
  - [ ] 座標計算（Canvas座標変換）
- [ ] 足場確定ロジック
- [ ] JSON出力ロジック

#### スクロール・ズーム機能（2時間）
- [ ] 横スクロール実装
  - [ ] マウスドラッグでスクロール
  - [ ] スクロールバー
- [ ] ズーム機能実装
  - [ ] マウスホイールでズーム
  - [ ] ズームボタン（+ / -）
  - [ ] 倍率表示

#### 足場編集機能（2時間）
- [ ] 足場選択機能
  - [ ] クリックで選択
  - [ ] 選択状態の表示（ハイライト）
- [ ] 足場削除機能
- [ ] 足場編集機能
  - [ ] ポイント移動
  - [ ] ポイント追加・削除
- [ ] Undo/Redo機能

#### VideoToStageApp統合（1時間）
- [ ] Step 3 を追加
- [ ] 背景画像を PlatformEditor に渡す
- [ ] platforms データ受け取り
- [ ] 最終出力（ZIP）
  - [ ] background.png
  - [ ] platforms.json

#### テスト（1時間）
- [ ] 足場手動設定テスト
- [ ] JSON出力テスト
- [ ] データ形式確認
- [ ] 大きい画像でのパフォーマンステスト

---

### Phase 3: カラーベース自動検出（1日）⏳

#### ColorDetector.ts（2時間）
- [ ] `src/tools/VideoToStage/vision/ColorDetector.ts` 作成
- [ ] `detectPlatforms()` 実装
  - [ ] ImageData取得
  - [ ] ピクセルスキャン
  - [ ] 色マッチング
  - [ ] 水平線検出
  - [ ] Platform配列生成
- [ ] パラメータ調整機能
  - [ ] targetColor
  - [ ] threshold
  - [ ] minLineLength

#### PlatformEditor統合（2時間）
- [ ] 自動検出UI追加
  - [ ] 検出方法選択（カラー/OpenCV/TensorFlow）
  - [ ] カラーピッカー
  - [ ] threshold スライダー
  - [ ] 自動検出ボタン
- [ ] ColorDetector呼び出し
- [ ] 検出結果をプレビュー
- [ ] 手動調整可能に

#### 検出精度改善（2時間）
- [ ] ノイズ除去
- [ ] 線の結合（隣接する線をマージ）
- [ ] 最小長さフィルタ
- [ ] パラメータプリセット作成
  - [ ] 縁石（グレー）
  - [ ] アスファルト（黒）
  - [ ] 歩道（ベージュ）

#### テスト（2時間）
- [ ] 様々な動画で検出テスト
  - [ ] 晴天時
  - [ ] 曇天時
  - [ ] 夕方
- [ ] 検出精度評価
- [ ] パラメータ最適化

---

### Phase 6: ゲーム側実装（2日）⏳

#### StageLoader.ts（2時間）
- [ ] `src/game/stage/StageLoader.ts` 作成
- [ ] `load()` メソッド実装
  - [ ] platforms.json読み込み
  - [ ] 背景画像パス取得
  - [ ] StageData型で返す
- [ ] エラーハンドリング
  - [ ] ファイルが見つからない
  - [ ] JSON解析エラー

#### MainScene修正（4時間）
- [ ] `src/game/MainScene.ts` 修正
- [ ] preload() 修正
  - [ ] 背景画像読み込み
  - [ ] platforms.json読み込み
- [ ] create() 修正
  - [ ] StageLoader使用
  - [ ] 背景表示（TileSprite）
  - [ ] createPlatforms() 呼び出し
  - [ ] カメラ設定
    - [ ] ワールド境界
    - [ ] 忍者追従
- [ ] update() 修正
  - [ ] 背景スクロール
- [ ] createPlatforms() 実装
  - [ ] Platform配列を受け取る
  - [ ] StaticGroup作成
  - [ ] 各Platformをスプライト化
  - [ ] 衝突判定設定

#### 忍者の挙動調整（2時間）
- [ ] 常時走行実装
  - [ ] 自動的に右に移動
  - [ ] 速度調整
- [ ] ジャンプ調整
- [ ] 手裏剣発射調整
- [ ] カメラ追従調整

#### テスト用ステージ作成（2時間）
- [ ] `public/assets/stages/stage01/` 作成
- [ ] テスト用背景画像配置
- [ ] テスト用platforms.json配置
- [ ] ロード確認
- [ ] プレイテスト

#### デバッグ・調整（2時間）
- [ ] 足場の当たり判定確認
- [ ] 背景スクロール確認
- [ ] パフォーマンス確認
- [ ] バグ修正

---

### 統合テスト（1日）⏳

#### エンドツーエンドテスト（4時間）
- [ ] 動画撮影（実際にスマホで）
- [ ] フレーム抽出・連結
- [ ] 足場設定（手動 + 自動）
- [ ] ステージデータ出力
- [ ] ゲームで読み込み
- [ ] プレイテスト

#### バグ修正（2時間）
- [ ] 見つかったバグの修正
- [ ] エッジケース対応
- [ ] エラーハンドリング改善

#### ドキュメント更新（1時間）
- [ ] README.md 更新
  - [ ] 使い方セクション追加
  - [ ] スクリーンショット追加
- [ ] CLAUDE.md 更新
  - [ ] ステータス更新
  - [ ] 完了タスク記録

#### 最終調整（1時間）
- [ ] UI/UX改善
- [ ] パフォーマンスチューニング
- [ ] コードクリーンアップ

---

## 🔮 将来の拡張（優先度低）

### Phase 4: OpenCV.js（3日）
- [ ] OpenCV.js インストール
- [ ] `OpenCVDetector.ts` 作成
- [ ] Cannyエッジ検出実装
- [ ] Hough変換実装
- [ ] 水平線フィルタリング
- [ ] PlatformEditor統合
- [ ] 精度評価

### Phase 5: TensorFlow.js（5日）
- [ ] TensorFlow.js インストール
- [ ] DeepLabモデル読み込み
- [ ] セグメンテーション実装
- [ ] 歩道領域抽出
- [ ] 上端検出
- [ ] Platform生成
- [ ] PlatformEditor統合

### 追加機能
- [ ] 複数ステージ管理UI
- [ ] ステージ選択画面
- [ ] スコアランキング
- [ ] ローカルストレージ保存
- [ ] スキンシステム
- [ ] サウンドエフェクト
- [ ] BGM
- [ ] モバイル最適化

---

## 📊 進捗トラッキング

### 全体進捗: 10%

| Phase | 進捗 | 状態 |
|-------|------|------|
| Phase 1 | 0% | ⏳ 未着手 |
| Phase 2 | 0% | ⏳ 未着手 |
| Phase 3 | 0% | ⏳ 未着手 |
| Phase 6 | 0% | ⏳ 未着手 |
| 統合テスト | 0% | ⏳ 未着手 |

### 今日の目標
- [ ] TODO.md 作成完了
- [ ] Phase 1 開始準備

### 今週の目標
- [ ] MVP完成
- [ ] 実際にプレイ可能な状態

---

## 🐛 既知の問題

なし（まだ実装していないため）

---

## 💡 アイデアメモ

- フレーム抽出時に進捗バーを表示したい
- 足場エディタでグリッド表示があると便利かも
- 検出結果の信頼度を表示できると良い
- プリセットパラメータをローカルストレージに保存

---

**最終更新**: 2025-11-17
**次回レビュー**: Phase 1 完了時
