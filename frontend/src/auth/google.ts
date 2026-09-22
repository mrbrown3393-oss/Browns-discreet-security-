import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();

export function sessionId(url: string | null) {
  const match = url?.match(/[?#&]session_id=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
export const initialAuthUrl = () => Linking.getInitialURL();
export const clearAuthUrl = () => {};
export async function openGoogle(): Promise<string | null> {
  const redirect = Linking.createURL('');
  let captured: string | null = null;
  const listener = Linking.addEventListener('url', ({ url }) => { if (sessionId(url)) captured = url; });
  try {
    const result = await WebBrowser.openAuthSessionAsync(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`, redirect);
    return (result.type === 'success' ? result.url : null) || captured || await Linking.getInitialURL();
  } finally { listener.remove(); }
}