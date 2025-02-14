/**
 * 截取指定子字符串之后的部分
 *
 * @param inputString
 * @param substring
 * @returns {string}
 */
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
  extractDataAfterSubstring,
  transformOpenAIData,
};