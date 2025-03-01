const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const { config } = require('./config.js');
const { chatRouter } = require('./controllers/ChatController');
const { Apm } = require('./service/Apm.js');

const app = new Koa();

if (config.enableCORS) {
  // 设置允许跨域
  app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', '*'); // 允许所有来源的请求
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (ctx.method === 'OPTIONS') {
      ctx.status = 204;
      return;
    }
    await next();
  });
}

// 使用 koa-bodyparser 中间件解析请求体
app.use(bodyParser());

// 使用定义的路由
app.use(chatRouter.routes()).use(chatRouter.allowedMethods());

// 启动服务器
const PORT = config.port || 80;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
