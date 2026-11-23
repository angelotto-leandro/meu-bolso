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
        <code className={cn('flex-1 min-w-0 rounded-lg border border-border bg-card px-2.5 py-2 text-[11px] break-all', secret && 'font-semibold text-foreground')}>{value}</code>
        <Button type="button" variant="outline" size="icon" onClick={copy} className="shrink-0 h-auto w-10" aria-label={`Copiar ${label}`}>
          {copied ? <Check className="text-[#059669]" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

function Part({ n, title, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="label-eyebrow text-[#059669]">Parte {n}</span>
        <span className="font-display font-semibold text-sm text-foreground">{title}</span>
      </div>
      <ol className="space-y-3">{children}</ol>
    </section>
  );
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="w-6 h-6 rounded-full bg-[#059669] text-white text-xs font-bold grid place-items-center shrink-0 mt-0.5">{n}</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="text-[13px] text-muted-foreground space-y-1.5">{children}</div>
      </div>
    </li>
  );
}

const B = ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>;
const C = ({ children }) => <code className="px-1 py-0.5 rounded bg-secondary text-foreground text-[12px] whitespace-nowrap">{children}</code>;

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

  const urlAtalho = `${SUPABASE_URL}/rest/v1/rpc/atalho`;
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/30">
          {/* O que você vai copiar */}
          <div className="rounded-xl border border-[#059669]/25 bg-[#ECFDF5] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#059669]" />
              <p className="font-display font-semibold text-sm text-foreground">Você vai precisar destas 3 coisas</p>
            </div>
            <p className="text-[12px] text-muted-foreground">Toque no botão de copiar ao lado de cada uma quando o passo pedir.</p>

            {token ? (
              <>
                <CopyField label="1 · Seu código (aparece só agora)" value={token} secret />
                <p className="flex gap-1.5 text-[12px] text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Deixe esta tela aberta até terminar o atalho: por segurança o código não aparece de novo. Não envie para outras pessoas.
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <p className="label-eyebrow text-muted-foreground">1 · Seu código</p>
                <p className="text-[12px] text-muted-foreground">
                  {hasToken
                    ? 'Você já gerou um código antes. Se perdeu ou vai montar o atalho de novo, gere outro (o anterior para de funcionar).'
                    : 'Gere o código que liga o atalho à sua conta.'}
                </p>
                <Button onClick={generate} disabled={busy || hasToken === null} className="w-full bg-[#059669] hover:bg-[#047857]">
                  {busy && <Loader2 className="animate-spin" />} {hasToken ? 'Gerar novo código' : 'Gerar meu código'}
                </Button>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )}
            <CopyField label="2 · Link" value={urlAtalho} />
            <CopyField label="3 · Chave" value={SUPABASE_KEY} />
          </div>

          <p className="text-[12px] text-muted-foreground px-1">
            O atalho tem <B>8 ações</B>. Para adicionar cada uma: no app <B>Atalhos</B>, toque na barra <B>“Pesquisar Ações”</B> (embaixo), digite o nome e toque nela.
          </p>

          <Part n={1} title="A primeira pergunta">
            <Step n={1} title="Criar o atalho">
              <p>Abra o app <B>Atalhos</B> → toque no <B>+</B> (canto de cima). No topo, toque no nome e mude para <C>Lançar</C>.</p>
            </Step>
            <Step n={2} title="Ação “Lista”">
              <p>Pesquise <C>Lista</C> e adicione. Ela vem com 2 itens: troque o texto deles e toque em <B>+</B> até ficar com estes 5:</p>
              <p className="flex flex-wrap gap-1"><C>Gasto no Pix</C> <C>Gasto no Débito</C> <C>Gasto no Crédito</C> <C>Gasto em Dinheiro</C> <C>Ganho</C></p>
            </Step>
            <Step n={3} title="Ação “Escolher da Lista”">
              <p>Pesquise e adicione. Ela já vem ligada à Lista de cima, não precisa mexer.</p>
            </Step>
          </Part>

          <Part n={2} title="Buscar as categorias">
            <Step n={4} title="Ação “Obter Conteúdo de URL”">
              <p>Pesquise e adicione. Toque em <B>URL</B> e cole o <B>Link</B> (item 2 lá de cima).</p>
              <p>Toque na setinha <B>›</B> da ação para abrir as opções:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><B>Método:</B> troque para <C>POST</C></li>
                <li><B>Cabeçalhos:</B> toque em <B>Adicionar novo cabeçalho</B>. Chave: <C>apikey</C> · Texto: cole a <B>Chave</B> (item 3)</li>
                <li><B>Corpo da Solicitação:</B> deixe <C>JSON</C>. Toque em <B>Adicionar novo campo → Texto</B> duas vezes:</li>
              </ul>
              <div className="rounded-lg bg-secondary/60 p-2.5 space-y-1 text-[12px]">
                <p><C>token</C> → cole o seu <B>código</B> (item 1)</p>
                <p><C>tipo</C> → toque no espaço do valor e escolha <B>Item Escolhido</B> na barra acima do teclado</p>
              </div>
            </Step>
            <Step n={5} title="Ação “Escolher da Lista” (de novo)">
              <p>Adicione outra <B>Escolher da Lista</B>. Ela já vem ligada a <B>Conteúdos da URL</B>, que é a lista de categorias.</p>
            </Step>
          </Part>

          <Part n={3} title="Valor e data">
            <Step n={6} title="Ação “Pedir Entrada” (valor)">
              <p>Adicione. Toque em <B>Texto</B> e troque para <C>Número</C>. Em Pergunta escreva <C>Valor</C>.</p>
              <p>Toque na setinha <B>›</B> e ligue <B>Permitir Decimais</B>.</p>
            </Step>
            <Step n={7} title="Ação “Pedir Entrada” (data)">
              <p>Adicione outra. Troque o tipo para <C>Data</C>. Pergunta: <C>Data</C>.</p>
              <p>Na setinha <B>›</B>, em Resposta Padrão escolha <B>Data Atual</B>. Assim, se for hoje, é só tocar em OK.</p>
            </Step>
          </Part>

          <Part n={4} title="Salvar no app">
            <Step n={8} title="Duplicar a ação do passo 4">
              <p>Volte na ação <B>Obter Conteúdo de URL</B> (passo 4), <B>segure o dedo</B> nela → <B>Duplicar</B>. Arraste a cópia para o <B>final</B> do atalho.</p>
              <p>Na cópia, adicione mais 3 campos de Texto no corpo JSON:</p>
              <div className="rounded-lg bg-secondary/60 p-2.5 space-y-1 text-[12px]">
                <p><C>item</C> → <B>Item Escolhido</B> da <B>segunda</B> lista (passo 5)</p>
                <p><C>valor</C> → <B>Entrada Fornecida</B> do <B>valor</B> (passo 6)</p>
                <p><C>data</C> → <B>Entrada Fornecida</B> da <B>data</B> (passo 7)</p>
              </div>
              <p className="text-[12px]">
                Como escolher a variável certa: toque no espaço do valor → <B>Selecionar Variável</B> → a tela volta para o atalho → <B>toque na bolinha</B> de resultado da ação certa.
              </p>
            </Step>
            <Step n={9} title="Ação “Mostrar Notificação”">
              <p>Adicione no final. Ela já vem com <B>Conteúdos da URL</B>, que é a mensagem “✅ Gasto de R$ ...”.</p>
            </Step>
          </Part>

          <Part n={5} title="Ligar aos dois toques">
            <Step n={10} title="Testar">
              <p>Toque no <B>▶</B> (canto de baixo) para testar. Na primeira vez o iPhone pergunta se pode acessar o Supabase: toque em <B>Permitir Sempre</B>.</p>
            </Step>
            <Step n={11} title="Toque Atrás">
              <p>Ajustes → Acessibilidade → Toque → <B>Toque Atrás</B> → <B>Toque Duplo</B> → role até <B>Lançar</B>.</p>
            </Step>
          </Part>

          <div className="rounded-xl border border-border bg-card p-3 text-[12px] text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground text-[13px]">Se der erro</p>
            <p>• A notificação diz o que houve: “Código inválido” = o código foi digitado errado ou foi trocado.</p>
            <p>• Se a lista de categorias vier vazia ou estranha, confira o <B>Método POST</B> e o cabeçalho <C>apikey</C> no passo 4.</p>
            <p>• Para a família: compartilhe o atalho pronto por link do iCloud. Cada pessoa gera o código dela e troca o campo <C>token</C> nas duas ações “Obter Conteúdo de URL”.</p>
          </div>

          <details className="text-[12px] text-muted-foreground px-1">
            <summary className="cursor-pointer font-semibold text-foreground text-[13px]">Como deve ficar o corpo JSON (para conferir)</summary>
            <p className="mt-2">Passo 4:</p>
            <pre className="mt-1 rounded-lg bg-card border border-border p-3 overflow-x-auto text-[11px] text-foreground">{`{
  "token": "${tokenText}",
  "tipo": [Item Escolhido]
}`}</pre>
            <p className="mt-2">Passo 8:</p>
            <pre className="mt-1 rounded-lg bg-card border border-border p-3 overflow-x-auto text-[11px] text-foreground">{`{
  "token": "${tokenText}",
  "tipo": [Item Escolhido — 1ª lista],
  "item": [Item Escolhido — 2ª lista],
  "valor": [Entrada Fornecida — valor],
  "data": [Entrada Fornecida — data]
}`}</pre>
          </details>
        </div>
      </SheetContent>
    </Sheet>
  );
}
