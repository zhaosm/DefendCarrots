/**
 * Created by zhaoshangming on 17/7/24.
 */
let $window = $(window);
let stageWidth = $window.width();
let stageHeight = $window.height();

let $canvas = $('canvas');
$canvas.attr("width", stageWidth + "");
$canvas.attr('height', stageHeight + "");

let stage, queue, monsterTimer = 0, backgroundWidth, backgroundHeight;
let landWidth = 0.08 * stageWidth;
let scaleFactor = null, monsters = [], bottles = [], row = 7, col = 12;
let background;
let life = 10, coins = 5000;
let container;

let terrainBound = {
    leftTop: {x: 0.0, y: 0.12},
    rightTop: {x: 1.0, y: 0.12},
    leftBottom: {x: 0.0, y: 1.0},
    rightBottom: {x: 1.0, y: 1.0}
};
let land = [
    {row: 1, col: 1},
    {row: 5, col: 1},
    {row: 5, col: 3},
    {row: 3, col: 3},
    {row: 3, col: 7},
    {row: 5, col: 7},
    {row: 5, col: 9},
    {row: 1, col: 9},
    {row: 1, col: 3}
];
let barrier = [
    {row: 6, col: 0},
    {row: 6, col: 1},
    {row: 6, col: 8},
    {row: 6, col: 9},
    {row: 6, col: 10}
];
let terrain = [];
// let land = [
//     {x: 0.13, y: 0.31},
//     {x: 0.13, y: 0.81},
//     {x: 0.37, y: 0.81},
//     {x: 0.37, y: 0.56},
//     {x: 0.7, y: 0.56},
//     {x: 0.7, y: 0.81},
//     {x: 0.88, y: 0.81},
//     {x: 0.88, y: 0.31},
//     {x: 0.37, y: 0.31}
// ];

function init() {
    stage = new createjs.Stage("myCanvas");
    let manifest = [
        {src: 'image/background.png', id: 'background'},
        {src: 'image/monster.png', id: 'monster'},
        {src: 'image/bottle.png', id: 'bottle'}
    ];
    queue = new createjs.LoadQueue();
    queue.on('complete', handleComplete);
    queue.loadManifest(manifest);
}

function handleComplete() {
    showStage();
    setControllers();
    startGame();
}

function showStage() {
    let backgroundsrc = queue.getResult('background');
    background = new createjs.Bitmap(backgroundsrc);
    backgroundWidth = backgroundsrc.width;
    backgroundHeight = backgroundsrc.height;
    scaleFactor = Math.min(stage.canvas.width / backgroundsrc.width, stage.canvas.height / backgroundsrc.height);
    // realBackgroundWidth = backgroundsrc.width * scaleFactor;
    // realBackgroundHeight = backgroundsrc.height * scaleFactor;
    // realLandWidth = realBackgroundWidth * landWidth;

    // terrainWidth = (terrain.rightTop.x - terrain.leftTop.x) * backgroundsrc.width;
    // terrainHeight = (terrain.leftBottom.y - terrain.rightBottom.y) * backgroundsrc.height;

    container = new createjs.Container();
    container.addChild(background);
    container.scaleX = 0.3;
    container.scaleY = 0.3;
    stage.addChild(container);
}

function generateTerrain() {
    let topX = terrainBound.leftTop.x, topY = terrainBound.leftTop.y, landLen = land.length, berrierNum = barrier.length;
    for (let i = 0;i < row;i++) {
        terrain[i] = new Array(col);
    }
    for (let i = 0;i < landLen - 1;i++) {
        if (land[i].row === land[i + 1].row) {
            // horizonal
            for (let j = Math.min(land[i].col, land[i + 1].col);j <= Math.max(land[i].col, land[i + 1].col);j++) {
                let pos = getTerrainCellLeftTop(i, j);
                terrain[i][j] = {type: 'land', status: 'unavailable', x: pos.x, y: pos.y};
            }
        }
        else if (land[i].col === land[i + 1].col) {
            for (let j = Math.min(land[i].row, land[i + 1].row); j <= Math.max(land[i].row, land[i + 1].row); j++) {
                let pos = getTerrainCellLeftTop(j, i);
                terrain[j][i] = {type: 'land', status: 'unavailable', x: pos.x, y: pos.y};
            }
        }
    }
    for (let b of barrier) {
        let pos = getCellLeftTop(b.row, b.col);
        terrain[b.row][b.col] = {type: 'barrier', status: 'unavailable', x: pos.x, y: pos.y};
    }
}

// function modifyScale(img, scaleFactor) {
//     img.scaleX = scaleFactor;
//     img.scaleY = scaleFactor;
// }

function setControllers() {
    // background.addEventListener("click", tryBuidingTower);
}

function startGame() {
    createjs.Ticker.setFPS(60);
    createjs.Ticker.addEventListener('tick', update);
}

function update() {
    // update
    monsterTimer++;
    if (monsterTimer % 100 === 0) generateMonster();






    stage.update();
}

function monsterUpdate() {
    /*
    * 生成怪物
    */
}

function towerUpdate() {
    /*
    * 找怪物，产生子弹*/
}

function bulletUpdate() {
    /*
    * 遍历子弹数组，更新每个子弹，检查每个子弹是否打到了怪物/障碍物，更新怪物/障碍物血量，如果血量<0删除
    * */
}

function carrotUpdate() {
    /*
    * 根据萝卜的命播放相应的动画*/
}


function navBarUpdate() {

}

function deleteMonster(monster) {

}

function generateMonster() {
    let monstersrc = queue.getResult('monster');
    let monster = new createjs.Bitmap(monstersrc);
    // modifyScale(monster, scaleFactor);
    let dy = monstersrc.height - landWidth / 2;
    monster.x = land[0].x * backgroundWidth - monstersrc.width / 2;
    monster.y = land[0].y * backgroundHeight - monstersrc.height / 2;
    createjs.Tween.get(monster, {loop: true}).to({y: land[1].y * backgroundHeight - dy}, 1000)
        .to({x: land[2].x * backgroundWidth - monstersrc.width / 2}, 1000)
        .to({y: land[3].y * backgroundHeight - dy}, 1000)
        .to({x: land[4].x * backgroundWidth - monstersrc.width / 2}, 1000)
        .to({y: land[5].y * backgroundHeight - dy}, 1000)
        .to({x: land[6].x * backgroundWidth - monstersrc.width / 2}, 1000)
        .to({y: land[7].y * backgroundHeight - dy}, 1000)
        .to({x: land[8].x * backgroundWidth - monstersrc.width / 2}, 1000)
        .call();
    monsters.push(monster);
    container.addChild(monster);
}

function tryBuidingTower(event) {
    alert("clicked background");
    let x = event.stageX, y = event.stageY;
    for (let point of land) {
        if (Math.abs(x - point.x * realBackgroundWidth) < realLandWidth / 2 || Math.abs(y - point.y * realBackgroundHeight) < realLandWidth / 2) return;
    }
    let bottlesrc = queue.getResult('bottle');
    let realBottleWidth = bottlesrc.width * scaleFactor;
    let realBottleHeight = bottlesrc.height * scaleFactor;
    let bottle = new createjs.Bitmap(bottlesrc);
    modifyScale(bottle, scaleFactor);
    bottle.x = x - realBottleWidth / 2;
    bottle.y = y - realBottleHeight / 2;
    bottles.push(bottle);
    container.addChild(bottle);
}

function getTerrainCellLeftTop(r, c) {
    // return the x, y coordinate of the cell on row r, col c
    let x = ((terrain.rightTop - terrain.leftTop) / col * c + terrain.leftTop.x) * stageHeight;
    let y = ((terrain.leftBottom - terrain.leftTop) / row * r + terrain.leftTop.y) * stageWidth;
    return {x: x, y: y};
}



