<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Karra Coaching

## Login

- Coach:
  - Email: `carlotaloopezcarracedo@gmail.com`
  - Password: `COACH_PASSWORD` (variable de entorno). En local, si no la defines, usa `123456`.
- Cliente:
  - Debe existir en `CLIENT_CREDENTIALS` o haberse creado desde el panel del coach.
  - El acceso abierto por email libre solo se activa si `ALLOW_OPEN_CLIENT_LOGIN=true`.

### Alta de usuarios cliente (Render)

Puedes controlar los clientes con la variable de entorno `CLIENT_CREDENTIALS` en Render.

Formato:
`email1:password1,email2:password2,email3:password3`

Ejemplo:
`ana@gmail.com:ana123,pepe@gmail.com:pepe123,lucia@gmail.com:lucia123`

Notas:
- Si `CLIENT_CREDENTIALS` esta vacia, el acceso abierto solo funciona cuando `ALLOW_OPEN_CLIENT_LOGIN=true`.
- Si `CLIENT_CREDENTIALS` tiene datos, solo los correos listados podran entrar como cliente.

## Estado actual (produccion funcional)

El flujo principal ya esta conectado extremo a extremo:

- Check-in semanal real: el cliente solo puede enviar 1 check-in por semana.
- Notificacion al coach: cada check-in pendiente aparece en revisiones/notificaciones.
- Revision y feedback del coach: el coach responde sobre cada check-in.
- Retorno al cliente: el cliente ve estado, feedback y bloqueo semanal hasta el siguiente ciclo.
- Datos persistentes de backend: clientes, perfiles, plan, biblioteca, mensajes, revisiones y notificaciones.

El backend persiste datos en:

- `server/data/store.json`

Si `store.json` se corrompe, el servidor ya no arranca con reset silencioso:
- guarda copia en `server/data/store.corrupt.<timestamp>.json`
- y detiene el proceso para evitar perdida de datos.

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
   - `COACH_PASSWORD=<password_seguro_coach>`
   - `SESSION_SECRET=<una_clave_larga_random>`
   - `CORS_ORIGIN=https://<tu-usuario>.github.io`
   - `ALLOW_OPEN_CLIENT_LOGIN=false` (recomendado en produccion)
   - `CLIENT_CREDENTIALS=email1:password1,email2:password2`

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
