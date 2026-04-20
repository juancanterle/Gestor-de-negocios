import { test, expect } from '@playwright/test'

const email = process.env.E2E_USER_EMAIL
const password = process.env.E2E_USER_PASSWORD

test.describe('Dashboard login flow', () => {
  test.skip(!email || !password, 'Requiere E2E_USER_EMAIL y E2E_USER_PASSWORD')

  test('login válido lleva al dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/administrador|email/i).fill(email!)
    await page.getByPlaceholder(/[•]/).fill(password!)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/(dashboard|admin)/)
  })

  test('credenciales inválidas muestran error y no redirige', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/administrador|email/i).fill('no-existe@ejemplo.com')
    await page.getByPlaceholder(/[•]/).fill('wrong-password')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page.getByText(/incorrect|incorrectos/i)).toBeVisible()
    expect(page.url()).not.toMatch(/\/(dashboard|admin)/)
  })
})
