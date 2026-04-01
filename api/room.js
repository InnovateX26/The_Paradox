export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, userId, topic, roomId } = req.body;

  try {
    if (action === 'create') {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      // In a real Node-Firebase setup we'd use firebase-admin here. 
      // For this serverless Vercel setup, we'll return the metadata for the frontend to save.
      return res.status(200).json({ 
        success: true, 
        roomId: newRoomId, 
        topic: topic || "Study Session",
        createdBy: userId 
      });
    }

    if (action === 'join') {
      if (!roomId) return res.status(400).json({ error: 'Room ID required' });
      return res.status(200).json({ success: true, roomId });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
