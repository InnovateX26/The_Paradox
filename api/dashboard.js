export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { uid } = req.query;
  const API_KEY = "AIzaSyBrep0S6P0oAzMQ-bE8h7GHTi5wn_QNrVg";
  const PROJECT_ID = "stemvi-afbac";

  if (!uid) {
    return res.status(400).json({ error: "Missing User ID (uid)" });
  }

  try {
    // 1. Fetch History from Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/scans/${uid}/history?key=${API_KEY}`;
    const response = await fetch(firestoreUrl);
    const result = await response.json();

    const focus = { physics: 0, chemistry: 0, maths: 0, biology: 0 };
    const weakAreasSet = new Set();
    const documents = result.documents || [];

    // 2. Aggregate Data
    documents.forEach(doc => {
      const data = doc.fields;
      if (!data) return;

      const rawSub = (data.subject?.stringValue || "Biology").toLowerCase();
      const duration = parseInt(data.duration?.doubleValue || data.duration?.integerValue || 5);
      
      if (focus[rawSub] !== undefined) {
        focus[rawSub] += duration;
      }

      // Add actual topics as weak areas if duration is low
      if (duration < 15 && data.topic?.stringValue) {
        weakAreasSet.add(data.topic.stringValue);
      }
    });

    // Fallback weak areas if none found in data
    const weakAreas = weakAreasSet.size > 0 
      ? Array.from(weakAreasSet).slice(0, 5) 
      : ["Newton Laws", "Chemical Bonding", "Integration"];

    // 3. Return JSON in the requested format
    return res.status(200).json({ focus, weakAreas });

  } catch (err) {
    console.error("Dashboard API Error:", err);
    return res.status(500).json({ error: "Failed to fetch dashboard data", details: err.message });
  }
}
