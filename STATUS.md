# 📺 Loopin.tv — Status do Projeto

> Última atualização: 03/04/2026

---

## ✅ O que já está PRONTO e funcionando

### Sistema Base
- [x] Login/Autenticação com Supabase Auth
- [x] Dashboard com KPIs (telas ativas, playlists, campanhas, locais)
- [x] Gerenciamento de Telas (CRUD completo)
- [x] Gerenciamento de Locais
- [x] Gerenciamento de Anunciantes
- [x] Gerenciamento de Campanhas (upload de mídia)
- [x] Gerenciamento de Playlists (drag & drop de ordem)
- [x] Conteúdo Dinâmico (texto, clima, HTML)
- [x] Relatórios básicos de veiculação
- [x] Sidebar responsiva com menu mobile
- [x] Multi-usuário isolado (cada login vê só seus dados)

### Player Android
- [x] Pareamento por código (TELA-XXXXXX)
- [x] Download e cache de mídia (com limite de 500MB)
- [x] Reprodução de playlists (imagem, vídeo, widgets)
- [x] Suporte a orientação (landscape/portrait)
- [x] Ping de status a cada 30 segundos
- [x] WatchdogService para manter o app rodando

### Monitoramento e Controle Remoto (implementado em 03/04/2026)
- [x] Coluna "Reproduzindo Agora" na lista de telas
- [x] Modal de Diagnóstico expandido (cache, itens da playlist, conteúdo atual)
- [x] Comandos remotos: **Reiniciar**, **Pausar/Retomar**, **Forçar Atualização**
- [x] Modo Manutenção e mudança de orientação remota
- [x] Visualizador de Logs do Player (tabela `player_logs`)
- [x] Preview visual da Playlist no modal de edição
- [x] Sistema de Alertas no Dashboard (telas offline, playlists vazias, campanhas vencendo)

### Infraestrutura
- [x] Deploy automático no Vercel (branch `main`)
- [x] Banco de dados Supabase com RLS configurado
- [x] Tabelas: screens, playlists, playlist_items, campaigns, dynamic_contents, locations, advertisers, playback_logs, screen_commands, player_logs

---

## 🔜 Próximos Passos (por prioridade)

### 1. 📊 Relatório de Prova de Veiculação (PRIORIDADE ALTA)
**Por quê:** É o que permite cobrar mais dos anunciantes.
- [ ] Página de relatório com gráficos (horas exibidas, impressões, telas ativas)
- [ ] Filtro por período, campanha e tela
- [ ] Botão "Exportar PDF" para enviar ao anunciante
- [ ] Já temos os dados em `playback_logs` — só falta a interface

### 2. 📅 Agendamento de Conteúdo (PRIORIDADE ALTA)
**Por quê:** Diferencial competitivo. "Esse anúncio só roda das 8h às 18h, de segunda a sexta."
- [ ] Tabela `campaign_schedules` com horários por dia da semana
- [ ] Lógica no player para verificar horários antes de exibir
- [ ] Interface no painel para configurar horários por campanha

### 3. 📱 Notificação WhatsApp (PRIORIDADE MÉDIA)
**Por quê:** Monitoramento passivo — você não precisa ficar olhando o painel.
- [ ] Tabela `screen_schedules` com horário comercial de cada TV
- [ ] Supabase Edge Function (roda a cada 5 min via pg_cron)
- [ ] Integração com API WhatsApp (Z-API, Evolution API ou Twilio)
- [ ] Alertas: TV offline no horário comercial, TV online fora do horário
- [ ] Alertas: Campanha vencendo em 3 dias
- [ ] Alertas futuros: Mensalidade vencendo
- [ ] Tabela `notifications_log` para evitar spam

### 4. 🔄 Auto-Recovery do Player (PRIORIDADE MÉDIA)
**Por quê:** Reduz chamados de suporte em 80%.
- [ ] Se app travar, reiniciar sozinho (WatchdogService melhorado)
- [ ] Se perder internet, usar cache offline
- [ ] Se playlist estiver vazia, mostrar conteúdo padrão/logo
- [ ] Reconexão automática com retry exponencial

### 5. 💰 Painel Financeiro / Mensalidades (FUTURO)
**Por quê:** Controlar cobrança por TV por cliente.
- [ ] Tabela `subscriptions` (cliente, valor, vencimento, status)
- [ ] Dashboard financeiro (MRR, inadimplentes, previsão)
- [ ] Notificação de vencimento (email + WhatsApp)
- [ ] Bloqueio automático se mensalidade vencer

### 6. 👥 Admin Master / Multi-Nível (FUTURO)
**Por quê:** Quando tiver muitos clientes, precisa de visão global.
- [ ] Painel admin que vê TODOS os clientes e suas telas
- [ ] Permissões por nível (admin, operador, visualizador)
- [ ] Impersonar login do cliente para suporte remoto

---

## 🗂️ Estrutura do Projeto

```
Loopin.tv-main/
├── frontend/              ← Painel web (Vercel)
│   ├── login.html         ← Tela de login
│   └── src/
│       ├── shared/        ← CSS, JS, sidebar compartilhados
│       ├── dashboard/     ← Dashboard com KPIs e alertas
│       ├── screens/       ← Gerenciamento de telas + diagnóstico
│       ├── locations/     ← Cadastro de locais
│       ├── advertisers/   ← Cadastro de anunciantes
│       ├── campaigns/     ← Gerenciamento de campanhas
│       ├── playlists/     ← Gerenciamento de playlists
│       ├── reports/       ← Relatórios de veiculação
│       └── settings/      ← Configurações
├── Android/               ← App player para TV box
│   └── app/src/main/java/com/loopin/loopintv/
│       ├── MainActivity.kt        ← Player principal
│       ├── SupabaseManager.kt     ← Comunicação com banco
│       ├── SupabaseConfig.kt      ← Chaves de API
│       └── WatchdogService.kt     ← Serviço de background
├── sql/                   ← Scripts SQL para Supabase
│   ├── add_monitoring_columns.sql
│   ├── add_screen_commands.sql
│   ├── create_player_logs.sql
│   └── fix_screen_commands_rls.sql
├── AGENTS.md              ← Instruções para agentes de IA
├── STATUS.md              ← ESTE ARQUIVO
└── vercel.json            ← Config de deploy
```

---

## 🔑 Acessos Importantes

| Serviço | URL |
|---------|-----|
| **Painel Web (produção)** | https://goloopin.vercel.app |
| **Supabase Dashboard** | https://supabase.com/dashboard (projeto sxsmirhqbslmvyesikgg) |
| **GitHub** | https://github.com/Gado77/Loopin.tv |
| **Vercel** | Dashboard do Vercel (deploy automático via GitHub) |

---

## 📝 Notas para Desenvolvedores / Agentes IA

1. **PowerShell**: Usar aspas simples para strings Kotlin. `&&` não funciona em PS, usar `;` ou comandos separados.
2. **RLS no Supabase**: O player Android usa a **anon key** (não é usuário autenticado). Policies que usam `auth.uid()` bloqueiam o player. Usar `WITH CHECK (true)` para INSERT do player.
3. **Deploy**: Push na branch `main` → Vercel detecta e faz deploy automático. Root directory no Vercel = `frontend`.
4. **Android Build**: Usar Android Studio ou `./gradlew assembleDebug`. Pasta do projeto: `Android/`.
5. **Encoding**: Projeto usa UTF-8. Sempre especificar `-Encoding UTF8` ao escrever arquivos via PS.
