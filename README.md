# Lucena — Gestão de Viagens

Sistema simples para as obras solicitarem passagem, hospedagem ou ambos, e para a Gestão de Viagens organizar a cotação, compra, anexos e andamento.

## O sistema não possui cadastro de fornecedores
A companhia aérea, empresa rodoviária, hotel ou agência é informada diretamente no atendimento da solicitação, quando necessário. Não existe menu nem tabela de fornecedores no aplicativo.

## Perfis
- Solicitante: cria e acompanha solicitações.
- Gestão de Viagens: recebe a fila, registra cotação/compra e finaliza. Pode cadastrar usuários, mas não excluir.
- Super Administrador: acompanha tudo e mantém obras, usuários, regras e configurações.

## Banco isolado
O aplicativo utiliza apenas tabelas `travel_app_*` e não consulta nem altera as tabelas do sistema de Suprimentos. O único recurso compartilhado é `auth.users`, para login.

## Migrações
Execute os arquivos de `supabase/migrations` em ordem. Se as duas primeiras já foram executadas, execute apenas:

`20260722100000_0003_REMOVE_SUPPLIERS_MODULE.sql`

## Deploy
- Framework: Vite
- Build: `npm run build`
- Saída: `dist`
- Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.


## API de cadastro de usuários na Vercel

O projeto inclui as rotas `/api/admin/users` e `/api/create-user` (compatibilidade). Configure em **Vercel > Settings > Environment Variables**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Depois faça um novo deploy sem cache. Ao abrir `/api/create-user` pelo navegador, o retorno esperado é HTTP 405 (Método não permitido), confirmando que a função foi publicada.

## Atualização do fluxo simplificado
Após as migrações anteriores, execute também:

`supabase/migrations/20260722130000_0004_SIMPLIFY_TRAVEL_FLOW.sql`

Ela simplifica a jornada para Pedido recebido → Em andamento → Orçado → Aprovado → Finalizado, impede a Gestão de Viagens de visualizar o Super Administrador e acrescenta os campos de voo/horários na compra. Não altera nenhuma tabela do Suprimentos.
