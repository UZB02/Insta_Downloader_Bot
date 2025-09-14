import express from "express";
import TelegramBot from "node-telegram-bot-api";
import Insta from "insta-fetcher";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// 🔑 Bot token va webhook URL
const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Render URL + /webhook

// 📌 Telegram bot
const bot = new TelegramBot(TOKEN, { webHook: true });
bot.setWebHook(`${WEBHOOK_URL}/webhook/${TOKEN}`);

// 📌 Insta-fetcher
const insta = new Insta();

// === Routes ===
app.get("/", (req, res) => {
  res.send("📌 Instagram Downloader Bot ishlayapti!");
});

// 📌 Telegram’dan keladigan update’lar
app.post(`/webhook/${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// === Bot komandalar ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Salom! Instagram video yoki story yuklab beruvchi bot.\n\n" +
      "▶️ Video yuklash uchun: Instagram post havolasini yuboring.\n" +
      "📸 Story yuklash uchun: Instagram username'ni @username ko‘rinishida yuboring."
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text || text.startsWith("/start")) return;

  try {
    if (text.includes("instagram.com")) {
      // 🔹 Instagram post yuklash
      bot.sendMessage(chatId, "⏳ Video yuklanmoqda...");

      const data = await insta.fetchPost(text);

      if (data.is_video) {
        await bot.sendVideo(chatId, data.url);
      } else {
        await bot.sendPhoto(chatId, data.url);
      }
    } else if (text.startsWith("@")) {
      // 🔹 Instagram story yuklash
      const username = text.replace("@", "");
      bot.sendMessage(
        chatId,
        `⏳ @${username} profilidan stories yuklanmoqda...`
      );

      const stories = await insta.fetchStories(username);

      if (!stories || stories.length === 0) {
        bot.sendMessage(
          chatId,
          "📭 Story topilmadi yoki foydalanuvchi hozirda story joylamagan."
        );
        return;
      }

      for (const story of stories) {
        if (story.url.includes(".mp4")) {
          await bot.sendVideo(chatId, story.url);
        } else {
          await bot.sendPhoto(chatId, story.url);
        }
      }
    } else {
      bot.sendMessage(
        chatId,
        "❌ Noto‘g‘ri format. Video havola yoki @username yuboring."
      );
    }
  } catch (err) {
    console.error("❌ Xato:", err);
    bot.sendMessage(chatId, "❌ Xatolik yuz berdi: " + err.message);
  }
});

// === Render port ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} da ishlayapti...`));
