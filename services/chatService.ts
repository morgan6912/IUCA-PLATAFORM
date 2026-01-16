import { ChatMessage, User } from '../types';
import { mockChatMessages } from './mockApi';

const CHAT_KEY = 'iuca-chat-general';
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const apiDelay = async <T,>(data: T, ms = 200): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const readChat = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return mockChatMessages;
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return mockChatMessages;
  }
};

const writeChat = (msgs: ChatMessage[]) => {
  localStorage.setItem(CHAT_KEY, JSON.stringify(msgs));
};

const mapApiMsg = (item: any): ChatMessage => ({
  id: item.id ?? Date.now(),
  userId: item.user_id,
  userName: item.user_name,
  avatarUrl: item.avatar_url || '',
  text: item.text,
  timestamp: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
  attachmentUrl: item.attachment_url || undefined,
  attachmentName: item.attachment_name || undefined,
  toUserId: item.to_user_id || undefined,
  toUserName: item.to_user_name || undefined,
});

export const getMessages = async (): Promise<ChatMessage[]> => {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/communication/messages`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return (data as any[]).map(mapApiMsg);
    } catch (err) {
      console.error('Fallo obteniendo mensajes de API, uso local', err);
    }
  }
  return apiDelay(readChat());
};

export const sendMessage = async (
  user: User,
  text: string,
  attachmentUrl?: string,
  attachmentName?: string,
  to?: { userId: string; userName: string },
): Promise<ChatMessage> => {
  if (API_URL) {
    try {
      const body = {
        userId: user.id,
        userName: user.name,
        avatarUrl: user.avatarUrl,
        text: text.trim(),
        attachmentUrl: attachmentUrl?.trim() || undefined,
        attachmentName: attachmentName?.trim() || undefined,
        toUserId: to?.userId,
        toUserName: to?.userName,
      };
      const res = await fetch(`${API_URL}/communication/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error remoto');
      const data = await res.json();
      return mapApiMsg(data);
    } catch (err) {
      console.error('Fallo enviando mensaje a API, uso local', err);
    }
  }

  // Fallback local
  const msgs = readChat();
  const id = (msgs[msgs.length - 1]?.id ?? 0) + 1;
  const msg: ChatMessage = {
    id,
    userId: user.id,
    userName: user.name,
    avatarUrl: user.avatarUrl,
    text: text.trim(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attachmentUrl: attachmentUrl?.trim() || undefined,
    attachmentName: attachmentName?.trim() || undefined,
    toUserId: to?.userId,
    toUserName: to?.userName,
  };
  const next = [...msgs, msg];
  writeChat(next);
  return apiDelay(msg);
};
