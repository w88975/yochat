// 获取本人的userinfo 
module.exports = {
    name: '_userinfo',
    version: '0.0.1',
    author: 'yochat',
    des: '获取本人基本信息,保存在 {config.userInfo} 下',
    handler: async (yo, cb) => {
        let data = await (yo.fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=' + new Date().getTime(), {
            method: 'POST',
            json: true,
            followRedirect: false,
            jar: yo.jar,
            body: {
                "BaseRequest":
                {
                    "Uin": "xuin=" + yo.config.wxuin,
                    "Sid": yo.config.wxsid,
                    "Skey": "",
                    "DeviceID": yo.config.DeviceID ? yo.config.DeviceID : yo.config.DeviceID = "e" + new Date().getTime()
                }
            }
        }))
        yo.config.userInfo = data.body
        yo.config.SyncKey = data.body.SyncKey
        cb && cb(null, [])
        return yo.config.userInfo
    }
}