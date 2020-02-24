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
var boardWidth = width/cellSize;
var boardHeight = height/cellSize;
var paused = false;
var tickSpeed = 10; // ticks per second
var logicInterval;
var tickReductionRatio = 1/4;

var board = new Array(height/cellSize).fill(0);
console.log("Board Height: ", board.length)
for(var i = 0; i < height/cellSize; i++){
    board[i] = new Array(width/cellSize).fill(0);
}
console.log("Board Width: ", board[0].length)

board[10][10] = 1;
board[10][11] = 1;
board[10][12] = 2;
board[10][13] = 3;
board[9][14] = 1;
board[9][9] = 1;
board[8][10] = 1;
board[8][11] = 1;
board[8][12] = 1;
board[8][13] = 1;


var SOCKET_LIST = {};

io.on('connection', function(socket){
    console.log('user connection established');
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.emit('boardData',{
        board:board
    })

    socket.on('click', function(data){
        if(data.y < board.length && data.x < board[0].length){
            board[data.y][data.x] = data.tool; 
        }
        socket.emit('boardData',{
            board:board
        })
    })

    socket.on('startStop', function(data){
        console.log(data);
        if(data.data == 'start'){
            paused = false;
        }
        else if(data.data == 'stop'){
            paused = true;
        }

    })

    socket.on('speed', function(data){
        tickSpeed = data.speed * tickReductionRatio;
        console.log(tickSpeed);
        clearInterval(logicInterval);
        logicFunction();
    })

    socket.on('disconnect', function(){
        delete SOCKET_LIST[socket.id];
        console.log('user left');
    })
});

// Send boards
setInterval(function(){
    for( var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('boardData',{
            board:board
        })
        socket.emit('speedData',{
            speed:(tickSpeed / tickReductionRatio)
        })
    }
}, 1000/24)

// Logic Function
/*
0 = empty
1 = wire
2 = electron head
3 = electron tail

Rules:
    empty: stays empty
    head: becomes tail
    tail: becomes copper
    copper: stays copper unless it has just one or two neighbours 
            that are electron heads, then it becomes a head
*/

var logicFunction = function(){
    logicInterval = setInterval(function(){
        if(!paused){
            var boardCopy = arrayClone(board);
            for(var y = 0; y < boardCopy.length; y++){
                for(var x = 0; x < boardCopy[0].length; x++){
                    if (boardCopy[y][x] == 2){
                        board[y][x] = 3;
                    }
                    else if(boardCopy[y][x] == 3){
                        board[y][x] = 1;
                    }
                    else if(boardCopy[y][x] == 1){
                        nborType = getNeighbors(x,y, boardCopy);
                        var numHeads = 0;
                        for(var i = 0; i < nborType.length; i++){
                            if(nborType[i]==2){ // If neighbor is wire
                                numHeads++;
                            }
                        }
                        if(numHeads > 0 && numHeads < 3){
                            board[y][x] = 2;
                        }
                    }
                }
            }
        }
    }, 1000/tickSpeed);
}

logicFunction();

/*
Returns neighbors in this order: 
  7 0 4
  3 x 1
  6 2 5
*/
var getNeighbors = function(x,y, currBoard){
    var nbors = new Array(8);
    if(y > 0)
        nbors[0] = currBoard[y-1][x]
    if(x < boardWidth)
        nbors[1] = currBoard[y] [x+1]
    if(y < boardHeight)
        nbors[2] = currBoard[y+1] [x]
    if(x > 0)
        nbors[3] = currBoard[y] [x-1]
    if(x < boardWidth && y > 0)
        nbors[4] = currBoard[y-1] [x+1]
    if(x < boardWidth && y < boardHeight)
        nbors[5] = currBoard[y+1] [x+1]
    if(x > 0 && y < boardHeight)
        nbors[6] = currBoard[y+1] [x-1]
    if(x > 0 && y > 0)
        nbors[7] = currBoard[y-1] [x-1]
    return nbors;
}

function arrayClone(arr){
    var i, copy;
    if(Array.isArray(arr)){
        copy = arr.slice(0);
        for(i = 0; i < copy.length; i++){
            copy[i] = arrayClone(copy[i]);
        }
        return copy;
    }
    else if(typeof arr === 'object'){
        throw 'Cannot clone array containing an object!';
    }
    else{
        return arr;
    }

}