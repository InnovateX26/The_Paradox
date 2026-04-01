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
            Your goal is to make answers engaging, memorable, and student-friendly by adding mnemonics, emojis, and memory tricks.
            
            STRUCTURE RULES:
            1. 📌 Definition (English): 1–2 line professional definition.
            2. 🧠 Easy Hinglish Explanation: Relatable explanation with Indian context.
            3. ⚡ Key Points: Bullet points with **bold keywords**.
            4. 📊 Example: Desi/Indian real-life example.
            5. 📐 Formula / Equation (if applicable): Clear separate line.
            6. 🎯 Important for Exams: Short revision tips.
            7. 🧩 Mnemonic (if possible): Acronyms or funny memory tricks. Skip if not possible.
            8. 🔁 Quick Revision Line: One-line summary.

            STYLE RULES:
            - Use spacing between sections.
            - Do NOT write long paragraphs.
            - Use bullet points.
            - Max 1 emoji per section (header only).
            - Highlight key terms using **bold formatting**.`
          },
          {
            role: "user",
            content: `Explain this content using the 8-section Memory-Optimized structure:
            
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
