const fs = require('fs')
const EventEmitter = require('events')
const request = require('request').defaults({ jar: true })
const parseString = require('xml2js').parseString

const qrcode = require('qrcode-terminal')
const open = require('open')
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
            if (autoLogin) {
                var cookie_string = jar.getCookieString(url);
                if (cookie_string.length > 0) {
                    jar.setCookie('DeviceID=' + config.DeviceID, 'https://wx.qq.com');
                    jar.setCookie('DeviceID=' + config.DeviceID, 'https://webpush.wx.qq.com');
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
var autoLogin = true;
var openBrowser = false;

// 消息过滤器
const MsgFilter = async (item, config) => {
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
    var CONTENT = '';
    // 群聊消息
    if (item.FromUserName.indexOf('@@') === 0 || item.ToUserName.indexOf('@@') === 0) {
        TYPE = 'Group'
        var groupInfo = await (WechatCore.getGroupInfo(item.FromUserName.indexOf('@@') === 0 ? item.FromUserName : item.ToUserName))
        F_User = groupInfo
        groupInfo.MemberList.map(f_item => {
            if (f_item.UserName === (item.ToUserName.indexOf('@@') === 0 ? item.FromUserName : item.ToUserName)) {
                T_User = f_item;
            }
        })
        CONTENT = item.Content;
        if (item.Content.indexOf(':<br/>') > -1) {
            CONTENT = item.Content.substring(item.Content.indexOf(':<br/>') + 6);
        }

    } else {
        config.MemberList.map(m_item => {
            if (m_item.UserName === item.FromUserName) {
                F_User = m_item;
            }
            if (m_item.UserName === item.ToUserName) {
                T_User = m_item;
            }
        })
        CONTENT = item.Content;
    }

    return {
        fromUser: F_User, // 发送者
        toUser: T_User, // 接收者
        type: TYPE, // 消息类型
        msg: CONTENT, // 消息内容
        originMsg: item // 原始消息内容
    }
}

module.exports = WechatCore = {
    /**
    *
    获取登录二维码
    *
    @method login
    *
    @return {Object}
    */
    login: async () => {
        let QRLoginUUID = await fetch(_LOGIN_URL)
        eval(QRLoginUUID.body)
        return {
            code: window.QRLogin.code,
            uuid: window.QRLogin.uuid
        }
    },

    /**
    *
    检查cookie状态, true 为有效
    *
    @method checkCookie
    *
    @param {Boolean} [getData=false] 是否获取cookie对象
    *
    @return {Boolean}
    */
    async __checkCookie(getData) {
        if (!fs.existsSync('./cookie/cookies.cookie')) {
            if (getData) {
                return {}
            }
            return false
        }
        var cookie_string = fs.readFileSync('./cookie/cookies.cookie', 'utf-8')
        this.setCookie(cookie_string)

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
        if (autoLogin) {
            let _checkCookie = await (this.__checkCookie(true))
            if (_checkCookie.hasOwnProperty('SystemTime') && _checkCookie.SystemTime !== 0) {
                config.uuid = UUID;
                config.skey = _checkCookie.SKey;
                config.pass_ticket = '';
                config.wxsid = JCookie['wxsid'];
                config.wxuin = _checkCookie['User']['Uin'];
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

    /**
    *
    获取账户资料
    *
    @method getOwnerInfo
    *
    @return {config.userInfo}
    */
    getOwnerInfo: async () => {
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

    /**
    *
    获取单个用户信息
    *
    @method getUserInfo
    *
    @param {String} [userName=''] 用户UserName
    *
    @return {Object}
    */
    async getUserInfo(userName) {
        var userObj = null;
        if (userName.indexOf('@@') > -1) {
            config.chatRoomList.map(item => {
                if (item.UserName === userName) {
                    userObj = item;
                }
            })
            if (userObj) {
                return userObj
            }
        }
        let contacts = await this.getContact()

        contacts.map(item => {
            if (item.UserName === userName) {
                userObj = item
            }
        })
        return userObj;
    },

    /**
    *
    获取用户昵称
    *
    @method getNickName
    *
    @param {String} [userName=''] 用户UserName
    *
    @return {String}
    */
    async getNickName(userName) {
        return await this.getUserInfo(userName).NickName
    },

    // 获取联系人列表
    async getContact() {
        if (config.MemberList.length > 0) {
            return config.MemberList
        }
        let data = await (fetch(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?r=${new Date().getTime()}&pass_ticket=${config.pass_ticket}&seq=0&skey=${config.skey}`, { json: true, followRedirect: false, jar: jar }))
        config.MemberList = data.body.MemberList
        var chatRooms = []
        config.MemberList.map(item => {
            if (item.UserName.indexOf('@@') > -1) {
                chatRooms.push({
                    ChatRoomId: '',
                    UserName: item.UserName
                })
            }
        })
        await this.getGroupInfo(chatRooms)
        return config.MemberList;
    },

    // 获取群聊信息
    async getGroupInfo(userName) {
        var GroupInfo = await this.getUserInfo(userName);
        if (GroupInfo) {
            return GroupInfo
        }
        let data = await fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxbatchgetcontact?lang=zh_CNtype=ex&r=' + new Date().getTime(), {
            method: 'post',
            json: true,
            followRedirect: false,
            jar: jar,
            body: {
                "BaseRequest": {
                    "Uin": config.wxuin,
                    "Sid": config.wxsid,
                    "Skey": config.skey,
                    "DeviceID": config.DeviceID ? config.DeviceID : config.DeviceID = "e" + new Date().getTime()
                },
                Count: 1,
                List: (userName instanceof Array) ? userName : [
                    {
                        ChatRoomId: '',
                        UserName: userName
                    }
                ]
            }
        })
        if (data.body.Count > 0) {
            data.body.ContactList.map(item => {
                var flag = false;
                config.chatRoomList.map(j => {
                    if (j.UserName === item.UserName) {
                        flag = true;
                    }
                })
                if (!flag) {
                    config.chatRoomList.push(item)
                }
            })
        }
        return ((userName instanceof Array) ? data.body.ContactList : data.body.ContactList[0])
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

        data.body.AddMsgList.map(async item => {
            var filter = await MsgFilter(item, config)
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
        // 有时候会乱码
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

    /**
    *
    获取cookie字符串
    *
    @method getCookie
    *
    @return {String} 返回cookie的String字符串
    */
    getCookie() {
        return jar.getCookieString('https://wx.qq.com');
    },

    /**
    *
    手动设置cookie
    *
    @method setCookie
    *
    @param {String} [cookieString=''] Cookie字符串
    */
    setCookie(cookieString) {
        var cookies = cookieString.trim().split(';');
        JCookie = {};
        cookies.map(item => {
            var trimitem = item.trim()
            JCookie[trimitem.substring(0, trimitem.indexOf('='))] = trimitem.substring(trimitem.indexOf('=') + 1);
        })
        for (var i = 0; i < cookies.length; ++i) {
            jar.setCookie(cookies[i].trim(), 'https://wx.qq.com');
            jar.setCookie(cookies[i].trim(), 'https://webpush.wx.qq.com');
        }
        console.log(config.DeviceID)
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

    /**
    *
    全局配置
    *
    @method config
    *
    @param {Object} [options={}] 配置
    */
    config(options) {
        autoLogin = options.autoLogin || true
        openBrowser = options.openBrowser || false
        options.cookie ? this.setCookie(options.cookie) : 0
    },

    /**
    *
    创建群聊
    *
    @method createChatroom
    *
    @param {Array} [memberList=[], Topic=''] 用户列表 群聊名称
    *
    @return {Object}
    */
    async createChatroom(memberList, Topic) {
        let data = await (fetch(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxcreatechatroom?pass_ticket=${config.pass_ticket}&r=${new Date().getTime()}`, {
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
                MemberCount: memberList.length,
                MemberList: memberList,
                Topic: Topic || '',
            }
        }))
        return {
            status: (data.body.MemberCount > 0),
            error: data.body.BaseResponse.ErrMsg
        }
    },

    /**
    *
    修改群聊名称
    *
    @method renameChatroom
    *
    @param {String} [ChatRoomName='',NewTopic='']
    *
    @return {Boolean}
    */
    async renameChatroom(ChatRoomName, NewTopic) {
        var url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxupdatechatroom?fun=modtopic'
        let data = await (fetch(url, {
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
                ChatRoomName,
                NewTopic
            }
        }))
        return (data.body.BaseResponse.ErrMsg === '' && data.body.BaseResponse.Ret === 0)
    },

    /**
    *
    邀请加入群聊
    *
    @method addMemberFromChatroom
    *
    @param {String} [ChatRoomName='',NewTopic='']
    *
    @return {Boolean}
    */
    async addMemberFromChatroom(ChatRoomName, userName) {
        var url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxupdatechatroom?fun=addmember'
        let data = await (fetch(url, {
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
                ChatRoomName,
                AddMemberList: userName
            }
        }))
        return (data.body.BaseResponse.ErrMsg === '' && data.body.BaseResponse.Ret === 0)
    },

    /**
    *
    移出群聊
    *
    @method deleteMemberFromChatroom
    *
    @param {String} [ChatRoomName='',NewTopic='']
    *
    @return {Boolean}
    */
    async deleteMemberFromChatroom(ChatRoomName, userName) {
        var url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxupdatechatroom?fun=delmember'
        let data = await (fetch(url, {
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
                ChatRoomName,
                DelMemberList: userName
            }
        }))
        return (data.body.BaseResponse.ErrMsg === '' && data.body.BaseResponse.Ret === 0)
    },

    async run(cb) {
        let loginInfo = await (this.login())
        if (!(await (this.__checkCookie()))) {
            var url = `https://login.weixin.qq.com/l/${loginInfo.uuid}`
            console.log('获取登录二维码:', `https://login.weixin.qq.com/qrcode/${loginInfo.uuid}`)
            openBrowser ? open(`https://login.weixin.qq.com/qrcode/${loginInfo.uuid}`) : qrcode.generate(url)
        } else {
            console.log('使用cookie自动登录!')
        }
        await this.check_login(loginInfo.uuid)
        await this.getOwnerInfo()
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