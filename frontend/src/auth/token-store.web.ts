// Preview sessions persist only in a server-set HttpOnly cookie.
export const readToken = async (): Promise<string | null> => null;
export const writeToken = async (_token: string): Promise<void> => {};
export const removeToken = async (): Promise<void> => {};