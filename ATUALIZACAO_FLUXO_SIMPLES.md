# Atualização — Fluxo simples de Viagens

Esta revisão altera vários componentes, não somente o `index.html`.

Principais ajustes:
- Gestão de Viagens não visualiza o Super Administrador.
- Gestão de Viagens pode cadastrar usuários, obras e também criar solicitações.
- Obras permitidas são escolhidas no próprio cadastro/edição do usuário.
- Usuários são exibidos em lista, não em cartões.
- Removido o menu independente de Colaboradores.
- Dados de cada viajante são preenchidos dentro da solicitação, com múltiplos viajantes e anexos opcionais.
- Removida a opção isolada “Uniforme ou EPI” da bagagem.
- Fila de atendimento e painel do solicitante usam listas/tabelas.
- “Assumir atendimento” foi substituído por “Iniciar atendimento”.
- Jornada simplificada: Pedido recebido → Em andamento → Orçado → Aprovado → Finalizado, com Cancelado como exceção.
- Ao registrar a compra, podem ser informados companhia/empresa, voo/linha, localizador, bilhete, hotel, reserva e horários.
- O solicitante passa a consultar os dados finais da viagem na própria solicitação.

## SQL obrigatório
Execute após as migrações anteriores:

`supabase/migrations/20260722130000_0004_SIMPLIFY_TRAVEL_FLOW.sql`

Esse SQL altera somente tabelas `travel_app_*` e não toca no sistema de Suprimentos.
