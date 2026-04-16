const OpenAI = require("openai");

let client;
function getOpenAI() {
  if (!client) {
    client = new OpenAI({apiKey: process.env.OPENAI_API_KEY});
  }
  return client;
}

module.exports = {getOpenAI};
