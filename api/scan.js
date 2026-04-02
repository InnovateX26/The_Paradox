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
            role: "user",
            content: `Identify the Subject (Physics, Chemistry, Maths, Biology, or Computer) and a short Topic name from this text. Also provide a detailed explanation using the 8-section Memory-Optimized structure.
            
            Return ONLY a JSON object:
            {
              "subject": "Name of Subject",
              "topic": "Name of Topic",
              "explanation": "Markdown text with 📌 Definition, 🧠 Easy Hinglish Explanation, ⚡ Key Points, 📊 Visuals, 📈 Example, 🎨 Formula, 🎯 Important for Exams, 🧩 Mnemonic, 🔁 Quick Revision Line"
            }
            
            Text to analyze:
            ${text}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500
      })
    });

    if (!response.ok) {
       console.warn(`⚠️ Scan AI Warning: OpenRouter Status ${response.status}. Trying Gemini Fallback...`);
       throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");

    const parsed = JSON.parse(content);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Scan API Warning (Attempting Fallback):', err.message);
    
    // --- SECONDARY CALL: GOOGLE GEMINI BACKUP ---
    try {
      console.log("🚀 [SCAN BACKUP] Calling Gemini 2.5 Flash...");
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `Identify the Subject (Physics, Chemistry, Maths, Biology, or Computer) and a short Topic name. Also explain the text. Respond ONLY in valid JSON format:
              { "subject": "...", "topic": "...", "explanation": "..." }. 
              
              Text: ${text}` }]
          }]
        })
      });

      const geminiData = await geminiRes.json();
      const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (reply) {
        console.log("✅ [SCAN BACKUP] Gemini Success!");
        const cleanReply = reply.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanReply);
        return res.status(200).json(parsed);
      } else {
        throw new Error("Gemini fallback failed.");
      }
    } catch (fallbackErr) {
      console.error('❌ CRITICAL SCAN FAILURE:', fallbackErr.message);
      return res.status(200).json({ 
        explanation: "AI is currently resting (Low Credits). Please try again later or ping the developer to top up credits! (Code: 402)",
        subject: "General",
        topic: "Error Handle"
      });
    }
  }
}
