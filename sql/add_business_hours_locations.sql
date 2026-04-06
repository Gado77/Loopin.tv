-- Adiciona campos de horário de funcionamento na tabela locations
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo';

COMMENT ON COLUMN public.locations.business_hours IS 'Horários por dia da semana em formato JSON';
COMMENT ON COLUMN public.locations.timezone IS 'Timezone do local (padrão: America/Sao_Paulo)';
