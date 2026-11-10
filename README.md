# Control de mantenimiento de vehículos

Aplicación web para buscar vehículos por placa, guardar datos opcionales del cliente y registrar mantenimientos con kilometraje, aceite, observaciones y fecha/hora. Cada servicio se conserva como un registro independiente y aparece en el historial de esa placa.

## Requisitos

- Node.js 20.19+ o 22.12+
- Un proyecto Supabase

## Preparar Supabase

1. En el panel de Supabase abre **SQL Editor**, pega y ejecuta [`supabase/schema.sql`](./supabase/schema.sql).
2. En **Authentication → Sign In / Providers → Email**, permite el registro de usuarios. La aplicación ofrece inicio de sesión y creación de cuenta.
3. En **Authentication → URL Configuration**, configura **Site URL** con la URL pública de producción en Vercel (por ejemplo, `https://tu-app.vercel.app`) y agrega esa misma URL a **Redirect URLs**. Para desarrollo local agrega también `http://localhost:5173`. El formulario de registro envía el origen actual como destino del correo de confirmación.
4. En **Project Settings → API** copia la Project URL y la clave pública `anon`/`publishable`.
5. Copia `.env.example` a `.env.local` y completa:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica
   ```

   Usa la Project URL tal como aparece en Supabase, sin agregar `/rest/v1/`. La clave pública está diseñada para estar en la aplicación; las políticas RLS del esquema limitan las operaciones a usuarios autenticados. El registro abierto permite que cualquier persona cree una cuenta y acceda a los mismos registros compartidos del taller. **Nunca uses ni publiques la clave `service_role`.**

## Ejecutar

```bash
npm install
npm run dev
```

Para comprobar la compilación de producción:

```bash
npm run build
```

La placa se guarda en mayúsculas y sin espacios. El nombre y teléfono del cliente son opcionales. Para cada visita se requiere placa, kilometraje, aceite y fecha/hora; las observaciones son opcionales. Después de guardar un mantenimiento, se puede descargar opcionalmente una imagen PNG que contiene únicamente la placa, el kilometraje, el aceite y la observación, sin datos de marca o del sitio. Las cuentas autenticadas comparten el historial del taller. Los registros de mantenimiento son inmutables desde la aplicación para conservar el historial. Si Supabase solicita confirmar el correo, hay que abrir el enlace recibido antes de iniciar sesión.
