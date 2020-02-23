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
board[10][12] = 1;
board[10][13] = 2;

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
    }
}, 1000/10)

// Logic
setInterval(function(){
    for(var y = 0; y < board.length; y++){
        for(var x = 0; x < board[0].length; x++){
            if (board[y][x] == 2){
                nborType = getNeighbors(x,y);
                for(var i = 0; i < nborType.length; i++){
                    
                    if(nborType[i]==1){ // If neighbor is wire
                        setNbor = whichNeighbor(i);
                        board[y+setNbor[0]][x+setNbor[1]] = 2;
                    }
                }
                board[y][x] = 3;
            }
            else if(board[y][x] == 3){
                board[y][x] = 1;
            }
        }
    }
}, 1000);

/*
Returns neighbors in this order: 
  7 0 4
  3 x 1
  6 2 5
*/
var getNeighbors = function(x,y){
    var nbors = new Array(8);
    nbors[0] = board[y-1][x]
    nbors[1] = board[y] [x+1]
    nbors[2] = board[y+1] [x]
    nbors[3] = board[y] [x-1]
    nbors[4] = board[y-1] [x+1]
    nbors[5] = board[y+1] [x+1]
    nbors[6] = board[y+1] [x-1]
    nbors[7] = board[y-1] [x-1]
    return nbors;
}

var whichNeighbor = function(index){
    switch(index){
        case 0:
            return [-1,0]
        case 1:
            return [0,1];
        case 2:
            return [1,0];
        case 3:
            return [0,-1];
        case 4:
            return [-1,1];
        case 5:
            return [1,1];
        case 6:
            return [1,-1];
        case 7:
            return [-1,-1];
        default:
            break;
    }
}