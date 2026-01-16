# Modo local con `localStorage`

La aplicación ahora corre completamente en `localStorage`; la base de datos remota y los clientes Supabase se eliminaron para que puedas desarrollar sin dependencia externa. Este documento resume cómo funciona la capa de persistencia local y qué llaves se usan.

## 1. Variables de entorno

Solo se usa una variable para documentar el modo actual:

```
VITE_APP_MODE=local
```

Queda registrada en `.env.local` para que el sistema sepa que no debe intentar conectar a ninguna API adicional.

## 2. Llaves locales y datos semilla

Las siguientes claves de `localStorage` recrean los recursos que antes vivían en Supabase:

| Clave | Propósito |
| --- | --- |
| `iuca-user` | Usuario autenticado actual (contexto de `AuthContext`). |
| `iuca-users` | Catálogo de usuarios registrados; se inicializa con `mockUsers`. |
| `iuca-user-credentials` | Hashtable simple de hashes SHA-256 que reproduce las contraseñas (`password`). |
| `iuca-enrollments` y `iuca-waitlist` | Matrículas y colas de espera por usuario/curso. |
| `iuca-admin-courses` | Cursos creados por el equipo administrativo. |
| `iuca_announcements` | Anuncios publicados en el panel administrativo. |
| `iuca_inscription_documents` | Documentos de matrícula subidos por cada usuario. |

Al eliminar las claves existentes puedes resetear por completo el entorno; como las funciones son idempotentes, bastará con borrar el `localStorage` del navegador para regenerar los valores semilla de `mockApi`.

## 3. API simulada

Cada servicio (`userService`, `courseService`, `inscriptionService`, `announcementService`, etc.) usa funciones internas para leer/escribir estas claves y responde con los mismos tipos que antes. Se introdujeron retrasos artificiales (`setTimeout`) para mantener el mismo comportamiento de carga del front.

Si necesitas reactivar Supabase en el futuro, recrea los endpoints mediante la colección de funciones anteriores y conserva las firmas públicas de `listUsers`, `enroll`, `createUserRecord`, etc.

## 4. ¿Qué hacer cuando quieras volver a Supabase?

1. Reinstala `@supabase/supabase-js` y vuelve a añadir `services/supabaseClient.ts`.
2. Reescribe cada servicio para usar `getSupabaseClient()`/`isSupabaseEnabled()` como lo hacía el documento anterior.
3. Añade las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_USE_SUPABASE=true`.
4. Usa `node tools/checkSupabase.mjs` (recrea el script) y `npm run dev` para validar la conexión.

Mientras estés en modo local, esos pasos no son necesarios: simplemente corre `npm run dev` o `npm run build` y la aplicación funcionará sin backend remoto.
