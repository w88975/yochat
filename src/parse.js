const _parseString = require('xml2js').parseString

var parseString = (str) => {
    return new Promise((res, rej) => {
        _parseString(str, (err, result) => {
            if (err) {
                rej(err)
            } else {
                res(result)
            }
        })
    })
}

function escape2Html(str) {
    var arrEntities = { 'lt': '<', 'gt': '>', 'nbsp': ' ', 'amp': '&', 'quot': '"' };
    return str.replace(/&(lt|gt|nbsp|amp|quot);/ig, function (all, t) { return arrEntities[t]; });
}


module.exports = {
    async parseContent(item) {
        var _CONTENT = this.emojiParser(item).replace(/<br\/>/g, '\n');;
        var TYPE = '',
            CONTENT;
        switch (item.MsgType) {
            case 1:
                TYPE = 'Text'
                CONTENT = _CONTENT;
                break;
            case 3:
                TYPE = 'Picture'
                // &type=slave 缩略图
                var url = `http://127.0.0.1:6766/wximg/${item.MsgId}`;
                CONTENT = url;
                break;
            case 47:
                TYPE = 'EMOJI'
                if (!_CONTENT) {
                    CONTENT = '[发送了一个表情，请在手机上查看]'
                    break;
                }
                _CONTENT = _CONTENT.replace(/ /g, '').replace(/\n/g, '').replace(/\r\n/g, '')
                CONTENT = _CONTENT.match(/(?:cdnurl=")(.*)(?:"designerid)/)[1];
                break;
            case 42:
                TYPE = 'NameCard'
                let result = await parseString(escape2Html(_CONTENT))
                CONTENT = result.msg.$;
                break;
            case 42:
                TYPE = 'Video'
                break;
            case 49:
                TYPE = 'Link'
                break;
            case 62:
                TYPE = 'Video'
                break;
            case 51:
                TYPE = 'Miss'
                break;
        }

        return {
            TYPE,
            CONTENT
        }
    },

    emojiParser: (item) => {
        var _str = item.Content;
        var regExp = /<span class="emoji emoji(\w*\d*|\d*\w*)"><\/span>/g;
        var replaceExp = /(?:<span class="emoji emoji)(\w*\d*|\d*\w*)(?:"><\/span>)/;
        function findSurrogatePair(point) {
            var offset = point - 0x10000,
                lead = 0xd800 + (offset >> 10),
                trail = 0xdc00 + (offset & 0x3ff);
            return ['0x' + lead.toString(16), '0x' + trail.toString(16)];
        }
        var emojiCodes = _str.match(regExp)
        if (emojiCodes && emojiCodes.length > 0) {
            emojiCodes.map(item => {
                var code = item.replace(replaceExp, '$1')
                _str = _str.replace(item, code.length === 4 ? String.fromCharCode(`0x${code}`) : String.fromCharCode(...findSurrogatePair(`0x${code}`)), 'g')
            })
        }
        return _str;
    }
}