import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { CHARACTERS } from '../characters.js'

const CHAT_API_URL = 'http://localhost:8000/chat'

export default function ChatPanel({ messages, activeChar, onExchangeComplete, onExchangeError }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesRef = useRef(null)

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    try {
      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, character: activeChar, history: [] }),
      })
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      const data = await res.json()

      onExchangeComplete({
        character: activeChar,
        userText: text,
        errors: data.errors ?? [],
        correctedMessage: data.corrected_message ?? text,
        reply: data.reply ?? '',
      })
    } catch (err) {
      onExchangeError({ userText: text })
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="chat-panel">
      <div className="messages" ref={messagesRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {sending && (
          <div className="msg-row ai">
            <div className="msg-sender">
              <div className="ai-dot" /> {CHARACTERS[activeChar].name}
            </div>
            <div className="typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>
      <div className="input-bar">
        <button className="icon-btn" title="Record">🎙</button>
        <div className="input-wrap">
          <input
            className="chat-input"
            placeholder="Type or speak in English..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
        </div>
        <button className="send-btn" title="Send" onClick={handleSend} disabled={sending}>➤</button>
      </div>
    </div>
  )
}
