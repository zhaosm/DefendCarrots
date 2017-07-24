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
let scaleFactor = null, monsters = [], towers = [], row = 7, col = 12;
let background;
let life = 10, coins = 5000;
let container;
let cellWidth, cellHeight;

let terrainBound = {
    leftTop: {x: 0.0, y: 0.12},
    rightTop: {x: 1.0, y: 0.12},
    leftBottom: {x: 0.0, y: 1.0},
    rightBottom: {x: 1.0, y: 1.0}
};
let land = [
    {row: 1, col: 1},
    {row: 5, col: 1},
    {row: 5, col: 4},
    {row: 3, col: 4},
    {row: 3, col: 8},
    {row: 5, col: 8},
    {row: 5, col: 10},
    {row: 1, col: 10},
    {row: 1, col: 4}
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
    cellWidth = (terrainBound.rightTop.x - terrainBound.leftTop.x) / col * backgroundWidth;
    cellHeight = (terrainBound.leftBottom.y - terrainBound.leftTop.y) / row * backgroundHeight;
    generateTerrain();
    scaleFactor = Math.min(stage.canvas.width / backgroundsrc.width, stage.canvas.height / backgroundsrc.height);
    // realBackgroundWidth = backgroundsrc.width * scaleFactor;
    // realBackgroundHeight = backgroundsrc.height * scaleFactor;
    // realLandWidth = realBackgroundWidth * landWidth;

    // terrainWidth = (terrain.rightTop.x - terrain.leftTop.x) * backgroundsrc.width;
    // terrainHeight = (terrain.leftBottom.y - terrain.rightBottom.y) * backgroundsrc.height;

    container = new createjs.Container();
    container.addChild(background);
    container.scaleX = scaleFactor;
    container.scaleY = scaleFactor;
    stage.addChild(container);
}

function generateTerrain() {
    let topX = terrainBound.leftTop.x, topY = terrainBound.leftTop.y, landLen = land.length, berrierNum = barrier.length;
    for (let i = 0;i < row;i++) {
        terrain[i] = new Array(col);
        for (let j = 0;j < col;j++) {
            let center = getTerrainCellCenter(i, j);
            terrain[i][j] = {type: 'openSpace', status: 'available', center: center};
        }
    }
    for (let i = 0;i < landLen - 1;i++) {
        if (land[i].row === land[i + 1].row) {
            // horizonal
            for (let j = Math.min(land[i].col, land[i + 1].col); j <= Math.max(land[i].col, land[i + 1].col); j++) {
                terrain[land[i].row][j].type = 'land';
                terrain[land[i].row][j].status = 'unavailable';
            }
        }
        else if (land[i].col === land[i + 1].col) {
            for (let j = Math.min(land[i].row, land[i + 1].row); j <= Math.max(land[i].row, land[i + 1].row); j++) {
                terrain[j][land[i].col].type = 'land';
                terrain[j][land[i].col].status = 'unavailable';
            }
        }
    }
    for (let b of barrier) {
        terrain[b.row][b.col].type = 'barrier';
        terrain[b.row][b.col].status = 'unavailable';
    }
}

// function modifyScale(img, scaleFactor) {
//     img.scaleX = scaleFactor;
//     img.scaleY = scaleFactor;
// }

function setControllers() {
    background.addEventListener("click", tryBuidingTower);
}

function startGame() {
    createjs.Ticker.setFPS(60);
    createjs.Ticker.addEventListener('tick', update);
}

function update() {
    // update
    updateMonster();


    stage.update();
}

function updateMonster() {
    /*
    * 生成怪物
    */
    monsterTimer++;
    if (monsterTimer % 100 === 0) generateMonster();
}

function updateTower() {
    /*
    * 找怪物，产生子弹*/
}

function updateBullet() {
    /*
    * 遍历子弹数组，更新每个子弹，检查每个子弹是否打到了怪物/障碍物，更新怪物/障碍物血量，如果血量<0删除
    * */
}

function updateCarrot() {
    /*
    * 根据萝卜的命播放相应的动画*/
}


function updateNavbar() {

}

function deleteMonster(monster) {

}

function generateMonster() {
    let monstersrc = queue.getResult('monster');
    let monster = new createjs.Bitmap(monstersrc);
    // modifyScale(monster, scaleFactor);
    let dy = monstersrc.height - cellHeight / 2;
    monster.x = getLeftTopCoorinate(getTerrainCellCenter(land[0].row, land[0].col), monstersrc.width, monstersrc.height).x;
    monster.y = getTerrainCellCenter(land[0].row, land[0].col).y - dy;
    createjs.Tween.get(monster, {loop: true}).to({y: getTerrainCellCenter(land[1].row, land[1].col).y - dy}, 1000)
        .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[2].row, land[2].col), monstersrc.width, monstersrc.height).x}, 1000)
        .to({y: getTerrainCellCenter(land[3].row, land[3].col).y - dy}, 1000)
        .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[4].row, land[4].col), monstersrc.width, monstersrc.height).x}, 1000)
        .to({y: getTerrainCellCenter(land[5].row, land[5].col).y - dy}, 1000)
        .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[6].row, land[6].col), monstersrc.width, monstersrc.height).x}, 1000)
        .to({y: getTerrainCellCenter(land[7].row, land[7].col).y - dy}, 1000)
        .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[8].row, land[8].col), monstersrc.width, monstersrc.height).x}, 1000);
    monsters.push(monster);
    container.addChild(monster);
}

function tryBuidingTower(event) {
    // alert("clicked background");
    let x = event.stageX, y = event.stageY;
    // for (let point of land) {
    //     if (Math.abs(x - point.x * realBackgroundWidth) < realLandWidth / 2 || Math.abs(y - point.y * realBackgroundHeight) < realLandWidth / 2) return;
    // }
    // let bottlesrc = queue.getResult('bottle');
    // let realBottleWidth = bottlesrc.width * scaleFactor;
    // let realBottleHeight = bottlesrc.height * scaleFactor;
    // let bottle = new createjs.Bitmap(bottlesrc);
    // modifyScale(bottle, scaleFactor);
    // bottle.x = x - realBottleWidth / 2;
    // bottle.y = y - realBottleHeight / 2;
    // bottles.push(bottle);
    // container.addChild(bottle);
    let cell = calCell(x, y);
    if (isValidCell(cell.row, cell.col) && terrain[cell.row][cell.col].status === 'available') {
        let bottlesrc = queue.getResult('bottle');
        let bottle = new createjs.Bitmap(bottlesrc);
        let center = getTerrainCellCenter(cell.row, cell.col);
        bottle.x = center.x - bottlesrc.width / 2;
        bottle.y = center.y - bottlesrc.height / 2;
        towers.push(bottle);
        container.addChild(bottle);
    }
}

function getTerrainCellCenter(r, c) {
    // return the center coordinate of the cell on row r, col c
    let x = cellWidth * (c + 1/2) + terrainBound.leftTop.x * backgroundWidth;
    let y = cellHeight * (r + 1/2) + terrainBound.leftTop.y * backgroundHeight;
    return {x: x, y: y};
}

function getLeftTopCoorinate(center, width, height) {
    return {x: center.x - width / 2, y: center.y - height / 2};
}

function calCell(x, y) {
    // return row&col of the given x&y coordinate
    let c = Math.floor((x - terrainBound.leftTop.x * backgroundWidth) / cellWidth);
    let r = Math.floor((y - terrainBound.leftTop.y * backgroundHeight) / cellHeight);
    return {row: r, col: c};
}

function isValidCell(r, c) {
    return (r >= 0 && r < row && c >= 0 && c < col);
}



