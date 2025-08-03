# StockAgent Authentication Setup

This guide explains how to set up secure authentication for your StockAgent platform.

## Security Features

- ✅ Secure password hashing with bcrypt (12 salt rounds)
- ✅ JWT token-based authentication with httpOnly cookies
- ✅ Rate limiting to prevent brute-force attacks (5 attempts per 15 minutes)
- ✅ Protected API routes and frontend pages
- ✅ Webhook authentication with secret key
- ✅ HTTPS enforcement in production
- ✅ CORS configuration with credentials support

## Environment Variables

Add these to your `.env` file or Railway environment variables:

```bash
# Admin Credentials
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD_HASH=<generated hash - see below>

# JWT Configuration
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_EXPIRES_IN=24h

# Webhook Security
WEBHOOK_SECRET=<generate with: openssl rand -hex 32>

# Frontend URL (for CORS)
FRONTEND_URL=https://your-domain.com
```

## Generate Password Hash

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Generate a secure password hash:
```bash
npm run hash-password
```

3. Enter your desired password when prompted (minimum 8 characters)
4. Copy the generated hash and environment variables

## TradingView Webhook Configuration

When setting up webhooks in TradingView, append your webhook secret:

### Option 1: Query Parameter
```
https://your-backend.com/webhook?secret=YOUR_WEBHOOK_SECRET
```

### Option 2: Custom Header (if TradingView supports it)
```
Header: X-Webhook-Secret
Value: YOUR_WEBHOOK_SECRET
```

## API Authentication Flow

1. **Login**: POST to `/api/auth/login` with email and password
2. **Session**: JWT token stored in httpOnly cookie
3. **Protected Routes**: All `/api/*` routes require authentication (except `/api/auth/*` and `/api/health`)
4. **Logout**: POST to `/api/auth/logout` clears the session

## Frontend Protection

- Login page: `/login`
- Protected pages: All other routes require authentication
- Automatic redirect to login if not authenticated
- Automatic redirect to dashboard if trying to access login while authenticated

## Rate Limiting

- Login attempts: 5 failed attempts = 15-minute lockout
- API requests: 1000 requests per 15 minutes per IP
- Webhook requests: 100 requests per minute

## Security Best Practices

1. **Always use HTTPS in production** - The authentication cookies are marked as secure in production
2. **Keep your JWT_SECRET secure** - Never commit it to git or share it
3. **Rotate secrets periodically** - Change JWT_SECRET and WEBHOOK_SECRET every few months
4. **Monitor failed login attempts** - Check logs for suspicious activity
5. **Use strong passwords** - Minimum 8 characters, mix of letters, numbers, and symbols

## Testing Authentication

1. Start the backend with new environment variables:
```bash
cd backend
npm run dev
```

2. Test password hashing:
```bash
npm run hash-password
```

3. Test login via curl:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}' \
  -c cookies.txt
```

4. Test protected endpoint:
```bash
curl http://localhost:3001/api/alerts \
  -b cookies.txt
```

## Troubleshooting

### "Authentication system not configured"
- Make sure `ADMIN_PASSWORD_HASH` and `JWT_SECRET` are set in environment variables

### "Invalid credentials" 
- Check that `ADMIN_EMAIL` matches the email you're using to login
- Ensure you're using the correct password (not the hash)

### "Too many failed attempts"
- Wait 15 minutes or restart the backend to clear rate limits
- In production, consider using Redis for persistent rate limiting

### CORS errors
- Set `FRONTEND_URL` to match your frontend domain
- Ensure credentials are included in frontend requests