export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64, mimeType } = req.body;

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Missing base64 or mimeType' });
  }

  try {
    // STEP 1: OCR — extract raw text using Claude vision
    const ocrResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "StemVI OCR"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              },
              {
                type: "text",
                text: `You are an expert OCR engine for Indian student notes. Extract ALL text from this image with maximum accuracy.

Rules:
- Preserve mathematical equations exactly (e.g. F = ma, E = mc², ∫f(x)dx)
- Preserve chemical formulas exactly (e.g. H₂SO₄, NaCl, C₆H₁₂O₆)
- Preserve diagrams as text descriptions in [DIAGRAM: ...] tags
- Preserve tables as plain text with | separators
- If text is in Hindi/Hinglish, preserve it as-is
- Correct obvious handwriting mistakes only if you are 95%+ confident
- Output ONLY the extracted text, nothing else. No preamble, no explanation.`
              }
            ]
          }
        ]
      })
    });

    const ocrData = await ocrResponse.json();
    
    if (!ocrData.choices || !ocrData.choices[0]) {
      throw new Error('OCR extraction failed: ' + JSON.stringify(ocrData));
    }

    const extractedText = ocrData.choices[0].message.content;

    // STEP 2: AI Explanation — send extracted text to get Hinglish explanation
    const explainResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "StemVI Explain"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `You are StemVI's AI Scan Engine for Indian students preparing for JEE/NEET. 
You will receive OCR-extracted text from a student's notes or textbook page.
Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation outside the JSON.`
          },
          {
            role: "user",
            content: `Here is the extracted text from the student's notes:

${extractedText}

Respond with ONLY this JSON structure:
{
  "topic": "exact topic name (e.g. Newton's Laws of Motion)",
  "subject": "one of: Physics | Chemistry | Maths | Biology | Computer Science | Other",
  "hinglishExplanation": "3-4 sentence explanation in natural Hinglish. Warm, conversational tone for a 17-year-old. Use simple words. Mix Hindi and English naturally.",
  "analogy": "one relatable Indian analogy (cricket, chai, dabbawala, kirana store, etc.) that explains the core concept",
  "keyTerms": ["term1", "term2", "term3", "term4", "term5"],
  "examTip": "one high-value exam tip for JEE/NEET in Hinglish",
  "difficulty": "Easy | Medium | Hard",
  "extractedText": "the full clean extracted text for reference"
}`
          }
        ]
      })
    });

    const explainData = await explainResponse.json();
    
    if (!explainData.choices || !explainData.choices[0]) {
      throw new Error('Explanation failed: ' + JSON.stringify(explainData));
    }

    // Parse JSON response safely
    let explanation;
    try {
      const rawText = explainData.choices[0].message.content;
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      explanation = JSON.parse(cleaned);
    } catch (parseErr) {
      explanation = {
        topic: "Study Notes",
        subject: "Other",
        hinglishExplanation: explainData.choices[0].message.content,
        analogy: "",
        keyTerms: [],
        examTip: "",
        difficulty: "Medium",
        extractedText: extractedText
      };
    }

    return res.status(200).json({
      success: true,
      extractedText,
      explanation
    });

  } catch (err) {
    console.error('OCR Error:', err);
    return res.status(500).json({ 
      error: 'OCR processing failed', 
      details: err.message 
    });
  }
}
