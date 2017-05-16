const Wechat = require('./src/index');
const WxListener = require('./src/client').listener;

Wechat.config({
    cookie: true, // 是否保存cookie 以便自动登录
    openBrowser: false, // 是否在浏览器中打开二维码链接 (默认在terminal中显示)
})

Wechat.run()
WxListener.on('message', (val) => {
    console.log(`消息类型: ${val.type}`)
    console.log(`收到来自: ${val.fromUser.NickName} 的消息: ${val.msg}`)
})
