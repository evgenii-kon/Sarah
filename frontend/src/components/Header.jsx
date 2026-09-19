import { CHARACTERS } from '../characters.js'

export default function Header({ activeChar, onSwitchChar }) {
  return (
    <header className="header">
      <div className="logo">Sarah</div>
      <div className="char-switcher">
        {Object.values(CHARACTERS).map((char) => (
          <button
            key={char.key}
            className={`char-btn char-btn-${char.key}${activeChar === char.key ? ' active' : ''}`}
            onClick={() => onSwitchChar(char.key)}
          >
            <div className="char-avatar">{char.avatar}</div>
            {char.label}
          </button>
        ))}
      </div>
      <div className="header-right">
        <span className="badge">● Live</span>
      </div>
    </header>
  )
}
