# Atualização - Login e solicitação de acesso

## O que foi incluído

- Tela de login redesenhada com o logotipo oficial da Lucena.
- Personagem viajante na área institucional do login.
- Texto institucional mais direto e relacionado à rotina de Viagens.
- Botão de visualizar/ocultar senha.
- Link da Política de Viagens abrindo o PDF oficial em outra aba.
- Formulário público "Solicitar cadastro" para obras ainda sem acesso.
- Fila de solicitações de acesso disponível para Gestão de Viagens e Super Administrador.
- Dados do formulário público pré-preenchidos no cadastro de usuário.
- Seleção obrigatória de perfil, senha temporária e obra antes de liberar o usuário.
- Opção de rejeitar a solicitação de acesso.
- Alerta de solicitações pendentes nos painéis da Gestão e do Super Administrador.
- Gestão de Viagens continua sem visualizar usuários com perfil Super Administrador.

## SQL obrigatório

Execute no Supabase SQL Editor:

`supabase/migrations/20260723100000_0005_ACCESS_REQUESTS.sql`

Este SQL cria apenas a tabela `travel_app_access_requests` e não altera tabelas do Suprimentos.

## Deploy

1. Substitua os arquivos do repositório por esta versão.
2. Confirme as variáveis da Vercel já utilizadas pelo projeto.
3. Faça o redeploy sem utilizar o cache.
4. Teste a rota `/api/access-requests` com uma requisição GET: sem autenticação ela deve responder 401, e não 404.
