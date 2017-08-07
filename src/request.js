var request = require('request').defaults({ jar: true });
var jar = request.jar();
module.exports = {
    request,
    jar: jar
}