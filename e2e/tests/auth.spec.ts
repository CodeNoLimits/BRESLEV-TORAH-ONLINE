import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from homepage
    await page.goto('/')
  })

  test('should display login and register options for unauthenticated users', async ({ page }) => {
    // Check that homepage shows authentication options
    await expect(page.getByText('התחברות')).toBeVisible()
    await expect(page.getByText('הרשמה')).toBeVisible()
    
    // Should not show user-specific content
    await expect(page.getByText('שלום')).not.toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.getByText('התחברות').click()
    
    // Should navigate to login page
    await expect(page).toHaveURL('/login')
    
    // Check login form elements
    await expect(page.getByLabel('אימייל')).toBeVisible()
    await expect(page.getByLabel('סיסמה')).toBeVisible()
    await expect(page.getByRole('button', { name: 'התחברות' })).toBeVisible()
  })

  test('should navigate to register page', async ({ page }) => {
    await page.getByText('הרשמה').click()
    
    // Should navigate to register page
    await expect(page).toHaveURL('/register')
    
    // Check register form elements
    await expect(page.getByLabel('שם מלא')).toBeVisible()
    await expect(page.getByLabel('אימייל')).toBeVisible()
    await expect(page.getByLabel('סיסמה')).toBeVisible()
    await expect(page.getByLabel('אישור סיסמה')).toBeVisible()
    await expect(page.getByRole('button', { name: 'הרשמה' })).toBeVisible()
  })

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register')
    
    // Fill registration form
    await page.getByLabel('שם מלא').fill('משתמש חדש')
    await page.getByLabel('אימייל').fill('newuser@example.com')
    await page.getByLabel('סיסמה').fill('SecurePassword123!')
    await page.getByLabel('אישור סיסמה').fill('SecurePassword123!')
    
    // Submit form
    await page.getByRole('button', { name: 'הרשמה' }).click()
    
    // Should redirect to login with success message
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('הרשמה בוצעה בהצלחה')).toBeVisible()
  })

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/register')
    
    // Fill form with mismatched passwords
    await page.getByLabel('שם מלא').fill('משתמש')
    await page.getByLabel('אימייל').fill('test@example.com')
    await page.getByLabel('סיסמה').fill('SecurePassword123!')
    await page.getByLabel('אישור סיסמה').fill('DifferentPassword!')
    
    // Submit form
    await page.getByRole('button', { name: 'הרשמה' }).click()
    
    // Should show error message
    await expect(page.getByText('הסיסמאות אינן תואמות')).toBeVisible()
  })

  test('should login existing user successfully', async ({ page }) => {
    await page.goto('/login')
    
    // Use test user credentials
    await page.getByLabel('אימייל').fill('student@playwright.test')
    await page.getByLabel('סיסמה').fill('StudentPassword123!')
    
    // Submit form
    await page.getByRole('button', { name: 'התחברות' }).click()
    
    // Should redirect to homepage and show authenticated content
    await expect(page).toHaveURL('/')
    await expect(page.getByText('שלום Student User!')).toBeVisible()
    await expect(page.getByText('הספרייה')).toBeVisible()
    await expect(page.getByText('שאל את הבינה המלאכותית')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Use invalid credentials
    await page.getByLabel('אימייל').fill('invalid@example.com')
    await page.getByLabel('סיסמה').fill('wrongpassword')
    
    // Submit form
    await page.getByRole('button', { name: 'התחברות' }).click()
    
    // Should show error message
    await expect(page.getByText('פרטי התחברות שגויים')).toBeVisible()
  })

  test('should remember login with checkbox', async ({ page }) => {
    await page.goto('/login')
    
    // Fill credentials and check remember me
    await page.getByLabel('אימייל').fill('student@playwright.test')
    await page.getByLabel('סיסמה').fill('StudentPassword123!')
    await page.getByLabel('זכור אותי').check()
    
    // Submit form
    await page.getByRole('button', { name: 'התחברות' }).click()
    
    // Should login successfully
    await expect(page).toHaveURL('/')
    await expect(page.getByText('שלום Student User!')).toBeVisible()
    
    // Check that token expiry is extended (we can't directly test this in E2E)
    // But we can verify the checkbox was properly handled
  })

  test('should logout user successfully', async ({ page }) => {
    // First login
    await page.goto('/login')
    await page.getByLabel('אימייל').fill('student@playwright.test')
    await page.getByLabel('סיסמה').fill('StudentPassword123!')
    await page.getByRole('button', { name: 'התחברות' }).click()
    
    // Verify logged in
    await expect(page.getByText('שלום Student User!')).toBeVisible()
    
    // Click user menu to access logout
    await page.getByTestId('user-menu').click()
    await page.getByText('התנתק').click()
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login')
    
    // Should not show authenticated content anymore
    await page.goto('/')
    await expect(page.getByText('שלום Student User!')).not.toBeVisible()
    await expect(page.getByText('התחברות')).toBeVisible()
  })

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to access library without authentication
    await page.goto('/library')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('יש להתחבר כדי לגשת לדף זה')).toBeVisible()
  })

  test('should redirect back after login', async ({ page }) => {
    // Try to access library without authentication
    await page.goto('/library')
    
    // Should be at login page
    await expect(page).toHaveURL('/login')
    
    // Login
    await page.getByLabel('אימייל').fill('student@playwright.test')
    await page.getByLabel('סיסמה').fill('StudentPassword123!')
    await page.getByRole('button', { name: 'התחברות' }).click()
    
    // Should redirect back to library
    await expect(page).toHaveURL('/library')
  })

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login')
    
    // Click forgot password link
    await page.getByText('שכחת סיסמה?').click()
    
    // Should navigate to forgot password page
    await expect(page).toHaveURL('/forgot-password')
    
    // Fill email
    await page.getByLabel('אימייל').fill('student@playwright.test')
    
    // Submit form
    await page.getByRole('button', { name: 'שלח קישור איפוס' }).click()
    
    // Should show success message
    await expect(page.getByText('קישור איפוס סיסמה נשלח למייל')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/register')
    
    // Fill form with invalid email
    await page.getByLabel('שם מלא').fill('משתמש')
    await page.getByLabel('אימייל').fill('invalid-email')
    await page.getByLabel('סיסמה').fill('SecurePassword123!')
    await page.getByLabel('אישור סיסמה').fill('SecurePassword123!')
    
    // Submit form
    await page.getByRole('button', { name: 'הרשמה' }).click()
    
    // Should show validation error
    await expect(page.getByText('כתובת אימייל לא תקינה')).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    await page.goto('/register')
    
    // Fill form with weak password
    await page.getByLabel('שם מלא').fill('משתמש')
    await page.getByLabel('אימייל').fill('test@example.com')
    await page.getByLabel('סיסמה').fill('123')
    await page.getByLabel('אישור סיסמה').fill('123')
    
    // Submit form
    await page.getByRole('button', { name: 'הרשמה' }).click()
    
    // Should show password strength error
    await expect(page.getByText('הסיסמה חייבת להכיל לפחות 8 תווים')).toBeVisible()
  })

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login')
    
    // Fill password
    await page.getByLabel('סיסמה').fill('SecurePassword123!')
    
    // Password should be hidden by default
    await expect(page.getByLabel('סיסמה')).toHaveAttribute('type', 'password')
    
    // Click show password button
    await page.getByTestId('toggle-password').click()
    
    // Password should now be visible
    await expect(page.getByLabel('סיסמה')).toHaveAttribute('type', 'text')
    
    // Click again to hide
    await page.getByTestId('toggle-password').click()
    
    // Password should be hidden again
    await expect(page.getByLabel('סיסמה')).toHaveAttribute('type', 'password')
  })

  test('should maintain session across page reloads', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel('אימייל').fill('student@playwright.test')
    await page.getByLabel('סיסמה').fill('StudentPassword123!')
    await page.getByRole('button', { name: 'התחברות' }).click()
    
    // Verify logged in
    await expect(page.getByText('שלום Student User!')).toBeVisible()
    
    // Reload page
    await page.reload()
    
    // Should still be logged in
    await expect(page.getByText('שלום Student User!')).toBeVisible()
  })

  test('should handle session expiry gracefully', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.getByLabel('אימייל').fill('student@playwright.test')
    await page.getByLabel('סיסמה').fill('StudentPassword123!')
    await page.getByRole('button', { name: 'התחברות' }).click()
    
    // Verify logged in
    await expect(page.getByText('שלום Student User!')).toBeVisible()
    
    // Simulate token expiry by clearing localStorage
    await page.evaluate(() => localStorage.removeItem('token'))
    
    // Try to access protected content
    await page.goto('/library')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page.getByText('ההפעלה פגה, יש להתחבר מחדש')).toBeVisible()
  })
})