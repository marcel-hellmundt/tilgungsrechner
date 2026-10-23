# Tilgungsrechner

Minimalistischer Tilgungsrechner als statischer One-Pager (React + Vite + TypeScript). Alle Berechnungen laufen im Browser, es gibt kein Backend.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
npm run lint     # oxlint
```

## Deployment

Jeder Push auf `main` baut die App und lädt `dist/` per FTP hoch (`.github/workflows/deploy.yml`, Environment `production`).
Benötigt im Repo bzw. Environment: Secrets `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` und Variable `FTP_DIR`.
