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
    3:"orange"};
var playerTool = 1;
var slider = document.getElementById("speedRange")
slider.style.display = "none";

var boards = []
var names = []

var boardSelection = document.getElementById("boards")
var newOption = document.createElement("option");

var newBoardSubmission = document.getElementById("newBoardSubmission")
newBoardSubmission.style.display = "none";

// First board sent with additional params
socket.on('initData', function(data){
    console.log(data)
    c.width = data.w;
    c.height = data.h;
    cs = data.cs;
    drawBoard(data.board);
    //id = data.curr_id;
    boardSelection.value = data.curr_id;
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
})

// Subsequent boards 
socket.on('boardData', function(data){
    drawBoard(data.board);
    slider.value = data.speed;
})

slider.oninput = function(){
    socket.emit('speed',{speed:slider.value})
}

var drawBoard = function(board){
    for(var y = 0; y <= board.length-1; y += 1){
      for(var x = 0; x <= board[0].length-1; x += 1){
        ctx.beginPath();
        ctx.rect(x*cs,y*cs,cs,cs);
        ctx.fillStyle=color[board[y][x]];
        ctx.fill();
      }
    }
    ctx.beginPath();


  ctx.strokeStyle = "black";
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
    console.log("Coordinate x: " + parseInt(x/20),  
                "Coordinate y: " + parseInt(y/20)); 
    socket.emit('click', {
        x:parseInt(x/cs),
        y:parseInt(y/cs),
        tool:playerTool
    });
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
    console.log(name.value," ", height.value," ", width.value)
    socket.emit('newBoard',{
        name: name.value,
        height: height.value,
        width: width.value
    })
    newBoardSubmission.style.display = "none"
}
var canvasElem = document.querySelector("canvas"); 
  
c.addEventListener("mousedown", function(e){ 
    getMousePosition(c, e); 
}); 

