# Loopin.tv - Digital Signage System

## Overview

Loopin.tv is a digital signage platform that allows businesses to manage and display content on multiple TV screens (Android devices). The system consists of:

- **Admin Panel (Web)**: Where administrators manage screens, playlists, and content
- **Android App**: The player that runs on Android TV boxes, downloading and displaying content
- **Backend**: Node.js/Express API
- **Database**: Supabase (PostgreSQL)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | JavaScript, HTML, CSS |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Android | Kotlin, OkHttp, ExoPlayer |
| File Storage | Supabase Storage |

## Project Structure

```
Loopin.tv-main/
├── frontend/           # Web admin panel
│   └── src/screens/   # Screen management module
├── backend/           # Node.js API (if exists)
├── Android/           # Android TV app
│   └── app/src/main/java/com/loopin/loopintv/
│       ├── MainActivity.kt      # Main player activity
│       ├── SupabaseManager.kt   # Database communication
│       ├── SupabaseConfig.kt    # API keys and config
│       └── WatchdogService.kt   # Background service
├── sql/               # SQL migration files for Supabase
└── AGENTS.md         # This file
```

## Key Files

### Android App

- **MainActivity.kt**: The main player that handles playlist playback, screen orientation, and content display
- **SupabaseManager.kt**: Handles all communication with Supabase (fetching playlists, sending pings, etc.)
- **SupabaseConfig.kt**: Contains the Supabase URL and API keys (DO NOT commit real keys)

### Frontend

- **screens.js**: Screen management logic including the diagnostic modal and refresh functionality
- **screens.html**: HTML template with the diagnostic modal
- **screens.css**: Styles for the diagnostic modal

### Database Tables

- **screens**: Stores TV devices with their device_id, settings, and current status
- **playlists**: Contains playlist configurations
- **playlist_items**: Links playlists to campaigns and widgets
- **campaigns**: Media files (images, videos)
- **dynamic_contents**: Widgets (text, weather, HTML)
- **playback_logs**: Tracks campaign playback for reporting
- **screen_commands**: Remote commands for player control (refresh, restart)

## Common Workflows

### Adding Remote Control Feature (Refresh/Restart)

1. **SQL**: Add columns to track player status in `screens` table
2. **SQL**: Create `screen_commands` table for storing commands
3. **Android**: Add `fetchPendingCommand()` and `executeCommand()` functions to SupabaseManager
4. **Android**: Add command polling loop in MainActivity
5. **Frontend**: Add diagnostic modal with "Forçar Refresh" button
6. **Frontend**: Create command in `screen_commands` table when button clicked

### Important Notes for Agents

#### PowerShell String Interpolation
When writing Kotlin files via PowerShell, use single-quoted here-strings:
```powershell
@'\n...\n'@ | Out-File -FilePath "file.kt" -Encoding UTF8
```
This prevents `$` characters from being interpreted as PowerShell variables.

#### File Encoding Issues
The codebase uses UTF-8 encoding. Special characters (accents like `ã`, `é`, `ç`) are used in comments and some text. Always specify `-Encoding UTF8` when writing files.

#### Android Edit Tool
The Edit tool sometimes fails with "File has not been read yet" errors. If this happens:
1. Read the file first with the Read tool
2. If still failing, use Bash with PowerShell to make the change

#### Backup Location
Android Studio backup: `C:\\Users\\itach\\AndroidStudioProjects\\LoopinTV`

#### Building Android
Use Android Studio or Gradle:
```bash
cd Android && ./gradlew assembleDebug
```

## Database Schema Notes

### Screens Table
The `screens` table uses `device_id` for device identification (the pairing code shown on screen). When a device registers, it creates a row with its device_id.

### Command Execution Flow
1. Admin clicks "Forçar Refresh" in web panel
2. Frontend creates entry in `screen_commands` table
3. Android app polls for pending commands (every 10 seconds)
4. When command found, executes it (reload/restart)
5. Android marks command as executed

## Supabase API Patterns

### Fetching Data
Supabase REST API uses GET requests with query parameters:
```
/screens?device_id=eq.TELA-ABC123&select=id,user_id
```

### Updating Data
PATCH requests update rows:
```
/screens?device_id=eq.TELA-ABC123
Body: {"status": "online"}
```

### Inserting Data
POST requests insert rows:
```
/playback_logs
Body: {"screen_id": "...", "campaign_id": "..."}
```

## Important Configuration

### SupabaseConfig.kt
Contains sensitive data - never commit real values:
- `URL`: Supabase project URL
- `API_KEY`: Supabase anon key

## Testing Checklist

When adding new features:

- [ ] Rebuild Android app after code changes
- [ ] Test pairing process
- [ ] Test content playback
- [ ] Test remote commands (refresh/restart)
- [ ] Verify database updates
- [ ] Check Logcat for errors on Android

## Contact

For questions about this project, contact the development team.

---

## ⚠️ Importante para Agentes e Usuários ⚠️

Este projeto é frequentemente utilizado e mantido por pessoas que NÃO são desenvolvedoras profissionais, muitas vezes contando apenas com a ajuda de IA para implementar, debugar e operar o sistema. Portanto, toda explicação, guia e automação deve ser:
- Didática e passo a passo, evitando jargões e suposições de experiência prévia;
- Preferencialmente acompanhada de exemplos práticos e verificações;
- Robusta a erros comuns de configuração e permissões;
- Sempre assumir que o operador pode precisar de instruções detalhadas sobre como acessar logs, consultar IDs ou testar endpoints, mesmo tarefas consideradas "básicas" para devs.

Agentes: priorizem clareza, redundância em instruções e ofereçam caminhos alternativos sempre que surgirem dúvidas técnicas.
