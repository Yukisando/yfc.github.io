// Vercel Serverless Function: api/new-post.js
// Receives: { date, content, images, password }
// Env: GITHUB_TOKEN, POST_PASSWORD

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', 'https://yukisanfan.club');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', 'https://yukisanfan.club');
  // Main logic
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { date, content, images, password } = req.body || {};
  if (!date || !content || !images || !Array.isArray(images) || !password) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }
  if (password !== process.env.POST_PASSWORD) {
    res.status(403).json({ error: 'Invalid password' });
    return;
  }
  // Trigger GitHub Action via repository_dispatch
  const payload = {
    event_type: 'add-new-post',
    client_payload: {
      post_data: JSON.stringify({ date, content, images })
    }
  };
  const ghResp = await fetch('https://api.github.com/repos/Yukisando/yfc.github.io/dispatches', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github.everest-preview+json',
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (ghResp.ok) {
    res.status(200).json({ ok: true });
  } else {
    const err = await ghResp.text();
    res.status(ghResp.status).json({ error: err });
  }
}
