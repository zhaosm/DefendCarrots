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
let monsterTimer = 0, towerTimer = 0, monsterSpeed = 50;// speed: per second
let monsters = [], towers = [], bullets = [];
let towerSpeed = 2, towerRadius = 1000, towerUpgradeCost = 180, towerPrice = 100;
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
let landPath = [];
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

class Cell {
    constructor(type, status, center) {
        this.type = type;
        this.status = status;
        this.src = new createjs.Bitmap(queue.getResult('available'));
        this.src.regX = this.src.image.width / 2;
        this.src.regY = this.src.image.height / 2;
        this.src.x = center.x;
        this.src.y = center.y;
        this.showing = false;
    }
    showChoices() {
        if (this.showing) {
            this.hide();
            return;
        }
        let towers = [
            new Bottle({x: 0, y: 0}),
            new Sun({x: 0, y: 0}),
            new Shit({x: 0, y: 0})
        ];
        this.priceImgs = [];
        let availables = [];
        for (let tower of towers) {
            let img = null;
            if (coins < tower.price) {
                img = new createjs.Bitmap(queue.getResult(tower.priceImgNames[0]));
                availables.push(false);
            }
            else {
                img = new createjs.Bitmap(queue.getResult(tower.priceImgNames[1]));
                availables.push(true);
            }
            img.name = tower.constructor.name;
            img.cell = this;
            this.priceImgs.push(img);
        }
        let listWidth = 0;
        for (let i = 0;i < this.priceImgs.length;i++) {
            listWidth += this.priceImgs[i].image.width;
        }
        let offset = 0;
        container.addChild(this.src);
        for (let i = 0;i < this.priceImgs.length;i++) {
            this.priceImgs[i].regX = this.priceImgs[i].image.width / 2;
            this.priceImgs[i].regY = this.priceImgs[i].image.height / 2;
            this.priceImgs[i].x = this.src.x - listWidth / 2 + offset + this.priceImgs[i].image.width / 2;
            this.priceImgs[i].y = this.src.y - this.src.image.height / 2 - this.priceImgs[i].image.height / 2;
            offset += this.priceImgs[i].image.width;
            if (availables[i]) {
                this.priceImgs[i].on('click', function() {
                    buildTower(this.name, {x: this.cell.src.x, y: this.cell.src.y});
                    this.cell.status = 'unavailable';
                    this.cell.hide();
                })
            }
            container.addChild(this.priceImgs[i]);
        }
        this.showing = true;
    }
    hide() {
        for (let img of this.priceImgs) {
            container.removeChild(img);
        }
        container.removeChild(this.src);
        this.showing = false;
    }
}

class Tower {
    constructor() {
        this.setParameters();
    }
    // initializations
    setParameters() {
        this.src = null;
        this.radius = towerRadius;
        this.level = 1;
        this.power = 0.5;
        this.price = towerPrice;
        this.upLevelPrices = [];
        this.upLevelImgs = [];
        this.levelIconNames = [];
        this.upLevelImg = null;
        this.priceImgNames = [];
    }
    setLevelIconNames() {
    }
    setIcon(iconName, center) {
        let iconsrc = queue.getResult(iconName);
        this.src = new createjs.Bitmap(iconsrc);
        this.src.regX = this.src.image.width / 2;
        this.src.regY = this.src.image.height / 2;
        this.src.x = center.x;
        this.src.y = center.y;
    }
    initUpLevelImgs(upLevelSrc) {
        // upLevelSrc should be a group of uplevel icons
        this.upLevelImgs = [];
        for (let src of upLevelSrc) {
            let img = new createjs.Bitmap(src);
            this.setUpLevelImgPos(img);
            img.instance = this;
            this.upLevelImgs.push(img);
        }
    }
    setUpLevelImgPos(img) {
        img.regX = img.image.width / 2;
        img.regY = img.image.height / 2;
        img.x = this.src.x;
        img.y = this.src.y - this.src.image.height / 2 - img.image.height / 2;
    }
    setIconControl() {
        // icon
        this.src.instance = this;
        this.src.clickToShowInformation = true;
        this.src.on("click", instanceShowInformation);
    }
    resetIcon(iconName) {
        let oldIcon = this.src;
        this.setIcon(iconName, {x: oldIcon.x, y: oldIcon.y});
        this.setIconControl();
        container.removeChild(oldIcon);
        container.addChild(this.src);
    }
    initAttackCircle() {
        this.circle = new createjs.Shape();
        this.circle.graphics.beginFill('#163b8e').drawCircle(this.radius, this.radius, this.radius);
        this.circle.regX = this.radius;
        this.circle.regY = this.radius;
        this.circle.x = this.src.x;
        this.circle.y = this.src.y;
        this.circle.alpha = 0.3;
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

    // methods
    attack() {
    }
    showInformation() {
        // attack circle
        container.addChildAt(this.circle, container.getChildIndex(this.src));

        // uplevel icon
        if (this.level - 1 === this.upLevelPrices.length) {
            // max level
            this.upLevelImg = this.upLevelImgs[this.upLevelImgs.length - 1];
        }
        else {
            if (coins >= this.upLevelPrices[this.level - 1]) {
                this.upLevelImg = this.upLevelImgs[(this.level - 1) * 2 + 1];
                this.upLevelImg.upLevelListener = this.upLevelImg.on('click', instanceUpLevel);
            }
            else {
                this.upLevelImg = this.upLevelImgs[(this.level - 1) * 2];
            }
        }
        this.setUpLevelImgPos(this.upLevelImg);
        container.addChildAt(this.upLevelImg, container.getChildIndex(this.src));
    }
    hideInformation() {
        this.upLevelImg.off('click', this.upLevelImg.upLevelListener);
        container.removeChild(this.circle);
        container.removeChild(this.upLevelImg);
        this.upLevelImg = null;
    }
    upLevel() {
        this.level++;
        coins -= this.upLevelPrices[this.level - 2];
        this.resetIcon(this.levelIconNames[this.level - 1]);

        // debug
        alert(this.constructor.name + " uplevel, new level: " + this.level + ", coins remain: " + coins);
    }
}

class Bottle extends Tower{
    constructor(center, ...args) {
        super(...args);
        this.setLevelIconNames();
        this.setIcon(this.levelIconNames[0], center);
        this.setIconControl();
        // level pics
        let upLevelSrc = [
            queue.getResult('upLevel_180_disable'),
            queue.getResult('upLevel_180_able'),
            queue.getResult('upLevel_260_disable'),
            queue.getResult('upLevel_260_able'),
            queue.getResult('max')
        ];
        this.initUpLevelImgs(upLevelSrc);
        this.initAttackCircle();
    }
    setParameters() {
        super.setParameters();
        this.radius = cellWidth * 2;
        this.power = 0.25;
        this.price = 100;
        this.upLevelPrices = [180, 260];
        this.priceImgNames = [
            'bottle_disable',
            'bottle_able'
        ]
    }
    setLevelIconNames() {
        this.levelIconNames = [
            'bottle_level1',
            'bottle_level2',
            'bottle_level3'
        ];
    }
    attack(monsterContainer) {
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
        // sprite
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

        this.radius = spriteSheetImg.width / 10;

        // icon
        this.setIcon('sun_level1', center);
        this.setIconControl();

        let upLevelSrc = [
            queue.getResult('upLevel_260_disable'),
            queue.getResult('upLevel_260_able'),
            queue.getResult('upLevel_320_disable'),
            queue.getResult('upLevel_320_able'),
            queue.getResult('max')
        ];
        this.initUpLevelImgs(upLevelSrc);

        this.initAttackCircle();
    }
    setParameters() {
        super.setParameters();
        this.power = 0.2;
        this.price = 180;
        this.upLevelPrices = [260, 320];
        this.priceImgNames = [
            'sun_disable',
            'sun_able'
        ];
        this.setLevelIconNames();
    }
    setLevelIconNames() {
        this.levelIconNames = [
            'sun_level1',
            'sun_level2',
            'sun_level3'
        ]
    }
    attack() {
        let animation = new createjs.Sprite(this.spriteSheet, 'level1');
        animation.regX = animation.regY = this.radius;
        animation.x = this.src.x;
        animation.y = this.src.y;
        container.addChild(animation);
    }
    findTargets(monsterList) {
        let targets = [];
        for (let monsterContainer of monsterList) {
            let monster = monsterContainer.src.getChildByName('monster');
            let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
            if (eucDistance(this.src.x, this.src.y, monsterpt.x, monsterpt.y) <= this.radius) {
                targets.push(monsterContainer);
            }
        }
        return targets;
    }
}

class Shit extends Tower {
    constructor(center, ...args) {
        super(...args);
        this.setIcon('shit_level1', center);
        this.setIconControl();

        let upLevelSrc = [
            queue.getResult('upLevel_220_disable'),
            queue.getResult('upLevel_220_able'),
            queue.getResult('upLevel_260_disable'),
            queue.getResult('upLevel_260_able'),
            queue.getResult('max')
        ];
        this.initUpLevelImgs(upLevelSrc);

        this.initAttackCircle();
    }
    setParameters() {
        super.setParameters();
        this.radius = 2 * cellWidth;
        this.power = 0.2;
        this.price = 120;
        this.upLevelPrices = [220, 260];
        this.priceImgNames = [
            'shit_disable',
            'shit_able'
        ];
        this.setLevelIconNames();
    }
    setLevelIconNames() {
        this.levelIconNames = [
            'shit_level1',
            'shit_level2',
            'shit_level3'
        ]
    }
    attack(monsterContainer) {
        if (!monsterContainer) return;
        monsterContainer.speed -= monsterSpeed * this.power;
        if (monsterContainer.speed < 0) monsterContainer.speed = 0;
    }
}

class Monster {
    constructor(type) {
        let monstersrc = queue.getResult('monster');
        this.blood = 1;
        this.bloodColor = "#21ff3a";
        this.bloodHeight = monstersrc.height / 5;
        this.bloodDist = monstersrc.height / 5;
        this.speed = monsterSpeed;
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
        // let time = 1000 * backgroundWidth / 5 / this.speed;
        // createjs.Tween.get(this.src, {loop: false}).to({y: getTerrainCellCenter(land[1].row, land[1].col).y - dy}, time)
        //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[2].row, land[2].col), monstersrc.width, totalHeight).x}, time)
        //     .to({y: getTerrainCellCenter(land[3].row, land[3].col).y - dy}, time)
        //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[4].row, land[4].col), monstersrc.width, totalHeight).x}, time)
        //     .to({y: getTerrainCellCenter(land[5].row, land[5].col).y - dy}, time)
        //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[6].row, land[6].col), monstersrc.width, totalHeight).x}, time)
        //     .to({y: getTerrainCellCenter(land[7].row, land[7].col).y - dy}, time)
        //     .to({x: getLeftTopCoorinate(getTerrainCellCenter(land[8].row, land[8].col), monstersrc.width, totalHeight).x}, time);
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
        this.power = 0.25;
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
        {src: 'image/bottle_level1.png', id: 'bottle_level1'},
        {src: 'image/bottle_level2.png', id: 'bottle_level2'},
        {src: 'image/bottle_level3.png', id: 'bottle_level3'},
        {src: 'image/bottleBullet.png', id: 'bottleBullet'},
        {src: 'image/carrot.png', id: 'carrot'},
        {src: 'image/sunSpriteSheet.png', id: 'sunSpriteSheet'},
        {src: 'image/sun_level1.png', id: 'sun_level1'},
        {src: 'image/sun_level2.png', id: 'sun_level2'},
        {src: 'image/sun_level3.png', id: 'sun_level3'},
        {src: 'image/shit_level1.png', id: 'shit_level1'},
        {src: 'image/shit_level2.png', id: 'shit_level2'},
        {src: 'image/shit_level3.png', id: 'shit_level3'},
        {src: 'image/upLevel_180_able.png', id: 'upLevel_180_able'},
        {src: 'image/upLevel_180_disable.png', id: 'upLevel_180_disable'},
        {src: 'image/upLevel_260_able.png', id: 'upLevel_260_able'},
        {src: 'image/upLevel_260_disable.png', id: 'upLevel_260_disable'},
        {src: 'image/upLevel_320_able.png', id: 'upLevel_320_able'},
        {src: 'image/upLevel_320_disable.png', id: 'upLevel_320_disable'},
        {src: 'image/upLevel_220_able.png', id: 'upLevel_220_able'},
        {src: 'image/upLevel_220_disable.png', id: 'upLevel_220_disable'},
        {src: 'image/max.png', id: 'max'},
        {src: 'image/available.png', id: 'available'},
        {src: 'image/bottle_disable.png', id: 'bottle_disable'},
        {src: 'image/bottle_able.png', id: 'bottle_able'},
        {src: 'image/sun_able.png', id: 'sun_able'},
        {src: 'image/sun_disable.png', id: 'sun_disable'},
        {src: 'image/shit_disable.png', id: 'shit_disable'},
        {src: 'image/shit_able.png', id: 'shit_able'}
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
    calLandPath();
    scaleFactor = Math.min(stage.canvas.width / backgroundsrc.width, stage.canvas.height / backgroundsrc.height);

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
    // debug
    console.log('');
}

function updateMonsters() {
    /*
    * 生成怪物
    */
    // debug
    if (monsterTimer % 20 === 0) {
        for (let i = 0; i < monsters.length;) {
            // monster[i].src: the container containing monster bitmap and blood
            // update blood
            monsters[i].updateBlood();

            let monster = monsters[i].src.getChildByName('monster');
            let center = monsters[i].src.localToLocal(monster.x, monster.y, container);
            // cell center
            center.x += monster.image.width / 2;
            center.y = center.y + monster.image.height - cellHeight / 2;
            let turningPoint = getNextTurningPoint(center.x, center.y);
            if (!turningPoint) {
                container.removeChild(monsters[i].src);
                monsters.splice(i, 1);
                continue;
            }
            let dx = 0, dy = 0;
            if (almostEqual(turningPoint.x, center.x)) {
                dx = turningPoint.x - center.x;
                if (Math.abs(monsters[i].speed) < Math.abs(turningPoint.y - center.y)) dy = turningPoint.y > center.y ? monsters[i].speed : -monsters[i].speed;
                else dy = turningPoint.y - center.y;
            }
            else if (almostEqual(turningPoint.y, center.y)) {
                dy = turningPoint.y - center.y;
                if (Math.abs(monsters[i].speed) < Math.abs(turningPoint.x - center.x)) dx = turningPoint.x > center.x ? monsters[i].speed : -monsters[i].speed;
                else dx = turningPoint.x - center.x;
            }
            monsters[i].src.x += dx;
            monsters[i].src.y += dy;
            i++;
            // let monsterCell = calCell(pt.x, pt.y);
            // if (monsterCell.row === land[land.length - 1].row && monsterCell.col === land[land.length - 1].col) {
            //     container.removeChild(monsters[i].src);
            //     monsters.splice(i, 1);
            // }
        }
    }
    if (monsterTimer === 60 || monsterTimer % 300 === 0) generateMonster();
    monsterTimer++;
}

function updateTowers() {
    /*
    * 找怪物，产生子弹*/
    towerTimer++;
    if (towerTimer % 20 === 0) {
        for (let tower of towers) {
            let center = getCenterCoordinate({
                x: carrot.x,
                y: carrot.y
            }, carrot.image.width, carrot.image.height);
            if (tower.constructor.name === 'Bottle' || tower.constructor.name === 'Shit') {
                tower.attack(tower.findTarget(monsters, center));
            }
            else if (tower.constructor.name === 'Sun' && towerTimer % 200 === 0) {
                let targets = tower.findTargets(monsters);
                if (targets.length) {
                    for (let monsterContainer of monsters) {
                        tower.attack();
                        monsterContainer.blood -= tower.power;
                    }
                }
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
                    closest.blood -= bullets[i].power;
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
            terrain[i][j] = new Cell('openSpace', 'available', center)// terrain[i][j] = {type: 'openSpace', status: 'available', center: center};
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
        terrain[cell.row][cell.col].showChoices();
        // let center = getTerrainCellCenter(cell.row, cell.col);
        // bottle
        // let bottle = new Bottle(center);
        // towers.push(bottle);
        // container.addChild(bottle.src);

        // sun
        // let sun = new Sun(center);
        // towers.push(sun);
        // container.addChild(sun.src);

        // shit
        // let shit = new Shit(center);
        // towers.push(shit);
        // container.addChild(shit.src);

        // set cell status
        // terrain[cell.row][cell.col].status = 'unavailable';
    }

}

function buildTower(type, center) {
    if (type === 'Bottle') {
        let bottle = new Bottle(center);
        towers.push(bottle);
        container.addChild(bottle.src);
    }
    else if (type === 'Sun') {
        let sun = new Sun(center);
        towers.push(sun);
        container.addChild(sun.src);
    }
    else if (type === 'Shit') {
        let shit = new Shit(center);
        towers.push(shit);
        container.addChild(shit.src);
    }
}

function instanceShowInformation() {
    if (this.clickToShowInformation) this.instance.showInformation();
    else this.instance.hideInformation();
    this.clickToShowInformation = !this.clickToShowInformation;
}

function instanceUpLevel() {
    this.instance.upLevel();
    // this.off('click', this.upLevelListener);
    this.instance.hideInformation();
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

function getNextTurningPoint(x, y) {
    // let cell = calCell(x, y);
    // let r = cell.row, c = cell.col;
    // let len = land.length;
    // let result = null;
    // for (let i = 0;i < len - 1;i++) {
    //     if (r === land[i].row && c === land[i].col) {
    //         result = getTerrainCellCenter(land[i].row, land[i].col);
    //         if (result.x !== x || result.y !== y) return result;
    //         else return getTerrainCellCenter(land[i + 1].row, land[i + 1].col);
    //     }
    //     else if (r === land[i].row && land[i].row === land[i + 1].row && c >= Math.min(land[i].col, land[i + 1].col) && c <= Math.max(land[i].col, land[i + 1].col)) {
    //         result = getTerrainCellCenter(r, land[i + 1].col);
    //     }
    //     else if (c === land[i].col && land[i].col === land[i + 1].col && r >= Math.min(land[i].row, land[i + 1].row) && r <= Math.max(land[i].row, land[i + 1].row)) {
    //         result = getTerrainCellCenter(land[i + 1].row, c);
    //     }
    // }
    // return result;
    let len = landPath.length;
    let result = null;
    for (let i = 0;i < len - 1;i++) {
        if (almostEqual(x, landPath[i].x) && almostEqual(y, landPath[i].y)) {
            return landPath[i + 1];
        }
    }
    for (let i = 0;i < len - 1;i++) {
        if (almostEqual(x, landPath[i].x) && almostEqual(landPath[i].x, landPath[i + 1].x) && y >= Math.min(landPath[i].y, landPath[i + 1].y) && y <= Math.max(landPath[i].y, landPath[i + 1].y)) return landPath[i + 1];
        else if (almostEqual(y, landPath[i].y) && almostEqual(landPath[i].y, landPath[i + 1].y) && x >= Math.min(landPath[i].x, landPath[i + 1].x) && x <= Math.max(landPath[i].x, landPath[i + 1].x)) return landPath[i + 1];
    }
    return null;
}

function isValidCell(r, c) {
    return (r >= 0 && r < row && c >= 0 && c < col);
}

function eucDistance(x1, y1, x2, y2) {
    return(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)));
}

function calLandPath() {
    let len = land.length;
    for (let i = 0;i < len;i++) landPath.push(getTerrainCellCenter(land[i].row, land[i].col));
}

function almostEqual(a, b) {
    let min = Math.min(cellHeight, cellWidth);
    return (Math.abs(a - b) <= min / 10)
}