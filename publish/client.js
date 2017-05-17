var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var fs = require('fs');
var EventEmitter = require('events');
var request = require('request').defaults({ jar: true });
var parseString = require('xml2js').parseString;

var qrcode = require('qrcode-terminal');
var open = require('open');
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
            if (autoLogin) {
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
var autoLogin = true;
var openBrowser = false;

// 消息过滤器
var MsgFilter = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(item, config) {
        var TYPE, F_User, T_User, CONTENT, groupInfo;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        TYPE = 'Miss';
                        _context.t0 = item.MsgType;
                        _context.next = _context.t0 === 1 ? 4 : _context.t0 === 3 ? 6 : _context.t0 === 47 ? 8 : _context.t0 === 42 ? 10 : _context.t0 === 49 ? 12 : _context.t0 === 62 ? 14 : 16;
                        break;

                    case 4:
                        TYPE = 'Text';
                        return _context.abrupt('break', 16);

                    case 6:
                        TYPE = 'Picture';
                        return _context.abrupt('break', 16);

                    case 8:
                        TYPE = 'Picture';
                        return _context.abrupt('break', 16);

                    case 10:
                        TYPE = 'NameCard';
                        return _context.abrupt('break', 16);

                    case 12:
                        TYPE = 'Link';
                        return _context.abrupt('break', 16);

                    case 14:
                        TYPE = 'Video';
                        return _context.abrupt('break', 16);

                    case 16:
                        F_User = null;
                        T_User = null;
                        CONTENT = '';
                        // 群聊消息

                        if (!(item.FromUserName.indexOf('@@') === 0 || item.ToUserName.indexOf('@@') === 0)) {
                            _context.next = 30;
                            break;
                        }

                        TYPE = 'Group';
                        _context.next = 23;
                        return WechatCore.getGroupInfo(item.FromUserName.indexOf('@@') === 0 ? item.FromUserName : item.ToUserName);

                    case 23:
                        groupInfo = _context.sent;

                        F_User = groupInfo;
                        groupInfo.MemberList.map(function (f_item) {
                            if (f_item.UserName === (item.ToUserName.indexOf('@@') === 0 ? item.FromUserName : item.ToUserName)) {
                                T_User = f_item;
                            }
                        });
                        CONTENT = item.Content;
                        if (item.Content.indexOf(':<br/>') > -1) {
                            CONTENT = item.Content.substring(item.Content.indexOf(':<br/>') + 6);
                        }

                        _context.next = 32;
                        break;

                    case 30:
                        config.MemberList.map(function (m_item) {
                            if (m_item.UserName === item.FromUserName) {
                                F_User = m_item;
                            }
                            if (m_item.UserName === item.ToUserName) {
                                T_User = m_item;
                            }
                        });
                        CONTENT = item.Content;

                    case 32:
                        return _context.abrupt('return', {
                            fromUser: F_User, // 发送者
                            toUser: T_User, // 接收者
                            type: TYPE, // 消息类型
                            msg: CONTENT, // 消息内容
                            originMsg: item // 原始消息内容
                        });

                    case 33:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, undefined);
    }));

    return function MsgFilter(_x, _x2) {
        return _ref.apply(this, arguments);
    };
}();

module.exports = WechatCore = {
    /**
    *
    获取登录二维码
    *
    @method login
    *
    @return {Object}
    */
    login: function () {
        var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
            var QRLoginUUID;
            return regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            _context2.next = 2;
                            return fetch(_LOGIN_URL);

                        case 2:
                            QRLoginUUID = _context2.sent;

                            eval(QRLoginUUID.body);
                            return _context2.abrupt('return', {
                                code: window.QRLogin.code,
                                uuid: window.QRLogin.uuid
                            });

                        case 5:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, undefined);
        }));

        function login() {
            return _ref2.apply(this, arguments);
        }

        return login;
    }(),

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
    __checkCookie: function () {
        var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(getData) {
            var cookie_string, data;
            return regeneratorRuntime.wrap(function _callee3$(_context3) {
                while (1) {
                    switch (_context3.prev = _context3.next) {
                        case 0:
                            if (fs.existsSync('./cookie/cookies.cookie')) {
                                _context3.next = 4;
                                break;
                            }

                            if (!getData) {
                                _context3.next = 3;
                                break;
                            }

                            return _context3.abrupt('return', {});

                        case 3:
                            return _context3.abrupt('return', false);

                        case 4:
                            cookie_string = fs.readFileSync('./cookie/cookies.cookie', 'utf-8');

                            this.setCookie(cookie_string);

                            _context3.next = 8;
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

                        case 8:
                            data = _context3.sent;

                            if (!getData) {
                                _context3.next = 11;
                                break;
                            }

                            return _context3.abrupt('return', data.body);

                        case 11:
                            return _context3.abrupt('return', data.body.SystemTime !== 0);

                        case 12:
                        case 'end':
                            return _context3.stop();
                    }
                }
            }, _callee3, this);
        }));

        function __checkCookie(_x3) {
            return _ref3.apply(this, arguments);
        }

        return __checkCookie;
    }(),


    // 等待登录
    check_login: function () {
        var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee6(uuid) {
            var _this2 = this;

            var UUID, _checkCookie, code, _ret;

            return regeneratorRuntime.wrap(function _callee6$(_context6) {
                while (1) {
                    switch (_context6.prev = _context6.next) {
                        case 0:
                            UUID = uuid;

                            if (!autoLogin) {
                                _context6.next = 12;
                                break;
                            }

                            _context6.next = 4;
                            return this.__checkCookie(true);

                        case 4:
                            _checkCookie = _context6.sent;

                            if (!(_checkCookie.hasOwnProperty('SystemTime') && _checkCookie.SystemTime !== 0)) {
                                _context6.next = 12;
                                break;
                            }

                            config.uuid = UUID;
                            config.skey = _checkCookie.SKey;
                            config.pass_ticket = '';
                            config.wxsid = JCookie['wxsid'];
                            config.wxuin = _checkCookie['User']['Uin'];
                            return _context6.abrupt('return', config);

                        case 12:
                            if (!true) {
                                _context6.next = 25;
                                break;
                            }

                            _context6.next = 15;
                            return fetch(REDIRECT_URL.replace('$0', window.QRLogin.uuid), { jar: jar });

                        case 15:
                            code = _context6.sent;

                            eval(code.body);
                            config.userAvatar = window.userAvatar;

                            if (!window.redirect_uri) {
                                _context6.next = 23;
                                break;
                            }

                            return _context6.delegateYield(regeneratorRuntime.mark(function _callee5() {
                                var redirect_data;
                                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                                    while (1) {
                                        switch (_context5.prev = _context5.next) {
                                            case 0:
                                                _context5.next = 2;
                                                return fetch(window.redirect_uri, { json: true, followRedirect: false, jar: jar });

                                            case 2:
                                                redirect_data = _context5.sent;
                                                return _context5.abrupt('return', {
                                                    v: new Promise(function (resolve, reject) {
                                                        var _this = this;

                                                        parseString(redirect_data.body, function () {
                                                            var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(err, result) {
                                                                var init_data;
                                                                return regeneratorRuntime.wrap(function _callee4$(_context4) {
                                                                    while (1) {
                                                                        switch (_context4.prev = _context4.next) {
                                                                            case 0:
                                                                                config.uuid = UUID;
                                                                                config.skey = result.error.skey[0];
                                                                                config.pass_ticket = result.error.pass_ticket[0];
                                                                                config.wxsid = result.error.wxsid[0];
                                                                                config.wxuin = result.error.wxuin[0];
                                                                                config.cookie = redirect_data.headers['set-cookie'];
                                                                                config.isLogin = true;
                                                                                _context4.next = 9;
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
                                                                                init_data = _context4.sent;

                                                                                config.initData = init_data.body;
                                                                                resolve(config);

                                                                            case 12:
                                                                            case 'end':
                                                                                return _context4.stop();
                                                                        }
                                                                    }
                                                                }, _callee4, _this);
                                                            }));

                                                            return function (_x5, _x6) {
                                                                return _ref5.apply(this, arguments);
                                                            };
                                                        }());
                                                    })
                                                });

                                            case 4:
                                            case 'end':
                                                return _context5.stop();
                                        }
                                    }
                                }, _callee5, _this2);
                            })(), 't0', 20);

                        case 20:
                            _ret = _context6.t0;

                            if (!((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object")) {
                                _context6.next = 23;
                                break;
                            }

                            return _context6.abrupt('return', _ret.v);

                        case 23:
                            _context6.next = 12;
                            break;

                        case 25:
                        case 'end':
                            return _context6.stop();
                    }
                }
            }, _callee6, this);
        }));

        function check_login(_x4) {
            return _ref4.apply(this, arguments);
        }

        return check_login;
    }(),


    /**
    *
    获取账户资料
    *
    @method getOwnerInfo
    *
    @return {config.userInfo}
    */
    getOwnerInfo: function () {
        var _ref6 = _asyncToGenerator(regeneratorRuntime.mark(function _callee7() {
            var data;
            return regeneratorRuntime.wrap(function _callee7$(_context7) {
                while (1) {
                    switch (_context7.prev = _context7.next) {
                        case 0:
                            if (!(config.userInfo && config.SyncKey)) {
                                _context7.next = 2;
                                break;
                            }

                            return _context7.abrupt('return', config.userInfo);

                        case 2:
                            _context7.next = 4;
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
                            data = _context7.sent;

                            config.userInfo = data.body;
                            config.SyncKey = data.body.SyncKey;
                            wxEvent.emit('Login', { code: 200, msg: '登录成功' });
                            return _context7.abrupt('return', data.body);

                        case 9:
                        case 'end':
                            return _context7.stop();
                    }
                }
            }, _callee7, undefined);
        }));

        function getOwnerInfo() {
            return _ref6.apply(this, arguments);
        }

        return getOwnerInfo;
    }(),

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
    getUserInfo: function () {
        var _ref7 = _asyncToGenerator(regeneratorRuntime.mark(function _callee8(userName) {
            var userObj, contacts;
            return regeneratorRuntime.wrap(function _callee8$(_context8) {
                while (1) {
                    switch (_context8.prev = _context8.next) {
                        case 0:
                            userObj = null;

                            if (!(userName.indexOf('@@') > -1)) {
                                _context8.next = 5;
                                break;
                            }

                            config.chatRoomList.map(function (item) {
                                if (item.UserName === userName) {
                                    userObj = item;
                                }
                            });

                            if (!userObj) {
                                _context8.next = 5;
                                break;
                            }

                            return _context8.abrupt('return', userObj);

                        case 5:
                            _context8.next = 7;
                            return this.getContact();

                        case 7:
                            contacts = _context8.sent;


                            contacts.map(function (item) {
                                if (item.UserName === userName) {
                                    userObj = item;
                                }
                            });
                            return _context8.abrupt('return', userObj);

                        case 10:
                        case 'end':
                            return _context8.stop();
                    }
                }
            }, _callee8, this);
        }));

        function getUserInfo(_x7) {
            return _ref7.apply(this, arguments);
        }

        return getUserInfo;
    }(),


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
    getNickName: function () {
        var _ref8 = _asyncToGenerator(regeneratorRuntime.mark(function _callee9(userName) {
            return regeneratorRuntime.wrap(function _callee9$(_context9) {
                while (1) {
                    switch (_context9.prev = _context9.next) {
                        case 0:
                            _context9.next = 2;
                            return this.getUserInfo(userName).NickName;

                        case 2:
                            return _context9.abrupt('return', _context9.sent);

                        case 3:
                        case 'end':
                            return _context9.stop();
                    }
                }
            }, _callee9, this);
        }));

        function getNickName(_x8) {
            return _ref8.apply(this, arguments);
        }

        return getNickName;
    }(),


    // 获取联系人列表
    getContact: function () {
        var _ref9 = _asyncToGenerator(regeneratorRuntime.mark(function _callee10() {
            var data, chatRooms;
            return regeneratorRuntime.wrap(function _callee10$(_context10) {
                while (1) {
                    switch (_context10.prev = _context10.next) {
                        case 0:
                            if (!(config.MemberList.length > 0)) {
                                _context10.next = 2;
                                break;
                            }

                            return _context10.abrupt('return', config.MemberList);

                        case 2:
                            _context10.next = 4;
                            return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetcontact?r=' + new Date().getTime() + '&pass_ticket=' + config.pass_ticket + '&seq=0&skey=' + config.skey, { json: true, followRedirect: false, jar: jar });

                        case 4:
                            data = _context10.sent;

                            config.MemberList = data.body.MemberList;
                            chatRooms = [];

                            config.MemberList.map(function (item) {
                                if (item.UserName.indexOf('@@') > -1) {
                                    chatRooms.push({
                                        ChatRoomId: '',
                                        UserName: item.UserName
                                    });
                                }
                            });
                            _context10.next = 10;
                            return this.getGroupInfo(chatRooms);

                        case 10:
                            return _context10.abrupt('return', config.MemberList);

                        case 11:
                        case 'end':
                            return _context10.stop();
                    }
                }
            }, _callee10, this);
        }));

        function getContact() {
            return _ref9.apply(this, arguments);
        }

        return getContact;
    }(),


    // 获取群聊信息
    getGroupInfo: function () {
        var _ref10 = _asyncToGenerator(regeneratorRuntime.mark(function _callee11(userName) {
            var GroupInfo, data;
            return regeneratorRuntime.wrap(function _callee11$(_context11) {
                while (1) {
                    switch (_context11.prev = _context11.next) {
                        case 0:
                            _context11.next = 2;
                            return this.getUserInfo(userName);

                        case 2:
                            GroupInfo = _context11.sent;

                            if (!GroupInfo) {
                                _context11.next = 5;
                                break;
                            }

                            return _context11.abrupt('return', GroupInfo);

                        case 5:
                            _context11.next = 7;
                            return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxbatchgetcontact?lang=zh_CNtype=ex&r=' + new Date().getTime(), {
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
                                    List: userName instanceof Array ? userName : [{
                                        ChatRoomId: '',
                                        UserName: userName
                                    }]
                                }
                            });

                        case 7:
                            data = _context11.sent;

                            if (data.body.Count > 0) {
                                data.body.ContactList.map(function (item) {
                                    var flag = false;
                                    config.chatRoomList.map(function (j) {
                                        if (j.UserName === item.UserName) {
                                            flag = true;
                                        }
                                    });
                                    if (!flag) {
                                        config.chatRoomList.push(item);
                                    }
                                });
                            }
                            return _context11.abrupt('return', userName instanceof Array ? data.body.ContactList : data.body.ContactList[0]);

                        case 10:
                        case 'end':
                            return _context11.stop();
                    }
                }
            }, _callee11, this);
        }));

        function getGroupInfo(_x9) {
            return _ref10.apply(this, arguments);
        }

        return getGroupInfo;
    }(),


    // 拉取最新消息
    pullReceve: function () {
        var _ref11 = _asyncToGenerator(regeneratorRuntime.mark(function _callee13() {
            var data;
            return regeneratorRuntime.wrap(function _callee13$(_context13) {
                while (1) {
                    switch (_context13.prev = _context13.next) {
                        case 0:
                            _context13.next = 2;
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
                            data = _context13.sent;

                            config.SyncKey = data.body.SyncKey;

                            data.body.AddMsgList.map(function () {
                                var _ref12 = _asyncToGenerator(regeneratorRuntime.mark(function _callee12(item) {
                                    var filter;
                                    return regeneratorRuntime.wrap(function _callee12$(_context12) {
                                        while (1) {
                                            switch (_context12.prev = _context12.next) {
                                                case 0:
                                                    _context12.next = 2;
                                                    return MsgFilter(item, config);

                                                case 2:
                                                    filter = _context12.sent;

                                                    filter.type !== 'Miss' ? wxEvent.emit('message', filter) : 0;

                                                case 4:
                                                case 'end':
                                                    return _context12.stop();
                                            }
                                        }
                                    }, _callee12, undefined);
                                }));

                                return function (_x10) {
                                    return _ref12.apply(this, arguments);
                                };
                            }());

                            return _context13.abrupt('return', {
                                count: data.body.AddMsgCount,
                                Msgs: data.body.AddMsgList
                            });

                        case 6:
                        case 'end':
                            return _context13.stop();
                    }
                }
            }, _callee13, undefined);
        }));

        function pullReceve() {
            return _ref11.apply(this, arguments);
        }

        return pullReceve;
    }(),

    // 检查是否有新消息
    syncCheck: function () {
        var _ref13 = _asyncToGenerator(regeneratorRuntime.mark(function _callee14() {
            var url, data;
            return regeneratorRuntime.wrap(function _callee14$(_context14) {
                while (1) {
                    switch (_context14.prev = _context14.next) {
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

                            _context14.next = 3;
                            return fetch(url, { json: true, followRedirect: false, jar: jar });

                        case 3:
                            data = _context14.sent;

                            eval(data.body);
                            return _context14.abrupt('return', window.synccheck.retcode === '0' && window.synccheck.selector != '0');

                        case 6:
                        case 'end':
                            return _context14.stop();
                    }
                }
            }, _callee14, undefined);
        }));

        function syncCheck() {
            return _ref13.apply(this, arguments);
        }

        return syncCheck;
    }(),

    // 消息进程
    MsgServer: function () {
        var _ref14 = _asyncToGenerator(regeneratorRuntime.mark(function _callee15() {
            var newMsg;
            return regeneratorRuntime.wrap(function _callee15$(_context15) {
                while (1) {
                    switch (_context15.prev = _context15.next) {
                        case 0:
                            if (!true) {
                                _context15.next = 9;
                                break;
                            }

                            _context15.next = 3;
                            return this.syncCheck();

                        case 3:
                            newMsg = _context15.sent;

                            if (!newMsg) {
                                _context15.next = 7;
                                break;
                            }

                            _context15.next = 7;
                            return this.pullReceve();

                        case 7:
                            _context15.next = 0;
                            break;

                        case 9:
                        case 'end':
                            return _context15.stop();
                    }
                }
            }, _callee15, this);
        }));

        function MsgServer() {
            return _ref14.apply(this, arguments);
        }

        return MsgServer;
    }(),


    /**
    *
    获取cookie字符串
    *
    @method getCookie
    *
    @return {String} 返回cookie的String字符串
    */
    getCookie: function getCookie() {
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
    setCookie: function setCookie(cookieString) {
        var cookies = cookieString.trim().split(';');
        JCookie = {};
        cookies.map(function (item) {
            var trimitem = item.trim();
            JCookie[trimitem.substring(0, trimitem.indexOf('='))] = trimitem.substring(trimitem.indexOf('=') + 1);
        });
        for (var i = 0; i < cookies.length; ++i) {
            jar.setCookie(cookies[i].trim(), 'https://wx.qq.com');
            jar.setCookie(cookies[i].trim(), 'https://webpush.wx.qq.com');
        }
    },


    // ### 发送消息
    // Type: 消息类型
    // LocalID: 
    // ClientMsgId: 
    sendMsg: function () {
        var _ref15 = _asyncToGenerator(regeneratorRuntime.mark(function _callee16(FromUserName, ToUserName, Content) {
            var url, timeStamp, data;
            return regeneratorRuntime.wrap(function _callee16$(_context16) {
                while (1) {
                    switch (_context16.prev = _context16.next) {
                        case 0:
                            url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsendmsg' + '?pass_ticket=' + config.pass_ticket;
                            timeStamp = new Date().getTime();
                            _context16.next = 4;
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
                            data = _context16.sent;
                            return _context16.abrupt('return', data.body.BaseResponse.Ret === 0);

                        case 6:
                        case 'end':
                            return _context16.stop();
                    }
                }
            }, _callee16, undefined);
        }));

        function sendMsg(_x11, _x12, _x13) {
            return _ref15.apply(this, arguments);
        }

        return sendMsg;
    }(),

    /**
    *
    全局配置
    *
    @method config
    *
    @param {Object} [options={}] 配置
    */
    config: function config(options) {
        autoLogin = options.autoLogin || true;
        openBrowser = options.openBrowser || false;
        options.cookie ? this.setCookie(options.cookie) : 0;
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
    createChatroom: function () {
        var _ref16 = _asyncToGenerator(regeneratorRuntime.mark(function _callee17(memberList, Topic) {
            var data;
            return regeneratorRuntime.wrap(function _callee17$(_context17) {
                while (1) {
                    switch (_context17.prev = _context17.next) {
                        case 0:
                            _context17.next = 2;
                            return fetch('https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxcreatechatroom?pass_ticket=' + config.pass_ticket + '&r=' + new Date().getTime(), {
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
                                    Topic: Topic || ''
                                }
                            });

                        case 2:
                            data = _context17.sent;
                            return _context17.abrupt('return', {
                                status: data.body.MemberCount > 0,
                                error: data.body.BaseResponse.ErrMsg
                            });

                        case 4:
                        case 'end':
                            return _context17.stop();
                    }
                }
            }, _callee17, this);
        }));

        function createChatroom(_x14, _x15) {
            return _ref16.apply(this, arguments);
        }

        return createChatroom;
    }(),


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
    renameChatroom: function () {
        var _ref17 = _asyncToGenerator(regeneratorRuntime.mark(function _callee18(ChatRoomName, NewTopic) {
            var url, data;
            return regeneratorRuntime.wrap(function _callee18$(_context18) {
                while (1) {
                    switch (_context18.prev = _context18.next) {
                        case 0:
                            url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxupdatechatroom?fun=modtopic';
                            _context18.next = 3;
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
                                    ChatRoomName: ChatRoomName,
                                    NewTopic: NewTopic
                                }
                            });

                        case 3:
                            data = _context18.sent;
                            return _context18.abrupt('return', data.body.BaseResponse.ErrMsg === '' && data.body.BaseResponse.Ret === 0);

                        case 5:
                        case 'end':
                            return _context18.stop();
                    }
                }
            }, _callee18, this);
        }));

        function renameChatroom(_x16, _x17) {
            return _ref17.apply(this, arguments);
        }

        return renameChatroom;
    }(),


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
    addMemberFromChatroom: function () {
        var _ref18 = _asyncToGenerator(regeneratorRuntime.mark(function _callee19(ChatRoomName, userName) {
            var url, data;
            return regeneratorRuntime.wrap(function _callee19$(_context19) {
                while (1) {
                    switch (_context19.prev = _context19.next) {
                        case 0:
                            url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxupdatechatroom?fun=addmember';
                            _context19.next = 3;
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
                                    ChatRoomName: ChatRoomName,
                                    AddMemberList: userName
                                }
                            });

                        case 3:
                            data = _context19.sent;
                            return _context19.abrupt('return', data.body.BaseResponse.ErrMsg === '' && data.body.BaseResponse.Ret === 0);

                        case 5:
                        case 'end':
                            return _context19.stop();
                    }
                }
            }, _callee19, this);
        }));

        function addMemberFromChatroom(_x18, _x19) {
            return _ref18.apply(this, arguments);
        }

        return addMemberFromChatroom;
    }(),


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
    deleteMemberFromChatroom: function () {
        var _ref19 = _asyncToGenerator(regeneratorRuntime.mark(function _callee20(ChatRoomName, userName) {
            var url, data;
            return regeneratorRuntime.wrap(function _callee20$(_context20) {
                while (1) {
                    switch (_context20.prev = _context20.next) {
                        case 0:
                            url = 'https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxupdatechatroom?fun=delmember';
                            _context20.next = 3;
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
                                    ChatRoomName: ChatRoomName,
                                    DelMemberList: userName
                                }
                            });

                        case 3:
                            data = _context20.sent;
                            return _context20.abrupt('return', data.body.BaseResponse.ErrMsg === '' && data.body.BaseResponse.Ret === 0);

                        case 5:
                        case 'end':
                            return _context20.stop();
                    }
                }
            }, _callee20, this);
        }));

        function deleteMemberFromChatroom(_x20, _x21) {
            return _ref19.apply(this, arguments);
        }

        return deleteMemberFromChatroom;
    }(),
    run: function () {
        var _ref20 = _asyncToGenerator(regeneratorRuntime.mark(function _callee21(cb) {
            var loginInfo, url;
            return regeneratorRuntime.wrap(function _callee21$(_context21) {
                while (1) {
                    switch (_context21.prev = _context21.next) {
                        case 0:
                            _context21.next = 2;
                            return this.login();

                        case 2:
                            loginInfo = _context21.sent;
                            _context21.next = 5;
                            return this.__checkCookie();

                        case 5:
                            if (_context21.sent) {
                                _context21.next = 11;
                                break;
                            }

                            url = 'https://login.weixin.qq.com/l/' + loginInfo.uuid;

                            console.log('获取登录二维码:', 'https://login.weixin.qq.com/qrcode/' + loginInfo.uuid);
                            openBrowser ? open('https://login.weixin.qq.com/qrcode/' + loginInfo.uuid) : qrcode.generate(url);
                            _context21.next = 12;
                            break;

                        case 11:
                            console.log('使用cookie自动登录!');

                        case 12:
                            _context21.next = 14;
                            return this.check_login(loginInfo.uuid);

                        case 14:
                            _context21.next = 16;
                            return this.getOwnerInfo();

                        case 16:
                            _context21.next = 18;
                            return this.getContact();

                        case 18:
                            console.log('登录成功,启动消息服务');
                            this.MsgServer(); // 监听消息
                            cb && cb();

                        case 21:
                        case 'end':
                            return _context21.stop();
                    }
                }
            }, _callee21, this);
        }));

        function run(_x22) {
            return _ref20.apply(this, arguments);
        }

        return run;
    }(),


    getConfig: function getConfig() {
        return config;
    },

    listener: wxEvent
};