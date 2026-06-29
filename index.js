import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";

import OpenAI from "openai";
import QRCode from "qrcode-terminal";
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
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ qr, connection }) => {

    if (qr) {
      QRCode.generate(qr, { small: true });
      console.log("امسح QR من السجل بالأعلى");
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "أنت مساعد ذكي يرد باللغة العربية."
        },
        {
          role: "user",
          content: question
        }
      ]
    });

    await sock.sendMessage(
      msg.key.remoteJid,
      {
        text: completion.choices[0].message.content
      }
    );

  });

}

startBot();
