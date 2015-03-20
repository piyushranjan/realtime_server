module.exports = {
  loadSocketIo: function loadSocketIo(redis) {
    var port = process.env.REALTIME_SERVER_PORT || 4000;
    console.log('STARTING ON PORT: ' + port);

    var io = require('socket.io').listen(Number(port));
    io.on('connection', function(socket) {
      socket.on('realtime_user_id_connected', function(message) {
        console.log('Realtime User ID connected: ' + message.userId);
      });

      socket.on('disconnect', function(socket){
        console.log("Disconnection");
        if(false){
          redis.pub.quit();
          redis.sub.quit();
          redis.getSet.quit();
        }
      });

      redis.sub.on('message', function(channel, message) {
        if (socket.request === undefined) {
          return;
        }
        var msg = JSON.parse(message);
        socket.emit('realtime_msg', msg);
      });
    });

    return io;
},

authorize: function authorize(io, redis) {
  io.use(function(socket, next) {
    var sessionId = null;
    var userId = null;

    var url = require('url');
    requestUrl = url.parse(socket.request.url);
    requestQuery = requestUrl.query;
    requestParams = requestQuery.split('&');
    params = {};
    for (i=0; i<=requestParams.length; i++){
      param = requestParams[i];
      if (param){
        var p=param.split('=');
        if (p.length != 2) { continue };
        params[p[0]] = p[1];
      }
    }

    sessionId = params["_rtToken"];
    userId = params["_rtUserId"];

    // retrieve session from redis using the unique key stored in cookies
    redis.getSet.hget([("rtSession-" + userId), sessionId],
                      function(err, session) {
                        if (err || !session) {
                          next(new Error('Unauthorized Realtime user (session)'));
                        } else {
                          socket.request.session = JSON.parse(session);
                          next();
                        }
                      }
                     );
  });
},

loadRedis: function loadRedis() {
  var redis = require('redis');
  var url = require('url');
  var redisURL = url.parse("redis://127.0.0.1:6379/0");
  var redisSub, redisPub, redisGetSet = null;

  redisSub = redis.createClient();
  redisPub = redis.createClient();
  redisGetSet = redis.createClient();
  redisSub.subscribe('realtime_msg');

  return {
    pub: redisPub,
    sub: redisSub,
    getSet: redisGetSet
  };
},
}
