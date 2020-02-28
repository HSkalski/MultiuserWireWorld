var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var Board = require('./board.js');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
})
app.use('/assets', express.static(__dirname + '/assets'));
var PORT = 2000;
http.listen(PORT);
console.log("Server started on port ", PORT);

var SOCKET_LIST = {};
var BOARD_LIST = {};

var WIDTH = 1000;
var HEIGHT = 600;
var cellSize = 20;
var defaultBoard;

var startBoards = (boards) => {
    for (id in boards) {
        startBoard(boards[it])
    }
}

var startBoard = (board) => {
    setInterval(function () {
        //console.log(boards[id]);
        board.update();
    }, 1000 / 5)
}

var createBoard = function (n, h, w, cs) {
    newBoard = new Board(n, h, w, cs);
    BOARD_LIST[newBoard.id] = newBoard;

    setInterval(function () {
        BOARD_LIST[newBoard.id].update();
    }, 1000 / 5)

    return newBoard.id;
}


// defaultBoardID = createBoard('Default', HEIGHT, WIDTH, cellSize);

// BOARD_LIST[defaultBoardID].grid[10][10] = 1;
// BOARD_LIST[defaultBoardID].grid[10][11] = 1;
// BOARD_LIST[defaultBoardID].grid[10][12] = 2;
// BOARD_LIST[defaultBoardID].grid[10][13] = 3;
// BOARD_LIST[defaultBoardID].grid[9][14] = 1;
// BOARD_LIST[defaultBoardID].grid[9][9] = 1;
// BOARD_LIST[defaultBoardID].grid[8][10] = 1;
// BOARD_LIST[defaultBoardID].grid[8][11] = 1;
// BOARD_LIST[defaultBoardID].grid[8][12] = 1;
// BOARD_LIST[defaultBoardID].grid[8][13] = 1;


// Saves the current boards to /boards/board_<ID>
var saveBoards = () => {
    for (id in BOARD_LIST) {
        fs.writeFile(
            "./boards/board_" + String(id) + ".txt",
            JSON.stringify(BOARD_LIST[id]),
            (err) => {
                // In case of a error throw err. 
                if (err) throw err;
            }
        );
    }
}

// Loads boards from /boards directory
var loadBoards = () => {
    fs.readdir(
        './boards',
        (err, files) => {
            if (err) throw err;
            console.log("\t",files);
            for (file in files) {
                fs.readFile(
                    "./boards/" + files[file],
                    (err, data) => {
                        if (err) throw err;
                        console.log("Loading...:  ./boards/" + files[file]);
                        var board = new Board('', 1, 1, 1);
                        var parsedData = JSON.parse(data);
                        Object.assign(board, parsedData)
                        BOARD_LIST[board.id] = board;
                        console.log("\tAdded Board, board_list: ", Object.keys(BOARD_LIST).length)
                        startBoard(BOARD_LIST[board.id]);
                    }
                )
            }
                    
        }
    )
}
loadBoards();

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})
var consoleInput = () => {
    readline.question(`---------------\n> `, (data) => {
        try {
            eval(data);
        } catch (err) {
            console.error(err);
        }
        consoleInput();
    })
}
consoleInput();

io.on('connection', function (socket) {
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
    socket.boardID = Object.keys(BOARD_LIST)[0];
    console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);
    console.log('Board_List length: ', Object.keys(BOARD_LIST).length)
    socket.emit('initData', {
        w: BOARD_LIST[socket.boardID].width,
        h: BOARD_LIST[socket.boardID].height,
        cs: BOARD_LIST[socket.boardID].cellSize,
        board: BOARD_LIST[socket.boardID].grid,
        all_boards: Object.keys(BOARD_LIST)
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
        //console.log(data.speed, " * ", BOARD_LIST[socket.boardID].tickRecutionRatio);
        BOARD_LIST[socket.boardID].tickSpeed = data.speed * BOARD_LIST[socket.boardID].tickReductionRatio;
        //console.log(BOARD_LIST[socket.boardID].tickSpeed);
        clearInterval(BOARD_LIST[socket.boardID].logicInterval);
        //logicFunction();
    })

    socket.on('disconnect', function () {
        delete SOCKET_LIST[socket.id];
        console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);
    })
});

// Send correct board states to clients
setInterval(function () {
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        //console.log(socket.boardID);
        socket.emit('boardData', {
            board: BOARD_LIST[socket.boardID].grid,
            speed: (BOARD_LIST[socket.boardID].tickSpeed / BOARD_LIST[socket.boardID].tickReductionRatio)
        })
    }
}, 1000 / 24)


