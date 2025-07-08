import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Playwright tests...')
  
  // Start browser for setup
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Wait for frontend to be ready
    console.log('⏳ Waiting for frontend to be ready...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    console.log('✅ Frontend is ready')
    
    // Wait for backend to be ready
    console.log('⏳ Waiting for backend to be ready...')
    await page.goto('http://localhost:8000/health', { waitUntil: 'networkidle' })
    console.log('✅ Backend is ready')
    
    // Create test users for authentication tests
    console.log('👥 Creating test users...')
    await createTestUsers(page)
    console.log('✅ Test users created')
    
    // Seed test data
    console.log('📚 Seeding test data...')
    await seedTestData(page)
    console.log('✅ Test data seeded')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('✅ Global setup completed successfully')
}

async function createTestUsers(page: any) {
  const testUsers = [
    {
      email: 'admin@playwright.test',
      name: 'Admin User',
      password: 'AdminPassword123!',
      role: 'admin'
    },
    {
      email: 'scholar@playwright.test',
      name: 'Scholar User',
      password: 'ScholarPassword123!',
      role: 'scholar'
    },
    {
      email: 'student@playwright.test',
      name: 'Student User',
      password: 'StudentPassword123!',
      role: 'student'
    },
    {
      email: 'guest@playwright.test',
      name: 'Guest User',
      password: 'GuestPassword123!',
      role: 'guest'
    }
  ]
  
  for (const user of testUsers) {
    try {
      const response = await page.request.post('http://localhost:8000/auth/register', {
        data: {
          email: user.email,
          name: user.name,
          password: user.password,
          password_confirm: user.password,
          preferred_language: 'he'
        }
      })
      
      if (response.ok()) {
        console.log(`✅ Created user: ${user.email}`)
      } else {
        console.log(`ℹ️  User ${user.email} might already exist`)
      }
    } catch (error) {
      console.log(`⚠️  Failed to create user ${user.email}:`, error)
    }
  }
}

async function seedTestData(page: any) {
  // Create test books
  const testBooks = [
    {
      title: 'ליקוטי מוהרן - חלק א',
      title_en: 'Likutei Moharan - Part I',
      title_fr: 'Likutei Moharan - Partie I',
      author: 'רבי נחמן מברסלב',
      description: 'החלק הראשון של ליקוטי מוהרן',
      category: 'breslov',
      language: 'he',
      total_chapters: 286,
      is_public: true,
      difficulty_level: 4,
      estimated_reading_time: 240
    },
    {
      title: 'ליקוטי תפילות',
      title_en: 'Likutei Tefilot',
      title_fr: 'Likutei Tefilot',
      author: 'רבי נתן מברסלב',
      description: 'תפילות המבוססות על תורת רבי נחמן',
      category: 'breslov',
      language: 'he',
      total_chapters: 210,
      is_public: true,
      difficulty_level: 3,
      estimated_reading_time: 180
    }
  ]
  
  // First, login as admin to create books
  try {
    const loginResponse = await page.request.post('http://localhost:8000/auth/login', {
      form: {
        username: 'admin@playwright.test',
        password: 'AdminPassword123!'
      }
    })
    
    if (loginResponse.ok()) {
      const { access_token } = await loginResponse.json()
      
      for (const book of testBooks) {
        try {
          const bookResponse = await page.request.post('http://localhost:8000/books/', {
            data: book,
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          })
          
          if (bookResponse.ok()) {
            console.log(`✅ Created book: ${book.title}`)
          } else {
            console.log(`ℹ️  Book ${book.title} might already exist`)
          }
        } catch (error) {
          console.log(`⚠️  Failed to create book ${book.title}:`, error)
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Failed to login admin for seeding:', error)
  }
}

export default globalSetup