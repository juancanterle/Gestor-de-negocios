# Tests E2E

## Dashboard (Playwright)

Requiere credenciales reales de Supabase como env vars:

```sh
export E2E_USER_EMAIL="owner@ejemplo.com"
export E2E_USER_PASSWORD="..."
npm run e2e
```

Si falta alguna env var, los tests se saltean (no rompen CI).

El `webServer` del config levanta `npm --prefix apps/dashboard run dev` automáticamente.

## Electron smoke (pendiente)

Pendiente: integrar `@playwright/test` con `electron.launch()` para probar
login → apertura de caja → venta → cierre. Esqueleto sugerido:

```ts
import { test, _electron as electron } from '@playwright/test'
test('smoke', async () => {
  const app = await electron.launch({ args: ['./apps/desktop'] })
  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')
  // ...
  await app.close()
})
```
