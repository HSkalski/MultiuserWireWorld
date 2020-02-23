var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
})
app.use('/assets', express.static(__dirname+'/assets'));
var PORT = 2000;
http.listen(PORT);
console.log("Server started on port ",PORT);

var width = 1000;
var height = 500;
var cellSize = 20;

var board = new Array(height/cellSize).fill(0);
console.log("Board Height: ", board.length)
for(var i = 0; i < height/cellSize; i++){
    board[i] = new Array(width/cellSize).fill(0);
}
console.log("Board Width: ", board[0].length)

board[10][10] = 1;
board[10][11] = 1;
board[11][11] = 1;

var SOCKET_LIST = {};

io.on('connection', function(socket){
    console.log('user connection established');
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.emit('boardData',{
        board:board
    })

    socket.on('click', function(data){
        board[data.y][data.x] = data.tool;
        console.log(data);
        socket.emit('boardData',{
            board:board
        })
    })
});


setInterval(function(){
    for( var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('boardData',{
            board:board
        })
    }
}, 1000/10)
