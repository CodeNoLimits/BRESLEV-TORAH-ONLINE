# 🔥 Breslev Torah Online - ברסלב תורה אונליין

> **Study the teachings of Rabbi Nachman of Breslov with AI assistance**

A modern web application for studying Breslov texts with AI-powered chat, text-to-speech, and comprehensive search capabilities.

## 🌟 Features

- **📚 Complete Breslov Library** - 12 books with Hebrew, English, and French translations
- **🤖 AI Chat Assistant** - Real-time conversation with Gemini AI about Breslov teachings
- **🔊 Text-to-Speech** - Multi-language audio playback with speed controls
- **🔍 Advanced Search** - Find passages with highlighting and filtering
- **👤 User Authentication** - JWT-based secure login and registration
- **📱 Responsive Design** - Works on desktop and mobile devices
- **🎨 Glassmorphism UI** - Modern, beautiful interface with floating elements

## 🏗️ Architecture

```
BRESLEV-TORAH-ONLINE/
├── backend/              # FastAPI + Python
│   ├── app/
│   │   ├── api/v1/      # API endpoints
│   │   ├── core/        # Security & config
│   │   ├── models/      # Database models
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utilities
│   ├── migrations/      # Alembic migrations
│   └── tests/          # Backend tests
├── frontend/            # Next.js 14
│   ├── app/            # App router pages
│   ├── components/     # React components
│   ├── lib/            # API hooks & utilities
│   ├── providers/      # Context providers
│   └── hooks/          # Custom hooks
├── scripts/            # Data import scripts
├── docker-compose.yml  # Infrastructure
└── .github/           # CI/CD workflows
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 14+
- **Redis** 6+

### 1. Clone the repository

```bash
git clone https://github.com/CodeNoLimits/BRESLEV-TORAH-ONLINE.git
cd BRESLEV-TORAH-ONLINE
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env.development
# Edit .env.development with your configuration

# Run database migrations
python manage_migrations.py create

# Start the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start the frontend
npm run dev
```

### 4. Access the application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Configuration

### Backend Environment Variables

```env
# Application
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:8000

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/breslev_db

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-here-minimum-32-characters-long
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# API Keys
GEMINI_API_KEY=your-gemini-api-key-here
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Books & Texts
- `GET /api/v1/books/all` - Get all available books
- `GET /api/v1/books/{book_id}` - Get specific book details
- `GET /api/v1/texts/{ref}` - Get text by reference
- `GET /api/v1/texts/search` - Search in texts

### AI Chat
- `POST /api/v1/gemini/chat` - Chat with AI assistant
- `GET /api/v1/gemini/status` - Get AI service status

### Text-to-Speech
- `POST /api/v1/tts/synthesize` - Generate audio from text
- `GET /api/v1/tts/voices` - Get available voices

## 🎯 Frontend Features

### Authentication System
- **Login/Register** forms with validation
- **JWT token** management with auto-refresh
- **Protected routes** with middleware
- **Password reset** functionality

### Book Library
- **Book selection** with preview
- **Chapter navigation** with progress tracking
- **Multi-language** content display
- **Audio playback** with speed controls

### AI Chat
- **Real-time** WebSocket connection
- **Conversation history** management
- **Suggested topics** for quick start
- **Typing indicators** and status

### Search System
- **Advanced filtering** by book, chapter, language
- **Highlighted results** with relevance scoring
- **Debounced queries** for performance
- **Empty states** and error handling

## 🔊 Audio Features

### TTS Player
- **Multi-language** support (Hebrew, English, French)
- **Voice selection** per language
- **Playback controls** (play, pause, stop, skip)
- **Speed adjustment** (0.5x to 2x)
- **Volume control** with mute
- **Download** generated audio files

## 🛠️ Development

### Backend Development

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Code formatting
black app/
isort app/

# Type checking
mypy app/

# Security scan
bandit -r app/
```

### Frontend Development

```bash
# Install development dependencies
npm install

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

## 📖 Books Library

The application includes 12 complete Breslov books:

1. **Likutei Moharan** - ליקוטי מוהר"ן
2. **Chayei Moharan** - חיי מוהר"ן  
3. **Likutei Etzot** - ליקוטי עצות
4. **Likutei Tefilot** - ליקוטי תפילות
5. **Sippurei Maasiyot** - סיפורי מעשיות
6. **Shivchey HaRan** - שבחי הר"ן
7. **Sefer HaMidot** - ספר המדות
8. **Sichot HaRan** - שיחות הר"ן
9. **Tzavaat HaRivash** - צוואת הריב"ש
10. **Tzofinat Paneach** - צפנת פענח
11. **Likutei Halakhot** - ליקוטי הלכות
12. **Tikkun HaKlali** - תיקון הכללי

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Rabbi Nachman of Breslov** for the timeless teachings
- **Sefaria.org** for the text sources
- **OpenAI & Google** for AI capabilities
- **Breslov community** for inspiration and support

## 📞 Support

For support, email support@breslevtorah.com or join our Discord community.

---

**Made with ❤️ for the Breslov community**

*"The entire world is a very narrow bridge, and the main thing is not to be afraid at all."* - Rabbi Nachman of Breslov