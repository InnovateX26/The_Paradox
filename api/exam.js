export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic } = req.body;
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "topic" in request body' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "STEMVI Exam Tool"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "system",
            content: "You are a helpful academic assistant that generates educational flashcards."
          },
          {
            role: "user",
            content: `Generate flashcards for studying. Topic: ${topic}. Format: Q: question A: answer. Provide between 5 and 10 flashcards.`
          }
        ]
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      throw new Error('AI content generation failed');
    }

    const rawText = data.choices[0].message.content;
    
    // Parse the Q: A: format into objects
    const flashcards = [];
    const blocks = rawText.split(/Q:/i).filter(Boolean);
    
    blocks.forEach(block => {
      const parts = block.split(/A:/i);
      if (parts.length === 2) {
        flashcards.push({
          question: parts[0].trim(),
          answer: parts[1].trim()
        });
      }
    });

    res.status(200).json({ flashcards });

  } catch (err) {
    console.error('Exam API Error:', err);
    res.status(500).json({ error: 'Flashcard generation failed', details: err.message });
  }
}
