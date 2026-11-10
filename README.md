# Control de mantenimiento de vehículos

Aplicación web para buscar vehículos por placa, guardar datos opcionales del cliente y registrar mantenimientos con kilometraje, aceite, observaciones y fecha/hora. Cada servicio se conserva como un registro independiente y aparece en el historial de esa placa.

## Requisitos

- Node.js 20.19+ o 22.12+
- Un proyecto Supabase

## Preparar Supabase

1. En el panel de Supabase abre **SQL Editor**, pega y ejecuta [`supabase/schema.sql`](./supabase/schema.sql).
2. En **Authentication → Users**, crea la cuenta de acceso del taller.
3. En **Project Settings → API** copia la Project URL y la clave pública `anon`/`publishable`.
4. Copia `.env.example` a `.env.local` y completa:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica
   ```

   La clave pública está diseñada para estar en la aplicación; las políticas RLS del esquema limitan las operaciones a usuarios autenticados. **Nunca uses ni publiques la clave `service_role`.**

## Ejecutar

```bash
npm install
npm run dev
```

Para comprobar la compilación de producción:

```bash
npm run build
```

La placa se guarda en mayúsculas y sin espacios. El nombre y teléfono del cliente son opcionales. Para cada visita se requiere placa, kilometraje, aceite y fecha/hora; las observaciones son opcionales. Las cuentas autenticadas comparten el historial del taller. Los registros de mantenimiento son inmutables desde la aplicación para conservar el historial.
