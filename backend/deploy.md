# 🚀 StockAgent Backend Deployment Guide

## Pre-Deployment Checklist

✅ Supabase database configured  
✅ Environment variables ready  
✅ Server tested locally  
✅ Vercel configuration files created  

## Deployment Steps

### Option 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from backend directory**:
   ```bash
   cd backend
   vercel
   ```

4. **Set environment variables**:
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_ANON_KEY
   vercel env add NODE_ENV production
   ```

### Option 2: GitHub Integration

1. **Push code to GitHub**
2. **Connect repository to Vercel**
3. **Set environment variables in dashboard**
4. **Deploy automatically**

## Environment Variables Required

```
SUPABASE_URL=https://fpumzgkpihikuhkfjqdg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
PORT=3000
```

## Post-Deployment Testing

1. **Test health endpoint**: `https://your-app.vercel.app/api/health`
2. **Test webhook**: POST to `https://your-app.vercel.app/webhook`
3. **Check logs**: `vercel logs`

## Frontend Configuration Update

Update `public/config.json`:
```json
{
  "apiBase": "https://your-backend-url.vercel.app/api",
  "webhookUrl": "https://your-backend-url.vercel.app/webhook"
}
```