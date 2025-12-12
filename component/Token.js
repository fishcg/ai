const { get_encoding } = require('tiktoken');

const MODEL_TO_ENCODING = {
  'gpt-4o': 'o200k_base',
  'gpt-4o-mini': 'o200k_base',
  'gpt-4-turbo': 'cl100k_base',
  'gpt-3.5-turbo': 'cl100k_base',
  'gpt-4': 'cl100k_base',
  'o1-preview': 'o200k_base',
  'o1-mini': 'o200k_base',
  'claude-3-haiku-20240307': 'cl100k_base',
  'claude-3-sonnet-20240229': 'cl100k_base',
  'claude-3-opus-20240229': 'cl100k_base',
  default: 'cl100k_base',
};

class TokenCounter {
  constructor(options = {}) {
    this.cache = new Map(); // encodingName → encoderInstance
    this.defaultModel = options.defaultModel || 'gpt-4o';
  }

  /**
   * 获取编码器实例 (同步方法，但在 Node 中非常快)
   */
  _getEncoderSync(model) {
    const key = model || this.defaultModel;
    const encodingName = MODEL_TO_ENCODING[key] || MODEL_TO_ENCODING.default;

    if (!this.cache.has(encodingName)) {
      try {
        // ✅ 正确用法：直接使用 get_encoding，它会自动处理 WASM 和 BPE 数据
        const encoder = get_encoding(encodingName);
        this.cache.set(encodingName, encoder);
      } catch (err) {
        console.error(`[tiktoken] Failed to load encoding "${encodingName}" for model "${key}":`, err);
        // 如果加载失败（例如旧版 tiktoken 不支持 o200k_base），回退到 cl100k_base
        if (encodingName !== 'cl100k_base') {
          console.warn(`[tiktoken] Fallback to cl100k_base`);
          const fallbackEncoder = get_encoding('cl100k_base');
          this.cache.set(encodingName, fallbackEncoder);
        } else {
          throw err;
        }
      }
    }
    return this.cache.get(encodingName);
  }

  // ✅ 保持 async 接口以兼容你的现有代码
  async count(text, model) {
    if (typeof text !== 'string') return 0;
    const encoder = this._getEncoderSync(model);
    // 注意：tiktoken 可能会抛出错误，建议 try-catch 或确保 text 有效
    try {
      return encoder.encode(text).length;
    } catch (e) {
      console.error(`[TokenCounter] Encode error:`, e);
      return 0;
    }
  }

  // ✅ 保持 async 接口
  async countMessages(messages, model) {
    if (!Array.isArray(messages)) return 0;
    const encoder = this._getEncoderSync(model);

    // 简化的消息计算逻辑 (通常够用)
    // 如果需要 OpenAI 官方完全精确的 chat 格式计算，需要处理 tokens_per_message 等额外逻辑
    const text = messages.map(m => `${m.role}\n${m.content}`).join('\n');

    try {
      return encoder.encode(text).length;
    } catch (e) {
      console.error(`[TokenCounter] Encode error:`, e);
      return 0;
    }
  }

  /**
   * (可选) 释放内存
   * 如果你的应用长期运行，通常不需要手动释放，除非你需要频繁切换大量不同的 encoding
   */
  free() {
    for (const encoder of this.cache.values()) {
      encoder.free();
    }
    this.cache.clear();
  }
}

module.exports = new TokenCounter();