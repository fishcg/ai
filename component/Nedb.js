// tokenDB.js
const Datastore = require('@seald-io/nedb'); // ✅ 使用修复版
const path = require('path');
// 假设 config 还没配好，给个默认值测试，实际请保留你的 require
const { daily_token_limit } = require('../config') || { daily_token_limit: 1000 };

// 初始化 NeDB
const db = new Datastore({
  filename: path.join(__dirname, '../runtime/token.db'),
  autoload: true,
});

// 索引优化
db.ensureIndex({ fieldName: 'apiKey', unique: false });
db.ensureIndex({ fieldName: 'date', unique: false });

const today = () => new Date().toISOString().split('T')[0];

/**
 * ✅ 推荐方案：原子自增
 * NeDB/MongoDB 的 $inc 是原子的，不会出现并发计数丢失。
 * 逻辑：先加，加完检查是否超限。如果超限，虽然多记录了一笔，但因为抛错拒绝了请求，
 * 实际上用户没用到服务，数据略微虚高比"由于并发导致少记Token"要安全得多。
 */
async function incr(apiKey, amount = 1) {
  if (!apiKey) throw new Error('apiKey required');
  const date = today();

  return new Promise((resolve, reject) => {
    db.update(
      { apiKey, date },
      { $inc: { used: amount } },
      { upsert: true, returnUpdatedDocs: true }, // NeDB 特性：返回更新后的文档
      (err, numAffected, affectedDocuments, upsert) => {
        if (err) return reject(err);

        // 兼容处理：upsert 时 affectedDocuments 可能在第四个参数(upsert)里，或者格式不同
        // @seald-io/nedb 通常在第三个参数返回文档（如果 returnUpdatedDocs: true）
        const doc = affectedDocuments;

        if (!doc) {
          // 极少数情况兜底
          return resolve(amount);
        }

        if (doc.used > daily_token_limit) {
          // ⚠️ 超限了！可选策略：
          // 1. 严格策略：回滚数据（$inc: -amount），然后报错
          // 2. 宽松策略：仅报错（数据保留溢出状态，反正今日已停用）

          // 这里采用宽松策略，直接拒绝
          return reject(new Error(`Daily limit exceeded: ${doc.used} > ${daily_token_limit}`));
        }

        resolve(doc.used);
      }
    );
  });
}

/**
 * 获取今日已用
 */
async function get(apiKey) {
  if (!apiKey) throw new Error('apiKey required');
  const date = today();
  return new Promise((resolve, reject) => {
    db.findOne({ apiKey, date }, (err, doc) => {
      if (err) return reject(err);
      resolve(doc ? doc.used : 0);
    });
  });
}

// 导出
module.exports = {
  incr,
  get,
  // cleanupOldRecords...
};