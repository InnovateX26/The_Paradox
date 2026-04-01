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
            content: `You are a specialized STEM flashcard generator. 
            Generate high-quality, exam-focused flashcards in Indian English/Hinglish when helpful.
            
            OUTPUT RULES:
            1. Return ONLY valid JSON.
            2. Each card must have: "question", "answer", and "revision" (a 1-line quick concept tip).
            3. Ensure proper spacing between words.
            4. No messy formatting or merged text.
            
            FORMAT:
            {
              "flashcards": [
                {
                  "question": "...",
                  "answer": "...",
                  "revision": "..."
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Generate 5-8 flashcards for the topic: ${topic}.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500
      })
    });

    if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).json({ error: "AI Provider Error", details: errorData });
    }

    const data = await response.json();
    let result;
    
    try {
        // Look for JSON in the content (OpenRouter gpt-4o-mini usually respects response_format)
        const content = data.choices?.[0]?.message?.content || "{}";
        result = JSON.parse(content);
    } catch (parseErr) {
        console.error("❌ JSON Parse Error:", parseErr);
        throw new Error("AI output was not in a valid JSON format.");
    }

    const flashcards = result.flashcards || [];
    if (flashcards.length === 0) {
        throw new Error("No flashcards found in AI response.");
    }

    res.status(200).json({ flashcards });

  } catch (err) {
    console.error('Exam API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
