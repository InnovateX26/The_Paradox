export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required and must be a string' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "STEMVI Doubt Bot"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are STEMVI AI, a smart academic mentor for Indian students preparing for JEE/NEET. 
            Explain concepts in simple Hinglish when helpful. 
            Use step-by-step explanations for problems. 
            Give coding help when needed. 
            Use relatable Indian examples (cricket, chai, daily life). 
            Keep answers structured and concise.`
          },
          { role: "user", content: message }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'OpenRouter API Error');

    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a reply.";
    res.status(200).json({ reply });

  } catch (err) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
