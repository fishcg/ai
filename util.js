const axios = require('axios');

const { config } = require('./config.js');

const appId = config.bailianAppID; // 百炼 app_id

async function CallDashScope(apiKey, message) {
  const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;
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
      throw new Error("Request failed:");
    }
  } catch (error) {
    throw error
  }
}

function extractDataAfterSubstring(inputString, substring) {
  // 找到指定子字符串在主字符串中的位置
  const index = inputString.indexOf(substring);

  // 如果找到了该子字符串
  if (index !== -1) {
    // 截取从该子字符串之后的部分
    return inputString.substring(index + substring.length);
  }
  // 如果未找到，返回空字符串或其他默认值
  return '';
}

function transformOpenAIData(input) {
  const outputText = input.output.text;
  const modelId = input.usage.models[0].model_id;
  const requestId = input.request_id;
  const finish_reason = input.output.finish_reason;
  const usage = input.usage;
  const created = input.created;

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
  CallDashScope,
  extractDataAfterSubstring,
  transformOpenAIData,
};