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
    ctx.set('Content-Type', 'text/event-stream');
    ctx.set('Cache-Control', 'no-cache');
    ctx.set('Connection', 'keep-alive');
    const { model, messages } = ctx.request.body;
    let reqBody = ctx.request.body
    if (!model) {
      reqBody['model'] = 'gpt-4o'
    }
    let url = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    if (reqBody['model'] === 'gpt-4o') {
      url = 'https://api.openai.com/v1' //https://api.openai.com/v1/chat/completions
    }
    if (model === 'info') {
      let bailianApp = new BailianApp(apiKey, config.bailianAppID)
      await bailianApp.create(ctx, messages.at(-1).content)
    } else {
      await OpenaiCompatible.create(ctx, apiKey, url, reqBody)
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = 'Internal server error: ' +  error.toString();
    Apm.captureError(error, {
      custom: {
        catalog: error.toString(),
      }
    });
    ctx.res.end();
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
