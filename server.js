var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


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


function Board(h, w, cs) {
    this.height = h;
    this.width = w;
    this.cellSize = cs;
    this.boardWidth = parseInt(w / cs);
    this.boardHeight = parseInt(h / cs);
    this.paused = false;
    this.tickSpeed = 10;
    this.logicInterval;
    this.tickRecutionRatio = 1 / 4;
    this.grid = new Array(this.boardHeight);
    console.log("Board Height: ", this.grid.length)
    for (var i = 0; i < this.height / this.cellSize; i++) {
        this.grid[i] = new Array(this.boardWidth).fill(0);
    }
    console.log("Board Width: ", this.grid[0].length);

    this.update = function(){

    }
}

var board = new Board(HEIGHT, WIDTH, cellSize);

board.grid[10][10] = 1;
board.grid[10][11] = 1;
board.grid[10][12] = 2;
board.grid[10][13] = 3;
board.grid[9][14] = 1;
board.grid[9][9] = 1;
board.grid[8][10] = 1;
board.grid[8][11] = 1;
board.grid[8][12] = 1;
board.grid[8][13] = 1;


var SOCKET_LIST = {};
var BOARD_LIST = {};

io.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);

    socket.emit('initData', {
        w: board.width,
        h: board.height,
        cs: board.cellSize,
        board: board.grid
    })

    socket.on('click', function (data) {
        if (data.y < board.grid.length && data.x < board.grid[0].length) {
            board.grid[data.y][data.x] = data.tool;
        }
        socket.emit('boardData', {
            board: board.grid
        })
    })

    socket.on('startStop', function (data) {
        if (data.data == 'start') {
            paused = false;
        }
        else if (data.data == 'stop') {
            paused = true;
        }

    })

    socket.on('speed', function (data) {
        board.tickSpeed = data.speed * board.tickReductionRatio;
        clearInterval(board.logicInterval);
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
            board: board.grid
        })
        socket.emit('speedData', {
            speed: (board.tickSpeed / board.tickReductionRatio)
        })
    }
}, 1000 / 24)

// Logic Function
/*
0 = empty
1 = wire
2 = electron head
3 = electron tail

Rules:
    1. empty: stays empty
    2. head: becomes tail
    3. tail: becomes copper
    4. copper: stays copper unless it has just one or two neighbours 
               that are electron heads, then it becomes a head
*/

var logicFunction = function () {
    board.logicInterval = setInterval(function () {
        if (!board.paused) {
            var boardCopy = arrayClone(board.grid);
            for (var y = 0; y < boardCopy.length; y++) {
                for (var x = 0; x < boardCopy[0].length; x++) {
                    if (boardCopy[y][x] == 2) {
                        board.grid[y][x] = 3;
                    }
                    else if (boardCopy[y][x] == 3) {
                        board.grid[y][x] = 1;
                    }
                    else if (boardCopy[y][x] == 1) {
                        nborType = getNeighbors(x, y, boardCopy);
                        var numHeads = 0;
                        for (var i = 0; i < nborType.length; i++) {
                            if (nborType[i] == 2) { // If neighbor is head
                                numHeads++;
                            }
                        }
                        if (numHeads > 0 && numHeads < 3) {
                            board.grid[y][x] = 2;
                        }
                    }
                }
            }
        }
    }, 1000 / board.tickSpeed);
}

logicFunction();

/*
Returns neighbors in this order: 
  7 0 4
  3 x 1
  6 2 5
*/
var getNeighbors = function (x, y, currBoard) {
    var nbors = new Array(8);
    if (y > 0)
        nbors[0] = currBoard[y - 1][x]
    if (x < board.boardWidth)
        nbors[1] = currBoard[y][x + 1]
    if (y < board.boardHeight)
        nbors[2] = currBoard[y + 1][x]
    if (x > 0)
        nbors[3] = currBoard[y][x - 1]
    if (x < board.boardWidth && y > 0)
        nbors[4] = currBoard[y - 1][x + 1]
    if (x < board.boardWidth && y < board.boardHeight)
        nbors[5] = currBoard[y + 1][x + 1]
    if (x > 0 && y < board.boardHeight)
        nbors[6] = currBoard[y + 1][x - 1]
    if (x > 0 && y > 0)
        nbors[7] = currBoard[y - 1][x - 1]
    return nbors;
}


function arrayClone(arr) {
    var i, copy;
    if (Array.isArray(arr)) {
        copy = arr.slice(0);
        for (i = 0; i < copy.length; i++) {
            copy[i] = arrayClone(copy[i]);
        }
        return copy;
    }
    else if (typeof arr === 'object') {
        throw 'Cannot clone array containing an object!';
    }
    else {
        return arr;
    }

}