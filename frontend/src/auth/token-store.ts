import * as SecureStore from 'expo-secure-store';
const KEY = 'zerotrust-session';
export const readToken = () => SecureStore.getItemAsync(KEY);
export const writeToken = (token: string) => SecureStore.setItemAsync(KEY, token);
export const removeToken = () => SecureStore.deleteItemAsync(KEY);