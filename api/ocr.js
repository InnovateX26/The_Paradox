export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, image } = req.body;

  try {
    let resultText = "";

    // CASE 1: Image provided (Vision OCR)
    if (image) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://stemvi.vercel.app",
          "X-Title": "StemVI Quick OCR"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${image}` }
              },
              {
                type: "text",
                text: "Extract all text from this image. Output only the extracted text."
              }
            ]
          }]
        })
      });
      const data = await response.json();
      resultText = data.choices?.[0]?.message?.content || "";
    } 
    // CASE 2: Raw text provided (Cleaning only)
    else if (text) {
      resultText = text;
    } 
    else {
      return res.status(400).json({ error: 'Either text or image is required' });
    }

    // Cleaning Phase
    const cleanedText = resultText
      .trim()
      .replace(/[ \t]+/g, ' ')
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n');

    res.status(200).json({
      text: cleanedText,
      cleanedText: cleanedText // Legacy compatibility
    });

  } catch (err) {
    console.error('OCR Handler Error:', err);
    res.status(500).json({ error: 'OCR Processing Failed', details: err.message });
  }
}
