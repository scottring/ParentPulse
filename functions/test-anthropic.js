const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function test() {
  console.log('Testing Anthropic API...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [
        { role: 'user', content: 'Say hello in one sentence.' }
      ],
    });

    console.log('✅ SUCCESS!');
    console.log('Response:', message.content[0].text);
  } catch (error) {
    console.error('❌ FAILED:', error.message);
    console.error('Error details:', error);
  }
}

test();
