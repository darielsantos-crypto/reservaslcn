/*
# Lucena Travel Management — Seed Data

## Purpose
Populates policy_rules (configurable deadlines) and faq_items (initial FAQ)
with content from the Lucena travel policy. These are idempotent inserts using
ON CONFLICT clauses so re-running is safe.

## Tables affected
- policy_rules: inserts 6 deadline rules
- faq_items: inserts 11 FAQ entries across categories

## Notes
- No user-specific seed (worksites, travelers, users) — those are created at runtime
  via the app UI. The app will bootstrap a super admin profile on first sign-in if none exists.
*/

INSERT INTO policy_rules (rule_key, label, min_days, description) VALUES
  ('baixada_admissao_retorno_transferencia', 'Baixada, admissão, retorno ou transferência', 30, 'Baixadas, admissões, retornos e transferências devem ser solicitadas com pelo menos 30 dias corridos de antecedência.'),
  ('demais_nacionais', 'Demais viagens nacionais', 30, 'Demais viagens nacionais devem ser solicitadas com pelo menos 30 dias corridos de antecedência.'),
  ('internacional', 'Viagem internacional', 60, 'Viagens internacionais devem ser solicitadas com pelo menos 60 dias corridos de antecedência.'),
  ('diretoria_gerencias_nacional', 'Diretoria Executiva e Gerências — nacional', 15, 'Viagens da Diretoria Executiva e Gerências nacionais devem ser solicitadas com pelo menos 15 dias corridos de antecedência.'),
  ('diretoria_gerencias_internacional', 'Diretoria Executiva e Gerências — internacional', 30, 'Viagens da Diretoria Executiva e Gerências internacionais devem ser solicitadas com pelo menos 30 dias corridos de antecedência.'),
  ('adiantamento', 'Adiantamento', 7, 'O adiantamento deve ser solicitado preferencialmente junto com a viagem, com sete dias corridos de antecedência e, no mínimo, dois dias úteis antes da viagem.')
ON CONFLICT (rule_key) DO UPDATE
  SET label = EXCLUDED.label,
      min_days = EXCLUDED.min_days,
      description = EXCLUDED.description,
      updated_at = now();

INSERT INTO faq_items (category, question, answer, sort_order) VALUES
  ('prazos', 'Com quantos dias de antecedência devo solicitar?', 'Baixadas, admissões, retornos, transferências e demais viagens nacionais devem ser solicitadas com pelo menos 30 dias corridos. Viagens internacionais devem ser solicitadas com pelo menos 60 dias.', 1),
  ('prazos', 'Posso solicitar fora do prazo?', 'Sim. O sistema solicitará uma justificativa e o nome do responsável que orientou ou autorizou a demanda. A solicitação poderá ser atendida com opções limitadas ou custos maiores.', 2),
  ('baixada', 'Quem deve solicitar uma baixada?', 'A solicitação deve ser registrada pela administração ou gestão da obra após o alinhamento interno.', 3),
  ('terceiros', 'Posso solicitar viagem para terceiro?', 'Sim, desde que a autorização prévia da Diretoria Executiva já tenha sido obtida. O sistema deverá registrar a confirmação.', 4),
  ('hospedagem', 'Como solicito hospedagem?', 'A hospedagem deve ser informada na mesma solicitação da passagem, quando aplicável.', 5),
  ('hospedagem', 'Posso reservar hotel por conta própria?', 'Não, salvo autorização expressa.', 6),
  ('bagagem', 'Posso levar bagagem despachada?', 'Depende da duração e finalidade da viagem. Bagagem adicional, ferramentas, equipamentos, uniformes e EPIs devem ser informados antes da emissão.', 7),
  ('alteracoes', 'Quem faz alterações depois da emissão?', 'Após a emissão, remarcações, cancelamentos, bagagens e alterações devem ser tratadas conforme o canal da agência oficial configurado no sistema.', 8),
  ('passagem', 'Posso comprar nova passagem por conta própria?', 'Não, salvo autorização expressa.', 9),
  ('aeroporto', 'Quanto tempo antes devo chegar ao aeroporto?', 'Duas horas antes para voos nacionais e três horas antes para voos internacionais.', 10),
  ('adiantamento', 'Quando devo solicitar adiantamento?', 'Preferencialmente junto com a viagem, com sete dias corridos de antecedência e, no mínimo, dois dias úteis antes da viagem.', 11),
  ('prestacao_contas', 'Qual o prazo para prestação de contas?', 'Até dez dias corridos após o retorno.', 12)
ON CONFLICT DO NOTHING;
