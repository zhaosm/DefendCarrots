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

// classes
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
        for (let monsterContainer of monsterList) {
            let monster = monsterContainer.src.getChildByName('monster');
            let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
            let towerpt = container.localToLocal(this.src.x, this.src.y, container);
            if (eucDistance(towerpt.x, towerpt.y, monsterpt.x, monsterpt.y) <= this.radius) {
                let dist = eucDistance(monsterpt.x, monsterpt.y, carrotCenter.x, carrotCenter.y);
                if (dist < closestDist) {
                    closest = monsterContainer;
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
    fire(monsterContainer) {
        if (!monsterContainer) return;
        let towerpt = container.localToLocal(this.src.x, this.src.y, container);
        let center = {x: towerpt.x, y: towerpt.y};
        let monster = monsterContainer.src.getChildByName('monster');
        let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
        // let center = getCenterCoordinate(leftTop, this.src.image.width, this.src.image.height);
        // let p1 = {x: this.src.x, y: this.src.y + this.src.image.height / 2};
        let targetCenter = getCenterCoordinate({x: monsterpt.x, y: monsterpt.y}, monster.image.width, monster.image.height);
        // let degree = calAngle({x: this.src.x, y: this.src.y}, p1, targetCenter, 'degrees');
        // this.src.rotation = -degree;
        let degree = Math.atan2(targetCenter.y - towerpt.y, targetCenter.x - towerpt.x) * (180 / Math.PI);
        if (degree < 0) degree = 360 - (-degree);
        this.src.rotation = 90 + degree;
        let bullet = new Bullet(1, center, targetCenter);
        bullets.push(bullet);
        // let index = container.getChildIndex(this.src);
        container.addChildAt(bullet.src, container.getChildIndex(this.src));
    }
}

class Sun extends Tower {
    constructor(center, ...args) {
        super(...args);
        let sunIcon = queue.getResult('sunIcon');
        this.icon = new createjs.Bitmap(sunIcon);
        let spriteSheetImg = queue.getResult('sunSpriteSheet');
        let data = {
            images: [spriteSheetImg],
            frames: [
                [1, 1, 301, 301],
                [304, 1, 301, 301],
                [607, 1, 301, 301],
                [910, 1, 301, 301],
                [1213, 1, 301, 301]
            ],
            animations: {
                level1: {
                    frames: [0, 1, 2, 3, 4],
                    speed: .3
                }
            }
        };
        this.spriteSheet = new createjs.SpriteSheet(data);
        // let leftTop = getLeftTopCoorinate(center, this.icon.image.width, this.icon.image.height);
        this.icon.regX = this.icon.image.width / 2;
        this.icon.regY = this.icon.image.height / 2;
        this.icon.x = center.x;
        this.icon.y = center.y;
        this.radius = spriteSheetImg.width / 10;
    }
    fire() {
        let animation = new createjs.Sprite(this.spriteSheet, 'level1');
        animation.regX = animation.regY = this.radius;
        animation.x = this.icon.x;
        animation.y = this.icon.y;
        container.addChild(animation);
    }
}

class Monster {
    constructor(type) {
        let monstersrc = queue.getResult('monster');
        this.blood = 1;
        this.bloodColor = "#21ff3a";
        this.bloodHeight = monstersrc.height / 5;
        this.bloodDist = monstersrc.height / 5;
        let totalHeight = monstersrc.height + this.bloodDist + this.bloodHeight;
        let dy = totalHeight - cellHeight / 2;
        let monster = new createjs.Bitmap(monstersrc);
        monster.x = 0;
        // relative y corresponding to the monster-container
        monster.y = this.bloodDist + this.bloodHeight;
        monster.name = 'monster';
        // relative y corresponding to the monster-container
        let blood = new createjs.Shape();
        blood.graphics.beginFill(this.bloodColor).drawRect(0, 0, monster.image.width, this.bloodHeight);
        blood.name = 'blood';
        // monster-container
        this.src = new createjs.Container();
        // coordinate corresponding to container of the whole stage
        this.src.x = getLeftTopCoorinate(getTerrainCellCenter(land[0].row, land[0].col), monstersrc.width, totalHeight).x;
        this.src.y = getTerrainCellCenter(land[0].row, land[0].col).y - dy;
        this.src.addChild(blood);
        this.src.addChild(monster);
        createjs.Tween.get(this.src, {loop: false}).to({y: getTerrainCellCenter(land[1].row, land[1].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[2].row, land[2].col), monstersrc.width, totalHeight).x}, 1000)
            .to({y: getTerrainCellCenter(land[3].row, land[3].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[4].row, land[4].col), monstersrc.width, totalHeight).x}, 1000)
            .to({y: getTerrainCellCenter(land[5].row, land[5].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[6].row, land[6].col), monstersrc.width, totalHeight).x}, 1000)
            .to({y: getTerrainCellCenter(land[7].row, land[7].col).y - dy}, 1000)
            .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[8].row, land[8].col), monstersrc.width, totalHeight).x}, 1000);
    }
    updateBlood() {
        if (this.blood < 0) this.blood = 0;
        this.src.removeChild(this.src.getChildByName('blood'));
        let blood = new createjs.Shape();
        blood.graphics.beginFill(this.bloodColor).drawRect(0, 0, this.src.getChildByName('monster').image.width * this.blood, this.bloodHeight);
        blood.name = 'blood';
        this.src.addChild(blood);
    }
}

class Bullet {
    constructor(type, center, targetCenter) {
        let bulletsrc = queue.getResult('bottleBullet');
        this.src = new createjs.Bitmap(bulletsrc);
        let leftTop = getLeftTopCoorinate(center, this.src.image.width, this.src.image.height);
        this.src.x = leftTop.x;// + this.src.image.width / 2;
        this.src.y = leftTop.y;// - this.src.image.height / 2;
        this.speed = backgroundWidth;// per second
        this.attack = 0.25;
        this.targetCenter = targetCenter;
        // let targetLeftTop = getLeftTopCoorinate(targetCenter, this.src.image.width, this.src.image.height);
        let tmpDist = eucDistance(center.x, center.y, targetCenter.x, targetCenter.y);
        let dist = eucDistance(0, 0, backgroundWidth, backgroundHeight);
        let time = 1000 * dist / this.speed;
        let destCenter = {x: center.x + (targetCenter.x - center.x) * dist / tmpDist, y: center.y + (targetCenter.y - center.y) * dist / tmpDist};
        let destLeftTop = getLeftTopCoorinate(destCenter, this.src.image.width, this.src.image.height);
        createjs.Tween.get(this.src, {loop: false})
            .to({x: destLeftTop.x, y: destLeftTop.y}, time);
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
        {src: 'image/carrot.png', id: 'carrot'},
        {src: 'image/sunSpriteSheet.png', id: 'sunSpriteSheet'},
        {src: 'image/sunIcon.png', id: 'sunIcon'}
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

function addCarrot() {
    carrot = new createjs.Bitmap(queue.getResult('carrot'));
    let center = getTerrainCellCenter(land[land.length - 1].row, land[land.length - 1].col);
    let leftTop = getLeftTopCoorinate(center, carrot.image.width, carrot.image.height);
    carrot.x = leftTop.x;
    carrot.y = leftTop.y;
    container.addChild(carrot);
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
    if (monsterTimer === 60 || monsterTimer % 300 === 0) generateMonster();
    for (let i = 0;i < monsters.length;) {
        // monster[i].src: the container containing monster bitmap and blood
        // update blood
        monsters[i].updateBlood();

        let monster = monsters[i].src.getChildByName('monster');
        let pt = monsters[i].src.localToLocal(monster.x, monster.y, container);
        let monsterCell = calCell(pt.x, pt.y);
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
    if (towerTimer % 400 === 0) {
        for (let tower of towers) {
            if (tower.constructor.name === 'Bottle') {
                tower.fire(tower.findTarget(monsters, getCenterCoordinate({
                    x: carrot.x,
                    y: carrot.y
                }, carrot.image.width, carrot.image.height)));
            }
            else if (tower.constructor.name === 'Sun') {
                tower.fire();
            }
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
            for (let monsterContainer of monsters) {
                let monster = monsterContainer.src.getChildByName('monster');
                let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
                let dist = eucDistance(bullets[i].src.x, bullets[i].src.y, monsterpt.x, monsterpt.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = monsterContainer;
                }
            }

            // if hit the closest, remove this bullet
            if (closest) {
                let monster = closest.src.getChildByName('monster');
                let monsterpt = closest.src.localToLocal(monster.x, monster.y, container);
                let dx = bullets[i].src.x - monsterpt.x;
                let dy = bullets[i].src.y - monsterpt.y;
                if (dx >= -bullets[i].src.image.width && dx <= monster.image.width && dy >= -bullets[i].src.image.height && dy <= monster.image.height) {
                    closest.blood -= bullets[i].attack;
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
    let x = event.localX, y = event.localY;
    let cell = calCell(x, y);
    if (isValidCell(cell.row, cell.col) && terrain[cell.row][cell.col].status === 'available') {
        let center = getTerrainCellCenter(cell.row, cell.col);
        // bottle
        // let bottle = new Bottle(center);
        // towers.push(bottle);
        // container.addChild(bottle.src);

        // sun
        let sun = new Sun(center);
        towers.push(sun);
        container.addChild(sun.icon);

        // set cell status
        terrain[cell.row][cell.col].status = 'unavailable';
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
