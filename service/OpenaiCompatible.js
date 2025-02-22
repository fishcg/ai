const OpenAI = require("openai");
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { config } = require('../config.js');

async function create(ctx, apiKey, url, params, proxyUrl) {
  // 设置代理
  const agent = new HttpsProxyAgent(config.httpProxy);
  const customFetch = (url, options) => {
    return fetch(url, { ...options, agent });
  };

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: url,
    timeout: 20000,
    fetch: customFetch, // 使用自定义的 fetch
  });
  try {
    const completion = await openai.chat.completions.create(params);
    ctx.status = 200;

    // TODO: 支持非流式输出 stream: false
    for await (const chunk of completion) {
      ctx.res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  } catch (error) {
    throw new Error('request OpenAI request fail:' + error.toString());
  } finally {
    ctx.res.end();
  }
}

module.exports = {
  create
};
