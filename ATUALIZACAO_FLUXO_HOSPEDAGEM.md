# Ajuste do fluxo de hospedagem

Esta versão mantém o banco atual e altera somente o front-end.

- Solicitação somente de hospedagem não exibe trajeto, transporte ou bagagem.
- O prazo é calculado pela data de check-in.
- Não é criado registro em `travel_app_segments` para hospedagem isolada.
- Filas, painéis e detalhes exibem a cidade da hospedagem e o check-in quando não existe trecho.
- Passagem e passagem + hospedagem continuam com transporte e bagagem.
