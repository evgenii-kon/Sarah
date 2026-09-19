import { useState } from 'react'
import { CHARACTERS } from '../characters.js'

export default function CallPanel({ activeChar }) {
  const char = CHARACTERS[activeChar]
  const [muted, setMuted] = useState(false)

  return (
    <div className="call-panel">
      <div className="call-status-bar">
        <span className="call-label">Voice call</span>
        <span className="live-dot">Connected</span>
      </div>
      <div className="avatar-ring">
        <div className="avatar-img">{char.avatar}</div>
      </div>
      <div className="char-name">{char.name}</div>
      <div className="char-desc" dangerouslySetInnerHTML={{ __html: char.descHtml }} />
      <div className="call-controls">
        <button
          className={`ctrl-btn ctrl-mute${muted ? ' active' : ''}`}
          onClick={() => setMuted((m) => !m)}
        >
          🎙
        </button>
        <button className="ctrl-btn ctrl-end">✕</button>
        <button className="ctrl-btn ctrl-speaker">🔊</button>
      </div>
      <div className="call-hint">
        Errors highlighted <strong className="err-hint">in red</strong> in chat.<br />
        Corrections appear below your message.
      </div>
    </div>
  )
}
