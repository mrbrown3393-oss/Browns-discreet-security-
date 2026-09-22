export function sessionId(url: string | null) {
  const match = url?.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
export const initialAuthUrl = async () => typeof window === 'undefined' ? null : window.location.href;
export function clearAuthUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('session_id');
  const hash = new URLSearchParams(url.hash.slice(1));
  hash.delete('session_id');
  url.hash = hash.toString();
  window.history.replaceState(window.history.state, '', url.toString());
}
export async function openGoogle(): Promise<string | null> {
  const redirect = `${window.location.origin}/`;
  window.location.assign(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`);
  return null;
}