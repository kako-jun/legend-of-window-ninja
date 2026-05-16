// 影の伝説 (NES, 1985) 実機計測値を 60fps 基準で px/sec / px/sec² に換算した物理パラメータ。
//
// 換算ルール:
//   - 1 px/F (at 60fps) = 60 px/sec
//   - 1 px/F² (at 60fps) = 3600 px/sec²
//
// 実機計測サマリ (freeza/tools/nes-analysis/dumps/kage/SUMMARY.txt 由来):
//   - 走行 max: 2 px/F = 120 px/sec (ダッシュなし、固定)
//   - 加速: 実機は 1F で max 到達 (瞬時加速)
//   - ジャンプ短押し (~5F): 高さ 34〜38px / 滞空 50〜54F
//   - ジャンプ長押し (20F+): 高さ ~125px
//   - 頂点で 12〜13F 停滞 (マリオ3 の 4 倍) → 「宙浮き感」
//   - 下降速度は上昇速度の 1.5 倍 (重力非対称)
//   - 空中制御なし (airControl = 0)、離陸方向で軌跡確定
//   - 走り中に上ボタンのみ = 垂直ジャンプ (横入力していなければ vx=0)
//
// マリオ3 物理 (endroll-jumpers) の skidAccel / dashAccel / airControl 概念は使わない。

export const STAGE_WIDTH = 800
export const STAGE_HEIGHT = 600

// --- ジャンプ重力分岐 ---
// 上昇中の HELD と RELEASED で高度差を作り、頂点停滞は自然発生させる。
//
// 初速 -210 px/sec (= -3.5 px/F)、HELD 重力 320 px/sec² で
//   到達時間 ~0.66s、高さ ≒ 210² / (2·320) ≒ 68.9px → さらに頂点停滞で実機の感触に寄る
// HELD のままだと頂点が高くなりすぎるので、20F (333ms) 時点で RELEASED に切替えると
//   その後の上昇分は無視できるレベルになり、結果的に最大高度 ~125px に収まる。
// RELEASED 重力 1700 px/sec² は短押し (5F) ジャンプで 36px に収まるよう調整。
//
// 下降重力は上昇の 1.5 倍ルール: GRAVITY = ASCENT_GRAVITY_HELD * 1.5 = 480
// (下降は HELD 基準で 1.5 倍。RELEASED と比較しても下降が一番遅いので
//  結果として下降は上昇開始よりやや遅い → 頂点停滞 + ふわふわ感が出る)
export const ASCENT_GRAVITY_HELD = 320
export const ASCENT_GRAVITY_RELEASED = 1700
export const GRAVITY = 480

export const PLAYER = {
  width: 30,
  height: 30,
  color: 0x9370db, // 紫 (旧 Phaser 版を踏襲)
  spawnX: 100,
  spawnY: 520,

  // 横移動: ダッシュなし、固定 120 px/sec
  walkMaxSpeed: 120,
  // 加速度は実機 1F で max 到達。コードでは即時 max にする実装と
  // 1200 px/sec² で 100ms かけて到達する実装が選べる。後者を採用 (急発進感を避ける)。
  walkAccel: 1200,

  // 地上摩擦: 入力解除で素早く減速 (1F 60fps あたりの減衰率)
  groundFriction: 0.7,
  // 空中摩擦: 1.0 = 慣性維持 (= 空中制御なしルールの一部)
  airFriction: 1.0,

  // ジャンプ初速 (実測 ~3.5 px/F = -210 px/sec)
  jumpInitialVelocity: -210,
  // A 押下を hold とみなす最大時間 (20F = 333ms at 60fps)
  // これを超えると RELEASED 扱いになり、以後の上昇は急減速
  maxJumpHoldMs: 333,

  // 最大落下速度: 上昇 max ~210 の 1.5 倍 = 315、安全マージンで 400
  maxFallSpeed: 400,
} as const

// 手裏剣 (Issue #7)
export const SHURIKEN = {
  width: 16,
  height: 16,
  color: 0xc0c0c0,
  speed: 500, // px/sec
  fireRateMs: 300, // 連射制限
  poolSize: 20, // オブジェクトプール最大
  rotationPerFrame: 0.3, // 毎フレーム rotation += 0.3 (60fps 基準)
} as const

// 敵 (Issue #8)
export const ENEMY = {
  width: 30,
  height: 30,
  walkerColor: 0xff4500,
  fallerColor: 0xff0000,
  walkerSpeed: 60, // px/sec、プラットフォーム上を歩く
  fallerSpeedMin: 100, // px/sec
  fallerSpeedMax: 200,
  spawnIntervalMs: 2000,
  scoreOnKill: 10,
} as const

// タッチ入力 (Issue #9)
export const TOUCH = {
  // 短タップ判定 (ms 以内 + 移動量がしきい値未満)
  tapMaxMs: 200,
  tapMaxMoveDist: 10,
  // 上スワイプ判定 (y がしきい値以上に上がったらジャンプ)
  swipeUpThresholdPx: 30,
} as const
