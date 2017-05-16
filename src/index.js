const client = require('./client');
const qrcode = require('qrcode-terminal');

module.exports = {
    run: async () => {
        let loginInfo = await (client.login())
        if (!(await (client.check_cookie()))) {
            console.log('获取登录二维码:', `https://login.weixin.qq.com/qrcode/${loginInfo.uuid}`)
            console.log('等待扫描二维码')
            qrcode.generate(`https://login.weixin.qq.com/l/${loginInfo.uuid}`)
        } else {
            console.log('使用cookie自动登录!')
        }
        await client.check_login(loginInfo.uuid)
        await client.getUserInfo()
        await client.getContact()
        console.log('登录成功,启动消息服务')
        client.MsgServer() // 监听消息
        return client.listener
    },

    config: (options) => {
        client.global(options)
    }
}