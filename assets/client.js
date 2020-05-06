



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
    empty:"rgb(20, 0, 100)",
    wire:"yellow",
    head:"red",
    tail:"orange",
    grid:"black"
};
var playerTool = 1;
var drawing = false;

var selecting = false;
var copying = false;
var selRegion = {};
var selGrid = {};
var selXinv = false;
var selYinv = false;
var mousePos = {x: 0, y: 0};

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

// Audio init

var toneGen = new ToneGenerator();

var convertRange = function(value, r1, r2){
    return ( value - r1[ 0 ] ) * ( r2[ 1 ] - r2[ 0 ] ) / ( r1[ 1 ] - r1[ 0 ] ) + r2[ 0 ];
}

// First board sent with additional params
socket.on('initData', function(data){
    console.log(data)
    cs = data.cs;
    c.width = parseInt(data.w*cs);
    c.height = parseInt(data.h*cs);
    compressedGrid = data.compressedBoard;
    //drawCompressedBoard(data.compressedBoard);
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
    //drawCompressedBoard(data.compressedBoard);
    compressedGrid = data.compressedBoard;
    //console.log(data.compressedBoard);
    grid = data.board;
    if(data.speed) slider.value = data.speed;
    if(data.test) console.log("clicked")
    
    toneGen.genNote(parseInt(convertRange(data.speed, [1,100], [-12,12])));
})

socket.on('changeUserCount', function(data){
    userCount = data.users;
    userText.innerHTML = "Users: " + userCount;
})

slider.oninput = function(){
    socket.emit('speed',{speed:slider.value})
}

var drawCompressedBoard = function(compressedBoard){
    ctx.beginPath();
    ctx.rect(0,0,c.width,c.height);
    ctx.fillStyle=color.empty;
    ctx.fill();

    if(!topGrid){
        drawGrid();
    }

    for(tool in compressedBoard){
        len = compressedBoard[tool].x.length;
        for(var i = 0; i < len; i++){
            ctx.beginPath();
            ctx.rect(compressedBoard[tool].x[i]*cs,compressedBoard[tool].y[i]*cs,cs,cs);
            ctx.fillStyle=color[tool];
            ctx.fill();
        }
    }

    if(topGrid){
        drawGrid();
    }
    if(selRegion != {}){   
        drawSelected();
    }
    if(copying){
        drawSelection();
    }
}

var drawGrid = function(){
    for (var i=0; i<c.width/cs-1; i++) {
        for (var j=0; j<c.height/cs-1; j++) {
            var x = (i+1)*cs;
            var y = (j+1)*cs;
            var sAngle = 0;
            var eAngle = 2*Math.PI;
            ctx.beginPath();
            ctx.arc(x, y, 1, sAngle, eAngle);
            ctx.fillStyle=color.grid;
            ctx.fill();
        }
    }
}

var drawSelected = function(){
    ctx.beginPath(); 
    addOneX = 0;
    addOneY = 0;
    selXinv = false;
    selYinv = false;
    if(selRegion.x1>selRegion.x2){
        addOneX = 1;
        selXinv = true;
    }
    if(selRegion.y1>selRegion.y2){
        addOneY = 1;
        selYinv = true;
    }
    ctx.rect((selRegion.x1+addOneX)*cs,
            (selRegion.y1+addOneY)*cs,  
            (selRegion.x2-selRegion.x1+1-(2*addOneX))*cs, 
            (selRegion.y2-selRegion.y1+1-(2*addOneY))*cs)
    ctx.lineWidth = "2";
    ctx.strokeStyle = "white";
    ctx.stroke();
}

var findSelectedGrid = function(){
    selGrid = {
        wire: {
            x: [],
            y: []
        },
        head: {
            x: [],
            y: []
        },
        tail: {
            x: [],
            y: []
        }
    }

    for(tool in selGrid){
        len = compressedGrid[tool].x.length;
        for(var i = 0; i < len; i++){
            //console.log(selGrid);
            if(!selYinv && !selXinv){ //top down, left to right
                if(compressedGrid[tool].x[i] >= selRegion.x1 && compressedGrid[tool].x[i] <= selRegion.x2 && compressedGrid[tool].y[i] >= selRegion.y1 && compressedGrid[tool].y[i] <= selRegion.y2){
                    selGrid[tool].x.push(compressedGrid[tool].x[i]);
                    selGrid[tool].y.push(compressedGrid[tool].y[i]);
                }
            }else if(!selYinv){ //top down, right to left
                if(compressedGrid[tool].x[i] <= selRegion.x1 && compressedGrid[tool].x[i] >= selRegion.x2 && compressedGrid[tool].y[i] >= selRegion.y1 && compressedGrid[tool].y[i] <= selRegion.y2){
                    selGrid[tool].x.push(compressedGrid[tool].x[i]);
                    selGrid[tool].y.push(compressedGrid[tool].y[i]);
                }
            }else if(!selXinv){ //bottom up, left to right
                if(compressedGrid[tool].x[i] >= selRegion.x1 && compressedGrid[tool].x[i] <= selRegion.x2 && compressedGrid[tool].y[i] <= selRegion.y1 && compressedGrid[tool].y[i] >= selRegion.y2){
                    selGrid[tool].x.push(compressedGrid[tool].x[i]);
                    selGrid[tool].y.push(compressedGrid[tool].y[i]);
                }
            }else{ // bottom up,  right to left
                if(compressedGrid[tool].x[i] <= selRegion.x1 && compressedGrid[tool].x[i] >= selRegion.x2 && compressedGrid[tool].y[i] <= selRegion.y1 && compressedGrid[tool].y[i] >= selRegion.y2){
                    selGrid[tool].x.push(compressedGrid[tool].x[i]);
                    selGrid[tool].y.push(compressedGrid[tool].y[i]);
                }
            }
        } 
    }
}

var drawSelection = function(){
    ctx.globalAlpha = 0.5;
    console.log(selGrid);
    for(tool in selGrid){
        len = selGrid[tool].x.length;
        console.log(tool);
        for(var i = 0; i < len; i++){
            ctx.beginPath();
            ctx.rect((selGrid[tool].x[i]+mousePos.x-selGrid.wire.x[0])*cs,(selGrid[tool].y[i]+mousePos.y-selGrid.wire.y[0])*cs,cs,cs);
            ctx.fillStyle=color[tool];
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

var pasteSelection = function(){
    socket.emit('paste', {selGrid,mousePos});
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
    //drawCompressedBoard(compressedGrid);
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

function emitSquare(x,y,tool){
    socket.emit('click',{
        x:x,
        y:y,
        tool:tool
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
    if(e.button == 0){ // Left mouse
        if(!copying){
            console.log("left click")
            drawing = true;
            pos = getMousePosition(c, e); 
            emitSquare(pos.x,pos.y,playerTool);
        }else{
            pasteSelection();
            
        }
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
        pos = getMousePosition(c, e); 
        selRegion.y2 = pos.y;
        selRegion.x2 = pos.x;
        if(selRegion.x1 == selRegion.x2 && selRegion.y1 == selRegion.y2){
            selRegion = {};
            console.log("Clearing region");
            copying = false;
        }
        //drawCompressedBoard(compressedGrid);
        findSelectedGrid();
        if(selGrid.wire.x.length != 0 || selGrid.head.x.length != 0 || selGrid.tail.x.length != 0)
            copying = true;
    }
}); 

c.addEventListener('mousemove', function(e) {
    pos = getMousePosition(c, e);
    mousePos.x = pos.x;
    mousePos.y = pos.y;
    // if(drawing){
    //     pos = getMousePosition(c, e); 
    //     emitSquare(pos.x,pos.y,playerTool);
    // }
    // if(selecting){
    //     pos = getMousePosition(c, e); 
    //     selRegion.y2 = pos.y;
    //     selRegion.x2 = pos.x;
    //     drawCompressedBoard(compressedGrid);
    // }
    // if(copying){
    //     drawCompressedBoard(compressedGrid);
    //     pos = getMousePosition(c, e);
    //     mouseX = pos.x;
    //     mouseY = pos.y;
    //     drawSelection();
    // }
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

var draw = function(){
    window.requestAnimationFrame(draw);
    
    drawCompressedBoard(compressedGrid);

    if(drawing){ 
        emitSquare(mousePos.x,mousePos.y,playerTool);
    }
    if(selecting){
        selRegion.y2 = mousePos.y;
        selRegion.x2 = mousePos.x;
        
    }
    if(copying){
        //drawCompressedBoard(compressedGrid);
        drawSelection();
    }

}

window.onload = function() {
    draw();
}