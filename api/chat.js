export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, messages, model } = req.body;
  if (!message && !messages) {
    return res.status(400).json({ error: 'Message or Messages array is required.' });
  }

  const finalMessages = [
    {
      role: "system",
      content: `You are an elite AI tutor for Indian students (JEE/NEET level). 
      Your goal is to make answers engaging, memorable, and student-friendly by adding mnemonics, emojis, and memory tricks.
      
      STRUCTURE RULES:
      1. 📌 Definition (English): 1–2 line professional definition.
      2. 🧠 Easy Hinglish Explanation: Relatable explanation with Indian context.
      3. ⚡ Key Points: Bullet points with **bold keywords**.
      4. 📊 Visuals (Diagram/Flowchart): 
         - For simple: Use text arrows (Start -> Process -> End).
         - For complex: Use \`\`\`mermaid code blocks.
      5. 📈 Example: Desi/Indian real-life example.
      6. 🎨 Formula / Equation (if applicable): Clear separate line.
      7. 🎯 Important for Exams: Short revision tips.
      8. 🧩 Mnemonic (if possible): Acronyms or funny memory tricks. 
      9. 🔁 Quick Revision Line: One-line summary.

      STYLE RULES:
      - Use spacing between sections.
      - Do NOT write long paragraphs.
      - Use bullet points.
      - Max 1 emoji per section (header only).
      - Highlight key terms using **bold formatting**.`
    },
    ...(messages || [{ role: "user", content: message }])
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "STEMVI AI Bot"
      },
      body: JSON.stringify({
        model: model || "openai/gpt-4o-mini",
        messages: finalMessages,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
       const errBody = await response.text();
       console.warn(`⚠️ OpenRouter Failed (Status ${response.status}). Attempting Gemini Fallback...`);
       throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a reply.";
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({ reply, message: reply });

  } catch (err) {
    console.error('Chat API Warning (Attempting Fallback):', err.message);
    
    // --- SECONDARY CALL: GOOGLE GEMINI BACKUP ---
    try {
      console.log("🚀 [BACKUP] Calling Gemini 2.5 Flash...");
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: finalMessages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          })).filter(m => m.role !== "system")
        })
      });

      const geminiData = await geminiRes.json();
      const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (reply) {
        console.log("✅ [BACKUP] Gemini Success!");
        return res.status(200).json({ reply, message: reply });
      } else {
        throw new Error("Gemini fallback also failed.");
      }
    } catch (fallbackErr) {
      console.error('❌ CRITICAL: All AI Engines Failed:', fallbackErr.message);
      return res.status(500).json({ 
        error: 'Service Interrupted', 
        details: 'Primary and Backup AI engines are both unavailable. Please check API credits.' 
      });
    }
  }
}
