# Lucena — Gestão de Viagens

Sistema operacional para as obras solicitarem **passagem**, **hospedagem** ou **passagem + hospedagem**, com triagem, orçamento, compra e acompanhamento em uma única plataforma.

## Fluxo

`Pedido recebido → Em andamento → Orçado → Aprovado → Finalizado`

- **Solicitante:** solicita e acompanha seus pedidos.
- **Gestão de Viagens:** faz triagem, orçamento, compra e finalização; também cadastra usuários e obras.
- **Super Administrador:** acompanha tudo e mantém os cadastros.

## Regras de interface

- Pedido de **somente hospedagem** não exibe transporte, origem/destino, voo, ônibus ou bagagem.
- Pedido de **somente passagem** não exibe dados de hotel.
- Pedido de **passagem + hospedagem** reúne os dois blocos.
- A fila de atendimento é uma tabela no desktop e uma lista compacta no celular.
- Não existe menu de fornecedores nem menu separado de colaboradores.
- Os dados do viajante são preenchidos dentro da própria solicitação.
- O menu contém somente solicitar, acompanhar, triar/comprar, usuários, obras e política/ajuda conforme o perfil.

## Isolamento do Suprimentos

O aplicativo utiliza somente tabelas com prefixo `travel_app_*`.

O `auth.users` é compartilhado apenas para login. Ao remover alguém do sistema de Viagens, a API exclui **somente `travel_app_profiles`** e preserva a conta do Auth e qualquer acesso a outros sistemas.

## Banco de dados

Em uma instalação nova, execute os arquivos de `supabase/migrations` em ordem.

Em uma instalação que já recebeu as versões anteriores, confirme que foi executada a migração:

```text
supabase/migrations/20260722130000_0004_SIMPLIFY_TRAVEL_FLOW.sql
```

Esta versão do front-end não exige SQL adicional além dela.

Nunca execute os arquivos de:

```text
supabase/legacy_migrations_DO_NOT_RUN
```

## Variáveis da Vercel

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

A chave secreta deve existir somente na Vercel e nunca pode receber prefixo `VITE_`.

## Deploy

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Root Directory: vazio

Depois do envio ao GitHub, faça um novo deploy sem reutilizar o cache.

## API de usuários

As rotas abaixo ficam na pasta `api` da raiz:

```text
/api/admin/users
/api/create-user
```

Ao abrir `/api/create-user` diretamente no navegador, o retorno esperado é HTTP `405`, pois a criação de usuário aceita apenas `POST`.

## Validação desta entrega

Foram executados com sucesso:

```text
TypeScript: sem erros
ESLint: sem erros e sem avisos
Build Vite de produção: concluído
```
