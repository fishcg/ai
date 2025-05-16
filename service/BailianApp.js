const axios = require('axios');

const { extractDataAfterSubstring } = require("../util");
const { Apm } = require("./Apm");
const { config } = require('../config.js');


class BailianApp {
  constructor(apiKey, appID) {
    this.apiKey = apiKey;
    this.appID = appID;
  }

  async create(ctx, params) {
    ctx.set('Content-Type', 'text/event-stream');
    let resp = await this.request(this.apiKey, params)
    ctx.status = 200;
    let isCodeCompletion = params['model'] === 'code'
    await this.streamWrite(ctx, resp, isCodeCompletion)
  }

  /**
   * 请求百炼 App 接口
   *
   * @param apiKey
   * @param params
   * @returns 百炼 App 接口响应
   * @constructor
   */
  async request(apiKey, params) {
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${this.appID}/completion`;
    const data = {
      // input: {
      //   prompt: params['messages'].at(-1).content
      // },
      input: params,
      parameters: {
        'incremental_output' : 'true' // 增量输出
      },
      debug: {}
    };
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'enable' // 流式输出
      },
      timeout: config.timeout,
      responseType: 'stream' // 用于处理流式响应
    });
    if (response.status === 200) {
      return response
    } else {
      throw new Error('Request failed, response status is ' + response.status);
    }
  }

  /**
   * 将百炼接口响应写到 ctx 响应中
   *
   * @param ctx 请求 content
   * @param resp 百炼接口响应
   * @param isCodeCompletion
   * @returns {Promise<unknown>}
   */
  async streamWrite(ctx, resp, isCodeCompletion) {
    return new Promise((resolve, reject) => {
      resp.data.on('data', (chunk) => {
        let dataJsonStr = extractDataAfterSubstring(chunk.toString().replace("\n", ''), 'data:');
        if (dataJsonStr) {
          try {
            let dataJson = JSON.parse(dataJsonStr);
            let newData = null
            if (isCodeCompletion) {
              newData = transformCodeData(dataJson);
            } else {
              newData = transformOpenAIData(dataJson);
            }
            if (newData) {
              // console.log(`data: ${JSON.stringify(newData)}\n\n`)
              ctx.res.write(`data: ${JSON.stringify(newData)}\n\n`);
            } else {

            }
          } catch (error) {
            Apm.captureError(error, {
              custom: {
                catalog: error.toString(),
              }
            });
          }
        }
      });

      // 流结束时，resolve Promise
      resp.data.on('end', () => {
        resolve(true);
      });

      // 监听错误事件，如果出错则 reject
      resp.data.on('error', (err) => {
        reject(false);
      });
    });
  }
}

function transformCodeData(input) {
  // 模拟一个 ID 和创建时间
  const createdTimestamp = Math.floor(Date.now() / 1000);

  // 检查 input 数据
  if (typeof input !== 'object' || !input.output || !input.usage || !Array.isArray(input.usage.models)) {
    throw new Error("Invalid input data");
  }
  // 获取所需的输入数据
  const { session_id, text, finish_reason } = input.output;
  const model_id = input.usage.models[0].model_id;
  // 转换为目标格式
  return  {
    id: session_id,
    object: "text_completion",
    created: createdTimestamp,
    choices: [
      {
        text: text,
        index: 0,
        logprobs: null,
        finish_reason: finish_reason === "null" ? null : finish_reason
      }
    ],
    model: model_id
  };
}

/**
 * 转换 OpenAI API 返回的数据
 *
 * @param input
 * @returns {{created: *, usage: *, model: *, id: string, choices: [{finish_reason: (*|"stop"|"length"|"tool_calls"|"content_filter"|"function_call"), delta: {content: *}, index: number, logprobs: null}], system_fingerprint: null, object: string}}
 */
function transformOpenAIData(input) {
  const outputText = input.output.text;
  const modelId = input.usage.models[0].model_id;
  const requestId = input.request_id;
  const usage = input.usage;
  let created = input.created;
  let finish_reason = input.output.finish_reason;

  if (!created) {
    created = Math.floor(Date.now() / 1000);
  }
  if (finish_reason === "null") {
    finish_reason = null
  }

  const transformedData = {
    choices: [
      {
        delta: {
          content: outputText
        },
        finish_reason: finish_reason,
        index: 0,
        logprobs: null
      }
    ],
    object: "chat.completion.chunk",
    usage: usage,
    created: created,
    system_fingerprint: null,
    model: modelId,
    id: `chatcmpl-${requestId}`
  };

  return transformedData;
}

module.exports = {
  BailianApp
};
