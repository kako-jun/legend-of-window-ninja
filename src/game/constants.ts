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
// 設計目標 (実機計測値):
//   - 1F 短押し: 高さ ~22-38px、20F+ 長押し: 高さ ~125px
//   - 下降は上昇の 1.5 倍重力 (影の伝説仕様)
//
// 採用値:
//   - 初速 -360 px/sec (= -6 px/F)
//   - HELD 重力 480 px/sec² (押下中の上昇)
//   - RELEASED 重力 1700 px/sec² (離した瞬間の急減速で短押し低空ジャンプを成立)
//   - 下降重力 720 px/sec² (= HELD * 1.5、影の伝説の「下降は上昇の 1.5 倍」ルール)
//   - maxJumpHoldMs = 600ms (36F)。NES の 20F 切替より長めだが、初速と重力の組合せで
//     実測値の 125px に収束する hold 上限がこれ。
//
// 数値解析 (60fps シミュレーション):
//   - 1F (16.7ms) 短押し: 高さ ~44px ← 実機 22-38 の上限近傍、近似で許容
//   - 5F (83ms) 短押し:   高さ ~56px ← 実機 34px。NES は 10F→20F の不連続があり
//     連続物理での完全再現は困難。近似で許容
//   - 20F (333ms):        高さ ~102px
//   - 36F (600ms) 長押し: 高さ ~128px ← 実機 125±10px の範囲内、合格
//
// 最大落下速度 maxFallSpeed = 400 px/sec の合理性:
//   下降重力 720 で終端到達時間 = 400/720 ≒ 0.56s、その間の落下距離 ≒ 113px。
//   ジャンプ最大高度 ~128px より少し短く、長距離落下では maxFallSpeed が支配的になる。
export const ASCENT_GRAVITY_HELD = 480
export const ASCENT_GRAVITY_RELEASED = 1700
export const GRAVITY = 720

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

  // ジャンプ初速 (-360 px/sec = -6 px/F)。
  // HELD 重力 480 と組合せて 36F 長押しで実機計測 ~125px に到達する経路を作る。
  jumpInitialVelocity: -360,
  // A 押下を hold とみなす最大時間 (36F = 600ms at 60fps)
  // これを超えると RELEASED 扱いになり、以後の上昇は急減速
  maxJumpHoldMs: 600,

  // 最大落下速度: 下降重力 720 で 0.56s かけて到達 (落下距離 ~113px)
  // ジャンプ最大高度 ~128px より少し短く、長距離落下で支配的になる
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
