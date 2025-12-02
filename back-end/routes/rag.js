const express = require('express');
const { embedQuery } = require('../services/embeddingService');
const { querySimilar } = require('../services/chromaService');
const { generateWithContext } = require('../services/geminiService');

const router = express.Router();

router.post('/chat-rag', async (req, res) => {
  try {
    const { message, topK } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const queryEmbedding = await embedQuery(message);
    const results = await querySimilar({ queryEmbedding, topK: Math.max(1, topK || 5) });

    const docs = results?.documents || [];
    const metadatas = results?.metadatas || [];

    const context = docs
      .map((d, i) => `Source ${i + 1} (${metadatas[i]?.fileName || metadatas[i]?.docId || 'doc'}):\n${d}`)
      .join('\n\n---\n\n');

    const answer = await generateWithContext(context, message);

    return res.json({ reply: answer, sources: metadatas });
  } catch (err) {
    console.error('RAG chat error:', err);
    return res.status(500).json({ error: 'RAG chat failed', details: err.message });
  }
});

module.exports = router;


