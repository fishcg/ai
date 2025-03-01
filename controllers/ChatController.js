const Router = require("koa-router");

const { config } = require('../config.js');
const { extractDataAfterSubstring } = require("../util");
const { BailianApp } = require("../service/BailianApp");
const OpenaiCompatible = require('../service/OpenaiCompatible.js');
const { Apm } = require('../service/Apm.js');

const chatRouter = new Router()

chatRouter.post('/chat/completions', async (ctx) => {
  if (!ctx.request.headers.authorization) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }
  let apiKey = extractDataAfterSubstring(ctx.request.headers.authorization, 'Bearer ')
  try {
    ctx.set('Cache-Control', 'no-cache');
    ctx.set('Connection', 'keep-alive');
    // ctx.set('Content-Type', 'text/event-stream');
    let reqBody = ctx.request.body
    if (!reqBody['model']) {
      reqBody['model'] = 'gpt-4o'
    }
    let url = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    if (reqBody['model'] === 'gpt-4o') {
      url = 'https://api.openai.com/v1'
    }
    if (reqBody['model'] === 'info' || reqBody['model'] === 'code') {
      let appID = config.bailianAppID
      if (reqBody['model'] === 'code') {
        appID = config.bailianCodeAppID
      }
      let bailianApp = new BailianApp(apiKey, appID)
      await bailianApp.create(ctx, reqBody)
    } else {
      await OpenaiCompatible.create(ctx, apiKey, url, reqBody)
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

module.exports = {
  chatRouter,
}
