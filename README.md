# Meu Bolso · Controle de Gastos

App de controle financeiro para a família, instalável no iPhone e no Android (PWA), com lançamento de gastos pelo **Toque Atrás** do iPhone. Tudo em serviços gratuitos: **Supabase** (banco e login) e **GitHub Pages** (hospedagem).

---

## Passo 1 · Criar o banco no Supabase

1. Entre em [supabase.com](https://supabase.com) e crie um projeto (plano Free). Escolha a região **South America (São Paulo)**.
2. No menu, abra **SQL Editor** → **New query**.
3. Copie todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**. Deve aparecer "Success".

### Configurar o login
Em **Authentication**:

- **Sign In / Providers → Email**: recomendo **desligar "Confirm email"**. O e-mail grátis do Supabase só envia poucos e-mails por hora, e com a confirmação ligada a família pode ficar travada no cadastro. Com ela desligada, a pessoa cria a conta e já entra.
- **URL Configuration**:
  - **Site URL**: o endereço do app (ex.: `https://meubolso.vercel.app/`)
  - **Redirect URLs**: adicione `https://meubolso.vercel.app/**`

### Pegar as chaves
Em **Project Settings → API Keys** (ou **Data API**), copie:
- a **Project URL** (ex.: `https://abcd1234.supabase.co`)
- a chave **publishable** (ou a **anon public**, em projetos antigos). Essa chave é pública: ela pode ficar no app. **Nunca** use a `service_role` / `secret`.

---

## Passo 2 · Publicar

### Vercel (endereço atual: https://meubolso.vercel.app)
1. Em [vercel.com](https://vercel.com), entre com o GitHub (plano Hobby, grátis).
2. **Add New → Project** → importe o repositório `meu-bolso`.
3. Nome do projeto: `meubolso`. O resto já vem certo (o arquivo [`vercel.json`](vercel.json) configura tudo). Clique em **Deploy**.
4. Cada push na `main` publica de novo sozinho.

### GitHub Pages (alternativa)

1. Crie um repositório no GitHub chamado `meu-bolso` e envie este código para ele.
2. No repositório: **Settings → Pages → Source: GitHub Actions**.
3. Coloque a Project URL e a chave publishable/anon no arquivo [`.env.production`](.env.production) (já preenchido neste projeto).
4. Em **Actions**, rode o workflow **Publicar app** (ou faça qualquer push na `main`).
5. Em 1 ou 2 minutos o app fica em `https://SEU-USUARIO.github.io/meu-bolso/`.

> **Quem é o admin?** A **primeira pessoa** a criar conta vira admin e pode ver os lançamentos de todos (menu → Usuários). Então crie a sua conta antes de passar o link para a família.

---

## Passo 3 · Instalar no celular

- **iPhone:** abra o link no **Safari** → botão **Compartilhar** → **Adicionar à Tela de Início**.
- **Android:** abra no **Chrome** → menu **⋮** → **Instalar app** (ou "Adicionar à tela inicial").

---

## Passo 4 · Atalho do iPhone (dois toques atrás)

No app: menu (botão **B**) → **Atalho do iPhone**. Lá tem:
- o botão para gerar o **código pessoal** de cada pessoa;
- os links e a chave para copiar;
- o passo a passo para montar o atalho no app **Atalhos** e ligar ao **Toque Atrás**.

Com dois toques aparece uma lista: **Gasto no Pix / Gasto no Débito / Gasto no Crédito / Gasto em Dinheiro / Ganho**. Depois vêm a categoria (ou a origem do ganho), o valor e a data, e uma notificação confirma: "✅ Gasto de R$ 25,90 em Mercado (23/11)".

O atalho tem 8 ações e usa um único endereço do banco (`/rest/v1/rpc/atalho`).

> Instalou o banco antes desta versão do atalho? Rode uma vez o arquivo [`supabase/atalho_simples.sql`](supabase/atalho_simples.sql) no SQL Editor.

---

## Extras

### Login com Google (opcional)
1. Configure o Google em **Supabase → Authentication → Sign In / Providers → Google** (o Supabase mostra o passo a passo do Google Cloud).
2. No arquivo `.env.production`, troque `VITE_GOOGLE_LOGIN=false` por `true` e publique de novo.

### Fatura do cartão (opcional, cada pessoa escolhe)
Menu **B** → **Fatura do cartão** → ligue **Organizar pela fatura** e escolha o dia de fechamento. O app passa a mostrar **faturas** em vez de meses: com fechamento no dia 16, a *Fatura dez* vai de 16/nov a 15/dez (compras no próprio dia do fechamento já entram na fatura seguinte).

Quando o banco fechar antes ou depois do dia padrão, toque em **Fechar fatura** (na fatura aberta) ou em **Fechou … · alterar** (nas fechadas) e escolha a data real. A fatura seguinte começa nesse dia.

> Instalou o banco antes desta opção existir? Rode uma vez o arquivo [`supabase/fatura.sql`](supabase/fatura.sql) no SQL Editor.

### Tornar outra pessoa admin
No **SQL Editor** do Supabase:
```sql
update public.profiles set role = 'admin' where email = 'pessoa@exemplo.com';
```

### Rodar no computador (para desenvolver)
```bash
npm install
cp .env.example .env   # e preencha as chaves
npm run dev
```

---

## O que mudou em relação à versão do Base44
- Banco e login no **Supabase**, com as mesmas regras: cada um vê só os próprios dados e o admin lê tudo.
- **Atalho do iPhone** lança direto no banco, sem precisar abrir o app.
- **Confirmação antes de excluir** gastos e receitas.
- Gastos fixos com **categoria** e com **início e fim**: encerrar um gasto não apaga o histórico dos meses anteriores.
- Valores aceitam **vírgula** (25,90), como no teclado do iPhone.
- Lixeira sempre visível no computador e no iPad.
- Telas de login em português.
