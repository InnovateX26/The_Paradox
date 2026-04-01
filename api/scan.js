export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" in request body' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "STEMVI Scan Tool"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "system",
            content: "You are a specialized STEM explainer. Your task is to explain concepts clearly or solve problems step-by-step."
          },
          {
            role: "user",
            content: `Explain the following content in simple terms. If it's a problem, solve step-by-step:\n\n${text}`
          }
        ]
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      throw new Error('AI explanation failed');
    }

    res.status(200).json({
      explanation: data.choices[0].message.content
    });

  } catch (err) {
    console.error('Scan API Error:', err);
    res.status(500).json({ error: 'Failed to explain content', details: err.message });
  }
}
