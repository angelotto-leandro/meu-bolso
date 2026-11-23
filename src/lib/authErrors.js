// Traduz as mensagens de erro mais comuns do Supabase.
const MAP = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'],
  [/user already registered|already been registered/i, 'Já existe uma conta com esse e-mail.'],
  [/password should be at least (\d+)/i, (m) => `A senha precisa ter pelo menos ${m[1]} caracteres.`],
  [/rate limit|too many requests|security purposes/i, 'Muitas tentativas. Espere alguns minutos e tente de novo.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'E-mail inválido.'],
  [/same password|different from the old/i, 'A nova senha precisa ser diferente da anterior.'],
  [/signups not allowed|signup is disabled/i, 'Novos cadastros estão desativados.'],
  [/failed to fetch|network/i, 'Sem conexão. Verifique a internet e tente de novo.'],
];

export function authErrorMessage(err, fallback = 'Algo deu errado. Tente de novo.') {
  const msg = err?.message || '';
  for (const [re, out] of MAP) {
    const m = msg.match(re);
    if (m) return typeof out === 'function' ? out(m) : out;
  }
  return msg || fallback;
}
