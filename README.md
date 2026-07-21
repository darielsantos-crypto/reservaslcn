# Sistema de Gestão de Viagens — Lucena Infraestrutura

Sistema web completo para gestão de solicitações e compras de viagens corporativas da Lucena Infraestrutura. Permite que solicitantes registrem pedidos de passagem e hospedagem, que a Gestão de Viagens realize cotações, negociações e compras, e que o Super Administrador acompanhe toda a operação.

## Características principais

- **Solicitação assistida em etapas** — wizard de 9 passos com salvamento automático, barra de progresso e poucos campos por tela.
- **Verificação automática da Política de Viagens** — cálculo de prazos, sinalizações (verde/amarelo/vermelho), justificativas obrigatórias para pedidos fora do prazo e confirmação de autorização prévia para terceiros.
- **Sem fluxo de aprovação** — a solicitação é registrada após orientação prévia do gestor; o sistema apenas registra confirmações e justificativas.
- **Painéis por perfil** — Solicitante, Gestão de Viagens e Super Administrador, cada um com navegação e permissões próprias.
- **Cotação, negociação e compra** — registro completo de cotações (aérea/rodoviária/hospedagem), negociações com cálculo de economia e compras com localizadores e bilhetes.
- **Anexos com liberação** — a Gestão de Viagens decide quais anexos ficam visíveis ao Solicitante.
- **Histórico e auditoria** — registro imutável de todas as ações e mudanças de status.
- **Notificações internas** — alertas para Solicitante e Gestão em eventos-chave.
- **Relatórios com exportação CSV** — filtros por finalidade, status, prazo e obra.
- **Responsivo** — funciona em celular, tablet e desktop, com menu inferior no mobile e sidebar no desktop.

## Perfis de acesso

| Perfil | O que faz |
|---|---|
| **Solicitante** | Cria solicitações, acompanha o andamento, responde pendências, acessa a política e FAQ. |
| **Gestão de Viagens** | Visualiza todas as solicitações, assume atendimento, registra cotações/negociações/compras, gerencia colaboradores, usuários, obras e fornecedores. |
| **Super Administrador** | Tudo da Gestão + regras de prazo, finalidades, FAQ, auditoria, configurações e exclusão de usuários. |

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- lucide-react para ícones

## Como executar localmente

```bash
npm install
npm run dev
```

Acesse o endereço exibido no terminal. O Supabase já está provisionado — as credenciais estão em `.env`.

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

## Estrutura do banco

As migrações (aplicadas via Supabase MCP) criam:

- `profiles` — usuários com perfil (solicitante / gestao_viagens / super_admin)
- `worksites` — obras com código, centro de custo e gestor
- `user_worksites` — vínculo many-to-many usuário↔obra
- `travelers` — colaboradores viajantes (CPF e nascimento protegidos)
- `suppliers` — fornecedores e agências
- `policy_rules` — prazos configuráveis por tipo de viagem
- `faq_items` — perguntas frequentes
- `travel_requests` — solicitações (status, tipo, finalidade, prazo, justificativa)
- `travel_request_travelers` — viajantes por solicitação
- `travel_segments` — trechos (origem, destino, datas, transporte)
- `accommodations` — hospedagem (diárias calculadas automaticamente)
- `baggage_requests` — bagagem especial
- `advance_requests` — adiantamento
- `quotations` — cotações (aérea/rodoviária/hospedagem)
- `negotiations` — negociações com economia calculada
- `purchases` — compras registradas
- `attachments` — anexos com flag `released`
- `comments` — pendências e mensagens
- `status_history` — histórico de status (append-only)
- `audit_logs` — auditoria imutável
- `notifications` — notificações internas

Todas as tabelas têm **Row Level Security** habilitada com políticas por perfil e por propriedade.

## Padrões da Política de Viagens

| Tipo de viagem | Antecedência mínima |
|---|---|
| Baixada, admissão, retorno ou transferência | 30 dias |
| Demais viagens nacionais | 30 dias |
| Viagem internacional | 60 dias |
| Diretoria e Gerências — nacional | 15 dias |
| Diretoria e Gerências — internacional | 30 dias |
| Emergencial | assim que identificada |

Os prazos são editáveis pelo Super Administrador em **Regras e prazos**.

## Status do processo

Rascunho · Enviada · Aguardando atendimento · Em análise · Aguardando informações · Em orçamento · Em negociação · Em compra · Compra realizada · Finalizada · Não atendida · Cancelada

## Deploy na Vercel

1. Conecte o repositório à Vercel.
2. Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Build command: `npm run build` · Output directory: `dist`.

## Primeiro acesso — criar o Super Administrador

1. No Supabase, abra **SQL Editor** e execute, na ordem, todos os arquivos de `supabase/migrations/`.
2. Depois, acesse **Authentication → Users → Add user → Create new user**.
3. Cadastre o e-mail e uma senha do primeiro administrador. Marque o e-mail como confirmado.
4. Volte ao **SQL Editor** e execute, trocando pelo e-mail cadastrado:

```sql
select public.bootstrap_first_super_admin('seuemail@lucena.com.br');
```

5. Entre no sistema com esse e-mail e senha.
6. Acesse **Usuários → Novo usuário** para cadastrar os demais acessos e escolher o perfil.

A função de bootstrap só funciona enquanto ainda não existir nenhum Super Administrador.

## Variáveis na Vercel

Cadastre em **Project Settings → Environment Variables**:

```text
VITE_SUPABASE_URL=https://vxwlzfidbcdzdusenxns.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_URL=https://vxwlzfidbcdzdusenxns.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

`SUPABASE_SERVICE_ROLE_KEY` é usada somente pela função de servidor `/api/admin/users` para criar e excluir usuários no Supabase Auth. Nunca use o prefixo `VITE_` nessa chave e nunca a envie ao GitHub.

## Cadastro dos demais usuários

Depois do primeiro acesso como Super Administrador:

1. Abra **Usuários**.
2. Clique em **Novo usuário**.
3. Informe nome, e-mail, senha temporária e perfil.
4. Salve.
5. Vincule o usuário a uma ou mais obras pelo botão **Obras**.

A Gestão de Viagens pode criar Solicitantes e usuários de Gestão. Somente o Super Administrador pode criar outro Super Administrador ou excluir uma conta.

## Reparo de autenticação para banco Lucena já existente

Este projeto contém a migração:

```text
supabase/migrations/20260721220000_0007_auth_profiles_compatibility.sql
```

Ela adapta a tabela `public.profiles` legada, que usa colunas como `name`, `login`, `matricula`, `job_title` e `password_hash`, ao Supabase Authentication sem apagar as colunas antigas e sem utilizar `password_hash` para login.

### Aplicação imediata

1. No Supabase, abra **SQL Editor → New query**.
2. Cole e execute todo o conteúdo de:

```text
supabase/migrations/20260721220000_0007_auth_profiles_compatibility.sql
```

3. Em seguida, execute:

```sql
SELECT public.bootstrap_first_super_admin('administrador@lucena.com.br');
```

4. Confirme o vínculo:

```sql
SELECT
  u.id AS auth_id,
  u.email AS auth_email,
  p.id AS profile_id,
  p.name,
  p.full_name,
  p.role,
  p.active
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('administrador@lucena.com.br');
```

O resultado deve apresentar `auth_id` igual a `profile_id`, usuário ativo e papel equivalente a Super Administrador.

### Regra de segurança

- A senha é validada exclusivamente pelo Supabase Auth.
- A coluna legada `password_hash` não é usada pelo sistema de viagens.
- A chave `SUPABASE_SERVICE_ROLE_KEY` fica somente na Vercel.
- Nunca use uma chave secreta em variável iniciada por `VITE_`.
