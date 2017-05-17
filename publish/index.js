'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var fs = require('fs');
var EventEmitter = require('events');
var request = require('request').defaults({ jar: true });
var parseString = require('xml2js').parseString;

var qrcode = require('qrcode-terminal');
var open = require('open');
var MsgFilter = require('./libs/msgfilter');
var config = require('./config.js');

var _LOGIN_URL = 'https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&redirect_uri=https%3A%2F%2Fwx.qq.com%2Fcgi-bin%2Fmmwebwx-bin%2Fwebwxnewloginpage&fun=new&lang=en_US&_=' + new Date().getTime();
var _QR_IMAGE_URL = 'https://login.weixin.qq.com/qrcode/';
var REDIRECT_URL = 'https://login.weixin.qq.com/cgi-bin/mmwebwx-bin/login?loginicon=true&uuid=$0&tip=0&_=' + new Date().getTime();

var jar = request.jar();

var window = {
    QRLogin: {
        code: null,
        uuid: null
    },
    redirect_uri: '',
    code: 0
};

var fetch = function fetch(url, options) {
    return new Promise(function (resolve, reject) {
        request(url, options, function (err, httpResponse, body) {
            if (saveCookie) {
                var cookie_string = jar.getCookieString(url);
                if (cookie_string.length > 0) {
                    fs.writeFileSync('./cookie/cookies.cookie', cookie_string);
                }
            }
            resolve(httpResponse);
        });
    });
};

var wxEvent = new EventEmitter();

// cookie容器
var JCookie = {};
// 是否自动保存cookie 方便下次登录
var saveCookie = true;
var openBrowser = false;

module.exports = {
    // 获取登录二维码
    login: function () {
        var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
            var QRLoginUUID;
            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            _context.next = 2;
                            return fetch(_LOGIN_URL);

                        case 2:
                            QRLoginUUID = _context.sent;

                            eval(QRLoginUUID.body);
                            wxEvent.emit('login', {
                                type: 'qrcode', msg: 'get uuid', data: {
                                    code: window.QRLogin.code,
                                    uuid: window.QRLogin.uuid
                                }
                            });
                            return _context.abrupt('return', {
                                code: window.QRLogin.code,
                                uuid: window.QRLogin.uuid
                            });

                        case 6:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, undefined);
        }));

        function login() {
            return _ref.apply(this, arguments);
        }

        return login;
    }(),

    // 检查cookie是否有效

    check_cookie: function () {
        var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(getData) {
            var cookie_string, cookies, i, data;
            return regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            if (fs.existsSync('./cookie/cookies.cookie')) {
                                _context2.next = 4;
                                break;
                            }

                            if (!getData) {
                                _context2.next = 3;
                                break;
                            }

                            return _context2.abrupt('return', {});

                        case 3:
                            return _context2.abrupt('return', false);

                        case 4:
                            cookie_string = fs.readFileSync('./cookie/cookies.cookie', 'utf-8');
                            cookies = cookie_string.trim().split(';');

                            JCookie = {};
                            cookies.map(function (item) {
                                var trimitem = item.trim();
                                JCookie[trimitem.substring(0, trimitem.indexOf('='))] = trimitem.substring(trimitem.indexOf('=') + 1);
                            });
                            for (i = 0; i < cookies.length; ++i) {
                                jar.setCookie(cookies[i].trim(), 'https://wx.qq.com');
                                jar.setCookie(cookies[i].trim(), 'https://webpush.wx.qq.com');
                            }

                            _context2.next = 11;
                            return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=-' + new Date().getTime(), {
                                method: 'post',
                                jar: jar,
                                json: true,
                                followRedirect: false,
                                body: {
                                    "BaseRequest": {
                                        "Uin": JCookie['wxuin'],
                                        "Sid": JCookie['wxsid'],
                                        "Skey": "",
                                        "DeviceID": "e" + new Date().getTime()
                                    }
                                }
                            });

                        case 11:
                            data = _context2.sent;

                            if (!getData) {
                                _context2.next = 14;
                                break;
                            }

                            return _context2.abrupt('return', data.body);

                        case 14:
                            return _context2.abrupt('return', data.body.SystemTime !== 0);

                        case 15:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, undefined);
        }));

        function check_cookie(_x) {
            return _ref2.apply(this, arguments);
        }

        return check_cookie;
    }(),

    // 等待登录
    check_login: function () {
        var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee5(uuid) {
            var _this2 = this;

            var UUID, _check_cookie, code, _ret;

            return regeneratorRuntime.wrap(function _callee5$(_context5) {
                while (1) {
                    switch (_context5.prev = _context5.next) {
                        case 0:
                            UUID = uuid;

                            if (!saveCookie) {
                                _context5.next = 13;
                                break;
                            }

                            _context5.next = 4;
                            return this.check_cookie(true);

                        case 4:
                            _check_cookie = _context5.sent;

                            if (!(_check_cookie.hasOwnProperty('SystemTime') && _check_cookie.SystemTime !== 0)) {
                                _context5.next = 13;
                                break;
                            }

                            wxEvent.emit('login', {
                                type: 'haslogin', msg: 'has logged in', data: config
                            });
                            config.uuid = UUID;
                            config.skey = _check_cookie.SKey;
                            config.pass_ticket = '';
                            config.wxsid = JCookie['wxsid'];
                            config.wxuin = _check_cookie['User']['Uin'];
                            return _context5.abrupt('return', config);

                        case 13:
                            if (!true) {
                                _context5.next = 26;
                                break;
                            }

                            _context5.next = 16;
                            return fetch(REDIRECT_URL.replace('$0', window.QRLogin.uuid), { jar: jar });

                        case 16:
                            code = _context5.sent;

                            eval(code.body);
                            config.userAvatar = window.userAvatar;

                            if (!window.redirect_uri) {
                                _context5.next = 24;
                                break;
                            }

                            return _context5.delegateYield(regeneratorRuntime.mark(function _callee4() {
                                var redirect_data;
                                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                                    while (1) {
                                        switch (_context4.prev = _context4.next) {
                                            case 0:
                                                _context4.next = 2;
                                                return fetch(window.redirect_uri, { json: true, followRedirect: false, jar: jar });

                                            case 2:
                                                redirect_data = _context4.sent;
                                                return _context4.abrupt('return', {
                                                    v: new Promise(function (resolve, reject) {
                                                        var _this = this;

                                                        parseString(redirect_data.body, function () {
                                                            var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(err, result) {
                                                                var init_data;
                                                                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                                                                    while (1) {
                                                                        switch (_context3.prev = _context3.next) {
                                                                            case 0:
                                                                                config.uuid = UUID;
                                                                                config.skey = result.error.skey[0];
                                                                                config.pass_ticket = result.error.pass_ticket[0];
                                                                                config.wxsid = result.error.wxsid[0];
                                                                                config.wxuin = result.error.wxuin[0];
                                                                                config.cookie = redirect_data.headers['set-cookie'];
                                                                                config.isLogin = true;
                                                                                _context3.next = 9;
                                                                                return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=' + new Date().getTime(), {
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
                                                                                        }
                                                                                    }
                                                                                });

                                                                            case 9:
                                                                                init_data = _context3.sent;

                                                                                config.initData = init_data.body;
                                                                                resolve(config);

                                                                            case 12:
                                                                            case 'end':
                                                                                return _context3.stop();
                                                                        }
                                                                    }
                                                                }, _callee3, _this);
                                                            }));

                                                            return function (_x3, _x4) {
                                                                return _ref4.apply(this, arguments);
                                                            };
                                                        }());
                                                    })
                                                });

                                            case 4:
                                            case 'end':
                                                return _context4.stop();
                                        }
                                    }
                                }, _callee4, _this2);
                            })(), 't0', 21);

                        case 21:
                            _ret = _context5.t0;

                            if (!((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object")) {
                                _context5.next = 24;
                                break;
                            }

                            return _context5.abrupt('return', _ret.v);

                        case 24:
                            _context5.next = 13;
                            break;

                        case 26:
                        case 'end':
                            return _context5.stop();
                    }
                }
            }, _callee5, this);
        }));

        function check_login(_x2) {
            return _ref3.apply(this, arguments);
        }

        return check_login;
    }(),


    // 获取用户信息
    getUserInfo: function () {
        var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6() {
            var data;
            return regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            if (!(config.userInfo && config.SyncKey)) {
                                _context6.next = 2;
                                break;
                            }

                            return _context6.abrupt('return', config.userInfo);

                        case 2:
                            _context6.next = 4;
                            return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=' + new Date().getTime(), {
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
                                    }
                                }
                            });

                        case 4:
                            data = _context6.sent;

                            config.userInfo = data.body;
                            config.SyncKey = data.body.SyncKey;
                            wxEvent.emit('Login', { code: 200, msg: '登录成功' });
                            return _context6.abrupt('return', data.body);

                        case 9:
                        case 'end':
                            return _context6.stop();
                    }
                }
            }, _callee6, undefined);
        }));

        function getUserInfo() {
            return _ref5.apply(this, arguments);
        }

        return getUserInfo;
    }(),

    // 获取联系人列表
    getContact: function () {
        var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
            var data;
            return regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            if (!config.MemberList) {
                                _context7.next = 2;
                                break;
                            }

                            return _context7.abrupt('return', config.MemberList);

                        case 2:
                            _context7.next = 4;
                            return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?r=' + new Date().getTime() + '&pass_ticket=' + config.pass_ticket + '&seq=0&skey=' + config.skey, { json: true, followRedirect: false, jar: jar });

                        case 4:
                            data = _context7.sent;

                            config.MemberList = data.body.MemberList;
                            return _context7.abrupt('return', config.MemberList);

                        case 7:
                        case 'end':
                            return _context7.stop();
                    }
                }
            }, _callee7, undefined);
        }));

        function getContact() {
            return _ref6.apply(this, arguments);
        }

        return getContact;
    }(),

    // 拉取最新消息
    pullReceve: function () {
        var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8() {
            var data;
            return regeneratorRuntime.wrap(function _callee8$(_context8) {
                while (1) {
                    switch (_context8.prev = _context8.next) {
                        case 0:
                            _context8.next = 2;
                            return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync?sid=' + config.wxsid + '&skey=' + config.skey + '&lang=zh_CN', {
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
                            });

                        case 2:
                            data = _context8.sent;

                            config.SyncKey = data.body.SyncKey;
                            // switch()
                            data.body.AddMsgList.map(function (item) {
                                var filter = MsgFilter(item, config);
                                filter.type !== 'Miss' ? wxEvent.emit('message', filter) : 0;
                            });

                            return _context8.abrupt('return', {
                                count: data.body.AddMsgCount,
                                Msgs: data.body.AddMsgList
                            });

                        case 6:
                        case 'end':
                            return _context8.stop();
                    }
                }
            }, _callee8, undefined);
        }));

        function pullReceve() {
            return _ref7.apply(this, arguments);
        }

        return pullReceve;
    }(),

    // 检查是否有新消息
    syncCheck: function () {
        var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9() {
            var url, data;
            return regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                    switch (_context9.prev = _context9.next) {
                        case 0:
                            url = 'https://webpush.wx.qq.com/cgi-bin/mmwebwx-bin/synccheck' + '?r=' + new Date().getTime() + '&skey=' + config.skey + '&sid=' + config.wxsid + '&uin=' + config.wxuin + '&deviceid=' + (config.DeviceID ? config.DeviceID : config.DeviceID = "e" + new Date().getTime()) + '&synckey=' + function () {
                                var str = '';
                                config.SyncKey.List.map(function (item, i) {
                                    str += item.Key + '_' + item.Val;
                                    if (i != config.SyncKey.List.length - 1) {
                                        str += '|';
                                    }
                                });
                                return str;
                            }();

                            _context9.next = 3;
                            return fetch(url, { json: true, followRedirect: false, jar: jar });

                        case 3:
                            data = _context9.sent;

                            eval(data.body);
                            return _context9.abrupt('return', window.synccheck.retcode === '0' && window.synccheck.selector != '0');

                        case 6:
                        case 'end':
                            return _context9.stop();
                    }
                }
            }, _callee9, undefined);
        }));

        function syncCheck() {
            return _ref8.apply(this, arguments);
        }

        return syncCheck;
    }(),

    // 消息进程
    MsgServer: function () {
        var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
            var newMsg;
            return regeneratorRuntime.wrap(function _callee10$(_context10) {
                while (1) {
                    switch (_context10.prev = _context10.next) {
                        case 0:
                            if (!true) {
                                _context10.next = 9;
                                break;
                            }

                            _context10.next = 3;
                            return this.syncCheck();

                        case 3:
                            newMsg = _context10.sent;

                            if (!newMsg) {
                                _context10.next = 7;
                                break;
                            }

                            _context10.next = 7;
                            return this.pullReceve();

                        case 7:
                            _context10.next = 0;
                            break;

                        case 9:
                        case 'end':
                            return _context10.stop();
                    }
                }
            }, _callee10, this);
        }));

        function MsgServer() {
            return _ref9.apply(this, arguments);
        }

        return MsgServer;
    }(),


    // ### 发送消息
    // Type: 消息类型
    // LocalID: 
    // ClientMsgId: 
    sendMsg: function () {
        var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(FromUserName, ToUserName, Content) {
            var url, timeStamp, data;
            return regeneratorRuntime.wrap(function _callee11$(_context11) {
                while (1) {
                    switch (_context11.prev = _context11.next) {
                        case 0:
                            url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg' + '?pass_ticket=' + config.pass_ticket;
                            timeStamp = new Date().getTime();
                            _context11.next = 4;
                            return fetch(url, {
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
                                        ToUserName: ToUserName,
                                        FromUserName: FromUserName,
                                        LocalID: timeStamp,
                                        Content: Content,
                                        ClientMsgId: timeStamp
                                    },
                                    rr: '-' + Math.random()
                                }
                            });

                        case 4:
                            data = _context11.sent;
                            return _context11.abrupt('return', data.body.BaseResponse.Ret === 0);

                        case 6:
                        case 'end':
                            return _context11.stop();
                    }
                }
            }, _callee11, undefined);
        }));

        function sendMsg(_x5, _x6, _x7) {
            return _ref10.apply(this, arguments);
        }

        return sendMsg;
    }(),

    config: function config(options) {
        saveCookie = options.cookie || false;
        openBrowser = options.openBrowser || false;
    },

    run: function () {
        var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(cb) {
            var loginInfo, url;
            return regeneratorRuntime.wrap(function _callee12$(_context12) {
                while (1) {
                    switch (_context12.prev = _context12.next) {
                        case 0:
                            _context12.next = 2;
                            return this.login();

                        case 2:
                            loginInfo = _context12.sent;
                            _context12.next = 5;
                            return this.check_cookie();

                        case 5:
                            if (_context12.sent) {
                                _context12.next = 11;
                                break;
                            }

                            url = 'https://login.weixin.qq.com/l/' + loginInfo.uuid;

                            console.log('获取登录二维码:', 'https://login.weixin.qq.com/qrcode/' + loginInfo.uuid);
                            openBrowser ? open('https://login.weixin.qq.com/qrcode/' + loginInfo.uuid) : qrcode.generate(url);
                            _context12.next = 12;
                            break;

                        case 11:
                            console.log('使用cookie自动登录!');

                        case 12:
                            _context12.next = 14;
                            return this.check_login(loginInfo.uuid);

                        case 14:
                            _context12.next = 16;
                            return this.getUserInfo();

                        case 16:
                            _context12.next = 18;
                            return this.getContact();

                        case 18:
                            console.log('登录成功,启动消息服务');
                            this.MsgServer(); // 监听消息
                            cb && cb();

                        case 21:
                        case 'end':
                            return _context12.stop();
                    }
                }
            }, _callee12, this);
        }));

        function run(_x8) {
            return _ref11.apply(this, arguments);
        }

        return run;
    }(),


    getConfig: function getConfig() {
        return config;
    },

    listener: wxEvent
};
'use strict';

module.exports = {
    skey: '',
    pass_ticket: '',
    wxsid: '',
    wxuin: '',
    cookie: null,
    initData: null,
    isLogin: false,
    uuid: '',
    userAvatar: '', // 头像
    userInfo: null, // 用户信息
    MemberList: [], // 联系人列表
    SyncKey: [] };
'use strict';

module.exports = require('./client');
'use strict';

module.exports = function (item, config) {
    var TYPE = 'Miss';
    switch (item.MsgType) {
        case 1:
            TYPE = 'Text';
            break;
        case 3:
            TYPE = 'Picture';
            break;
        case 47:
            TYPE = 'Picture';
            break;
        case 42:
            TYPE = 'NameCard';
            break;
        case 49:
            TYPE = 'Link';
            break;
        case 62:
            TYPE = 'Video';
            break;
    }
    var F_User = null;
    var T_User = null;
    config.MemberList.map(function (m_item) {
        if (m_item.UserName === item.FromUserName) {
            F_User = m_item;
        }
        if (m_item.UserName === item.ToUserName) {
            T_User = m_item;
        }
    });
    return {
        fromUser: F_User, // 发送者
        toUser: T_User, // 接收者
        type: TYPE, // 消息类型
        msg: item.Content, // 消息内容
        originMsg: item // 原始消息内容
    };
};
