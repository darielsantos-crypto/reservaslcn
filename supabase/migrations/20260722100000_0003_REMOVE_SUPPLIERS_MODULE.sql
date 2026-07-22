-- Remove o cadastro de fornecedores SOMENTE do aplicativo de viagens.
-- Não toca em public.suppliers, lucena_suppliers ou qualquer tabela do Suprimentos.

BEGIN;

-- A aplicação passa a registrar companhia/agência diretamente na cotação/compra,
-- sem manter um cadastro separado de fornecedores.
ALTER TABLE IF EXISTS public.travel_app_quotations
  DROP CONSTRAINT IF EXISTS travel_app_quotations_supplier_id_fkey;
ALTER TABLE IF EXISTS public.travel_app_quotations
  DROP COLUMN IF EXISTS supplier_id;

ALTER TABLE IF EXISTS public.travel_app_purchases
  DROP CONSTRAINT IF EXISTS travel_app_purchases_supplier_id_fkey;
ALTER TABLE IF EXISTS public.travel_app_purchases
  DROP COLUMN IF EXISTS supplier_id;

DROP TABLE IF EXISTS public.travel_app_suppliers CASCADE;

COMMIT;
