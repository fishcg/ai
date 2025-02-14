const Router = require("koa-router");

const { config } = require('../config.js');
const { extractDataAfterSubstring } = require("../util");
const { BailianApp } = require("../service/BailianApp");
const OpenaiCompatible = require('../service/OpenaiCompatible.js');

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
    const { model, messages, temperature, top_p } = ctx.request.body;
    if (model === 'info') {
      let bailianApp = new BailianApp(apiKey, config.bailianAppID)
      await bailianApp.create(ctx, messages.at(-1).content)
    } else {
      await OpenaiCompatible.create(ctx, apiKey, model, messages, temperature, top_p)
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
    console.log(error)
  }
})

chatRouter.get('/models', async (ctx) => {
  ctx.response.type = 'application/json';
  let now = Math.floor(Date.now() / 1000);
  ctx.body = {
    "object": "list",
    "data": [
      {
        "id": "info",
        "object": "model",
        "created": now,
        "owned_by": "fish"
      },
      {
        "id": "deepseek-r1",
        "object": "model",
        "created": now,
        "owned_by": "deepseek"
      },
    ],
  };
});

module.exports = {
  chatRouter,
}
