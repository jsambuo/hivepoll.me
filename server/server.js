var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var multer = require('multer');
var crypto = require('crypto');

function random (howMany, chars) {
    chars = chars
        || "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
    var rnd = crypto.randomBytes(howMany)
        , value = new Array(howMany)
        , len = chars.length;

    for (var i = 0; i < howMany; i++) {
        value[i] = chars[rnd[i] % len]
    };

    return value.join('');
}

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

app.use(express.static(__dirname + '/public'));
server.listen(process.env.PORT || 8080);

app.post('/poll', function (req, res) {
  //TODO: make sure poll is valid
  var ids = createPoll(req.body);
  console.log("created poll " + ids.pollId);
  console.log(req.body);
  res.json(ids);
});

app.get('/poll/:pollId', function (req, res) {
  var pollId = req.param("pollId");
  var poll = polls[pollId];
  if (poll) {
    res.json(poll);
  } else {
    res.status(404)        // HTTP status 404: NotFound
       .send('Not found');
  }
});

app.get('/:pollId', function (req, res) {
  var pollId = req.param("pollId");
  //check if id is presenter
  var presentorArr = Object.keys(presentorIds);
  if (presentorArr.indexOf(pollId) > -1) {
    res.redirect('/presentor.html?pollId=' + presentorIds[pollId]);
  } else {
    res.redirect('/audience.html?pollId=' + pollId);
  }
});

app.get('/:pollId/disp', function (req, res) {
  var pollId = req.param("pollId");
  res.redirect('/display.html?pollId=' + pollId);
});

app.get('/rand', function (req, res) {
  var num = random(6);
  res.send(num);
});

io.on('connection', function (socket) {
  console.log('someone connected');

  socket.on('display-question', function(room, question) {
    // send the question to everyone
    io.to(room).emit('question-loaded', question);
  });

  socket.on('answer-question', function(room, answer) {
    // socket answered question

    // let everyone else know the socket is answering the question
    var socketId = socket.id;
    io.to(room).emit('answer', answer);
  });

  socket.on('end-session', function(room) {
    // tell everyone in the room the session ended
    io.to(room).emit('session-ended');
  });

  socket.on('join-room', function(room) {
    socket.join(room);

    // notify people in the room
    var connectedClients = io.sockets.adapter.rooms[room];
    var numClients = Object.keys(connectedClients).length;
    console.log("Clients connected to " + room + ": " + numClients);
    io.to(room).emit('connections updated', numClients);
  });

  socket.on('disconnect', function(){
    // alert all rooms the socket was connected to
    console.log('user disconnecting');

    var rooms = Object.keys(socket.adapter.rooms);
    rooms.forEach(function(room){
      // notify people in the room
      var connectedClients = io.sockets.adapter.rooms[room];
      var numClients = Object.keys(connectedClients).length;
      console.log("Clients connected to " + room + ": " + numClients);
      io.to(room).emit('connections updated', numClients);
    });
  });

});

// Persistence layer
var polls = {};
var presentorIds = {};
function createPoll(poll) {
  var presentorId = random(6);
  poll.id = random(6);

  presentorIds[presentorId] = poll.id;

  polls[poll.id] = poll;

  return {
    pollId: poll.id,
    presentorId: presentorId
  };
};
