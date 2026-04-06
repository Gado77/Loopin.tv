-- Função que marca campanhas vencidas como 'completed'
CREATE OR REPLACE FUNCTION mark_expired_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET status = 'completed'
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cria um trigger que roda todo dia à meia-noite
-- OBS: Supabase free tier não suporta pg_cron nativamente
-- Solução: Agendar via Supabase Dashboard > Database > Extensions > pg_cron
-- Ou usar Edge Function como替代

-- Para ativar o pg_cron no Supabase, rode:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendamento: todo dia às 00:05
-- SELECT cron.schedule('mark-expired-campaigns', '5 0 * * *', 'SELECT mark_expired_campaigns()');
