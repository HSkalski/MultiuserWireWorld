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
var IDS = [];
var NAMES = [];

var WIDTH = 1000;
var HEIGHT = 600;
var MAX_WIDTH = 5000;
var MAX_HEIGHT = 5000;
var MAX_NAME = 20;
var cellSize = 20;

var startBoards = (boards) => {
    for (id in boards) {
        startBoard(boards[it])
    }
}

var startBoard = (board) => {
    board.logicFunction = () =>{
        board.logicInterval = setInterval(function () {
            //console.log(boards[id]);
            board.update();
        }, 1000 / board.tickSpeed)
    }
    board.logicFunction
}

var createBoard = function (n, h, w, cs) {
    
    newBoard = new Board(n, h, w, cs);
    BOARD_LIST[newBoard.id] = newBoard;

    startBoard(BOARD_LIST[newBoard.id])

    return newBoard.id;
}


defaultBoardID = createBoard('Default', HEIGHT, WIDTH, cellSize);

BOARD_LIST[defaultBoardID].grid[10][10] = 1;
BOARD_LIST[defaultBoardID].grid[10][11] = 1;
BOARD_LIST[defaultBoardID].grid[10][12] = 2;
BOARD_LIST[defaultBoardID].grid[10][13] = 3;
BOARD_LIST[defaultBoardID].grid[9][14] = 1;
BOARD_LIST[defaultBoardID].grid[9][9] = 1;
BOARD_LIST[defaultBoardID].grid[8][10] = 1;
BOARD_LIST[defaultBoardID].grid[8][11] = 1;
BOARD_LIST[defaultBoardID].grid[8][12] = 1;
BOARD_LIST[defaultBoardID].grid[8][13] = 1;


// Saves the current boards to /boards/board_<ID>
var saveAllBoards = () => {
    for (id in BOARD_LIST) {
        saveBoard(id)
    }
}

// Strip board of connected users before saving to file
var saveBoard = (id) => {
    var clone = Object.assign({}, BOARD_LIST[id]);
    delete clone.CONNECTED_SOCKETS;
    fs.writeFile(
        "./boards/board_" + String(id) + ".txt",
        
        JSON.stringify(clone),
        (err) => {
            // In case of a error throw err. 
            if (err) throw err;
        }
    );
}

// Loads boards from /boards directory
var loadBoards = () => {
    console.log('Loading Files...')
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
                        var board = new Board('', 1, 1, 1);
                        var parsedData = JSON.parse(data);
                        Object.assign(board, parsedData)
                        BOARD_LIST[board.id] = board;
                        BOARD_LIST[board.id].paused = true;
                        startBoard(BOARD_LIST[board.id]);
                    }
                )
            }
                    
        }
    )
}
loadBoards();

var sendBoards = () => {
    console.log(NAMES)
    for(var i in BOARD_LIST){
        var board = BOARD_LIST[i]
        for(id in board.CONNECTED_SOCKETS){
            var socket = board.CONNECTED_SOCKETS[id];
            socket.emit(('initData'), {
                w: BOARD_LIST[socket.boardID].width,
                h: BOARD_LIST[socket.boardID].height,
                cs: BOARD_LIST[socket.boardID].cellSize,
                board: BOARD_LIST[socket.boardID].grid,
                all_board_ids: IDS,
                all_board_names: NAMES,
                curr_id: socket.boardID
            })
        }
    }
}

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
    BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id] = socket;
    console.log('-----------------------------')
    console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);
    console.log('Board_List length: ', Object.keys(BOARD_LIST).length);
    console.log('----------------------------')
    
    IDS = Object.keys(BOARD_LIST);
    NAMES = [];
    for(id in IDS){
        NAMES.push(BOARD_LIST[IDS[id]].name);
    }
    socket.emit('initData', {
        w: BOARD_LIST[socket.boardID].width,
        h: BOARD_LIST[socket.boardID].height,
        cs: BOARD_LIST[socket.boardID].cellSize,
        board: BOARD_LIST[socket.boardID].grid,
        all_board_ids: IDS,
        all_board_names: NAMES,
        curr_id: socket.boardID
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

    socket.on('changeBoard', function (data){
        delete BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id];
        //Check if board just left is empty, pause if it is
        if(Object.keys(BOARD_LIST[socket.boardID].CONNECTED_SOCKETS).length == 0){
            BOARD_LIST[socket.boardID].paused = true;
        }
        socket.boardID = data.id;
        BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id] = socket; 
        socket.emit(('initData'), {
            w: BOARD_LIST[socket.boardID].width,
            h: BOARD_LIST[socket.boardID].height,
            cs: BOARD_LIST[socket.boardID].cellSize,
            board: BOARD_LIST[socket.boardID].grid,
            all_board_ids: IDS,
            all_board_names: NAMES,
            curr_id: socket.boardID,
        })
    })

    socket.on('saveBoard', function(data){
        console.log("SAVING BOARD ",socket.boardID,"...")
        saveBoard(socket.boardID);
    })

    // Breaks logic on default board when new board is created
    socket.on('newBoard', function(data){
        let h = data.height;
        let w = data.width;
        let n = data.name;
        if(h > MAX_HEIGHT){
            h = MAX_HEIGHT;
        }
        if(w > MAX_WIDTH){
            w = MAX_WIDTH;
        }
        if(n.length > MAX_NAME){
            n = n.substring(0,MAX_NAME);
        }
        nBid = createBoard(n, h, w, cellSize);
        IDS = Object.keys(BOARD_LIST);
        NAMES.push(n);
        sendBoards();
        //startBoard(BOARD_LIST[socket.boardID])
    })


    socket.on('disconnect', function () {
        delete BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id]
        delete SOCKET_LIST[socket.id];
        console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);
    })
});

// Send correct board states to clients
setInterval(function () {
    for(var i in BOARD_LIST){
        var board = BOARD_LIST[i]
        for(id in board.CONNECTED_SOCKETS){
            var socket = board.CONNECTED_SOCKETS[id];
            socket.emit('boardData', {
                board: BOARD_LIST[socket.boardID].grid,
                speed: (BOARD_LIST[socket.boardID].tickSpeed / BOARD_LIST[socket.boardID].tickReductionRatio)
            })
        }
    }
}, 1000 / 24)


