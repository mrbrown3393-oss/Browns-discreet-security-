import { appConfig } from '../config';
import { fetch as streamFetch } from 'expo/fetch';
let token: string | null = null;
let onUnauthorized = () => {};
export const setApiToken = (value: string | null) => { token = value; };
export const setUnauthorizedHandler = (handler: () => void) => { onUnauthorized = handler; };

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function streamApi(path: string, body: unknown, onEvent: (kind: string, data: any) => void, controller: AbortController) {
  const base = appConfig.backendUrl;
  if (!base) throw new Error('App connection is not configured.');
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await streamFetch(`${base.replace(/\/$/, '')}/api${path}`, {
      method: 'POST', credentials: 'include', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = await response.json();
      if (response.status === 401) onUnauthorized();
      throw new ApiError(typeof data.detail === 'string' ? data.detail : 'Unable to start the AI response.', response.status);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Streaming is unavailable. Please try again.');
    const decoder = new TextDecoder(); let buffer = ''; let completed = false;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      buffer += decoder.decode(part.value, { stream: true });
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        const kind = block.match(/^event: (.+)$/m)?.[1];
        const raw = block.match(/^data: (.+)$/m)?.[1];
        if (!kind || !raw) continue;
        const data = JSON.parse(raw);
        if (kind === 'error') throw new Error(data.message || 'The AI request failed.');
        if (kind === 'done') completed = true;
        onEvent(kind, data);
      }
    }
    if (!completed) throw new Error('The response was interrupted. Your question is saved; try again.');
  } finally { clearTimeout(timer); }
}
export async function api<T>(path: string, body?: unknown, authenticated = true): Promise<T> {
  const base = appConfig.backendUrl;
  if (!base) throw new Error('App connection is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      if (authenticated && response.status === 401) onUnauthorized();
      throw new ApiError(typeof data.detail === 'string' ? data.detail : 'Please check your details and try again.', response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Unable to connect. Check your connection and try again.');
  } finally { clearTimeout(timer); }
}