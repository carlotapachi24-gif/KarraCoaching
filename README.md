<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Karra Coaching

## Login

- Coach:
  - Email: `carlotaloopezcarracedo@gmail.com`
  - Password: `123456`
- Cualquier otro correo valido entra como cliente (sin registro).

## Desarrollo local

1. `npm install`
2. `npm run dev`

`npm run dev` levanta frontend (Vite) y backend (Node API).

## Produccion local

1. `npm run build`
2. `npm run start`

## Despliegue online con GitHub Pages + backend externo

GitHub Pages es estatico y no puede ejecutar `server/authServer.mjs`. Por eso:
- Frontend: GitHub Pages
- Backend API: Render/Railway/Fly (Node)

### 1) Desplegar backend (Render recomendado)

1. Crea un nuevo servicio Web en Render conectado a este repo.
2. Configura:
   - Build Command: `npm install`
   - Start Command: `node server/authServer.mjs`
3. Variables de entorno del backend:
   - `PORT=8787` (opcional, Render suele inyectarlo)
   - `SESSION_SECRET=<una_clave_larga_random>`
   - `CORS_ORIGIN=https://<tu-usuario>.github.io`

Cuando despliegue, copia tu URL del backend, por ejemplo:
`https://karra-backend.onrender.com`

### 2) Configurar GitHub Pages para usar esa API

En GitHub repo:
1. `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`
2. Crea la variable:
   - Nombre: `VITE_API_BASE_URL`
   - Valor: `https://karra-backend.onrender.com`

El workflow `.github/workflows/deploy.yml` ya inyecta esta variable al build.

### 3) Publicar

1. Haz push a `main`.
2. Espera a que termine el workflow `Deploy to GitHub Pages`.
3. Abre tu web en Pages y prueba login.

## Nota tecnica

La app usa token Bearer (no cookies de sesion) para evitar bloqueos entre dominios (GitHub Pages -> backend externo).
