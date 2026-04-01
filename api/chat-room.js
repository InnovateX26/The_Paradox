export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, roomId, topic } = req.body;
  console.log("🚀 [DEBUG] Received message for room:", roomId);

  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    // If not a bot mention, just return (or handle logging)
    if (!message.toLowerCase().includes('@bot')) {
      return res.status(200).json({ reply: null });
    }

    console.log("🤖 [DEBUG] Calling OpenRouter API...");
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
            content: `You are STEMVI Room Bot, a helpful academic assistant for room: ${roomId}.
            Topic: ${topic || "General Study"}.
            Rules: Use simple Hinglish where helpful, keep it concise, and use step-by-step numbering. 🎯`
          },
          { role: "user", content: message }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    console.log("📥 [DEBUG] API raw response received");

    const botReply = data?.choices?.[0]?.message?.content || "Scientist, I'm currently recalibrating. Please try again! 🧪";
    
    res.status(200).json({ reply: botReply });

  } catch (err) {
    console.error('🚨 [DEBUG] Chat-Room API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
