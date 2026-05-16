# Legend of Window Ninja 開発者向けドキュメント

ブラウザベースの忍者アクションゲーム。**PixiJS v8 + Vite + TypeScript**（React は使わない）。
影の伝説（NES、1985）の実機計測に基づいた物理挙動を再現することを目指す。

## プロジェクト構造

```
legend-of-window-ninja/
├── index.html              # #game ホスト + #loading
├── src/
│   ├── main.ts             # PixiJS Application 起動
│   ├── vite-env.d.ts
│   └── game/
│       ├── App.ts          # SceneManager (Title ↔ Game ↔ GameOver)
│       ├── Scene.ts        # Container 基底 + exit ハンドラ
│       ├── types.ts        # GameState / PlayerState / initWithState
│       ├── constants.ts    # 影の伝説物理定数・ステージ寸法
│       ├── input.ts        # キーボード + タッチ入力
│       ├── physics.ts      # 影の伝説物理
│       ├── collision.ts    # 自前 AABB (X→Y 分離解決)
│       ├── terrain.ts      # プラットフォーム矩形配置
│       ├── shuriken.ts     # 手裏剣 (オブジェクトプール)
│       ├── enemy.ts        # 敵スポーン + 挙動
│       └── scenes/
│           ├── TitleScene.ts
│           ├── GameScene.ts
│           └── GameOverScene.ts
└── package.json
```

## 技術スタック

| パッケージ | 用途             |
| ---------- | ---------------- |
| pixi.js    | 2D 描画 (WebGPU) |
| vite       | バンドル         |
| vitest     | テスト           |
| typescript | 型安全           |

## 影の伝説 物理ルール（Issue #5）

`src/game/constants.ts` に明文化:

- **走行 max 120 px/sec**（ダッシュ無し、影の伝説は固定速）
- **加速**: 1200 px/sec²（実機の瞬時加速を 100ms かけて到達する形に丸めて急発進感を避けている）
- **ジャンプ初速**: -360 px/sec、HELD 重力 480 / RELEASED 重力 1700 / 下降重力 720（= HELD × 1.5）
- **ジャンプ高度**: 短押し ~30px、20F+ 長押し ~125px（実機計測値）
- **頂点滞空**: 上昇 RELEASED と下降 GRAVITY の境目で速度が小さい時間が伸び、自然と頂点停滞が発生
- **下降は上昇の 1.5 倍重力**（重力非対称、影の伝説仕様）
- **空中制御なし**（離陸時 velocity.x で固定、空中の left/right は無視）
- **走り中に上ボタンのみ = 横入力していなければ垂直ジャンプ扱い**

マリオ3の skidAccel / dashAccel / airControl 概念は使わない。

## 操作

**PC**

- ← →: 移動
- ↑ / Space / W: ジャンプ（長押しで高ジャンプ）
- Z / X / Enter: 手裏剣（向いている方向）
- Esc: タイトルに戻る（GameScene）

**タッチ**

- 画面左半分長押し: 左移動
- 画面右半分長押し: 右移動
- 両半分同時タッチ または 上向きスワイプ (y -30px): ジャンプ
- 短タップ (200ms 以内): 手裏剣

バーチャルパッド（丸い十字キー UI）は禁止（Issue #9）。

## シーン構成（Issue #10）

`App.ts` の SceneManager が `Container` を差し替える。

- TitleScene: タイトル + 「Start (Space / Tap)」
- GameScene: 本編。プレイヤー / 敵 / 手裏剣 / 衝突
- GameOverScene: スコア + 「Restart (Space / Tap)」

## ビルド

```bash
npm run dev          # 開発サーバー
npm run build        # プロダクションビルド (tsc + vite build)
npm run preview      # ビルドプレビュー
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # vitest run
npm run format       # Prettier
```

## CI/CD

- Husky + lint-staged: pre-commit hooks
- GitHub Actions: GitHub Pages デプロイ（base: `/legend-of-window-ninja/`）

## 拡張予定

- 敵の種類追加
- ステージ追加
- サウンドエフェクト
