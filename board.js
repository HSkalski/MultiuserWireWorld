
class Board {

    constructor(n, h, w, cs) {
        this.name = n;
        this.id = Math.random();
        this.height = h;
        this.width = w;
        this.cellSize = cs;
        this.boardWidth = parseInt(w / cs);
        this.boardHeight = parseInt(h / cs);
        this.paused = false;

        this.logicInterval;
        this.logicFuncton;
        this.tickSpeed = 10;
        this.tickReductionRatio = 1 / 4;

        this.nborType = []
        
        this.CONNECTED_SOCKETS = {}

        this.grid = new Array(this.boardHeight);
        //console.log("Board Height: ", this.grid.length)
        for (var i = 0; i < this.height / this.cellSize; i++) {
            this.grid[i] = new Array(this.boardWidth).fill(0);
        }
        //console.log("Board Width: ", this.grid[0].length);
    }
    

    
    // Logic Function
    /*
    0 = empty
    1 = wire
    2 = electron head
    3 = electron tail
    
    */
   /*
   Rules:
   1. empty: stays empty
    2. head: becomes tail
    3. tail: becomes copper
    4. copper: stays copper unless it has just one or two neighbours
    that are electron heads, then it becomes a head
    */
   update() {
       if (!this.paused) {
           var boardCopy = this.arrayClone(this.grid);
           for (var y = 0; y < boardCopy.length; y++) {
               for (var x = 0; x < boardCopy[0].length; x++) {
                   if (boardCopy[y][x] == 2) {
                       this.grid[y][x] = 3;
                    }
                    else if (boardCopy[y][x] == 3) {
                        this.grid[y][x] = 1;
                    }
                    else if (boardCopy[y][x] == 1) {
                        this.nborType = this.getNeighbors(x, y, boardCopy);
                        var numHeads = 0;
                        for (var i = 0; i < this.nborType.length; i++) {
                            if (this.nborType[i] == 2) { // If neighbor is head
                                numHeads++;
                            }
                        }
                        if (numHeads > 0 && numHeads < 3) {
                            this.grid[y][x] = 2;
                        }
                    }
                }
            }
        }
        
    }
    
    arrayClone(arr) {
        var i, copy;
        if (Array.isArray(arr)) {
            copy = arr.slice(0);
            for (i = 0; i < copy.length; i++) {
                copy[i] = this.arrayClone(copy[i]);
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
    
    /*
    Returns neighbors in this order: 
    7 0 4
    3 x 1
    6 2 5
    */
    getNeighbors(x, y, currBoard) {
        var nbors = new Array(8);
        if (y > 0)
            nbors[0] = currBoard[y - 1][x]
        if (x < this.boardWidth-1)
            nbors[1] = currBoard[y][x + 1]
        if (y < this.boardHeight-1)
            nbors[2] = currBoard[y + 1][x]
        if (x > 0)
            nbors[3] = currBoard[y][x - 1]
        if (x < this.boardWidth-1 && y > 0)
            nbors[4] = currBoard[y - 1][x + 1]
        if (x < this.boardWidth-1 && y < this.boardHeight-1)
            nbors[5] = currBoard[y + 1][x + 1]
        if (x > 0 && y < this.boardHeight-1)
            nbors[6] = currBoard[y + 1][x - 1]
        if (x > 0 && y > 0)
            nbors[7] = currBoard[y - 1][x - 1]
        return nbors;
    }
    
}



module.exports = Board;