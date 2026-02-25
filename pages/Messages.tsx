import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Image, Paperclip, MoreVertical, Search, CheckCheck } from 'lucide-react';
import { UserRole } from '../types';
import { useSearchParams } from 'react-router-dom';

interface MessagesProps {
  currentUserEmail: string;
  currentUserRole: UserRole;
}

interface ApiMessage {
  id: string;
  senderEmail: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
}

interface ClientOption {
  email: string;
  name: string;
}

const TOKEN_STORAGE_KEY = 'karra_auth_token';
const API_BASE = window.location.hostname.endsWith('github.io') ? (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '') : '';
const COACH_EMAIL = 'carlotaloopezcarracedo@gmail.com';

const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

const displayNameFromEmail = (email: string) => {
  if (!email) return 'Usuario';
  const localPart = (email.split('@')[0] || '').trim();
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

export const Messages: React.FC<MessagesProps> = ({ currentUserEmail, currentUserRole }) => {
  const [searchParams] = useSearchParams();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientEmail, setSelectedClientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
  const preferredClientEmail = useMemo(
    () => String(searchParams.get('client') || '').trim().toLowerCase(),
    [searchParams],
  );

  const partnerEmail = useMemo(() => {
    if (currentUserRole === UserRole.COACH) {
      return selectedClientEmail;
    }
    return COACH_EMAIL;
  }, [currentUserRole, selectedClientEmail]);

  const partnerName = useMemo(() => {
    if (!partnerEmail) return 'Selecciona cliente';
    if (partnerEmail === COACH_EMAIL) return 'Coach';
    return displayNameFromEmail(partnerEmail);
  }, [partnerEmail]);

  const fetchClients = async () => {
    if (currentUserRole !== UserRole.COACH) return;

    const response = await fetch(apiUrl('/api/clients'), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('No se pudieron cargar los clientes');
    }

    const data = (await response.json()) as { clients: ClientOption[] };
    setClients(data.clients);
    if (!selectedClientEmail && data.clients.length > 0) {
      const preferred = data.clients.find((client) => client.email.toLowerCase() === preferredClientEmail);
      setSelectedClientEmail(preferred?.email || data.clients[0].email);
    }
  };

  const fetchMessages = async () => {
    if (!partnerEmail) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const query = `?with=${encodeURIComponent(partnerEmail)}`;
    const response = await fetch(apiUrl(`/api/messages${query}`), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('No se pudieron cargar los mensajes');
    }

    const data = (await response.json()) as { messages: ApiMessage[] };
    setMessages(data.messages);
    setError('');
  };

  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        await fetchClients();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error en clientes');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [preferredClientEmail]);

  useEffect(() => {
    const load = async () => {
      if (currentUserRole === UserRole.COACH && !selectedClientEmail) {
        return;
      }

      setIsLoading(true);
      try {
        await fetchMessages();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error en mensajes');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [partnerEmail]);

  useEffect(() => {
    if (!partnerEmail) return;
    const id = window.setInterval(() => {
      fetchMessages().catch(() => {});
    }, 15000);
    return () => window.clearInterval(id);
  }, [partnerEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (currentUserRole !== UserRole.COACH || !preferredClientEmail || clients.length === 0) {
      return;
    }
    const match = clients.find((client) => client.email.toLowerCase() === preferredClientEmail);
    if (match) {
      setSelectedClientEmail(match.email);
    }
  }, [clients, currentUserRole, preferredClientEmail]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !partnerEmail) return;

    try {
      const response = await fetch(apiUrl('/api/messages'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toEmail: partnerEmail, text: newMessage.trim() }),
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar el mensaje');
      }

      const data = (await response.json()) as { message: ApiMessage };
      setMessages((prev) => [...prev, data.message]);
      setNewMessage('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar mensaje');
    }
  };

  const handleAttachment = () => setError('Adjuntos no disponibles todavia.');
  const handleMenu = () => setError('');

  const formatTime = (isoDate: string) => {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 animate-fade-in">
      <div className="hidden md:flex flex-col w-80 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100">
          {currentUserRole === UserRole.COACH ? (
            <select
              value={selectedClientEmail}
              onChange={(event) => setSelectedClientEmail(event.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl py-2 px-3 text-sm focus:ring-1 focus:ring-primary font-bold"
            >
              {clients.length === 0 && <option value="">Sin clientes</option>}
              {clients.map((client) => (
                <option key={client.email} value={client.email}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                readOnly
                value="Conversacion con coach"
                className="w-full bg-slate-50 border-none rounded-xl py-2 pl-9 pr-4 text-sm font-bold text-slate-500"
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 bg-red-50/50 border-l-4 border-primary">
            <h4 className="font-black italic uppercase text-sm text-text tracking-wide">{partnerName || 'Sin conversacion'}</h4>
            <p className="text-xs text-slate-500 line-clamp-1 font-medium">{partnerEmail || 'Selecciona un cliente para iniciar chat'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={`https://picsum.photos/seed/${encodeURIComponent(partnerEmail || 'chat')}/100`} alt="Chat" className="w-10 h-10 rounded-full object-cover" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h3 className="font-display font-black italic uppercase text-text text-lg tracking-tight leading-none">{partnerName}</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{partnerEmail || 'Sin seleccionar'}</p>
            </div>
          </div>
          <button onClick={handleMenu} className="text-slate-400 hover:text-text">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
          {isLoading && <p className="text-sm text-slate-400 font-bold">Cargando mensajes...</p>}
          {!isLoading && messages.length === 0 && <p className="text-sm text-slate-400 font-bold">Sin mensajes todavia.</p>}

          {messages.map((msg) => {
            const isMe = msg.senderEmail.toLowerCase() === currentUserEmail.toLowerCase();
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm relative group ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'}`}>
                  <p className="text-sm leading-relaxed font-medium">{msg.text}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-black uppercase tracking-wide ${isMe ? 'text-red-100' : 'text-slate-400'}`}>
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && <CheckCheck size={12} className="opacity-80" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          {error && <p className="text-xs text-red-600 font-bold mb-2">{error}</p>}
          <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
            <div className="flex gap-2 pb-2 text-slate-400">
              <button type="button" onClick={handleAttachment} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Paperclip size={20} />
              </button>
              <button type="button" onClick={handleAttachment} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Image size={20} />
              </button>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessage.trim()) {
                      handleSendMessage(e);
                    }
                  }
                }}
                placeholder="Escribe un mensaje..."
                className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm max-h-24 p-2 outline-none font-medium"
                rows={1}
                style={{ minHeight: '40px' }}
              />
            </div>
            <button type="submit" disabled={!newMessage.trim() || !partnerEmail} className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20">
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
