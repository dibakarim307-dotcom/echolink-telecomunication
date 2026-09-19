import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { 
  initiateStkPush, 
  initiateB2CPayment,
  queryStkStatus, 
  completeStkTransaction, 
  handleDarajaCallback, 
  getMpesaConfig 
} from "./server/mpesa";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "EchoLink Telecom Voice Server" });
  });

  // Real conversational AI call endpoint
  app.post("/api/call/converse", async (req, res) => {
    try {
      const { 
        calleeName = "Friend", 
        userMessage = "Hello", 
        history = [], 
        isCustomerCare = false 
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = isCustomerCare
          ? `You are an automated, friendly, and efficient customer service voice agent for EchoLink Telecom in Kenya.
You are on a live phone call with a subscriber.
Keep your answers brief (1-3 sentences maximum), professional, and conversational for audio playback.
Key facts about EchoLink:
- EchoPay offers 0% fees on all money transfers under 150 KSh (free microtransactions).
- 2% lower transaction fees than competitors for all higher amounts.
- 5G VoLTE & VoNR calling with crystal clear HD audio.
- USSD codes: *144# for airtime & bundle balance, *100# for customer care menu, *334# for EchoPay menu.
Be warm, polite, and helpful.`
          : `You are ${calleeName}, answering a real phone call from your friend over the EchoLink telecom network in Kenya.
You are speaking on a live telephone connection.
Keep your answers conversational, natural, brief (1-2 sentences), and casual.
Feel free to use friendly, natural conversational phrases (like "Hey there!", "Sasa!", "All good here", "Thanks for checking in!").
If they mention money or EchoPay, you know about the zero-fee transfers under 150 KSh and you love it.
Never break character. Never output markdown formatting, asterisks, bullet points, or stage directions (no *laughs*, no [pause]), just plain spoken words because this is synthesized into speech audio.`;

        // Format conversation contents for Gemini
        const contents: any[] = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.text || '' }]
            });
          }
        }

        contents.push({
          role: 'user',
          parts: [{ text: userMessage || 'Hello!' }]
        });

        // Resilient model fallback: try primary, then flash-latest, then flash-lite
        const candidateModels = [
          'gemini-3.8-flash',
          'gemini-flash-latest',
          'gemini-3.1-flash-lite'
        ];

        let reply: string | null = null;

        for (const modelName of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: {
                systemInstruction,
                maxOutputTokens: 100,
                temperature: 0.7,
              }
            });

            if (response && response.text) {
              reply = response.text.trim();
              break;
            }
          } catch {
            // Model experiencing temporary demand spike (503 / 429) or rate limit; try next candidate
            continue;
          }
        }

        if (reply) {
          // Clean any leftover quotes or brackets
          const cleanReply = reply.replace(/^["']|["']$/g, '').replace(/\*.*?\*/g, '').trim();
          return res.json({ reply: cleanReply });
        }
      }

      // Contextual fallbacks if API key is not yet set or models are temporarily at peak capacity
      const lower = (userMessage || '').toLowerCase();
      let fallback = `Hey! Good to hear from you. The EchoLink connection is crystal clear today!`;

      if (isCustomerCare) {
        if (lower.includes('balance') || lower.includes('airtime') || lower.includes('bundle')) {
          fallback = "Your EchoLink airtime balance is 420 KSh with 12.4 GB 5G data remaining. Dial *144# for instant USSD statement.";
        } else if (lower.includes('echopay') || lower.includes('transfer') || lower.includes('fee')) {
          fallback = "EchoPay allows 100% free money transfers for all amounts under 150 KSh, with zero hidden charges.";
        } else if (lower.includes('tariffs') || lower.includes('rate') || lower.includes('cost')) {
          fallback = "All transfers on EchoPay are 2% cheaper than standard mobile money tariffs, and transactions under 150 KSh are completely free.";
        } else {
          fallback = "Thank you for calling EchoLink Customer Care. I can assist you with your airtime balance, 5G data packages, or EchoPay transactions.";
        }
      } else {
        if (lower.includes('how are you') || lower.includes('doing') || lower.includes('habari') || lower.includes('sasa')) {
          fallback = `I'm doing really well, thank you! Just sorting out a few things. How is everything on your side?`;
        } else if (lower.includes('money') || lower.includes('sent') || lower.includes('pay') || lower.includes('echopay')) {
          fallback = "Yes! I received the SMS confirmation right away. Zero fees on small transfers is a lifesaver!";
        } else if (lower.includes('hear') || lower.includes('sound') || lower.includes('clear')) {
          fallback = "Yes, I hear you loud and clear! The VoLTE HD audio is super crisp.";
        } else if (lower.includes('meet') || lower.includes('later') || lower.includes('friday') || lower.includes('plans')) {
          fallback = "Sounds like a plan! Let's catch up later today, I'll send you a message.";
        } else if (lower.includes('bye') || lower.includes('talk later') || lower.includes('goodbye')) {
          fallback = "Alright, take good care and talk to you soon!";
        } else {
          fallback = `I hear you loud and clear! The EchoLink 5G VoLTE line is super clear today.`;
        }
      }

      return res.json({ reply: fallback });
    } catch {
      return res.json({ 
        reply: "Hey! I can hear you clearly. The network signal on EchoLink is great right now." 
      });
    }
  });

  // ==========================================
  // SAFARICOM M-PESA DARAJA API ENDPOINTS
  // ==========================================

  // Get current Daraja API configuration & status
  app.get("/api/mpesa/config", (req, res) => {
    const config = getMpesaConfig();
    res.json({
      environment: config.environment,
      shortCode: config.shortCode,
      b2cShortCode: config.b2cShortCode,
      isConfigured: Boolean(config.consumerKey && config.consumerSecret),
      hasPasskey: Boolean(config.passkey),
      hasSecurityCredential: Boolean(config.securityCredential),
      initiatorName: config.initiatorName,
      label: config.environment === 'production' ? 'Safaricom M-Pesa Live' : 'Safaricom Daraja Sandbox',
    });
  });

  // Initiate Lipa Na M-Pesa Online (STK Push)
  app.post("/api/mpesa/stkpush", async (req, res) => {
    try {
      const { phoneNumber, amount, accountReference, description } = req.body;

      if (!phoneNumber || !amount) {
        return res.status(400).json({ 
          success: false, 
          error: "Phone number and amount are required." 
        });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 1) {
        return res.status(400).json({ 
          success: false, 
          error: "Amount must be at least 1 KSh." 
        });
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.get("host") || "localhost:3000";
      const hostUrl = `${protocol}://${host}`;

      const result = await initiateStkPush({
        phoneNumber: String(phoneNumber),
        amount: numAmount,
        accountReference: accountReference || "EchoPay-Wallet",
        description: description || "EchoPay Deposit",
      }, hostUrl);

      return res.json(result);
    } catch (err: any) {
      console.error("Error in /api/mpesa/stkpush:", err);
      return res.status(500).json({ 
        success: false, 
        error: err.message || "Failed to initiate M-Pesa STK Push." 
      });
    }
  });

  // Safaricom Daraja B2C Payment (Send money / payout to recipient phone using Security Credential)
  app.post("/api/mpesa/b2c", async (req, res) => {
    try {
      const { phoneNumber, amount, remarks, occasion, commandId } = req.body;

      if (!phoneNumber || !amount) {
        return res.status(400).json({
          success: false,
          error: "Phone number and amount are required.",
        });
      }

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < 1) {
        return res.status(400).json({
          success: false,
          error: "Amount must be at least 1 KSh.",
        });
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.get("host") || "localhost:3000";
      const hostUrl = `${protocol}://${host}`;

      const result = await initiateB2CPayment({
        phoneNumber: String(phoneNumber),
        amount: numAmount,
        remarks: remarks || "EchoPay Transfer",
        occasion: occasion || "EchoPay",
        commandId: commandId || "BusinessPayment",
        callbackUrl: `${hostUrl}/api/mpesa/callback`,
      });

      return res.json(result);
    } catch (err: any) {
      console.error("Error in /api/mpesa/b2c:", err);
      return res.status(500).json({
        success: false,
        error: err.message || "Failed to initiate M-Pesa B2C payout.",
      });
    }
  });

  // Query STK Push Transaction Status
  app.get("/api/mpesa/query/:checkoutRequestId", async (req, res) => {
    try {
      const { checkoutRequestId } = req.params;
      const status = await queryStkStatus(checkoutRequestId);
      return res.json(status);
    } catch (err: any) {
      console.error("Error in /api/mpesa/query:", err);
      return res.status(500).json({ 
        error: "Failed to query M-Pesa transaction status." 
      });
    }
  });

  // Sandbox / Test Simulator instant PIN confirmation
  app.post("/api/mpesa/confirm/:checkoutRequestId", (req, res) => {
    try {
      const { checkoutRequestId } = req.params;
      const { receiptNumber } = req.body || {};
      const completed = completeStkTransaction(checkoutRequestId, receiptNumber);
      if (!completed) {
        return res.status(404).json({ error: "Transaction not found." });
      }
      return res.json(completed);
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to confirm transaction." });
    }
  });

  // Safaricom Daraja Webhook Callback URL
  app.post("/api/mpesa/callback", (req, res) => {
    try {
      console.log("M-Pesa Daraja callback payload received:", JSON.stringify(req.body));
      handleDarajaCallback(req.body);
      // Safaricom expects ResultCode: 0 acknowledgement
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    } catch (err) {
      console.error("Error handling Daraja callback:", err);
      return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
  });

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
