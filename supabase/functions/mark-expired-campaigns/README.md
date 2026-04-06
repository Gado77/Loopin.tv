# Auto-Pause de Campanhas Expiradas

## O que faz?
Quando a data de fim de uma campanha é ultrapassada, automaticamente seu status muda de `active` para `completed`.

## Opções de Implementação

### Opção 1: Edge Function (Recomendado - funciona no free tier)

1. **Deploy da Edge Function**
   ```bash
   cd supabase/functions/mark-expired-campaigns
   supabase functions deploy mark-expired-campaigns
   ```

2. **Testar manualmente**
   ```bash
   supabase functions invoke mark-expired-campaigns
   ```

3. **Agendar no Supabase Dashboard**
   - Vá em: **Database > Scheduling**
   - Ou use um serviço externo como cron-job.org para chamar a URL da função a cada 1 hora

4. **URL da função** (após deploy)
   ```
   https://[seu-projeto].supabase.co/functions/v1/mark-expired-campaigns
   ```

### Opção 2: pg_cron (requer Supabase Pro)

1. **Ativar extensão**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. **Agendar**
   ```sql
   SELECT cron.schedule('mark-expired-campaigns', '0 0 * * *', 'SELECT mark_expired_campaigns()');
   ```

3. **Verificar**
   ```sql
   SELECT * FROM cron.job;
   ```

## Testar Localmente

1. Crie uma campanha com `end_date` no passado
2. Status deve estar `active`
3. Execute a função/cron
4. Status deve mudar para `completed`

## Verificação Manual

```sql
-- Campanhas que deveriam estar como completed mas ainda estão active
SELECT id, name, end_date, status
FROM campaigns
WHERE status = 'active' AND end_date < CURRENT_DATE;
```
