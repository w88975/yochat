# node-wechat

node-wechat 是一个微信机器人的Node.js版本的实现,集成了Web版微信的所有接口,功能,简单的几行命令就可以定义一个微信小机器人,当然,你也可以基于该代码自己扩展丰富的功能.

## 入门

定义简单的机器人:

```javascript
const Wechat = require('yochat')

// 全局配置
Wechat.config({
    cookie: true, // 是否保存cookie 以便自动登录
    openBrowser: false, // 是否在浏览器中打开二维码链接 (默认在terminal中显示)
})

// 初始化程序
Wechat.run(async () => {
    // 获取联系人列表
    let memberList = await Wechat.getContact()
    // 获取自己的个人信息
    let userInfo = await Wechat.getUserInfo()

    // 给指定用户发送消息(这里测试自己给自己发)
    var ownUserName = userInfo.User.UserName;
    let sendStatus = await Wechat.sendMsg(ownUserName, ownUserName, `hello word! 现在的时间是:${new Date()}`)
    if (sendStatus) {
        console.log('消息发送成功!')
    }

    // 自动回复消息
    Wechat.listener.on('message', data => {
        console.log(`收到来自: ${data.fromUser.NickName} 的消息: ${data.msg}`)
        Wechat.sendMsg('自动回复:' + data.fromUser.UserName,data.toUser.UserName,data.msg)
    })
})

```

全局配置: 

```javascript
Wechat.config({
    cookie: true, // 是否保存cookie 以便自动登录
    openBrowser: false, // 是否在浏览器中打开二维码链接 (默认在terminal中显示)
})
```
效果演示:

 ![image](https://raw.githubusercontent.com/w88975/node-wechat/master/docs/screenshot.gif)