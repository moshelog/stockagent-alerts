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
   * Evaluate a single strategy for completion with timeframe-specific logic
   * @param {Object} strategy - The strategy to evaluate
   * @param {string} ticker - The ticker symbol
   * @param {Object} newAlert - The new alert that triggered evaluation
   */
  async evaluateStrategy(strategy, ticker, newAlert) {
    try {
      const { id, name, timeframe, rules, threshold } = strategy;
      
      // Parse rules from JSON (if it's a string, otherwise use as is)
      const strategyRules = typeof rules === 'string' ? JSON.parse(rules) : rules;
      
      console.log(`📈 Evaluating strategy "${name}" for ${ticker} with timeframe: ${timeframe === -1 ? 'ANY' : timeframe + 'm'}`);
      
      let isComplete = false;
      let foundRules = [];
      let completedTimeframe = null;
      
      if (timeframe === -1) {
        // ANY TIMEFRAME: Check each timeframe individually
        const timeframesToCheck = [5, 15, 60, 240, 1440]; // 5m, 15m, 1h, 4h, 1d
        
        for (const tf of timeframesToCheck) {
          const result = await this.evaluateStrategyForSpecificTimeframe(strategy, ticker, strategyRules, tf);
          
          if (result.isComplete) {
            isComplete = true;
            foundRules = result.foundRules;
            completedTimeframe = tf;
            console.log(`✅ Strategy "${name}" completed on ${tf}m timeframe for ${ticker}`);
            break; // Stop at first completed timeframe
          }
        }
        
        if (!isComplete) {
          console.log(`❌ Strategy "${name}" not completed on any timeframe for ${ticker}`);
        }
        
      } else {
        // SPECIFIC TIMEFRAME: Check only the specified timeframe
        const result = await this.evaluateStrategyForSpecificTimeframe(strategy, ticker, strategyRules, timeframe);
        isComplete = result.isComplete;
        foundRules = result.foundRules;
        completedTimeframe = timeframe;
        
        console.log(`📊 Strategy "${name}" on ${timeframe}m: ${isComplete ? 'COMPLETED' : 'NOT COMPLETED'} for ${ticker}`);
      }

      // If strategy is complete, record the action
      if (isComplete) {
        await this.recordStrategyCompletion(strategy, ticker, foundRules, [], threshold, newAlert.isTest, [], completedTimeframe);
      }

    } catch (error) {
      console.error(`❌ Error evaluating strategy ${strategy.name}:`, error.message);
    }
  }

  /**
   * Evaluate strategy completion for a specific timeframe
   * @param {Object} strategy - The strategy to evaluate
   * @param {string} ticker - The ticker symbol
   * @param {Array} strategyRules - Parsed strategy rules
   * @param {number} timeframeMinutes - Timeframe in minutes
   * @returns {Object} - { isComplete: boolean, foundRules: Array, recentAlerts: Array }
   */
  async evaluateStrategyForSpecificTimeframe(strategy, ticker, strategyRules, timeframeMinutes) {
    try {
      // Calculate time window (timeframe minutes ago)
      const windowStart = new Date(Date.now() - timeframeMinutes * 60 * 1000);
      
      // Get all alerts for this ticker within the specific timeframe window
      const { data: recentAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*')
        .eq('ticker', ticker)
        .gte('timestamp', windowStart.toISOString())
        .order('timestamp', { ascending: false });

      if (alertsError) {
        throw new Error(`Failed to fetch recent alerts: ${alertsError.message}`);
      }

      // Check which rules are satisfied within this timeframe
      const foundRules = [];
      const missingRules = [];

      for (const rule of strategyRules) {
        // Map the simplified indicator name to the full name used in alerts
        const fullIndicatorName = this.mapIndicatorName(rule.indicator);
        
        // Find if this rule is satisfied by any alert in this timeframe window
        const matchingAlert = recentAlerts.find(alert => 
          alert.indicator === fullIndicatorName && 
          alert.trigger === rule.trigger
        );

        if (matchingAlert) {
          foundRules.push({
            ...rule,
            alertTimestamp: matchingAlert.timestamp,
            timeframe: timeframeMinutes
          });
        } else {
          missingRules.push(rule);
        }
      }

      // Strategy is complete if all rules are found within this single timeframe
      const isComplete = missingRules.length === 0 && foundRules.length === strategyRules.length;
      
      console.log(`  📋 Timeframe ${timeframeMinutes}m: Found ${foundRules.length}/${strategyRules.length} rules for ${ticker}`);
      
      return {
        isComplete,
        foundRules,
        missingRules,
        recentAlerts,
        timeframe: timeframeMinutes
      };

    } catch (error) {
      console.error(`❌ Error evaluating timeframe ${timeframeMinutes}m for strategy ${strategy.name}:`, error.message);
      return {
        isComplete: false,
        foundRules: [],
        missingRules: strategyRules,
        recentAlerts: [],
        timeframe: timeframeMinutes
      };
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
   * @param {number} completedTimeframe - The timeframe where strategy was completed
   */
  async recordStrategyCompletion(strategy, ticker, foundRules, missingRules, threshold, isTest = false, recentAlerts = [], completedTimeframe = null) {
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
        foundRules: foundRules.length,
        completedTimeframe: completedTimeframe ? `${completedTimeframe}m` : 'unknown'
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
        price: alertWithPrice ? alertWithPrice.price : null,
        timeframe: completedTimeframe ? `${completedTimeframe}m` : 'any'
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
   * Calculate score data for a specific strategy with timeframe-specific logic
   * @param {Object} strategy - The strategy to evaluate
   * @param {Array} recentAlerts - All alerts from the time window
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

      let bestResult = {
        ticker: 'N/A',
        timeframe: timeframe === -1 ? 'any' : `${timeframe}m`,
        alertsFound: [],
        missingAlerts: strategyRules.map(r => r.trigger),
        score: 0,
        completedTimeframe: null
      };

      // Group alerts by ticker
      const alertsByTicker = new Map();
      recentAlerts.forEach(alert => {
        if (!alertsByTicker.has(alert.ticker)) {
          alertsByTicker.set(alert.ticker, []);
        }
        alertsByTicker.get(alert.ticker).push(alert);
      });

      // Evaluate each ticker
      for (const [ticker, tickerAlerts] of alertsByTicker) {
        let tickerResult = null;

        if (timeframe === -1) {
          // ANY TIMEFRAME: Check each timeframe for this ticker
          const timeframesToCheck = [5, 15, 60, 240, 1440]; // 5m, 15m, 1h, 4h, 1d
          
          for (const tf of timeframesToCheck) {
            const result = await this.calculateScoreForTickerAndTimeframe(strategy, ticker, strategyRules, tf, recentAlerts);
            
            if (result && result.foundRules.length > (tickerResult?.foundRules.length || 0)) {
              tickerResult = {
                ...result,
                completedTimeframe: tf
              };
              
              // If strategy is complete on this timeframe, break
              if (result.isComplete) {
                break;
              }
            }
          }
        } else {
          // SPECIFIC TIMEFRAME: Check only the specified timeframe
          tickerResult = await this.calculateScoreForTickerAndTimeframe(strategy, ticker, strategyRules, timeframe, recentAlerts);
          if (tickerResult) {
            tickerResult.completedTimeframe = timeframe;
          }
        }

        // Update best result if this ticker has more matches
        if (tickerResult && tickerResult.foundRules.length > bestResult.alertsFound.length) {
          bestResult = {
            ticker: ticker,
            timeframe: timeframe === -1 ? `any (${tickerResult.completedTimeframe}m)` : `${timeframe}m`,
            alertsFound: tickerResult.foundRules.map(r => r.trigger),
            missingAlerts: tickerResult.missingRules.map(r => r.trigger),
            score: tickerResult.score,
            completedTimeframe: tickerResult.completedTimeframe
          };
        }
      }

      return {
        strategy: name,
        ticker: bestResult.ticker,
        timeframe: bestResult.timeframe,
        timestamp: new Date().toLocaleTimeString(),
        alertsFound: bestResult.alertsFound,
        missingAlerts: bestResult.missingAlerts,
        score: bestResult.score
      };

    } catch (error) {
      console.error(`❌ Error calculating strategy score for ${strategy.name}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate score for a specific ticker and timeframe combination
   * @param {Object} strategy - The strategy to evaluate
   * @param {string} ticker - The ticker symbol
   * @param {Array} strategyRules - Parsed strategy rules
   * @param {number} timeframeMinutes - Timeframe in minutes
   * @param {Array} allAlerts - All recent alerts to filter from
   * @returns {Object|null} Score result for this ticker/timeframe
   */
  async calculateScoreForTickerAndTimeframe(strategy, ticker, strategyRules, timeframeMinutes, allAlerts) {
    try {
      // Filter alerts to this ticker and timeframe window
      const windowStart = new Date(Date.now() - timeframeMinutes * 60 * 1000);
      const relevantAlerts = allAlerts.filter(alert => 
        alert.ticker === ticker && 
        new Date(alert.timestamp) >= windowStart
      );

      const foundRules = [];
      const missingRules = [];

      // Check each rule against the relevant alerts
      for (const rule of strategyRules) {
        const fullIndicatorName = this.mapIndicatorName(rule.indicator);
        
        const matchingAlert = relevantAlerts.find(alert => 
          alert.indicator === fullIndicatorName && 
          alert.trigger === rule.trigger
        );

        if (matchingAlert) {
          foundRules.push(rule);
        } else {
          missingRules.push(rule);
        }
      }

      // Calculate score for found rules
      let totalScore = 0;
      if (foundRules.length > 0) {
        totalScore = await this.calculateScore(foundRules);
      }

      const isComplete = missingRules.length === 0 && foundRules.length === strategyRules.length;

      return {
        isComplete,
        foundRules,
        missingRules,
        score: totalScore,
        timeframe: timeframeMinutes
      };

    } catch (error) {
      console.error(`❌ Error calculating score for ${ticker} on ${timeframeMinutes}m:`, error.message);
      return null;
    }
  }
}

module.exports = new StrategyEvaluator();