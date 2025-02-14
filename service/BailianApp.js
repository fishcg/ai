const axios = require('axios');

const {extractDataAfterSubstring, transformOpenAIData} = require("../util");

class BailianApp {
  constructor(apiKey, appID) {
    this.apiKey = apiKey;
    this.appID = appID;
  }

  async create(ctx, message) {
    let resp = await this.request(this.apiKey, message)
    ctx.status = 200;
    await this.streamWrite(ctx, resp)
  }

  /**
   * 请求百炼 App 接口
   *
   * @param apiKey
   * @param message
   * @returns 百炼 App 接口响应
   * @constructor
   */
  async request(apiKey, message) {
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${this.appID}/completion`;
    const data = {
      input: {
        prompt: message
      },
      parameters: {
        'incremental_output' : 'true' // 增量输出
      },
      debug: {}
    };
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'enable' // 流式输出
        },
        responseType: 'stream' // 用于处理流式响应
      });
      if (response.status === 200) {
        return response
      } else {
        throw new Error('Request failed, response status is ' + response.status);
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 将百炼接口响应写到 ctx 响应中
   *
   * @param ctx 请求 content
   * @param resp 百炼接口响应
   * @returns {Promise<unknown>}
   */
  async streamWrite(ctx, resp) {
    return new Promise((resolve, reject) => {
      resp.data.on('data', (chunk) => {
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

module.exports = {
  BailianApp
};