// 消息轮询
module.exports = {
    name: '_memberlist',
    version: '0.0.1',
    author: 'yochat',
    des: '获取联系人列表',
    handler: async (yo) => {
        // 这里仅仅能获取到已经保存到通讯录的联系人和群组 需要获取未保存过的群组
        let data = await (yo.fetch(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?r=${new Date().getTime()}&pass_ticket=${yo.config.pass_ticket}&seq=0&skey=${yo.config.skey}`, { json: true, followRedirect: false, jar: yo.jar }))
        var members = {
            users: [],
            groups: []
        }
        var users = [], groups = []
        data.body.MemberList.map(item => {
            item.UserName.indexOf('@@') > -1 ? members.groups.push(item) : members.users.push(item)
        })
        console.log(members)
    }
}