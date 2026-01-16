import React, { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { listUsers } from '../services/adminService';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { Role } from '../types';
import { Send } from 'lucide-react';
import { useToast } from '../components/shared/ToastProvider';

const CommunicationPage: React.FC = () => {
  const { messages, send } = useChat();
  const { items: announcements, post } = useAnnouncements();
  const [newMessage, setNewMessage] = React.useState('');
  const [recipientId, setRecipientId] = React.useState<string>('');
  const [recipientName, setRecipientName] = React.useState<string>('');
  const [staff, setStaff] = React.useState<{ id: string; name: string; role: Role }[]>([]);
  const [onlyDirectedToMe, setOnlyDirectedToMe] = React.useState(false);
  const [fileName, setFileName] = React.useState('');
  const [fileUrl, setFileUrl] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [channel, setChannel] = React.useState<'general' | Role.DIRECTIVO | Role.ADMINISTRATIVO | Role.DOCENTE>('general');
  const { showToast } = useToast();

  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = React.useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // cargar lista de docentes, administrativos y directivos para elegir destinatario
    listUsers().then((users) => {
      const filtered = users
        .filter(
          (u) => u.role === Role.DOCENTE || u.role === Role.ADMINISTRATIVO || u.role === Role.DIRECTIVO,
        )
        .map((u) => ({ id: u.id, name: u.name, role: u.role }));
      setStaff(filtered);
    });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setShowScrollDown(!nearBottom);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;
    const urlFromInput = (document.querySelector('input[name=attachment]') as HTMLInputElement)?.value || '';
    const attachUrl = fileUrl || (urlFromInput || undefined);
    const attachName = fileUrl ? fileName || 'Archivo' : urlFromInput ? 'Archivo' : undefined;
    const to = recipientId
      ? { userId: recipientId, userName: recipientName || staff.find((s) => s.id === recipientId)?.name || '' }
      : undefined;
    send(newMessage, attachUrl, attachName, to);
    showToast('Mensaje enviado', 'success');
    setNewMessage('');
    if (fileUrl) {
      try {
        URL.revokeObjectURL(fileUrl);
      } catch {}
      setFileUrl('');
      setFileName('');
    }
  };

  const staffById = React.useMemo(
    () => new Map(staff.map((member) => [member.id, member])),
    [staff],
  );

  const filteredMessages = React.useMemo(() => {
    return messages
      .filter((msg) => {
        if (channel !== 'general') {
          const target = msg.toUserId ? staffById.get(msg.toUserId) : null;
          if (!target || target.role !== channel) return false;
        }
        if (!searchTerm.trim()) return true;
        const normalizedTerm = searchTerm.toLowerCase();
        return (
          msg.text.toLowerCase().includes(normalizedTerm) ||
          msg.userName.toLowerCase().includes(normalizedTerm) ||
          (msg.toUserName?.toLowerCase().includes(normalizedTerm) ?? false)
        );
      })
      .filter((msg) => (onlyDirectedToMe && user ? msg.toUserId === user.id : true));
  }, [messages, channel, searchTerm, onlyDirectedToMe, staffById, user]);

  const messageStats = React.useMemo(() => {
    const total = messages.length;
    const directed = messages.filter((msg) => !!msg.toUserId).length;
    const general = total - directed;
    const toMe = user ? messages.filter((msg) => msg.toUserId === user.id).length : 0;
    return { total, directed, general, toMe };
  }, [messages, user]);

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden rounded-2xl shadow-xl bg-white">
      <aside className="w-80 border-r border-slate-100 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-400">IUCA Chat</p>
              <h2 className="text-lg font-semibold text-slate-800">Comunicación Interna</h2>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500">Conectados</span>
              <span className="text-sm font-semibold text-iuca-green-600">{messageStats.total}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(['general', Role.DOCENTE, Role.ADMINISTRATIVO, Role.DIRECTIVO] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  channel === ch ? 'border-iuca-blue-600 bg-iuca-blue-50 text-iuca-blue-700' : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {ch === 'general' ? 'General' : ch.charAt(0).toUpperCase() + ch.slice(1)}
              </button>
            ))}
          </div>
          <div className="mt-3 relative">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar mensajes..."
              className="w-full rounded-full border border-slate-200 px-3 py-2 text-sm focus:border-iuca-blue-500 focus:ring-2 focus:ring-iuca-blue-200"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Ctrl+F</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div>
            <p className="text-xs text-slate-500">Destinatarios destacados</p>
            <div className="mt-2 space-y-2">
              {staff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setRecipientId(member.id);
                    setRecipientName(member.name);
                    setChannel(member.role);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-sm"
                >
                  <span>{member.name}</span>
                  <span className="text-xs text-slate-400">{member.role}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">Nuevos comunicados</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700 max-h-48 overflow-auto pr-2">
              {announcements.slice(0, 5).map((a) => (
                <li key={a.id} className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-500">{a.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-iuca-green-500 to-iuca-blue-600 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide">Canal {channel === 'general' ? 'General' : channel.charAt(0).toUpperCase() + channel.slice(1)}</p>
            <h2 className="text-xl font-semibold">{recipientName ? `Para ${recipientName}` : 'Todos los integrantes'}</h2>
          </div>
          <div className="text-right text-xs">
            <p className="text-white/80">Dirigidos: {messageStats.directed}</p>
            <p className="text-white/80">Solo mí: {messageStats.toMe}</p>
          </div>
        </header>
        <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50">
          {filteredMessages.map((msg) => {
            const isMine = msg.userId === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl space-y-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-flex flex-col items-start gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className={`text-xs font-semibold ${isMine ? 'text-iuca-green-600' : 'text-slate-500'}`}>{msg.userName}</span>
                    <p
                      className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMine ? 'bg-gradient-to-br from-iuca-blue-600 to-iuca-blue-500 text-white' : 'bg-white text-slate-800 shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </p>
                  </div>
                  {msg.attachmentUrl && (
                    <a
                      href={msg.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`text-xs ${isMine ? 'text-blue-100' : 'text-iuca-blue-600'} underline`}
                    >
                      {msg.attachmentName || 'Archivo adjunto'}
                    </a>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{msg.timestamp}</span>
                    {msg.toUserName && <span>→ {msg.toUserName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <footer className="px-6 py-4 border-t border-slate-100 bg-white">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => document.getElementById('chat-file')?.click()}
              className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-iuca-blue-600 transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 9.4V3.5a2.5 2.5 0 0 0-5 0v6.9a.5.5 0 1 1-1 0V3.5a3.5 3.5 0 0 1 7 0v6.9a3.5 3.5 0 0 1-7 0V3.5a.5.5 0 0 0-1 0v6.9a4.5 4.5 0 0 0 9 0z"></path>
                <path d="M12 11.5a5.5 5.5 0 0 0 5.5-5.5V4a.5.5 0 0 1 1 0v2a6.5 6.5 0 0 1-13 0V4a.5.5 0 0 1 1 0v2A5.5 5.5 0 0 0 12 11.5z"></path>
              </svg>
            </button>
            <input type="file" id="chat-file" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) {
                setFileName('');
                setFileUrl('');
                return;
              }
              setFileName(f.name);
              try {
                const url = URL.createObjectURL(f);
                setFileUrl(url);
                showToast('Archivo adjuntado', 'info');
              } catch {
                showToast('No se pudo adjuntar el archivo', 'error');
              }
            }} />
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-iuca-blue-500"
              />
              {fileName && <p className="text-[11px] text-slate-500 mt-1">{fileName}</p>}
            </div>
            <button type="submit" className="bg-iuca-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
              Enviar
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
};

export default CommunicationPage;
