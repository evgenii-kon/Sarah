import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { CHARACTERS } from '../characters.js'
import { API_URL } from '../api.js'

const MIN_RECORDING_MS = 400

export default function ChatPanel({
  messages,
  activeChar,
  loading,
  onUserMessage,
  onExchangeComplete,
  onExchangeError,
  onSystemMessage,
}) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const messagesRef = useRef(null)
  const recorderRef = useRef(null)
  const holdingRef = useRef(false)

  const busy = sending || transcribing || loading

  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending, loading])

  async function sendText(text) {
    const messageId = onUserMessage(text)
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, character: activeChar, history: [] }),
      })
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      const data = await res.json()

      onExchangeComplete({
        character: activeChar,
        messageId,
        errors: data.errors ?? [],
        correctedMessage: data.corrected_message ?? text,
        reply: data.reply ?? '',
      })
    } catch {
      onExchangeError({ messageId })
    } finally {
      setSending(false)
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    sendText(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend()
  }

  async function transcribeAndSend(blob) {
    setTranscribing(true)
    let text = ''
    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const form = new FormData()
      form.append('file', blob, `recording.${ext}`)
      const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
      text = ((await res.json()).text ?? '').trim()
    } catch {
      onSystemMessage('Could not transcribe audio. Please try again.')
      return
    } finally {
      setTranscribing(false)
    }

    if (!text) {
      onSystemMessage("Didn't catch that. Please try again.")
      return
    }
    sendText(text)
  }

  async function startRecording(e) {
    if (busy || holdingRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    holdingRef.current = true
    setRecording(true)

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      holdingRef.current = false
      setRecording(false)
      onSystemMessage('Microphone access was denied.')
      return
    }

    if (!holdingRef.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    const chunks = []
    const startedAt = Date.now()
    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data)
    }
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      if (Date.now() - startedAt < MIN_RECORDING_MS || chunks.length === 0) return
      transcribeAndSend(new Blob(chunks, { type: recorder.mimeType }))
    }
    recorderRef.current = recorder
    recorder.start()
  }

  function stopRecording() {
    if (!holdingRef.current) return
    holdingRef.current = false
    setRecording(false)
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') recorder.stop()
    recorderRef.current = null
  }

  return (
    <div className="chat-panel">
      <div className="messages" ref={messagesRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {(sending || loading) && (
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
        <button
          className={`icon-btn${recording ? ' recording' : ''}`}
          title="Hold to speak"
          disabled={busy}
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerCancel={stopRecording}
          onContextMenu={(e) => e.preventDefault()}
        >
          🎙
        </button>
        <div className="input-wrap">
          <input
            className="chat-input"
            placeholder={
              recording
                ? 'Listening... release to send'
                : transcribing
                  ? 'Transcribing...'
                  : 'Type or speak in English...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy || recording}
          />
        </div>
        <button className="send-btn" title="Send" onClick={handleSend} disabled={busy || recording}>➤</button>
      </div>
    </div>
  )
}
