var WebSocketServer = require('ws').Server, wss = new WebSocketServer({ port: 11001 });

wss.on('connection', function connection(ws) {
  console.log("Got connection");
  var redis = loadRedis();
  var callback = function(channel, message) {
    var msg = '{\"realtime_msg\": ' + message + '}';
    ws.send(msg);
  }
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    redis.getSet.hget(["realtime_user", message], function(err, session) {
      if (err || !session) {
        next(new Error('Unauthorized Realtime user (session)'));
      } else {
        console.log("Auth happened for %s", session);
        redis.sub.on('message', callback);
      }
    });
  });
  ws.on('close', function close() {
    console.log("Closing connection");
    redis.sub.removeListener('message', callback);
    redis.sub.quit();
    redis.getSet.quit();
  });
  ws.on('error', function close() {
    console.log("Error on connection");
    redis.sub.removeListener('message', callback);
    redis.sub.quit();
    redis.getSet.quit();
  });
});


loadRedis: function loadRedis() {
  var redis = require('redis');
  var url = require('url');
  var redisURL = url.parse("redis://127.0.0.1:6379/0");
  var redisSub, redisPub, redisGetSet = null;

  redisSub = redis.createClient();
  redisGetSet = redis.createClient();
  redisSub.setMaxListeners(100);
  redisSub.subscribe('realtime_msg');

  return {
    sub: redisSub,
    getSet: redisGetSet
  };
}
