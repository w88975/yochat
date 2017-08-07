var yoChat = require('./src/index')
var yo = new yoChat()

// yo.use(require('./src/plugin/userinfo'))
yo.use(require('./src/plugin/msg'))
yo.use(require('./src/plugin/member'))
yo.login(async (yo) => {
    console.log(yo.event)
    yo.event.on('message',function(){
        console.log('新消息')
    })
})