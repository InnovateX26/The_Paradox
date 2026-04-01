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
            content: `You are a high-end STEM AI educator for JEE/NEET aspirants.
            Task: Generate a comprehensive "Premium Coaching Summary" study card.
            
            STRICT OUTPUT RULES:
            1. Return ONLY valid JSON.
            2. WORD SPACING: Standard spacing between words. NO merged text or PascalCase.
            3. DEFINITION: 1st in proper academic English, 2nd same concept in simple Hinglish.
            4. TONE: Class 9-12 student-friendly but JEE/NEET depth.
            
            JSON SCHEMA:
            {
              "flashcards": [
                {
                  "topic": "Topic Name",
                  "definition_english": "Academic definition...",
                  "definition_hinglish": "Simple explanation...",
                  "properties": ["..."],
                  "types": ["..."],
                  "conditions": ["..."],
                  "formula": ["Formula 1", "Formula 2"],
                  "equations": ["Eq 1"],
                  "units": ["Metric Units"],
                  "important_points": ["Point 1", "Point 2"],
                  "example": "Real-world/numerical case",
                  "application": ["App 1", "App 2"],
                  "use_case": ["Practical use case"],
                  "algorithm": ["Step 1", "Step 2"],
                  "mnemonics": "Memory trick",
                  "reaction": "Chemistry only, else null",
                  "diagram": "Text description for diagram",
                  "revision": "One-line quick recall point"
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Create 3-5 premium study cards for: ${topic}. Focus on JEE/NEET level depth.`
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
        const content = data.choices?.[0]?.message?.content || "{}";
        result = JSON.parse(content);
    } catch (parseErr) {
        console.error("❌ JSON Parse Error:", parseErr);
        throw new Error("AI output was not in a valid JSON format.");
    }

    const flashcards = result.flashcards || [];
    res.status(200).json({ flashcards });

  } catch (err) {
    console.error('Exam API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
