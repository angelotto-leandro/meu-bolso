import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Copy, Check, KeyRound, Loader2, AlertTriangle } from 'lucide-react';

function CopyField({ label, value, secret }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt('Copie o texto:', value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <p className="label-eyebrow text-muted-foreground mb-1">{label}</p>
      <div className="flex items-stretch gap-1.5">
        <code className={cn('flex-1 min-w-0 rounded-lg border border-border bg-secondary/50 px-2.5 py-2 text-[11px] break-all', secret && 'font-semibold text-foreground')}>{value}</code>
        <Button type="button" variant="outline" size="icon" onClick={copy} className="shrink-0 h-auto w-10" aria-label={`Copiar ${label}`}>
          {copied ? <Check className="text-[#059669]" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-[#059669] text-white text-xs font-bold grid place-items-center shrink-0 mt-0.5">{n}</span>
      <div className="min-w-0 flex-1 space-y-1.5 text-sm text-foreground">
        <p className="font-semibold">{title}</p>
        <div className="text-[13px] text-muted-foreground space-y-1.5">{children}</div>
      </div>
    </li>
  );
}

function SectionLabel({ children, color }) {
  const dot = color === 'rose' ? 'bg-rose-500' : color === 'emerald' ? 'bg-[#059669]' : 'bg-muted-foreground';
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className={cn('w-2 h-2 rounded-full', dot)} />
      <span className="label-eyebrow text-muted-foreground">{children}</span>
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}

const B = ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>;
const C = ({ children }) => <code className="px-1 py-0.5 rounded bg-secondary text-foreground text-[12px]">{children}</code>;

export default function ShortcutSheet({ open, onOpenChange }) {
  const [hasToken, setHasToken] = useState(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    supabase.rpc('has_shortcut_token').then(({ data }) => setHasToken(!!data));
  }, [open]);

  const generate = async () => {
    if (hasToken && !token && !window.confirm('Gerar um novo código desativa o anterior. O Atalho que já está no iPhone vai parar de funcionar até você trocar o código nele. Continuar?')) return;
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('generate_shortcut_token');
    setBusy(false);
    if (err) return setError(err.message);
    setToken(data);
    setHasToken(true);
  };

  const urlCategorias = `${SUPABASE_URL}/rest/v1/rpc/atalho_categorias`;
  const urlLancar = `${SUPABASE_URL}/rest/v1/rpc/atalho_lancar`;
  const urlGanho = `${SUPABASE_URL}/rest/v1/rpc/atalho_ganho`;
  const tokenText = token || 'SEU_CÓDIGO';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 pr-12 border-b border-border text-left space-y-1">
          <SheetTitle className="text-base font-display">Atalho do iPhone</SheetTitle>
          <SheetDescription className="text-xs">
            Dois toques na traseira do iPhone para lançar um gasto ou ganho, sem abrir o app.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Código pessoal */}
          <div className="rounded-xl border border-[#059669]/25 bg-[#ECFDF5] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#059669]" />
              <p className="font-display font-semibold text-sm text-foreground">Seu código pessoal</p>
            </div>
            {token ? (
              <>
                <CopyField label="Código (aparece só agora)" value={token} secret />
                <p className="flex gap-1.5 text-[12px] text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Copie agora e cole no Atalho. Por segurança ele não aparece de novo. Não envie para outras pessoas: quem tiver o código consegue lançar gastos na sua conta.
                </p>
              </>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                {hasToken
                  ? 'Você já gerou um código antes. Se perdeu ou vai configurar outro iPhone, gere um novo (o anterior para de funcionar).'
                  : 'Gere o código que liga o Atalho do iPhone à sua conta.'}
              </p>
            )}
            {!token && (
              <Button onClick={generate} disabled={busy || hasToken === null} className="w-full bg-[#059669] hover:bg-[#047857]">
                {busy && <Loader2 className="animate-spin" />} {hasToken ? 'Gerar novo código' : 'Gerar meu código'}
              </Button>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-3">
            <CopyField label="Link das categorias" value={urlCategorias} />
            <CopyField label="Link para lançar gasto" value={urlLancar} />
            <CopyField label="Link para lançar ganho" value={urlGanho} />
            <CopyField label="Chave (cabeçalho apikey)" value={SUPABASE_KEY} />
          </div>

          {/* Passo a passo */}
          <div className="space-y-5">
            <div>
              <p className="font-display font-semibold text-sm text-foreground">Montar o Atalho (uma vez só)</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Com dois toques aparece “Gasto ou Ganho?”. Use a busca de ações do app Atalhos para achar cada ação abaixo.
              </p>
            </div>

            <ol className="space-y-4">
              <Step n={1} title="Crie o atalho">
                <p>Abra o app <B>Atalhos</B>, toque em <B>+</B> e dê o nome <B>Lançar</B>.</p>
              </Step>
              <Step n={2} title="Escolher do Menu">
                <p>Pergunta: <C>Gasto ou ganho?</C>. Deixe duas opções: <C>Gasto</C> e <C>Ganho</C>.</p>
                <p>O Atalhos cria um bloco para cada opção. As ações dos passos 3 a 10 vão <B>dentro do bloco Gasto</B>; as dos passos 11 a 16, <B>dentro do bloco Ganho</B>. Se uma ação cair fora do lugar, segure e arraste.</p>
              </Step>
            </ol>

            <SectionLabel color="rose">Dentro de “Gasto”</SectionLabel>
            <ol className="space-y-4">
              <Step n={3} title="Obter Conteúdo de URL (suas categorias)">
                <p>URL: o <B>Link das categorias</B>.</p>
                <p>Toque na setinha: Método <B>POST</B>. Em <B>Cabeçalhos</B>, adicione <C>apikey</C> com a <B>Chave</B>.</p>
                <p>Corpo da Solicitação: <B>JSON</B>, com o campo <C>token</C> (Texto) = seu <B>código</B>.</p>
              </Step>
              <Step n={4} title="Escolher da Lista">
                <p>Lista: <B>Conteúdos da URL</B>. Em “Mostrar mais”, Pergunta: <C>Categoria</C>.</p>
              </Step>
              <Step n={5} title="Pedir Entrada (valor)">
                <p>Tipo: <B>Número</B>. Pergunta: <C>Valor do gasto</C>. Ative <B>Permitir Decimais</B>.</p>
              </Step>
              <Step n={6} title="Pedir Entrada (data)">
                <p>Tipo: <B>Data</B>. Pergunta: <C>Data</C>. Resposta Padrão: <B>Data Atual</B>.</p>
              </Step>
              <Step n={7} title="Formatar Data">
                <p>Data: a <B>Entrada Fornecida</B> do passo 6. Formato da Data: <B>Personalizado</B> → <C>yyyy-MM-dd</C>. Formato da Hora: <B>Nenhum</B>.</p>
              </Step>
              <Step n={8} title="Lista + Escolher da Lista (pagamento)">
                <p><B>Lista</B> com: <C>Débito</C> <C>Crédito</C> <C>Pix</C> <C>Dinheiro</C>. Depois <B>Escolher da Lista</B>, Pergunta: <C>Forma de pagamento</C>.</p>
              </Step>
              <Step n={9} title="Obter Conteúdo de URL (lança o gasto)">
                <p>URL: <B>Link para lançar gasto</B>. Método <B>POST</B>, cabeçalho <C>apikey</C> com a <B>Chave</B>.</p>
                <p>Corpo <B>JSON</B>, campos do tipo Texto:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><C>token</C> → seu código</li>
                  <li><C>valor</C> → Entrada Fornecida (passo 5)</li>
                  <li><C>data</C> → Data Formatada (passo 7)</li>
                  <li><C>categoria</C> → Item Escolhido (passo 4)</li>
                  <li><C>pagamento</C> → Item Escolhido (passo 8)</li>
                </ul>
              </Step>
              <Step n={10} title="Mostrar Notificação">
                <p>Texto: <B>Conteúdos da URL</B> do passo 9.</p>
              </Step>
            </ol>

            <SectionLabel color="emerald">Dentro de “Ganho”</SectionLabel>
            <ol className="space-y-4">
              <Step n={11} title="Pedir Entrada (valor)">
                <p>Tipo: <B>Número</B>. Pergunta: <C>Valor do ganho</C>. Ative <B>Permitir Decimais</B>.</p>
              </Step>
              <Step n={12} title="Pedir Entrada (data)">
                <p>Tipo: <B>Data</B>. Pergunta: <C>Data</C>. Resposta Padrão: <B>Data Atual</B>.</p>
                <p className="text-[12px]">Dica: segure as ações 6 e 7 do bloco Gasto → <B>Duplicar</B> e arraste as cópias para cá.</p>
              </Step>
              <Step n={13} title="Formatar Data">
                <p>Data: a <B>Entrada Fornecida</B> do passo 12. Personalizado → <C>yyyy-MM-dd</C>. Hora: <B>Nenhum</B>.</p>
              </Step>
              <Step n={14} title="Lista + Escolher da Lista (origem)">
                <p><B>Lista</B> com: <C>Salário</C> <C>Vale</C> <C>Freelancer</C> <C>Presente</C> <C>Outro</C>. Depois <B>Escolher da Lista</B>, Pergunta: <C>Origem</C>.</p>
              </Step>
              <Step n={15} title="Obter Conteúdo de URL (lança o ganho)">
                <p>URL: <B>Link para lançar ganho</B>. Método <B>POST</B>, cabeçalho <C>apikey</C> com a <B>Chave</B>.</p>
                <p>Corpo <B>JSON</B>, campos do tipo Texto:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li><C>token</C> → seu código</li>
                  <li><C>valor</C> → Entrada Fornecida (passo 11)</li>
                  <li><C>data</C> → Data Formatada (passo 13)</li>
                  <li><C>origem</C> → Item Escolhido (passo 14)</li>
                </ul>
              </Step>
              <Step n={16} title="Mostrar Notificação">
                <p>Texto: <B>Conteúdos da URL</B> do passo 15.</p>
              </Step>
            </ol>

            <SectionLabel>Por fim</SectionLabel>
            <ol className="space-y-4">
              <Step n={17} title="Ligar ao Toque Atrás">
                <p>Ajustes → Acessibilidade → Toque → <B>Toque Atrás</B> → <B>Toque Duplo</B> → escolha <B>Lançar</B>.</p>
              </Step>
            </ol>
          </div>

          <div className="rounded-xl border border-border p-3 text-[12px] text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground text-[13px]">Dicas</p>
            <p>• Teste primeiro tocando no atalho dentro do app Atalhos. Na primeira vez o iPhone pede permissão para acessar o site do Supabase: toque em <B>Permitir</B>.</p>
            <p>• Para pôr uma variável num campo, toque no campo e escolha na barra acima do teclado (ou em “Selecionar Variável”).</p>
            <p>• Já montou o atalho antigo, só de gastos? Adicione o <B>Escolher do Menu</B> no topo e arraste as ações que já existem para dentro do bloco <B>Gasto</B>.</p>
            <p>• Para a família: compartilhe o atalho pronto por link do iCloud. Cada pessoa troca o <C>token</C> pelo código dela (passos 3, 9 e 15).</p>
            <p>• O gasto aparece no app na hora em que você abrir ou voltar para ele.</p>
          </div>

          <details className="text-[12px] text-muted-foreground">
            <summary className="cursor-pointer font-semibold text-foreground text-[13px]">Exemplos do corpo JSON (para conferir)</summary>
            <pre className="mt-2 rounded-lg bg-secondary/60 p-3 overflow-x-auto text-[11px] text-foreground">{`{
  "token": "${tokenText}",
  "valor": "25,90",
  "data": "2026-11-23",
  "categoria": "Mercado",
  "pagamento": "Pix"
}`}</pre>
            <pre className="mt-2 rounded-lg bg-secondary/60 p-3 overflow-x-auto text-[11px] text-foreground">{`{
  "token": "${tokenText}",
  "valor": "4800",
  "data": "2026-11-05",
  "origem": "Salário"
}`}</pre>
          </details>
        </div>
      </SheetContent>
    </Sheet>
  );
}
