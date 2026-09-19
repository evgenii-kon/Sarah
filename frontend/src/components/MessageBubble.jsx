function buildHighlightedSegments(fullText, matches) {
  const segments = []
  let cursor = 0

  matches.forEach(({ text: match, tip }) => {
    if (!match) return
    const idx = fullText.indexOf(match, cursor)
    if (idx === -1) return
    if (idx > cursor) segments.push({ text: fullText.slice(cursor, idx) })
    segments.push({ text: match, highlight: true, tip })
    cursor = idx + match.length
  })

  if (cursor < fullText.length) segments.push({ text: fullText.slice(cursor) })
  return segments
}

function renderSegments(segments, mode) {
  return segments.map((seg, i) => {
    if (!seg.highlight) return <span key={i}>{seg.text}</span>
    if (mode === 'error') {
      return (
        <span key={i} className="err" data-tip={seg.tip}>
          {seg.text}
        </span>
      )
    }
    return <strong key={i}>{seg.text}</strong>
  })
}

function CorrectionBox({ text, errors }) {
  const segments = buildHighlightedSegments(
    text,
    errors.map((e) => ({ text: e.correction }))
  )
  return (
    <div className="correction-box">
      <span className="label">✓ FIX</span>
      <span className="correction-text">{renderSegments(segments, 'strong')}</span>
    </div>
  )
}

export default function MessageBubble({ message }) {
  if (message.role === 'system') {
    return <div className="sys-msg">{message.text}</div>
  }

  if (message.role === 'ai') {
    return (
      <div className="msg-row ai">
        <div className="msg-sender">
          <div className="ai-dot" /> {message.sender}
        </div>
        <div className="bubble-ai">{message.text}</div>
      </div>
    )
  }

  const hasErrors = Boolean(message.errors && message.errors.length > 0)
  const userSegments = hasErrors
    ? buildHighlightedSegments(
        message.text,
        message.errors.map((e) => ({ text: e.original, tip: e.explanation }))
      )
    : null

  return (
    <div className="msg-row user">
      <div className="msg-sender">You</div>
      <div className="user-block">
        <div className="bubble-user">
          {userSegments ? renderSegments(userSegments, 'error') : message.text}
        </div>
        {hasErrors && (
          <CorrectionBox text={message.correctedMessage ?? message.text} errors={message.errors} />
        )}
      </div>
    </div>
  )
}
