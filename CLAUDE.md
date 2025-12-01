# Legend of Window Ninja 開発者向けドキュメント

ブラウザベースの忍者アクションゲーム。Phaser 3 + React + TypeScript。

## プロジェクト構造

```
legend-of-window-ninja/
├── src/
│   ├── main.tsx           # エントリーポイント
│   ├── App.tsx            # Reactアプリ
│   ├── components/
│   │   └── PhaserGame.tsx # Phaser統合コンポーネント
│   └── game/
│       ├── config.ts      # Phaser設定
│       ├── scenes/        # ゲームシーン
│       └── objects/       # ゲームオブジェクト
├── public/
│   └── assets/            # ゲームアセット
└── package.json
```

## 技術スタック

| パッケージ  | 用途           |
| ----------- | -------------- |
| react       | UI             |
| phaser      | ゲームエンジン |
| vite        | ビルドツール   |
| typescript  | 型安全         |
| tailwindcss | スタイリング   |

## ゲーム設計

### 操作

**PC**:

- 矢印キー: 忍者を移動
- スペースキー: 手裏剣を投げる

**モバイル**:

- タップで移動と攻撃

### Phaser統合

ReactコンポーネントでPhaserゲームをラップ:

```typescript
// PhaserGame.tsx
useEffect(() => {
  const game = new Phaser.Game(config)
  return () => game.destroy(true)
}, [])
```

## ビルド

```bash
npm run dev          # 開発サーバー
npm run build        # プロダクションビルド
npm run preview      # ビルドプレビュー
npm run lint         # ESLint
npm run format       # Prettier
```

## CI/CD

- Husky + lint-staged: pre-commit hooks
- GitHub Actions: デプロイ

## 拡張予定

- ステージ追加
- 敵キャラクターのバリエーション
- スコアシステム
- サウンドエフェクト
