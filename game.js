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

    var MAXSTRENGTH = 20;
    var currentLevel;
    var currentLevelNumber;

    var tileColorMap = (function(){
        var map = new Map();
        map.set("WALL", PS.COLOR_BLACK);
        map.set("PATH", 0x444444);
        map.set("VALVE", 0x444444);
        map.set("LIGHT", PS.COLOR_WHITE);
        map.set("FORK", 0x444444);
        return map;
    }());
    var tileOnInitMap = (function () {
        var map = new Map();
        function voidfunc(x, y) {}
        map.set("WALL", voidfunc);
        map.set("PATH", voidfunc);
        map.set("VALVE", function (x, y) {
            this.open = false;
            PS.border(x, y, 12);   //Valve Border Size
            PS.borderColor(x,y,PS.DEFAULT);
        });
        map.set("LIGHT", voidfunc);
        map.set("FORK",function (x,y) {
            PS.borderColor(x,y,0x550000);
            PS.border(x,y, {bottom:5,left:5});
			PS.data(x,y)['isFacing'] = function (i, j) {
				var output = true;
                if( i > 0){
                    output = output && (PS.border(x,y).bottom > 0);
                }else if (i < 0){
                    output = output && (PS.border(x,y).top > 0);
                }
                if( j > 0){
                    output = output && (PS.border(x,y).right > 0);
                }else if (j < 0){
                    output = output && (PS.border(x,y).left > 0);
                }

                return output;
            }
        });
        return map;
    })();
    var tileOnClickMap = (function(){
        var map = new Map();
        function voidfunc(x, y) {}
        map.set("WALL", voidfunc);
        map.set("PATH", voidfunc);
        map.set("VALVE", function (x, y) {
            PS.borderFade(x,y,1);
            if(PS.border(x, y).width === 12){
                this.open = true;
                PS.border(x, y, 5);
            }else {
                this.open = false;
                PS.border(x, y, 12);   //Valve Border Size
            }
            update();
        });
        map.set("LIGHT", voidfunc);
        map.set("FORK",function (x,y) {
            var border = PS.border(x,y);
            var topTemp = border.top;
            border.top = border.left;
            border.left = border.bottom;
            border.bottom = border.right;
            border.right = topTemp;
            PS.border(x,y,border);
            update();
        })
        return map;
    }());

    //levels are 2d arrays, though js does not support 2d array, so using array of arrays
    //examples:
	/*
	 var levelX = [[],[],[],[],[],[],[],[],[],[],[],[]];
	 levelX[x][y] = {type:"PATH", lightStrength:0};
	 */
    //level0, or the starting level
    var level0 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[1][5] = {type: "LIGHT", lightStrength: MAXSTRENGTH};
        level[2][5] = {type: "VALVE", lightStrength: 0};
        level[3][5] = {type: "PATH", lightStrength: 0};
        level[4][5] = {type: "PATH", lightStrength: 0};
        level[5][5] = {type: "PATH", lightStrength: 0};
        level[6][5] = {type: "PATH", lightStrength: 0};
        level[7][5] = {type: "PATH", lightStrength: 0};
        level[8][5] = {type: "PATH", lightStrength: 0};
        level[9][5] = {type: "PATH", lightStrength: 0};
        level[10][5] = {type: "PATH", lightStrength: 0};
        level[11][5] = {type: "PATH", lightStrength: 0};
        return level;
    })();

    var level1 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[0][5] = {type: "PATH", lightStrength: 0};
        level[1][5] = {type: "VALVE", lightStrength: 0};
        level[2][5] = {type: "PATH", lightStrength: 0};
        level[2][4] = {type: "PATH", lightStrength: 0};
        level[2][3] = {type: "PATH", lightStrength: 0};
        level[2][2] = {type: "PATH", lightStrength: 0};
        level[3][2] = {type: "PATH", lightStrength: 0};
        level[4][2] = {type: "PATH", lightStrength: 0};
        level[5][2] = {type: "PATH", lightStrength: 0};
        level[6][2] = {type: "PATH", lightStrength: 0};
        level[7][2] = {type: "PATH", lightStrength: 0};
        level[8][2] = {type: "PATH", lightStrength: 0};
        level[9][2] = {type: "VALVE", lightStrength: 0};
        level[9][3] = {type: "PATH", lightStrength: 0};
        level[9][4] = {type: "PATH", lightStrength: 0};
        level[10][4] = {type: "PATH", lightStrength: 0};
        level[11][4] = {type: "PATH", lightStrength: 0};
        return level;
    })();

    var level2 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[0][4] = {type: "PATH", lightStrength: 0};
        level[1][4] = {type: "VALVE", lightStrength: 0};
        level[1][3] = {type: "PATH", lightStrength: 0};
        level[1][2] = {type: "PATH", lightStrength: 0};
        level[1][1] = {type: "PATH", lightStrength: 0};
        level[2][1] = {type: "PATH", lightStrength: 0};
        level[3][1] = {type: "PATH", lightStrength: 0};
        level[3][2] = {type: "PATH", lightStrength: 0};
        level[3][3] = {type: "PATH", lightStrength: 0};
        level[3][4] = {type: "PATH", lightStrength: 0};
        level[4][4] = {type: "VALVE", lightStrength: 0};
        level[5][4] = {type: "PATH", lightStrength: 0};
        level[5][3] = {type: "PATH", lightStrength: 0};
        level[5][2] = {type: "PATH", lightStrength: 0};
        level[5][1] = {type: "PATH", lightStrength: 0};
        level[6][1] = {type: "PATH", lightStrength: 0};
        level[7][1] = {type: "PATH", lightStrength: 0};
        level[7][2] = {type: "PATH", lightStrength: 0};
        level[7][3] = {type: "PATH", lightStrength: 0};
        level[7][4] = {type: "PATH", lightStrength: 0};
        level[8][4] = {type: "PATH", lightStrength: 0};
        level[9][4] = {type: "PATH", lightStrength: 0};
        level[9][3] = {type: "PATH", lightStrength: 0};
        level[9][2] = {type: "PATH", lightStrength: 0};
        level[9][1] = {type: "PATH", lightStrength: 0};
        level[10][1] = {type: "PATH", lightStrength: 0};
        level[11][1] = {type: "PATH", lightStrength: 0};
        level[3][5] = {type: "VALVE", lightStrength: 0};
        level[3][6] = {type: "PATH", lightStrength: 0};
        level[3][7] = {type: "PATH", lightStrength: 0};
        level[3][8] = {type: "PATH", lightStrength: 0};
        level[3][9] = {type: "PATH", lightStrength: 0};
        level[3][10] = {type: "PATH", lightStrength: 0};
        level[3][11] = {type: "PATH", lightStrength: 0};
        return level;
    })();

    var level3 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[11][6] = {type: "PATH", lightStrength: 0};
        level[10][6] = {type: "PATH", lightStrength: 0};
        level[3][3] = {type: "FORK", lightStrength: 0};
        level[4][3] = {type: "PATH", lightStrength: 0};
        level[5][3] = {type: "PATH", lightStrength: 0};
        level[6][3] = {type: "FORK", lightStrength: 0};
        level[7][3] = {type: "PATH", lightStrength: 0};
        level[8][3] = {type: "PATH", lightStrength: 0};
        level[9][3] = {type: "FORK", lightStrength: 0};
        level[3][4] = {type: "PATH", lightStrength: 0};
        level[3][5] = {type: "PATH", lightStrength: 0};
        level[6][4] = {type: "PATH", lightStrength: 0};
        level[6][5] = {type: "PATH", lightStrength: 0};
        level[9][4] = {type: "PATH", lightStrength: 0};
        level[9][5] = {type: "PATH", lightStrength: 0};

        level[3][6] = {type: "FORK", lightStrength: 0};
        level[4][6] = {type: "PATH", lightStrength: 0};
        level[5][6] = {type: "PATH", lightStrength: 0};
        level[6][6] = {type: "FORK", lightStrength: 0};
        level[7][6] = {type: "PATH", lightStrength: 0};
        level[8][6] = {type: "PATH", lightStrength: 0};
        level[9][6] = {type: "FORK", lightStrength: 0};
        level[3][7] = {type: "PATH", lightStrength: 0};
        level[3][8] = {type: "PATH", lightStrength: 0};
        level[6][7] = {type: "PATH", lightStrength: 0};
        level[6][8] = {type: "PATH", lightStrength: 0};
        level[9][7] = {type: "PATH", lightStrength: 0};
        level[9][8] = {type: "PATH", lightStrength: 0};

        level[3][9] = {type: "PATH", lightStrength: 0};
        level[4][9] = {type: "PATH", lightStrength: 0};
        level[5][9] = {type: "PATH", lightStrength: 0};
        level[6][9] = {type: "FORK", lightStrength: 0};
        level[7][9] = {type: "PATH", lightStrength: 0};
        level[8][9] = {type: "PATH", lightStrength: 0};
        level[9][9] = {type: "FORK", lightStrength: 0};
        level[3][10] = {type: "PATH", lightStrength: 0};
        level[3][11] = {type: "PATH", lightStrength: 0};

        return level;
    })();

    var level4 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[11][6] = {type: "PATH", lightStrength: 0};
        level[10][6] = {type: "PATH", lightStrength: 0};
        level[9][6] = {type: "FORK", lightStrength: 0};
        level[8][6] = {type: "PATH", lightStrength: 0};
        level[7][6] = {type: "PATH", lightStrength: 0};
        level[6][6] = {type: "PATH", lightStrength: 0};
        level[5][6] = {type: "PATH", lightStrength: 0};
        level[4][6] = {type: "PATH", lightStrength: 0};
        level[3][6] = {type: "PATH", lightStrength: 0};
        level[2][6] = {type: "FORK", lightStrength: 0};
        level[1][6] = {type: "PATH", lightStrength: 0};
        level[0][6] = {type: "PATH", lightStrength: 0};
        level[9][2] = {type: "FORK", lightStrength: 0};
        level[8][2] = {type: "PATH", lightStrength: 0};
        level[7][2] = {type: "PATH", lightStrength: 0};
        level[6][2] = {type: "PATH", lightStrength: 0};
        level[5][2] = {type: "PATH", lightStrength: 0};
        level[4][2] = {type: "PATH", lightStrength: 0};
        level[3][2] = {type: "PATH", lightStrength: 0};
        level[2][2] = {type: "FORK", lightStrength: 0};
        level[9][5] = {type: "PATH", lightStrength: 0};
        level[9][4] = {type: "PATH", lightStrength: 0};
        level[9][3] = {type: "PATH", lightStrength: 0};
        level[9][1] = {type: "PATH", lightStrength: 0};
        level[2][5] = {type: "PATH", lightStrength: 0};
        level[2][4] = {type: "PATH", lightStrength: 0};
        level[2][3] = {type: "PATH", lightStrength: 0};
        level[2][1] = {type: "PATH", lightStrength: 0};
        level[1][2] = {type: "PATH", lightStrength: 0};
        level[10][2] = {type: "PATH", lightStrength: 0};

        level[9][9] = {type: "PATH", lightStrength: 0};
        level[8][9] = {type: "FORK", lightStrength: 0};
        level[7][9] = {type: "PATH", lightStrength: 0};
        level[6][9] = {type: "PATH", lightStrength: 0};
        level[5][9] = {type: "PATH", lightStrength: 0};
        level[4][9] = {type: "PATH", lightStrength: 0};
        level[3][9] = {type: "FORK", lightStrength: 0};
        level[2][9] = {type: "PATH", lightStrength: 0};
        level[3][8] = {type: "PATH", lightStrength: 0};
        level[3][10] = {type: "PATH", lightStrength: 0};
        level[3][11] = {type: "PATH", lightStrength: 0};
        level[8][8] = {type: "PATH", lightStrength: 0};
        level[8][10] = {type: "PATH", lightStrength: 0};
        level[8][11] = {type: "PATH", lightStrength: 0};
        return level;
    })();

    var level5 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[3][0] = {type: "PATH", lightStrength: 0};
        level[3][1] = {type: "VALVE", lightStrength: 0};
        level[3][2] = {type: "PATH", lightStrength: 0};
        level[3][3] = {type: "PATH", lightStrength: 0};
        level[3][4] = {type: "PATH", lightStrength: 0};
        level[3][5] = {type: "PATH", lightStrength: 0};
        level[3][6] = {type: "FORK", lightStrength: 0};
        level[4][6] = {type: "PATH", lightStrength: 0};
        level[5][6] = {type: "PATH", lightStrength: 0};
        level[6][6] = {type: "PATH", lightStrength: 0};
        level[7][6] = {type: "PATH", lightStrength: 0};
        level[8][6] = {type: "PATH", lightStrength: 0};
        level[9][6] = {type: "PATH", lightStrength: 0};
        level[10][6] = {type: "PATH", lightStrength: 0};
        level[2][6] = {type: "PATH", lightStrength: 0};
        level[1][6] = {type: "PATH", lightStrength: 0};
        level[0][6] = {type: "PATH", lightStrength: 0};
        return level;
    })();

    var level6 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[3][0] = {type: "PATH", lightStrength: 0};
        level[3][1] = {type: "VALVE", lightStrength: 0};
        level[3][2] = {type: "PATH", lightStrength: 0};
        level[3][3] = {type: "PATH", lightStrength: 0};
        level[4][3] = {type: "PATH", lightStrength: 0};
        level[5][3] = {type: "PATH", lightStrength: 0};
        level[6][3] = {type: "PATH", lightStrength: 0};
        level[7][3] = {type: "PATH", lightStrength: 0};
        level[8][3] = {type: "PATH", lightStrength: 0};
        level[9][3] = {type: "PATH", lightStrength: 0};
        level[10][3] = {type: "PATH", lightStrength: 0};
        level[11][3] = {type: "PATH", lightStrength: 0};
        return level;
    })();

    var level7 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[0][3] = {type: "PATH", lightStrength: 0};
        level[1][3] = {type: "VALVE", lightStrength: 0};
        level[2][3] = {type: "PATH", lightStrength: 0};
        level[3][3] = {type: "PATH", lightStrength: 0};
        level[3][2] = {type: "PATH", lightStrength: 0};
        level[3][1] = {type: "PATH", lightStrength: 0};
        level[3][0] = {type: "PATH", lightStrength: 0};

        level[8][0] = {type: "PATH", lightStrength: 0};
        level[8][1] = {type: "VALVE", lightStrength: 0};
        level[8][2] = {type: "PATH", lightStrength: 0};
        level[8][3] = {type: "PATH", lightStrength: 0};

        for(var i = 6; i <= 10; i++){
        	for(var j = 4; j <= 8; j++){
                level[i][j] = {type: "FORK", lightStrength: 0};
			}
		}
        level[11][6] = {type: "PATH", lightStrength: 0};

        return level;
    })();

    var level8 = (function () {
        var level = [[], [], [], [], [], [], [], [], [], [], [], []];
        level[0][6] = {type: "PATH", lightStrength: 0};
        level[1][6] = {type: "VALVE", lightStrength: 0};
        for(var i = 2; i < 10; i++){
			for(var j = 2; j < 10; j++){
				level[i][j] = {type: "PATH", lightStrength: 0};
			}
		}
        return level;
    })();

    //array containing all of the levels
	//would it be easier to make it 2D array?
    var levels = [level0, level1, level2,
				  level3, level4, level5,
        		  level6, level7, level8];
    //draws the specified level
    function drawLevel(level){
        currentLevel = levels[level];

        //reset the grid
		for(var i = 0; i < LEVELSIZE; i++){
			for(var j = 0; j < LEVELSIZE; j++){
				PS.border(LEVELOFFSET.x+i, LEVELOFFSET.y+j, 0);
				PS.data(LEVELOFFSET.x+i, LEVELOFFSET.y+j, {type: "WALL", lightStrength: 0});
			}
		}

        //draw every bead of the level
        for(var i = 0; i < LEVELSIZE; i++){
            for(var j = 0; j < LEVELSIZE; j++) {
                //if there is data there then draw, the correct thing
                //also put in the data for the data field

                var x = LEVELOFFSET.x + i;
                var y = LEVELOFFSET.y + j;

                if(currentLevel[i][j]){

                    //Add the appropriate onclick functionality of the bead.
                    var tileData = currentLevel[i][j];
                    if(tileOnClickMap.has(tileData.type)){
                        tileData['onClick']= tileOnClickMap.get(tileData.type);
                    }
                    PS.data(x, y, tileData);

                    //Initialize each bead
                    if(tileOnInitMap.has(tileData.type)){
                        tileData['init']=tileOnInitMap.get(tileData.type);
                        tileData.init(x,y);
                    }

                    //if the bead is a light bead, set it to illuminate after level loads
                    if(currentLevel[i][j].type === "LIGHT"){
                        illuminate(i, j);
                    }

                    //TODO fix the color to show lightstrength at the level load
                    if(tileData && tileData.lightStrength > 0){
                        PS.color(x, y, 0xFFFFFF - (MAXSTRENGTH - tileData.lightStrength) * 0x070707);
                    }
                    else {
                        PS.color(x, y, tileColorMap.get(currentLevel[i][j].type));
                    }

                }
                //else make it black
                else {
                    PS.color(x, y, tileColorMap.get("WALL"));
                }
            }
        }
    }

    //shallow copy, meaning that you can manipulate currentLevel, and the state will be saved
    //given a bead location, will illuminate those around it an recursively call itself until all is lit
    function illuminate(x, y){
        //illuminate to the right
		var litData = PS.data(LEVELOFFSET.x + x, LEVELOFFSET.y + y);
        var strength = litData.lightStrength;

        for(var i = -1; i <= 1; i++){
            for(var j = -1; j <= 1; j++){
            	if(litData.type === 'FORK' && !litData.isFacing(-j,-i)){
					continue;
				}

                //check only the directly adjacent beads, and not diagonal ones
                if((Math.abs(i) === 1 && Math.abs(j) === 0) || (Math.abs(i) === 0 && Math.abs(j) === 1)) {
                    var tiledata = PS.data(LEVELOFFSET.x + x + i, LEVELOFFSET.y + y + j);
                    if ((tiledata.type === 'PATH' || (tiledata.type === 'VALVE' && tiledata.open)
						||(tiledata.type === 'FORK' && tiledata.isFacing(j,i)))
                        && tiledata.lightStrength < strength - 1) {

                        //set the bead light strength and change the beads color
                        tiledata.lightStrength = strength - 1;
                        currentLevel[x + i][y + j].lightStrength = strength - 1;
                        //this is where it assigns the color
                        PS.color(LEVELOFFSET.x + x + i, LEVELOFFSET.y + y + j,
                            0xFFFFFF - (MAXSTRENGTH - tiledata.lightStrength) * 0x070707);
                        illuminate( x + i, y + j);
                    }
                }
            }
        }
    }

    function update(){
        var i, j, l;

        var lights = [];
        for(i = 0 ; i < currentLevel.length; i++){
            for(j = 0; j < currentLevel.length; j++){
                var x,y;
                x = LEVELOFFSET.x + i;
                y = LEVELOFFSET.y + j;
                if(PS.data(x,y).type === 'LIGHT'){
                    lights.push({x:x, y:y});
                }else if(PS.data(x,y).lightStrength){
                    var tiledata = currentLevel[i][j];
                    tiledata.lightStrength = 0;
                    PS.data(x,y,tiledata);
                    PS.color(x,y,0x444444);
                }
            }
        }


        l = lights.pop();
        while (l) {
            illuminate(l.x - LEVELOFFSET.x, l.y - LEVELOFFSET.y);
            l = lights.pop();
        }
		checkCompletion();
    }

    //checks completion of a level by checking its borders and applying changes accordingly
    function checkCompletion(){
		//check the borders to see if they have any light
		//right border
        for(var i = 0; i < LEVELSIZE; i++){
            var beadData = currentLevel[LEVELSIZE-1][i];
            if(beadData && beadData.lightStrength > 0 && beadData.type !== "LIGHT"){
            	levels[G.currentLevelNumber+1][0][i] = {type: "LIGHT", lightStrength: MAXSTRENGTH};
            }
        }
        //left border
        for(var i = 0; i < LEVELSIZE; i++){
            var beadData = currentLevel[0][i];
            if(beadData && beadData.lightStrength > 0 && beadData.type !== "LIGHT"){
                levels[G.currentLevelNumber-1][LEVELSIZE-1][i] = {type: "LIGHT", lightStrength: MAXSTRENGTH};
            }
        }
        //bottom border
        for(var i = 0; i < LEVELSIZE; i++){
            var beadData = currentLevel[i][LEVELSIZE-1];
            if(beadData && beadData.lightStrength > 0 && beadData.type !== "LIGHT"){
                levels[G.currentLevelNumber+3][i][0] = {type: "LIGHT", lightStrength: MAXSTRENGTH};
            }
        }
        //top border
        for(var i = 0; i < LEVELSIZE; i++){
            var beadData = currentLevel[i][0];
            if(beadData && beadData.lightStrength > 0 && beadData.type !== "LIGHT"){
                levels[G.currentLevelNumber-3][i][LEVELSIZE-1] = {type: "LIGHT", lightStrength: MAXSTRENGTH};
            }
        }

        //check completion of the game
        if(currentLevel === level8 && currentLevel[9][2].lightStrength > 0) {
            if (db && PS.dbValid(db)) {
                PS.dbEvent(db, "gameover", true);
                PS.dbSend(db, "bmoriarty", {discard: true});
                db = null;
            }
        }
	}

    var exports = {
        constants:{
            GRIDSIZE:GRIDSIZE,
            LEVELSIZE:LEVELSIZE
        },
        currentLevel:currentLevel,
        levels:levels,
        update:update,
        DrawLevel:drawLevel
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

    PS.statusColor(PS.COLOR_WHITE);
    PS.statusText("Touch any bead");

    PS.audioLoad("fx_click", { lock: true }); // load & lock click sound
	G.currentLevelNumber = 0;
    G.DrawLevel(G.currentLevelNumber);

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
    PS.audioPlay( "fx_click" );
    if(data.hasOwnProperty('onClick')){
        data.onClick(x, y);
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
	switch(key){
		case PS.KEY_ARROW_RIGHT:
			//if not one of the rightmost levels
			if((G.currentLevelNumber+1)%3 !== 0) {
                G.currentLevelNumber += 1;
                G.DrawLevel(G.currentLevelNumber);
            }
			break;
		case PS.KEY_ARROW_LEFT:
			//if not one of the leftmost levels
			if(G.currentLevelNumber%3 !== 0){
				G.currentLevelNumber -= 1;
				G.DrawLevel(G.currentLevelNumber);
			}
			break;
		case PS.KEY_ARROW_DOWN:
			if(G.currentLevelNumber < 6){
				G.currentLevelNumber += 3;
				G.DrawLevel(G.currentLevelNumber);
			}
			break;
        case PS.KEY_ARROW_UP:
            if(G.currentLevelNumber > 2){
                G.currentLevelNumber -= 3;
                G.DrawLevel(G.currentLevelNumber);
            }
            break;
		default:
			break;
	}
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

