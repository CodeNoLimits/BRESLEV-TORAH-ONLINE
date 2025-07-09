# 🚀 Deployment Guide - Breslev Torah Online

Complete guide for deploying Breslev Torah Online to production using Railway (backend) and Vercel (frontend).

## 📋 Prerequisites

Before starting deployment, ensure you have:

### Required Tools
- **Node.js** 18+ and npm
- **Railway CLI**: `npm install -g @railway/cli`
- **Vercel CLI**: `npm install -g vercel`
- **Git** for version control

### Required API Keys
- **Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **JWT Secret**: Generate a secure 32+ character string
- **Google Cloud Service Account** (optional, for TTS)

## 🎯 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │
│   Frontend      │────│   Backend       │
│   (Next.js)     │    │   (FastAPI)     │
└─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   Railway       │
                       │   PostgreSQL    │
                       └─────────────────┘
```

## 🔧 Step 1: Backend Deployment (Railway)

### 1.1 Setup Railway Project

```bash
# Login to Railway
railway login

# Create new project
railway init breslev-torah-backend

# Link to existing project (if already created)
railway link [project-id]
```

### 1.2 Configure Environment Variables

Set these variables in Railway dashboard or via CLI:

```bash
# Essential variables
railway variables set NODE_ENV=production
railway variables set ENVIRONMENT=production
railway variables set JWT_SECRET_KEY=your-super-secret-jwt-key-here-minimum-32-characters-long
railway variables set GEMINI_API_KEY=your-gemini-api-key-here

# CORS configuration
railway variables set CORS_ORIGINS=https://breslev-torah.vercel.app,https://breslev-torah-online.vercel.app
railway variables set ALLOWED_HOSTS=*.railway.app,*.vercel.app

# Database and Redis (auto-configured by Railway)
# DATABASE_URL and REDIS_URL are automatically set by Railway plugins
```

### 1.3 Add Database and Redis

```bash
# Add PostgreSQL
railway add postgresql

# Add Redis
railway add redis
```

### 1.4 Deploy Backend

```bash
# From project root
./deploy-railway.sh

# Or manually:
cd backend
railway up
```

### 1.5 Run Database Migration

```bash
# After deployment, run migration
railway run python deploy_migration.py migrate
```

## 🌐 Step 2: Frontend Deployment (Vercel)

### 2.1 Setup Vercel Project

```bash
# Login to Vercel
vercel login

# Deploy from frontend directory
cd frontend
vercel --prod
```

### 2.2 Configure Environment Variables

Set these in Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
NEXT_PUBLIC_ENVIRONMENT=production
```

### 2.3 Deploy Frontend

```bash
# From project root
./deploy-vercel.sh

# Or manually:
cd frontend
vercel --prod
```

## 📊 Step 3: Verification

### 3.1 Backend Health Check

```bash
curl https://your-railway-backend-url.up.railway.app/health
```

Expected response:
```json
{"status": "healthy", "api": "v1"}
```

### 3.2 Frontend Access

Visit your Vercel URL: `https://your-vercel-app.vercel.app`

### 3.3 API Integration Test

Test API connection from frontend:
- Visit `/test-api` page
- Check authentication flow
- Test AI chat functionality

## 🔐 Security Configuration

### Backend Security Headers
Already configured in `app/main.py`:
- CORS policies
- Authentication middleware
- Rate limiting (when enabled)

### Frontend Security Headers
Configured in `vercel.json`:
- Content Security Policy
- XSS Protection
- Frame Options
- Referrer Policy

## 📝 Environment Variables Reference

### Backend (Railway)
```env
# Application
NODE_ENV=production
ENVIRONMENT=production
JWT_SECRET_KEY=your-super-secret-jwt-key-here-minimum-32-characters-long
GEMINI_API_KEY=your-gemini-api-key-here

# Database (auto-configured)
DATABASE_URL=${POSTGRES.DATABASE_URL}
REDIS_URL=${REDIS.REDIS_URL}

# CORS
CORS_ORIGINS=https://breslev-torah.vercel.app,https://breslev-torah-online.vercel.app
ALLOWED_HOSTS=*.railway.app,*.vercel.app
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-railway-backend-url.up.railway.app
NEXT_PUBLIC_ENVIRONMENT=production
```

## 🚨 Troubleshooting

### Common Issues

#### Backend Issues
1. **Database Connection Error**
   ```bash
   railway run python deploy_migration.py status
   ```

2. **CORS Error**
   - Check `CORS_ORIGINS` includes your frontend URL
   - Verify `ALLOWED_HOSTS` configuration

3. **API Key Issues**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API key permissions in Google AI Studio

#### Frontend Issues
1. **API Connection Error**
   - Verify `NEXT_PUBLIC_API_URL` points to Railway backend
   - Check backend health endpoint

2. **Build Errors**
   - Run `npm run build` locally first
   - Check for TypeScript errors

3. **Authentication Issues**
   - Verify JWT configuration
   - Check CORS settings

### Useful Commands

#### Railway
```bash
railway status          # Check deployment status
railway logs            # View application logs
railway shell           # Access container shell
railway open            # Open Railway dashboard
railway variables       # List environment variables
```

#### Vercel
```bash
vercel --prod           # Deploy to production
vercel dev              # Start development server
vercel logs             # View deployment logs
vercel domains          # Manage custom domains
```

## 📈 Monitoring

### Railway Monitoring
- Built-in metrics dashboard
- Application logs
- Resource usage tracking

### Vercel Monitoring
- Analytics dashboard
- Performance metrics
- Function logs

## 🔄 Updates and Maintenance

### Backend Updates
```bash
# Deploy new version
cd backend
railway up

# Run migrations if needed
railway run python deploy_migration.py migrate
```

### Frontend Updates
```bash
# Deploy new version
cd frontend
vercel --prod
```

### Database Backups
```bash
# Create backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore backup
railway run psql $DATABASE_URL < backup.sql
```

## 🆘 Support

For deployment issues:
1. Check Railway/Vercel status pages
2. Review application logs
3. Test locally first
4. Check environment variables

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Deployment Guide](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

---

**🎉 Congratulations! Your Breslev Torah Online application is now deployed to production!**