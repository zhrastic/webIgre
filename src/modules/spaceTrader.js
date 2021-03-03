import { Helper } from "./helper.js";
import { App } from "./main.js";
import { AppMessage } from "./appMessage.js";

class SpaceTrader {
    constructor() {
        this.moduleName = ko.observable("Trgujte u svemiru...");
        this.pubSub = null;
        this.indexDB = ko.observable(null);
        this.savedGame = null;
        this.hasSavedGames = ko.observable(false);

        this.user = "Anonymous";

        this.animationInterval = null;

        this.canvasMouseX = 0;
        this.canvasMouseY = 0;
        this.canvasRect = null;

        this.planets = [];
        this.selectedPlanet = ko.observable(null);
        this.ship = ko.observable(null);
        this.shipMove = false;
        this.redraw = false

    }

    static getObject() {
        return new SpaceTrader();
    }

    activate(pubSub) {
        this.pubSub = pubSub;
        this.spaceShipImage = new Image();
        let self = this;
        this.spaceShipImage.addEventListener('load', function() {

            let ship = new Ship(20, 20, 0, self.spaceShipImage);
            self.ship(ship);
            self.redrawCanvas();
            
        }, false);
        this.spaceShipImage.src = 'img/spaceship.png'; // Set source path
    }
    dispose() {
        this.reset();
    }
 
    reset() {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
        this.canvasMouseX = 0;
        this.canvasMouseY = 0;
        this.canvasRect = null;
        this.selectedPlanet(null);
        this.planets = [];
        this.shipMove = false;
        this.ship(null);
        this.redraw = false;
    }

    afterBinding(nodes) {
        let divCanvas = document.getElementById("divCanvas").getBoundingClientRect();
        let canvas = document.getElementById("canvas");
        canvas.style.width = `${divCanvas.width - 50}px`;
        canvas.style.height = `400px`;
        canvas.width = divCanvas.width - 50;
        canvas.height = 400;
        let ctx = canvas.getContext("2d");
        this.canvasListeners(canvas, ctx);
        this.redrawCanvas();
    }


    redrawCanvas() {
        let canvas = document.getElementById("canvas");
        if (canvas) {
            this.redraw = true;
            let ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.drawPlanets(canvas, ctx);
            if (this.ship()) {
                this.ship().draw(ctx);
            }
            this.redraw = false;
        }
    }

    moveShip() {
        let self = this;
        if (self.selectedPlanet() && !this.shipMove) {
            if (self.animationInterval) {
                clearInterval(self.animationInterval);
                this.animationInterval = null;
            }
            self.ship().fuel(1000); //refill fuel, remove this later
            self.ship().setStartPos();
            this.animationInterval = setInterval(() => {
                if (self.selectedPlanet()) {
                    self.shipMove = true;
                    self.ship().moveToPlanet(self.selectedPlanet(), self, 5);
                    self.redrawCanvas();
                }
            }, 100);
        } else {
            let msg = new AppMessage("SpaceTrader", `Morate selektirati planetu da biste pokrenuli brod!`, null);
            this.pubSub.publish("GameMessage", msg);
        }
    }

    stopShip() {
        clearInterval(this.animationInterval);
        this.shipMove = false;
        this.ship().setStartPos();
        this.redrawCanvas();
    }

    drawPlanets(canvas, ctx) {
        let self = this;
        if (this.planets.length == 0) {
            for (let i = 1; i <= 50; i++) {
                let centerCoords = this.getAvaibleXY(canvas);
                let planet = new Planet(centerCoords[0], centerCoords[1], Helper.randomMinMaxGenerator(1, 4), PlanetNames[i]);
                this.planets.push(planet);
            }
        }
        for (let i = 0; i < this.planets.length; i++) {
            let itemPlanet = this.planets[i];
            itemPlanet.draw(ctx);
        }
    }

    getAvaibleXY(canvas) {
        let minX = 20;
        let maxX = canvas.width - minX; 
        let minY = 20;
        let maxY= canvas.height - minY;
        let planets = this.planets;

        let retValue = null;
        while (!retValue) {
            let posibleX = Helper.randomMinMaxGenerator(minX, maxX);
            let posibleY = Helper.randomMinMaxGenerator(minY, maxY);
            retValue = [posibleX, posibleY]
            planets.forEach(itemPlanet => {
                if (itemPlanet.isToCloseToMe(posibleX, posibleY)) {
                    retValue = null;
                }
            });
        }
        
        return retValue;        
    }

    getDistance(X1, Y1, X2, Y2) {
        let xDiff = X1 - X2;
        let yDiff = Y1 - Y2;
        return parseInt(Math.sqrt(xDiff * xDiff + yDiff * yDiff));
    }

    canvasListeners(canvas, ctx) {
        let self = this;
        self.canvasEvents = false;

        canvas.addEventListener('mousemove', (event) => {
            if (event) {
                if (self.canvasEvents) return;
                if (self.shipMove) return;
                if (self.redraw) return;
                self.canvasEvents = true;
                
                if (!self.canvasRect)  {
                    self.canvasRect = canvas.getBoundingClientRect();
                }
                
                let x = event.clientX - self.canvasRect.left;
                let y = event.clientY - self.canvasRect.top;

                // let matrix = ctx.getTransform();
                // var imatrix = matrix.invertSelf();
                // let mx = x * imatrix.a + y * imatrix.c + imatrix.e;
                // let my = x * imatrix.b + y * imatrix.d + imatrix.f;

                self.canvasMouseX = x.toFixed(0);
                self.canvasMouseY = y.toFixed(0);
                let isInside = false;
                for (let i = 0; i < self.planets.length; i++) {
                    let planet = self.planets[i];
                    if (planet.isInsideCircle(self.canvasMouseX, self.canvasMouseY)) {
                        isInside = true;
                        break;
                    }
                }
                if (isInside) {
                    event.currentTarget.style.cursor = "pointer";
                } else {
                    event.currentTarget.style.cursor = "default";
                }
                self.canvasEvents = false;
            }
        });
        canvas.addEventListener('click', (event) => {
            if (event) {
                if (self.canvasEvents) return;
                if (self.shipMove) return;
                if (self.redraw) return;
                self.canvasEvents = true;
                let selectedPlanet = null;
                for (let i = 0; i < self.planets.length; i++) {
                    let planet = self.planets[i];
                    if (planet.isInsideCircle(self.canvasMouseX, self.canvasMouseY)) {
                        let old = self.selectedPlanet()
                        if (old) {
                            old.isSelected = false;
                            old.distanceFromShip = 0;
                        }
                        planet.isSelected = true;
                        planet.distanceFromShip = self.getDistance(self.ship().shipX, self.ship().shipY, planet.x, planet.y);
                        selectedPlanet = planet;
                        break;
                    } 
                }
                if (selectedPlanet) {
                    self.selectedPlanet(selectedPlanet);
                    self.redrawCanvas();
                }
                self.canvasEvents = false;
            }
        });
    }

    newGame() {
        this.reset();
        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");

        let ship = new Ship(20, 20, 0, this.spaceShipImage);
        this.ship(ship);

        this.redrawCanvas();
        let msg = new AppMessage("SpaceTrader", `Nova igra staratana`, null);
        this.pubSub.publish("GameMessage", msg);
    }
    saveGame() {

    }
    loadGame() {

    }
    deleteGame() {

    }
}

class Planet {

    constructor(x, y, planetType, planetName) {
        this.x = x;
        this.y = y;
        this.planetType = planetType;
        this.planetTypeString = PlanetTypeEnum.getNameFromEnum(planetType);
        this.innerRadius = Helper.randomMinMaxGenerator(1, 3);
        this.outerRadius = Helper.randomMinMaxGenerator(8, 11);
        this.radius = this.outerRadius;
        this.planetName = planetName;
        this.isSelected = false;
        this.distanceFromShip = 0;
        switch (planetType) {
            case PlanetTypeEnum.ADVANCED:
                this.stopColor = "gray"
                break;
            case PlanetTypeEnum.AGRICULTURAL:
                this.stopColor = "green"
                break;
            case PlanetTypeEnum.INDUSTRIAL:
                this.stopColor = "orange"
                break;
            case PlanetTypeEnum.INFORMATION:
                this.stopColor = "blue"
                break;
            default:
                this.stopColor = "blue"
                break;
        }
    }

    draw(ctx) {

        let gradient = ctx.createRadialGradient(this.x, this.y, this.innerRadius, this.x, this.y, this.outerRadius);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(1, this.stopColor);
        ctx.fillStyle = gradient;
        ctx.beginPath(); 

        let matrix = ctx.getTransform();
        var imatrix = matrix.invertSelf();
        let mx = this.x * imatrix.a + this.y * imatrix.c + imatrix.e;
        let my = this.x * imatrix.b + this.y * imatrix.d + imatrix.f;
        let rectRadius = this.radius + 2;
        ctx.clearRect(mx - rectRadius, my - rectRadius, rectRadius * 2, rectRadius * 2);
        ctx.arc(mx, my, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        if (this.isSelected) {
            ctx.arc(mx, my, this.radius + 1, 0, 2 * Math.PI);
            ctx.strokeStyle = "red";
            ctx.stroke();
        }
    }

    isInsideCircle(mouseX, mouseY) {
        let absX = Math.pow(Math.abs(mouseX - this.x).toFixed(2), 2);
        let absY = Math.pow(Math.abs(mouseY - this.y).toFixed(2), 2);
        return Math.sqrt(absX + absY) < this.radius;
    }
    isToCloseToMe(anotherX, anotherY) {
        let absX = Math.pow(Math.abs(anotherX - this.x).toFixed(2), 2);
        let absY = Math.pow(Math.abs(anotherY - this.y).toFixed(2), 2);
        return Math.sqrt(absX + absY) < (this.radius * 5) ;
    }
}

class Ship {
    constructor(x, y, angle, shipImage) {
        this.shipX = x;
        this.shipY = y;
        this.angle = angle;
        this.shipImage = shipImage;
        this.distanceToPlanet = ko.observable(0);
        this.fuel = ko.observable(1000);
        this.setStartPos();
    }

    draw(ctx) {

        let x = this.shipX;
        let y = this.shipY;
        let angle = this.angle;

        // save the current co-ordinate system 
        // before we screw with it
        ctx.save(); 
     
        // move to the middle of where we want to draw our image
        ctx.translate(x, y);
     
        // rotate around that point, converting our 
        // angle from degrees to radians 
        let TO_RADIANS = Math.PI/180
        ctx.rotate(angle * TO_RADIANS);
     
        // draw it up and to the left by half the width
        // and height of the image 
        ctx.drawImage(this.shipImage, -8, -8, 16, 16);
     
        // and restore the co-ords to how they were when we began
        ctx.restore(); 

    }

    setStartPos() {
        this.startX = this.shipX;
        this.startY = this.shipY;
        this.startFuel = this.fuel();
    }

    moveToPlanet(selectedPlanet, parent, speed = 1) {
        let planetX = selectedPlanet.x;
        let planetY = selectedPlanet.y;
        let shipX = this.shipX || 0;
        let shipY = this.shipY || 0;

        let xSize = Math.abs(shipX - planetX);
        let ySize = Math.abs(shipY - planetY);

        let matchX = false, matchY = false;
        if (shipX > (planetX - speed) && shipX < (planetX + speed)) {
            matchX = true;
        }

        if (shipY > (planetY - speed) && shipY < (planetY + speed)) {
            matchY = true;
        }

        if (matchX  && matchY) {
            clearInterval(parent.animationInterval);
            parent.animationInterval = null;
            parent.shipMove = false;
            this.angle = 90; //Ship position up;
            this.distanceToPlanet(0);
            this.setStartPos();
            return;
        }
        /*
            y = mx + b 
                - m: slope  => m = (y2 - y1) / (x2 - x1)
                - b: intercept
            y - y1 = (y2 -y1)/(x - x1);
        */

        let TO_DEGREES = 180/Math.PI;

        let slope = (shipY - planetY) / (shipX - planetX);
        let angle = parseInt(Math.atan2(shipY - planetY, shipX - planetX) * TO_DEGREES);
        angle = angle < 0 ? 360 + angle : angle
        let intercept = shipY - (slope * shipX);

        if (!matchX) {
            if (xSize > ySize) {
                if (shipX < planetX) {
                    shipX += speed;
                } else {
                    shipX-= speed;
                }
                shipY = parseInt((slope * shipX) + intercept);
            } else {
                if (shipY < planetY) {
                    shipY += speed;
                } else {
                    shipY-= speed;
                }
                shipX = parseInt((shipY - intercept) / slope);
            }
            
        } else {
            if (shipY < planetY) {
                shipY += speed;
            } else {
                shipY-= speed;
            }
        }

        this.shipX = shipX;
        this.shipY = shipY;
        this.angle =angle;
        let distance = parent.getDistance(shipX, shipY, this.startX, this.startY);
        this.distanceToPlanet(distance);
        this.fuel(this.startFuel - distance);
        if (this.fuel() <= 0) {
            parent.stopShip();
        }
    }
}

const PlanetTypeEnum = {
	AGRICULTURAL: 1,
	INDUSTRIAL: 2,
	INFORMATION: 3,
	ADVANCED: 4,
    getNameFromEnum: function(value) {
        switch (value) {
            case 1:
                return "AGRICULTURAL";
            case 2:
                return "INDUSTRIAL";
            case 3:
                return "INFORMATION";
            case 4:
                return "ADVANCED";
            default:
                return "UNDEFINED";
                break;
        }
    }
}

const PlanetNames = [
    "Chisehines",
    "Andeunope",
    "Olrars",
    "Bechurn",
    "Aetania",
    "Muiter",
    "Strachuwei",
    "Thoeliv",
    "Llerth C4D",
    "Mao 2R",
    "Sugrawei",
    "Ibraocarro",
    "Cholmides",
    "Kebarvis",
    "Giurus",
    "Nonides",
    "Zigunus",
    "Choephus",
    "Llorix 18K1",
    "Criuq 88",
    "Adracarro",
    "Tistrarilia",
    "Benkyria",
    "Taberth",
    "Oilia",
    "Taogawa",
    "Gritenus",
    "Lloluruta",
    "Phosie D96",
    "Dippe D1YE",
    "Lollizuno",
    "Rolruicarro",
    "Enkao",
    "Natrarvis",
    "Mephus",
    "Giter",
    "Nucupra",
    "Gnuegawa",
    "Gruna Y38",
    "Golla 5Q55",
    "Dilrenus",
    "Vulreanov",
    "Chobbides",
    "Zunzov",
    "Orilia",
    "Ciuphus",
    "Sulelia",
    "Theithea",
    "Crurn L93",
    "Dov LR",
    "Moccaigant",
    "Vaccacury",
    "Rechora",
    "Meleon",
    "Vaistea",
    "Athea",
    "Loithea",
    "Gnasumia",
    "Trapus M1",
    "Phuna BS5F"
];

export { SpaceTrader as GameModule };