# Guía de Configuración: Base de Datos Redis para Adapta - G

Esta guía explica paso a paso cómo crear una base de datos Redis gratuita exclusiva para el módulo "Adapta - G" (Multijugador en tiempo real) de tu proyecto, asegurando que su uso **no interfiera** con el de los otros módulos (como la IA) que ya usan Redis.

La base de datos que crearemos tendrá su propia conexión mediante la variable **`REDIS_K_URL`**.

---

## Paso 1: Crear una cuenta en Upstash
Upstash es el proveedor líder y gratuito de bases de datos Redis optimizadas para plataformas *Serverless* como Vercel.

1. Ingresa a [https://upstash.com/](https://upstash.com/)
2. Haz clic en **"Login"** en la esquina superior derecha.
3. Te recomendamos registrarte utilizando tu cuenta de **GitHub** o **Google** para mayor facilidad.

## Paso 2: Crear la Base de Datos Exclusiva
1. Una vez dentro del panel de control de Upstash, asegúrate de estar en la pestaña **Redis**.
2. Haz clic en el botón verde **"Create Database"**.
3. Rellena el formulario de la siguiente manera:
   - **Name:** Escribe algo descriptivo como `adaptaclass-kahoot` o `adapta-g-redis`. *(Este nombre es solo para ti)*.
   - **Type:** Selecciona **Regional**.
   - **Region:** Elige la región más cercana a la ubicación de tus usuarios (por ejemplo, `us-east-1` o `sa-east-1` si estás en Sudamérica).
   - Opciones como *Eviction* o *TLS* déjalas por defecto.
4. Haz clic en el botón verde **"Create"**.

## Paso 3: Obtener la URL de Conexión (REDIS_K_URL)
1. Luego de unos segundos, tu base de datos aparecerá como "Active" y serás llevado a la página de detalles.
2. Desplázate un poco hacia abajo hasta encontrar la sección **"REST API"** o **"Connect"**.
3. Busca la opción que dice **"Node.js"** o **"ioredis"**.
4. Verás una cadena de conexión (URL) que comienza con `rediss://` o `redis://`. Por ejemplo:
   `rediss://default:xxxxxxxxxxxxxxx@us1-example-redis.upstash.io:32502`
5. **Copia esa URL completa**. ¡Esa es tu `REDIS_K_URL`!

---

## Paso 4: Añadir la variable a tu Entorno Local
Para que el juego funcione mientras estás desarrollando o probando en tu computadora (ejecutando `npm run dev`):

1. Ve a la carpeta `backend` de tu proyecto.
2. Abre el archivo `.env`.
3. Añade la siguiente línea al final del archivo, reemplazando las comillas con la URL que copiaste:

```env
# --- Base de Datos Exclusiva para Adapta - G ---
REDIS_K_URL="rediss://default:xxxxxxxxxxxxxxx@us1-example.upstash.io:32502"
```

*(Recuerda que si en algún momento la URL no está presente, el juego intentará usar la memoria local para que no falle en pruebas, pero en Vercel sí o sí necesitas la URL).*

---

## Paso 5: Añadir la variable en Vercel (Para Producción)
Para que el módulo en vivo funcione cuando tus estudiantes usen la plataforma desplegada:

1. Inicia sesión en [Vercel](https://vercel.com/) y entra a tu proyecto "G2-AdaptaClassX".
2. Ve a la pestaña **"Settings"** (Ajustes).
3. En el menú lateral, haz clic en **"Environment Variables"**.
4. En el formulario para agregar una nueva variable:
   - **Key:** Escribe exactamente `REDIS_K_URL`
   - **Value:** Pega la URL completa de tu base de datos de Upstash.
5. Haz clic en **Save**.
6. **Importante:** Vercel necesita reiniciar la aplicación para tomar esta nueva variable. Ve a la pestaña **Deployments**, haz clic en los 3 puntitos del último despliegue y selecciona **"Redeploy"** (o simplemente haz un push de tu código a GitHub).

¡Y listo! Al finalizar estos pasos, tendrás un ecosistema de alta velocidad aislado exclusivamente para soportar las miles de respuestas por segundo de tus estudiantes durante el juego.
