const OpenAI = require("openai");
const nodeFetch = require('node-fetch');
const fetch = nodeFetch.default || nodeFetch;
const { HttpsProxyAgent } = require('https-proxy-agent');
const { config } = require('../config.js');

async function create(ctx, apiKey, url, params) {
  // 设置代理
  let customFetch = null
  if (params['model'].startsWith('gpt') && config.httpProxy) {
    console.log('http proxy for OpenAI')
    const agent = new HttpsProxyAgent(config.httpProxy);
    customFetch = (url, options) => {
      return fetch(url, { ...options, agent });
    };
  }
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: url,
    timeout: config.timeout,
    fetch: customFetch, // 使用自定义的 fetch
  });

  try {
    let completion = null
    if (url.includes('openai') && !params['messages']) {
      // api: /v1/completions
      // 对于这个接口，仅支持 GTP-3.5 相关模型，这儿先写死
      params['model'] = 'gpt-3.5-turbo-instruct'
      completion = await openai.completions.create(params);
    } else {
      // api: /v1/chat/completions
      completion = await openai.chat.completions.create(params);
    }
    ctx.status = 200;
    if (!params['stream']) {
      ctx.set('Content-Type', 'application/json');
      ctx.body = completion
      // ctx.res.end();
      return
    }
    // TODO: 支持非流式输出 stream: false
    ctx.set('Content-Type', 'text/event-stream');
    for await (const chunk of completion) {
      // console.log(`data: ${JSON.stringify(chunk)}\n\n`)
      ctx.res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    ctx.res.end();
  } catch (error) {
    throw new Error(`request OpenAI api ${url} fail: ${error.toString()}`);
  }
}

module.exports = {
  create
};
