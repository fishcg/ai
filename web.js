const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const { config } = require('./config.js');
const { chatRouter } = require('./controllers/ChatController');

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
