# Delivery Management System (FoodDelivery)

Monorepo me backend .NET 8 ne folderin `src` dhe frontend ne `web` me Vite, React dhe TypeScript.

## Fillim i shpejtë (pas git clone)

1. Kopjo `.env.example` si `.env` në **rrënjën e repo-s** (pranë `FoodDelivery.sln`). Funksionon edhe në `src/FoodDelivery.Api/.env` — API e gjen duke kërkuar lart.
2. Nis MongoDB nëse do chat dërgese (ose vendos `Mongo__Enabled=false` në `.env`).
3. Terminal 1: `cd src/FoodDelivery.Api` → `dotnet run` (Swagger: http://localhost:5183/swagger)
4. Terminal 2: `cd web` → `npm install` → `npm run dev` (http://localhost:5173)

`web/.env` nuk është e detyrueshme — pa të, Vite përdor proxy drejt `http://localhost:5183`. Kopjoje nga `web/.env.example` vetëm nëse ndryshon portin e API-s.

## Struktura

- `FoodDelivery.sln` — solution Visual Studio
- `src/FoodDelivery.Api` — Web API (Kestrel, Swagger)
- `src/FoodDelivery.Domain` — entitetet
- `src/FoodDelivery.Application` — DTO, shërbime, kontrata
- `src/FoodDelivery.Infrastructure` — EF Core, MongoDB, Stripe, Google Maps
- `web/` — SPA (klient, admin, kitchen, driver)
- `.env.example` — shabllon për backend; kopjoje si `.env` në rrënjë
- `web/.env.example` — shabllon për frontend; kopjoje si `web/.env`

## Çfarë duhet instaluar

**Të detyrueshme**

- .NET 8 SDK — https://dotnet.microsoft.com/download
- Node.js LTS (20+ ose 22+) — https://nodejs.org
- SQL Server ose LocalDB — për përdorues, restorante, porosi

**Të rekomanduara**

- MongoDB — chat i dërgesës (klient / korrier). Pa Mongo API nis por chat-i nuk punon.
  Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`

**Frontend (`npm install` në `web/`)**

Mos instalo paketa një nga një. Pas `npm install` vijnë automatikisht, p.sh.:

- `react`, `react-router-dom`, `zustand` — UI dhe state
- `@microsoft/signalr` — real-time (`/hubs/orders`)
- `leaflet`, `react-leaflet` — harta OSM
- `@types/google.maps` — tipet për Google Maps në TypeScript
- `@mui/material`, `@stripe/stripe-js`, `tailwindcss`, `vite`

## Konfigurimi

Ku shkruhet çfarë:

- `.env` në rrënjë ose `src/FoodDelivery.Api/.env` — SQL, Mongo, JWT, Stripe, Google Maps (**mos e commit-o**)
- `web/.env` — vetëm `VITE_*` (proxy, HTTPS dev); opsionale
- `.env.example` dhe `web/.env.example` — shabllone pa sekrete; commit-ohen në git

**Backend**

```powershell
copy .env.example .env
```

Plotëso në `.env`. Çdo rresht = një vlerë; `#` = koment. Format ASP.NET: `Seksioni__Fusha` (dy nënvizime).

Shembull:

```env
ConnectionStrings__DefaultConnection=Server=...;Database=FoodDeliveryDb_Dev;...
Mongo__ConnectionString=mongodb://localhost:27017
Mongo__DatabaseName=FoodDelivery
Jwt__Secret=DevOnly_DoNotUseInProduction_SuperSecretKey_32chars_Min__

GoogleMaps__BrowserApiKey=
GoogleMaps__ServerApiKey=
GoogleMaps__GeocodingProvider=Nominatim
```

Migrimet EF aplikohen vetë në dev.

**Frontend**

```powershell
cd web
copy .env.example .env
npm install
```

Në `web/.env` zakonisht mjafton:

```env
VITE_DEV_API_PROXY=http://localhost:5183
```

Mos aktivizo `VITE_DEV_HTTPS=true` pa nevojë — hap `http://localhost:5173`.

## Si ta nisësh

**API**

```powershell
cd src/FoodDelivery.Api
dotnet restore
dotnet run
```

Swagger: http://localhost:5183/swagger

Ose hap `FoodDelivery.sln` në Visual Studio dhe nis `FoodDelivery.Api`.

**Web**

```powershell
cd web
npm install
npm run dev
```

http://localhost:5173 — `/api` dhe `/hubs` shkojnë te API përmes proxy të Vite.

**Build**

```powershell
dotnet build FoodDelivery.sln
cd web && npm run build
```

## Baza e të dhënave

- **SQL Server** — përdorues, restorante, menu, porosi, pagesa, admin
- **MongoDB** — vetëm mesazhet e chat-it të dërgesës (`delivery_chat_messages`)

Pa Mongo: `Mongo__Enabled=false` në `.env`, ose nis Mongo.

## Git

Nuk commit-ohen: `node_modules/`, `bin/`, `obj/`, `.vs/`, `.env`, `web/.env`, `web/dist/`.

## Probleme të shpeshta

- **`signalr` nuk gjendet** — `cd web && npm install`
- **Gabime për `google` në TypeScript** — `@types/google.maps` është në `package.json`, ri-bëj `npm install`
- **Web nuk lidhet me API** — API në portin 5183, `VITE_DEV_API_PROXY` i njëjtë
- **ERR_SSL në dev** — mos përdor HTTPS; hap http://localhost:5173
- **MongoDB failed** — nis Mongo ose `Mongo__Enabled=false`

Më shumë për frontend: `web/README.md`.
