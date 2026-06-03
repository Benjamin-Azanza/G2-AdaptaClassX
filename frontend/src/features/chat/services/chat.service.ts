import api from '../../../services/api';

export type ChatReplySource = 'deterministic' | 'cached' | 'llm' | 'canned';

export interface ChatAskResponse {
  reply: string;
  source: ChatReplySource;
  suggestions: string[];
}

export interface ChatConfigResponse {
  enabled: boolean;
  llm_enabled: boolean;
  persona_name: string;
  suggestions: string[];
}

/**
 * Client for /chat. The shape mirrors ChatService on the backend so the
 * UI can render `source` (e.g. tag "cached" responses) without an extra
 * round-trip. CSRF + auth cookies are handled by the shared `api` axios
 * instance — no need to wire anything else here.
 */
export const chatService = {
  getConfig: async (): Promise<ChatConfigResponse> => {
    const res = await api.get<ChatConfigResponse>('/chat/config');
    return res.data;
  },

  ask: async (message: string): Promise<ChatAskResponse> => {
    const res = await api.post<ChatAskResponse>('/chat/ask', { message });
    return res.data;
  },
};
