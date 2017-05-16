var request = require('request').defaults({ jar: true })
var config = require('./config.js')
var parseString = require('xml2js').parseString
const _LOGIN_URL = 'https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=en_US&_=' + new Date().getTime()
const _QR_IMAGE_URL = 'https://login.weixin.qq.com/qrcode/'
const REDIRECT_URL = 'https://login.weixin.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid=$0&tip=0&_=' + new Date().getTime()
const fs = require('fs')
const EventEmitter = require('events');

var jar = request.jar();

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
var saveCookie = false;
var openBrowser = true;

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
    check_login: async function (uuid) {
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
        let data = await (fetch(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?r=${new Date().getTime()}&pass_ticket=${config.pass_ticket}&seq=0&skey=${config.skey}`, { json: true, followRedirect: false, jar: jar }))
        config.MemberList = data.body.MemberList
        return data.body;
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
            var TYPE = 'Miss';
            switch (item.MsgType) {
                case 1:
                    TYPE = 'Text'
                    break;
                case 3:
                    TYPE = 'Picture'
                    break;
                case 47:
                    TYPE = 'Picture'
                    break;
                case 42:
                    TYPE = 'NameCard'
                    break;
                case 49:
                    TYPE = 'Link'
                    break;
                case 62:
                    TYPE = 'Video'
                    break;
            }
            var F_User = null;
            var T_User = null;
            config.MemberList.map(m_item => {
                if (m_item.UserName === item.FromUserName) {
                    F_User = m_item;
                }
                if (m_item.UserName === item.ToUserName) {
                    T_User = m_item;
                }
            })
            TYPE != 'Miss' ?
                wxEvent.emit('message', {
                    fromUser: F_User, // 发送者
                    toUser: T_User, // 接收者
                    type: TYPE, // 消息类型
                    msg: item.Content, // 消息内容
                    originMsg: item // 原始消息内容
                }) : 0
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
    MsgServer: async function () {
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

    global: (options) => {
        saveCookie = options.cookie || false
        openBrowser = options.openBrowser || false
    },

    getConfig: () => {
        return config;
    },

    listener: wxEvent
}