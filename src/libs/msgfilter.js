module.exports = (item, config) => {
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
    return {
        fromUser: F_User, // 发送者
        toUser: T_User, // 接收者
        type: TYPE, // 消息类型
        msg: item.Content, // 消息内容
        originMsg: item // 原始消息内容
    }
}