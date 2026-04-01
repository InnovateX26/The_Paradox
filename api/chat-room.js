export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ reply: "Method not allowed" });

  const { message } = req.body;

  // 1. INPUT LOGGING
  console.log("🚀 Incoming message:", message);
  if (!message) return res.status(200).json({ reply: "Message is empty!" });

  try {
    // 2. SENDING TO AI (with 15s timeout)
    console.log("📡 Sending to AI (OpenRouter)...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s for stability

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
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
            content: message
          }
        ]
      })
    });
    clearTimeout(timeoutId);

    // 3. CRITICAL STATUS CHECK
    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ OpenRouter API ERROR [${response.status}]:`, errText);

      return res.status(200).json({
        reply: `AI failed to respond (Status ${response.status}). Please check system logs.`
      });
    }

    const data = await response.json();
    console.log("📥 AI RAW:", JSON.stringify(data));

    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(200).json({
        reply: "AI returned empty response."
      });
    }

    return res.status(200).json({ 
      reply, 
      message: reply 
    });

  } catch (err) {
    // 4. FULL ERROR HANDLING
    const isTimeout = err.name === 'AbortError';
    console.error(isTimeout ? "⏳ AI TIMEOUT (60s)" : "🚨 SERVER ERROR:", err);
    
    const msg = isTimeout ? "AI request timed out (60s)." : err.message;

    return res.status(200).json({
      reply: `System Error: ${msg}`
    });
  }
}
