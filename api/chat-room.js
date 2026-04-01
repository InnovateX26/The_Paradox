export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, topic, history } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
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
            content: `You are STEMVI Room Bot, a helpful academic assistant for a group study session.
            The current topic is: ${topic || "General Study"}.
            Rules:
            1. Explain in simple Hinglish when helpful.
            2. For technical steps, use 1, 2, 3 numbering.
            3. Keep answers concise and direct.
            4. Use emojis to keep it engaging. 🎯`
          },
          ...(history || []),
          { role: "user", content: message }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'OpenRouter API error');

    const reply = data.choices?.[0]?.message?.content || "I'm having a bit of a brain freeze! 🧊";
    res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat-Room API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
