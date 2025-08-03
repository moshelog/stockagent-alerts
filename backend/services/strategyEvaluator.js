const { supabase } = require('../config/database');
const telegramNotifier = require('./telegramNotifier');
const discordNotifier = require('./discordNotifier');

/**
 * Strategy Evaluation Service
 * Evaluates if strategies are completed when new alerts arrive
 */
class StrategyEvaluator {
  
  /**
   * Evaluate all enabled strategies for a ticker when new alert arrives
   * @param {string} ticker - The ticker symbol
   * @param {Object} newAlert - The new alert that just arrived
   */
  async evaluateStrategiesForTicker(ticker, newAlert) {
    try {
      // Get all enabled strategies
      const { data: strategies, error: strategiesError } = await supabase
        .from('strategies')
        .select('*')
        .eq('enabled', true);

      if (strategiesError) {
        throw new Error(`Failed to fetch strategies: ${strategiesError.message}`);
      }

      console.log(`📊 Evaluating ${strategies.length} enabled strategies for ${ticker}`);

      // Evaluate each strategy
      for (const strategy of strategies) {
        await this.evaluateStrategy(strategy, ticker, newAlert);
      }

    } catch (error) {
      console.error('❌ Error evaluating strategies:', error.message);
      throw error;
    }
  }

  /**
   * Map simplified indicator names to full names
   * @param {string} simplifiedIndicator - The simplified indicator name from strategy
   * @returns {string} The full indicator name used in alerts
   */
  mapIndicatorName(simplifiedIndicator) {
    const indicatorMap = {
      'extreme_zones': 'Extreme Zones',
      'nautilus': 'Nautilus™',
      'market_core': 'Market Core Pro™',
      'market_waves': 'Market Waves Pro™'
    };
    
    return indicatorMap[simplifiedIndicator] || simplifiedIndicator;
  }

  /**
   * Evaluate a single strategy for completion
   * @param {Object} strategy - The strategy to evaluate
   * @param {string} ticker - The ticker symbol
   * @param {Object} newAlert - The new alert that triggered evaluation
   */
  async evaluateStrategy(strategy, ticker, newAlert) {
    try {
      const { id, name, timeframe, rules, threshold } = strategy;
      
      // Parse rules from JSON (if it's a string, otherwise use as is)
      const strategyRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
      
      // Calculate time window (timeframe minutes ago)
      const windowStart = new Date(Date.now() - timeframe * 60 * 1000);
      
      // Get all alerts for this ticker within the timeframe
      const { data: recentAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .eq('ticker', ticker)
        .gte('timestamp', windowStart.toISOString())
        .order('timestamp', { ascending: false });

      if (alertsError) {
        throw new Error(`Failed to fetch recent alerts: ${alertsError.message}`);
      }

      // Check which rules are satisfied
      const foundRules = [];
      const missingRules = [];

      for (const rule of strategyRules) {
        // Map the simplified indicator name to the full name used in alerts
        const fullIndicatorName = this.mapIndicatorName(rule.indicator);
        
        const ruleFound = recentAlerts.some(alert => 
          alert.indicator === fullIndicatorName && 
          alert.trigger === rule.trigger
        );

        if (ruleFound) {
          foundRules.push(rule);
        } else {
          missingRules.push(rule);
        }
      }

      // Check if strategy is complete (all rules found)
      const isComplete = missingRules.length === 0;
      
      console.log(`📈 Strategy "${name}" for ${ticker}:`, {
        complete: isComplete,
        found: foundRules.length,
        missing: missingRules.length,
        timeframe: `${timeframe}m`
      });

      // If strategy is complete, record the action
      if (isComplete) {
        await this.recordStrategyCompletion(strategy, ticker, foundRules, missingRules, threshold);
      }

    } catch (error) {
      console.error(`❌ Error evaluating strategy ${strategy.name}:`, error.message);
    }
  }

  /**
   * Record a completed strategy as an action
   * @param {Object} strategy - The completed strategy
   * @param {string} ticker - The ticker symbol
   * @param {Array} foundRules - Rules that were satisfied
   * @param {Array} missingRules - Rules that were not satisfied (should be empty)
   * @param {number} threshold - Strategy threshold for determining action
   */
  async recordStrategyCompletion(strategy, ticker, foundRules, missingRules, threshold) {
    try {
      // Determine action based on strategy name and threshold
      // Buy confirmation strategies should generate BUY signals
      // Sell confirmation strategies should generate SELL signals
      const isBuyStrategy = strategy.name.toLowerCase().includes('buy') || strategy.name.toLowerCase().includes('discount');
      const action = isBuyStrategy ? 'BUY' : 'SELL';
      
      // Calculate score (for future use - sum of weights from found rules)
      const score = await this.calculateScore(foundRules);

      // Record the action
      const { data, error } = await supabase
        .from('actions')
        .insert({
          strategy_id: strategy.id,
          ticker: ticker,
          action: action,
          found: foundRules,
          missing: missingRules,
          score: score
        })
        .select();

      if (error) {
        throw new Error(`Failed to record action: ${error.message}`);
      }

      console.log(`🎯 STRATEGY COMPLETED! ${action} signal for ${ticker}`, {
        strategy: strategy.name,
        action: action,
        score: score,
        foundRules: foundRules.length
      });

      // Send notifications
      const triggers = foundRules.map(rule => rule.trigger);
      const notificationData = {
        action,
        ticker,
        strategy: strategy.name,
        triggers,
        score
      };

      // Send Telegram notification
      try {
        const telegramConfig = await telegramNotifier.getTelegramConfig();
        if (telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId) {
          await telegramNotifier.sendNotification(notificationData, telegramConfig);
        }
      } catch (notificationError) {
        console.error('Failed to send Telegram notification:', notificationError.message);
        // Continue even if notification fails
      }

      // Send Discord notification
      try {
        const discordConfig = await discordNotifier.getDiscordConfig();
        if (discordConfig.enabled && discordConfig.webhookUrl) {
          await discordNotifier.sendNotification(notificationData, discordConfig);
        }
      } catch (notificationError) {
        console.error('Failed to send Discord notification:', notificationError.message);
        // Continue even if notification fails
      }

      return data[0];

    } catch (error) {
      console.error('❌ Error recording strategy completion:', error.message);
      throw error;
    }
  }

  /**
   * Calculate score for found rules (using weights from available_alerts)
   * @param {Array} foundRules - The rules that were found
   * @returns {number} Calculated score
   */
  async calculateScore(foundRules) {
    try {
      let totalScore = 0;

      for (const rule of foundRules) {
        // Get weight from available_alerts table
        const { data: alertConfig, error } = await supabase
          .from('available_alerts')
          .select('weight')
          .eq('indicator', rule.indicator)
          .eq('trigger', rule.trigger)
          .single();

        if (!error && alertConfig) {
          totalScore += alertConfig.weight;
        }
      }

      return Math.round(totalScore * 10) / 10; // Round to 1 decimal place

    } catch (error) {
      console.error('⚠️ Error calculating score:', error.message);
      return 0;
    }
  }

  /**
   * Get the latest action across all strategies (within last 24 hours)
   * @returns {Object|null} Latest action or null
   */
  async getLatestAction() {
    try {
      // Only consider actions from the last 24 hours as "recent"
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          strategies:strategy_id (
            name,
            timeframe
          )
        `)
        .gte('timestamp', twentyFourHoursAgo)  // Only recent actions
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Failed to fetch latest action: ${error.message}`);
      }

      return data.length > 0 ? data[0] : null;

    } catch (error) {
      console.error('❌ Error fetching latest action:', error.message);
      return null;
    }
  }

  /**
   * Get scoring data for all enabled strategies (one row per strategy)
   * @param {number} timeWindowMinutes - Time window in minutes (default: 60)
   * @returns {Array} Array of strategy scoring data
   */
  async getTickerScores(timeWindowMinutes = 60) {
    try {
      // Get enabled strategies
      const { data: strategies, error: strategiesError } = await supabase
        .from('strategies')
        .select('*')
        .eq('enabled', true);

      if (strategiesError) {
        throw new Error(`Failed to fetch strategies: ${strategiesError.message}`);
      }

      // Get alerts from the specified time window
      const timeWindowAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      const { data: recentAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .gte('timestamp', timeWindowAgo.toISOString())
        .order('timestamp', { ascending: false });

      if (alertsError) {
        throw new Error(`Failed to fetch recent alerts: ${alertsError.message}`);
      }

      console.log(`📊 Processing ${strategies.length} strategies with ${recentAlerts.length} alerts from last ${timeWindowMinutes} minutes`);

      // Calculate scores for each strategy
      const strategyScores = [];

      for (const strategy of strategies) {
        const strategyScore = await this.calculateStrategyScore(strategy, recentAlerts);
        if (strategyScore) {
          strategyScores.push(strategyScore);
        }
      }

      return strategyScores;

    } catch (error) {
      console.error('❌ Error getting strategy scores:', error.message);
      return [];
    }
  }

  /**
   * Calculate score data for a specific strategy
   * @param {Object} strategy - The strategy to evaluate
   * @param {Array} recentAlerts - All alerts from the last hour
   * @returns {Object|null} Strategy score data
   */
  async calculateStrategyScore(strategy, recentAlerts) {
    try {
      const { id, name, timeframe, rules, threshold } = strategy;
      
      // Parse rules from JSON (if it's a string, otherwise use as is)
      const strategyRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
      
      if (!strategyRules || strategyRules.length === 0) {
        return null;
      }

      // Find which rules have been satisfied by recent alerts
      const foundRules = [];
      const missingRules = [];
      let totalScore = 0;
      let bestTicker = null;

      // Group alerts by ticker to find the best ticker for this strategy
      const alertsByTicker = new Map();
      recentAlerts.forEach(alert => {
        if (!alertsByTicker.has(alert.ticker)) {
          alertsByTicker.set(alert.ticker, []);
        }
        alertsByTicker.get(alert.ticker).push(alert);
      });

      // Find the ticker with the most matching alerts for this strategy
      let maxMatches = 0;
      let bestTickerFoundRules = [];
      let bestTickerMissingRules = [];

      for (const [ticker, tickerAlerts] of alertsByTicker) {
        const tickerFoundRules = [];
        const tickerMissingRules = [];

        for (const rule of strategyRules) {
          const fullIndicatorName = this.mapIndicatorName(rule.indicator);
          
          const ruleFound = tickerAlerts.some(alert => 
            alert.indicator === fullIndicatorName && 
            alert.trigger === rule.trigger
          );

          if (ruleFound) {
            tickerFoundRules.push(rule.trigger);
          } else {
            tickerMissingRules.push(rule.trigger);
          }
        }

        // If this ticker has more matches, use it as the best ticker for this strategy
        if (tickerFoundRules.length > maxMatches) {
          maxMatches = tickerFoundRules.length;
          bestTicker = ticker;
          bestTickerFoundRules = tickerFoundRules;
          bestTickerMissingRules = tickerMissingRules;
        }
      }

      // Calculate score for found rules
      if (bestTicker && maxMatches > 0) {
        const foundRulesForScore = strategyRules.filter(rule => 
          bestTickerFoundRules.includes(rule.trigger)
        );
        totalScore = await this.calculateScore(foundRulesForScore);
      }

      return {
        strategy: name,
        ticker: bestTicker || 'N/A',
        timeframe: `${timeframe}m`,
        timestamp: new Date().toLocaleTimeString(),
        alertsFound: bestTickerFoundRules,
        missingAlerts: bestTickerMissingRules,
        score: totalScore
      };

    } catch (error) {
      console.error(`❌ Error calculating strategy score for ${strategy.name}:`, error.message);
      return null;
    }
  }
}

module.exports = new StrategyEvaluator();