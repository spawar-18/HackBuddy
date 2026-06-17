require('dotenv').config();
const { OpenAI } = require('openai');

async function testFeatherless() {
  const qwenKey = process.env.QWEN_API;
  const qwenBaseUrl = process.env.QWEN_BASE_URL || 'https://api.featherless.ai/v1';

  console.log('Testing Featherless API...');
  console.log('API Key:', qwenKey ? 'Present' : 'Missing');
  console.log('Base URL:', qwenBaseUrl);

  if (!qwenKey) return;

  try {
    const qwenClient = new OpenAI({
      baseURL: qwenBaseUrl,
      apiKey: qwenKey,
    });

    const response = await qwenClient.chat.completions.create({
      model: 'Qwen/Qwen3.6-35B-A3B',
      messages: [{ role: 'user', content: 'Say hello' }],
      temperature: 0,
      max_tokens: 2000,
    });

    console.log('Featherless Response SUCCESS:');
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('Featherless Response ERROR:');
    console.error(err);
  }
}

async function testOpenRouter() {
  // Read key with trailing space if it exists
  const openRouterKey = process.env.OPENROUTER_API_KEY || process.env['OPENROUTER_API_KEY '];

  console.log('\nTesting OpenRouter API...');
  console.log('API Key:', openRouterKey ? 'Present' : 'Missing');

  if (!openRouterKey) return;

  try {
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
      defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'HackBuddy',
      }
    });

    const response = await openrouter.chat.completions.create({
      model: 'qwen/qwen3.6-35b-a3b',
      messages: [{ role: 'user', content: 'Say hello' }],
      temperature: 0,
      max_tokens: 2000,
    });

    console.log('OpenRouter Response SUCCESS:');
    console.log(JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('OpenRouter Response ERROR:');
    console.error(err);
  }
}

async function run() {
  await testFeatherless();
  await testOpenRouter();
}

run();
