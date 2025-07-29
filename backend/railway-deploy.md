# 🚂 Railway Deployment Guide for StockAgent Backend

## Pre-Deployment Setup

✅ Backend code ready  
✅ Supabase database configured  
✅ Environment variables identified  
✅ Railway CLI installed  

## Deployment Steps

### 1. Login to Railway
```bash
railway login
```

### 2. Initialize Project
```bash
cd backend
railway init
```
- Choose: **Create new project**
- Project name: **stockagent-backend**

### 3. Set Environment Variables
```bash
railway variables set SUPABASE_URL=https://fpumzgkpihikuhkfjqdg.supabase.co
railway variables set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdW16Z2twaWhpa3Voa2ZqcWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzQzNzEsImV4cCI6MjA2OTI1MDM3MX0.yKNok8WqyCBnAC8j2MoxSlI2ut5o6AEkVadfekcG8A8
railway variables set NODE_ENV=production
railway variables set PORT=3001
```

### 4. Deploy
```bash
railway up
```

### 5. Get Production URL
```bash
railway domain
```

## Expected Output
- ✅ Build successful
- ✅ Deployment complete  
- ✅ Health check passing
- 🌐 Production URL: `https://stockagent-backend-production.up.railway.app`

## Testing Production Deployment

### Health Check
```bash
curl https://your-app.up.railway.app/api/health
```

### Webhook Test
```bash
curl -X POST https://your-app.up.railway.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"ticker": "TEST", "indicator": "Nautilus™", "trigger": "Buy Signal"}'
```

## Railway Dashboard Features
- 📊 **Metrics**: CPU, Memory, Network usage
- 📝 **Logs**: Real-time application logs  
- 🔧 **Variables**: Environment variable management
- 🚀 **Deployments**: Deployment history and rollbacks

## Post-Deployment
1. Update frontend config with production URL
2. Test all endpoints
3. Configure TradingView webhooks
4. Monitor logs for any issues

## Troubleshooting
- **Build fails**: Check package.json and dependencies
- **App crashes**: Check logs with `railway logs`
- **Database connection**: Verify environment variables
- **Webhook issues**: Check CORS and request format