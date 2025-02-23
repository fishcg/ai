const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const { config } = require('./config.js');
const { chatRouter } = require('./controllers/ChatController');
const { Apm } = require('./service/Apm.js');

const app = new Koa();

// 使用 koa-bodyparser 中间件解析请求体
app.use(bodyParser());
// 使用定义的路由
app.use(chatRouter.routes()).use(chatRouter.allowedMethods());

// 启动服务器
const PORT = config.port || 80;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

try {
  // 某种意外的错误情况
  throw new Error('Ups, something broke!');
} catch (err) {
  // 捕获错误并记录到 APM
  Apm.captureError(err, {
    custom: {
      functionName: 'someFunction',
      additionalInfo: 'Here you could add more dynamic data'
    }
  });
}
