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


  // Robust JSON body parsing for Vercel
  let body = req.body;
  if (req.method === 'POST') {
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {
        res.status(400).json({ error: 'Invalid JSON' });
        return;
      }
    } else if (!req.body || typeof req.body !== 'object') {
      let raw = '';
      await new Promise((resolve) => {
        req.on('data', (chunk) => { raw += chunk; });
        req.on('end', resolve);
      });
      try {
        body = JSON.parse(raw);
      } catch {
        res.status(400).json({ error: 'Invalid JSON' });
        return;
      }
    }
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { date, content, images, password } = body || {};
  if (!date || !content || !images || !Array.isArray(images) || !password) {
    res.status(400).json({ error: 'Missing fields' });
    return;
  }
  if (password !== process.env.POST_PASSWORD) {
    res.status(403).json({ error: 'Invalid password' });
    return;
  }

  // Upload each image directly to the GitHub repo via the Contents API.
  // This avoids putting large base64 blobs in client_payload (10 KB limit).
  const uploadedPaths = [];
  const timestamp = Date.now();
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.startsWith('data:')) {
      uploadedPaths.push(img);
      continue;
    }
    const extMatch = img.match(/^data:image\/(\w+);/);
    const ext = (extMatch && extMatch[1]) || 'png';
    const b64 = img.split(',')[1];
    const fname = `post-assets/form-${timestamp}-${i}.${ext}`;

    const uploadResp = await fetch(
      `https://api.github.com/repos/Yukisando/yfc.github.io/contents/${fname}`,
      {
        method: 'PUT',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: `Add post image ${fname}`, content: b64 })
      }
    );

    if (!uploadResp.ok) {
      const err = await uploadResp.text();
      res.status(500).json({ error: `Image upload failed: ${err}` });
      return;
    }
    uploadedPaths.push(fname);
  }

  // Trigger GitHub Action with only the file paths — no base64 in the payload
  const payload = {
    event_type: 'add-new-post',
    client_payload: {
      post_data: JSON.stringify({ date, content, images: uploadedPaths })
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
