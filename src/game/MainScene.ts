import Phaser from 'phaser'

export class MainScene extends Phaser.Scene {
  private ninja?: Phaser.Physics.Arcade.Sprite
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys
  private spaceKey?: Phaser.Input.Keyboard.Key
  private shurikens?: Phaser.Physics.Arcade.Group
  private enemies?: Phaser.Physics.Arcade.Group
  private score = 0
  private scoreText?: Phaser.GameObjects.Text
  private gameOver = false
  private lastFired = 0
  private fireRate = 300 // 300msごとに発射可能
  private enemySpawnTimer?: Phaser.Time.TimerEvent
  private instructionText?: Phaser.GameObjects.Text
  private platforms?: Phaser.Physics.Arcade.StaticGroup
  private jumpKey?: Phaser.Input.Keyboard.Key

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // アセットがないので、スキップ
  }

  create() {
    // 背景色は設定ファイルで指定済み（黒）

    // プラットフォームを作成
    this.createPlatforms()

    // 忍者を作成
    this.createNinja()

    // 手裏剣のグループを作成
    this.createShurikens()

    // 敵のグループを作成
    this.createEnemies()

    // スコア表示
    this.scoreText = this.add.text(16, 16, 'スコア: 0', {
      fontSize: '24px',
      color: '#ffffff',
    })
    this.scoreText.setDepth(100)

    // 操作説明
    this.instructionText = this.add.text(
      400,
      16,
      '操作: ← → 移動 / ↑ ジャンプ / スペース: 手裏剣 / タップでも操作可',
      {
        fontSize: '14px',
        color: '#aaaaaa',
      }
    )
    this.instructionText.setOrigin(0.5, 0)
    this.instructionText.setDepth(100)

    // キーボード入力
    this.cursors = this.input.keyboard?.createCursorKeys()
    this.spaceKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    )
    this.jumpKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.UP
    )

    // タッチ/クリック入力
    this.input.on('pointerdown', this.handlePointerDown, this)
    this.input.on('pointermove', this.handlePointerMove, this)

    // 衝突判定
    this.physics.add.collider(this.ninja!, this.platforms!)

    this.physics.add.overlap(
      this.shurikens!,
      this.enemies!,
      this.hitEnemy as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    this.physics.add.overlap(
      this.ninja!,
      this.enemies!,
      this.hitNinja as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    // 敵を定期的にスポーン
    this.enemySpawnTimer = this.time.addEvent({
      delay: 2000, // 2秒ごと
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    })
  }

  private createPlatforms() {
    this.platforms = this.physics.add.staticGroup()

    // 地面
    const ground = this.platforms.create(400, 580, '')
    ground.setDisplaySize(800, 40)
    ground.body!.updateFromGameObject()

    const groundGraphics = this.add.graphics()
    groundGraphics.fillStyle(0x8b4513, 1)
    groundGraphics.fillRect(0, 560, 800, 40)
    groundGraphics.setDepth(1)
  }

  private createNinja() {
    // 忍者（紫の三角形）
    this.ninja = this.physics.add.sprite(100, 520, '')
    this.ninja.setDisplaySize(30, 30)

    const graphics = this.add.graphics()
    graphics.fillStyle(0x9370db, 1)
    graphics.beginPath()
    graphics.moveTo(100, 505) // 上の頂点
    graphics.lineTo(85, 535) // 左下
    graphics.lineTo(115, 535) // 右下
    graphics.closePath()
    graphics.fillPath()
    graphics.setDepth(10)

    this.ninja.body!.setSize(30, 30)
    this.ninja.setBounce(0.2)
    this.ninja.setCollideWorldBounds(true)
    this.ninja.setData('graphics', graphics)
  }

  private createShurikens() {
    this.shurikens = this.physics.add.group({
      defaultKey: 'shuriken',
      maxSize: 20,
    })
  }

  private createEnemies() {
    this.enemies = this.physics.add.group()
  }

  private spawnEnemy() {
    if (this.gameOver) return

    // ランダムな位置に敵をスポーン（上から落ちてくる、または横から来る）
    const spawnType = Phaser.Math.Between(0, 1)

    if (spawnType === 0) {
      // 上から落ちてくる
      const x = Phaser.Math.Between(50, 750)
      const enemy = this.enemies!.create(x, -20, '')

      const graphics = this.add.graphics()
      graphics.fillStyle(0xff0000, 1)
      graphics.fillCircle(x, -20, 15)
      graphics.setDepth(5)

      enemy.setDisplaySize(30, 30)
      enemy.body.setSize(30, 30)
      enemy.setVelocityY(Phaser.Math.Between(100, 200))
      enemy.setBounce(0.3)
      enemy.setCollideWorldBounds(true)
      enemy.setData('graphics', graphics)

      this.physics.add.collider(enemy, this.platforms!)
    } else {
      // 横から歩いてくる
      const side = Phaser.Math.Between(0, 1)
      const x = side === 0 ? -20 : 820
      const enemy = this.enemies!.create(x, 520, '')

      const graphics = this.add.graphics()
      graphics.fillStyle(0xff4500, 1)
      graphics.fillRect(x - 15, 505, 30, 30)
      graphics.setDepth(5)

      enemy.setDisplaySize(30, 30)
      enemy.body.setSize(30, 30)
      enemy.setVelocityX(side === 0 ? 100 : -100)
      enemy.setBounce(0)
      enemy.setCollideWorldBounds(false)
      enemy.setData('graphics', graphics)

      this.physics.add.collider(enemy, this.platforms!)
    }
  }

  private throwShuriken() {
    if (this.gameOver) return

    const time = this.time.now
    if (time < this.lastFired + this.fireRate) return

    this.lastFired = time

    // 忍者が向いている方向に手裏剣を投げる
    const velocityX = this.ninja!.body!.velocity.x
    const direction = velocityX >= 0 ? 1 : -1

    const shuriken = this.shurikens!.get(
      this.ninja!.x + direction * 20,
      this.ninja!.y
    )
    if (shuriken) {
      const graphics = this.add.graphics()
      graphics.fillStyle(0xc0c0c0, 1)
      graphics.beginPath()
      // 手裏剣の形（4つの角）
      graphics.moveTo(this.ninja!.x + direction * 20, this.ninja!.y - 8)
      graphics.lineTo(this.ninja!.x + direction * 20 + 8, this.ninja!.y)
      graphics.lineTo(this.ninja!.x + direction * 20, this.ninja!.y + 8)
      graphics.lineTo(this.ninja!.x + direction * 20 - 8, this.ninja!.y)
      graphics.closePath()
      graphics.fillPath()
      graphics.setDepth(5)

      shuriken.setActive(true)
      shuriken.setVisible(true)
      shuriken.setDisplaySize(16, 16)
      shuriken.body!.setSize(16, 16)
      shuriken.setVelocityX(direction * 500)
      shuriken.setData('graphics', graphics)
      shuriken.setData('direction', direction)
    }
  }

  private hitEnemy(
    shuriken: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    // 手裏剣と敵を削除
    const shurikenGraphics = (
      shuriken as Phaser.Physics.Arcade.Sprite
    ).getData('graphics')
    if (shurikenGraphics) shurikenGraphics.destroy()

    const enemyGraphics = (enemy as Phaser.Physics.Arcade.Sprite).getData(
      'graphics'
    )
    if (enemyGraphics) enemyGraphics.destroy()

    shuriken.destroy()
    enemy.destroy()

    // スコア加算
    this.score += 10
    this.scoreText?.setText('スコア: ' + this.score)
  }

  private hitNinja() {
    if (this.gameOver) return

    this.gameOver = true

    // 忍者を赤くする
    const ninjaGraphics = this.ninja?.getData('graphics')
    if (ninjaGraphics) {
      ninjaGraphics.clear()
      ninjaGraphics.fillStyle(0xff0000, 1)
      ninjaGraphics.beginPath()
      ninjaGraphics.moveTo(this.ninja!.x, this.ninja!.y - 15)
      ninjaGraphics.lineTo(this.ninja!.x - 15, this.ninja!.y + 15)
      ninjaGraphics.lineTo(this.ninja!.x + 15, this.ninja!.y + 15)
      ninjaGraphics.closePath()
      ninjaGraphics.fillPath()
    }

    this.ninja?.setVelocity(0, 0)

    // 敵のスポーンを停止
    this.enemySpawnTimer?.destroy()

    // ゲームオーバー表示
    const gameOverText = this.add.text(400, 300, 'GAME OVER', {
      fontSize: '64px',
      color: '#ff0000',
    })
    gameOverText.setOrigin(0.5)
    gameOverText.setDepth(200)

    const restartText = this.add.text(
      400,
      370,
      'クリックかタップで再スタート',
      {
        fontSize: '24px',
        color: '#ffffff',
      }
    )
    restartText.setOrigin(0.5)
    restartText.setDepth(200)

    // 再スタート処理
    this.input.once('pointerdown', () => {
      this.scene.restart()
    })
  }

  update() {
    if (this.gameOver) return

    // 忍者の移動
    if (this.cursors?.left.isDown) {
      this.ninja?.setVelocityX(-250)
    } else if (this.cursors?.right.isDown) {
      this.ninja?.setVelocityX(250)
    } else {
      this.ninja?.setVelocityX(0)
    }

    // ジャンプ
    if (
      Phaser.Input.Keyboard.JustDown(this.jumpKey!) &&
      this.ninja!.body!.touching.down
    ) {
      this.ninja?.setVelocityY(-400)
    }

    // 忍者のグラフィックスを更新
    const ninjaGraphics = this.ninja?.getData('graphics')
    if (ninjaGraphics && this.ninja) {
      ninjaGraphics.clear()
      ninjaGraphics.fillStyle(0x9370db, 1)
      ninjaGraphics.beginPath()
      ninjaGraphics.moveTo(this.ninja.x, this.ninja.y - 15)
      ninjaGraphics.lineTo(this.ninja.x - 15, this.ninja.y + 15)
      ninjaGraphics.lineTo(this.ninja.x + 15, this.ninja.y + 15)
      ninjaGraphics.closePath()
      ninjaGraphics.fillPath()
    }

    // 手裏剣の発射
    if (this.spaceKey?.isDown) {
      this.throwShuriken()
    }

    // 手裏剣が画面外に出たら削除
    this.shurikens?.children.entries.forEach(shuriken => {
      const s = shuriken as Phaser.Physics.Arcade.Sprite
      if (s.x < -50 || s.x > 850) {
        const graphics = s.getData('graphics')
        if (graphics) graphics.destroy()
        s.destroy()
      } else {
        // 手裏剣のグラフィックスを更新（回転）
        const graphics = s.getData('graphics')
        const direction = s.getData('direction')
        if (graphics) {
          graphics.clear()
          graphics.fillStyle(0xc0c0c0, 1)
          graphics.beginPath()
          graphics.moveTo(s.x, s.y - 8)
          graphics.lineTo(s.x + 8 * direction, s.y)
          graphics.lineTo(s.x, s.y + 8)
          graphics.lineTo(s.x - 8 * direction, s.y)
          graphics.closePath()
          graphics.fillPath()
        }
      }
    })

    // 敵が画面外に出たら削除
    this.enemies?.children.entries.forEach(enemy => {
      const e = enemy as Phaser.Physics.Arcade.Sprite
      if (e.y > 610 || e.x < -50 || e.x > 850) {
        const graphics = e.getData('graphics')
        if (graphics) graphics.destroy()
        e.destroy()
      } else {
        // 敵のグラフィックスを更新
        const graphics = e.getData('graphics')
        if (graphics) {
          graphics.clear()
          // 円形の敵か四角形の敵か判定
          if (e.body!.velocity.x !== 0 && Math.abs(e.body!.velocity.y) < 50) {
            // 歩いている敵（四角形）
            graphics.fillStyle(0xff4500, 1)
            graphics.fillRect(e.x - 15, e.y - 15, 30, 30)
          } else {
            // 落ちてくる敵（円形）
            graphics.fillStyle(0xff0000, 1)
            graphics.fillCircle(e.x, e.y, 15)
          }
        }
      }
    })
  }

  private handlePointerDown(_pointer: Phaser.Input.Pointer) {
    if (this.gameOver) return

    // タップで手裏剣を投げる
    this.throwShuriken()
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.gameOver) return
    if (!pointer.isDown) return

    // 忍者をポインターのX座標に移動
    if (pointer.x < this.ninja!.x - 20) {
      this.ninja?.setVelocityX(-250)
    } else if (pointer.x > this.ninja!.x + 20) {
      this.ninja?.setVelocityX(250)
    } else {
      this.ninja?.setVelocityX(0)
    }
  }
}
