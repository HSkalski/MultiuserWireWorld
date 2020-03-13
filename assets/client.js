var socket = io();
      
var c = document.getElementById("game");
var ctx = c.getContext("2d");

var bw = c.width;
var bh = c.height;
var p = 10;
var cw = bw + (p*2) + 1;
var ch = bh + (p*2) + 1;
var cs = 20;
var color={
    0:"rgb(20, 0, 100)",
    1:"yellow",
    2:"red",
    3:"orange",
    4:"rgb(10,0,50)"
};
var playerTool = 1;
var drawing = false;
var selecting = false;
var copying = false;
var selRegion = {};

var lastPos = {x:0,y:0};
var grid = [];
var compressedGrid = {};
var slider = document.getElementById("speedRange")
var userCount = 0;
var userText = document.getElementById("user-count");
var topGrid = true;

// slider.style.display = "none";
var boards = []
var names = []

var boardSelection = document.getElementById("boards")
var newOption = document.createElement("option");

var newBoardSubmission = document.getElementById("newBoardSubmission")
newBoardSubmission.style.display = "none";


// First board sent with additional params
socket.on('initData', function(data){
    console.log(data)
    cs = data.cs;
    c.width = parseInt(data.w*cs);
    c.height = parseInt(data.h*cs);
    compressedGrid = data.compressedBoard;
    drawCompressedBoard(data.compressedBoard);
    grid = data.board;
    boards = data.all_board_ids;
    names = data.all_board_names;
    var length = boardSelection.options.length;
    for (i = length-1; i >= 0; i--) {
        boardSelection.options[i] = null;
    }
    for( i in boards){
        newOption = document.createElement("option");
        newOption.text = names[i];
        newOption.value = boards[i];
        boardSelection.add(newOption);
    }
    boardSelection.value = data.curr_id;
})

// Subsequent boards 
socket.on('boardData', function(data){
    drawCompressedBoard(data.compressedBoard);
    compressedGrid = data.compressedBoard;
    //console.log(data.compressedBoard);
    grid = data.board;
    if(data.speed) slider.value = data.speed;
    if(data.test) console.log("clicked")
})

socket.on('changeUserCount', function(data){
    userCount = data.users;
    userText.innerHTML = "Users: " + userCount;
})

slider.oninput = function(){
    socket.emit('speed',{speed:slider.value})
}
////////// OLD METHOD OF DRAWING WHOLE BOARD //////////
// var drawBoard = function(board){
//     for(var y = 0; y <= board.length-1; y += 1){
//       for(var x = 0; x <= board[0].length-1; x += 1){
//         ctx.beginPath();
//         ctx.rect(x*cs,y*cs,cs,cs);
//         ctx.fillStyle=color[board[y][x]];
//         ctx.fill();
//       }
//     }
//     ctx.beginPath();


//   ctx.strokeStyle = "black";
//   ctx.stroke();
// }
////////////////////////////////////////////////////////

var drawCompressedBoard = function(compressedBoard){
    ctx.beginPath();
    ctx.rect(0,0,c.width,c.height);
    ctx.fillStyle=color[0];
    ctx.fill();

    if(!topGrid){
        for (var i=0; i<c.width/cs-1; i++) {
            for (var j=0; j<c.height/cs-1; j++) {
                var x = (i+1)*cs;
                var y = (j+1)*cs;
                var sAngle = 0;
                var eAngle = 2*Math.PI;
                ctx.beginPath();
                ctx.arc(x, y, 1, sAngle, eAngle);
                ctx.fillStyle=color[4];
                ctx.fill();
            }
        }
    }

    wLen = compressedBoard.wire.x.length;
    hLen = compressedBoard.head.x.length;
    tLen = compressedBoard.tail.x.length;
    for(var i = 0; i < wLen; i++){
        ctx.beginPath();
        ctx.rect(compressedBoard.wire.x[i]*cs,compressedBoard.wire.y[i]*cs,cs,cs);
        ctx.fillStyle=color[1];
        ctx.fill();
    }
    for(var i = 0; i < hLen; i++){
        ctx.beginPath();
        ctx.rect(compressedBoard.head.x[i]*cs,compressedBoard.head.y[i]*cs,cs,cs);
        ctx.fillStyle=color[2];
        ctx.fill();
    }
    for(var i = 0; i < tLen; i++){
        ctx.beginPath();
        ctx.rect(compressedBoard.tail.x[i]*cs,compressedBoard.tail.y[i]*cs,cs,cs);
        ctx.fillStyle=color[3];
        ctx.fill();
    }

    if(topGrid){
        for (var i=0; i<c.width/cs-1; i++) {
            for (var j=0; j<c.height/cs-1; j++) {
                var x = (i+1)*cs;
                var y = (j+1)*cs;
                var sAngle = 0;
                var eAngle = 2*Math.PI;
                ctx.beginPath();
                ctx.arc(x, y, 1, sAngle, eAngle);
                ctx.fillStyle=color[4];
                ctx.fill();
            }
        }
    }
    if(selRegion != {}){   
        drawSelected();
    }
}

var drawSelected = function(){
    ctx.beginPath(); 
    addOneX = 0;
    addOneY = 0;
    if(selRegion.x1>selRegion.x2)
        addOneX = 1;
    if(selRegion.y1>selRegion.y2)
        addOneY = 1;
    ctx.rect((selRegion.x1+addOneX)*cs,
            (selRegion.y1+addOneY)*cs,  
            (selRegion.x2-selRegion.x1+1-(2*addOneX))*cs, 
            (selRegion.y2-selRegion.y1+1-(2*addOneY))*cs)
    ctx.lineWidth = "2";
    ctx.strokeStyle = "white";
    ctx.stroke();
}

var swapTool = function(tool){
    if(tool === 'Wire'){
        playerTool = 1;
    }
    else if(tool === 'Head'){
        playerTool = 2;
    }
    else if(tool === 'Tail'){
        playerTool = 3;
    }
    else if(tool === 'Erase'){
        playerTool = 0;
    }
    document.getElementById("selectedTool").innerHTML = tool;
}

var swapGrid = function(){
    topGrid = !topGrid;
    drawCompressedBoard(compressedGrid);
}

var startStop = function(data){
    socket.emit('startStop',{data});
}

var changeBoard = function(){
    socket.emit('changeBoard',{id:boardSelection.value})
}

function getMousePosition(canvas, event) { 
    let rect = canvas.getBoundingClientRect(); 
    let x = event.clientX - rect.left; 
    let y = event.clientY - rect.top; 
    let gridX = parseInt(x/cs);
    let gridY = parseInt(y/cs);
    return {x:gridX,y:gridY}
} 

function emitSquare(x,y){
    socket.emit('click',{
        x:x,
        y:y,
        tool:playerTool
    })
}

function checkValue(val){
    return v;
}

//////// Function needs to be updated to use compressed grid ////////
function uniqueCell(x,y){
    // console.log("X: ", x," ", lastPos.x)
    // console.log("Y: ", y," ", lastPos.y)
    // console.log(grid[y][x],' ', playerTool)

    if(grid[y][x] != playerTool){
        lastPos.x = x;
        lastPos.y = y;
        return true;
    }
    else if(x != lastPos.x || y != lastPos.y){
        lastPos.x = x;
        lastPos.y = y;
        return true;
    }
    else{
        lastPos.x = x;
        lastPos.y = y;
        return false;
    }
}


function saveBoard(){
    socket.emit('saveBoard', {})
}

function showNewBoard(){
    if(newBoardSubmission.style.display == "none")
        newBoardSubmission.style.display = "inline";
    else if(newBoardSubmission.style.display == "inline")
        newBoardSubmission.style.display = "none";
}

function newBoard(){
    var name = document.getElementById("name");
    var height = document.getElementById("height");
    var width = document.getElementById("width");
    //console.log(name.value," ", height.value," ", width.value)
    socket.emit('newBoard',{
        name: name.value,
        height: height.value,
        width: width.value
    })
    newBoardSubmission.style.display = "none"
}
var canvasElem = document.querySelector("canvas"); 
  
c.addEventListener("mousedown", function(e){ 
    if(e.button == 0 && !copying){ // Left mouse
        console.log("left click")
        drawing = true;
        pos = getMousePosition(c, e); 
        emitSquare(pos.x,pos.y);
    }else if(e.button == 2){ // Right click
        console.log("right click")
        selecting = true;
        pos = getMousePosition(c, e);
        selRegion.y1 = pos.y;
        selRegion.x1 = pos.x;
    }
}); 

document.addEventListener("mouseup", function(e){ 
    drawing = false;

    if(selecting){
        selecting = false;
        copying = true;
        pos = getMousePosition(c, e); 
        selRegion.y2 = pos.y;
        selRegion.x2 = pos.x;
        if(selRegion.x1 == selRegion.x2 && selRegion.y1 == selRegion.y2){
            selRegion = {};
            console.log("Clearing region");
            copying = false;
        }
        drawCompressedBoard(compressedGrid);
    }
}); 

c.addEventListener('mousemove', function(e) {
    if(drawing){
        pos = getMousePosition(c, e); 
        emitSquare(pos.x,pos.y);
    }
    if(selecting){
        pos = getMousePosition(c, e); 
        selRegion.y2 = pos.y;
        selRegion.x2 = pos.x;
        drawCompressedBoard(compressedGrid);
    }
});

document.addEventListener("keydown", function(e){
    //console.log(e);
    switch(e.keyCode){
        case 72:
            swapTool('Head');
            break;
        case 87:
            swapTool('Wire');
            break;
        case 84:
            swapTool('Tail');
            break;
        case 69:
            swapTool('Erase');
            break;
        default:
            break;
    }
}, false);

