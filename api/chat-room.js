export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, roomId, topic } = req.body;

  try {
    // 1. INPUT LOGGING
    console.log("🚀 Incoming message:", message);
    if (!message) return res.status(200).json({ reply: "Message is empty!" });

    // 2. SENDING TO AI
    console.log("📡 Sending to AI...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "STEMVI Room Bot"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a friendly teacher! Explain in simple Hinglish, keep it step-by-step, and be helpful."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    // 3. CRITICAL STATUS CHECK
    if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ OpenRouter API ERROR:", errorText);
        return res.status(200).json({
          reply: "AI failed to respond. Check API key or credits."
        });
    }

    // 4. SAFE JSON PARSE
    const data = await response.json();
    console.log("📥 AI raw response:", JSON.stringify(data));

    const reply = data?.choices?.[0]?.message?.content;

    // 5. EMPTY REPLY CHECK
    if (!reply) {
      console.warn("⚠️ AI returned empty response.");
      return res.status(200).json({
        reply: "AI returned empty response."
      });
    }

    // 6. FINAL SUCCESSFUL RESPONSE
    return res.status(200).json({ reply });

  } catch (err) {
    // 7. FULL ERROR HANDLING
    console.error("🚨 SERVER ERROR:", err);
    return res.status(200).json({
      reply: "Server crashed. Check terminal logs."
    });
  }
}
