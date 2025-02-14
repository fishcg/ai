const OpenAI = require("openai");

async function create(ctx, apiKey, model, messages, temperature, top_p) {
  const openai = new OpenAI({
    apiKey: apiKey,
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

module.exports = {
  create
};
