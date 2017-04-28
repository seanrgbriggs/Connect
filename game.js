// game.js for Perlenspiel 3.2

/*
 Perlenspiel is a scheme by Professor Moriarty (bmoriarty@wpi.edu).
 Perlenspiel is Copyright © 2009-17 Worcester Polytechnic Institute.
 This file is part of Perlenspiel.

 Perlenspiel is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published
 by the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Perlenspiel is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU Lesser General Public License for more details.

 You may have received a copy of the GNU Lesser General Public License
 along with Perlenspiel. If not, see <http://www.gnu.org/licenses/>.
 */

// The following comment lines are for JSLint. Don't remove them!

/*jslint nomen: true, white: true */
/*global PS */

var Utils = {
    GridIterator:function(xlen,ylen){
        return {
            x:0,y:0,
            xlen:xlen,ylen:ylen,
            isDone:function(){
                return this.y >= this.ylen;
            },
            next:function(){
                this.x++;
                if(this.x >= this.xlen){
                    this.x=0;
                    this.y++;
                }
            }
        };
    }
};



var G = (function(){
    var GRIDSIZE = 16;
    var LEVELSIZE = 12;
    var LEVELOFFSET = {x:2,y:2};

    var MAXSTRENGTH = 252;

    var LIGHTDECREMENT = 0x010101;
    var OUTERBORDERCOLOR = 0x222222;

    var worldPos = {x:0,y:0};
    var worldMap = [];
    var lights = [];

    var tileColorMap = (function(){
        var map = new Map();
        map.set("WALL", PS.COLOR_BLACK);
        map.set("PATH", 0x333333);
        map.set("VALVE", 0x333333);
        map.set("POWEREDVALVE", 0x333333);
        map.set("POWERSOURCE", PS.COLOR_RED);
        map.set("LIGHT", PS.COLOR_WHITE);
        map.set("FORK", 0x333333);
        return map;
    }());
    var tileOnInitMap = (function () {
        var map = new Map();
        function voidfunc(x, y) {}
        map.set("WALL", voidfunc);
        map.set("PATH", voidfunc);
        map.set("VALVE", function (x, y) {
            if(this.open){
                PS.border(x, y, 5);
            }
            else{
                this.open = false;
                PS.border(x, y, 12);   //Valve Border Size
            }
            PS.borderColor(x,y,PS.DEFAULT);
        });
        map.set("POWEREDVALVE", function (x, y) {
            if(this.open){
                PS.border(x, y, 5);
            }
            else{
                this.open = false;
                PS.border(x, y, 12);   //Valve Border Size
            }
            PS.borderColor(x,y,PS.COLOR_RED);
        });
        map.set("LIGHT", voidfunc);
        map.set("POWERSOURCE", function (x, y) {
            this.powered = false;
        });
        map.set("FORK",function (x,y) {
            PS.borderColor(x,y,0x550000);
            PS.border(x,y, {bottom:5,left:5}); 
        });
        return map;
    })();
    var tileOnClickMap = (function(){
        var map = new Map();
        function voidfunc(x, y) {} 
        map.set("VALVE", function (x, y) {
            PS.borderFade(x,y,1);
            if(!this.open){
                this.open = true;
                PS.border(x, y, 5);
            }else {
                this.open = false;
                PS.border(x, y, 12);   //Valve Border Size
            }
            update();
        }); 
        map.set("FORK",function (x,y) {
            var border = PS.border(x,y);
            var topTemp = border.top;
            border.top = border.left;
            border.left = border.bottom;
            border.bottom = border.right;
            border.right = topTemp;

            var updatedData = PS.data(x,y);
            updatedData.border = border;
            PS.data(x,y, updatedData);

            PS.border(x,y,border);
            update();
        });
        return map;
    }());

    var tileOnDrawMap = (function () {
        var map = new Map();
        function voidfunc(x, y) {}
        map.set("WALL", voidfunc);
        map.set("PATH", voidfunc);
        map.set("VALVE", voidfunc);
        map.set("POWEREDVALVE", voidfunc);
        map.set("POWERSOURCE", voidfunc);
        map.set("LIGHT", voidfunc);
        map.set("FORK",function (x,y) { 
            if(PS.data(x,y).hasOwnProperty('border')){
                PS.border(x,y,PS.data(x,y).border);
            }
        });
        return map;
    })();

    //load the world from the given file
    function loadWorldFromFile(file){
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", file, false);
        rawFile.onreadystatechange = function (){
            if(rawFile.readyState === 4){
                if(rawFile.status === 200 || rawFile.status == 0){
                    var allText = rawFile.responseText;
                    var lines = allText.split(/\r?\n/);
                    worldMap = [];
                    //populate the world map
                    //add an array for every row of the world
                    for(var i = 0; i < lines[0].length; i++){
                        worldMap.push([]);
                    }
                    //translate every letter from the text file into the world map
                    for(var i = 0; i < lines.length; i++){
                        for(var j = 0; j < lines[i].length; j++){
                            var spot = lines[i][j];
                            //set the lights
                            if(spot === 'L'){
                                worldMap[j][i] = {x:j, y:i, type: "LIGHT", lightStrength: MAXSTRENGTH};
                                lights.push(worldMap[j][i]);
                            }
                            else if(spot === 'P'){
                                worldMap[j][i] = {x:j, y:i, type: "PATH", lightStrength: 0};
                            }
                            else if(spot === 'V'){
                                worldMap[j][i] = {x:j, y:i, type: "VALVE", lightStrength: 0};
                            }
                            else if(spot === 'G'){
                                worldMap[j][i] = {x:j, y:i, type: "POWEREDVALVE", lightStrength: 0};
                            }
                            else if(spot === 'S'){
                                worldMap[j][i] = {x:j, y:i, type: "POWERSOURCE", lightStrength: 0};
                            }
                            else if(spot === 'F'){
                                worldMap[j][i] = {x:j, y:i, type: "FORK", lightStrength: 0, border: {left:5,bottom:5},
                                isFacing:
									function (i, j) {
										var output = true;
										var border = this.border;
						                if( i > 0){
						                    output = output && (border.bottom > 0);
						                }else if (i < 0){
						                    output = output && (border.top > 0);
						                }
						                if( j > 0){
						                    output = output && (border.right > 0);
						                }else if (j < 0){
						                    output = output && (border.left > 0);
						                }

						                return output;
						            }
                            	};
                            }
                        }
                    }
                }
            }
        }
        rawFile.send(null);
    }

    //given x and y offsets draw the corresponding part of the world
    function drawPartOfWorld(xOffset, yOffset){
        //PS.debug(worldMap[xOffset][yOffset].type);
        //reset the grid
        for(var i = 0; i < LEVELSIZE; i++){
            for(var j = 0; j < LEVELSIZE; j++){
                PS.border(LEVELOFFSET.x+i, LEVELOFFSET.y+j, 0);
                PS.data(LEVELOFFSET.x+i, LEVELOFFSET.y+j, {type: "WALL", lightStrength: 0});
            }
        } 

        var borderIndices = [0,1,14,15];
        for(var x = 0; x < 16; x++){
        	borderIndices.forEach(function(y){PS.color(x,y,OUTERBORDERCOLOR);});
        }
        for(var y = 0; y < 16; y++){
        	borderIndices.forEach(function(x){PS.color(x,y,OUTERBORDERCOLOR);});
        }


        var navColors = {left:(xOffset > 0), right:(xOffset + 12 < worldMap.length), up: (yOffset > 0), down: (yOffset + 12 < worldMap.length)};
        for(var dir in navColors){
        	navColors[dir] = (navColors[dir])? PS.COLOR_YELLOW : OUTERBORDERCOLOR;
        }
        // if(xOffset > 0){
        	PS.color(0, 7, navColors.left);
        	PS.color(0, 8, navColors.left);
        // }
        // if(xOffset + 12 < worldMap.length){

        	PS.color(15, 7, navColors.right);
        	PS.color(15, 8, navColors.right);	
        // }
		// if(yOffset > 0){
        	PS.color(7, 0, navColors.up);
        	PS.color(8, 0, navColors.up);
        // }
        // if(yOffset + 12 < worldMap.length){
        	PS.color(7, 15, navColors.down);
        	PS.color(8, 15, navColors.down);
        // }


        //draw every bead of the level
        for(var i = 0; i < LEVELSIZE; i++){
            for(var j = 0; j < LEVELSIZE; j++) {
                //if there is data there then draw, the correct thing
                //also put in the data for the data field

                var x = LEVELOFFSET.x + i;
                var y = LEVELOFFSET.y + j;

                if(worldMap[i+xOffset][j+yOffset]){

                    //Add the appropriate onclick functionality of the bead.
                    //PS.debug((i+xOffset)+","+(j+yOffset));
                    var tileData = worldMap[i+xOffset][j+yOffset];
                    if(tileOnClickMap.has(tileData.type)){
                        tileData['onClick']= tileOnClickMap.get(tileData.type);
                    }
                    PS.data(x, y, tileData);

                    //Initialize each bead
                    if(tileOnInitMap.has(tileData.type)){
                        tileData['init']=tileOnInitMap.get(tileData.type);
                        tileData.init(x,y);
                    }

                    //Run the appropriate draw method for each bead
                    if(tileOnDrawMap.has(tileData.type)){
                        tileOnDrawMap.get(tileData.type)(x,y);
                    }

                    //if the bead is a light bead, set it to illuminate after level loads
                    if(worldMap[i+xOffset][j+yOffset].type === "LIGHT"){
                        illuminate(i + xOffset, j + yOffset);
                    }

                    if(tileData && tileData.lightStrength > 0){
                        if(tileData.lightStrength > 109) {
                            PS.color(x, y, 0xFFFFFF - ((MAXSTRENGTH - tileData.lightStrength) * LIGHTDECREMENT));
                        }
                        else{
                            PS.color(x, y, 0x707070);
                        }
                    }
                    else {
                        PS.color(x, y, tileColorMap.get(worldMap[i+xOffset][j+yOffset].type));
                    }

                }
                //else make it black
                else {
                    PS.color(x, y, tileColorMap.get("WALL"));
                }
            }
        }
    }

    //given a bead location, will illuminate those around it an recursively call itself until all is lit
    function illuminate(x, y){
        //illuminate to the right
		var litData = worldMap[x][y];
        var strength = litData.lightStrength;

        for(var i = -1; i <= 1; i++){
            for(var j = -1; j <= 1; j++){
            	if(litData.type === 'FORK' && !litData.isFacing(-j,-i)){
					continue;
				}

                //check only the vertically and horizontally adjacent beads, and not diagonal ones
                if((Math.abs(i) === 1 && Math.abs(j) === 0) || (Math.abs(i) === 0 && Math.abs(j) === 1)) {
                    var tiledata = worldMap[x+i][y+j];
                    //if there is a next spot to illuminate
                    if (tiledata && (tiledata.type === 'PATH'
                        ||(tiledata.type === 'VALVE' && tiledata.open)
                        ||(tiledata.type === 'POWEREDVALVE' && tiledata.open)
						||(tiledata.type === 'FORK' && tiledata.isFacing(j,i)))
                        && tiledata.lightStrength < strength - 1) {

                        //set the bead light strength and change the beads color
                        worldMap[x + i][y + j].lightStrength = strength - 1;
                        illuminate( x + i, y + j);
                    }
                    //if the adjacent block is a power block
                    else if(tiledata && tiledata.type === 'POWERSOURCE'){
                        powerOn(x+i, y+j);
                    }
                }
            }
        }
    }

    function powerOn(x, y){
        //illuminate to the right
        var powerData = worldMap[x][y];

        for(var i = -1; i <= 1; i++){
            for(var j = -1; j <= 1; j++){
                //check only the vertically and horizontally adjacent beads, and not diagonal ones
                if((Math.abs(i) === 1 && Math.abs(j) === 0) || (Math.abs(i) === 0 && Math.abs(j) === 1)) {
                    var tiledata = worldMap[x+i][y+j];
                    //if there is a next spot to illuminate
                    //if the adjacent block is a power block
                    if(tiledata && tiledata.type === 'POWEREDVALVE'){
                        worldMap[x+i][y+j].open = true;
                        //make sure everything around the opened valve is properly illuminated
                        if(worldMap[x+i-1][y+j] && worldMap[x+i-1][y+j].lightStrength > 0){
                            illuminate(x+i-1,y+j)
                        }
                        else if(worldMap[x+i+1][y+j] && worldMap[x+i+1][y+j].lightStrength > 0){
                            illuminate(x+i+1,y+j)
                        }
                        else if(worldMap[x+i][y+j-1] && worldMap[x+i][y+j-1].lightStrength > 0){
                            illuminate(x+i,y+j-1)
                        }
                        else if(worldMap[x+i][y+j+1] && worldMap[x+i  ][y+j+1].lightStrength > 0){
                            illuminate(x+i,y+j+1)
                        }
                    }
                }
            }
        }

    }

    function powerOff(x, y){
        //illuminate to the right
        var powerData = worldMap[x][y];

        for(var i = -1; i <= 1; i++){
            for(var j = -1; j <= 1; j++){
                //check only the vertically and horizontally adjacent beads, and not diagonal ones
                if((Math.abs(i) === 1 && Math.abs(j) === 0) || (Math.abs(i) === 0 && Math.abs(j) === 1)) {
                    var tiledata = worldMap[x+i][y+j];
                    //if there is a next spot to illuminate
                    //if the adjacent block is a power block
                    if(tiledata && tiledata.type === 'POWEREDVALVE'){
                        worldMap[x+i][y+j].open = false;
                    }
                }
            }
        }

    }

    function update(){
        //turn off all the lights
        for(var i = 0; i < worldMap.length; i++){
            for(var j = 0; j < worldMap[i].length; j++){
                var tiledata = worldMap[i][j];
                if(tiledata && tiledata.lightStrength && tiledata.type !== "LIGHT"){
                    tiledata.lightStrength = 0;
                    tiledata.powered = false;
                }
                else if(tiledata && tiledata.type === "POWERSOURCE"){
                    powerOff(i, j);
                }
            }
        }

        //turn on all the lights
        for(var i = 0; i < lights.length; i++){
            var l = lights[i];
            illuminate(l.x, l.y);
        }
        //TODO draw the correct part of the world
        drawPartOfWorld(worldPos.x,worldPos.y);
        setTimeout(checkCompletion, 1000);
    }

    function checkCompletion(){
        if(worldMap[55][31].lightStrength > 0){
            PS.touch = function(){};
            PS.fade(PS.ALL, PS.ALL, 120);
            PS.gridFade(120);
            PS.borderFade(PS.ALL, PS.ALL, 120);
            PS.color(PS.ALL, PS.ALL, PS.COLOR_WHITE);
            PS.gridColor(PS.COLOR_WHITE);
            PS.borderColor(PS.ALL, PS.ALL, PS.COLOR_WHITE);
        }
    }

    var exports = {
        constants:{
            GRIDSIZE:GRIDSIZE,
            LEVELSIZE:LEVELSIZE,
            MAXSTRENGTH:MAXSTRENGTH,
            LIGHTDECREMENT:LIGHTDECREMENT
        },
        worldPos:worldPos,
        loadWorldFromFile:loadWorldFromFile,
        drawPartOfWorld:drawPartOfWorld
    };
    return exports;
}());


// This is a template for creating new Perlenspiel games

// All of the functions below MUST exist, or the engine will complain!

// PS.init( system, options )
// Initializes the game
// This function should normally begin with a call to PS.gridSize( x, y )
// where x and y are the desired initial dimensions of the grid
// [system] = an object containing engine and platform information; see documentation for details
// [options] = an object with optional parameters; see documentation for details

var db = null;
var finalize = function(){

};

PS.init = function( system, options ) {
    "use strict";

    // Use PS.gridSize( x, y ) to set the grid to
    // the initial dimensions you want (32 x 32 maximum)
    // Do this FIRST to avoid problems!
    // Otherwise you will get the default 8x8 grid

    PS.gridSize(G.constants.GRIDSIZE, G.constants.GRIDSIZE );

    PS.gridColor(0x303030); // Perlenspiel gray
    PS.border(PS.ALL, PS.ALL, 0);
    G.loadWorldFromFile("world.txt");
    G.drawPartOfWorld(0,24);
    G.worldPos.y = 24;

    PS.statusColor(PS.COLOR_WHITE);
    PS.statusText("Connect");
    PS.gridColor(PS.COLOR_BLACK);
    PS.gridShadow( true, PS.COLOR_WHITE );

    PS.audioLoad("fx_click", { lock: true }); // load & lock click sound
    PS.audioPlay("missyou", {loop:true,path:"i"});

    if ( db ) {
        db = PS.dbInit( db, { login : finalize } );
        if ( db === PS.ERROR ) {
            db = null;
        }
    }
    else {
        finalize();
    }

    // Add any other initialization code you need here
};

// PS.touch ( x, y, data, options )
// Called when the mouse button is clicked on a bead, or when a bead is touched
// It doesn't have to do anything
// [x] = zero-based x-position of the bead on the grid
// [y] = zero-based y-position of the bead on the grid
// [data] = the data value associated with this bead, 0 if none has been set
// [options] = an object with optional parameters; see documentation for details

PS.touch = function( x, y, data, options ) {
    "use strict";
    var next;

    // Uncomment the following line to inspect parameters
    // PS.debug( "PS.touch() @ " + x + ", " + y + "\n" );

    // Change color of touched bed
    // The default [data] is 0, which equals PS.COLOR_BLACK

    // Play click sound
    if(data.hasOwnProperty('onClick')){
        data.onClick(x, y);
    PS.audioPlay( "fx_click" );
    }else if(PS.color(x,y) === PS.COLOR_YELLOW){
    	if(x === 0){
    		G.worldPos.x -= 12;
    	}else if (x === 15){
    		G.worldPos.x += 12;
    	}else if (y === 0){
    		G.worldPos.y -= 12;
    	}else if (y === 15){
    		G.worldPos.y += 12;
    	}
    		G.drawPartOfWorld(G.worldPos.x, G.worldPos.y);
    }

    // Add code here for mouse clicks/touches over a bead
};

// PS.release ( x, y, data, options )
// Called when the mouse button is released over a bead, or when a touch is lifted off a bead
// It doesn't have to do anything
// [x] = zero-based x-position of the bead on the grid
// [y] = zero-based y-position of the bead on the grid
// [data] = the data value associated with this bead, 0 if none has been set
// [options] = an object with optional parameters; see documentation for details

PS.release = function( x, y, data, options ) {
    "use strict";

    // Uncomment the following line to inspect parameters
    // PS.debug( "PS.release() @ " + x + ", " + y + "\n" );

    // Add code here for when the mouse button/touch is released over a bead
};

// PS.enter ( x, y, button, data, options )
// Called when the mouse/touch enters a bead
// It doesn't have to do anything
// [x] = zero-based x-position of the bead on the grid
// [y] = zero-based y-position of the bead on the grid
// [data] = the data value associated with this bead, 0 if none has been set
// [options] = an object with optional parameters; see documentation for details

PS.enter = function( x, y, data, options ) {
    "use strict";

    // Uncomment the following line to inspect parameters
    // PS.debug( "PS.enter() @ " + x + ", " + y + "\n" );

    // Add code here for when the mouse cursor/touch enters a bead
};

// PS.exit ( x, y, data, options )
// Called when the mouse cursor/touch exits a bead
// It doesn't have to do anything
// [x] = zero-based x-position of the bead on the grid
// [y] = zero-based y-position of the bead on the grid
// [data] = the data value associated with this bead, 0 if none has been set
// [options] = an object with optional parameters; see documentation for details

PS.exit = function( x, y, data, options ) {
    "use strict";

    // Uncomment the following line to inspect parameters
    // PS.debug( "PS.exit() @ " + x + ", " + y + "\n" );

    // Add code here for when the mouse cursor/touch exits a bead
};

// PS.exitGrid ( options )
// Called when the mouse cursor/touch exits the grid perimeter
// It doesn't have to do anything
// [options] = an object with optional parameters; see documentation for details

PS.exitGrid = function( options ) {
    "use strict";

    // Uncomment the following line to verify operation
    // PS.debug( "PS.exitGrid() called\n" );

    // Add code here for when the mouse cursor/touch moves off the grid
};

// PS.keyDown ( key, shift, ctrl, options )
// Called when a key on the keyboard is pressed
// It doesn't have to do anything
// [key] = ASCII code of the pressed key, or one of the following constants:
// Arrow keys = PS.ARROW_UP, PS.ARROW_DOWN, PS.ARROW_LEFT, PS.ARROW_RIGHT
// Function keys = PS.F1 through PS.F1
// [shift] = true if shift key is held down, else false
// [ctrl] = true if control key is held down, else false
// [options] = an object with optional parameters; see documentation for details

PS.keyDown = function( key, shift, ctrl, options ) {
    "use strict";

    // Uncomment the following line to inspect parameters
    //	PS.debug( "DOWN: key = " + key + ", shift = " + shift + "\n" );

    // Add code here for when a key is pressed
	//left is 1005
	//right is 1007
	//down is 1008
	//up is 1006
    //TODO make the view move around and make sure that you can't go out of the world

};

// PS.keyUp ( key, shift, ctrl, options )
// Called when a key on the keyboard is released
// It doesn't have to do anything
// [key] = ASCII code of the pressed key, or one of the following constants:
// Arrow keys = PS.ARROW_UP, PS.ARROW_DOWN, PS.ARROW_LEFT, PS.ARROW_RIGHT
// Function keys = PS.F1 through PS.F12
// [shift] = true if shift key is held down, false otherwise
// [ctrl] = true if control key is held down, false otherwise
// [options] = an object with optional parameters; see documentation for details

PS.keyUp = function( key, shift, ctrl, options ) {
    "use strict";

    // Uncomment the following line to inspect parameters
    // PS.debug( "PS.keyUp(): key = " + key + ", shift = " + shift + ", ctrl = " + ctrl + "\n" );

    // Add code here for when a key is released
};

// PS.swipe ( data, options )
// Called when a mouse/finger swipe across the grid is detected
// It doesn't have to do anything
// [data] = an object with swipe information; see documentation for details
// [options] = an object with optional parameters; see documentation for details

PS.swipe = function( data, options ) {
    "use strict";

    // Uncomment the following block to inspect parameters

	/*
	 var len, i, ev;
	 PS.debugClear();
	 PS.debug( "PS.swipe(): start = " + data.start + ", end = " + data.end + ", dur = " + data.duration + "\n" );
	 len = data.events.length;
	 for ( i = 0; i < len; i += 1 ) {
	 ev = data.events[ i ];
	 PS.debug( i + ": [x = " + ev.x + ", y = " + ev.y + ", start = " + ev.start + ", end = " + ev.end +
	 ", dur = " + ev.duration + "]\n");
	 }
	 */

    // Add code here for when an input event is detected
};

// PS.input ( sensors, options )
// Called when an input device event (other than mouse/touch/keyboard) is detected
// It doesn't have to do anything
// [sensors] = an object with sensor information; see documentation for details
// [options] = an object with optional parameters; see documentation for details

PS.input = function( sensors, options ) {
    "use strict";

    // Uncomment the following block to inspect parameters
	/*
	 PS.debug( "PS.input() called\n" );
	 var device = sensors.wheel; // check for scroll wheel
	 if ( device )
	 {
	 PS.debug( "sensors.wheel = " + device + "\n" );
	 }
	 */

    // Add code here for when an input event is detected
};

PS.shutdown = function( options ) {
    if ( db && PS.dbValid( db ) ) {
        PS.dbEvent( db, "shutdown", true );
        PS.dbSend( db, "bmoriarty", { discard : true } );
    }
};

