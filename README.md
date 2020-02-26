# MultiuserWireWorld
![Hello Gif](Hello.gif)

## Welcome!
This is a project utilizing a node.js webserver and web sockets to create an enviroment for multiple users to interact and build structure for a wireworld cellular automaton. 

## What is Wireworld? 
Wireworld is a celluar automaton, it exists on a grid and each cell is in one of four states:
* Empty
* Wire / Conductor (Yellow) 
* Electron Head (Red)
* Electron Tail (Orange)


It follows four basic rules each tick:

1. An empty cell stays empty
2. electron head (red) turns into an electron tail (orange)
3. electron tail turns into wire (yellow)
4. wire will turn into an electron head if one or two of its neighbors are electron heads, but not more



[Wireworld Wikipedia](https://en.wikipedia.org/wiki/Wireworld)

## //TODO

* Drag drawing

* Copy / Paste

* Drag n' Drop

* Database connection

  * Load / Save Boards
  
  * Sign in / Sign up
 
* Multiple simultanious Boards updating

* Better Pan / Zoom 

* Chat functionality

* Intro / Rules List
