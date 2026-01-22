const Router = require("koa-router");

const { config } = require('../config.js');
const { extractDataAfterSubstring } = require("../util");
const { BailianApp } = require("../service/BailianApp");
const OpenaiCompatible = require('../service/OpenaiCompatible.js');
const { Apm } = require('../service/Apm.js');
const nedb = require('../component/Nedb')
const TokenCounter = require('../component/Token')


const chatRouter = new Router()

chatRouter.post('/chat/completions', async (ctx) => {
  console.log('Received /chat/completions request, time:', new Date().toISOString());
  if (!ctx.request.headers.authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }
  let userApiKey = extractDataAfterSubstring(ctx.request.headers.authorization, 'Bearer ')
  try {
    ctx.set('Cache-Control', 'no-cache');
    ctx.set('Connection', 'keep-alive');
    let reqBody = ctx.request.body
    if (!reqBody['model']) {
      reqBody['model'] = 'gpt-4o'
    }
    let url = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    if (reqBody['model'].startsWith('gpt')) {
      url = 'https://api.openai.com/v1'
    }
    let messageToken = await TokenCounter.countMessages(reqBody['messages'], reqBody['model'])
    let apiKey = await getTrulyApikey(reqBody['model'], userApiKey, messageToken)
    if (reqBody['model'] === 'info' || reqBody['model'] === 'code' || reqBody['model'] === 'metrics' || reqBody['model'] === 'cr') {
      let appID = config.bailianAppID
      if (reqBody['model'] === 'code') {
        appID = config.bailianCodeAppID
      } else if (reqBody['model'] === 'metrics') {
        appID = config.bailianMetricsAppID
      } else if (reqBody['model'] === 'cr') {
        appID = config.bailianCrAppID
      }
      let bailianApp = new BailianApp(apiKey, appID)
      await bailianApp.create(ctx, reqBody)
    } else {
      await OpenaiCompatible.create(ctx, apiKey, url, reqBody)
    }
    if (ctx.body) {
      // TODO: 流式请求也需要计费
      let token = 0
      if (reqBody['model'] === 'info' || reqBody['model'] === 'cr') {
        token = ctx.body.usage.models[0]['input_tokens'] + ctx.body.usage.models[0]['output_tokens']
      } else {
        token = ctx.body.usage.total_tokens
      }
      // console.log(`User API Key: ${userApiKey}, Tokens used: ${token}, time: ${new Date().toISOString()}`)
     console.log(ctx.body.choices[0].message.content)
      nedb.incr(userApiKey, token)
    }
  } catch (error) {
    Apm.captureError(error, {
      custom: {
        catalog: error.toString(),
      }
    });
    ctx.status = 500;
    ctx.body = 'Internal server error: ' +  error.toString();
  }
})

/**
 * 获取真正的 apikey（处理 me- 前缀的限额逻辑）
 *
 * @param model
 * @param apiKey
 * @param messageToken
 * @returns {string|*}
 */
async function getTrulyApikey(model, apiKey, messageToken) {
  if (!apiKey.startsWith('me-')) {
    // 非 me- 前缀默认放过
    return apiKey
  }
  if (config.apiKeyList.indexOf(apiKey) === -1) {
    return apiKey
    // throw new Error('Apikey not found')
  }
  let tokenUsed = await nedb.get(apiKey)
  let currentToken = config.daily_token_limit - tokenUsed - messageToken
  if (currentToken < 0) {
    throw new Error('No tokens left for today')
  }
  return model.startsWith('gpt') ? config.openAIApiKey : config.bailianApiKey
}


chatRouter.get('/models', async (ctx) => {
  ctx.response.type = 'application/json';
  let now = Math.floor(Date.now() / 1000);
  let data = []
  for (let modelName of config.models) {
    data.push({
      'id': modelName,
      'object': "model",
      'created': now,
      'owned_by': modelName,
    })
  }
  ctx.body = {
    'object': 'list',
    'data': data,
  }
});

chatRouter.post('/token', async (ctx) => {
  if (!ctx.request.headers.authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }
  let userApiKey = extractDataAfterSubstring(ctx.request.headers.authorization, 'Bearer ')
  if (!userApiKey.startsWith('me-')) {
    // 非 me- 前缀默认放过
    return 999999
  } else {
    ctx.response.type = 'application/json';
    try {
      let tokenUsed = await nedb.get(userApiKey)
      currentToken = config.daily_token_limit - tokenUsed
    } catch (e) {
      currentToken = 0
    }
  }

  ctx.body = {
    'token': currentToken,
  }
});

module.exports = {
  chatRouter,
}
