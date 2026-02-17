import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Paperclip, MoreVertical, Search, CheckCheck } from 'lucide-react';

export const Messages: React.FC = () => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState([
    { id: 1, sender: 'coach', text: '¡Hola Alex! ¿Cómo te sentiste con la sentadilla ayer? Vi que subiste las cargas.', time: '10:30 AM', read: true },
    { id: 2, sender: 'me', text: 'Hola Coach. La verdad me costó la última serie, pero pude mantener la técnica. ¿Debería mantener el peso la próxima semana?', time: '10:35 AM', read: true },
    { id: 3, sender: 'coach', text: 'Si la técnica fue sólida (RPE 8-9), mantén el peso pero intenta mejorar la velocidad en la subida. ¡Buen trabajo!', time: '10:40 AM', read: true },
    { id: 4, sender: 'me', text: 'Perfecto, así lo haré. Gracias 💪', time: '10:42 AM', read: true },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      id: Date.now(),
      sender: 'me',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const handleAttachment = () => {
    alert("Función de adjuntar archivos simulada: Abriría el selector de archivos.");
  };

  const handleMenu = () => {
    alert("Menú de opciones: Limpiar chat, Ver perfil, Reportar.");
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
     // Search visual simulation
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 animate-fade-in">
      {/* Sidebar List (Visible on desktop) */}
      <div className="hidden md:flex flex-col w-80 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
              type="text" 
              placeholder="Buscar mensaje..." 
              onChange={handleSearch}
              className="w-full bg-slate-50 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary font-bold placeholder:text-slate-400" 
             />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto">
           <div className="p-4 bg-red-50/50 border-l-4 border-primary cursor-pointer hover:bg-slate-50 transition-colors">
             <div className="flex justify-between items-start mb-1">
               <h4 className="font-black italic uppercase text-sm text-text tracking-wide">Coach Yago</h4>
               <span className="text-[10px] text-slate-400 font-bold uppercase">10:42 AM</span>
             </div>
             <p className="text-xs text-slate-500 line-clamp-1 font-medium">Perfecto, así lo haré. Gracias 💪</p>
           </div>
           <div className="p-4 cursor-pointer hover:bg-slate-50 transition-colors opacity-60">
             <div className="flex justify-between items-start mb-1">
               <h4 className="font-black italic uppercase text-sm text-text tracking-wide">Soporte</h4>
               <span className="text-[10px] text-slate-400 font-bold uppercase">Ayer</span>
             </div>
             <p className="text-xs text-slate-500 line-clamp-1">Tu suscripción ha sido renovada corre...</p>
           </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="https://picsum.photos/seed/coach/100" alt="Coach" className="w-10 h-10 rounded-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 className="font-display font-black italic uppercase text-text text-lg tracking-tight leading-none">Coach Yago</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">En línea ahora</p>
            </div>
          </div>
          <button onClick={handleMenu} className="text-slate-400 hover:text-text"><MoreVertical size={20} /></button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm relative group ${msg.sender === 'me' ? 'bg-primary text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
                <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-black uppercase tracking-wide ${msg.sender === 'me' ? 'text-red-100' : 'text-slate-400'}`}>
                   <span>{msg.time}</span>
                   {msg.sender === 'me' && <CheckCheck size={12} className={msg.read ? 'opacity-100' : 'opacity-50'} />}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
           <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
             <div className="flex gap-2 pb-2 text-slate-400">
                <button type="button" onClick={handleAttachment} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Paperclip size={20} /></button>
                <button type="button" onClick={handleAttachment} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Image size={20} /></button>
             </div>
             <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
               <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}} placeholder="Escribe un mensaje..." className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm max-h-24 p-2 outline-none font-medium" rows={1} style={{ minHeight: '40px' }} />
             </div>
             <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20">
               <Send size={20} />
             </button>
           </form>
        </div>
      </div>
    </div>
  );
};