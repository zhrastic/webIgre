import { Helper } from "./helper.js";
import { App } from "./main.js";
import { AppMessage } from "./appMessage.js";


class BricksGame {
    
    constructor() {
        this.moduleName = ko.observable("Bricks modul")
    }

    static getObject() {
        return new Stef();
    }

    activate() {
        this.game = new GameLoop();
    }

    dispose() {
        this.game.deactivate();
    }

    afterBinding(nodes) {
        this.game.init();
        let player = new Player(this.game);
        this.game.gameObjects.push(player);
        this.game.player = player;
        let ball = new Ball(this.game);
        this.game.gameObjects.push(ball);
        this.game.ball = ball;
        let brickWidth = 50;
        let brickHeight = 20;
        for (let i = 0; i < 12; i++) {
            for (let j = 0; j < 5; j++) {
                let brick = new Brick(this.game);
                let x = 10 + (i * brickWidth) + (i * 3);
                let y = 10 + j * brickHeight + (j * 3);
                brick.Init(x, y, brickWidth, brickHeight);
                this.game.gameObjects.push(brick);
            }
        }
    }

    newGame() {
        this.game.ballCount(5);
        this.game.startNewGame();
    }
}


class GameLoop {
    canvasWidth = 650;
    canvasHeight = 600;
    active = true;
    checkTime = performance.now();
    secTime = this.checkTime;
    frameDuration =  16.666666;  //60 FPS
    framesPerSecond = ko.observable(0);
    ballCount = ko.observable(5);
    frameCounter = 0;
    currentRequest;
    keyMap  = [];
    canvas = null;
    ctx = null;
    gameObjects = [];
    player = null;
    ball = null;

    startNewGame() {
        this.gameObjects.forEach(element => {
            if (element.type == GameObjectType.BRICK) {
                element.dropCounter = 3;
            }
        });
        this.currentAnimationRequest = window.requestAnimationFrame(this.gameLoop.bind(this));
    }

    init() {
        this.active = true;
        console.log("LOOP STARTED");
        this.currentAnimationRequest = window.requestAnimationFrame(this.gameLoop.bind(this));
        document.addEventListener('keydown', (e) => {
            if(!this.keyMap.includes(e.key)){
                this.keyMap.push(e.key);
            }
        });
        document.addEventListener('keyup', (e) => {
            if(this.keyMap.includes(e.key)){
                this.keyMap.splice(this.keyMap.indexOf(e.key), 1);
            }
        });
        this.canvas = document.getElementById('canvas');

        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.canvas.style.width  = `${this.canvasWidth}px`;
        this.canvas.style.height = `${this.canvasHeight}px`;
        this.ctx = canvas.getContext('2d');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    gameLoop() {
        
        if (!this.canvas) return;

        if (this.ballCount() <= 0) return;

        let frameTimeNow =  performance.now();
        this.frameCounter++;
        /*
        background je transparentan... 
        The clearRect() method sets the pixels in a rectangular area to transparent black (rgba(0,0,0,0)).
        */
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.gameObjects.forEach(element => {
            element.Update(frameTimeNow);
        });
        this.gameObjects.forEach(element => {
            element.Draw(this.ctx);
        });
 
        if (frameTimeNow > this.secTime + 1000) {
            //console.log(`FPS: ${this.framesPerSecond()}`);
            this.framesPerSecond(this.frameCounter);
            this.frameCounter = 0;
            this.secTime = performance.now();
        }

        if (this.active) {
            this.currentAnimationRequest = window.requestAnimationFrame(this.gameLoop.bind(this));
        }
        
    }

    deactivate() {
        this.active = false;
        window.cancelAnimationFrame(this.currentAnimationRequest);
        console.log("LOOP STOPED")
    }

}

class BaseGameObject {
    x = 0;
    y = 0;
    lastX = 0;
    lastY = 0;
    gameLoop = null;
    lastFrameTime = 0;
    frameDuration =  16.666666; //60 FPS
    type = GameObjectType.NONE;

    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.Init();
    }
    Init() {};
    Update(loopFrameTime) {};
    Draw(ctx) {};
}

class Player extends BaseGameObject {

    width = 80;
    height = 15;
    speedX = 20;
    currentMoveDirection = PlayerMoveDirection.NONE;
    touched = false;
    constructor(gameLoop) {
        super(gameLoop);
        this.type = GameObjectType.PLAYER;
    }

    Init() {
        this.x = 200;
        this.y = this.gameLoop.canvasHeight - 20;
    }

    Update(loopFrameTime) {

        if (loopFrameTime + this.frameDuration < this.lastFrameTime) return;
        this.lastFrameTime = loopFrameTime;
        this.currentMoveDirection = PlayerMoveDirection.NONE;

        this.lastX = this.x;
        this.lastY = this.y;
        let keyMap = this.gameLoop.keyMap;

        if (keyMap.length > 0) {
            for (let i = 0; i < keyMap.length; i++) {
                //console.log(`Korisnik stisnuo: ${keyMap[i]}`);
                
                let upperCaseKey = keyMap[i].toUpperCase();
    
                if (upperCaseKey == "ARROWUP" || upperCaseKey == " ") {
                    let kugla = this.gameLoop.ball;
                    if (kugla.lostLife) {
                        kugla.lostLife = false;
                    }
                } else if (upperCaseKey == "ARROWLEFT" || upperCaseKey == "A") {
                    this.x = this.x - this.speedX;
                    this.currentMoveDirection = PlayerMoveDirection.LEFT;
                    if (this.x < 0) this.x = 0;
                } else if (upperCaseKey == "ARROWRIGHT" || upperCaseKey == "D") {
                    this.x = this.x + this.speedX;
                    this.currentMoveDirection = PlayerMoveDirection.RIGHT;
                    if (this.x + this.width > this.gameLoop.canvasWidth) this.x = this.gameLoop.canvasWidth - this.width;
                }
            }
        }
    };

    Draw(ctx) {
        ctx.save();
        if (this.touched) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
            this.touched = false;
        } else {
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
        
    };
}

class Ball extends BaseGameObject{
    
    radius = 10;
    defaultSpeedX = 4;
    defaultSpeedY = 8;
    speedX = this.defaultSpeedX;
    speedY = this.defaultSpeedY;
    radiusHip = 0;

    lostLife = true;
    spinX = 0;

    brickCollision = false;
    sideCollision = false;

    constructor(gameLoop) {
        super(gameLoop);
        this.type = GameObjectType.BALL;
        this.Init();
    }

    Init() {
        this.x = 220;
        this.y = 470;
        this.radiusHip = Math.sqrt(Math.pow(this.radius, 2) * 2);
        this.speedY = Math.abs(this.defaultSpeedY) * -1;
    }

    Update(loopFrameTime) {

        if (loopFrameTime + this.frameDuration < this.lastFrameTime) return;
        this.lastFrameTime = loopFrameTime;

        if (this.brickCollision) {
            this.speedY = this.speedY * -1;
            this.brickCollision = false;
            if (this.sideCollision) {
                this.speedX = this.speedX * -1;
            }
            this.sideCollision = false;
            return;
        }

        this.lastX = this.x;
        this.lastY = this.y;

        let player = this.gameLoop.player;
        let playerLeftEdge = player.x;
        let playerRightEdge = player.x + player.width;
        let playerTopEdge = player.y;
        let playerBottomEdge = player.y + player.height;

        if (this.lostLife)  {
            //stick uz playera
            this.x = player.x + player.width /2;
            this.y = playerTopEdge - this.radius;
            return; 
        };

        let leftEdge = this.x - this.radius;
        let rightEdge = this.x + this.radius;
        let topEdge = this.y - this.radius;
        let bottomEdge = this.y + this.radius;

        //Kolizija sa player pločicom (kuglica ide prema dolje ball.speedY > 0)
        if (this.speedY > 0) {
            let changeXSpeed = false;
            if (bottomEdge + Math.abs(this.speedY) >= playerTopEdge && bottomEdge + Math.abs(this.speedY) < playerBottomEdge) {
                
                if (this.speedX < 0 ) {
                    let ballLeftEdgeAfterMove = leftEdge - Math.abs(this.speedX)
                    let ballRightEdgeAfterMove = rightEdge - Math.abs(this.speedX);
                    if (ballRightEdgeAfterMove >= playerLeftEdge && ballLeftEdgeAfterMove <= playerRightEdge) {
                        player.touched = true;
                        this.speedY = this.speedY * -1;
                        if (player.currentMoveDirection == PlayerMoveDirection.RIGHT) {
                            changeXSpeed = true;
                        }
                    }
                }

                if (this.speedX > 0 ) {
                    let ballLeftEdgeAfterMove = leftEdge + Math.abs(this.speedX)
                    let ballRightEdgeAfterMove = rightEdge + Math.abs(this.speedX);
                    if (ballRightEdgeAfterMove >= playerLeftEdge && ballLeftEdgeAfterMove <= playerRightEdge) {
                        player.touched = true;
                        this.speedY = this.speedY * -1;
                        if (player.currentMoveDirection ==  PlayerMoveDirection.LEFT) {
                            changeXSpeed = true;
                        }
                    }
                }

                if (changeXSpeed) {
                    this.speedX = (this.speedX + this.getValueUSmjeruX(2)) * -1;
                } else {
                    this.speedX = this.getValueUSmjeruX(this.defaultSpeedX);
                }
            }
        }

        if ((this.speedX < 0 && leftEdge - Math.abs(this.speedX) <= 0)  ) {
            this.speedX = this.speedX * -1;
            this.x = this.radius - Math.abs(this.speedX); //vraćamo na nulu slijedećim dodavanjem brzine
        }

        if (this.speedX > 0 && rightEdge + Math.abs(this.speedX) >= this.gameLoop.canvasWidth) {
            this.speedX = this.speedX * -1;
            this.x = this.gameLoop.canvasWidth - this.radius + Math.abs(this.speedX); //vraćamo na nulu sa dodavanjem brzine;
        }

        if (this.speedY < 0 && topEdge - Math.abs(this.speedY) <= 0) {
            this.speedY = this.speedY * -1;
            this.y = this.radius - Math.abs(this.speedY); //vraćamo na nulu slijedećim dodavanjem brzine;
        }

        if (this.speedY > 0 && bottomEdge + Math.abs(this.speedY) >= (this.gameLoop.canvasHeight + this.radius)) {
            this.lostLife = true;
            this.gameLoop.ballCount(this.gameLoop.ballCount() -1);
            return;
        }
        
        this.x = this.x + this.speedX;
        this.y = this.y + this.speedY;


    };

    Draw(ctx) {
        ctx.save();
        if (this.lostLife) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#003300';
            ctx.stroke(); 
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = 'green';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#003300';
            ctx.stroke(); 
            ctx.restore();
        }
        
    };

    getValueUSmjeruX(value) {
        if (this.speedX > 0) return value;
        else return value * -1;
    }
}

class Brick extends BaseGameObject {
    width = 0;
    height = 0;
    dropCounter = 3
    
    constructor(gameLoop) {
        super(gameLoop);
        this.type = GameObjectType.BRICK;
    }

    Init(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    Update(loopFrameTime) {
        if (loopFrameTime + this.frameDuration < this.lastFrameTime) return;
        if (this.dropCounter <= 0) return;

        let leftEdge = this.x;
        let rightEdge = this.x + this.width;
        let topEdge = this.y;
        let bottomEdge = this.y + this.height;

        let ball = this.gameLoop.ball;

        if (ball.brickCollision) return; //već se kugla sudarila sa drugom ciglicom, idi van

        let ballLeftEdge = ball.x - ball.radius;
        let ballRightEdge = ball.x + ball.radius;
        let ballTopEdge = ball.y - ball.radius;
        let ballBottomEdge = ball.y + ball.radius;

        if ((ball.speedY > 0 && (ballBottomEdge >= topEdge && ballBottomEdge <= bottomEdge)) || (ball.speedY < 0 && (ballTopEdge <= bottomEdge && ballTopEdge >= topEdge))) {
            if ((ballLeftEdge >= leftEdge && ballLeftEdge <= rightEdge) || (ballRightEdge >= leftEdge && ballRightEdge <= rightEdge) ) {
                this.dropCounter--;
                ball.brickCollision = true;
                //Detekcija da li je udarila po strani
                if (ballLeftEdge == rightEdge || ballRightEdge == leftEdge) {
                    ball.sideCollision = true;
                }
            }
        }
    };

    Draw(ctx) {
        ctx.save();
        switch (this.dropCounter) {
            case 3:
                ctx.beginPath();
                ctx.fillStyle = 'red';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'darkred';
                ctx.strokeRect(this.x, this.y, this.width, this.height); 
                break;
            case 2:
                ctx.beginPath();
                ctx.fillStyle = 'blue';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'darkblue';
                ctx.strokeRect(this.x, this.y, this.width, this.height);
                break;
            case 1:
                ctx.beginPath();
                ctx.fillStyle = 'gray';
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'darkgray';
                ctx.strokeRect(this.x, this.y, this.width, this.height); 
                break;
            default:
                break;
        }  
        ctx.restore();
        
    };

}

const PlayerMoveDirection = {
    NONE: "NONE",
    LEFT: "LEFT",
    RIGHT: "RIGHT"
}

const GameObjectType = {
    NONE: "NONE",
    PLAYER: "PLAYER",
    BALL: "BALL",
    BRICK: "BRICK"
}

export {BricksGame as GameModule};
