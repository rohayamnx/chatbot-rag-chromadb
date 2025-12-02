const OpenAI = require('openai');
require('dotenv').config();

// Validate API key
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OpenAI API Key is missing. Please set OPENAI_API_KEY in .env file.');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getChatResponse(message) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: message }],
    });
    
    const reply = response.choices[0]?.message?.content;
    
    if (!reply) {
      throw new Error('No response from OpenAI API');
    }
    
    return reply;
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw error;
  }
}

module.exports = { getChatResponse };
