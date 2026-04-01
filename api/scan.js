export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'Text content is required and must be a non-empty string' });
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
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an elite AI tutor for Indian students (JEE/NEET level). 
            Your job is to transform boring answers into highly structured, visually clean, and engaging explanations.
            
            OUTPUT FORMAT RULES:
            1. 📌 Definition (English): 1–2 line professional definition.
            2. 📌 Easy Hinglish Explanation: Simple, relatable explanation using Indian context.
            3. 📌 Key Points: Bullet points only.
            4. 📌 Example: Real-life or exam-based example.
            5. 📌 Formula / Equation (if applicable): Clear separate line.
            6. 📌 Important for Exams: 1–2 lines what examiner can ask.
            7. 📌 Quick Revision Line: One-line summary.

            STYLE RULES:
            - Use spacing between sections.
            - Do NOT write long paragraphs.
            - Use bullet points.
            - Make it feel like a premium app (Notion style).
            - Use emojis ONLY for section headers.`
          },
          {
            role: "user",
            content: `Explain the following content strictly using the 📌 structure:
            
            Content:
            ${text}`
          }
        ],
        max_tokens: 1500
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'OpenRouter API Error');

    const explanation = data.choices?.[0]?.message?.content || "No explanation could be generated.";
    res.status(200).json({ explanation });

  } catch (err) {
    console.error('Scan API Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
