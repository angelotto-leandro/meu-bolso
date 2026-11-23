// Resolve ?returnTo= para um caminho seguro DENTRO do app (sem o prefixo do GitHub Pages), senão "/".
// Bloqueia redirecionamentos para outros sites (ex.: //site-malicioso.com).
export function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get('returnTo');
  if (!raw) return '/';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    const path = url.pathname + url.search;
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
    if (path.startsWith('/login') || path.startsWith('/register')) return '/';
    return path;
  } catch {
    return '/';
  }
}

export const withReturnTo = (route, returnTo) => route + (returnTo && returnTo !== '/' ? '?returnTo=' + encodeURIComponent(returnTo) : '');
