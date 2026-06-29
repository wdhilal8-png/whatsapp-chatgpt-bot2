import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import OpenAI from "openai";
import qrcode from "qrcode-terminal";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ qr, connection }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log("امسح الـ QR من واتساب");
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Connected");
    }

    if (connection === "close") {
      startBot();
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message?.conversation) return;

    const question = msg.message.conversation;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "أنت المساعد الشخصي للمعز. رد بالعربية وبأسلوب مهذب.",
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    const answer = response.choices[0].message.content;

    await sock.sendMessage(msg.key.remoteJid, {
      text: answer,
    });
  });
}

startBot();
