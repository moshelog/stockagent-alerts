# StockAgent Backend

A Node.js backend service that processes TradingView webhooks, evaluates multi-alert trading strategies, and provides real-time data to the StockAgent dashboard.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Initialize database schema
# Copy and run the SQL from scripts/init-schema.sql in your Supabase SQL editor

# Start development server
npm run dev

# Or start production server
npm start
```

## Environment Variables

Create a `.env` file with the following variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
NODE_ENV=development
```

## Database Setup

1. Create a new Supabase project
2. Copy the SQL from `scripts/init-schema.sql`
3. Run it in your Supabase SQL editor
4. This creates all required tables and inserts default alert configurations

## Architecture

### Core Components

- **Webhook Handler** (`POST /webhook`): Receives TradingView alerts and triggers strategy evaluation
- **Strategy Evaluator** (`services/strategyEvaluator.js`): Evaluates strategies within timeframes and records actions
- **REST API**: Provides data to the frontend dashboard
- **Supabase Integration**: Database operations with PostgreSQL

### Data Flow

1. **TradingView** sends alert via webhook → `POST /webhook`
2. **Backend** saves alert to database → evaluates all enabled strategies
3. **Strategy evaluation** checks if all required alerts exist within timeframe
4. **If complete**: Records BUY/SELL action based on strategy threshold
5. **Frontend** polls `/api/score` and `/api/alerts` for real-time updates

## API Endpoints

### Webhook
- `POST /webhook` - Receive TradingView alerts

### Data Retrieval
- `GET /api/alerts?limit=50` - Recent alerts
- `GET /api/strategies` - All strategies
- `GET /api/score` - Latest action + ticker scores
- `GET /api/actions?limit=20` - Recent actions
- `GET /api/available-alerts` - Alert configurations with weights

### Strategy Management
- `POST /api/strategies` - Create strategy
- `PUT /api/strategies/:id` - Update strategy
- `DELETE /api/strategies/:id` - Delete strategy

### Utility
- `GET /api/health` - Health check
- `GET /api/stats` - System statistics

### Development Only
- `POST /api/test/alerts` - Create test alert data

## Strategy Logic

### How Strategies Work

1. **Strategy Definition**: Each strategy has:
   - Name and timeframe (e.g., 15 minutes)
   - Rules: Array of required `{indicator, trigger}` pairs
   - Threshold: Positive = BUY signal, Negative = SELL signal

2. **Strategy Evaluation**: When an alert arrives:
   - Fetch all alerts for that ticker within the timeframe window
   - Check if ALL strategy rules are satisfied
   - If complete → record action with timestamp

3. **Action Recording**: 
   - Action type determined by threshold sign
   - Score calculated from alert weights
   - Found/missing rules tracked for debugging

### Example Strategy

```json
{
  "name": "Buy on discount zone",
  "timeframe": 15,
  "rules": [
    {"indicator": "Extreme Zones", "trigger": "Discount Zone"},
    {"indicator": "Nautilus™", "trigger": "Normal Bullish Divergence"}
  ],
  "threshold": 3.0
}
```

This strategy triggers a BUY when both alerts occur within 15 minutes.

## TradingView Setup

### Webhook Configuration

1. In TradingView, create alerts for each indicator/trigger combination
2. Set webhook URL to: `http://your-domain.com/webhook`
3. Use this JSON format in the alert message:

```json
{
  "ticker": "{{ticker}}",
  "time": "{{time}}",
  "indicator": "Nautilus™",
  "trigger": "Normal Bullish Divergence"
}
```

### Required Fields

- `ticker`: Stock/crypto symbol (e.g., "BTC", "AAPL")
- `indicator`: Must match database exactly (e.g., "Nautilus™")
- `trigger`: Must match database exactly (e.g., "Buy Signal")
- `time`: Optional, uses server time if not provided

## Development

### Project Structure

```
backend/
├── config/
│   └── database.js          # Supabase client setup
├── services/
│   └── strategyEvaluator.js  # Strategy evaluation logic
├── scripts/
│   └── init-schema.sql      # Database schema
├── server.js                # Main Express application
├── package.json
└── README.md
```

### Adding New Features

1. **New Indicators**: Add to `available_alerts` table
2. **New Strategy Types**: Extend `strategyEvaluator.js`
3. **New Endpoints**: Add to `server.js` with proper validation
4. **Database Changes**: Update `init-schema.sql`

### Error Handling

- All async routes wrapped with `asyncHandler`
- Comprehensive validation on webhook payloads
- Rate limiting: 1000 API requests/15min, 200 webhooks/min
- Graceful database connection failures

### Security Features

- Helmet.js for security headers
- CORS enabled for frontend
- Rate limiting on all endpoints
- Input validation and sanitization
- Error messages sanitized in production

## Deployment

### Prerequisites

- Node.js 16+ 
- Supabase project with database initialized
- Domain/server for webhook URL

### Steps

1. Clone repository
2. Run `npm install`
3. Set environment variables
4. Initialize database schema
5. Start with `npm start`

### Production Considerations

- Use process manager (PM2, systemd)
- Set up reverse proxy (nginx)
- Configure SSL/TLS for webhook security
- Monitor logs and database performance
- Set up alerts for failed strategy evaluations

## Monitoring

The backend logs all important events:

- ✅ Successful webhook processing
- 📊 Strategy evaluation results
- 🎯 Strategy completions (BUY/SELL signals)
- ❌ Errors and failures

Check `/api/health` and `/api/stats` for system status.