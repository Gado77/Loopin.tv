-- Adiciona campos de horário de funcionamento na tabela locations
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS business_hours_1_open TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS business_hours_1_close TIME DEFAULT '18:00',
ADD COLUMN IF NOT EXISTS business_hours_2_open TIME,
ADD COLUMN IF NOT EXISTS business_hours_2_close TIME,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo';

-- Comentários para documentação
COMMENT ON COLUMN public.locations.business_hours_1_open IS 'Horário de abertura do 1º turno (ex: 08:00)';
COMMENT ON COLUMN public.locations.business_hours_1_close IS 'Horário de fechamento do 1º turno (ex: 12:00)';
COMMENT ON COLUMN public.locations.business_hours_2_open IS 'Horário de abertura do 2º turno (ex: 14:00, pode ser NULL se não tem segundo turno)';
COMMENT ON COLUMN public.locations.business_hours_2_close IS 'Horário de fechamento do 2º turno (ex: 18:00)';
COMMENT ON COLUMN public.locations.timezone IS 'Timezone do local (padrão: America/Sao_Paulo)';
