var socket = io();
      
var c = document.getElementById("game");
var ctx = c.getContext("2d");

var bw = c.width;
var bh = c.height;
var p = 10;
var cw = bw + (p*2) + 1;
var ch = bh + (p*2) + 1;
var cs = 20;
var color={0:"rgb(20, 0, 100)",
    1:"yellow",
    2:"red",
    3:"orange"};
var playerTool = 1;


socket.on('boardData', function(data){
    drawBoard(data.board);
})

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


function getMousePosition(canvas, event) { 
    let rect = canvas.getBoundingClientRect(); 
    let x = event.clientX - rect.left; 
    let y = event.clientY - rect.top; 
    console.log("Coordinate x: " + parseInt(x/20),  
                "Coordinate y: " + parseInt(y/20)); 
    socket.emit('click', {
        x:parseInt(x/20),
        y:parseInt(y/20),
        tool:playerTool
    });
} 

let canvasElem = document.querySelector("canvas"); 
  
c.addEventListener("mousedown", function(e) 
{ 
    getMousePosition(c, e); 
}); 