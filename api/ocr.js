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

  // Expecting text input to clean/process
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "text" in request body' });
  }

  try {
    // 1. Basic cleaning: remove extra whitespace, trim, normalize
    const cleanedText = text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, ''); // Remove non-printable characters

    // 2. Return processed text
    res.status(200).json({
      success: true,
      originalText: text,
      cleanedText: cleanedText,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('OCR Handler Error:', err);
    res.status(500).json({ error: 'Text processing failed', details: err.message });
  }
}
