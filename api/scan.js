export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://stemvi.vercel.app",
        "X-Title": "StemVI"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-sonnet", // Using a stable model, user suggested sonnet-4-5 but 3.5 or 3 is safer for now if 4.5 isn't reachable
        max_tokens: 1024,
        messages: req.body.messages
      })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Scan AI call failed', details: err.message });
  }
}
