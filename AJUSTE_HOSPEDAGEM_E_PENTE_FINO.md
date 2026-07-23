# Ajuste do fluxo de hospedagem e pente-fino do solicitante

Esta atualização altera somente o front-end. Não há SQL novo.

## Hospedagem somente
- Não solicita origem, destino de passagem, transporte aéreo/rodoviário, período de voo ou bagagem.
- Solicita apenas obra, hóspede(s), finalidade, responsável interno, cidade da hospedagem, check-in, check-out, quantidade de hóspedes, preferência de localização, horário estimado de chegada, estacionamento, observações, adiantamento e anexos quando necessários.
- O prazo da política é calculado a partir do check-in.
- Não cria registro em `travel_app_segments` e não cria bagagem.

## Passagem
- Mantém trajeto, transporte, datas, flexibilidade e bagagem.

## Passagem + hospedagem
- Mantém trajeto e bagagem e adiciona os dados da hospedagem.

## Acompanhamento e triagem
- Pedidos de hospedagem aparecem como “Hospedagem em [cidade]”, com a data do check-in.
- A aba Trajeto não aparece em pedidos somente de hospedagem.
- A cotação de hospedagem é selecionada automaticamente para pedidos somente de hotel.
- Listas do solicitante e de próximas viagens foram adequadas para exibir hospedagens sem dados falsos de transporte.
