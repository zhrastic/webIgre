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
        this.currentPlanet = ko.observable(null);
        this.mouseOverPlanet = ko.observable(null);
        this.ship = ko.observable(null);
        this.redraw = false
        this.gameStatus = ko.observable(GameStatusEnum.GAME_PREPARE);
        this.gameTime = ko.observable(0);
        this.shipOnPlanetViews = ko.observable(ShipOnPlanetViews.MARKET);
        this.shipOnBattleViews = ko.observable(ShipOnBattleViews.DECISION);
        this.fuelInSpacePrice = ko.observable(50);
        this.sellBuyQuantity = ko.observable("1000");
        this.pirates = ko.observableArray([]);
        this.piratesFightRound = ko.observable(0);
        this.piratesFightType = ko.observable("FIGHT");
        this.fightMessage = ko.observable("");
        this.fightReward = ko.observable(0);
        this.attackFrequency = 10;
    }

    static getObject() {
        return new SpaceTrader();
    }

    activate(pubSub) {
        this.pubSub = pubSub;
        this.spaceShipImage = new Image();
        let self = this;
        this.gameViewTitle = ko.computed(() => {

            let gameStatus = self.gameStatus();
            let shipOnPlanetViews = self.shipOnPlanetViews();

            if (gameStatus == GameStatusEnum.GAME_PREPARE) {
                return "Igra se priprema..."
            }
            else if (gameStatus == GameStatusEnum.SHIP_ATTACKED) {
                return "Brod je napadnut!!!"
            } else if (gameStatus == GameStatusEnum.SHIP_MOVE) {
                let selectedPlanet = self.selectedPlanet();
                return `Planet putuje prema odredištu: <span style='color: ${selectedPlanet.stopColor};'>${selectedPlanet.planetName}</span>`;
            } else if (gameStatus == GameStatusEnum.SHIP_READY) {
                return "Brod je spreman za putovanje....";
            } else if (gameStatus == GameStatusEnum.SHIP_ONPLANET) {
                let currentPlanet = self.currentPlanet();
                let currentPlanetHtml = `<span style='color: ${currentPlanet.stopColor};'>${currentPlanet.planetName}</span>`;
                let selectedPlanet = self.selectedPlanet();
                let selectedPlanetHtml = `<span style='color: ${selectedPlanet.stopColor};'>${selectedPlanet.planetName}</span>`;

                if (shipOnPlanetViews == ShipOnPlanetViews.FUEL) {
                    return `${currentPlanetHtml} : Stanica goriva`;
                } else if (shipOnPlanetViews == ShipOnPlanetViews.LOAN) {
                    return `${currentPlanetHtml} : Ured banke, zajmovi`;
                } else if (shipOnPlanetViews == ShipOnPlanetViews.MARKET) {
                    return `${currentPlanetHtml} : Tržnica`;
                } else if (shipOnPlanetViews == ShipOnPlanetViews.MARKET_INFO) {
                    return `${selectedPlanetHtml} : Tržnica selektirane planete`;
                } else if (shipOnPlanetViews == ShipOnPlanetViews.POLICE) {
                    return `${currentPlanetHtml} : Policijaska stanica`;
                } else if (shipOnPlanetViews == ShipOnPlanetViews.UPGRADE_SHIP) {
                    return `${currentPlanetHtml} : Dokovi. Nadogradnja i popravak broda.`;
                }
            } else if (gameStatus == GameStatusEnum.SHIP_BUY_FUEL) {
                return "Kupnja goriva u svemiru..."
            }

            return "Ne znam još..";
        });
        this.gameTimeFormated = ko.computed(() => {
            let gameTime = this.gameTime().toString();
            return gameTime.padStart(10, "0");
        });
        this.spaceShipImage.addEventListener('load', function() {

            let ship = new Ship(20, 20, 0, self.spaceShipImage);
            self.ship(ship);
            self.redrawCanvas();
            
        }, false);
        this.distanceSelectedShip = ko.computed(() => {
            let selected = this.selectedPlanet();
            let ship = this.ship();
            if (selected && ship) {
                let currentPlanet = this.currentPlanet();
                if (currentPlanet && currentPlanet.planetName == selected.planetName) return 0;
                return this.getDistance(ship.shipX, ship.shipY, selected.x, selected.y);
            } else {
                return 0;
            }
        });
        this.spaceShipImage.src = 'img/spaceship.png'; // Set source path
    }
    dispose() {
        this.gameViewTitle.dispose();
        this.gameTimeFormated.dispose();
        this.distanceSelectedShip.dispose();
        this.ship().dispose();
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
        this.gameStatus(GameStatusEnum.GAME_PREPARE);
        this.ship(null);
        this.redraw = false;
    }

    afterBinding(nodes) {
        let divCanvas = document.getElementById("divCanvas").getBoundingClientRect();
        let canvas = document.getElementById("canvas");
        let divGameView = document.getElementById("divGameView");
        canvas.style.width = `${divCanvas.width - 50}px`;
        canvas.style.height = `400px`;
        canvas.width = divCanvas.width - 50;
        canvas.height = 400;
        let ctx = canvas.getContext("2d");
        this.canvasListeners(canvas, ctx);
        this.redrawCanvas();
        this.gameStatus(GameStatusEnum.SHIP_READY);
        
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
        if (self.currentPlanet() && self.selectedPlanet() && self.currentPlanet().planetName == self.selectedPlanet().planetName) return;
        
        if (self.selectedPlanet() && self.gameStatus() != GameStatusEnum.SHIP_MOVE) {
            
            if (self.animationInterval) {
                clearInterval(self.animationInterval);
                this.animationInterval = null;
            }

            if (self.ship().fuel() > 0) {
                self.ship().setStartPos();
                let randomAttack = Helper.randomMinMaxGenerator(0, 100);
                if (randomAttack <= this.attackFrequency) {
                    self.ship().attacked = true;
                } else {
                    self.ship().attacked = false;
                }
                self.gameStatus(GameStatusEnum.SHIP_MOVE);
                self.currentPlanet(null);
                this.animationInterval = setInterval(() => {
                    if (self.selectedPlanet()) {                  
                        self.ship().moveToPlanet(self.selectedPlanet(), self, 5);
                        self.redrawCanvas();
                    }
                }, 100);
            } else {
                let msg = new AppMessage("SpaceTrader", `Nemate dovoljno goriva za pokrenuti brod! <br/>Kupite gorivo!`, null);
                this.pubSub.publish("GameMessage", msg);
            }
        } else {
            let msg = new AppMessage("SpaceTrader", `Morate selektirati planetu da biste pokrenuli brod!`, null);
            this.pubSub.publish("GameMessage", msg);
        }
    }

    stopShip() {
        clearInterval(this.animationInterval);
        this.gameStatus(GameStatusEnum.SHIP_READY);
        this.fuelInSpacePrice(Helper.randomMinMaxGenerator(50, 100));
        this.ship().setStartPos();
        this.redrawCanvas();
    }

    upgradeShip() {
        this.shipOnPlanetViews(ShipOnPlanetViews.UPGRADE_SHIP);
    }

    shieldUpgrade() {
        let quantity = 100;
        let unitPrice = this.currentPlanet().shieldUpgradePrice;
        let fullPrice = quantity * unitPrice;
        if (fullPrice > this.ship().money()) {
            fullPrice = this.ship().money();
            quantity = Math.floor(fullPrice / unitPrice);
        }
        this.ship().money(this.ship().money() - fullPrice);
        this.ship().shieldSize(this.ship().shieldSize() + quantity);
    }

    shieldRepair() {
        let quantity = 100;
        let unitPrice = this.currentPlanet().shieldUnitPrice;
        let fullPrice = quantity * unitPrice;
        if (fullPrice > this.ship().money()) {
            fullPrice = this.ship().money();
            quantity = Math.floor(fullPrice / unitPrice);
        }

        if (this.ship().shield() + quantity > this.ship().shieldSize()) {
            quantity = this.ship().shieldSize() - this.ship().shield();
            fullPrice = quantity * unitPrice;
        }

        this.ship().money(this.ship().money() - fullPrice);
        this.ship().shield(this.ship().shield() + quantity);
    }

    firePowerUpgrade() {
        let quantity = 100;
        let unitPrice = this.currentPlanet().firePowerUpgradePrice;
        let fullPrice = quantity * unitPrice;
        if (fullPrice > this.ship().money()) {
            fullPrice = this.ship().money();
            quantity = Math.floor(fullPrice / unitPrice);
        }
        this.ship().money(this.ship().money() - fullPrice);
        this.ship().firePowerSize(this.ship().firePowerSize() + quantity);
    }

    firePowerRepair() {
        let quantity = 100;
        let unitPrice = this.currentPlanet().firePowerUnitPrice;
        let fullPrice = quantity * unitPrice;
        if (fullPrice > this.ship().money()) {
            fullPrice = this.ship().money();
            quantity = Math.floor(fullPrice / unitPrice);
        }

        if (this.ship().firePower() + quantity > this.ship().firePowerSize()) {
            quantity = this.ship().firePowerSize() - this.ship().firePower();
            fullPrice = quantity * unitPrice;
        }

        this.ship().money(this.ship().money() - fullPrice);
        this.ship().firePower(this.ship().firePower() + quantity);
    }

    fuelUpgrade() {
        let quantity = 100;
        let unitPrice = this.currentPlanet().fuelUpgradePrice;
        let fullPrice = quantity * unitPrice;
        if (fullPrice > this.ship().money()) {
            fullPrice = this.ship().money();
            quantity = Math.floor(fullPrice / unitPrice);
        }
        this.ship().money(this.ship().money() - fullPrice);
        this.ship().fuelTankSize(this.ship().fuelTankSize() + quantity);
    }

    fuelRepair() {
        this.buyFuel(100, this.currentPlanet());
    }

    cargoUpgrade() {
        let quantity = 100;
        let unitPrice = this.currentPlanet().cargoUpgradeUnitPrice;
        let fullPrice = quantity * unitPrice;
        if (fullPrice > this.ship().money()) {
            fullPrice = this.ship().money();
            quantity = Math.floor(fullPrice / unitPrice);
        }
        this.ship().money(this.ship().money() - fullPrice);
        this.ship().cargoBaySize(this.ship().cargoBaySize() + quantity);
    }

    getLoan() {
        this.shipOnPlanetViews(ShipOnPlanetViews.LOAN);
    }

    getFuelOnPlanet() {
        this.shipOnPlanetViews(ShipOnPlanetViews.FUEL);
    }

    buyFuel(quantity, spaceOrPlanet) {

        if (this.ship().fuel() >= this.ship().fuelTankSize()) {
            this.ship().fuel(this.ship().fuelTankSize());
            return;
        }
        let unitPrice = spaceOrPlanet == "SPACE" ? this.fuelInSpacePrice() : this.currentPlanet().fuelUnitPrice;
        let fullPrice = quantity * unitPrice;
        if (fullPrice > this.ship().money()) {
            fullPrice = this.ship().money();
            quantity = Math.floor(fullPrice / unitPrice);
        }

        if (this.ship().fuel() + quantity > this.ship().fuelTankSize()) {
            quantity = this.ship().fuelTankSize() - this.ship().fuel();
            fullPrice = quantity * unitPrice;
        }

        this.ship().money(this.ship().money() - fullPrice);
        this.ship().fuel(this.ship().fuel() + quantity);

    }

    getFuelInSpace() {
        this.gameStatus(GameStatusEnum.SHIP_BUY_FUEL);
    }

    goToMarket() {
        this.shipOnPlanetViews(ShipOnPlanetViews.MARKET);
    }

    goToPiratesFight() {
        clearInterval(this.animationInterval);
        this.animationInterval = null;
        this.pirates([]);
        this.fightReward(0);
        let ship = this.ship();
        let piratesCount = Helper.randomMinMaxGenerator(1, 3);
        let shieldMin = Math.floor(ship.shieldSize() / 3);
        let shieldMax = Math.floor(ship.shieldSize() / 2);
        let fireMin = Math.floor(ship.firePowerSize() / 3);
        let fireMax = Math.floor(ship.firePowerSize() / 2);
        for (let i = 0; i < piratesCount; i++) {
            let pirateShield = Helper.randomMinMaxGenerator(shieldMin, shieldMax);
            let pirateFirePower = Helper.randomMinMaxGenerator(fireMin, fireMax);
            this.fightReward(this.fightReward() +pirateShield +  pirateFirePower);
            let pirat = new PirateShip(pirateShield, pirateFirePower );
            this.pirates.push(pirat);
        }
    
        this.fightMessage("Napadnuti ste od gusara, imate nekoliko opcija...");
        this.gameStatus(GameStatusEnum.SHIP_ATTACKED);
        this.shipOnBattleViews(ShipOnBattleViews.DECISION);
    }

    handOverGargoToPirates() {
        let ship = this.ship();
        this.pirates([]);
        this.fightMessage("Predali ste tovar gusarima, možete nastaviti putovanje");
        this.emptyShipCargo();       
        this.stopShip();
    }

    emptyShipCargo() {
        let ship = this.ship();
        ship.cargoPrice = 0;
        ship.usedCargo(0);
        for (let i = 0; i < ship.products.length; i++) {
            let product = ship.products[i];
            product.quantity(0);
        }
    }

    fightWithPirates() {
        let rounds = 50;
        this.piratesFightRound(rounds);
        this.piratesFightType("FIGHT");
        this.fightMessage(`Morate izdržati ${rounds} rundi borbe. Ako štitovi ne izdrže, gusari će vam ukrasti tovar, a ako uništite gusare dobiti ćete nagradu!`);
        this.prepareForFight();
        this.shipOnBattleViews(ShipOnBattleViews.FIGHT);
    }

    escapeFromPirates() {
        
        let rounds = Helper.randomMinMaxGenerator(1, 5);
        this.piratesFightRound(rounds);
        this.piratesFightType("ESCAPE");
        this.fightMessage(`Morate izdržati ${rounds} rundi pucanja gusarskih brodova na vas. Ako štitovi ne izdrže, gusari će vam ukrasti tovar!`);
        this.prepareForFight();
        this.shipOnBattleViews(ShipOnBattleViews.FIGHT);
    }

    prepareForFight() {
        let round = this.piratesFightRound();
        if (round == 0) {
            this.pirates([]);
            this.stopShip();
            return;
        }

        let pirates = this.pirates();
        pirates.forEach(pirateShip => {
            let rnd = Helper.randomMinMaxGenerator(0, Math.floor(pirateShip.firePower()/3));
            pirateShip.shot(rnd);
        });
        if (this.piratesFightType() == "FIGHT") {
            let min = Math.floor(Math.max(this.ship().firePower()/5, Math.max(this.ship().firePower()/4)));
            let max = Math.floor(Math.max(this.ship().firePower()/3, this.ship().firePower()/2));
            let rnd = Helper.randomMinMaxGenerator(min, max);
            this.ship().shot(rnd);
        } else {
            this.ship().shot(0);
        }   
    }

    fight() {
        let pirates = this.pirates();
        let ship = this.ship();
        if (this.piratesFightType() == "FIGHT") {
            let shipShot = ship.shot();
            let outPirates = [];
            pirates.forEach(pirateShip => {
                pirateShip.shield(pirateShip.shield() - shipShot);
                if (pirateShip.shield() <= 0) {
                    outPirates.push(pirateShip);
                }
            });
            ship.firePower(ship.firePower() - shipShot);

            for (let i = 0; i < outPirates.length; i++) {
                let pirateShip = outPirates[i];
                this.pirates.remove(pirateShip);
            }

            if (this.pirates().length == 0) {
                this.fightMessage(`Uništili ste sve gusare. Nagrađeni ste sa ${this.fightReward()} kredita!`);
                ship.money(ship.money() + this.fightReward());
                this.piratesFightRound(0);
                this.prepareForFight();
                return;
            }
        }

        pirates = this.pirates();
        let piratesFirePower = 0;
        pirates.forEach(pirateShip => {
            let shipShield = this.ship().shield();
            let shipShieldAfterShot = shipShield - pirateShip.shot();
            pirateShip.firePower(pirateShip.firePower() - pirateShip.shot());
            piratesFirePower += pirateShip.firePower();
            if (shipShieldAfterShot <= 0) {
                ship.shield(0);
            } else {
                ship.shield(shipShieldAfterShot);
            }
        });

        if (ship.shield() <= 0) {
            this.fightMessage("Gusari su vam oduzeli sav tovar. Možete nastaviti put.");
            this.emptyShipCargo();
            this.piratesFightRound(0);
            this.prepareForFight();
            return;
        }

        if (piratesFirePower == 0) {
            this.fightMessage("Gusari su ostali bez municije i povukli su se. Možete nastaviti put.");
            this.piratesFightRound(0);
            this.prepareForFight();
            return;
        }

        this.piratesFightRound(this.piratesFightRound() - 1);
        this.prepareForFight();

    }

    getSelectedPlanetMarketInfo() {
        this.shipOnPlanetViews(ShipOnPlanetViews.MARKET_INFO);
    }

    buyProduct(product) {
        let unitPrice = product.price();
        let quantity = parseInt(this.sellBuyQuantity());
        let remainingCargo = this.ship().cargoBaySize() - this.ship().usedCargo();
        if (remainingCargo < quantity) {
            quantity = remainingCargo;
        }

        let money = this.ship().money();
        let price = quantity * unitPrice;
        if (price > money) {
            price = money;
            quantity = Math.floor(price/unitPrice);
        }

        this.ship().money(this.ship().money() - price);

        let findShipProduct = this.ship().products.find((itemShipProduct) => {
            if (itemShipProduct.name == product.name) return true;
        });

        findShipProduct.quantity(findShipProduct.quantity() + quantity);
        this.ship().usedCargo(this.ship().usedCargo() + quantity);
        this.calculateCargoPrice();

    }
    sellProduct(product) {
        let quantity = parseInt(this.sellBuyQuantity());
        if (quantity > product.quantity()) {
            quantity = product.quantity();
        }
        let findPlanetProduct = this.currentPlanet().products.find((itemPlanetProduct) => {
            if (itemPlanetProduct.name == product.name) return true;
        });
        let unitPrice = findPlanetProduct.price();
        let price = quantity * unitPrice;
        this.ship().money(this.ship().money() + price);
        product.quantity(product.quantity() - quantity);
        this.ship().usedCargo(this.ship().usedCargo() - quantity);
        this.calculateCargoPrice();
    }

    calculateCargoPrice() {
        let ship = this.ship();
        let shipProducts = ship.products;
        let currentPlanet = this.currentPlanet();
        let currPlProdusts = currentPlanet.products;
        let sum = 0; 
        let sumCargoQuantity = 0;
        for (let i = 0; i < shipProducts.length; i++) {
            let shipItem = shipProducts[i];
            if (shipItem.quantity() > 0) {
                sumCargoQuantity += shipItem.quantity()
                let findOnPlanet = currPlProdusts.find((itemProduct) => {
                    if (shipItem.name == itemProduct.name) return true;
                });
                if (findOnPlanet) {
                    sum += shipItem.quantity() * findOnPlanet.price();
                }
            }
        }
        this.ship().usedCargo(sumCargoQuantity);
        this.ship().cargoPrice = sum;
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

    recalculatePlanetPrices() {
        let self = this;
        for (let i = 0; i < this.planets.length; i++) {
            let itemPlanet = this.planets[i];
            if (self.currentPlanet() && (self.currentPlanet().planetName == itemPlanet.planetName)) continue;
            itemPlanet.calculatePrices();
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
                if (self.canvasEvents) {
                    event.currentTarget.style.cursor = "";
                    event.currentTarget.style.cursor = "not-allowed";
                    return;
                }
                if (self.gameStatus() == GameStatusEnum.SHIP_MOVE) {
                    event.currentTarget.style.cursor = "not-allowed";
                    return;
                }
                if (self.redraw) {
                    event.currentTarget.style.cursor = "not-allowed";
                    return;
                }
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
                let chosenPlanet = null;
                for (let i = 0; i < self.planets.length; i++) {
                    let planet = self.planets[i];
                    if (planet.isInsideCircle(self.canvasMouseX, self.canvasMouseY)) {
                        isInside = true;
                        chosenPlanet = planet;
                        break;
                    }
                }
                if (isInside) {
                    event.currentTarget.style.cursor = "pointer";
                    self.mouseOverPlanet(chosenPlanet);
                } else {
                    event.currentTarget.style.cursor = "default";
                    self.mouseOverPlanet(null);
                }
                self.canvasEvents = false;
            }
        });
        canvas.addEventListener('click', (event) => {
            if (event) {
                if (self.canvasEvents) return;
                if (self.gameStatus() == GameStatusEnum.SHIP_MOVE) return;
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
        this.gameStatus(GameStatusEnum.SHIP_READY);
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
        this.innerRadius = Helper.randomMinMaxGenerator(1, 2);
        this.outerRadius = Helper.randomMinMaxGenerator(6, 9);
        this.radius = this.outerRadius;
        this.planetName = planetName;
        this.isSelected = false;
        this.distanceFromShip = 0;
        this.fuelUnitPrice = 1;
        this.fuelUpgradePrice = 1;
        this.shieldUnitPrice = 1;
        this.shieldUpgradePrice = 1;
        this.cargoUpgradeUnitPrice = 1;
        this.firePowerUnitPrice = 1;
        this.firePowerUpgradePrice = 1;
        this.products = [];

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

        this.calculatePrices();

    }

    dispose() {

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

    calculatePrices() {
        this.fuelUnitPrice = Helper.randomMinMaxGenerator(4, 12);
        this.fuelUpgradePrice = Helper.randomMinMaxGenerator(75, 100);
        this.shieldUnitPrice = Helper.randomMinMaxGenerator(7, 15);
        this.shieldUpgradePrice = Helper.randomMinMaxGenerator(75, 100);
        this.firePowerUnitPrice = Helper.randomMinMaxGenerator(7, 15);
        this.firePowerUpgradePrice = Helper.randomMinMaxGenerator(75, 100);
        this.cargoUpgradeUnitPrice = Helper.randomMinMaxGenerator(75, 100);
        let wares = null;
        this.products = [];
        switch (this.planetType) {
            case PlanetTypeEnum.ADVANCED:
                wares = new Wares("Polj. pr.", Helper.randomMinMaxGenerator(3, 7), 0);
                this.products.push(wares);
                wares = new Wares("Ind. pr.", Helper.randomMinMaxGenerator(3, 7), 0);
                this.products.push(wares);
                wares = new Wares("IT teh.", Helper.randomMinMaxGenerator(3, 9), 0);
                this.products.push(wares);
                wares = new Wares("Nap. teh.", Helper.randomMinMaxGenerator(2, 4), 0);
                this.products.push(wares);
                break;
            case PlanetTypeEnum.AGRICULTURAL:
                wares = new Wares("Polj. pr.", Helper.randomMinMaxGenerator(1, 3), 0);
                this.products.push(wares);
                wares = new Wares("Ind. pr.", Helper.randomMinMaxGenerator(3, 7), 0);
                this.products.push(wares);
                wares = new Wares("IT teh.", Helper.randomMinMaxGenerator(6, 9), 0);
                this.products.push(wares);
                wares = new Wares("Nap. teh.", Helper.randomMinMaxGenerator(7, 12), 0);
                this.products.push(wares);

                break;
            case PlanetTypeEnum.INDUSTRIAL:
                wares = new Wares("Polj. pr.", Helper.randomMinMaxGenerator(3, 7), 0);
                this.products.push(wares);
                wares = new Wares("Ind. pr.", Helper.randomMinMaxGenerator(2, 5), 0);
                this.products.push(wares);
                wares = new Wares("IT teh.", Helper.randomMinMaxGenerator(4, 9), 0);
                this.products.push(wares);
                wares = new Wares("Nap. teh.", Helper.randomMinMaxGenerator(6, 12), 0);
                this.products.push(wares);
                break;
            case PlanetTypeEnum.INFORMATION:
                wares = new Wares("Polj. pr.", Helper.randomMinMaxGenerator(3, 7), 0);
                this.products.push(wares);
                wares = new Wares("Ind. pr.", Helper.randomMinMaxGenerator(3, 7), 0);
                this.products.push(wares);
                wares = new Wares("IT teh.", Helper.randomMinMaxGenerator(1, 4), 0);
                this.products.push(wares);
                wares = new Wares("Nap. teh.", Helper.randomMinMaxGenerator(5, 12), 0);
                this.products.push(wares);
                break;
            default:
                wares = new Wares("Polj. pr.", Helper.randomMinMaxGenerator(1, 3), 0);
                this.products.push(wares);
                wares = new Wares("Ind. pr.", Helper.randomMinMaxGenerator(3, 7), 0);
                this.products.push(wares);
                wares = new Wares("IT teh.", Helper.randomMinMaxGenerator(6, 9), 0);
                this.products.push(wares);
                wares = new Wares("Nap. teh.", Helper.randomMinMaxGenerator(7, 12), 0);
                this.products.push(wares);

                break;
        }
    }
}

class Ship {
    constructor(x, y, angle, shipImage) {
        this.shipX = x;
        this.shipY = y;
        this.angle = angle;
        this.shipImage = shipImage;
        this.distanceToPlanet = ko.observable(0);
        this.fuelTankSize = ko.observable(1000)
        this.fuel = ko.observable(1000);
        this.cargoBaySize = ko.observable(1000);
        this.shieldSize = ko.observable(1000);
        this.shield = ko.observable(1000);
        this.firePower = ko.observable(1000);
        this.firePowerSize = ko.observable(1000);
        this.money = ko.observable(10000);
        this.products = [
            new Wares("Polj. pr.", 0, 0),
            new Wares("Ind. pr.",0, 0),
            new Wares("IT teh.", 0, 0),
            new Wares("Nap. teh.", 0, 0)
        ];
        let self = this;
        this.usedCargo = ko.observable(0);
        this.setStartPos();
        this.cargoPrice = 0;
        this.shot = ko.observable(0);
        this.attacked = false;
    }

    dispose() {

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
        parent.gameTime(parent.gameTime() + 1);
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

        //-------------- ARRIVAL PROBE ----------------------
        if (matchX  && matchY) {
            clearInterval(parent.animationInterval);
            parent.animationInterval = null;
            parent.currentPlanet(parent.selectedPlanet());
            parent.gameStatus(GameStatusEnum.SHIP_ONPLANET);
            parent.recalculatePlanetPrices();
            this.angle = 90; //Ship position up;
            this.distanceToPlanet(0);
            this.setStartPos();
            parent.goToMarket();
            
            return;
        }
 
        /* Line math
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
            this.fuel(0);
            parent.stopShip();
        }

        if (this.attacked) {
            if (this.distanceToPlanet() > 20 && this.distanceToPlanet() < 150) {
                parent.goToPiratesFight();
                return;
            }
        }
    }
}

class Wares {
    constructor(name, price, quantity) {
        this.name = name;
        this.price = ko.observable(price);
        this.quantity = ko.observable(quantity)
    }
}

class PirateShip {
    constructor(firePower, shild) {
        this.firePower = ko.observable(firePower);
        this.shield = ko.observable(shild);
        this.shot = ko.observable(0);
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

const GameStatusEnum = {
    GAME_PREPARE: "GAME_PREPARE",
    SHIP_READY: "SHIP_READY",
    SHIP_MOVE: "SHIP_MOVE",
    SHIP_BUY_FUEL: "SHIP_BUY_FUEL",
    SHIP_ATTACKED: "SHIP_ATTACKED",
    SHIP_ONPLANET: "SHIP_ONPLANET"
}

const ShipOnPlanetViews = {
    MARKET: "MARKET",
    MARKET_INFO: "MARKET_INFO",
    UPGRADE_SHIP: "UPGRADE_SHIP",
    LOAN: "LOAN",
    POLICE: "POLICE",
    FUEL: "FUEL",

}

const ShipOnBattleViews = {
    DECISION: "DECISION",
    FIGHT: "FIGHT"
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

const delay = ms => new Promise(res => setTimeout(res, ms));

export { SpaceTrader as GameModule };