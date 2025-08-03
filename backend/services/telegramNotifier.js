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
    const { action, ticker, strategy, triggers, score } = data;
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
      message = `${emoji} ${action} ${ticker}`;
      if (config.showScore) {
        message += ` (${score > 0 ? '+' : ''}${score})`;
      }
    } else if (config.format === 'compact') {
      // Compact format: One-liner with key info
      const emoji = action === 'BUY' ? '🟢' : '🔴';
      message = `${emoji} <b>${action} ${ticker}</b>`;
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
      
      message = `${emoji} <b>${actionText}</b>\n`;
      message += `━━━━━━━━━━━━━━━\n`;
      
      if (config.showTimestamp) {
        message += `📅 <b>Time:</b> ${timestamp}\n`;
      }
      if (config.showTicker) {
        message += `📈 <b>Ticker:</b> ${ticker}\n`;
      }
      if (config.showStrategy) {
        message += `📊 <b>Strategy:</b> ${strategy}\n`;
      }
      if (config.showTriggers && triggers && triggers.length > 0) {
        message += `🎯 <b>Triggers:</b> ${triggers.join(', ')}\n`;
      }
      if (config.showScore) {
        const scoreEmoji = score > 0 ? '📈' : '📉';
        message += `${scoreEmoji} <b>Score:</b> ${score > 0 ? '+' : ''}${score}\n`;
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
      // For now, we'll use environment variables
      // In future, this could fetch from user settings in database
      const config = {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
        messageTemplate: {
          showTimestamp: process.env.TELEGRAM_SHOW_TIMESTAMP !== 'false',
          showTicker: process.env.TELEGRAM_SHOW_TICKER !== 'false',
          showStrategy: process.env.TELEGRAM_SHOW_STRATEGY !== 'false',
          showTriggers: process.env.TELEGRAM_SHOW_TRIGGERS !== 'false',
          showScore: process.env.TELEGRAM_SHOW_SCORE !== 'false',
          format: process.env.TELEGRAM_MESSAGE_FORMAT || 'detailed'
        }
      };

      return config;
    } catch (error) {
      console.error('Failed to get Telegram config:', error.message);
      return {
        botToken: '',
        chatId: '',
        messageTemplate: {}
      };
    }
  }
}

module.exports = new TelegramNotifier();