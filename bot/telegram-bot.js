
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'https://your-repl-name.replit.app';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 'Welcome to ClassikLust! Click the button below to start playing:', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🎮 Play Game',
          web_app: { url: webAppUrl }
        }
      ]]
    }
  });
});

bot.onText(/\/login/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 'Click the button below to login:', {
    reply_markup: {
      inline_keyboard: [[
        {
          text: '🔐 Login with Telegram',
          web_app: { url: webAppUrl }
        }
      ]]
    }
  });
});

console.log('🤖 Telegram bot is running...');
