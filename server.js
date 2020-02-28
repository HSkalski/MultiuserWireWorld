var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Board = require('./board.js')

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
})
app.use('/assets', express.static(__dirname + '/assets'));
var PORT = 2000;
http.listen(PORT);
console.log("Server started on port ", PORT);

var WIDTH = 1000;
var HEIGHT = 600;
var cellSize = 20;



var defaultBoard = new Board('Default', HEIGHT, WIDTH, cellSize);
defaultBoard.grid[10][10] = 1;
defaultBoard.grid[10][11] = 1;
defaultBoard.grid[10][12] = 2;
defaultBoard.grid[10][13] = 3;
defaultBoard.grid[9][14] = 1;
defaultBoard.grid[9][9] = 1;
defaultBoard.grid[8][10] = 1;
defaultBoard.grid[8][11] = 1;
defaultBoard.grid[8][12] = 1;
defaultBoard.grid[8][13] = 1;

var SOCKET_LIST = {};
var BOARD_LIST = {};
BOARD_LIST[defaultBoard.id] = defaultBoard;

io.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    socket.boardID = defaultBoard.id;
    console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);

    socket.emit('initData', {
        w: BOARD_LIST[socket.boardID].width,
        h: BOARD_LIST[socket.boardID].height,
        cs: BOARD_LIST[socket.boardID].cellSize,
        board: BOARD_LIST[socket.boardID].grid
    })

    socket.on('click', function (data) {
        if (data.y < BOARD_LIST[socket.boardID].grid.length && data.x < BOARD_LIST[socket.boardID].grid[0].length) {
            BOARD_LIST[socket.boardID].grid[data.y][data.x] = data.tool;
        }
        socket.emit('boardData', {
            board: BOARD_LIST[socket.boardID].grid
        })
    })

    socket.on('startStop', function (data) {
        if (data.data == 'start') {
            BOARD_LIST[socket.boardID].paused = false;
        }
        else if (data.data == 'stop') {
            BOARD_LIST[socket.boardID].paused = true;
        }

    })

    socket.on('speed', function (data) {
        console.log(data.speed, " * ", BOARD_LIST[socket.boardID].tickRecutionRatio);
        BOARD_LIST[socket.boardID].tickSpeed = data.speed * BOARD_LIST[socket.boardID].tickReductionRatio;
        console.log(BOARD_LIST[socket.boardID].tickSpeed);
        clearInterval(BOARD_LIST[socket.boardID].logicInterval);
        logicFunction();
    })

    socket.on('disconnect', function () {
        delete SOCKET_LIST[socket.id];
        console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);
    })
});

// Send boards
setInterval(function () {
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.emit('boardData', {
            board: BOARD_LIST[defaultBoard.id].grid
        })
        socket.emit('speedData', {
            speed: (BOARD_LIST[defaultBoard.id].tickSpeed / BOARD_LIST[defaultBoard.id].tickReductionRatio)
        })
    }
}, 1000 / 24)

// Update boards
for(board_id in BOARD_LIST){
    setInterval(function(){
        BOARD_LIST[board_id].update();
    },1000/5)
}

// var logicFunction = function () {
//     board.logicInterval = setInterval(function () {
//         board.update();
//     }, 1000 / 5); //board.tickSpeed);
// }

// logicFunction();
