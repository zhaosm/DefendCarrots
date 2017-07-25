/**
 * Created by zhaoshangming on 17/7/24.
 */
// global variables
let $window = $(window);
let stageWidth = $window.width();
let stageHeight = $window.height();

let $canvas = $('canvas');
$canvas.attr("width", stageWidth + "");
$canvas.attr('height', stageHeight + "");

// background and containers
let stage, queue, background, container;
let carrot;
// background size and scaleFactor
let backgroundWidth, backgroundHeight, scaleFactor = 0;
// terrain sizes
let cellWidth, cellHeight, row = 7, col = 12;
// monsters and towers
let monsterTimer = 0, towerTimer = 0;
let monsters = [], towers = [], bullets = [];
let towerSpeed = 2, towerRadius = 1000, towerUpgradeCost = 180;
// navBar
let life = 10, coins = 5000;

// terrain data
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
const carrotData = {
    images:['image/carrotAll.png'],
    //frames:{width:26, height:40, count:12, regX:0, regY:0},
    frames:[
        // x, y, width, height, imageIndex*, regX*, regY*
        [0,0,120,118],
        [120,0,115,118],
        [232,0,112,118],
        [0,114,112,118],
    ],
//创建动画，动画的名字，以及对应"frames"列表中的哪些帧，也有两种方法
    animations:{
        // start, end, next, speed
        "run": [0, 3, "run",0.2],
    }
};


// classes
class Carrot {
    constructor() {
        this.move = new createjs.SpriteSheet(carrotData);
        //SpriteSheet类设置帧和动画,里面的run为开始的动画
        this.src = new createjs.Sprite(this.move,"run");
        this.height = 300;
        this.width = 300;
    }
}

class Tower {
    constructor() {
        this.src = null;
        this.speed = towerSpeed;
        this.radius = towerRadius;
        this.level = 1;
        this.upgradeCost = 180;
    }
    findTarget(monsterList, carrotCenter) {
        let closest = null, closestDist = 1000000000;
        for (let monster of monsterList) {
            if (eucDistance(this.src.x, this.src.y, monster.src.x, monster.src.y) <= this.radius) {
                let dist = eucDistance(monster.src.x, monster.src.y, carrotCenter.x, carrotCenter.y);
                if (dist < closestDist) {
                    closest = monster;
                    closestDist = dist;
                }
            }
        }
        return closest;
    }
}

class Bottle extends Tower{
    constructor(center, ...args) {
        super(...args);
        let bottlesrc = queue.getResult('bottle');
        this.src = new createjs.Bitmap(bottlesrc);
        // let leftTop = getLeftTopCoorinate(center, bottlesrc.width, bottlesrc.height);
        // bottle should rotate around it's center, so we need to set it's regX and regY to center point,
        // and it's x, y coordinate correspond to it's center's coordinate in stage's coordinate system
        this.src.regX = this.src.image.width / 2;
        this.src.regY = this.src.image.height / 2;
        this.src.x = center.x;
        this.src.y = center.y;
        // this.speed = backgroundWidth / 2;// per second
    }
    fire(monster) {
        if (!monster) return;
        let leftTop = {x: this.src.x, y: this.src.y};
        // let center = getCenterCoordinate(leftTop, this.src.image.width, this.src.image.height);
        // let p1 = {x: this.src.x, y: this.src.y + this.src.image.height / 2};
        let targetCenter = getCenterCoordinate({x: monster.src.x, y: monster.src.y}, monster.src.image.width, monster.src.image.height);
        // let degree = calAngle({x: this.src.x, y: this.src.y}, p1, targetCenter, 'degrees');
        // this.src.rotation = -degree;
        let degree = Math.atan2(targetCenter.y - this.src.y, targetCenter.x - this.src.x) * (180 / Math.PI);
        if (degree < 0) degree = 360 - (-degree);
        this.src.rotation = 90 + degree;
        let bullet = new Bullet(1, leftTop, targetCenter);
        bullets.push(bullet);
        container.addChild(bullet.src);
    }
}

class Monster {
    constructor(type) {
        let monstersrc = queue.getResult('monster');
        this.src = new createjs.Bitmap(monstersrc);
        // modifyScale(monster, scaleFactor);
        let dy = monstersrc.height - cellHeight / 2;
        this.src.x = getLeftTopCoorinate(getTerrainCellCenter(land[0].row, land[0].col), monstersrc.width, monstersrc.height).x;
        this.src.y = getTerrainCellCenter(land[0].row, land[0].col).y - dy;
        createjs.Tween.get(this.src, {loop: true}).to({y: getTerrainCellCenter(land[1].row, land[1].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[2].row, land[2].col), monstersrc.width, monstersrc.height).x}, 1000)
            .to({y: getTerrainCellCenter(land[3].row, land[3].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[4].row, land[4].col), monstersrc.width, monstersrc.height).x}, 1000)
            .to({y: getTerrainCellCenter(land[5].row, land[5].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[6].row, land[6].col), monstersrc.width, monstersrc.height).x}, 1000)
            .to({y: getTerrainCellCenter(land[7].row, land[7].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[8].row, land[8].col), monstersrc.width, monstersrc.height).x}, 1000);
    }
}

class Bullet {
    constructor(type, leftTop, targetCenter) {
        let bulletsrc = queue.getResult('bottleBullet');
        this.src = new createjs.Bitmap(bulletsrc);
        this.src.x = leftTop.x + this.src.image.width / 2;
        this.src.y = leftTop.y - this.src.image.height / 2;
        this.speed = backgroundWidth;// per second
        this.targetCenter = targetCenter;
        let targetLeftTop = getLeftTopCoorinate(targetCenter, this.src.image.width, this.src.image.height);
        let time = 1000 * eucDistance(this.src.x, this.src.y, targetLeftTop.x, targetLeftTop.y) / this.speed;
        createjs.Tween.get(this.src, {loop: false})
            .to({x: targetCenter.x, y: targetCenter.y}, time);
    }
}

// control
function init() {
    stage = new createjs.Stage("myCanvas");
    let manifest = [
        {src: 'image/background.png', id: 'background'},
        {src: 'image/monster.png', id: 'monster'},
        {src: 'image/bottle.png', id: 'bottle'},
        {src: 'image/bottleBullet.png', id: 'bottleBullet'},
        {src: 'image/carrot.png', id: 'carrot'}
    ];
    queue = new createjs.LoadQueue();
    queue.on('complete', handleComplete);
    queue.loadManifest(manifest);
}

function handleComplete() {
    showStage();
    addCarrot();
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

    container = new createjs.Container();
    container.addChild(background);
    container.scaleX = scaleFactor;
    container.scaleY = scaleFactor;
    stage.addChild(container);
}

function addCarrot() {

    //carrot = new createjs.Bitmap(queue.getResult('carrot'));
    carrot = new Carrot();
    let center = getTerrainCellCenter(land[land.length - 1].row, land[land.length - 1].col);
    //let leftTop = getLeftTopCoorinate(center, carrot.image.width, carrot.image.height);
    let leftTop = getLeftTopCoorinate(center, carrot.width, carrot.height);
    carrot.src.x = leftTop.x;
    carrot.src.y = leftTop.y;
    container.addChild(carrot.src);
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

// update functions
function update() {
    // update
    updateMonsters();
    updateTowers();
    updateBullets();


    stage.update();
}

function updateMonsters() {
    /*
    * 生成怪物
    */
    monsterTimer++;
    if (monsterTimer % 300 === 0) generateMonster();
    for (let i = 0;i < monsters.length;) {
        let monsterCell = calCell(monsters[i].src.x, monsters[i].src.y);
        if (monsterCell.row === land[land.length - 1].row && monsterCell.col === land[land.length - 1].col) {
            container.removeChild(monsters[i].src);
            monsters.splice(i, 1);
        }
        else i++;
    }
}

function updateTowers() {
    /*
    * 找怪物，产生子弹*/
    towerTimer++;
    if (towerTimer % 20 === 0) {
        for (let tower of towers) {
            tower.fire(tower.findTarget(monsters, getCenterCoordinate({
                x: carrot.x,
                y: carrot.y
            }, carrot.image.width, carrot.image.height)));
        }
    }
}

function updateBullets() {
    /*
    * 遍历子弹数组，更新每个子弹，检查每个子弹是否打到了怪物/障碍物，更新怪物/障碍物血量，如果血量<0删除
    * */
    // if reached destination, remove this bullet
    for (let i = 0;i < bullets.length;) {
        if (Math.abs(bullets[i].src.x - bullets[i].targetCenter.x) <= bullets[i].src.image.width / 2 && Math.abs(bullets[i].src.y - bullets[i].targetCenter.y) <= bullets[i].src.image.height / 2) {
            container.removeChild(bullets[i].src);
            bullets.splice(i, 1);
        }
        else {
            // find closest monster
            let closest = null, closestDist = 10000000;
            for (let monster of monsters) {
                let dist = eucDistance(bullets[i].src.x, bullets[i].src.y, monster.src.x, monster.src.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = monster;
                }
            }

            // if hit the closest, remove this bullet
            if (closest) {
                let dx = bullets[i].src.x - closest.src.x;
                let dy = bullets[i].src.y - closest.src.y;
                if (dx >= -bullets[i].src.image.width && dx <= closest.src.image.width && dy >= -bullets[i].src.image.height && dy <= closest.src.image.height) {
                    container.removeChild(bullets[i].src);
                    bullets.splice(i, 1);
                    continue;
                }
            }
        }
        i++;
    }
}

function updateCarrot() {
    /*
    * 根据萝卜的命播放相应的动画*/
}


function updateNavbar() {

}

function deleteMonster(monster) {

}

// generate things
function generateMonster() {
    // let monstersrc = queue.getResult('monster');
    // let monster = new createjs.Bitmap(monstersrc);
    // // modifyScale(monster, scaleFactor);
    // let dy = monstersrc.height - cellHeight / 2;
    // monster.x = getLeftTopCoorinate(getTerrainCellCenter(land[0].row, land[0].col), monstersrc.width, monstersrc.height).x;
    // monster.y = getTerrainCellCenter(land[0].row, land[0].col).y - dy;
    // createjs.Tween.get(monster, {loop: true}).to({y: getTerrainCellCenter(land[1].row, land[1].col).y - dy}, 1000)
    //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[2].row, land[2].col), monstersrc.width, monstersrc.height).x}, 1000)
    //     .to({y: getTerrainCellCenter(land[3].row, land[3].col).y - dy}, 1000)
    //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[4].row, land[4].col), monstersrc.width, monstersrc.height).x}, 1000)
    //     .to({y: getTerrainCellCenter(land[5].row, land[5].col).y - dy}, 1000)
    //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[6].row, land[6].col), monstersrc.width, monstersrc.height).x}, 1000)
    //     .to({y: getTerrainCellCenter(land[7].row, land[7].col).y - dy}, 1000)
    //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[8].row, land[8].col), monstersrc.width, monstersrc.height).x}, 1000);
    let monster = new Monster(1);
    monsters.push(monster);
    container.addChild(monster.src);
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

// event handlers
function tryBuidingTower(event) {
    let x = event.stageX, y = event.stageY;
    let cell = calCell(x, y);
    if (isValidCell(cell.row, cell.col) && terrain[cell.row][cell.col].status === 'available') {
        let center = getTerrainCellCenter(cell.row, cell.col);
        let bottle = new Bottle(center);
        towers.push(bottle);
        container.addChild(bottle.src);
    }
}

// calculations
function getTerrainCellCenter(r, c) {
    // return the center coordinate of the cell on row r, col c
    let x = cellWidth * (c + 1/2) + terrainBound.leftTop.x * backgroundWidth;
    let y = cellHeight * (r + 1/2) + terrainBound.leftTop.y * backgroundHeight;
    return {x: x, y: y};
}

function getLeftTopCoorinate(center, width, height) {
    return {x: center.x - width / 2, y: center.y - height / 2};
}

function getCenterCoordinate(leftTop, width, height) {
    return {x: leftTop.x + width / 2, y: leftTop.y + height / 2};
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

function eucDistance(x1, y1, x2, y2) {
    return(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)));
}

// function calAngle(origin, p1, p2, unit) {
//     // unit can be either 'radians' or 'degrees'
//     p1 = {x: p1.x - origin.x, y: p1.y - origin.y};
//     p2 = {x: p2.x - origin.x, y: p2.y - origin.y};
//     if (unit === 'radians') return Math.atan2(p2.y - p1.y, p2.x - p1.x);
//     if (unit === 'degrees') return Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
// }
