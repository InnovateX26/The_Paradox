export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("🚀 [DEBUG] API/room called");
  const { userId, topic } = req.body;

  // Generate a premium 6-digit alphanumeric ID
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

  res.status(200).json({
    success: true,
    roomId,
    topic: topic || "Study Room",
    userId: userId || "anonymous"
  });
}
