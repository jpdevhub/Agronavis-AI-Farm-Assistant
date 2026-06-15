import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

interface Props {
  crop?: string;
  soilType?: string;
  location?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function AgronomyChatbot({ crop, soilType, location }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content: t('chatbot.greeting', 'Hello! I am AgroBot. Ask me anything about your crops, soil, or farming practices.'),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'bot' ? 'model' : 'user',
        content: m.content,
      }));

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${API_BASE}/api/v1/chatbot/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session?.access_token}` } : {})
        },
        body: JSON.stringify({
          message: text,
          crop: crop ?? '',
          soil_type: soilType ?? '',
          location: location ?? '',
          history,
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'bot',
        content: data.reply ?? t('chatbot.error', 'Sorry, I could not process that. Please try again.'),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: t('chatbot.networkError', 'Network error. Please check your connection.'),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      minHeight: '500px', background: '#f8fafc', borderRadius: '12px',
      border: '1px solid #e2e8f0', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', background: '#16a34a',
        color: 'white', fontWeight: 700, fontSize: '16px',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '22px' }}>🌱</span>
        {t('chatbot.title', 'AgroBot — Farm Assistant')}
        {crop && (
          <span style={{
            marginLeft: 'auto', fontSize: '12px', fontWeight: 400,
            background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: '20px',
          }}>
            {crop}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {msg.role === 'bot' && (
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#16a34a', color: 'white', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', marginRight: '8px', flexShrink: 0,
              }}>🌿</div>
            )}
            <div style={{
              maxWidth: '75%', padding: '10px 14px', borderRadius: '12px',
              background: msg.role === 'user' ? '#16a34a' : 'white',
              color: msg.role === 'user' ? 'white' : '#1e293b',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              fontSize: '14px', lineHeight: '1.5',
              borderTopRightRadius: msg.role === 'user' ? '4px' : '12px',
              borderTopLeftRadius: msg.role === 'bot' ? '4px' : '12px',
            }}>
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="chatbot-markdown-content" style={{ overflowX: 'auto' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: '#16a34a', color: 'white', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>🌿</div>
            <div style={{
              padding: '10px 14px', background: 'white', borderRadius: '12px',
              borderTopLeftRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              color: '#64748b', fontSize: '14px',
            }}>
              {t('chatbot.thinking', 'AgroBot is thinking...')}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', background: 'white',
        borderTop: '1px solid #e2e8f0',
        display: 'flex', gap: '10px', alignItems: 'flex-end',
      }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={t('chatbot.placeholder', 'Ask about your crops, soil, pests...')}
          rows={1}
          style={{
            flex: 1, resize: 'none', border: '1px solid #e2e8f0',
            borderRadius: '8px', padding: '10px 12px', fontSize: '14px',
            outline: 'none', fontFamily: 'inherit', lineHeight: '1.4',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            padding: '10px 20px', background: input.trim() && !loading ? '#16a34a' : '#94a3b8',
            color: 'white', border: 'none', borderRadius: '8px',
            fontWeight: 600, cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            fontSize: '14px', transition: 'background 0.2s',
          }}
        >
          {t('chatbot.send', 'Send')}
        </button>
      </div>
    </div>
  );
}