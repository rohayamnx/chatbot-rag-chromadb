const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getGeminiResponse(message) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    const result = await model.generateContent(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error getting Gemini response:", error);
    return `Error: ${error.message}`;
  }
}

async function generateWithContext(context, question) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt =
    `You are a helpful assistant. Use ONLY the context to answer the user's question.
If the answer is not contained in the context, say you don't know based on the provided documents.

Context:\n"""\n${context}\n"""\n
Question: ${question}\n`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating with context:', error);
    return `Error: ${error.message}`;
  }
}

module.exports = { getGeminiResponse, generateWithContext };
