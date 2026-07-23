# Validação da versão estável

## Solicitação

- Passagem: exibe transporte e bagagem; não exibe hotel.
- Hospedagem: exibe somente hotel, hóspedes, check-in e check-out; não cria trecho nem bagagem.
- Passagem + hospedagem: exibe ambos os fluxos.
- Gestão de Viagens e Super Admin podem solicitar para qualquer obra ativa.
- Solicitantes visualizam somente as obras vinculadas ao próprio usuário.
- Dados do viajante são preenchidos no pedido; CPF e nascimento são exigidos apenas quando existe passagem.
- Prazos são calculados pela data da passagem ou pelo check-in, conforme o tipo.

## Gestão

- Fila ordenada pela data da viagem, depois por urgência.
- Desktop usa tabela; celular usa lista compacta.
- Processamento segue uma ação por etapa:
  1. Iniciar processamento
  2. Registrar orçamento
  3. Registrar compra
  4. Finalizar solicitação
- Formulário de compra mostra apenas campos compatíveis com o pedido.
- Ao registrar a compra e finalizar, o solicitante recebe notificação.

## Cadastros

- Usuários e obras são exibidos em linhas, não cartões.
- Gestão de Viagens não visualiza nem edita o Super Administrador.
- Obras permitidas são selecionadas dentro do cadastro do usuário.
- Exclusão remove apenas o perfil do módulo de Viagens e preserva o Auth compartilhado.

## Navegação

- Nenhum menu de fornecedores.
- Nenhum menu de colaboradores.
- Menus limitados às rotinas de solicitar, acompanhar, triar/comprar, cadastrar e consultar política.
