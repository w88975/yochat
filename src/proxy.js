const request = require('./request').request;
var jar = require('./request').jar;
const http = require("http");
const config = require('./config');

http.createServer((req, res) => {
    if (/\/wximg\/\d/.test(req.url)) {
        var MsgId = req.url.replace(/(?:\/wximg\/)(.*)(?:.*)/, '$1')
        var url = `https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetmsgimg?&MsgID=${MsgId}&skey=${config.skey}`;
        request({
            url,
            method: 'get',
            jar: jar,
            json: true,
            followRedirect: false,
        }).pipe(res)
    } else {
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.write('错误的图片id')
        res.end()
    }
}).listen(6766);
