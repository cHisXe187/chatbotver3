'use client';
import { useState, useRef } from 'react';
type Msg = { role: 'user' | 'assistant'; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'Hallo! Wie kann ich dir helfen?' }
  ]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(p => [...p, { role: 'user', content: text }]);
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: text }] })
      });
      const data = await res.json();
      setMessages(p => [...p, { role: 'assistant', content: data.text ?? '(keine Antwort)' }]);
      listRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
    } catch (e: any) {
      setMessages(p => [...p, { role: 'assistant', content: 'Fehler: ' + e.message }]);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{ height: 520, display: 'flex', flexDirection: 'column' }}>
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role === 'user' ? 'me' : 'bot'}`}>
              {m.content}
            </div>
          ))}
        </div>
        <div className="row">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Deine Frage…"
          />
          <button onClick={send}>Senden</button>
        </div>
      </div>
    </div>
  );
}
