# 🚀 Production Setup for Real-time Extreme Indicators

## 1. Database Setup (Required)

**⚠️ CRITICAL: The `ticker_indicators` table doesn't exist yet in your Supabase database.**

### Step 1: Create the table
1. Go to your Supabase dashboard
2. Open the **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Add ticker_indicators table to store current indicator values
-- This stores the latest VWAP, RSI, ADX, and HTF values for each ticker

CREATE TABLE IF NOT EXISTS ticker_indicators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker text NOT NULL,
  vwap_value decimal(10,4),           -- VWAP percentage distance (e.g., 0.75 for 0.75%)
  rsi_value decimal(6,2),             -- RSI value (e.g., 68.5)
  rsi_status text,                    -- RSI status (e.g., "OB", "OS", "Neutral")
  adx_value decimal(6,2),             -- ADX value (e.g., 32.1)
  adx_strength text,                  -- ADX strength (e.g., "Strong", "Weak")
  adx_direction text,                 -- ADX direction (e.g., "Bullish", "Bearish")
  htf_status text,                    -- HTF synergy status (e.g., "Reversal Bullish")
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure only one record per ticker
  UNIQUE(ticker)
);

-- Index for efficient ticker lookups
CREATE INDEX IF NOT EXISTS idx_ticker_indicators_ticker ON ticker_indicators(ticker);
CREATE INDEX IF NOT EXISTS idx_ticker_indicators_updated_at ON ticker_indicators(updated_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticker_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on ticker_indicators
CREATE TRIGGER update_ticker_indicators_updated_at BEFORE UPDATE ON ticker_indicators
    FOR EACH ROW EXECUTE FUNCTION update_ticker_indicators_updated_at();

-- Grant permissions
GRANT ALL ON ticker_indicators TO authenticated;
GRANT ALL ON ticker_indicators TO anon;
```

4. Click **Run** to execute the SQL

## 2. Backend Deployment (Required)

The backend needs to be deployed with the new webhook parser code.

### Deploy Backend to Railway:
```bash
cd "/Users/moshelugasi/Downloads/Github/stockagent alerts"
railway service stockagent-backend
railway up
```

## 3. Frontend Deployment (Required)

The frontend needs the new hook and updated component.

### Deploy Frontend to Railway:
```bash
cd "/Users/moshelugasi/Downloads/Github/stockagent alerts"
railway service amused-growth
railway up
```

## 4. Verification Steps

After both deployments:

1. **Test the API endpoint:**
   ```bash
   curl https://api.stockagent.app/api/ticker-indicators
   ```
   Should return an empty array `[]` initially.

2. **Send a test webhook:**
   ```bash
   curl -X POST "https://api.stockagent.app/webhook" \
     -H "Content-Type: text/plain" \
     -d "BTC|15m|Extreme|Premium Zone Touch | VWAP: 0.75% | RSI: 68.5 (OB) | ADX: 32.1 (Strong Bullish) | HTF: Reversal Bullish"
   ```

3. **Check if indicators were stored:**
   ```bash
   curl https://api.stockagent.app/api/ticker-indicators/BTC
   ```
   Should return the parsed indicator values.

4. **Verify frontend updates:**
   - Open https://app.stockagent.app
   - Check that RSI, ADX, VWAP tags show the live values
   - Send another Extreme alert and watch for real-time updates

## 🔧 Why It's Not Working Now

1. **Database table missing** - The `ticker_indicators` table doesn't exist in Supabase
2. **Backend not deployed** - The new webhook parser isn't live yet
3. **Frontend not deployed** - The new hook isn't active yet

Once you complete steps 1-3 above, the system will automatically:
- Parse all Extreme alerts for VWAP, RSI, ADX, HTF values
- Store them in real-time in the database
- Display live values in the frontend tags
- Update every 5 seconds without needing separate indicator alerts

## 🎯 Expected Result

After setup, when you get an alert like:
```
BTCUSDT.P | 118878.0 | 5M | Extreme | Premium Zone Wick Reversal | VWAP: 0.3% | RSI: 59 (NEUTRAL) | ADX: 18.6 (Weak Bullish) | HTF: No Synergy
```

The dashboard will automatically show:
- **RSI: 59 NEUTRAL** (instead of RSI 0 Neutral)
- **ADX: 18.6 Weak Bullish** (instead of ADX 0 Neutral)  
- **VWAP: 0.3%** (instead of VWAP 0%)
- **HTF: No Synergy** (new tag)