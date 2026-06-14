# Guía de Configuración de Pusher para Adapta Class

Pusher (específicamente **Pusher Channels**) es el servicio que usaremos para enviar mensajes en tiempo real (WebSockets) entre el profesor y los estudiantes durante la actividad "Adapta - G".

Sigue estos pasos cuidadosamente para crear tu cuenta y configurar las credenciales en tu proyecto.

## Paso 1: Crear una cuenta en Pusher
1. Ve a [https://pusher.com/](https://pusher.com/) y haz clic en **"Sign Up"**.
2. Puedes registrarte con tu cuenta de GitHub, Google o usando un correo electrónico tradicional.
3. Una vez registrado e iniciada la sesión, serás llevado al **Dashboard** (Panel de Control) de Pusher.

## Paso 2: Crear una aplicación (App) de "Channels"
1. En el menú lateral izquierdo de tu Dashboard, haz clic en **"Channels"**.
2. Luego haz clic en el botón verde **"Create app"** o **"Manage Channels apps" -> "Create app"**.
3. Rellena el formulario con los siguientes datos:
   - **Name:** Escribe un nombre para identificar tu app (por ejemplo: `adapta-class-kahoot` o `adapta-class-prod`).
   - **Cluster:** Selecciona la región de los servidores más cercana a ti y a tus estudiantes. Si estás en América, selecciona `us2` (US East) o `us3` (US West). Es importante que recuerdes qué cluster elegiste.
   - **Front end tech:** Selecciona **"React"**.
   - **Back end tech:** Selecciona **"Node.js"**.
4. Haz clic en el botón **"Create app"** en la parte inferior.

## Paso 3: Obtener tus credenciales (App Keys)
1. Una vez creada la app, serás redirigido a la página de inicio (Getting Started) de tu nueva app.
2. En el menú lateral izquierdo, haz clic en **"App Keys"**.
3. Verás una tabla o una sección con tus claves. Necesitas copiar 4 valores:
   - `app_id`
   - `key`
   - `secret`
   - `cluster`

> [!WARNING]  
> Mantén el `secret` completamente privado. Nunca lo subas a un repositorio público en GitHub.

## Paso 4: Añadir las credenciales a tus archivos .env locales

Para que todo funcione, necesitas configurar las variables tanto en el Backend como en el Frontend.

### 4.1 Backend
1. Abre el archivo `.env` que está dentro de la carpeta `backend`.
2. Añade las siguientes líneas con las claves que copiaste de Pusher:

```env
# --- Configuración de Pusher para el Backend ---
PUSHER_APP_ID="tu_app_id_aqui"
PUSHER_KEY="tu_key_aqui"
PUSHER_SECRET="tu_secret_aqui"
PUSHER_CLUSTER="tu_cluster_aqui"
```

### 4.2 Frontend (React + Vite)
El frontend (el navegador web de los estudiantes) también necesita saber a dónde conectarse. En React con Vite, toda variable que vaya al navegador web **debe** llevar el prefijo `VITE_` por seguridad. Adicionalmente, el frontend solo necesita la clave pública (Key), **nunca** el Secret.

1. Abre (o crea si no existe) el archivo `.env` que está dentro de la carpeta `frontend`.
2. Añade estas dos líneas:

```env
# --- Configuración de Pusher para el Frontend ---
VITE_PUSHER_KEY="tu_key_aqui"
VITE_PUSHER_CLUSTER="tu_cluster_aqui"
```
*(Asegúrate de que sean los mismos valores de "key" y "cluster" que pusiste en el backend).*

## Paso 5: Configurar Pusher en Vercel (Producción)
Para que el juego funcione cuando la aplicación esté en vivo, debes añadir estas variables al panel de Vercel.

1. Inicia sesión en [Vercel](https://vercel.com/) y entra a tu proyecto "G2-AdaptaClassX".
2. Ve a la pestaña **"Settings"** (Ajustes) -> **"Environment Variables"**.
3. Como Vercel maneja tanto el backend como el frontend, vas a añadir las **6** variables en la misma lista:
   - `PUSHER_APP_ID`
   - `PUSHER_KEY`
   - `PUSHER_SECRET`
   - `PUSHER_CLUSTER`
   - `VITE_PUSHER_KEY`
   - `VITE_PUSHER_CLUSTER`
4. Cuando termines, realiza un nuevo despliegue (Deploy) para que Vercel tome los nuevos valores.

---
¡Listo! Cuando me apruebes el Plan de Implementación, yo me encargaré de instalar las librerías `pusher` en el backend y `pusher-js` en el frontend para conectar el juego usando estas variables.
