import { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, Trash2, Languages } from 'lucide-react';
import api from '../api';

const SUGGESTIONS = [
  { en: 'What medicines are low in stock?', rw: 'Ni iyihe miti iri ku rutonde rw\'inkende?' },
  { en: 'What is the dashboard summary?', rw: 'Mpa imibare y\'amakuru yose' },
  { en: 'Show me current forecasts', rw: 'Nyeza forecast z\'igihe' },
  { en: 'What should I order?', rw: 'Niki nsabwa kugura?' },
  { en: 'Status of my requests', rw: 'Ibibazo byanjye biri he?' },
  { en: 'Track my deliveries', rw: 'Aho koherezwa biri' },
  { en: 'What medicines are expiring soon?', rw: 'Ni iyihe miti izimira vuba?' },
  { en: 'List all medicines', rw: 'Urutonde rw\'imiti' },
];

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [lang, setLang] = useState('en');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const welcome = lang === 'en'
      ? 'Hello! 👋 I am the MedSupply AI Assistant. Ask me anything about medicines, stock, deliveries, forecasts, recommendations, or your facility. I respond in English and Kinyarwanda.'
      : 'Muraho! 👋 Ndi MedSupply AI Assistant. Baza ibijyanye n\'imiti, ububiko, koherezwa, forecasts, recommendations cyangwa ibitaro byawe. Nsubiza mu Cyongereza n\'Ikinyarwanda.';
    setMessages([{ from: 'bot', text: welcome }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

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
      const detectedLang = data?.data?.lang;
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

  const toggleLang = () => setLang(l => (l === 'en' ? 'rw' : 'en'));

  const clearChat = () => {
    const welcome = lang === 'en'
      ? 'Chat cleared. Ask me anything!'
      : 'Umukandara wasibwe. Baza iki ushaka!';
    setMessages([{ from: 'bot', text: welcome }]);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="page-title flex items-center gap-2">
              MedSupply AI Assistant
              <Sparkles size={16} className="text-amber-500" />
            </h1>
            <p className="text-sm text-slate-500">
              Ask questions about your medical supply chain — English & Kinyarwanda
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleLang} className="btn btn-outline btn-sm">
            <Languages size={15} /> {lang === 'en' ? 'Ikinyarwanda' : 'English'}
          </button>
          <button onClick={clearChat} className="btn btn-outline btn-sm text-red-600 hover:bg-red-50">
            <Trash2 size={15} /> {lang === 'en' ? 'Clear' : 'Siba'}
          </button>
        </div>
      </div>

      <div className="card flex flex-col h-[calc(100vh-220px)] min-h-[480px] overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.from === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                  <Bot size={16} />
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
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
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 flex-shrink-0">
                <Bot size={16} />
              </div>
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
        <div className="px-4 py-3 border-t border-slate-100 bg-white">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
            {lang === 'en' ? 'Suggested questions' : 'Ibibazo by\'icyegeranyo'}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => send(s[lang])}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                {s[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={lang === 'en' ? 'Type your question here...' : 'Andika ikibazo cyawe hano...'}
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => send()} disabled={!input.trim() || typing}
            className="px-5 h-11 rounded-xl bg-blue-600 text-white font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-40 transition-colors">
            <Send size={16} /> {lang === 'en' ? 'Send' : 'Kohereza'}
          </button>
        </div>
      </div>
    </div>
  );
}
