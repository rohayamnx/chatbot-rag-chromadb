const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getEmbeddingModel() {
  return genAI.getGenerativeModel({ model: 'text-embedding-004' });
}

async function embedTexts(texts) {
  const model = getEmbeddingModel();
  const results = await Promise.all(
    texts.map(async (text) => {
      const res = await model.embedContent(text);
      return res?.embedding?.values || [];
    })
  );
  return results;
}

async function embedQuery(text) {
  const vectors = await embedTexts([text]);
  return vectors[0];
}

module.exports = { embedTexts, embedQuery };


