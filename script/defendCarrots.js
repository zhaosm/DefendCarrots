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
let tempQueue;
let carrot;
// background size and scaleFactor
let backgroundWidth, backgroundHeight, scaleFactor = 0;
// terrain sizes
let cellWidth, cellHeight, row = 7, col = 12;
// monsters, barriers and towers
let monsterTimer = 0, towerTimer = 0, monsterSpeed = 2, monsterBlood = 100, barrierBlood = 200;// , speedFactor = 1;// speed: per second
let monsters = [], towers = [], bullets = [];
let bottleBulletSpeed, pooSpeed, towerRadius = 1000, towerUpgradeCost = 180, towerPrice = 100;
let bloodWidth, bloodHeight;
// multi-use sprite sheet data
let multiUseSpriteSheetData = {};
// navBar
let navbar, list, deathbar;
const originCoins = 5000;
let life = 10, coins = originCoins;
let speed = 1;

// update
let tickEvent = null;

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

let startSceneSrc, startButtonSrc;

// classes
class Carrot {
    constructor() {
        this.move = new createjs.SpriteSheet(carrotData);
        //SpriteSheet类设置帧和动画,里面的run为开始的动画
        this.src = new createjs.Sprite(this.move,"run");
        this.lifeCard = new createjs.Bitmap(queue.getResult('10lifesCard'));
        let cardBounds = this.lifeCard.getBounds();
    }
    updateLife(life) {
        if (life <= 0 || life > 10) return;

        let center = {x: this.src.x, y: this.src.y};
        container.removeChild(this.src);
        if (life === 9) {
            this.src = new createjs.Bitmap(queue.getResult('9lifes'));
        }
        else if(life === 8 || life === 7) {
            this.src = new createjs.Bitmap(queue.getResult('8lifes'));
        }
        else if(life === 6 || life === 5) {
            this.src = new createjs.Bitmap(queue.getResult('6lifes'));
        }
        else if(life > 1) {
            this.src = new createjs.Bitmap(queue.getResult(life + 'lifes'));
        }
        else this.src = new createjs.Bitmap(queue.getResult(life + 'life'));
        let srcBounds = this.src.getBounds();
        this.src.regX = srcBounds.width / 2;
        this.src.regY = srcBounds.height / 2;
        this.src.x = center.x;
        this.src.y = center.y;
        container.addChild(this.src);

        let cardName = life > 1 ? (life + 'lifesCard') : (life + 'lifeCard');
        let newCard = new createjs.Bitmap(queue.getResult(cardName));
        newCard.regX = this.lifeCard.regX;
        newCard.regY = this.lifeCard.regY;
        newCard.x = this.lifeCard.x;
        newCard.y = this.lifeCard.y;
        container.removeChild(this.lifeCard);
        container.addChild(newCard);

        // explode animation
        // let animation = new createjs.Sprite(new createjs.SpriteSheet(multiUseSpriteSheetData.explode), 'explode');
        // let animationBounds = animation.getBounds();
        // animation.regX = animationBounds.width / 2;
        // animation.regY = animationBounds.height / 2;
        // animation.x = this.src.x;
        // animation.y = this.src.y;
        // animation.on('animationend', function() {
        //     container.removeChild(this);
        // });
        // container.addChild(animation);
        showExplodeAnimation.call(this);
    }
}

function showExplodeAnimation() {
    // explode animation
    let animation = new createjs.Sprite(new createjs.SpriteSheet(multiUseSpriteSheetData.explode), 'explode');
    let animationBounds = animation.getBounds();
    animation.regX = animationBounds.width / 2;
    animation.regY = animationBounds.height / 2;
    animation.x = this.src.x;
    animation.y = this.src.y;
    animation.on('animationend', function() {
        container.removeChild(this);
    });
    container.addChild(animation);
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

        let buttonsSrc = queue.getResult('buttons');
        this.stopButton = new createjs.Bitmap(buttonsSrc);
        this.stopButton.x = 760;
        this.stopButton.y = 10;
        //1363*512
        this.stopButton.sourceRect = new createjs.Rectangle(0, 0, 34,34);
        this.stopButton.scaleX = 1.5;
        this.stopButton.scaleY = 1.5;
        this.stopButton.addEventListener("click", stopOrContinue);
        this.src.addChild(this.stopButton);


        this.listButton = new createjs.Bitmap(buttonsSrc);
        this.listButton.x = 835;
        this.listButton.y = 10;
        //1363*512
        this.listButton.sourceRect = new createjs.Rectangle(0, 68, 34, 34);
        this.listButton.scaleX = 1.5;
        this.listButton.scaleY = 1.5;
        this.listButton.addEventListener("click", showList);
        this.src.addChild(this.listButton);

        let v2src = queue.getResult('v2');
        this.v2Button = new createjs.Bitmap(v2src);
        this.v2Button.x = 640;
        this.v2Button.y = 10;
        //1363*512
        this.v2Button.sourceRect = new createjs.Rectangle(0, 0, 71, 36);
        this.v2Button.scaleX = 1.5;
        this.v2Button.scaleY = 1.5;
        this.v2Button.addEventListener("click", changeSpeed);
        this.src.addChild(this.v2Button);
    }
}

class Deathbar{
    constructor(){
        let deathBarSrc = queue.getResult('gameover');
        this.src = new createjs.Container();
        this.src.scaleX = 1.5;
        this.src.scaleY = 1.5;

        let transparentLayer = new createjs.Shape();
        transparentLayer.graphics.beginFill("#000000").drawRect(0, 0, backgroundWidth * scaleFactor, backgroundHeight * scaleFactor);
        transparentLayer.alpha = 0.3;
        transparentLayer.on('click', function(){});
        this.src.addChild(transparentLayer);

        this.bar = new createjs.Bitmap(deathBarSrc);
        this.bar.x = 110;
        this.bar.y = 50;
        this.src.addChild(this.bar);

        let listButtonsSrc = queue.getResult('listButtons');
        this.restartButton = new createjs.Bitmap(listButtonsSrc);
        this.restartButton.sourceRect = new createjs.Rectangle(0, 0, 152, 48);
        this.restartButton.x = 240;
        this.restartButton.y = 230;
        this.restartButton.addEventListener('click', restart);
        this.src.addChild(this.restartButton);

        this.src.visible = false;
    }
}

class List {
    constructor() {
        this.src = new createjs.Container();
        //this.src.addEventListener("click", function (){});
        this.src.scaleX = 1.5;
        this.src.scaleY = 1.5;

        let transparentLayer = new createjs.Shape();
        transparentLayer.graphics.beginFill("#000000").drawRect(0, 0, backgroundWidth * scaleFactor, backgroundHeight * scaleFactor);
        transparentLayer.alpha = 0.3;
        transparentLayer.on('click', function(){});
        this.src.addChild(transparentLayer);

        let listsrc = queue.getResult('list');
        this.listBackground = new createjs.Bitmap(listsrc);
        this.listBackground.x = 180;
        this.listBackground.y = 120;
        //this.listBackground.addEventListener('click', function (){});
        this.src.addChild(this.listBackground);

        let listButtonsSrc = queue.getResult('listButtons');
        this.resumeButton = new createjs.Bitmap(listButtonsSrc);
        this.resumeButton.sourceRect = new createjs.Rectangle(0, 96, 152, 48);
        this.resumeButton.x = 240;
        this.resumeButton.y = 138;
        this.resumeButton.addEventListener('click', backToNormal);
        this.src.addChild(this.resumeButton);

        this.restartButton = new createjs.Bitmap(listButtonsSrc);
        this.restartButton.sourceRect = new createjs.Rectangle(0, 0, 152, 48);
        this.restartButton.x = 240;
        this.restartButton.y = 200;
        this.restartButton.addEventListener('click', restart);
        this.src.addChild(this.restartButton);

        this.backButton = new createjs.Bitmap(listButtonsSrc);
        this.backButton.sourceRect = new createjs.Rectangle(0, 48, 152, 48);
        this.backButton.x = 240;
        this.backButton.y = 262;
        this.backButton.addEventListener('click', backToMain);
        this.src.addChild(this.backButton);
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
        this.power = 20;
        this.price = towerPrice;
        this.upLevelPrices = [];
        this.upLevelImgs = [];
        this.levelIconNames = [];
        this.upLevelImg = null;
        this.priceImgNames = [];
        this.base = null;
        this.upGradeAnimation = null;
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
    ableToUpGrade() {
        if (this.upGradeAnimation) return;
        let data = {
            "images": [
                queue.getResult('upGradeSpriteSheet'),
            ],
            "frames": [
                [1, 1, 20, 24],
                [23, 1, 20, 24]
            ],

            "animations": {
                "upGrade": {
                    "frames": [0, 1],
                    'speed': 1
                }
            }
        };
        let animation = new createjs.Sprite(new createjs.SpriteSheet(data), 'upGrade');
        let animationBounds = animation.getBounds();
        animation.regX = animationBounds.width / 2;
        animation.regY = animationBounds.height / 2;
        animation.x = this.src.x;
        animation.y = this.src.y - this.src.getBounds().height / 2 - animationBounds.height / 2;
        this.upGradeAnimation = animation;
        container.addChild(animation);
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
        if (this.constructor.name === 'Shit' && monsterContainer.isSlowDown) return;
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
        container.removeChild(this.circle);
        this.initAttackCircle();
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
        this.radius = this.radius + cellWidth;
        coins -= this.upLevelPrices[this.level - 2];
        this.resetIcon(this.levelIconNames[this.level - 1]);
        this.showUpLevelAnimation();

        // debug
        // alert(this.constructor.name + " uplevel, new level: " + this.level + ", coins remain: " + coins);
    }
    showUpLevelAnimation() {
        let data = {
            "images": [
                queue.getResult('upLevelBaseSpriteSheet')
            ],
            "frames": [
                [1, 1, 120, 76],
                [123, 1, 120, 76],
                [245, 1, 120, 76],
                [367, 1, 120, 76]
            ],
            "animations": {
                "upLevelBase": {
                    "frames": [0, 1, 2, 3],
                    'speed': .3
                }
            }
        };
        let animation = new createjs.Sprite(new createjs.SpriteSheet(data), 'upLevelBase');
        let animationBounds = animation.getBounds();
        animation.regX = animationBounds.width / 2;
        animation.regY = animationBounds.height / 2;
        animation.x = this.src.x;
        animation.y = this.src.y + this.src.getBounds().height / 2;
        animation.on('animationend', function() {
            container.removeChild(this);
        });
        if (this.constructor.name === 'Bottle') container.addChildAt(animation, container.getChildIndex(this.base));
        else container.addChildAt(animation, container.getChildIndex(this.src));

        let upLevelLight = new createjs.Bitmap(queue.getResult('upLevelLight'));
        let upLevelLightBounds = upLevelLight.getBounds();
        upLevelLight.regX = upLevelLightBounds.width / 2;
        upLevelLight.regY = upLevelLightBounds.height / 2;
        upLevelLight.x = this.src.x;
        upLevelLight.y = this.src.y + this.src.getBounds().height / 2 - upLevelLightBounds.height / 2;
        createjs.Tween.get(upLevelLight, {loop: false})
            .to({y: this.src.y - this.src.getBounds().height / 2, alpha: 0}, 600, createjs.Ease.getPowInOut(2));
        container.addChild(upLevelLight);
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

        showExplodeAnimation.call(this);

        this.base = new createjs.Bitmap(queue.getResult('bottleBase'));
        let baseBounds = this.base.getBounds();
        this.base.regX = baseBounds.width / 2;
        this.base.regY = baseBounds.height / 2;
        this.base.x = center.x;
        this.base.y = center.y;
        container.addChild(this.base);
    }
    setParameters() {
        super.setParameters();
        this.radius = cellWidth * 2;
        this.power = 25;
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
        this.attackSpriteSheets = [];
        this.setAttackSpriteSheets();
        // let spriteSheetImg = queue.getResult('sunSpriteSheet');
        // let data = {
        //     images: [spriteSheetImg],
        //     frames: [
        //         [1, 1, 301, 301],
        //         [304, 1, 301, 301],
        //         [607, 1, 301, 301],
        //         [910, 1, 301, 301],
        //         [1213, 1, 301, 301]
        //     ],
        //     animations: {
        //         level1: {
        //             frames: [0, 1, 2, 3, 4],
        //             speed: .3
        //         }
        //     }
        // };
        // this.spriteSheet = new createjs.SpriteSheet(data);
        this.fireSpriteSheet = null;
        this.setFireSpriteSheet();

        this.radius = this.attackSpriteSheets[0].getFrame(0).rect.width / 2;

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
    setAttackSpriteSheets() {
        let data = {
            "images": [
                queue.getResult('sunAttack_level1_spriteSheet'),
            ],

            "frames": [
                [1, 1, 200, 200],
                [203, 1, 200, 200],
                [405, 1, 200, 200]
            ],

            "animations": {
                "attack": {
                    "frames": [0, 1, 2],
                    'speed': .3
                }
            }
        };
        this.attackSpriteSheets.push(new createjs.SpriteSheet(data));

        data = {
            "images": [
                queue.getResult('sunAttack_level2_spriteSheet'),
            ],

            "frames": [
                [1, 1, 245, 245],
                [248, 1, 245, 245],
                [495, 1, 245, 245],
                [742, 1, 245, 245]
            ],

            "animations": {
                "attack": {
                    "frames": [0, 1, 2, 3],
                    'speed': .3
                }
            }
        };
        this.attackSpriteSheets.push(new createjs.SpriteSheet(data));

        data = {
            "images": [
                queue.getResult('sunAttack_level3_spriteSheet')
            ],

            "frames": [
                [1, 1, 300, 300],
                [303, 1, 300, 300],
                [605, 1, 300, 300],
                [907, 1, 300, 300]
            ],

            "animations": {
                "attack": {
                    "frames": [0, 1, 2, 3],
                    'speed': .3
                }
            }
        };
        this.attackSpriteSheets.push(new createjs.SpriteSheet(data));
    }
    setFireSpriteSheet() {
        let data = {
            "images": [
                queue.getResult('sunFireSpriteSheet')
            ],

            "frames": [
                [1, 1, 76, 56],
                [79, 1, 76, 56],
                [157, 1, 76, 56],
                [235, 1, 76, 56],
                [313, 1, 76, 56]
            ],

            "animations": {
                "fire": {
                    "frames": [0, 1, 2, 3, 4],
                    'speed': .3
                }
            }
        };
        this.fireSpriteSheet = new createjs.SpriteSheet(data);
    }
    setParameters() {
        super.setParameters();
        this.power = 20;
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
    attack(monsterContainer) {
        // if (this.attacked) return;
        let animation = new createjs.Sprite(this.attackSpriteSheets[this.level - 1], 'attack');
        animation.regX = animation.regY = this.radius;
        animation.x = this.src.x;
        animation.y = this.src.y;
        animation.on('animationend', function() {
            container.removeChild(this);
        });
        container.addChild(animation);
        monsterContainer.blood -= this.power;

        let fireAnimation = new createjs.Sprite(this.fireSpriteSheet, 'fire');
        let fireAnimationBounds = fireAnimation.getBounds();
        fireAnimation.regX = fireAnimationBounds.width / 2;
        fireAnimation.regY = fireAnimationBounds.height / 2;
        fireAnimation.x = monsterContainer.src.x;
        fireAnimation.y = monsterContainer.src.y;
        fireAnimation.on('animationend', function() {
            container.removeChild(this);
        });
        container.addChild(fireAnimation);
    }
    upLevel() {
        super.upLevel();
        let spriteSheet = this.attackSpriteSheets[this.level - 1];
        this.radius = spriteSheet.getFrame(spriteSheet.getNumFrames('attack') - 1).rect.width / 2;
        // debug
        console.log(this.radius);
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
        this.originspeed = monsterSpeed
        this.speed = this.originspeed;
        this.slowDownTimer = 0;
        this.isSlowDown = false;
        this.createSlowDownSpriteSheet();
        this.setValue(14);
    }
    setValue(value) {
        this.value = value;
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
        this.originBlood = monsterBlood;
        this.blood = this.originBlood;
        this.bloodColor = "#0b8672";
        // this.bloodHeight = monsterBounds.height / 5;
        // this.bloodDist = monsterBounds.height / 5;
        this.bloodHeight = bloodHeight;
        this.bloodDist = this.bloodHeight;
        this.bloodWidth = bloodWidth;
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
        blood.graphics.beginFill(this.bloodColor).drawRect(monsterBounds.width / 2 - this.bloodWidth / 2, 0, this.bloodWidth * this.blood / this.originBlood, this.bloodHeight);
        blood.alpha = 0.6;
        // blood.graphics.beginFill(this.bloodColor).drawRect(0, 0, this.bloodWidth, this.bloodHeight);
        blood.name = 'blood';
        return blood;
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
        let dieData = multiUseSpriteSheetData.monsterDie;
        this.dieSpriteSheet = new createjs.SpriteSheet(dieData);
    }
    updateBlood() {
        if (this.blood < 0) this.blood = 0;
        this.src.removeChild(this.src.getChildByName('blood'));
        let blood = this.createBlood(this.src.getChildByName('monster').getBounds());
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

        showValue.call(this, spriteBounds);
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

function showValue(spriteBounds) {
    let value = new createjs.Bitmap(queue.getResult('value' + this.value));
    value.x = this.src.x;
    let originY = this.src.y - spriteBounds.height / 2 + value.getBounds().height / 2;
    value.y = originY;
    container.addChild(value);
    createjs.Tween.get(value, {loop: false})
        .to({y: originY - cellHeight * 0.3}, 600, createjs.Ease.getPowInOut(4))
        .to({alpha: 0, y: originY - cellHeight * 0.5}, 400, createjs.Ease.getPowInOut(2))
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
        this.blood = this.originBlood = monsterBlood * 0.7;
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
        this.blood = this.originBlood = monsterBlood * 2;
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
        this.hitSpriteSheet = null;
        this.setHitSpriteSheet();
    }
    setHitSpriteSheet() {}
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
        let animation = new createjs.Sprite(this.hitSpriteSheet, 'hit');
        let animationBounds = animation.getBounds();
        animation.regX = animationBounds.width / 2;
        animation.regY = animationBounds.height / 2;
        animation.x = monsterContainer.src.x;
        animation.y = monsterContainer.src.y;
        animation.on('animationend', function() {
            container.removeChild(this);
        });
        container.addChild(animation);
    }
}

class BottleBullet extends Bullet {
    constructor(level, ...args) {
        super(...args);
        let src = queue.getResult('bottleBullet_level' + level);
        this.src = new createjs.Bitmap(src);
        this.speed = bottleBulletSpeed * level;
        this.power = 25 + 5 * level;
    }
    setHitSpriteSheet() {
        let data = {
            "images": [
                queue.getResult('bottleBulletHitSpriteSheet'),
            ],

            "frames": [
                [1, 1, 60, 60],
                [63, 1, 60, 60]
            ],

            "animations": {
                "hit": {
                    "frames": [0, 1],
                    'speed': .4
                },
            }
        };
        this.hitSpriteSheet = new createjs.SpriteSheet(data);
    }
    attack(monsterContainer) {
        super.attack(monsterContainer);
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
        super.attack(monsterContainer);
        if (!monsterContainer.isSlowDown) monsterContainer.slowDown(this.power);
    }
    setHitSpriteSheet() {
        let data = {
            "images": [
                queue.getResult('pooHitSpriteSheet')
            ],

            "frames": [
                [1, 1, 47, 52],
                [50, 1, 47, 52]
            ],

            "animations": {
                "hit": {
                    "frames": [0, 1],
                    'speed': .4
                },
            }
        };
        this.hitSpriteSheet = new createjs.SpriteSheet(data);
    }
}

class Barrier{
    constructor(center, cells, srcName, ) {
        let icon = this.createSrc(srcName);
        let iconBounds = icon.getBounds();
        icon.regX = iconBounds.width / 2;
        icon.regY = iconBounds.height / 2;
        // this.bloodHeight = iconBounds.height / 5;
        // this.bloodDist = iconBounds.height / 5;
        this.bloodHeight = bloodHeight;
        this.bloodDist = this.bloodHeight;
        this.bloodWidth = bloodWidth;
        icon.x = icon.regX;
        icon.y = this.bloodHeight + this.bloodDist + icon.regY;
        icon.name = 'icon';
        icon.instance = this;
        this.shootThis = false;
        icon.clickToShootThis = true;
        icon.on('click', function() {
            if(this.clickToShootThis) {
                for (let barrier of barriers) {
                    if (barrier.shootThis) {
                        barrier.stopShootingThis();
                    }
                }
                this.instance.shootThis = true;
            }
            else this.instance.shootThis = false;
            this.clickToShootThis = !this.clickToShootThis;
        });

        this.blood = this.originBlood = barrierBlood;
        this.bloodColor = "#0b8672";
        let blood = this.createBlood(iconBounds);

        this.src = new createjs.Container();
        this.src.regX = icon.regX;
        this.src.regY = icon.y;
        this.src.x = center.x;
        this.src.y = center.y;
        this.src.addChild(icon);
        this.src.addChild(blood);

        let dieData = multiUseSpriteSheetData.monsterDie;

        this.dieSpriteSheet = new createjs.SpriteSheet(dieData);

        this.cells = cells;
        for (let cell of this.cells ){
            terrain[cell.row][cell.col].type = 'barrier';
            terrain[cell.row][cell.col].status = 'unavailable';
        }

        this.setValue(50);
    }
    setValue(value) {
        this.value = value;
    }
    createSrc(srcName) {
        // return src instance
        return new createjs.Bitmap(queue.getResult(srcName));
    }
    createBlood(iconBounds) {
        let blood = new createjs.Shape();
        blood.graphics.beginFill(this.bloodColor).drawRect(iconBounds.width / 2 - this.bloodWidth / 2, iconBounds.height / 4, this.bloodWidth * this.blood / this.originBlood, this.bloodHeight);
        // blood.graphics.beginFill(this.bloodColor).drawRect(0, 0, this.bloodWidth, this.bloodHeight);
        blood.alpha = 0.6;
        blood.name = 'blood';
        return blood;
    }
    updateBlood() {
        if (this.blood < 0) this.blood = 0;
        this.src.removeChild(this.src.getChildByName('blood'));
        let blood = this.createBlood(this.src.getChildByName('icon').getBounds());
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

        showValue.call(this, spriteBounds);

        for (let cell of this.cells ){
            terrain[cell.row][cell.col].type = 'openSpace';
            terrain[cell.row][cell.col].status = 'available';
        }
    }
    stopShootingThis() {
        this.shootThis = false;
        this.src.clickToShootThis = true;
    }

}

// control
function initstart() {
    stage = new createjs.Stage("myCanvas");
    tempQueue = new createjs.LoadQueue();
    tempQueue.on('complete', start);
    tempQueue.loadManifest([
        {src: 'image/startScene.png', id: 'startScene'},
        {src: 'image/startButton.png', id: 'startButton'},
        {src: 'image/startMonster.png', id: 'startMonster'},
        {src: 'image/cloud.png', id: 'cloud'}]
    );
    console.log("initstart");
}

function start(){
    startSceneSrc = tempQueue.getResult('startScene');

    container = new createjs.Container();
    stage.addChild(container);

    let bg = new createjs.Bitmap(startSceneSrc);
    backgroundWidth = startSceneSrc.width;
    backgroundHeight = startSceneSrc.height;
    //setParametersRelatedToBackgroundSize();
    scaleFactor = Math.min(stage.canvas.width / startSceneSrc.width, stage.canvas.height / startSceneSrc.height);
    container.addChild(bg);
    container.scaleX = scaleFactor;
    container.scaleY = scaleFactor;

    let startMonsterSrc = tempQueue.getResult('startMonster');
    let startMonster = new createjs.Bitmap(startMonsterSrc);
    startMonster.x = 110;
    startMonster.y = 80;
    createjs.Tween.get(startMonster,{loop:true})
        .to({y:130},1500)
        .to({y:80},1500);
    container.addChild(startMonster);

    let cloudSrc = tempQueue.getResult('cloud');
    let cloud = new createjs.Bitmap(cloudSrc);
    cloud.x = 700;
    cloud.y = 40;
    createjs.Tween.get(cloud,{loop:true})
        .to({x:400},10000)
        .wait(2000)
        .to({x:700},10000)
        .wait(2000);
    container.addChild(cloud);

    createjs.Ticker.setFPS(60);
    tickEvent = createjs.Ticker.addEventListener('tick', function(){stage.update();});
    init();
}

function prepareToStart() {
    startButtonSrc = tempQueue.getResult('startButton');
    let startButton = new createjs.Bitmap(startButtonSrc);
    startButton.x = 320;
    startButton.y = 500;
    startButton.addEventListener('click', handleComplete);
    container.addChild(startButton);
    stage.update();
}

function init() {
    let manifest = [
        {src: 'image/background.png', id: 'background'},
        {src: 'image/items.png', id: 'items'},
        {src: 'image/buttons.png', id: 'buttons'},
        {src: 'image/v2.png', id: 'v2'},
        {src: 'image/list.png', id: 'list'},
        {src: 'image/listButtons.png', id: 'listButtons'},
        {src: 'image/gameover.png', id: 'gameover'},
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
        {src: 'image/windMill.png', id: 'windMill'},
        {src: 'image/1life.png', id: '1life'},
        {src: 'image/2lifes.png', id: '2lifes'},
        {src: 'image/3lifes.png', id: '3lifes'},
        {src: 'image/4lifes.png', id: '4lifes'},
        {src: 'image/6lifes.png', id: '6lifes'},
        {src: 'image/8lifes.png', id: '8lifes'},
        {src: 'image/9lifes.png', id: '9lifes'},
        {src: 'image/1lifeCard.png', id: '1lifeCard'},
        {src: 'image/2lifesCard.png', id: '2lifesCard'},
        {src: 'image/3lifesCard.png', id: '3lifesCard'},
        {src: 'image/4lifesCard.png', id: '4lifesCard'},
        {src: 'image/5lifesCard.png', id: '5lifesCard'},
        {src: 'image/6lifesCard.png', id: '6lifesCard'},
        {src: 'image/7lifesCard.png', id: '7lifesCard'},
        {src: 'image/8lifesCard.png', id: '8lifesCard'},
        {src: 'image/9lifesCard.png', id: '9lifesCard'},
        {src: 'image/10lifesCard.png', id: '10lifesCard'},
        {src: 'image/value14.png', id: 'value14'},
        {src: 'image/value50.png', id: 'value50'},
        {src: 'image/value75.png', id: 'value75'},
        {src: 'image/value150.png', id: 'value150'},
        {src: 'image/explodeSpriteSheet.png', id: 'explodeSpriteSheet'},
        {src: 'image/bottleBulletHitSpriteSheet.png', id: 'bottleBulletHitSpriteSheet'},
        {src: 'image/pooHitSpriteSheet.png', id: 'pooHitSpriteSheet'},
        {src: 'image/sunAttack_level1_spriteSheet.png', id: 'sunAttack_level1_spriteSheet'},
        {src: 'image/sunAttack_level2_spriteSheet.png', id: 'sunAttack_level2_spriteSheet'},
        {src: 'image/sunAttack_level3_spriteSheet.png', id: 'sunAttack_level3_spriteSheet'},
        {src: 'image/sunFireSpriteSheet.png', id: 'sunFireSpriteSheet'},
        {src: 'image/upLevelBaseSpriteSheet.png', id: 'upLevelBaseSpriteSheet'},
        {src: 'image/bottleBase.png', id: 'bottleBase'},
        {src: 'image/upLevelLight.png', id: 'upLevelLight'},
        {src: 'image/upGradeSpriteSheet.png', id: 'upGradeSpriteSheet'}
    ];
    queue = new createjs.LoadQueue();
    queue.on('complete', prepareToStart);
    queue.loadManifest(manifest);
}

function handleComplete() {
    showStage();
    addCarrot();
    addNavbar();
    addDeathbar();
    addList();
    setControllers();
    startGame();
}

function showStage() {
    setSpriteSheetData();

    let backgroundsrc = queue.getResult('background');
    background = new createjs.Bitmap(backgroundsrc);
    backgroundWidth = backgroundsrc.width;
    backgroundHeight = backgroundsrc.height;
    setParametersRelatedToBackgroundSize();

    scaleFactor = Math.min(stage.canvas.width / backgroundsrc.width, stage.canvas.height / backgroundsrc.height);

    container.addChild(background);
    container.scaleX = scaleFactor;
    container.scaleY = scaleFactor;
    // stage.addChild(container);

    generateBarriers();
}

function setSpriteSheetData() {
    multiUseSpriteSheetData.explode = {
        "images": [
            queue.getResult('explodeSpriteSheet'),
        ],

        "frames": [
            [1, 1, 174, 164],
            [177, 1, 174, 164],
            [353, 1, 174, 164],
            [529, 1, 174, 164]
        ],

        "animations": {
            "explode": {
                "frames": [0, 1, 2, 3],
                'speed': .3
            },
        }
    };
    multiUseSpriteSheetData.monsterDie = {
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
}

function setParametersRelatedToBackgroundSize() {
    cellWidth = (terrainBound.rightTop.x - terrainBound.leftTop.x) / col * backgroundWidth;
    cellHeight = (terrainBound.leftBottom.y - terrainBound.leftTop.y) / row * backgroundHeight;
    bloodWidth = cellWidth;
    bloodHeight = cellHeight / 6;
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

    let cardBounds = carrot.lifeCard.getBounds();
    carrot.lifeCard.regX = cardBounds.width / 2;
    carrot.lifeCard.regY = cardBounds.height / 2;
    carrot.lifeCard.x = center.x - frameBounds.width / 2 - cardBounds.width / 2;
    carrot.lifeCard.y = center.y - frameBounds.height / 2;
    container.addChild(carrot.lifeCard);
}

function addNavbar() {
    navbar = new Navbar();
    container.addChild(navbar.src);
}

function addDeathbar() {
    deathbar = new Deathbar();
    container.addChild(deathbar.src);
}

function addList() {
    list = new List();
    list.src.visible = false;
    container.addChild(list.src);
    //stopOrContinue();
}

function setControllers() {
    background.addEventListener("click", tryBuildingTower);
}

function startGame() {
    createjs.Ticker.setFPS(60);
    if (tickEvent) createjs.Ticker.removeEventListener('tick', tickEvent);
    tickEvent = createjs.Ticker.addEventListener('tick', update);
    status = 1;
}

function decreaseLife() {
    life--;
    carrot.updateLife(life);
    // debug
    // alert('life remain: ' + life);
}

function fail() {
    console.log("fail");
    deathbar.src.visible = true;
    stopOrContinue();
}

// update functions
function update() {
    // update
    if(status === 1)
    {
        updateMonsters();
        updateBarriers();
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
            coins += monsters[i].value;
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

        // reached end of the land, eat carrot
        if (dx === 0 && dy === 0) {
            decreaseLife();
            if (life === 0) {
                fail();
            }
            container.removeChild(monsters[i].src);
            monsters.splice(i, 1);
            continue;
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

function updateBarriers() {
    for (let i = 0;i < barriers.length;) {
        if (barriers[i].blood <= 0) {
            container.removeChild(barriers[i].src);
            barriers[i].die();
            coins += barriers[i].value;
            barriers.splice(i, 1);
            continue;
        }
        barriers[i].updateBlood();
        i++;
    }
}

function updateTowers() {
    /*
    * 找怪物，产生子弹*/
    for (let tower of towers) {
        if (coins >= tower.price) tower.ableToUpGrade();
        else container.removeChild(tower.upGradeAnimation);
        tower.upGradeAnimation = null;
    }

    towerTimer++;
    let shootBarrier = false, targetBarrier = null;
    for(let barrier of barriers) {
        if (barrier.shootThis) {
            shootBarrier = true;
            targetBarrier = barrier;
            break;
        }
    }
    if (!shootBarrier) {
        for (let tower of towers) {
            let center = {x: carrot.src.x, y: carrot.src.y};
            if ((towerTimer % 15 === 0 && tower.constructor.name === 'Bottle') || (towerTimer % 20 === 0 && tower.constructor.name === 'Shit')) {
                tower.attack(tower.findTarget(monsters, center));
            }
            else if (tower.constructor.name === 'Sun') {
                if (tower.timer % 60 === 0) {
                    let targets = tower.findTargets(monsters);
                    if (targets.length) {
                        for (let monsterContainer of monsters) {
                            tower.attack(monsterContainer);
                        }
                    }
                }
                tower.timer++;
            }
        }
    }
    else {
        for (let tower of towers) {
            if (towerTimer % 10 === 0 && eucDistance(tower.src.x, tower.src.y, targetBarrier.src.x, targetBarrier.src.y) <= tower.radius) {
                if (tower.constructor.name === 'Sun' && towerTimer % 40 === 0) tower.attack(targetBarrier);
                else if (tower.constructor.name === 'Bottle' || tower.constructor.name === 'Shit') tower.attack(targetBarrier);
            }
        }
    }
}

function updateBullets() {
    /*
    * 遍历子弹数组，更新每个子弹，检查每个子弹是否打到了怪物/障碍物，更新怪物/障碍物血量，如果血量<0删除
    * */
    // if reached destination, remove this bullet
    let shootBarrier = false, targetBarrier = null;
    for(let barrier of barriers) {
        if (barrier.shootThis) {
            shootBarrier = true;
            targetBarrier = barrier;
            break;
        }
    }
    if (!shootBarrier) {
        for (let i = 0; i < bullets.length;) {
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
            if (closest && almostEqual(closestDist, 0)) {
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
    else {
        for (let i = 0;i < bullets.length;) {
            if (bullets[i].constructor.name === 'BottleBullet' && almostEqual(eucDistance(bullets[i].src.x, bullets[i].src.y, targetBarrier.src.x, targetBarrier.src.y), 0)) {
                bullets[i].attack(targetBarrier);
                container.removeChild(bullets[i].src);
                bullets.splice(i, 1);
                continue;
            }
            i++;
        }
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
    barrier.value = 14;
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
    barrier.value = 150;
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
    barrier.value = 150;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(0, 6);
    cells = [{row: 0, col: 6}];
    barrier = new Barrier(center, cells, 'ladybug');
    barrier.value = 14;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(2, 7);
    cells = [{row: 2, col: 7}];
    barrier = new Barrier(center, cells, 'smallTreasureBox1');
    barrier.value = 75;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = {x: (getTerrainCellCenter(4, 6).x + getTerrainCellCenter(4, 7).x) / 2, y: (getTerrainCellCenter(5, 6).y + getTerrainCellCenter(4, 6).y) / 2};
    cells = [
        {row: 5, col: 6},
        {row: 5, col: 7},
        {row: 4, col: 6},
        {row: 4, col: 7}
    ];
    barrier = new Barrier(center, cells, 'windMill');
    barrier.value = 150;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = {x: (getTerrainCellCenter(2, 8).x + getTerrainCellCenter(2, 9).x) / 2, y: getTerrainCellCenter(2, 8).y};
    cells = [
        {row: 2, col: 8},
        {row: 2, col: 9}
    ];
    barrier = new Barrier(center, cells, 'largeStone');
    barrier.value = 50;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(4, 9);
    cells = [{row: 4, col: 9}];
    barrier = new Barrier(center, cells, 'smallTreasureBox2');
    barrier.value = 75;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(0, 10);
    cells = [{row: 0, col: 10}];
    barrier = new Barrier(center, cells, 'stump');
    barrier.value = 50;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(1, 11);
    cells = [{row: 1, col: 11}];
    barrier = new Barrier(center, cells, 'smallTree');
    barrier.value = 14;
    container.addChild(barrier.src);
    barriers.push(barrier);

    center = getTerrainCellCenter(3, 11);
    cells = [{row: 3, col: 11}];
    barrier = new Barrier(center, cells, 'ladybug');
    barrier.value = 14;
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
    let tower = null;
    if (type === 'Bottle') {
        tower = new Bottle(center);
    }
    else if (type === 'Sun') {
        tower = new Sun(center);
    }
    else if (type === 'Shit') {
        tower = new Shit(center);
    }
    towers.push(tower);
    container.addChild(tower.src);
    coins -= tower.price;
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

function changeSpeed(event){
    if(speed === 1)
    {
        speed = 2;
        navbar.v2Button.sourceRect = new createjs.Rectangle(0, 36, 71, 36);
        createjs.Ticker.setFPS(120);
    }
    else
    {
        speed = 1;
        navbar.v2Button.sourceRect = new createjs.Rectangle(0, 0, 71, 36);
        createjs.Ticker.setFPS(60);
    }
}

function stopOrContinue(event){
    //debug
    console.log("status=",status);
    if(status === 0)//if not running
    {
        navbar.stopButton.sourceRect = new createjs.Rectangle(0, 0, 34, 34);
        status = 1;
    }
    else//if running
    {
        navbar.stopButton.sourceRect = new createjs.Rectangle(0, 34, 34, 34);
        status = 0;
    }
}

function showList(event){
    stopOrContinue();
    list.src.visible = true;
    container.removeChild(list.src);
    container.addChild(list.src);
}

function backToNormal(event){
    stopOrContinue();
    list.src.visible = false;
}

function restart(event){
    life = 10;
    coins = 5000;
    container.removeAllChildren();
    resetParameters();
    handleComplete();
}

function resetParameters() {
    monsters = [];
    towers = [];
    bullets = [];
    barriers = [];
    landPath = [];
    terrain = [];
    monsterTimer = 0;
    towerTimer = 0;
    speedFactor = 1;
    life = 10;
    coins = originCoins;
    speed = 1;// ?
}

function backToMain(event){
    life = 10;
    coins = 5000;
    stage.visible = false;
    container.removeAllChildren();
    resetParameters();
    initstart();
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