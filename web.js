const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const OpenAI = require('openai');

const { CallDashScope, extractDataAfterSubstring, transformOpenAIData }= require('./util.js');

const app = new Koa();
const router = new Router();

// 使用 koa-bodyparser 中间件解析请求体
app.use(bodyParser());

// 创建一个路由来处理流式数据请求
router.post('/chat/completions', async (ctx) => {
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
      await infoCreate(ctx, apiKey, messages)
    } else {
      await openaiCreate(ctx, apiKey, model, messages, temperature, top_p)
    }
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
    console.log(error)
  }
});

async function infoCreate(ctx, apiKey, messages) {
  let message = messages.at(-1).content
  let infoResp = await CallDashScope(apiKey, message)
  if (infoResp.status === 200) {
    ctx.status = 200;
    await streamToPromise(infoResp, ctx)
    // 可选：监听流结束事件
    infoResp.data.on('end', () => {
      ctx.respond = true;
      ctx.res.end();
    });

    infoResp.data.on('error', (err) => {
      ctx.respond = true;
      ctx.res.end('Stream error');
    });
  } else {
    ctx.status = response.status;
    ctx.body = 'Failed to get stream from external service';
  }
}

async function openaiCreate(ctx, apiKey, model, messages, temperature, top_p) {
  const openai = new OpenAI({
    apiKey: apiKey, // 请替换为实际 API Key
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
  const completion = await openai.chat.completions.create({
    model: model,
    messages: messages,
    temperature: temperature,
    top_p: top_p,
    stream: true,
  });

  ctx.status = 200;
  // 将 OpenAI 的流数据通过 EventStream 格式发送给客户端
  for await (const chunk of completion) {
    ctx.res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }
  ctx.res.end();
}


router.get('/models', async (ctx) => {
  ctx.response.type = 'application/json';
  ctx.body = {
    "object": "list",
    "data": [
      {
        "id": "info",
        "object": "model",
        "created": Math.floor(Date.now() / 1000),
        "owned_by": "fish"
      },
      {
        "id": "deepseek-r1",
        "object": "model",
        "created": Math.floor(Date.now() / 1000),
        "owned_by": "fish"
      },
    ],
    "object": "list"
  };
});

// 使用定义的路由
app.use(router.routes()).use(router.allowedMethods());

// 启动服务器
const PORT = process.env.PORT || 3128;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// 使用一个函数来封装读取流并返回 Promise
function streamToPromise(infoResp, ctx) {
  return new Promise((resolve, reject) => {
    let data = '';
    infoResp.data.on('data', (chunk) => {
      let dataJson = extractDataAfterSubstring(chunk.toString().replace("\n", ''), 'data:');
      if (dataJson) {
        try {
          dataJson = JSON.parse(dataJson);
          dataJson = transformOpenAIData(dataJson);
          ctx.res.write(`data:${JSON.stringify(dataJson)}\n\n`);
        } catch (error) {
          console.error("Unexpected error:", error);
        }
      }
    });

    // 流结束时，resolve Promise
    infoResp.data.on('end', () => {
      resolve(data);
    });

    // 监听错误事件，如果出错则 reject
    infoResp.data.on('error', (err) => {
      reject(err);
    });
  });
}
