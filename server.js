var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');

var fs = require('fs');
var Board = require('./board.js');

var runningLocal = true;
try{var config = require('./configs/keys.js')
}catch{console.log("Config not found"); runningLocal = false;}


// If config is found, it is a local version, else, use heroku env vars
if(runningLocal){
    mongoose.connect(config.mongodb.uri, {
        useNewUrlParser: true, 
        useUnifiedTopology: true
    });
}else if(typeof process.env.DATABASE_URL != 'undefined'){
    mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true, 
        useUnifiedTopology: true
    });
}else{
    console.log("not connecting to database");
}

var boardSchema = new mongoose.Schema({
    name: String,
    id: Number,
    height: Number,
    width: Number,
    cellSize: Number,
    tickSpeed: Number,
    tickReductionRatio: Number,
    grid: Array,
    compressedGrid: Object
});
var BoardModel = mongoose.model('BoardModel',boardSchema);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected To Database!')
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
})

app.use('/assets', express.static(__dirname + '/assets'));
var PORT = 2000;
http.listen(process.env.PORT || PORT);
console.log("Server started on port ", PORT);



var SOCKET_LIST = {};
var BOARD_LIST = {};
var IDS = [];
var NAMES = [];

var WIDTH = 25;
var HEIGHT = 25;
var MAX_WIDTH = 100;
var MAX_HEIGHT = 100;
var MAX_NAME = 20;
var cellSize = 15;




//start all boards
var startBoards = (boards) => {
    for (id in boards) {
        startBoard(boards[it])
    }
}
//Starts interval controlling logic. extra variables allow changing of tickspeed
var startBoard = (board) => {
    board.logicFunction = () =>{
        board.logicInterval = setInterval(function () {
            //console.log(board.compressedGrid)
            
            ///// Experimental board sending method /////
            /// Issues: 
            //     Doesn't send board updates when clicked, needs separate non updating function to recompute compressed data
            if(!board.paused){
                board.update();
                for(socket_id in board.CONNECTED_SOCKETS){
                    socket = board.CONNECTED_SOCKETS[socket_id];
                    socket.emit('boardData', {
                        compressedBoard: BOARD_LIST[socket.boardID].compressedGrid,
                        speed: (BOARD_LIST[socket.boardID].tickSpeed / BOARD_LIST[socket.boardID].tickReductionRatio),
                    })
                }
            }

        }, 1000 / board.tickSpeed)
    }
    board.logicFunction()
}

var createBoard = function (n, h, w, cs) {
    
    newBoard = new Board(n, h, w, cs);
    BOARD_LIST[newBoard.id] = newBoard;

    startBoard(BOARD_LIST[newBoard.id])

    return newBoard.id;
}

// Create default board with loop in it
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

// Saves the current boards to /boards/board_<ID> and database
var saveAllBoards = () => {
    for (id in BOARD_LIST) {
        saveBoard(id)
    }
}

//save individual board
var saveBoard = (id) => {
    ///////// Old board saving method ////////////////////
    // Strip board of specific data before saving to file
    // var clone = Object.assign({}, BOARD_LIST[id]);
    // delete clone.CONNECTED_SOCKETS;
    // delete clone.logicInterval;
    // console.log(clone);
    // fs.writeFile(
    //     "./boards/board_" + String(id) + ".txt",
        
    //     JSON.stringify(clone),
    //     (err) => {
    //         // In case of a error throw err. 
    //         if (err) throw err;
    //     }
    // );
    ///////////////////////////////////////////////////////

    BoardModel.findOneAndUpdate({id: id}, {
        tickSpeed: BOARD_LIST[id].tickSpeed,
        grid: BOARD_LIST[id].grid,
        compressedGrid:BOARD_LIST[id].compressedGrid
    },{useFindAndModify: false},function(err,doc){
        if(err){console.error(err)};

        if(doc == null){
            var save_board = new BoardModel({
                name: BOARD_LIST[id].name,
                id: BOARD_LIST[id].id,
                height: BOARD_LIST[id].height,
                width: BOARD_LIST[id].width,
                cellSize: BOARD_LIST[id].cellSize,
                tickSpeed: BOARD_LIST[id].tickSpeed,
                tickReductionRatio: BOARD_LIST[id].tickReductionRatio,
                grid: BOARD_LIST[id].grid,
                compressedGrid:BOARD_LIST[id].compressedGrid
            });
            //console.log(save_board);
            save_board.save(function (err, save_board){
                if(err) return console.error(err);
                console.log("Saved Board to Database");
            });
        }
        else{
            console.log("Updated Board in Database");
        }
    });


}

// Loads boards from /boards directory and database into BOARD_LIST
var loadBoards = () => {
    console.log('Loading Files...')
    ///////////////// Old File Loading Method //////////////
    // fs.readdir(
    //     './boards',
    //     (err, files) => {
    //         if (err) throw err;
    //         console.log("\t",files);
    //         for (file in files) {
    //             fs.readFile(
    //                 "./boards/" + files[file],
    //                 (err, data) => {
    //                     if (err) throw err;
    //                     var board = new Board('', 1, 1, 1);
    //                     var parsedData = JSON.parse(data);
    //                     Object.assign(board, parsedData)
    //                     BOARD_LIST[board.id] = board;
    //                     BOARD_LIST[board.id].paused = true;
    //                     startBoard(BOARD_LIST[board.id]);
    //                 }
    //             )
    //         }          
    //     }
    // )
    ///////////////////////////////////////////////////////

    BoardModel.find(function(err, boards){
        if (err) return console.error(err);
        for(var i = 0; i < boards.length; i++){
            var board = boards[i]
            var newBoard = new Board(board.name,board.height,board.width,board.cellSize);
            newBoard.id = board.id;
            newBoard.grid = board.grid;
            newBoard.compressedGrid = board.compressedGrid;
            newBoard.tickSpeed = board.tickSpeed;
            newBoard.tickReductionRatio = board.tickReductionRatio;
            BOARD_LIST[board.id] = newBoard;
            BOARD_LIST[board.id].paused = true;
            startBoard(BOARD_LIST[board.id]);
        }
        console.log("Boards Loaded!");
    });
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
                compressedBoard: BOARD_LIST[socket.boardID].compressedGrid,
                all_board_ids: IDS,
                all_board_names: NAMES,
                curr_id: socket.boardID
            })
        }
    }
}

/// DEBUG Console code !!Dangerous!! ///
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
/////////////////////////////////////////

// Main Client/Server interaction 
io.on('connection', function (socket) {
    socket.id = Math.random(); // Give user a random identifier
    SOCKET_LIST[socket.id] = socket; // Add to list 
    socket.boardID = Object.keys(BOARD_LIST)[0]; // Give them their starting board
    BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id] = socket; // Tell the board where they are
    console.log('-----------------------------')
    console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);
    console.log('Board_List length: ', Object.keys(BOARD_LIST).length);
    console.log('----------------------------')
    
    // List of ids and corresponding board names to keep track of
    IDS = Object.keys(BOARD_LIST);
    NAMES = [];
    for(id in IDS){
        NAMES.push(BOARD_LIST[IDS[id]].name);
    }
    socket.emit('changeUserCount',{ users: Object.keys(BOARD_LIST[socket.boardID].CONNECTED_SOCKETS).length})
    // Sends whole board with meta data
    socket.emit('initData', {
        w: BOARD_LIST[socket.boardID].width,
        h: BOARD_LIST[socket.boardID].height,
        cs: BOARD_LIST[socket.boardID].cellSize,
        compressedBoard: BOARD_LIST[socket.boardID].compressedGrid,
        all_board_ids: IDS,
        all_board_names: NAMES,
        curr_id: socket.boardID
    })

    // User clicked, change square and send back the new grid
    socket.on('click', function (data) {
        if (data.y < BOARD_LIST[socket.boardID].grid.length && data.x < BOARD_LIST[socket.boardID].grid[0].length) {
            BOARD_LIST[socket.boardID].grid[data.y][data.x] = data.tool;
        }
        //console.log(BOARD_LIST[socket.boardID].compressedGrid);
        BOARD_LIST[socket.boardID].buildCompressedGrid();
        for(s in BOARD_LIST[socket.boardID].CONNECTED_SOCKETS){
            SOCKET_LIST[s].emit('boardData', {
                compressedBoard: BOARD_LIST[socket.boardID].compressedGrid,
            })
        }
    })

    socket.on('paste', function(data){
        selGrid = data.selGrid;
        mousePos = data.mousePos;
        var toolNum = 1;
        for(tool in selGrid){
            len = selGrid[tool].x.length;
            for(var i =0; i < len; i++){
                if ((selGrid[tool].y[i]+mousePos.y-selGrid.wire.y[0]) < BOARD_LIST[socket.boardID].grid.length && (selGrid[tool].x[i]+mousePos.x-selGrid.wire.x[0]) < BOARD_LIST[socket.boardID].grid[0].length) {
                    BOARD_LIST[socket.boardID].grid[selGrid[tool].y[i]+mousePos.y-selGrid.wire.y[0]][selGrid[tool].x[i]+mousePos.x-selGrid.wire.x[0]] = toolNum;
                }
            }
            toolNum++;
        }
        BOARD_LIST[socket.boardID].buildCompressedGrid();
        for(s in BOARD_LIST[socket.boardID].CONNECTED_SOCKETS){
            SOCKET_LIST[s].emit('boardData', {
                compressedBoard: BOARD_LIST[socket.boardID].compressedGrid,
            })
        }
    })
    
    // User started/stopped the board, update state
    socket.on('startStop', function (data) {
        if (data.data == 'start') {
            BOARD_LIST[socket.boardID].paused = false;
        }
        else if (data.data == 'stop') {
            BOARD_LIST[socket.boardID].paused = true;
        }
        else if (data.data == 'step'){
            if(BOARD_LIST[socket.boardID].paused){
                BOARD_LIST[socket.boardID].update();
                for(socket_id in BOARD_LIST[socket.boardID].CONNECTED_SOCKETS){
                    s = BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket_id];
                    s.emit('boardData', {
                        compressedBoard: BOARD_LIST[s.boardID].compressedGrid,
                        speed: (BOARD_LIST[s.boardID].tickSpeed / BOARD_LIST[s.boardID].tickReductionRatio),
                    })
                }
                
            }
        }

    })

    // User changed the speed input slider, update board tickrate
    socket.on('speed', function (data) {
        BOARD_LIST[socket.boardID].tickSpeed = data.speed * BOARD_LIST[socket.boardID].tickReductionRatio;
        //console.log(BOARD_LIST[socket.boardID].tickSpeed);
        clearInterval(BOARD_LIST[socket.boardID].logicInterval);
        //logicFunction();
        startBoard(BOARD_LIST[socket.boardID]);
    })

    // User requests a different board
    socket.on('changeBoard', function (data){
        delete BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id]; // Remove their socket from the boards connected sockets
        for(socket_id in BOARD_LIST[socket.boardID].CONNECTED_SOCKETS){
            SOCKET_LIST[socket_id].emit(('changeUserCount'), { users: Object.keys(BOARD_LIST[socket.boardID].CONNECTED_SOCKETS).length});
        }
        //Check if board just left is empty, pause if it is
        if(Object.keys(BOARD_LIST[socket.boardID].CONNECTED_SOCKETS).length == 0){
            BOARD_LIST[socket.boardID].paused = true;
        }
        socket.boardID = data.id;
        BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id] = socket; // Add socket to new board id

        for(socket_id in BOARD_LIST[socket.boardID].CONNECTED_SOCKETS){
            SOCKET_LIST[socket_id].emit(('changeUserCount'), { users: Object.keys(BOARD_LIST[socket.boardID].CONNECTED_SOCKETS).length});
        }

        // Send full data for new board, first time only
        socket.emit(('initData'), {
            w: BOARD_LIST[socket.boardID].width,
            h: BOARD_LIST[socket.boardID].height,
            cs: BOARD_LIST[socket.boardID].cellSize,
            compressedBoard: BOARD_LIST[socket.boardID].compressedGrid,
            all_board_ids: IDS,
            all_board_names: NAMES,
            curr_id: socket.boardID,
        })
    })
//////////////////////////// REMOVE FOR SAFETY OF DEPLOYMENT ////// TEMP //////////
    // Save board to file
    socket.on('saveBoard', function(data){
        if(runningLocal){
            console.log("SAVING BOARD ",socket.boardID,"...")
            saveBoard(socket.boardID);
        }
    })

    //create a new board, basic input sanitization
    socket.on('newBoard', function(data){
        if(Number.isInteger(parseInt(data.height)) && Number.isInteger(parseInt(data.width))){
            let h = data.height;
            let w = data.width;
            let n = data.name;
            if(h > MAX_HEIGHT){h = MAX_HEIGHT;}
            if(w > MAX_WIDTH){w = MAX_WIDTH;}
            if(n.length > MAX_NAME){n = n.substring(0,MAX_NAME);}
            nBid = createBoard(n, h, w, cellSize);
            IDS = Object.keys(BOARD_LIST);
            NAMES.push(n);
            sendBoards();
        }
    })
////////////////////////////////////////////////////////////////////////////////

    // Remove sockets information when they disconnect
    socket.on('disconnect', function () {
        delete BOARD_LIST[socket.boardID].CONNECTED_SOCKETS[socket.id]
        delete SOCKET_LIST[socket.id];
        console.log('Connected Users: ', Object.keys(SOCKET_LIST).length);
    })
});

// Send correct board states to clients //// OLD METHOD - Sending at a constant tickrate
// setInterval(function () {
//     for(var i in BOARD_LIST){
//         var board = BOARD_LIST[i]
//         for(id in board.CONNECTED_SOCKETS){
//             var socket = board.CONNECTED_SOCKETS[id];
//             socket.emit('boardData', {
//                 board: BOARD_LIST[socket.boardID].grid,
//                 speed: (BOARD_LIST[socket.boardID].tickSpeed / BOARD_LIST[socket.boardID].tickReductionRatio),
//                 users: Object.keys(BOARD_LIST[socket.boardID].CONNECTED_SOCKETS).length
//             })
//         }
//     }
// }, 1000 / 24)


