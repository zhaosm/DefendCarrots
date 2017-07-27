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

//game status
let status;//1=running 0=stop
// background and containers
let stage, queue, background, container;
let carrot;
// background size and scaleFactor
let backgroundWidth, backgroundHeight, scaleFactor = 0;
// terrain sizes
let cellWidth, cellHeight, row = 7, col = 12;
// monsters and towers
let monsterTimer = 0, towerTimer = 0, monsterSpeed = 1, speedFactor = 1;// speed: per second

let monsters = [], towers = [], bullets = [];
let bottleBulletSpeed, pooSpeed, towerRadius = 1000, towerUpgradeCost = 180, towerPrice = 100;
// navBar
let navbar;
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
let barrierCells = [
    {row: 6, col: 0},
    {row: 6, col: 1},
    {row: 6, col: 8},
    {row: 6, col: 9},
    {row: 6, col: 10},
    {row: 4, col: 0},
    {row: 5, col: 0}
];
let barriers = [];
let terrain = [];
let carrotData;

const monsterData = {
    images:['image/monsters.png'],
    //frames:{width:26, height:40, count:12, regX:0, regY:0},
    frames:[
        // x, y, width, height, imageIndex*, regX*, regY*
        [0,0,120,118],
    ],
//创建动画，动画的名字，以及对应"frames"列表中的哪些帧，也有两种方法
    animations:{
        // start, end, next, speed
        "run": [0, 0, "run",0.2],
    }
};

// classes
class Carrot {
    constructor() {
        this.move = new createjs.SpriteSheet(carrotData);
        //SpriteSheet类设置帧和动画,里面的run为开始的动画
        this.src = new createjs.Sprite(this.move,"run");
        // this.height = 300;
        // this.width = 300;
    }
}

class Navbar {
    constructor() {
        let itemssrc = queue.getResult('items');
        this.src = new createjs.Container();

        this.bar = new createjs.Bitmap(itemssrc);
        this.bar.scaleX = 1.5;
        this.bar.scaleY = 1.5;
        this.bar.x = 25;
        this.bar.y = 0;
        this.bar.sourceRect = new createjs.Rectangle(0, 0, 605, 50);
        this.src.addChild(this.bar);

        this.coinText = new createjs.Text(coins, '36px Arial', '#ffffff');
        this.coinText.x = 110;
        this.coinText.y = 14;
        this.src.addChild(this.coinText);

        this.stopButton = new createjs.Bitmap(itemssrc);
        this.stopButton.x = 760;
        this.stopButton.y = 3;
        //1363*512
        this.stopButton.sourceRect = new createjs.Rectangle(1323, 310, 40, 40);
        this.stopButton.scaleX = 1.5;
        this.stopButton.scaleY = 1.5;
        this.stopButton.addEventListener("click", stopOrContinue);
        this.src.addChild(this.stopButton);


        this.listButton = new createjs.Bitmap(itemssrc);
        this.listButton.x = 840;
        this.listButton.y = 64;
        this.listButton.rotation = 270;
        //1363*512
        this.listButton.sourceRect = new createjs.Rectangle(1143, 475, 40, 40);
        this.listButton.scaleX = 1.5;
        this.listButton.scaleY = 1.5;
        this.src.addChild(this.listButton);

    }
}

class Cell {
    constructor(type, status, center) {
        this.type = type;
        this.status = status;
        this.src = new createjs.Bitmap(queue.getResult('available'));
        let srcBounds = this.src.getBounds();
        this.src.regX = srcBounds.width / 2;
        this.src.regY = srcBounds.height / 2;
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
            listWidth += this.priceImgs[i].getBounds().width;
        }
        let offset = 0;
        container.addChild(this.src);
        for (let i = 0;i < this.priceImgs.length;i++) {
            let imgBounds = this.priceImgs[i].getBounds();
            this.priceImgs[i].regX = imgBounds.width / 2;
            this.priceImgs[i].regY = imgBounds.height / 2;
            this.priceImgs[i].x = this.src.x - listWidth / 2 + offset + imgBounds.width / 2;
            this.priceImgs[i].y = this.src.y - this.src.getBounds().height / 2 - imgBounds.height / 2;
            offset += imgBounds.width;
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
        let srcBounds = this.src.getBounds();
        this.src.regX = srcBounds.width / 2;
        this.src.regY = srcBounds.height / 2;
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
        let imgBounds = img.getBounds();
        img.regX = imgBounds.width / 2;
        img.regY = imgBounds.height / 2;
        img.x = this.src.x;
        img.y = this.src.y - this.src.getBounds().height / 2 - imgBounds.height / 2;
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

    // methods
    findTarget(monsterList, carrotCenter) {
        let closest = null, closestDist = 1000000000;
        for (let monsterContainer of monsterList) {
            let monster = monsterContainer.src.getChildByName('monster');
            // let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
            // let towerpt = container.localToLocal(this.src.x, this.src.y, container);
            if (eucDistance(this.src.x, this.src.y, monsterContainer.src.x, monsterContainer.src.y) <= this.radius) {
                let dist = eucDistance(monsterContainer.src.x, monsterContainer.src.y, carrotCenter.x, carrotCenter.y);
                if (dist < closestDist) {
                    closest = monsterContainer;
                    closestDist = dist;
                }
            }
        }
        return closest;
    }
    calAttackParameters(monsterContainer) {
        if (!monsterContainer) return;
        // let towerpt = container.localToLocal(this.src.x, this.src.y, container);
        let center = {x: this.src.x, y: this.src.y};
        // let monster = monsterContainer.src.getChildByName('monster');
        // let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
        // let center = getCenterCoordinate(leftTop, this.src.image.width, this.src.image.height);
        // let p1 = {x: this.src.x, y: this.src.y + this.src.image.height / 2};
        let targetCenter = {x: monsterContainer.src.x, y: monsterContainer.src.y};
        // let degree = calAngle({x: this.src.x, y: this.src.y}, p1, targetCenter, 'degrees');
        // this.src.rotation = -degree;
        let degree = Math.atan2(targetCenter.y - this.src.y, targetCenter.x - this.src.x) * (180 / Math.PI);
        if (degree < 0) degree = 360 - (-degree);
        degree += 90;
        return {center: center, degree: degree, targetCenter: targetCenter};
    }
    attack(monsterContainer) {
        if (!monsterContainer) return;
        let attackParameters = this.calAttackParameters(monsterContainer);
        // this.src.rotation = attackParameters.degree;
        let bullet = null;
        if (this.constructor.name === 'Bottle') {
            bullet = new BottleBullet(this.level);
        }
        else if (this.constructor.name === 'Shit') {
            bullet = new Poo(this.level);
        }

        let tmpDist = eucDistance(attackParameters.center.x, attackParameters.center.y, attackParameters.targetCenter.x, attackParameters.targetCenter.y);
        let dist = this.src.getBounds().height / 2 + bullet.src.getBounds().height / 2;
        let center = {x: attackParameters.center.x + (attackParameters.targetCenter.x - attackParameters.center.x) * dist / tmpDist, y: attackParameters.center.y + (attackParameters.targetCenter.y - attackParameters.center.y) * dist / tmpDist};
        bullet.shoot(center, attackParameters.degree, attackParameters.targetCenter);
        bullets.push(bullet);
        container.addChildAt(bullet.src, container.getChildIndex(this.src));

        return {center: center, degree: attackParameters.degree, targetCenter: attackParameters.targetCenter};
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
        let attackParameters = super.attack(monsterContainer);
        if (attackParameters) this.src.rotation = attackParameters.degree;
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

        // debug
        // this.attacked = false;
    }
    setParameters() {
        super.setParameters();
        this.power = 0.2;
        this.price = 180;
        this.timer = 0;
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
        // if (this.attacked) return;
        let animation = new createjs.Sprite(this.spriteSheet, 'level1');
        animation.regX = animation.regY = this.radius;
        animation.x = this.src.x;
        animation.y = this.src.y;
        animation.on('animationend', function() {
            container.removeChild(this);
        });
        container.addChild(animation);

        // this.attacked = true;
    }
    findTargets(monsterList) {
        let targets = [];
        for (let monsterContainer of monsterList) {
            let monster = monsterContainer.src.getChildByName('monster');
            // let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
            if (eucDistance(this.src.x, this.src.y, monsterContainer.src.x, monsterContainer.src.y) <= this.radius) {
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
    // attack(monsterContainer) {
    //     if (!monsterContainer) return;
    //     let attackParameters = this.calAttackParameters(monsterContainer);
    //     let bullet = new Bullet('poo_level' + this.level, attackParameters.center, attackParameters.degree, attackParameters.targetCenter);
    //     bullets.push(bullet);
    //     container.addChildAt(bullet.src, container.getChildIndex(this.src));
    //
    // }
}

class Monster {
    constructor() {
        let monster = this.createSprite();
        let monsterBounds = monster.getBounds();
        this.setBloodParameters(monsterBounds);
        this.setSpriteParameters(monster);
        let blood = this.createBlood(monsterBounds);
        this.setContainer(monster, blood);
        this.setDieSprite();
        this.originspeed = monsterSpeed;
        this.speed = this.originspeed;
        this.slowDownTimer = 0;
        this.isSlowDown = false;
        this.createSlowDownSpriteSheet();
    }
    createSlowDownSpriteSheet() {
        let data = {
            "images": [
                queue.getResult('slowDownSpriteSheet')
            ],

            "frames": [
                [1, 1, 74, 20, 0, 0, 0],
                [77, 1, 74, 20, 0, 0, 0]
            ],

            "animations": {
                "shit": {
                    "frames": [0, 1],
                    'speed': .1
                }
            }
        };
        this.slowDownSpriteSheet = new createjs.SpriteSheet(data);
    }
    addSlowDownSprite() {
        // return slowdown animation instance
        let animation = new createjs.Sprite(this.slowDownSpriteSheet, 'shit');
        let animationBounds = animation.getBounds();
        animation.regX = animationBounds.width / 2;
        animation.regY = animationBounds.height / 2;
        let monster = this.src.getChildByName('monster');
        animation.x = monster.x;
        animation.y = monster.y + monster.getBounds().height / 2 - animationBounds.height / 2;
        animation.name = 'slowDown';
        this.src.addChild(animation);
    }
    createSprite() {
        // return the sprite instance
    }
    setBloodParameters(monsterBounds) {
        this.blood = 1;
        this.bloodColor = "#21ff12";
        this.bloodHeight = monsterBounds.height / 5;
        this.bloodDist = monsterBounds.height / 5;
    }
    setSpriteParameters(monster) {
        let monsterBounds = monster.getBounds();
        // let center = getTerrainCellCenter(land[0].row, land[0].col);
        // let monster = new createjs.Bitmap(monstersrc);
        // let monsterBounds = monster.getBounds();
        monster.regX = monsterBounds.width / 2;
        monster.regY = monsterBounds.height / 2;
        monster.x = monster.regX;
        monster.y = this.bloodHeight + this.bloodDist + monster.regY;
        monster.name = 'monster';
    }
    createBlood(monsterBounds) {
        let blood = new createjs.Shape();
        blood.graphics.beginFill(this.bloodColor).drawRect(0, 0, monsterBounds.width, this.bloodHeight);
        blood.name = 'blood';
    }
    setContainer(monster, blood) {
        let center = getTerrainCellCenter(land[0].row, land[0].col);
        this.src = new createjs.Container();
        // coordinate corresponding to container of the whole stage
        this.src.regX = monster.x;
        this.src.regY = monster.y;
        this.src.x = center.x;
        this.src.y = center.y;
        this.src.addChild(blood);
        this.src.addChild(monster);
    }
    setDieSprite() {
        let dieData = {
            "images": [
                queue.getResult("monsterDieSpriteSheet")
            ],
            "frames": [
                [1, 1, 175, 178],
                [178, 1, 175, 178],
                [355, 1, 175, 178],
                [532, 1, 175, 178]
            ],
            "animations": {
                "monsterDie": {
                    "frames": [0, 1, 2, 3],
                    'speed': .3
                }
            }
        };
        this.dieSpriteSheet = new createjs.SpriteSheet(dieData);
    }
    updateBlood() {
        if (this.blood < 0) this.blood = 0;
        this.src.removeChild(this.src.getChildByName('blood'));
        let blood = new createjs.Shape();
        let monsterBounds = this.src.getChildByName('monster').getBounds();
        blood.graphics.beginFill(this.bloodColor).drawRect(0, 0, monsterBounds.width * this.blood, this.bloodHeight);
        blood.name = 'blood';
        this.src.addChild(blood);
    }
    die() {
        let animation = new createjs.Sprite(this.dieSpriteSheet, 'monsterDie');
        let spriteBounds = animation.getBounds();
        animation.regX = spriteBounds.width / 2;
        animation.regY = spriteBounds.height / 2;
        animation.x = this.src.x;
        animation.y = this.src.y;
        animation.on('animationend', function() {
            container.removeChild(this);
        });
        container.addChild(animation);
    }
    slowDown(power) {
        if (this.isSlowDown) return;
        this.speed = Math.max(this.speed * (1 - power), 0);
        this.isSlowDown = true;
        this.slowDownTimer = 0;

        this.addSlowDownSprite();
    }
    speedUp() {
        if (!this.isSlowDown) return;
        this.speed = this.originspeed;
        this.isSlowDown = false;
        this.src.removeChild(this.src.getChildByName('slowDown'));
    }
}

class NormalMonster extends Monster {
    constructor(...args) {
        super(...args);
        this.originspeed = monsterSpeed;
        this.speed = this.originspeed;
    }
    createSprite() {
        let monsterData = {
            "images": [
                queue.getResult('monsterNormalSpriteSheet')
            ],
            "frames": [
                [1, 1, 83, 56, 0, 0, 0],
                [86, 1, 83, 56, 0, 0, 0],
                [171, 1, 83, 56, 0, 0, 0]
            ],

            "animations": {
                "monsterNormal": {
                    "frames": [0, 1, 2],
                    'speed': .1
                }
            }

        };
        this.originSpriteSheet = new createjs.SpriteSheet(monsterData);
        return new createjs.Sprite(this.originSpriteSheet, 'monsterNormal');
    }

}

class FastMonster extends Monster {
    constructor(...args) {
        super(...args);
        this.originspeed = monsterSpeed * 2;
        this.speed = this.originspeed;
    }
    createSprite() {
        let monsterData = {
            "images": [
                queue.getResult('monsterFastSpriteSheet')
            ],
            "frames": [
                [1, 1, 74, 58, 0, 0, 0],
                [77, 1, 74, 58, 0, 0, 0],
                [153, 1, 74, 58, 0, 0, 0]
            ],

            "animations": {
                "monsterFast": {
                    "frames": [0, 1, 2],
                    'speed': .1
                }
            }
        };
        this.originSpriteSheet = new createjs.SpriteSheet(monsterData);
        return new createjs.Sprite(this.originSpriteSheet, 'monsterFast');
    }
    setSpriteParameters(monster) {
        let monsterBounds = monster.getBounds();
        // let center = getTerrainCellCenter(land[0].row, land[0].col);
        // let monster = new createjs.Bitmap(monstersrc);
        // let monsterBounds = monster.getBounds();
        monster.regX = monsterBounds.width * 0.66;
        monster.regY = monsterBounds.height * 0.81;
        monster.x = monster.regX;
        monster.y = this.bloodHeight + this.bloodDist + monster.regY;
        monster.name = 'monster';
    }
}

class SlowMonster extends Monster {
    constructor(...args) {
        super(...args);
        this.originspeed = monsterSpeed / 2;
        this.speed = this.originspeed;
    }
    createSprite() {
        let monsterData = {
            "images": [
                queue.getResult('monsterSlowSpriteSheet')
            ],

            "frames": [
                [1, 1, 53, 57, 0, 0, 0],
                [56, 1, 53, 57, 0, 0, 0]
            ],

            "animations": {
                "monsterSlow": {
                    "frames": [0, 1],
                    'speed': .1
                }
            }
        };
        this.originSpriteSheet = new createjs.SpriteSheet(monsterData);
        return new createjs.Sprite(this.originSpriteSheet, 'monsterSlow');
    }
}

class Bullet {
    constructor() {
        this.src = null;
        this.speed = bottleBulletSpeed;
    }
    shoot(center, rotation, targetCenter) {
        let srcBounds = this.src.getBounds();
        this.src.regX = srcBounds.width / 2;
        this.src.regY = srcBounds.height / 2;
        this.src.x = center.x;
        this.src.y = center.y;
        this.src.rotation = rotation;
        this.targetCenter = targetCenter;
        let tmpDist = eucDistance(center.x, center.y, targetCenter.x, targetCenter.y);
        let dist = eucDistance(0, 0, backgroundWidth, backgroundHeight);
        let time = 1000 * dist / this.speed;
        let destCenter = {x: center.x + (targetCenter.x - center.x) * dist / tmpDist, y: center.y + (targetCenter.y - center.y) * dist / tmpDist};
        createjs.Tween.get(this.src, {loop: false})
            .to({x: destCenter.x, y: destCenter.y}, time);
    }
    attack(monsterContainer) {
    }
}

class BottleBullet extends Bullet {
    constructor(level, ...args) {
        super(...args);
        let src = queue.getResult('bottleBullet_level' + level);
        this.src = new createjs.Bitmap(src);
        this.speed = bottleBulletSpeed * level;
        this.power = 0.1 * level;
    }
    attack(monsterContainer) {
        monsterContainer.blood -= this.power;
    }
}

class Poo extends Bullet {
    constructor(level, ...args) {
        super(...args);
        let src = queue.getResult('poo_level' + level);
        this.src = new createjs.Bitmap(src);
        this.speed = pooSpeed * level;
        this.power = 0.3 * level;
    }
    attack(monsterContainer) {
        monsterContainer.slowDown(this.power);
    }
}

class Barrier {
    constructor(center, cells, srcName) {
        let icon = this.createSrc(srcName);
        let iconBounds = icon.getBounds();
        icon.regX = iconBounds.width / 2;
        icon.regY = iconBounds.height / 2;
        this.bloodHeight = iconBounds.height / 5;
        this.bloodDist = iconBounds.height / 5;
        icon.x = icon.regX;
        icon.y = this.bloodHeight + this.bloodDist + icon.regY;
        icon.name = 'icon';

        this.blood = 1;
        this.bloodColor = "#21ff12";
        let blood = new createjs.Shape();
        blood.graphics.beginFill(this.bloodColor).drawRect(0, 0, iconBounds.width, this.bloodHeight);
        blood.name = 'blood';

        this.src = new createjs.Container();
        this.src.regX = icon.regX;
        this.src.regY = icon.y;
        this.src.x = center.x;
        this.src.y = center.y;
        this.src.addChild(icon);
        this.src.addChild(blood);

        this.cells = cells;
    }
    createSrc(srcName) {
        // return src instance
        return new createjs.Bitmap(queue.getResult(srcName));
    }
}

// control
function init() {
    stage = new createjs.Stage("myCanvas");
    let manifest = [
        {src: 'image/background.png', id: 'background'},
        {src: 'image/items.png', id: 'items'},
        {src: 'image/bottle_level1.png', id: 'bottle_level1'},
        {src: 'image/bottle_level2.png', id: 'bottle_level2'},
        {src: 'image/bottle_level3.png', id: 'bottle_level3'},
        {src: 'image/bottleBullet_level1.png', id: 'bottleBullet_level1'},
        {src: 'image/bottleBullet_level2.png', id: 'bottleBullet_level2'},
        {src: 'image/bottleBullet_level3.png', id: 'bottleBullet_level3'},
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
        {src: 'image/shit_able.png', id: 'shit_able'},
        {src: 'image/poo_level1.png', id: 'poo_level1'},
        {src: 'image/poo_level2.png', id: 'poo_level2'},
        {src: 'image/poo_level3.png', id: 'poo_level3'},
        {src: 'image/carrotAll.png', id: 'carrotAll'},
        {src: 'image/monsterDieSpriteSheet.png', id: 'monsterDieSpriteSheet'},
        {src: 'image/monsterNormalSpriteSheet.png', id: 'monsterNormalSpriteSheet'},
        {src: 'image/monsterFastSpriteSheet.png', id: 'monsterFastSpriteSheet'},
        {src: 'image/monsterSlowSpriteSheet.png', id: 'monsterSlowSpriteSheet'},
        {src: 'image/slowDownSpriteSheet.png', id: 'slowDownSpriteSheet'},
        {src: 'image/ladybug.png', id: 'ladybug'},
        {src: 'image/largeStone.png', id: 'largeStone'},
        {src: 'image/largeTreasureBox.png', id: 'largeTreasureBox'},
        {src: 'image/largeTree.png', id: 'largeTree'},
        {src: 'image/monsterBoard.png', id: 'monsterBoard'},
        {src: 'image/smallStone.png', id: 'smallStone'},
        {src: 'image/smallTreasureBox1.png', id: 'smallTreasureBox1'},
        {src: 'image/smallTreasureBox2.png', id: 'smallTreasureBox2'},
        {src: 'image/smallTree.png', id: 'smallTree'},
        {src: 'image/stump.png', id: 'stump'},
        {src: 'image/windMillBase.png', id: 'windMillBase'},
        {src: 'image/windMillFans.png', id: 'sindMillFans'},
        {src: 'image/windMill.png', id: 'windMill'}
    ];
    queue = new createjs.LoadQueue();
    queue.on('complete', handleComplete);
    queue.loadManifest(manifest);
}

function handleComplete() {
    showStage();
    addCarrot();
    addNavbar();
    setControllers();
    startGame();
}

function showStage() {
    let backgroundsrc = queue.getResult('background');
    background = new createjs.Bitmap(backgroundsrc);
    backgroundWidth = backgroundsrc.width;
    backgroundHeight = backgroundsrc.height;
    setParametersRelatedToBackgroundSize();

    scaleFactor = Math.min(stage.canvas.width / backgroundsrc.width, stage.canvas.height / backgroundsrc.height);

    container = new createjs.Container();
    container.addChild(background);
    container.scaleX = scaleFactor;
    container.scaleY = scaleFactor;
    stage.addChild(container);

    generateBarriers();
}

function setParametersRelatedToBackgroundSize() {
    cellWidth = (terrainBound.rightTop.x - terrainBound.leftTop.x) / col * backgroundWidth;
    cellHeight = (terrainBound.leftBottom.y - terrainBound.leftTop.y) / row * backgroundHeight;
    generateTerrain();
    calLandPath();
    bottleBulletSpeed = backgroundWidth;
    pooSpeed = backgroundWidth;
}

function addCarrot() {
    //carrot = new createjs.Bitmap(queue.getResult('carrot'));
    carrotData = {
        images:[queue.getResult('carrotAll')],
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
    carrot = new Carrot();
    let center = getTerrainCellCenter(land[land.length - 1].row, land[land.length - 1].col);
    // let leftTop = getLeftTopCoorinate(center, carrot.width, carrot.height);
    let frameBounds = carrot.src.getBounds();
    carrot.src.regX = frameBounds.width / 2;
    carrot.src.regY = frameBounds.height / 2;
    carrot.src.x = center.x;
    carrot.src.y = center.y + cellHeight / 2 - cellHeight / 5 - frameBounds.height / 2;
    container.addChild(carrot.src);
}

function addNavbar() {
    navbar = new Navbar();
    container.addChild(navbar.src);
}

function setControllers() {
    background.addEventListener("click", tryBuildingTower);
}

function startGame() {
    createjs.Ticker.setFPS(60);
    createjs.Ticker.addEventListener('tick', update);
    status = 1;
}

// update functions
function update() {
    // update
    if(status === 1)
    {
        updateMonsters();
        updateTowers();
        updateBullets();
        updateNavbar();
        // debug
        console.log('update');
    }
    stage.update();
}

function updateMonsters() {
    /*
    * 生成怪物
    */
    // debug
        for (let i = 0; i < monsters.length;) {
            if (monsters[i].blood <= 0) {
                container.removeChild(monsters[i].src);
                monsters[i].die();
                monsters.splice(i, 1);
                continue;
            }

            // monster[i].src: the container containing monster bitmap and blood
            // update blood
            monsters[i].updateBlood();

            // let monster = monsters[i].src.getChildByName('monster');
            // let center = monsters[i].src.localToLocal(monster.x, monster.y, container);
            let center = {x: monsters[i].src.x, y: monsters[i].src.y};
            // cell center
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

            // slowdown timer
            if (monsters[i].slowDownTimer === 180) monsters[i].speedUp();
            monsters[i].slowDownTimer++;
            i++;
            // let monsterCell = calCell(pt.x, pt.y);
            // if (monsterCell.row === land[land.length - 1].row && monsterCell.col === land[land.length - 1].col) {
            //     container.removeChild(monsters[i].src);
            //     monsters.splice(i, 1);
            // }
    }
    if (monsterTimer === 60 || monsterTimer % 600 === 0) {
        if (monsterTimer / 300 % 3 === 0) {
            generateMonster('slow');
        }
        else if (monsterTimer / 300 % 3 === 1) {
            generateMonster('normal');
        }
        else generateMonster('fast');
    }
    monsterTimer++;
}

function updateTowers() {
    /*
    * 找怪物，产生子弹*/
    towerTimer++;
    for (let tower of towers) {
        let center = {x: carrot.src.x, y: carrot.src.y};
        if ((towerTimer % 15 === 0 && tower.constructor.name === 'Bottle') || (towerTimer % 20 === 0 &&  tower.constructor.name === 'Shit')) {
            tower.attack(tower.findTarget(monsters, center));
        }
        else if (tower.constructor.name === 'Sun') {
            if (tower.timer % 60 === 0) {
                let targets = tower.findTargets(monsters);
                if (targets.length) {
                    for (let monsterContainer of monsters) {
                        tower.attack();
                        monsterContainer.blood -= tower.power;
                    }
                }
            }
            tower.timer++;
        }
    }
}

function updateBullets() {
    /*
    * 遍历子弹数组，更新每个子弹，检查每个子弹是否打到了怪物/障碍物，更新怪物/障碍物血量，如果血量<0删除
    * */
    // if reached destination, remove this bullet
    for (let i = 0;i < bullets.length;) {
        // if (almostEqual(eucDistance(bullets[i].src.x, bullets[i].src.y, bullets[i].targetCenter.x, bullets[i].targetCenter.y), 0)) {
        //     container.removeChild(bullets[i].src);
        //     bullets.splice(i, 1);
        // }

        // out of stage
        let bulletBounds = bullets[i].src.getBounds();
        if (bullets[i].src.x < -bulletBounds.width / 2 || bullets[i].src.x > backgroundWidth + bulletBounds.width / 2 || bullets[i].src.y < -bulletBounds.height / 2 || bullets[i].y > backgroundHeight + bulletBounds.height / 2) {
            container.removeChild(bullets[i].src);
            bullets.splice(i, 1);
            continue;
        }
        // find closest monster
        let closest = null, closestDist = 10000000;
        for (let monsterContainer of monsters) {
            // let monster = monsterContainer.src.getChildByName('monster');
            // let monsterpt = monsterContainer.src.localToLocal(monster.x, monster.y, container);
            let dist = eucDistance(bullets[i].src.x, bullets[i].src.y, monsterContainer.src.x, monsterContainer.src.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = monsterContainer;
            }
        }

        // if hit the closest, remove this bullet
        if (closest && closestDist < cellWidth / 10) {
            let monster = closest.src.getChildByName('monster');
            // let monsterpt = closest.src.localToLocal(monster.x, monster.y, container);
            bullets[i].attack(closest);
            // closest.blood -= bullets[i].power;
            container.removeChild(bullets[i].src);
            bullets.splice(i, 1);
            continue;
        }
        i++;
    }
}

function updateCarrot() {
    /*
    * 根据萝卜的命播放相应的动画*/
}

function updateNavbar() {
    navbar.coinText.text = coins.toString();
}

function deleteMonster(monster) {
}

// generate things
function generateMonster(type) {
    let monster = null;
    if (type === 'slow') {
        monster = new SlowMonster();
    }
    else if (type === 'normal') {
        monster = new NormalMonster();
    }
    else if (type === 'fast') {
        monster = new FastMonster();
    }
    if (monster) {
        monsters.push(monster);
        container.addChild(monster.src);
    }
}

function generateTerrain() {
    let topX = terrainBound.leftTop.x, topY = terrainBound.leftTop.y, landLen = land.length, berrierNum = barrierCells.length;
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
    for (let b of barrierCells) {
        terrain[b.row][b.col].type = 'barrierCells';
        terrain[b.row][b.col].status = 'unavailable';
    }
}

function generateBarriers() {
    let center = {x: getTerrainCellCenter(4, 0).x, y: (getTerrainCellCenter(4, 0).y + getTerrainCellCenter(5, 0).y) / 2};
    let cells = [
        {row: 0, col: 4},
        {row: 0, col: 5}
    ];
    let barrier = new Barrier(center, cells, 'smallStone');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = {x: (getTerrainCellCenter(4, 3).x + getTerrainCellCenter(4, 2).x) / 2, y: (getTerrainCellCenter(3, 3).y + getTerrainCellCenter(4, 3).y) / 2};
    cells = [
        {row: 3, col: 2},
        {row: 3, col: 3},
        {row: 4, col: 2},
        {row: 4, col: 3},
    ];
    barrier = new Barrier(center, cells, 'largeTreasureBox');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = {x: (getTerrainCellCenter(2, 2).x + getTerrainCellCenter(2, 3).x) / 2, y: getTerrainCellCenter(2, 2).y};
    cells = [
        {row: 2, col: 2},
        {row: 2, col: 3},
        {row: 3, col: 2},
        {row: 3, col: 3}
    ];
    barrier = new Barrier(center, cells, 'largeTree');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(0, 6);
    cells = [{row: 0, col: 6}];
    barrier = new Barrier(center, cells, 'ladybug');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(2, 7);
    cells = [{row: 2, col: 7}];
    barrier = new Barrier(center, cells, 'smallTreasureBox1');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = {x: (getTerrainCellCenter(4, 6).x + getTerrainCellCenter(4, 7).x) / 2, y: (getTerrainCellCenter(3, 6).y + getTerrainCellCenter(4, 6).y) / 2};
    cells = [
        {row: 3, col: 6},
        {row: 3, col: 7},
        {row: 4, col: 6},
        {row: 4, col: 7}
    ];
    barrier = new Barrier(center, cells, 'windMill');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = {x: (getTerrainCellCenter(2, 8).x + getTerrainCellCenter(2, 9).x) / 2, y: getTerrainCellCenter(2, 8).y};
    cells = [
        {row: 2, col: 8},
        {row: 2, col: 9}
    ];
    barrier = new Barrier(center, cells, 'largeStone');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(4, 9);
    cells = [{row: 10, col: 9}];
    barrier = new Barrier(center, cells, 'smallTreasureBox2');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(0, 10);
    cells = [{row: 0, col: 10}];
    barrier = new Barrier(center, cells, 'stump');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(1, 11);
    cells = [{row: 1, col: 11}];
    barrier = new Barrier(center, cells, 'smallTree');
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(3, 11);
    cells = [{row: 3, col: 11}];
    barrier = new Barrier(center, cells, 'ladybug');
    container.addChild(barrier.src);
    barriers.push(barrier);
}

// event handlers
function tryBuildingTower(event) {
    let x = event.localX, y = event.localY;
    let cell = calCell(x, y);
    if (isValidCell(cell.row, cell.col) && terrain[cell.row][cell.col].status === 'available') {
        for (let r = 0;r < row;r++) {
            for (let c = 0;c < col;c++) {
                if ((r !== cell.row || c !== cell.col) && terrain[r][c].showing) terrain[r][c].hide();
            }
        }
        terrain[cell.row][cell.col].showChoices();
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

function stopOrContinue(event){
    console.log("status=",status);
    if(status === 0)//if not running
    {
        navbar.stopButton.rotation = 0;
        navbar.stopButton.x = 760;
        navbar.stopButton.y = 3;
        navbar.stopButton.sourceRect = new createjs.Rectangle(1323, 310, 40, 40);
        status = 1;
    }
    else//if running
    {
        navbar.stopButton.rotation = 270;
        navbar.stopButton.x = 765;
        navbar.stopButton.y = 64;
        navbar.stopButton.sourceRect = new createjs.Rectangle(1143, 475, 40, 40);
        status = 0;
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

function getNextTurningPoint(x, y) {
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