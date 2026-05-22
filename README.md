# Legend of Window Ninja

ブラウザベースの忍者アクションゲーム。手裏剣を投げて敵を倒せ。

影の伝説（NES, 1985）の実機計測値に基づく物理挙動を再現することを目指している。

## 操作方法

### PC

- ← →: 移動
- ↑ / Space / W: ジャンプ（長押しで高ジャンプ ~125px、短押しで小ジャンプ ~30px）
- Z / X / Enter: 手裏剣（向いている方向へ）
- Esc: タイトルに戻る

### スマホ・タブレット

- 画面左半分長押し: 左移動
- 画面右半分長押し: 右移動
- 両半分同時タッチ もしくは 上向きスワイプ: ジャンプ
- 短タップ（200ms 以内）: 手裏剣

バーチャルパッド（丸い十字キー UI）は使わない。

## セットアップ

```bash
git clone https://github.com/kako-jun/legend-of-window-ninja.git
cd legend-of-window-ninja
npm install
npm run dev
```

http://localhost:3000/legend-of-window-ninja/ で開く。

## 技術スタック

- TypeScript 5
- Vite 6
- PixiJS v8
- Vitest 4（ユニットテスト）

## 表示サイズ

論理解像度は 800×600。canvas は CSS で拡大せず、`src/main.ts` の `renderer.resize()` と `stage.scale` で viewport に収まる実 canvas サイズへ合わせる。

## スクリプト

| コマンド            | 用途                                     |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | 開発サーバー                             |
| `npm run build`     | プロダクションビルド（tsc + vite build） |
| `npm run preview`   | ビルドプレビュー                         |
| `npm run test`      | vitest 一括実行                          |
| `npm run typecheck` | tsc --noEmit                             |
| `npm run lint`      | ESLint                                   |
| `npm run format`    | Prettier                                 |

## ライセンス

MIT
