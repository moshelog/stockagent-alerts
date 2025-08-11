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
      
      // Handle different timeframe logic
      let isComplete = false;
      let foundRules = [];
      let missingRules = [];
      let completedTimeframe = null;
      
      if (timeframe === 0) {
        // "Any timeframe" - check each supported timeframe separately
        const supportedTimeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];
        
        for (const tf of supportedTimeframes) {
          const result = await this.checkStrategyInTimeframe(ticker, strategyRules, tf);
          if (result.isComplete) {
            isComplete = true;
            foundRules = result.foundRules;
            missingRules = result.missingRules;
            completedTimeframe = tf;
            break; // Strategy completed in this timeframe, no need to check others
          }
        }
      } else {
        // Specific timeframe - convert timeframe minutes to timeframe string
        const timeframeStr = this.convertMinutesToTimeframe(timeframe);
        const result = await this.checkStrategyInTimeframe(ticker, strategyRules, timeframeStr);
        isComplete = result.isComplete;
        foundRules = result.foundRules;
        missingRules = result.missingRules;
        completedTimeframe = timeframeStr;
      }
      
      console.log(`📈 Strategy "${name}" for ${ticker}:`, {
        complete: isComplete,
        found: foundRules.length,
        missing: missingRules.length,
        timeframe: completedTimeframe || (timeframe === 0 ? 'any' : `${timeframe}m`)
      });

      // If strategy is complete, record the action
      if (isComplete) {
        await this.recordStrategyCompletion(strategy, ticker, foundRules, missingRules, threshold, newAlert.isTest, []);
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
   * @param {boolean} isTest - Whether this is a test signal
   * @param {Array} recentAlerts - Recent alerts for this ticker (for price lookup)
   */
  async recordStrategyCompletion(strategy, ticker, foundRules, missingRules, threshold, isTest = false, recentAlerts = []) {
    try {
      // Determine action based on strategy name and triggers
      // Analyze both strategy name and triggers to determine BUY vs SELL
      const strategyNameLower = strategy.name.toLowerCase();
      
      // Check triggers for bullish/bearish signals
      const triggersText = foundRules.map(rule => rule.trigger.toLowerCase()).join(' ');
      const hasBullishTriggers = triggersText.includes('bullish') || triggersText.includes('discount') || triggersText.includes('oversold');
      const hasBearishTriggers = triggersText.includes('bearish') || triggersText.includes('premium') || triggersText.includes('overbought');
      
      // Determine if this is a buy strategy based on name and triggers
      const isBuyStrategy = strategyNameLower.includes('buy') || 
                           strategyNameLower.includes('discount') ||
                           strategyNameLower.includes('equilibrium') ||
                           hasBullishTriggers ||
                           (!hasBearishTriggers && strategyNameLower.includes('reversal'));
      
      const action = isBuyStrategy ? 'BUY' : 'SELL';
      
      // Debug logging for action determination
      console.log(`🎯 Action determination for "${strategy.name}":`, {
        strategyName: strategy.name,
        triggersText,
        hasBullishTriggers,
        hasBearishTriggers,
        isBuyStrategy,
        finalAction: action
      });
      
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
      
      // Get the most recent alert with price information for this ticker
      const alertWithPrice = recentAlerts.find(alert => alert.ticker === ticker && alert.price && alert.price > 0);
      
      const notificationData = {
        action,
        ticker,
        strategy: strategy.name,
        triggers,
        score,
        isTest: isTest,
        price: alertWithPrice ? alertWithPrice.price : null
      };

      // Send Telegram notification
      try {
        const telegramConfig = await telegramNotifier.getTelegramConfig();
        console.log('🔔 Telegram config check:', {
          enabled: telegramConfig.enabled,
          hasBotToken: !!telegramConfig.botToken,
          hasChatId: !!telegramConfig.chatId
        });
        
        if (telegramConfig.enabled && telegramConfig.botToken && telegramConfig.chatId) {
          console.log('📤 Sending Telegram notification for:', notificationData.action, notificationData.ticker);
          const result = await telegramNotifier.sendNotification(notificationData, telegramConfig);
          console.log('✅ Telegram notification result:', result.success ? 'SUCCESS' : 'FAILED', result.message);
        } else {
          console.log('⚠️ Telegram notification skipped - config incomplete');
        }
      } catch (notificationError) {
        console.error('❌ Failed to send Telegram notification:', notificationError.message);
        // Continue even if notification fails
      }

      // Send Discord notification
      try {
        const discordConfig = await discordNotifier.getDiscordConfig();
        console.log('🔔 Discord config check:', {
          enabled: discordConfig.enabled,
          hasWebhookUrl: !!discordConfig.webhookUrl
        });
        
        if (discordConfig.enabled && discordConfig.webhookUrl) {
          console.log('📤 Sending Discord notification for:', notificationData.action, notificationData.ticker);
          const result = await discordNotifier.sendNotification(notificationData, discordConfig);
          console.log('✅ Discord notification result:', result.success ? 'SUCCESS' : 'FAILED', result.message);
        } else {
          console.log('⚠️ Discord notification skipped - config incomplete');
        }
      } catch (notificationError) {
        console.error('❌ Failed to send Discord notification:', notificationError.message);
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

  /**
   * Convert timeframe in minutes to timeframe string
   * @param {number} minutes - Timeframe in minutes
   * @returns {string} Timeframe string (e.g., '5m', '1h', '1D')
   */
  convertMinutesToTimeframe(minutes) {
    const timeframeMap = {
      1: '1m',
      5: '5m', 
      15: '15m',
      60: '1h',
      240: '4h',
      1440: '1D'
    };
    
    return timeframeMap[minutes] || '15m'; // Default to 15m if not found
  }

  /**
   * Check if a strategy is complete within a specific timeframe
   * @param {string} ticker - The ticker symbol
   * @param {Array} strategyRules - Rules for the strategy
   * @param {string} timeframe - Timeframe string (e.g., '5m', '1h')
   * @returns {Object} Result with isComplete, foundRules, missingRules
   */
  async checkStrategyInTimeframe(ticker, strategyRules, timeframe) {
    try {
      // Calculate time window (last 24 hours should be enough for all timeframes)
      const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Get alerts for this ticker and timeframe within time window
      const { data: timeframeAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .eq('ticker', ticker)
        .eq('timeframe', timeframe)
        .gte('timestamp', windowStart.toISOString())
        .order('timestamp', { ascending: false });

      if (alertsError) {
        throw new Error(`Failed to fetch alerts for ${timeframe}: ${alertsError.message}`);
      }

      // Check which rules are satisfied within this specific timeframe
      const foundRules = [];
      const missingRules = [];

      for (const rule of strategyRules) {
        // Map the simplified indicator name to the full name used in alerts
        const fullIndicatorName = this.mapIndicatorName(rule.indicator);
        
        const ruleFound = timeframeAlerts.some(alert => 
          alert.indicator === fullIndicatorName && 
          alert.trigger === rule.trigger
        );

        if (ruleFound) {
          foundRules.push(rule);
        } else {
          missingRules.push(rule);
        }
      }

      // Strategy is complete if all rules are found within this single timeframe
      const isComplete = missingRules.length === 0;
      
      return {
        isComplete,
        foundRules,
        missingRules,
        timeframe
      };

    } catch (error) {
      console.error(`❌ Error checking strategy in ${timeframe}:`, error.message);
      return {
        isComplete: false,
        foundRules: [],
        missingRules: strategyRules,
        timeframe
      };
    }
  }
}

module.exports = new StrategyEvaluator();