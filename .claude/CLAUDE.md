# Legend of Window Ninja - プロジェクト管理ドキュメント

## プロジェクト概要

**タイトル**: Legend of Window Ninja（ウィンドウ忍者伝説）

**コンセプト**:
車窓・電車窓から撮影した動画を画像認識でゲームステージに変換する、前例のない横スクロールアクションゲーム。「影の伝説」の操作感をベースに、無限に新しいステージを生成できる。

**技術スタック**:
- フロントエンド: React 18 + TypeScript 5 + Vite 6
- ゲームエンジン: Phaser 3
- 画像認識: Canvas API / OpenCV.js / TensorFlow.js (オプション)
- スタイリング: Tailwind CSS 4

---

## 📂 ドキュメント構成

### 設計ドキュメント

| ファイル | 内容 | 状態 |
|---------|------|------|
| `game-concept.md` | ゲーム全体のコンセプト、元ネタ、将来構想 | ✅ 完成 |
| `video-background-spec.md` | 技術仕様（事前処理ワークフロー） | ✅ 完成 |
| `implementation-plan.md` | 7日間の実装ロードマップ | 🔄 Phase 1 詳細化済み |
| `video-to-panorama-script.md` | 動画→横長画像変換スクリプト設計 | ✅ 完成 |
| `platform-detection-script.md` | 横長画像→足場検出スクリプト設計 | ✅ 完成 |
| `TODO.md` | タスク管理（次回作成予定） | ⏳ 未作成 |

---

## 🎯 開発ステータス

### 現在のフェーズ: **仕様策定完了**

✅ **完了したタスク**:
- [x] ゲームコンセプトの策定
- [x] 事前処理ワークフローの設計
- [x] 動画→パノラマ変換スクリプトの設計
- [x] 足場検出スクリプトの設計
- [x] 実装計画（Phase 1 詳細化）

⏳ **次のステップ**:
- [ ] Phase 1: フレーム抽出・連結ツールの実装
- [ ] Phase 2: 手動足場エディタの実装
- [ ] Phase 3: カラーベース足場検出の実装
- [ ] Phase 6: ゲーム側実装（静止画背景）

---

## 🔄 ワークフロー全体像

```
【事前処理ツール（開発予定）】
1. 動画アップロード (MP4)
   ↓
2. フレーム抽出 (Canvas API)
   - 間隔指定可能 (0.5秒、1秒、2秒)
   ↓
3. フレーム連結 (Canvas API)
   - 横長パノラマ画像生成
   ↓
4. 足場検出
   - 手動エディタ（必須）
   - カラーベース自動検出（推奨）
   - OpenCV.js 高精度検出（推奨）
   ↓
5. ステージデータ出力
   - background.png
   - platforms.json
   ↓
【ゲーム（開発予定）】
6. ステージデータ読み込み
   ↓
7. プレイ
```

---

## 📋 実装優先順位

### MVP（1週間）

| Phase | タスク | 期間 | 優先度 | 状態 |
|-------|--------|------|--------|------|
| 1 | フレーム抽出・連結ツール | 1日 | ⭐⭐⭐ | ⏳ 未着手 |
| 2 | 手動足場エディタ | 2日 | ⭐⭐⭐ | ⏳ 未着手 |
| 6 | ゲーム側実装（静止画背景） | 2日 | ⭐⭐⭐ | ⏳ 未着手 |
| 3 | カラーベース自動検出 | 1日 | ⭐⭐ | ⏳ 未着手 |
| - | 統合テスト | 1日 | ⭐⭐⭐ | ⏳ 未着手 |

### 将来の拡張

| Phase | タスク | 優先度 | 状態 |
|-------|--------|--------|------|
| 4 | OpenCV.js 高精度検出 | ⭐⭐ | ⏳ 未着手 |
| 5 | TensorFlow.js AI検出 | ⭐ | ⏳ 未着手 |
| - | 複数ステージ管理 | ⭐⭐ | ⏳ 未着手 |
| - | スコアシステム | ⭐ | ⏳ 未着手 |
| - | ステージ共有機能 | ⭐ | ⏳ 未着手 |

---

## 🏗️ アーキテクチャ概要

### ディレクトリ構成（予定）

```
legend-of-window-ninja/
├── public/
│   └── assets/
│       └── stages/
│           └── stage01/
│               ├── background.png    # 横長背景画像
│               └── platforms.json    # 足場データ
├── src/
│   ├── game/
│   │   ├── MainScene.ts             # メインゲームシーン
│   │   ├── stage/
│   │   │   └── StageLoader.ts       # ステージデータ読み込み
│   │   └── config.ts
│   ├── tools/
│   │   └── VideoToStage/
│   │       ├── VideoToStageApp.tsx  # メインアプリ
│   │       ├── FrameExtractor.tsx   # フレーム抽出UI
│   │       ├── FrameStitcher.ts     # フレーム連結
│   │       ├── PlatformEditor.tsx   # 足場エディタ
│   │       └── vision/
│   │           ├── ColorDetector.ts      # カラーベース検出
│   │           ├── OpenCVDetector.ts     # OpenCV検出
│   │           └── TensorFlowDetector.ts # TensorFlow検出
│   ├── types/
│   │   └── Platform.ts              # 足場データ型定義
│   ├── components/
│   │   └── PhaserGame.tsx
│   ├── App.tsx
│   └── main.tsx
└── .claude/
    ├── CLAUDE.md                    # このファイル
    ├── TODO.md                      # タスク管理
    ├── game-concept.md              # ゲームコンセプト
    ├── video-background-spec.md     # 技術仕様
    ├── implementation-plan.md       # 実装計画
    ├── video-to-panorama-script.md  # 動画変換設計
    └── platform-detection-script.md # 足場検出設計
```

---

## 🎮 ゲーム仕様（現在）

### プレイヤー
- 紫色の三角形（忍者）
- 移動速度: 250 px/s
- ジャンプ速度: -400 px/s

### 操作方法
- **PC**: ←→ 移動、↑ ジャンプ、スペース 手裏剣
- **スマホ**: タップ 手裏剣、ドラッグ 移動

### 敵
- 落下型（赤い円）: 画面上部から落下
- 歩行型（オレンジの四角）: 左右から歩いてくる
- スポーン: 2秒ごと

### スコア
- 敵撃破: +10点

---

## 🔧 技術的な決定事項

### 事前処理方式の採用（重要）

**決定**: 動画をリアルタイム再生ではなく、事前処理で静止画背景とステージデータに変換

**理由**:
1. パフォーマンス: ゲーム実行時は軽量（静止画 + JSON のみ）
2. 画像認識: 処理時間を気にせず高度なアルゴリズムが使える
3. 共有: ステージデータを簡単に配布・共有可能
4. 拡張性: ステージエディタを独立して開発できる

### 画像認識アプローチ

| 方法 | 精度 | 速度 | 依存 | 用途 |
|------|------|------|------|------|
| カラーベース | 低（60%） | 速い | なし | プロトタイプ・簡易検出 |
| OpenCV.js | 中（80%） | 中 | ~8MB | 推奨・本番利用 |
| TensorFlow.js | 高（90%+） | 遅い | ~20MB | 高精度が必要な場合 |

**MVP**: カラーベース + 手動調整
**本番**: OpenCV.js推奨

---

## 📊 パフォーマンス目標

### エディタツール（事前処理）
- フレーム抽出: 30秒の動画を10秒以内
- フレーム連結: 5秒以内
- 足場検出（カラー）: 3秒以内
- 足場検出（OpenCV）: 10秒以内

### ゲーム本体
- FPS: 60 FPS維持（デスクトップ）
- FPS: 30 FPS以上（モバイル）
- 初回ロード: 3秒以内

---

## 🚀 次回セッションでやること

### 最優先タスク

1. **TODO.md の作成**
   - Phase 1-6 の詳細タスク分解
   - 各タスクの見積もり時間
   - 依存関係の整理

2. **Phase 1 実装開始**
   - `src/tools/VideoToStage/` ディレクトリ作成
   - `FrameExtractor.tsx` の実装
   - `FrameStitcher.ts` の実装
   - `VideoToStageApp.tsx` の実装

3. **型定義の作成**
   - `src/types/Platform.ts`
   - `src/types/StageData.ts`

---

## 📝 メモ・アイデア

### 撮影ガイドライン（将来作成）
- 横向きに撮影（縦動画NG）
- 晴天時推奨（コントラストがはっきり）
- 縁石や段差が見えるように
- 手ブレ最小限（車載ホルダー推奨）
- 10〜30秒程度

### 将来の拡張アイデア
- [ ] ステージ共有プラットフォーム
- [ ] AI による敵キャラ自動配置
- [ ] リアルタイム撮影モード（ARっぽい）
- [ ] ストーリーモード
- [ ] マルチプレイヤー対戦
- [ ] スキン・アビリティシステム

---

## 🔗 参考リンク

### 技術ドキュメント
- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [OpenCV.js Tutorials](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [TensorFlow.js Models](https://github.com/tensorflow/tfjs-models)

### 元ネタ
- [影の伝説 - Wikipedia](https://ja.wikipedia.org/wiki/%E5%BD%B1%E3%81%AE%E4%BC%9D%E8%AA%AC)

---

## 📅 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-11-17 | プロジェクト初期化、仕様策定完了 |
| 2025-11-17 | 事前処理ワークフローの設計完了 |
| 2025-11-17 | 動画変換・足場検出スクリプト設計完了 |
| 2025-11-17 | CLAUDE.md 作成 |

---

## 🎓 学習メモ

### 画像処理
- Canvas API の `getImageData()` は同期処理だが重い
- `OffscreenCanvas` を使えば Web Worker で処理可能
- PNG は可逆圧縮、WebP はさらに小さくできる

### Phaser 3
- `TileSprite` は背景スクロールに最適
- `StaticGroup` は動かない物理オブジェクトに使う
- カメラの `startFollow()` でプレイヤー追従

### TypeScript
- `ImageData` は Canvas API の型
- `HTMLImageElement` と `HTMLVideoElement` は別の型

---

**最終更新**: 2025-11-17
**ステータス**: 仕様策定完了、実装準備中
**次のマイルストーン**: Phase 1 実装完了（動画→パノラマ変換ツール）
