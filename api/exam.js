export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic } = req.body;
  if (!topic || typeof topic !== 'string' || topic.trim() === '') {
    return res.status(400).json({ error: 'Topic is required and must be a non-empty string' });
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("❌ ERROR: OPENROUTER_API_KEY is missing from environment.");
      return res.status(500).json({ error: "Backend Config Error: API Key not found in .env" });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "STEMVI Flashcards Tool"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful academic assistant that generates educational flashcards in simple Hinglish when helpful. Format your output strictly using 'Q: question' and 'A: answer'."
          },
          {
            role: "user",
            content: `Generate 5–8 high-quality flashcards for ${topic}.
            Format:
            Q: question
            A: answer`
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).json({ error: "AI Provider Error", details: errorData });
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";
    
    // Parse the Q: A: format into objects
    const flashcards = [];
    const blocks = rawText.split(/Q:/i).filter(Boolean);
    
    blocks.forEach(block => {
      const parts = block.split(/A:/i);
      if (parts.length === 2) {
        flashcards.push({
          question: parts[0].trim(),
          answer: parts[1].trim()
        });
      }
    });

    if (flashcards.length === 0) {
        throw new Error("AI output could not be parsed into flashcards.");
    }

    res.status(200).json({ flashcards });

  } catch (err) {
    console.error('Exam API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
