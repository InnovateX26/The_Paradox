export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text input is required and must be a string' });
  }

  try {
    // 1. Basic cleaning: remove extra whitespace, trim, normalize
    const cleanedText = text
      .trim()
      .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with a single space
      .replace(/\r/g, '')      // Remove carriage returns
      .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines to max 2

    // 2. Return processed text
    res.status(200).json({
      cleanedText: cleanedText
    });

  } catch (err) {
    console.error('OCR Handler Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
