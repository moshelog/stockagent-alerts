const axios = require('axios');
const { supabase } = require('../config/database');

/**
 * Telegram Notification Service
 * Handles sending formatted alerts to Telegram users/channels
 */
class TelegramNotifier {
  constructor() {
    this.baseUrl = 'https://api.telegram.org/bot';
  }

  /**
   * Send a formatted notification to Telegram
   * @param {Object} notificationData - The notification data
   * @param {string} notificationData.action - BUY or SELL
   * @param {string} notificationData.ticker - The ticker symbol
   * @param {string} notificationData.strategy - Strategy name
   * @param {Array} notificationData.triggers - Array of trigger names
   * @param {number} notificationData.score - Total score
   * @param {Object} telegramConfig - Telegram configuration
   * @param {string} telegramConfig.botToken - Bot token
   * @param {string} telegramConfig.chatId - Chat or channel ID
   * @param {Object} telegramConfig.messageTemplate - Custom message template
   */
  async sendNotification(notificationData, telegramConfig) {
    try {
      const { botToken, chatId, messageTemplate } = telegramConfig;
      
      if (!botToken || !chatId) {
        console.log('⚠️ Telegram not configured, skipping notification');
        return { success: false, message: 'Telegram not configured' };
      }

      // Format the message based on template or use default
      const message = this.formatMessage(notificationData, messageTemplate);
      
      // Send message via Telegram API
      const url = `${this.baseUrl}${botToken}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      console.log('✅ Telegram notification sent successfully');
      return { success: true, message: 'Notification sent', data: response.data };

    } catch (error) {
      console.error('❌ Failed to send Telegram notification:', error.message);
      if (error.response) {
        console.error('Telegram API error:', error.response.data);
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Format the notification message based on template
   * @param {Object} data - Notification data
   * @param {Object} template - Message template configuration
   * @returns {string} Formatted message
   */
  formatMessage(data, template = {}) {
    const { action, ticker, strategy, triggers, score, isTest } = data;
    const timestamp = new Date().toLocaleString();
    
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
    
    // Build message based on format
    let message = '';
    
    if (config.format === 'minimal') {
      // Minimal format: Just action and ticker
      const emoji = action === 'BUY' ? '🟢' : '🔴';
      const testTag = isTest ? ' (Test)' : '';
      message = `${emoji} ${action} ${ticker}${testTag}`;
      if (config.showScore) {
        message += ` (${score > 0 ? '+' : ''}${score})`;
      }
    } else if (config.format === 'compact') {
      // Compact format: One-liner with key info
      const emoji = action === 'BUY' ? '🟢' : '🔴';
      const testTag = isTest ? ' (Test)' : '';
      message = `${emoji} <b>${action} ${ticker}${testTag}</b>`;
      if (config.showStrategy) {
        message += ` | ${strategy}`;
      }
      if (config.showScore) {
        message += ` | Score: ${score > 0 ? '+' : ''}${score}`;
      }
    } else {
      // Detailed format: Full information
      const emoji = action === 'BUY' ? '🟢' : '🔴';
      const actionText = action === 'BUY' ? 'BUY SIGNAL' : 'SELL SIGNAL';
      const testTag = isTest ? ' (Test)' : '';
      
      message = `${emoji} <b>${actionText}${testTag}</b>\n`;
      message += `━━━━━━━━━━━━━━━\n`;
      
      if (config.showTicker) {
        message += `💎 <b>Ticker:</b> ${ticker}\n`;
      }
      if (config.showTimestamp) {
        message += `⏰ <b>Time:</b> ${timestamp}\n`;
      }
      if (config.showStrategy) {
        message += `🧠 <b>Strategy:</b> ${strategy}\n`;
      }
      if (config.showTriggers && triggers && triggers.length > 0) {
        message += `🎯 <b>Triggers:</b> ${triggers.join(', ')}\n`;
      }
      if (config.showScore) {
        message += `🔥 <b>Score:</b> ${score > 0 ? '+' : ''}${score}\n`;
      }
      
      message += `━━━━━━━━━━━━━━━`;
    }
    
    return message;
  }

  /**
   * Test Telegram connection by sending a test message
   * @param {string} botToken - Bot token
   * @param {string} chatId - Chat ID
   * @returns {Object} Test result
   */
  async testConnection(botToken, chatId) {
    try {
      const url = `${this.baseUrl}${botToken}/sendMessage`;
      const testMessage = `🔔 <b>StockAgent Test Message</b>\n\n` +
                         `✅ Your Telegram notifications are configured correctly!\n\n` +
                         `You will receive alerts here when your trading strategies are triggered.`;
      
      const response = await axios.post(url, {
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML'
      });

      return { success: true, message: 'Test message sent successfully' };
    } catch (error) {
      console.error('Telegram test failed:', error.message);
      if (error.response && error.response.data) {
        const telegramError = error.response.data;
        if (telegramError.description) {
          return { success: false, message: `Telegram API: ${telegramError.description}` };
        }
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Get Telegram configuration for a user
   * @param {string} userId - User ID (for future multi-user support)
   * @returns {Object} Telegram configuration
   */
  async getTelegramConfig(userId = 'default') {
    try {
      // Fetch from database
      const { data, error } = await supabase
        .from('user_settings')
        .select('telegram_bot_token, telegram_chat_id, telegram_message_template, telegram_enabled')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.log('No user settings found, using defaults');
        return {
          botToken: '',
          chatId: '',
          messageTemplate: {
            showTimestamp: true,
            showTicker: true,
            showStrategy: true,
            showTriggers: true,
            showScore: true,
            format: 'detailed'
          }
        };
      }

      return {
        botToken: data.telegram_bot_token || '',
        chatId: data.telegram_chat_id || '',
        messageTemplate: data.telegram_message_template || {
          showTimestamp: true,
          showTicker: true,
          showStrategy: true,
          showTriggers: true,
          showScore: true,
          format: 'detailed'
        },
        enabled: data.telegram_enabled
      };
    } catch (error) {
      console.error('Failed to get Telegram config:', error.message);
      return {
        botToken: '',
        chatId: '',
        messageTemplate: {}
      };
    }
  }

  /**
   * Save Telegram configuration for a user
   * @param {string} userId - User ID
   * @param {Object} config - Telegram configuration
   * @returns {Object} Save result
   */
  async saveTelegramConfig(userId = 'default', config) {
    try {
      const { botToken, chatId, messageTemplate } = config;
      
      // First get existing settings
      const { data: existing } = await supabase
        .from('user_settings')
        .select('telegram_bot_token')
        .eq('user_id', userId)
        .single();
      
      // Build update object
      const updateData = {
        user_id: userId,
        telegram_chat_id: chatId,
        telegram_message_template: messageTemplate,
        updated_at: new Date().toISOString()
      };
      
      // Only update bot token if a new one is provided (not null)
      if (botToken !== null) {
        updateData.telegram_bot_token = botToken;
      } else if (existing && existing.telegram_bot_token) {
        // Keep existing token
        updateData.telegram_bot_token = existing.telegram_bot_token;
      }
      
      const { data, error } = await supabase
        .from('user_settings')
        .upsert(updateData, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to save Telegram config:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new TelegramNotifier();