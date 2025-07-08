import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for Playwright tests...')
  
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Clean up test data
    console.log('🗑️  Cleaning up test data...')
    await cleanupTestData(page)
    console.log('✅ Test data cleaned up')
    
    // Additional cleanup if needed
    console.log('🔧 Performing additional cleanup...')
    await additionalCleanup(page)
    console.log('✅ Additional cleanup completed')
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw here to avoid failing the test suite
  } finally {
    await browser.close()
  }
  
  console.log('✅ Global teardown completed')
}

async function cleanupTestData(page: any) {
  // Login as admin to perform cleanup
  try {
    const loginResponse = await page.request.post('http://localhost:8000/auth/login', {
      form: {
        username: 'admin@playwright.test',
        password: 'AdminPassword123!'
      }
    })
    
    if (loginResponse.ok()) {
      const { access_token } = await loginResponse.json()
      
      // Clean up test users (except admin)
      const testUserEmails = [
        'scholar@playwright.test',
        'student@playwright.test',
        'guest@playwright.test'
      ]
      
      for (const email of testUserEmails) {
        try {
          await page.request.delete(`http://localhost:8000/admin/users/${email}`, {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          })
          console.log(`✅ Cleaned up user: ${email}`)
        } catch (error) {
          console.log(`⚠️  Failed to cleanup user ${email}:`, error)
        }
      }
      
      // Clean up test books
      try {
        const booksResponse = await page.request.get('http://localhost:8000/books/', {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })
        
        if (booksResponse.ok()) {
          const books = await booksResponse.json()
          
          for (const book of books) {
            if (book.title.includes('ליקוטי מוהרן - חלק א') || book.title.includes('ליקוטי תפילות')) {
              try {
                await page.request.delete(`http://localhost:8000/books/${book.id}`, {
                  headers: {
                    'Authorization': `Bearer ${access_token}`
                  }
                })
                console.log(`✅ Cleaned up book: ${book.title}`)
              } catch (error) {
                console.log(`⚠️  Failed to cleanup book ${book.title}:`, error)
              }
            }
          }
        }
      } catch (error) {
        console.log('⚠️  Failed to fetch books for cleanup:', error)
      }
      
      // Clean up test chats
      try {
        const chatsResponse = await page.request.get('http://localhost:8000/chats/', {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })
        
        if (chatsResponse.ok()) {
          const chats = await chatsResponse.json()
          
          for (const chat of chats) {
            if (chat.title.includes('Test') || chat.title.includes('Playwright')) {
              try {
                await page.request.delete(`http://localhost:8000/chats/${chat.id}`, {
                  headers: {
                    'Authorization': `Bearer ${access_token}`
                  }
                })
                console.log(`✅ Cleaned up chat: ${chat.title}`)
              } catch (error) {
                console.log(`⚠️  Failed to cleanup chat ${chat.title}:`, error)
              }
            }
          }
        }
      } catch (error) {
        console.log('⚠️  Failed to fetch chats for cleanup:', error)
      }
      
      // Finally clean up admin user
      try {
        await page.request.delete(`http://localhost:8000/admin/users/admin@playwright.test`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        })
        console.log('✅ Cleaned up admin user')
      } catch (error) {
        console.log('⚠️  Failed to cleanup admin user:', error)
      }
    }
  } catch (error) {
    console.log('⚠️  Failed to login admin for cleanup:', error)
  }
}

async function additionalCleanup(page: any) {
  // Clear any cached data
  try {
    await page.request.post('http://localhost:8000/admin/cache/clear')
    console.log('✅ Cleared cache')
  } catch (error) {
    console.log('⚠️  Failed to clear cache:', error)
  }
  
  // Reset database to clean state if needed
  try {
    await page.request.post('http://localhost:8000/admin/database/reset-test')
    console.log('✅ Reset test database')
  } catch (error) {
    console.log('⚠️  Failed to reset test database:', error)
  }
  
  // Clear any uploaded files
  try {
    await page.request.post('http://localhost:8000/admin/files/cleanup-test')
    console.log('✅ Cleaned up test files')
  } catch (error) {
    console.log('⚠️  Failed to cleanup test files:', error)
  }
}

export default globalTeardown