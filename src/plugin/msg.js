// 消息轮询
module.exports = {
    name: '_syncCheck',
    version: '0.0.1',
    author: 'yochat',
    des: '消息进程',
    handler: async (yo) => {
        var pullReceve = async () => {
            let data = await (yo.fetch(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync?sid=${yo.config.wxsid}&skey=${yo.config.skey}&lang=zh_CN`, {
                method: 'post',
                json: true,
                followRedirect: false,
                jar: yo.jar,
                body: {
                    "BaseRequest": {
                        "Uin": "xuin=" + yo.config.wxuin,
                        "Sid": yo.config.wxsid,
                        "Skey": "",
                        "DeviceID": yo.config.DeviceID ? yo.config.DeviceID : yo.config.DeviceID = "e" + new Date().getTime()
                    },
                    SyncKey: yo.config.SyncKey,
                    rr: '-' + Math.random()
                }
            }))
            yo.config.SyncKey = data.body.SyncKey;

            data.body.AddMsgList.map(async item => {
                yo.event.emit('message', item)
            })
            // console.log({
            //     count: data.body.AddMsgCount,
            //     Msgs: data.body.AddMsgList
            // })
            return {
                count: data.body.AddMsgCount,
                Msgs: data.body.AddMsgList
            }
        }

        var sync = async () => {
            var url = 'https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck'
                + '?r=' + new Date().getTime()
                + '&skey=' + yo.config.skey
                + '&sid=' + yo.config.wxsid
                + '&uin=' + yo.config.wxuin
                + '&deviceid=' + (yo.config.DeviceID ? yo.config.DeviceID : yo.config.DeviceID = "e" + new Date().getTime())
                + '&synckey=' + (() => {
                    var str = '';
                    yo.config.SyncKey.List.map((item, i) => {
                        str += item.Key + '_' + item.Val;
                        if (i != yo.config.SyncKey.List.length - 1) {
                            str += '|'
                        }
                    })
                    return str;
                })();
            var data = await yo.fetch(url, { json: true, followRedirect: false, jar: yo.jar })
            // 有时候会乱码
            var window = {
                synccheck: null
            }
            try {
                eval(data.body)
            } catch (error) {
                return false
            }

            return (window.synccheck.retcode === '0' && window.synccheck.selector != '0')
        }
        while (true) {
            let newMsg = await sync()
            if (newMsg) {
                await pullReceve()
            } else {
                console.log('错误')
                break;
            }
        }
    }
}