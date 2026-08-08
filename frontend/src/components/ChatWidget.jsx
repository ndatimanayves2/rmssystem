import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles } from 'lucide-react';
import api from '../api';

const SUGGESTIONS = [
  { en: 'What medicines are low in stock?', rw: 'Ni iyihe miti iri ku rutonde rw\'inkende?' },
  { en: 'What is the dashboard summary?', rw: 'Mpa imibare y\'amakuru yose' },
  { en: 'Show me current forecasts', rw: 'Nyeza forecast z\'igihe' },
  { en: 'What should I order?', rw: 'Niki nsabwa kugura?' },
  { en: 'Status of my requests', rw: 'Ibibazo byanjye biri he?' },
  { en: 'Track my deliveries', rw: 'Aho koherezwa biri' },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [lang, setLang] = useState('en');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Welcome message
      setMessages([{
        from: 'bot',
        text: lang === 'en'
          ? 'Hello! 👋 I am the MedSupply AI Assistant. Ask me anything about medicines, stock, deliveries, forecasts, or recommendations. You can switch to Kinyarwanda using the language button.'
          : 'Muraho! 👋 Ndi MedSupply AI Assistant. Baza ibijyanye n\'imiti, ububiko, koherezwa, forecasts cyangwa recommendations. Ushobora guhindura ururimi ukoresheje buto y\'ururimi.',
      }]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;
    setInput('');
    setMessages(m => [...m, { from: 'user', text: msg }]);
    setTyping(true);
    try {
      const { data } = await api.post('/ai/chat', { message: msg });
      const answer = data?.data?.answer || (lang === 'rw' ? 'Nta gisubizo cyabonetse.' : 'No answer available.');
      const detectedLang = data?.data?.lang || lang;
      setMessages(m => [...m, { from: 'bot', text: answer }]);
      if (detectedLang && detectedLang !== lang) setLang(detectedLang);
    } catch (e) {
      setMessages(m => [...m, {
        from: 'bot',
        text: lang === 'rw'
          ? 'Hari ikibazo cy\'itumanaho. Gerageza nyuma.'
          : 'There was a connection error. Please try again.',
      }]);
    } finally {
      setTyping(false);
    }
  };

  const toggleLang = () => {
    const next = lang === 'en' ? 'rw' : 'en';
    setLang(next);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center"
        aria-label="AI Assistant"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm flex items-center gap-1.5">
                MedSupply AI Assistant
                <Sparkles size={13} className="text-amber-300" />
              </div>
              <div className="text-[11px] text-blue-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />
                {lang === 'en' ? 'Online · English' : 'Online · Ikinyarwanda'}
              </div>
            </div>
            <button onClick={toggleLang} className="text-xs bg-white/20 hover:bg-white/30 rounded-lg px-2 py-1 font-medium">
              {lang === 'en' ? 'Kinyarwanda' : 'English'}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 1 && (
            <div className="px-3 pt-2 flex flex-wrap gap-1.5 border-t border-slate-100 bg-white">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s[lang])}
                  className="text-[11px] px-2.5 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                  {s[lang]}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={lang === 'en' ? 'Ask a question...' : 'Baza ikibazo...'}
              className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => send()} disabled={!input.trim() || typing}
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors">
              <Send size={17} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
