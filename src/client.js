const fs = require('fs')
const EventEmitter = require('events')
const request = require('request').defaults({ jar: true })
const parseString = require('xml2js').parseString

const qrcode = require('qrcode-terminal')
const open = require('open')
const MsgFilter = require('./libs/msgfilter')
var config = require('./config.js')

const _LOGIN_URL = 'https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=en_US&_=' + new Date().getTime()
const _QR_IMAGE_URL = 'https://login.weixin.qq.com/qrcode/'
const REDIRECT_URL = 'https://login.weixin.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid=$0&tip=0&_=' + new Date().getTime()

var jar = request.jar()

var window = {
    QRLogin: {
        code: null,
        uuid: null
    },
    redirect_uri: '',
    code: 0,
}

var fetch = function (url, options) {
    return new Promise(function (resolve, reject) {
        request(url, options, (err, httpResponse, body) => {
            if (saveCookie) {
                var cookie_string = jar.getCookieString(url);
                if (cookie_string.length > 0) {
                    fs.writeFileSync('./cookie/cookies.cookie', cookie_string)
                }
            }
            resolve(httpResponse)
        })
    });
};

var wxEvent = new EventEmitter()

// cookie容器
var JCookie = {};
// 是否自动保存cookie 方便下次登录
var saveCookie = true;
var openBrowser = false;

module.exports = {
    // 获取登录二维码
    login: async () => {
        let QRLoginUUID = await fetch(_LOGIN_URL)
        eval(QRLoginUUID.body)
        wxEvent.emit('login', {
            type: 'qrcode', msg: 'get uuid', data: {
                code: window.QRLogin.code,
                uuid: window.QRLogin.uuid
            }
        })
        return {
            code: window.QRLogin.code,
            uuid: window.QRLogin.uuid
        }
    },

    // 检查cookie是否有效

    check_cookie: async (getData) => {
        if (!fs.existsSync('./cookie/cookies.cookie')) {
            if (getData) {
                return {}
            }
            return false
        }
        var cookie_string = fs.readFileSync('./cookie/cookies.cookie', 'utf-8')
        var cookies = cookie_string.trim().split(';');
        JCookie = {};
        cookies.map(item => {
            var trimitem = item.trim()
            JCookie[trimitem.substring(0, trimitem.indexOf('='))] = trimitem.substring(trimitem.indexOf('=') + 1);
        })
        for (var i = 0; i < cookies.length; ++i) {
            jar.setCookie(cookies[i].trim(), 'https://wx.qq.com');
            jar.setCookie(cookies[i].trim(), 'https://webpush.wx.qq.com');
        }

        let data = await fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=-' + new Date().getTime(), {
            method: 'post',
            jar: jar,
            json: true,
            followRedirect: false,
            body: {
                "BaseRequest":
                {
                    "Uin": JCookie['wxuin'],
                    "Sid": JCookie['wxsid'],
                    "Skey": "",
                    "DeviceID": "e" + new Date().getTime()
                }
            }
        }
        )
        if (getData) {
            return data.body
        }
        return (data.body.SystemTime !== 0)
    },

    // 等待登录
    async check_login(uuid) {
        var UUID = uuid;
        if (saveCookie) {
            let _check_cookie = await (this.check_cookie(true))
            if (_check_cookie.hasOwnProperty('SystemTime') && _check_cookie.SystemTime !== 0) {
                wxEvent.emit('login', {
                    type: 'haslogin', msg: 'has logged in', data: config
                })
                config.uuid = UUID;
                config.skey = _check_cookie.SKey;
                config.pass_ticket = '';
                config.wxsid = JCookie['wxsid'];
                config.wxuin = _check_cookie['User']['Uin'];
                return config;
            }
        }
        while (true) {
            let code = await fetch(REDIRECT_URL.replace('$0', window.QRLogin.uuid), { jar: jar })
            eval(code.body)
            config.userAvatar = window.userAvatar
            if (window.redirect_uri) {
                let redirect_data = await fetch(window.redirect_uri, { json: true, followRedirect: false, jar: jar })
                return new Promise(function (resolve, reject) {
                    parseString(redirect_data.body, async (err, result) => {
                        config.uuid = UUID;
                        config.skey = result.error.skey[0];
                        config.pass_ticket = result.error.pass_ticket[0];
                        config.wxsid = result.error.wxsid[0];
                        config.wxuin = result.error.wxuin[0];
                        config.cookie = redirect_data.headers['set-cookie']
                        config.isLogin = true;
                        let init_data = await (fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=' + new Date().getTime(), {
                            method: 'post',
                            json: true,
                            followRedirect: false,
                            jar: jar,
                            body: {
                                "BaseRequest":
                                {
                                    "Uin": "xuin=" + config.wxuin,
                                    "Sid": config.wxsid,
                                    "Skey": "",
                                    "DeviceID": config.DeviceID ? config.DeviceID : config.DeviceID = "e" + new Date().getTime()
                                }
                            }
                        }))
                        config.initData = init_data.body;
                        resolve(config);
                    })
                })
            }
        }
    },

    // 获取用户信息
    getUserInfo: async () => {
        if (config.userInfo && config.SyncKey) {
            return config.userInfo
        }
        let data = await (fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=' + new Date().getTime(), {
            method: 'post',
            json: true,
            followRedirect: false,
            jar: jar,
            body: {
                "BaseRequest":
                {
                    "Uin": "xuin=" + config.wxuin,
                    "Sid": config.wxsid,
                    "Skey": "",
                    "DeviceID": config.DeviceID ? config.DeviceID : config.DeviceID = "e" + new Date().getTime()
                }
            }
        }))
        config.userInfo = data.body;
        config.SyncKey = data.body.SyncKey;
        wxEvent.emit('Login', { code: 200, msg: '登录成功' })
        return data.body;
    },

    // 获取联系人列表
    getContact: async () => {
        if (config.MemberList) {
            return config.MemberList
        }
        let data = await (fetch(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?r=${new Date().getTime()}&pass_ticket=${config.pass_ticket}&seq=0&skey=${config.skey}`, { json: true, followRedirect: false, jar: jar }))
        config.MemberList = data.body.MemberList
        return config.MemberList;
    },

    // 拉取最新消息
    pullReceve: async () => {
        let data = await (fetch(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync?sid=${config.wxsid}&skey=${config.skey}&lang=zh_CN`, {
            method: 'post',
            json: true,
            followRedirect: false,
            jar: jar,
            body: {
                "BaseRequest": {
                    "Uin": "xuin=" + config.wxuin,
                    "Sid": config.wxsid,
                    "Skey": "",
                    "DeviceID": config.DeviceID ? config.DeviceID : config.DeviceID = "e" + new Date().getTime()
                },
                SyncKey: config.SyncKey,
                rr: '-' + Math.random()
            }
        }))
        config.SyncKey = data.body.SyncKey;
        // switch()
        data.body.AddMsgList.map(item => {
            var filter = MsgFilter(item, config)
            filter.type !== 'Miss' ?
                wxEvent.emit('message', filter) : 0
        })

        return {
            count: data.body.AddMsgCount,
            Msgs: data.body.AddMsgList
        }
    },

    // 检查是否有新消息
    syncCheck: async () => {
        var url = 'https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck'
            + '?r=' + new Date().getTime()
            + '&skey=' + config.skey
            + '&sid=' + config.wxsid
            + '&uin=' + config.wxuin
            + '&deviceid=' + (config.DeviceID ? config.DeviceID : config.DeviceID = "e" + new Date().getTime())
            + '&synckey=' + (() => {
                var str = '';
                config.SyncKey.List.map((item, i) => {
                    str += item.Key + '_' + item.Val;
                    if (i != config.SyncKey.List.length - 1) {
                        str += '|'
                    }
                })
                return str;
            })();
        var data = await fetch(url, { json: true, followRedirect: false, jar: jar })
        eval(data.body)
        return (window.synccheck.retcode === '0' && window.synccheck.selector != '0')
    },

    // 消息进程
    async MsgServer() {
        while (true) {
            let newMsg = await (this.syncCheck())
            if (newMsg) {
                await (this.pullReceve())
            }
        }
    },

    // ### 发送消息
    // Type: 消息类型
    // LocalID: 
    // ClientMsgId: 
    sendMsg: async (FromUserName, ToUserName, Content) => {
        var url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg'
            + '?pass_ticket=' + config.pass_ticket
        var timeStamp = new Date().getTime();
        var data = await fetch(url, {
            method: 'post',
            json: true,
            followRedirect: false,
            jar: jar,
            body: {
                "BaseRequest": {
                    "Uin": parseInt(config.wxuin),
                    "Sid": config.wxsid,
                    "Skey": config.skey,
                    "DeviceID": config.DeviceID ? config.DeviceID : config.DeviceID = "e" + new Date().getTime()
                },
                Msg: {
                    Type: 1,
                    ToUserName,
                    FromUserName,
                    LocalID: timeStamp,
                    Content,
                    ClientMsgId: timeStamp,
                },
                rr: '-' + Math.random()
            }
        })
        return (data.body.BaseResponse.Ret === 0)
    },

    config: (options) => {
        saveCookie = options.cookie || false
        openBrowser = options.openBrowser || false
    },

    async run(cb) {
        let loginInfo = await (this.login())
        if (!(await (this.check_cookie()))) {
            var url = `https://login.weixin.qq.com/l/${loginInfo.uuid}`
            console.log('获取登录二维码:', `https://login.weixin.qq.com/qrcode/${loginInfo.uuid}`)
            openBrowser ? open(`https://login.weixin.qq.com/qrcode/${loginInfo.uuid}`) : qrcode.generate(url)
        } else {
            console.log('使用cookie自动登录!')
        }
        await this.check_login(loginInfo.uuid)
        await this.getUserInfo()
        await this.getContact()
        console.log('登录成功,启动消息服务')
        this.MsgServer() // 监听消息
        cb && cb()
    },

    getConfig: () => {
        return config;
    },

    listener: wxEvent
}