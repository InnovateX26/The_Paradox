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
            content: `You are 'StemVI Buddy', a friendly and smart senior friend helping students in a group study room. 
            
            TONE & PERSONALITY:
            - Be encouraging, warm, and student-friendly. Use Hinglish naturally.
            - Act like a 'Bade Bhaiya/Didi' who makes complex topics easy.
            - Use friendly greetings like "Hey guys!", "Great catch!", or "Let's crack this together!".
            
            CORE RULE: 
            - Keep responses concise but NOT robotic. 
            - Explain simply. Use a bit of humor/relatability if it fits.
            
            STRUCTURE:
            1. 👋 Friendly Greeting: 1 short sentence.
            2. 🧠 Easy Explanation: Simple Hinglish breakdown.
            3. ⚡ Smart Trick: 1 core bullet/mnemonic.
            4. 🚀 Motivation: A quick encouraging line.
            
            STYLE:
            - Highlight key terms with **bold formatting**.
            - Use 3-4 emojis to keep the vibe friendly.`
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
       console.warn(`⚠️ Room AI Warning: OpenRouter Status ${response.status}. Trying Gemini Fallback...`);
       throw new Error(`OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) throw new Error("Empty response from OpenRouter");

    return res.status(200).json({ reply, message: reply });

  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    console.error("🚨 Fallback Triggered:", err.message);

    // --- SECONDARY CALL: GOOGLE GEMINI BACKUP ---
    try {
      console.log("🚀 [BACKUP] Calling Gemini 2.5 Flash...");
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      
      const geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `You are 'StemVI Buddy', a friendly smart senior friend in a group study room. Be encouraging and use warm Hinglish. 
              Respond in this structure: 👋 Greeting, 🧠 Easy Explanation, ⚡ Smart Trick, 🚀 Motivation.
              
              Student says: ${message}` }]
          }]
        })
      });

      const geminiData = await geminiRes.json();
      const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (reply) {
        console.log("✅ [ROOM BACKUP] Gemini Success!");
        return res.status(200).json({ reply, message: reply });
      } else {
        throw new Error("Gemini fallback failed.");
      }
    } catch (fallbackErr) {
      console.error('❌ CRITICAL ROOM FAILURE:', fallbackErr.message);
      return res.status(200).json({
        reply: `AI is currently resting (Low Credits). Please try again later or ping the developer to top up credits! (Code: 402)`
      });
    }
  }
}
