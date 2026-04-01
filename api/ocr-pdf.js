export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pages } = req.body;
  // pages = array of { base64, pageNumber } objects sent from frontend

  if (!pages || !Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'Missing pages array' });
  }

  try {
    // Extract text from all pages in parallel (max 5 pages for free tier)
    const pageLimit = Math.min(pages.length, 5);
    const ocrPromises = pages.slice(0, pageLimit).map(async (page) => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://stemvi.vercel.app",
          "X-Title": "StemVI PDF OCR"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${page.base64}` }
              },
              {
                type: "text",
                text: "Extract all text from this PDF page. Preserve equations and formulas. Output extracted text only."
              }
            ]
          }]
        })
      });
      const data = await response.json();
      return {
        page: page.pageNumber,
        text: data.choices?.[0]?.message?.content || ''
      };
    });

    const pageResults = await Promise.all(ocrPromises);
    const fullText = pageResults
      .sort((a, b) => a.page - b.page)
      .map(p => `--- Page ${p.page} ---\n${p.text}`)
      .join('\n\n');

    // Now get explanation for the full document
    const explainResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "StemVI PDF Explain"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `You are an elite AI tutor for Indian students (JEE/NEET level). 
            Your goal is to make answers engaging, memorable, and student-friendly by adding mnemonics, emojis, and memory tricks.
            Respond ONLY with valid JSON, no markdown.
            
            STRUCTURE FOR hinglishExplanation:
            1. 📌 Definition (English)
            2. 🧠 Easy Hinglish Explanation
            3. ⚡ Key Points (with **bold keywords**)
            4. 📊 Visuals (Diagram/Flowchart using \`\`\`mermaid or arrows)
            5. 📈 Example
            6. 🎨 Formula / Equation
            7. 🎯 Important for Exams
            8. 🧩 Mnemonic (if possible)
            9. 🔁 Quick Revision Line`
          },
          {
            role: "user",
            content: `Extracted text from ${pageLimit} PDF pages:\n\n${fullText}\n\nRespond with JSON: { "topic": "", "subject": "Physics|Chemistry|Maths|Biology|Other", "hinglishExplanation": "...", "keyTerms": [], "examTip": "", "difficulty": "Easy|Medium|Hard", "pageCount": ${pageLimit} }`
          }
        ]
      })
    });

    const explainData = await explainResponse.json();
    let explanation;
    try {
      const rawText = explainData.choices[0].message.content;
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      explanation = JSON.parse(cleaned);
    } catch {
      explanation = { topic: "PDF Notes", subject: "Other", hinglishExplanation: "Explanation failed to parse. Please check extracted text.", keyTerms: [], pageCount: pageLimit };
    }

    return res.status(200).json({ success: true, extractedText: fullText, explanation, pagesProcessed: pageLimit });

  } catch (err) {
    return res.status(500).json({ error: 'PDF OCR failed', details: err.message });
  }
}
