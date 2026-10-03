import { useState, useRef, useEffect } from 'react';
import './chatbot.css';

// Minimal Inline SVG Icons
const IconBot = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a7 7 0 0 1 7-7h1V5.73A2 2 0 1 1 12 2z"></path>
    <path d="M8 13v.01"></path>
    <path d="M16 13v.01"></path>
    <path d="M12 17c-1.5 0-2.5-.5-3-1"></path>
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hi Alex! I'm your AI financial advisor. How can I help you track your wealth today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I'm having trouble connecting to the server right now." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Network error. Please make sure the backend is running." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3><span style={{display: 'flex', color: 'var(--accent-primary)'}}><IconBot /></span> Advisor AI</h3>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
              <IconClose />
            </button>
          </div>

          <div className="chat-messages custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-bubble ai">
                <div className="loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            {/* Invisible div to target for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <form className="chat-form" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                className="chat-input" 
                placeholder="Ask about your finances..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <button type="submit" className="chat-send-btn" disabled={!input.trim() || isLoading}>
                <IconSend />
              </button>
            </form>
          </div>
        </div>
      )}

      {!isOpen && (
        <button className="chat-widget-fab" onClick={() => setIsOpen(true)}>
          <IconBot />
        </button>
      )}
    </div>
  );
}

export default ChatWidget;