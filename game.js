
// directions for moving entities
var keys = {
	37: 'left',
	38: 'up',
	39: 'right',
	40: 'down'
};

var levelFileNames = [
	'blocks.js',
    'levelTwo.js',
    'multiplicity.js',
	'traps.js',
];

var display;
var editor;
var map;
var currentLevel = 0; //level numbers start at 0 because coding :\

var dimensions = {
	width: 50,
	height: 25
};

var Map = function () {
	this.reset = function () {
		display.clear();
		this._grid = new Array(dimensions.width);
		for (var x = 0; x < dimensions.width; x++) {
			this._grid[x] = new Array(dimensions.height);
			for (var y = 0; y < dimensions.height; y++) {
				this._grid[x][y] = 'empty';
			}
		}
	};

	this.getWidth = function () { return dimensions.width; }
	this.getHeight = function () { return dimensions.height; }

	this.placeObject = function (x, y, type, bgColor) {
		this._grid[x][y] = type;
		display.drawObject(x, y, type, bgColor);
	};

	this.setSquareColor = function (x, y, bgColor) {
		display.drawObject(x, y, this._grid[x][y], bgColor);
	};

	// Initialize with empty grid
	this.reset();
};

var objects = {
	'empty' : {
		'symbol': ' ',
		'passable': true
	},
	'block': {
		'symbol': '#',
		'color': '#f00',
		'passable': false
	},
	'tree': {
		'symbol': '♣',
		'color': '#080',
		'passable': false
	},
	'trap': {
		'symbol': ' ',
		'passable': true,
		'onCollision': function (player) {
			player.killedBy('an invisible trap');
		}
	},
    'exit' : {
        'symbol' : String.fromCharCode(0x2588),
        'color': '#0ff',
        'passable': true,
		'onCollision': function (player) {
			moveToNextLevel();
		}
    },

    'player' : {
        'symbol' : '@',
        'color' : '#0f0',
        'passable' : false
    }
};

var Player = function(x,y) {
	this._x = x;
	this._y = y;
	this._rep = "@";
	this._fgColor = "#0f0";
	this.draw();

}

Player.prototype.draw = function () {
	display.draw(this._x, this._y, this._rep, this._fgColor);
}

Player.prototype.atLocation = function (x, y) {
    return (this._x === x && this._y === y);
}

Player.prototype.move = function (direction) {
	var cur_x = this._x;
	var cur_y = this._y;
	var new_x;
	var new_y;

	if (direction === 'up') {
		new_x = cur_x;
		new_y = cur_y - 1;
	}
	else if (direction === 'down') {
		new_x = cur_x;
		new_y = cur_y + 1;
	}
	else if (direction === 'left') {
		new_x = cur_x - 1;
		new_y = cur_y;
	}
	else if (direction === 'right') {
		new_x = cur_x + 1;
		new_y = cur_y;
	}

	if (canMoveTo(new_x, new_y)) {
		display.drawObject(cur_x,cur_y, map._grid[cur_x][cur_y]);
		this._x = new_x;
		this._y = new_y;
		this.draw();
        if (objects[map._grid[new_x][new_y]].onCollision) {
        	objects[map._grid[new_x][new_y]].onCollision(this);
        }
	}
	else {
		console.log("Can't move to " + new_x + ", " + new_y + ", reported from inside Player.move() method");
	}
};

Player.prototype.killedBy = function (killer) {
	alert('You have been killed by ' + killer + '!');
	getLevel(currentLevel);
}

function moveToNextLevel() {
    console.log("On exit square!");
    currentLevel++;
    getLevel(currentLevel);
};

function canMoveTo(x,y) {
    if (x < 0 || x >= dimensions.width || y < 0 || y >= dimensions.height) {
        return false;
    }

	return objects[map._grid[x][y]].passable;
}

function init() {
	display = new ROT.Display({width: dimensions.width, height: dimensions.height,
        fontSize: 20, fontStyle: "bold"});

    // drawObject takes care of looking up an object's symbol and color
    // according to name (NOT according to the actual object literal!)
    display.drawObject = function (x, y, object, bgColor) {
        var symbol = objects[object].symbol;
        var color;
        if (objects[object].color) {
            color = objects[object].color;
        } else {
            color = "#fff";
        }

        if (!bgColor) {
        	bgColor = "#000";
        }

        display.draw(x, y, symbol, color, bgColor);
    };

	$('#screen').append(display.getContainer());

    // required so all canvas elements can detect keyboard events
	$("canvas").attr("contentEditable", "true");
	display.getContainer().addEventListener("keydown", function(e) {
		if (keys[e.keyCode]) {
			map.player.move(keys[e.keyCode]);
		}
	});
	display.getContainer().addEventListener("click", function(e) {
		$(display.getContainer()).addClass('focus');
		$('.CodeMirror').removeClass('focus');
	});

	map = new Map();

    getLevel(currentLevel);
}

// makes an ajax request to get the level text file and
// then loads it into the game
function getLevel(levelNumber) {
    var fileName;
    if (levelNumber < levelFileNames.length) {
        fileName = levelFileNames[levelNumber];
    }
    else {
        fileName = "dummyLevel.js";
    }
	$.get('levels/' + fileName, function (codeText) {
        if (editor) {
            editor.toTextArea();
        }
		loadLevel(codeText);
	});
}

function loadLevel(lvlCode) {
	// initialize CodeMirror editor
	editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
		theme: 'vibrant-ink',
		lineNumbers: true,
		dragDrop: false,
		extraKeys: {'Enter': function () {}}
	});
	editor.setSize(600, 500);
	editor.on("focus", function(instance) {
		$('.CodeMirror').addClass('focus');
		$('#screen canvas').removeClass('focus');
	});

	// load and initialize level
	editor.setValue(lvlCode);
	evalLevelCode();

	// get editable line ranges from level metadata
	levelMetadata = editor.getLine(0);
	editableLineRanges = JSON.parse(levelMetadata.slice(3)).editable;
	editableLines = [];
	for (var j = 0; j < editableLineRanges.length; j++) {
		range = editableLineRanges[j];
		for (var i = range[0]; i <= range[1]; i++) {
			editableLines.push(i - 1);
		}
	}
	editor.removeLine(0);

	// only allow editing on editable lines, and don't allow removal of lines
	editor.on('beforeChange', function (instance, change) {
		if (editableLines.indexOf(change.to.line) == -1 || change.to.line != change.from.line) {
			change.cancel();
		}
	});

	// set bg color for uneditable line
	editor.on('update', function (instance) {
		for (var i = 0; i < editor.lineCount(); i++) {
			if (editableLines.indexOf(i) == -1) {
				line = $('.CodeMirror-lines').children().first().children().eq(2).children().eq(i);
				line.addClass('disabled');
			}
		}
	});
	editor.refresh();
}

function evalLevelCode() {
    var playerCode = editor.getValue();
    if (validate(playerCode, currentLevel)) {
        eval(editor.getValue());
        map.reset();
        startLevel(map);
    }
}
