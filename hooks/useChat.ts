import { useCallback, useEffect, useState } from 'react';
import { ChatMessage } from '../types';
import { getMessages, sendMessage } from '../services/chatService';
import { useAuth } from './useAuth';

export const useChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMessages();
    setMessages(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(
    async (
      text: string,
      attachmentUrl?: string,
      attachmentName?: string,
      to?: { userId: string; userName: string },
    ) => {
      if (!user || !text.trim()) return;
      const msg = await sendMessage(user, text, attachmentUrl, attachmentName, to);
      setMessages((prev) => [...prev, msg]);
    },
    [user]
  );

  return { messages, loading, send };
};

export default useChat;
