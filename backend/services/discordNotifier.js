const axios = require('axios');
const { supabase } = require('../config/database');

/**
 * Discord Notification Service
 * Handles sending formatted alerts to Discord channels via webhooks
 */
class DiscordNotifier {
  constructor() {
    // Discord webhook base URL pattern
    this.webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
  }

  /**
   * Send a formatted notification to Discord
   * @param {Object} notificationData - The notification data
   * @param {string} notificationData.action - BUY or SELL
   * @param {string} notificationData.ticker - The ticker symbol
   * @param {string} notificationData.strategy - Strategy name
   * @param {Array} notificationData.triggers - Array of trigger names
   * @param {number} notificationData.score - Total score
   * @param {Object} discordConfig - Discord configuration
   * @param {string} discordConfig.webhookUrl - Discord webhook URL
   * @param {Object} discordConfig.messageTemplate - Custom message template
   */
  async sendNotification(notificationData, discordConfig) {
    try {
      const { webhookUrl, messageTemplate } = discordConfig;
      
      if (!webhookUrl) {
        console.log('⚠️ Discord not configured, skipping notification');
        return { success: false, message: 'Discord not configured' };
      }

      // Validate webhook URL format
      if (!this.webhookPattern.test(webhookUrl)) {
        console.error('❌ Invalid Discord webhook URL format');
        return { success: false, message: 'Invalid webhook URL format' };
      }

      // Create Discord embed based on template
      const embed = this.createEmbed(notificationData, messageTemplate);
      
      // Send message via Discord webhook
      const response = await axios.post(webhookUrl, {
        embeds: [embed],
        username: 'StockAgent Alerts',
        avatar_url: 'https://raw.githubusercontent.com/github/explore/main/topics/trading/trading.png'
      });

      console.log('✅ Discord notification sent successfully');
      return { success: true, message: 'Notification sent' };

    } catch (error) {
      console.error('❌ Failed to send Discord notification:', error.message);
      if (error.response) {
        console.error('Discord API error:', error.response.data);
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Create Discord embed based on notification data and template
   * @param {Object} data - Notification data
   * @param {Object} template - Message template configuration
   * @returns {Object} Discord embed object
   */
  createEmbed(data, template = {}) {
    const { action, ticker, strategy, triggers, score } = data;
    const timestamp = new Date().toISOString();
    
    // Default template if none provided
    const defaultTemplate = {
      showTimestamp: true,
      showTicker: true,
      showStrategy: true,
      showTriggers: true,
      showScore: true,
      format: 'detailed' // 'detailed', 'compact', 'minimal'
    };

    const config = { ...defaultTemplate, ...template };
    
    // Base embed structure
    const embed = {
      timestamp: config.showTimestamp ? timestamp : undefined,
      footer: {
        text: 'StockAgent Alerts',
        icon_url: 'https://raw.githubusercontent.com/github/explore/main/topics/trading/trading.png'
      }
    };
    
    if (config.format === 'minimal') {
      // Minimal format: Just title with action and ticker
      embed.title = `${action} ${ticker}`;
      embed.color = action === 'BUY' ? 0x10B981 : 0xEF4444; // Green or Red
      if (config.showScore) {
        embed.description = `Score: ${score > 0 ? '+' : ''}${score}`;
      }
    } else if (config.format === 'compact') {
      // Compact format: Title with inline fields
      embed.title = `${action} Signal: ${ticker}`;
      embed.color = action === 'BUY' ? 0x10B981 : 0xEF4444;
      embed.fields = [];
      
      if (config.showStrategy) {
        embed.fields.push({
          name: 'Strategy',
          value: strategy,
          inline: true
        });
      }
      if (config.showScore) {
        embed.fields.push({
          name: 'Score',
          value: `${score > 0 ? '+' : ''}${score}`,
          inline: true
        });
      }
    } else {
      // Detailed format: Full embed with all information
      const emoji = action === 'BUY' ? '🟢' : '🔴';
      embed.title = `${emoji} ${action} Signal`;
      embed.color = action === 'BUY' ? 0x10B981 : 0xEF4444;
      embed.fields = [];
      
      if (config.showTicker) {
        embed.fields.push({
          name: '📈 Ticker',
          value: ticker,
          inline: true
        });
      }
      if (config.showStrategy) {
        embed.fields.push({
          name: '📊 Strategy',
          value: strategy,
          inline: true
        });
      }
      if (config.showScore) {
        const scoreEmoji = score > 0 ? '📈' : '📉';
        embed.fields.push({
          name: `${scoreEmoji} Score`,
          value: `${score > 0 ? '+' : ''}${score}`,
          inline: true
        });
      }
      if (config.showTriggers && triggers && triggers.length > 0) {
        embed.fields.push({
          name: '🎯 Triggers',
          value: triggers.join('\n'),
          inline: false
        });
      }
    }
    
    return embed;
  }

  /**
   * Test Discord webhook by sending a test message
   * @param {string} webhookUrl - Discord webhook URL
   * @returns {Object} Test result
   */
  async testConnection(webhookUrl) {
    try {
      // Validate webhook URL format
      if (!this.webhookPattern.test(webhookUrl)) {
        return { success: false, message: 'Invalid Discord webhook URL format' };
      }

      const testEmbed = {
        title: '🔔 StockAgent Test Message',
        description: '✅ Your Discord notifications are configured correctly!\n\nYou will receive alerts here when your trading strategies are triggered.',
        color: 0x5865F2, // Discord blurple
        timestamp: new Date().toISOString(),
        footer: {
          text: 'StockAgent Alerts',
          icon_url: 'https://raw.githubusercontent.com/github/explore/main/topics/trading/trading.png'
        }
      };
      
      await axios.post(webhookUrl, {
        embeds: [testEmbed],
        username: 'StockAgent Alerts',
        avatar_url: 'https://raw.githubusercontent.com/github/explore/main/topics/trading/trading.png'
      });

      return { success: true, message: 'Test message sent successfully' };
    } catch (error) {
      console.error('Discord test failed:', error.message);
      if (error.response && error.response.data) {
        const discordError = error.response.data;
        if (discordError.message) {
          return { success: false, message: `Discord API: ${discordError.message}` };
        }
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Get Discord configuration for a user
   * @param {string} userId - User ID (for future multi-user support)
   * @returns {Object} Discord configuration
   */
  async getDiscordConfig(userId = 'default') {
    try {
      // Fetch from database
      const { data, error } = await supabase
        .from('user_settings')
        .select('discord_webhook_url, discord_message_template, discord_enabled')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.log('No user settings found for Discord, using defaults. Error:', error?.message);
        return {
          webhookUrl: '',
          messageTemplate: {
            showTimestamp: true,
            showTicker: true,
            showStrategy: true,
            showTriggers: true,
            showScore: true,
            format: 'detailed'
          },
          enabled: true
        };
      }

      return {
        webhookUrl: data.discord_webhook_url || '',
        messageTemplate: data.discord_message_template || {
          showTimestamp: true,
          showTicker: true,
          showStrategy: true,
          showTriggers: true,
          showScore: true,
          format: 'detailed'
        },
        enabled: data.discord_enabled
      };
    } catch (error) {
      console.error('Failed to get Discord config:', error.message);
      return {
        webhookUrl: '',
        messageTemplate: {}
      };
    }
  }

  /**
   * Save Discord configuration for a user
   * @param {string} userId - User ID
   * @param {Object} config - Discord configuration
   * @returns {Object} Save result
   */
  async saveDiscordConfig(userId = 'default', config) {
    try {
      const { webhookUrl, messageTemplate } = config;
      
      const updateData = {
        user_id: userId,
        discord_webhook_url: webhookUrl,
        discord_message_template: messageTemplate,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(updateData, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        console.error('Failed to save Discord config to database:', error);
        throw error;
      }

      console.log('Discord config saved successfully for user:', userId);
      return { success: true, data };
    } catch (error) {
      console.error('Failed to save Discord config:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DiscordNotifier();