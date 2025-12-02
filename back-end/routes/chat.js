const express = require('express');
const router = express.Router();
const { getGeminiResponse } = require('../services/geminiService');

router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const reply = await getGeminiResponse(message);
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: 'Gemini API error', details: error.message });
  }
});

module.exports = router;
