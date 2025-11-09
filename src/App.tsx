import { useState } from 'react'
import './App.css'
import PhaserGame from './components/PhaserGame'

function App() {
  const [gameStarted, setGameStarted] = useState(false)

  return (
    <div className="App">
      <header className="App-header">
        <h1>ウィンドウ忍者伝説 - React + Vite + TypeScript</h1>
      </header>

      {!gameStarted ? (
        <div className="start-screen">
          <p>
            操作方法：
            <br />
            矢印キー: 忍者を移動
            <br />
            スペースキー: 手裏剣を投げる
            <br />
            タップでも操作できます
          </p>
          <button onClick={() => setGameStarted(true)}>ゲームを開始</button>
        </div>
      ) : (
        <PhaserGame />
      )}
    </div>
  )
}

export default App
