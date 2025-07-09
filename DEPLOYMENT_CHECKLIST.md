# ✅ Deployment Checklist - Breslev Torah Online

## Pre-Deployment

- [ ] **API Keys Ready**
  - [ ] Gemini API Key from Google AI Studio
  - [ ] JWT Secret (32+ characters)
  - [ ] Google Cloud Service Account (optional)

- [ ] **Tools Installed**
  - [ ] Railway CLI: `npm install -g @railway/cli`
  - [ ] Vercel CLI: `npm install -g vercel`
  - [ ] Node.js 18+ and npm

- [ ] **Accounts Created**
  - [ ] Railway account
  - [ ] Vercel account
  - [ ] GitHub repository (for continuous deployment)

## Backend Deployment (Railway)

- [ ] **Setup Railway Project**
  - [ ] `railway login`
  - [ ] `railway init breslev-torah-backend`
  - [ ] Add PostgreSQL plugin
  - [ ] Add Redis plugin

- [ ] **Configure Environment Variables**
  - [ ] `NODE_ENV=production`
  - [ ] `ENVIRONMENT=production`
  - [ ] `JWT_SECRET_KEY=your-secret-key`
  - [ ] `GEMINI_API_KEY=your-gemini-key`
  - [ ] `CORS_ORIGINS=https://your-vercel-app.vercel.app`

- [ ] **Deploy Backend**
  - [ ] `./deploy-railway.sh` or `cd backend && railway up`
  - [ ] Verify deployment: `railway status`
  - [ ] Check logs: `railway logs`

- [ ] **Run Database Migration**
  - [ ] `railway run python deploy_migration.py migrate`
  - [ ] Verify tables: `railway run python deploy_migration.py status`

- [ ] **Test Backend**
  - [ ] Health check: `curl https://your-app.up.railway.app/health`
  - [ ] API documentation: `https://your-app.up.railway.app/docs`

## Frontend Deployment (Vercel)

- [ ] **Setup Vercel Project**
  - [ ] `vercel login`
  - [ ] `cd frontend && vercel`
  - [ ] Link to existing project or create new

- [ ] **Configure Environment Variables**
  - [ ] `NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app`
  - [ ] `NEXT_PUBLIC_ENVIRONMENT=production`

- [ ] **Deploy Frontend**
  - [ ] `./deploy-vercel.sh` or `cd frontend && vercel --prod`
  - [ ] Verify deployment in Vercel dashboard

- [ ] **Test Frontend**
  - [ ] Visit your Vercel URL
  - [ ] Test API connection
  - [ ] Verify authentication flow

## Post-Deployment

- [ ] **Integration Testing**
  - [ ] Test user registration/login
  - [ ] Test AI chat functionality
  - [ ] Test text-to-speech features
  - [ ] Test book navigation

- [ ] **Security Verification**
  - [ ] Check CORS configuration
  - [ ] Verify HTTPS connections
  - [ ] Test authentication tokens

- [ ] **Performance Testing**
  - [ ] Check page load speeds
  - [ ] Test API response times
  - [ ] Verify database queries

## Monitoring Setup

- [ ] **Railway Monitoring**
  - [ ] Monitor resource usage
  - [ ] Set up alerts (if needed)
  - [ ] Check application logs

- [ ] **Vercel Monitoring**
  - [ ] Enable analytics
  - [ ] Monitor function performance
  - [ ] Check deployment logs

## Optional Enhancements

- [ ] **Custom Domain**
  - [ ] Configure custom domain in Vercel
  - [ ] Update CORS settings in Railway
  - [ ] Set up SSL certificate

- [ ] **CI/CD Pipeline**
  - [ ] Connect GitHub to Railway
  - [ ] Connect GitHub to Vercel
  - [ ] Set up automatic deployments

- [ ] **Advanced Monitoring**
  - [ ] Set up Sentry for error tracking
  - [ ] Configure application metrics
  - [ ] Set up health check monitoring

## Troubleshooting

- [ ] **Common Issues Resolved**
  - [ ] Database connection issues
  - [ ] CORS errors
  - [ ] API key configuration
  - [ ] Environment variable problems

- [ ] **Backup Strategy**
  - [ ] Database backup procedure
  - [ ] Configuration backup
  - [ ] Deployment rollback plan

---

## Quick Commands Reference

### Railway
```bash
railway status          # Check deployment status
railway logs            # View logs
railway shell           # Access container
railway variables       # List environment variables
```

### Vercel
```bash
vercel --prod           # Deploy to production
vercel logs             # View logs
vercel domains          # Manage domains
```

### Health Checks
```bash
# Backend health
curl https://your-app.up.railway.app/health

# Frontend access
curl https://your-app.vercel.app
```

**🎯 Once all items are checked, your Breslev Torah Online application is ready for production!**