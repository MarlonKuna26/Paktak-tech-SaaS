import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  // Permite probar en celulares en la misma red Wi-Fi o red local sin que 127.0.0.1 falle en el dispositivo móvil
  if (typeof window !== 'undefined' && (url.includes('127.0.0.1') || url.includes('localhost'))) {
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== '127.0.0.1' && currentHost !== 'localhost') {
      url = url.replace('127.0.0.1', currentHost).replace('localhost', currentHost);
    }
  }

  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
