# Frontend (web)

React + TypeScript + Vite. Për SQL, Mongo, JWT dhe pjesën tjetër shiko `README.md` në rrënjë.

## Instalimi

```bash
cd web
copy .env.example .env
npm install
npm run dev
```

Hap http://localhost:5173 (API duhet të jetë në http://localhost:5183).

`web/.env` është opsionale — pa të, proxy drejt 5183 funksionon vetë. Kopjoje `.env.example` vetëm nëse ndryshon portin.

## web/.env

Kopjo nga `.env.example`. Variablat `VITE_*` lexohen nga Vite:

- `VITE_DEV_API_PROXY` — URL e API-s për proxy (`/api`, `/hubs`). Parazgjedhja: `http://localhost:5183`
- `VITE_DEV_HTTPS` — vetëm nëse do HTTPS lokal; zakonisht mos e aktivizo

JWT, Stripe dhe Google server key shkruhen në `.env` në rrënjën e repo-s, jo këtu.

## npm install

Mjafton një herë pas klonimit. Paketat kryesore:

- `react`, `react-router-dom`, `zustand`
- `@microsoft/signalr` — porosi real-time
- `leaflet`, `react-leaflet`, `@types/leaflet` — harta OSM
- `@types/google.maps` — Google Maps në TS
- `@mui/material`, `@stripe/stripe-js`, `tailwindcss`, `vite`

Mos i instalo manualisht një nga një — janë në `package.json`.

## Komanda

```bash
npm run dev      # zhvillim
npm run build    # production
npm run preview  # shiko dist/
npm run lint
```

Në dev, Vite proxy-ja `/api/*` dhe `/hubs/*` te Kestrel — nuk duhet CORS i veçantë.
