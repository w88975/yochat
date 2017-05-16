# node-wechat

node-wechat 是一个微信机器人的Node.js版本的实现,集成了Web版微信的所有接口,功能,简单的几行命令就可以定义一个微信小机器人,当然,你也可以基于该代码自己扩展丰富的功能.

## 入门

定义简单的机器人:

```javascript
const Wechat = require('./src/index');
const WxListener = require('./src/client').listener;

Wechat.config({
    cookie: true,
    openBrowser: false,
})

Wechat.run()

// 当有新消息来时 监听消息
WxListener.on('message', (val) => {
    console.log(val.type) // 消息类型
    console.log(val.msg) // 消息内容
})

```

全局配置: 

```javascript
Wechat.config({
    cookie: true, // 是否保存cookie 以便自动登录
    openBrowser: false, // 是否在浏览器中打开二维码链接 (默认在terminal中显示)
})
```
