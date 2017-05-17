var Wechat = require('./src/index')

// 全局配置
Wechat.config({
    autoLogin: true, // 是否保存cookie 以便自动登录
    openBrowser: false, // 是否在浏览器中打开二维码链接 (默认在terminal中显示)
})

// 初始化程序
Wechat.run(async () => {
    // 获取联系人列表
    let memberList = await Wechat.getContact()
    // 获取账户信息
    let ownerInfo = await Wechat.getOwnerInfo()
    // 给指定用户发送消息(这里测试自己给自己发)
    var ownUserName = ownerInfo.User.UserName;
    let sendStatus = await Wechat.sendMsg(ownUserName, ownUserName, `hello word! 现在的时间是:${new Date()}`)
    if (sendStatus) {
        console.log('消息发送成功!')
    } 

    // 自动回复消息
    Wechat.listener.on('message', async data => {
        // 群聊消息
        if (data.type === 'Group') {
            var groupName = data.fromUser.NickName;
            var masterUserName = data.toUser.NickName;
            if (data.msg.indexOf('exit') > -1) {
                console.log('退出群聊')
                await (Wechat.deleteMemberFromChatroom(data.fromUser.UserName, data.toUser.UserName))
            }
            if (data.msg.indexOf('rename') > -1) {
                console.log('修改群聊名称')
                console.log(await (Wechat.renameChatroom(data.fromUser.UserName, new Date().getTime())))
            }
            console.log(`群聊消息: ${masterUserName}(${groupName}): ${data.msg}`)
        } 
        // 普通消息
        else {
            console.log(`收到来自: ${data.fromUser.NickName} 的消息: ${data.msg}`)
        }

        // 自动回复
        let sendStatus = await Wechat.sendMsg(ownUserName, data.fromUser.UserName, `自动回复: ${data.msg}`)
        if (sendStatus) {
            console.log('消息发送成功!')
        }
    })
})