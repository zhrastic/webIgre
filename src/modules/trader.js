

class Trader {
    constructor() {
        this.moduleName = ko.observable("Spasi selo trgujući....");
        this.totalResilience = ko.observable(20);
        this.day = ko.observable(1);
        this.resilience = ko.observable(20);
        this.endOfGame = ko.observable(false);
        this.inventory = ko.observableArray([]);
        this.date = new Date();
        this.errorMessage = ko.observable("");
        this.successMessage = ko.observable("");

        let inventoryItem = new Inventory("Meso", 7, Helper.randomMinMaxGenerator(2,6), "red", 45);
        this.inventory.push(inventoryItem);
        inventoryItem = new Inventory("Kruh", 10, Helper.randomMinMaxGenerator(2,9), "green", 30);
        this.inventory.push(inventoryItem);
        inventoryItem = new Inventory("Jaja", 11, Helper.randomMinMaxGenerator(3,10), "yellow", 20);
        this.inventory.push(inventoryItem);
        inventoryItem = new Inventory("Mlijeko", 8, Helper.randomMinMaxGenerator(2,7), "white", 35);
        this.inventory.push(inventoryItem);
        inventoryItem = new Inventory("Lijekovi", 4, Helper.randomMinMaxGenerator(2,4), "violet", 55);
        this.inventory.push(inventoryItem);
        inventoryItem = new Inventory("Sapun", 6, Helper.randomMinMaxGenerator(2,5), "blue", 65);
        this.inventory.push(inventoryItem);
        inventoryItem = new Inventory("Ugljen", 18, Helper.randomMinMaxGenerator(12, 17), "orange", 10);
        this.inventory.push(inventoryItem);
        
        this.rumors = new Rumours(this.inventory());
        this.tradeItems = new TradeItems(this.inventory(), 14);
        this.residentalNeeds = new ResidentalNeeds(this.inventory());
        
        this.indexDB = ko.observable(null);
        this.savedGame = null;
        this.hasSavedGames = ko.observable(false);

        this.user = "Anonymous";
    }

    static getObject() {
        return new Trader();
    }

    activate() {

        this.resilienceArray = ko.computed(() => {
            let currentResilience = this.resilience();
            let tmpArray = [];
            for (let i = 1; i <= this.totalResilience(); i++ ) {
                let tmpItem = {rb: i, active: i <= currentResilience};
                tmpArray.push(tmpItem);
            }
            return tmpArray;
        });

        this.dayName = ko.computed(() => {
            let day = this.day();
            let currDate = Helper.getDateForNewDay(this.date, day - 1);
            let dayNumber = currDate.getDay();
            let dayName = Helper.getDayName(dayNumber);
            return dayName;
        });

        for (let item, i = 0; item = this.inventory()[i]; ++i ) {
            item.activate();
        }

        let self = this;
        if (window.indexedDB) {
            let request = window.indexedDB.open("WebIgreDB", 1);

            request.onerror = function(event) {
                console.log("error: DB Open");
             };
             
             request.onsuccess = function(event) {
                self.indexDB(request.result);
                let transaction = self.indexDB().transaction(["TraderGame"]);
                if (transaction) {
                    let objectStore = transaction.objectStore("TraderGame");
                    if (objectStore) {
                        let getRequest = objectStore.get(self.user);
                        getRequest.onsuccess = () => {
                            let saveGame = getRequest.result
                            self.savedGame = saveGame;
                            self.hasSavedGames(true);
                        }

                    }
                    console.log("success: DB Open");
                }
             };

             request.onupgradeneeded = function(event) {
                // Save the IDBDatabase interface
                var db = event.target.result;
              
                // Create an objectStore for this database
                var objectStore = db.createObjectStore("TraderGame", { keyPath: "user" });
              };
        }
        this.rumors.activate(this.day());
        this.tradeItems.activate(this.day(), this.rumors.getRumors());
        this.residentalNeeds.activate(this.day())
        return true;
    }

    dispose() {
        this.resilienceArray.dispose();
        this.dayName.dispose();
        this.rumors.dispose();
        this.tradeItems.dispose();
        this.residentalNeeds.dispose();
        for (let item, i = 0; item = this.inventory()[i]; ++i ) {
            item.dispose();
        }

    }

    decreaseResilience(howMatch) {
        let resilience = this.resilience();
        resilience = resilience - howMatch;
        if (resilience <= 0) {
            this.resilience(0);
            this.endOfGame(true);
            this.errorMessage("Igra je gotova! Želite li odgrati jiš jednom? ");
        } else {
            this.resilience(resilience);
        }
    }
    increaseResilience() {
        let resilience = this.resilience();
        if (resilience >= this.totalResilience()) {
            this.resilience(this.totalResilience());
            return;
        }
        this.resilience(this.resilience() + 1);
    }
    nextDay() {
        this.day(this.day() + 1);
        for (let item, i = 0; item = this.inventory()[i]; ++i ) {
            item.nextDay();
        }
        this.rumors.updateRumors(this.day());
        this.tradeItems.updateItems(this.day(), this.rumors.getRumors());
        let howMatchDecrease = this.residentalNeeds.updateNeeds(this.day());
        this.decreaseResilience(howMatchDecrease);
    }
    executeTransaction(item, nesto) {
        let pero = 0;
        let buyItem = this.inventory().find((inventoryItem) => {
            if (inventoryItem.inventoryName() == item.buyName) return true;
        });
        let sellItem = this.inventory().find((inventoryItem) => {
            if (inventoryItem.inventoryName() == item.sellName) return true;
        });

        if (buyItem && sellItem) {
            if (buyItem.current() < buyItem.total()) {
                if (sellItem.current() >= item.sellAmount) {
                    buyItem.increase(item.buyAmout);
                    sellItem.decrease(item.sellAmount);
                } else {
                    this.errorMessage(`Nemate dovoljno [<b>${sellItem.inventoryName()}</b>] za izvršiti transakciju!`);
                    setTimeout(() => {
                        this.errorMessage("");
                    }, 3000);
                }
            } else {
                this.errorMessage(`Više nemate mjesta za skladištiti ${buyItem.inventoryName()}`);
                setTimeout(() => {
                    this.errorMessage("");
                }, 3000);
            }
        } else {
            this.errorMessage(`Nešto je pošlo u krivo...`);
            setTimeout(() => {
                this.errorMessage("");
            }, 3000);
        }

     }

     newGame() {
         this.endOfGame(false);
         this.errorMessage("");
         this.resilience(this.totalResilience());
         this.day(1);
         this.inventory().forEach((itemInventory) => {
            let naziv = itemInventory.inventoryName();
            let newCurrent = 1;
            let total = 1;
            switch (naziv) {
                case "Meso":
                    newCurrent = Helper.randomMinMaxGenerator(2,6);
                    total = 7;
                    break;
                case "Kruh":
                    newCurrent = Helper.randomMinMaxGenerator(2,9);
                    total = 10;
                    break;
                case "Jaja":
                    newCurrent = Helper.randomMinMaxGenerator(3,10);
                    total = 11;
                    break;
                case "Mlijeko":
                    newCurrent = Helper.randomMinMaxGenerator(2,7);
                    total = 8
                    break;
                case "Lijekovi":
                    newCurrent =  Helper.randomMinMaxGenerator(2,4);
                    total = 4;
                    break;
                case "Sapun":
                    newCurrent =  Helper.randomMinMaxGenerator(2,5);
                    total = 6;
                    break;
                case "Ugljen":
                    newCurrent =  Helper.randomMinMaxGenerator(12, 17);
                    total = 18;
                    break;
                default:
                    break;
            }


            itemInventory.current(newCurrent);
            itemInventory.total(total);
        });
        this.tradeItems.clear();
        this.residentalNeeds.clear();
        this.rumors.clear();
        this.rumors.updateRumors(this.day());
        this.tradeItems.updateItems(this.day(), this.rumors.getRumors());
        this.residentalNeeds.updateNeeds(this.day());
     }

     saveGame() {
        let inventory = ko.toJS(this.inventory());
        let rumors = ko.toJS(this.rumors.getRumors());
        let tradeItems = ko.toJS(this.tradeItems.getTradeItems());
        let needs = ko.toJS(this.residentalNeeds.getNeedsArray())
        let saveGame = new SaveGame(this.day(), this.resilience(), this.totalResilience(), inventory, rumors, tradeItems, this.tradeItems.arraySize, needs, this.user );
        let self = this;

        let transaction = this.indexDB().transaction(["TraderGame"], 'readwrite');
        if (transaction) {
            let objectStore = transaction.objectStore("TraderGame");
            if (objectStore) {
                let putRequest = objectStore.put(saveGame);

                putRequest.onsuccess = () => {
                    self.successMessage(`Spremanje uspješno!`);
                    this.savedGame = saveGame;
                    this.hasSavedGames(true);
                    setTimeout(() => {
                        this.successMessage("");
                    }, 3000);
                };

                putRequest.onerror = function(event) {
                    self.errorMessage(`Spremanje nije uspjelo!`);
                    setTimeout(() => {
                        this.errorMessage("");
                    }, 3000);
                 };
            }
        }
     }
     loadGame() {
        let data = this.savedGame;
        this.day(data.day);
        this.totalResilience(data.totalResilience);
        this.resilience(data.resilience);
        let tmpInventoryArray = [];
        let inventoryArray = data.inventory.forEach((savedInventory) => {
            let inventoryItem = new Inventory(savedInventory.inventoryName, savedInventory.total, savedInventory.current, savedInventory.color, savedInventory.unitPrice);
            inventoryItem.activate();
            tmpInventoryArray.push(inventoryItem);
        });
        this.inventory(tmpInventoryArray);
        this.tradeItems.load(tmpInventoryArray, data.tradeItems, data.tradeItemsCount);
        this.rumors.load(tmpInventoryArray, data.rumors);
        this.residentalNeeds.load(tmpInventoryArray, data.needs);
     }
}

class Inventory {
    constructor(name, total, current, color, unitPrice) {
        this.inventoryName = ko.observable(name);
        this.total = ko.observable(total);
        this.current = ko.observable(current);
        this.color = color;
        this.spanClass = ko.observable("trade-spanInventory-" + color);
        this.tableFillClass = ko.observable("trade-background-" + color);
        this.upgraded = ko.observable(false);
        this.unitPrice = ko.observable(unitPrice);
    }

    activate() {
        this.upgradeCost = ko.computed(() => {
            return Math.floor(this.total()/2);
        });
        this.canUpgrade = ko.computed(() => {
            if (this.current() >= this.upgradeCost() && !this.upgraded()) return true;
            return false;
        });
        this.inventoryArray = ko.computed(() => {
            let current = this.current();
            let tmpArray = [];
            for (let i = 1; i <= this.total(); i++ ) {
                let active = i <= current;
                let tmpItem = {rb: i, klasa: ""};
                if (active) {
                    tmpItem.klasa = this.tableFillClass();
                }
                tmpArray.push(tmpItem);
            }
            return tmpArray;
        });
        this.formatedName = ko.computed(() => {
            let broj = this.current() + " / " + this.total();
            let naziv = this.inventoryName();
            let brojLength = broj.length;
            let nazivLength = naziv.length;
            
            return naziv + "&nbsp;&nbsp;&nbsp;" + broj;

        });
        this.upgradeMessage = ko.computed(() => {
            let message = "";
            let upgradeCost = this.upgradeCost();
            if (this.canUpgrade()) {
                message = `Nadogradite kapacitet skladišta. Nadogradnje košta ${upgradeCost}. Cijenu plaćate danas, nadogradnja slijedeći dan.`;
            } else {
                if (this.upgraded()) {
                    message = `Nadograditi skladište je moguće samo jednom u danu!`;
                } else {
                    message = `Trenutno ne možete nadograditi kapacitet skladišta. Nadogradnje košta ${upgradeCost}.`;
                }
            }
            return message;
        });
    }

    dispose() {
        this.upgradeCost.dispose();
        this.canUpgrade.dispose();
        this.inventoryArray.dispose();
        this.formatedName.dispose();
        this.upgradeMessage.dispose();
    }

    upgrade() {
        let costUpgrade = this.upgradeCost();
        this.current(this.current() - costUpgrade);
        this.upgraded(true);
    }

    increase(number) {
        let amount = this.current() + number;
        if (amount > this.total()) {
            this.current(this.total());
        } else {
            this.current(amount);
        }
    }

    decrease(number) {
        let amount = this.current() - number;
        if (amount > 0) {
            this.current(amount);
        } else {
            this.current(0);
        }

    }

    nextDay() {
        if (this.upgraded()) {
            this.total(this.total() +1);
            this.upgraded(false);
        }
    }

}

class TradeItem {

    constructor(buyName, buyAmout, buyClass, sellName, sellAmount, sellClass, explanation, discountType ) {
        this.buyName = buyName;
        this.buyAmout = buyAmout;
        this.buyClass = buyClass;
        this.sellName = sellName;
        this.sellAmount = sellAmount;
        this.sellClass = sellClass;
        this.explanation = explanation;
        this.discountType = ko.observable(discountType)

        this.formatedBuy = `${this.buyName}  +${this.buyAmout}`;
        this.formatedSell = `-${this.sellAmount} ${this.sellName}`;
    }
}

class TradeItems {

    constructor(inverntoryArray, arraySize) {
        this.arraySize = arraySize;
        this.inverntoryArray = inverntoryArray;
        this.tradeItems = ko.observableArray([]);
        this.tradeItemTypeEnum = {
            NONE: 0,
            BUYUP: 1,
            BUYDOWN: 2,
            SELLUP: 3,
            SELLDOWN: 4,
            MIX: 5
        }
    }

    dispose() {
        this.getTradeItems.dispose();
    }

    activate(day, rummorsArray) {
        this.getTradeItems = ko.computed(() => {
            let tmpArray = this.tradeItems();
            return tmpArray;
        });
        this.updateItems(day, rummorsArray);
    }

    updateItems(day, rummorsArray) {
        let tmpArray = [];
        for (let i = 0; i < this.arraySize; i++) {
            let doWhileLoop = true;
            while (doWhileLoop) {

                let explanation = "";
                let buyItemIndex = Helper.randomMinMaxGenerator(0, this.inverntoryArray.length - 1);
                let sellItemIndex = Helper.randomMinMaxGenerator(0, this.inverntoryArray.length - 1);
                if (buyItemIndex == sellItemIndex) continue; //

                let buyItem = this.inverntoryArray[buyItemIndex];
                let sellItem = this.inverntoryArray[sellItemIndex];
                

                let hasCombination = tmpArray.find((tradeItem) => {
                    if (tradeItem.buyName == buyItem.inventoryName() && tradeItem.sellName == sellItem.inventoryName()) return true;
                });
                if (hasCombination) continue;

                let buyItemTotal = (buyItem.total() - buyItem.current());
                
                let buyItemPrice = buyItem.unitPrice();
                let sellItemPrice = sellItem.unitPrice();
                explanation += `Redovna cijena: ${buyItem.inventoryName()} = ${buyItemPrice} /  ${sellItem.inventoryName()} = ${sellItemPrice} \n`;

                let todayRumors = rummorsArray.filter((rumorItem) => {
                    if (rumorItem.day == day) {
                        if (rumorItem.inventoryName == buyItem.inventoryName()) return true;
                        if (rumorItem.inventoryName == sellItem.inventoryName()) return true;
                    }
                });

                let rumorsDiscountType = this.tradeItemTypeEnum.NONE;
                todayRumors.forEach((rumorItem) => {
                    if (rumorItem.inventoryName == buyItem.inventoryName()) {

                        if (rumorItem.pricePercent > 0) {
                            rumorsDiscountType = rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.BUYUP ? this.tradeItemTypeEnum.BUYUP : this.tradeItemTypeEnum.MIX;
                        } else {
                            rumorsDiscountType = rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.BUYDOWN ? this.tradeItemTypeEnum.BUYDOWN : this.tradeItemTypeEnum.MIX;
                        }

                        buyItemPrice = Math.ceil(buyItemPrice + (buyItemPrice * (rumorItem.pricePercent / 100))); 
                        explanation += `Diskontna cijena: ${buyItem.inventoryName()} = ${buyItemPrice}\n`;
                    }
                    if (rumorItem.inventoryName == sellItem.inventoryName()) {

                        if (rumorItem.pricePercent > 0) {
                            rumorsDiscountType =  rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP ? this.tradeItemTypeEnum.SELLUP : this.tradeItemTypeEnum.MIX;
                        } else {
                            rumorsDiscountType = rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLDOWN ? this.tradeItemTypeEnum.SELLDOWN : this.tradeItemTypeEnum.MIX;
                        }

                        sellItemPrice = Math.floor(sellItemPrice + (sellItemPrice * (rumorItem.pricePercent / 100)));
                        explanation += `Diskontna cijena: ${sellItem.inventoryName()} =  ${sellItemPrice}\n`;
                        
                    }
                });

                let randomLuck = Helper.randomMinMaxGenerator(1, 1000);
                if (randomLuck > 700) {
                    if (randomLuck < 800) {
                        if (rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP) {
                            rumorsDiscountType = rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP ? this.tradeItemTypeEnum.SELLUP : this.tradeItemTypeEnum.MIX;
                            sellItemPrice = Math.floor(sellItemPrice + (sellItemPrice * 0.4));; //increase sell price for 40%
                            explanation += `Dodatni popust od 40% (sell up) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;
                        }else if ( rumorsDiscountType == this.tradeItemTypeEnum.SELLDOWN) {
                            sellItemPrice = Math.floor(sellItemPrice - (sellItemPrice * 0.4));; //reduce sell price for 40%
                            explanation += `Dodatni popust od 40% (sell down) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYDOWN) {
                            buyItemPrice = Math.floor(buyItemPrice - (buyItemPrice * 0.4));; //reduce buy price for 40%
                            explanation += `Dodatni popust od 40% (buy down) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYUP) {
                            buyItemPrice = Math.floor(buyItemPrice + (buyItemPrice * 0.4));; // increase buy price for 40%
                            explanation += `Dodatni popust od 40% (buy up) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        } 
                    } else if (randomLuck < 900) {
                        if (rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP) {
                            rumorsDiscountType = rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP ? this.tradeItemTypeEnum.SELLUP : this.tradeItemTypeEnum.MIX;
                            sellItemPrice = Math.floor(sellItemPrice + (sellItemPrice * 0.5));; //increase sell price for 50%
                            explanation += `Dodatni popust od 50% (sell up) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;    
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.SELLDOWN) {
                            sellItemPrice = Math.floor(sellItemPrice - (sellItemPrice * 0.5));; //reduce sell price for 50%
                            explanation += `Dodatni popust od 50% (sell down) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYDOWN) {
                            buyItemPrice = Math.floor(buyItemPrice - (buyItemPrice * 0.5));; //reduce buy price for 50%
                            explanation += `Dodatni popust od 50% (buy down) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYUP) {
                            buyItemPrice = Math.floor(buyItemPrice + (buyItemPrice * 0.5));; // increase buy price for 50%
                            explanation += `Dodatni popust od 50% (buy up) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        } 
                    } 
                    else if (randomLuck < 950) {
                        if (rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP) {
                            rumorsDiscountType = rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP ? this.tradeItemTypeEnum.SELLUP : this.tradeItemTypeEnum.MIX;
                            sellItemPrice = Math.floor(sellItemPrice + (sellItemPrice * 0.6));; //increase sell price for 60%
                            explanation += `Dodatni popust od 60% (sell up) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.SELLDOWN) {
                            sellItemPrice = Math.floor(sellItemPrice - (sellItemPrice * 0.6));; //reduce sell price for 60%
                            explanation += `Dodatni popust od 60% (sell down) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYDOWN) {
                            buyItemPrice = Math.floor(buyItemPrice - (buyItemPrice * 0.6));; //reduce buy price for 50%
                            explanation += `Dodatni popust od 60% (buy down) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYUP) {
                            buyItemPrice = Math.floor(buyItemPrice + (buyItemPrice * 0.6));; // increase buy price for 60%
                            explanation += `Dodatni popust od 60% (buy up) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        } 
                    } 
                    else if (randomLuck >= 950) {
                        if (rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP) {
                            rumorsDiscountType = rumorsDiscountType == this.tradeItemTypeEnum.NONE || rumorsDiscountType == this.tradeItemTypeEnum.SELLUP ? this.tradeItemTypeEnum.SELLUP : this.tradeItemTypeEnum.MIX;
                            sellItemPrice = Math.floor(sellItemPrice + (sellItemPrice * 0.7));; //increase sell price for 70%
                            explanation += `Dodatni popust od 70% (sell up) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.SELLDOWN) {
                            sellItemPrice = Math.floor(sellItemPrice - (sellItemPrice * 0.7));; //reduce sell price for 70%
                            explanation += `Dodatni popust od 70% (sell down) ... ${sellItem.inventoryName()} =  ${sellItemPrice} \n`;   
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYDOWN) {
                            buyItemPrice = Math.floor(buyItemPrice - (buyItemPrice * 0.7));; //reduce buy price for 70%
                            explanation += `Dodatni popust od 70% (buy down) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        }else if (rumorsDiscountType == this.tradeItemTypeEnum.BUYUP) {
                            buyItemPrice = Math.floor(buyItemPrice + (buyItemPrice * 0.7));; // increase buy price for 70%
                            explanation += `Dodatni popust od 70% (buy up) ... ${buyItem.inventoryName()} =  ${buyItemPrice} \n`;
                        } 
                    }
                }

                buyItemPrice = Math.max(1, buyItemPrice);
                sellItemPrice = Math.max(1, sellItemPrice);

                let buyItemAmount = Helper.randomMinMaxGenerator(1, buyItemTotal);
                let sellItemAmount = Math.floor((buyItemPrice * buyItemAmount) / sellItemPrice);

                while (sellItemAmount < 1 || buyItemAmount < 1) {
                    buyItemAmount ++;
                    sellItemAmount = Math.floor((buyItemPrice * buyItemAmount) / sellItemPrice);
                    //explanation += `Add buyAmount+1. BuyAmount: ${buyItemAmount}, SellAmount: ${sellItemAmount}\n`;
                }
                               
                if (sellItemAmount > sellItem.total() || buyItemAmount > buyItem.total()) continue;

                switch (rumorsDiscountType) {
                    case 0:
                        explanation += "Ne postoje pospusti.\n";
                        break;
                    case 1:
                        explanation += "Skupo za kupovati. Kupiti ako se baš mora...\n";
                        break;
                    case 2:
                        explanation += "Jeftino za kupovati. Kupiti!!!\n";
                        break;
                    case 3:
                        explanation += "Prodajna cijena visoka. Prodati!!!\n";
                        break;
                    case 4:
                        explanation += "Prodajna cijena niska. Prodati ako se baš mora...\n";
                        break;
                    case 5:
                        explanation += "I kupovna i prodajna cijena su promijenjene. Procijenite sami...\n";
                        break;
                    default:
                        break;
                }

                let tradeItem = new TradeItem(buyItem.inventoryName(),buyItemAmount, buyItem.spanClass(), sellItem.inventoryName(), sellItemAmount, sellItem.spanClass(), explanation, rumorsDiscountType);

                tmpArray.push(tradeItem);
                doWhileLoop = false;
            }
        }
        this.tradeItems(tmpArray);
    }

    clear() {
        this.tradeItems.removeAll();
    }

    load(inverntoryArray, tradeItems, arraySize) {
        this.inverntoryArray = inverntoryArray;
        this.tradeItems.removeAll(); 
        this.arraySize = arraySize;
        let tmpArray = [];
        tradeItems.forEach((itemTrade) => {
            let newItem = new TradeItem(itemTrade.buyName, itemTrade.buyAmout, itemTrade.buyClass, itemTrade.sellName, itemTrade.sellAmount, itemTrade.sellClass, itemTrade.explanation, itemTrade.discountType)
            tmpArray.push(newItem);
        });
        this.tradeItems(tmpArray);
    }
}

class Rumours {
    constructor(inverntoryArray) {
        this.inverntoryArray = inverntoryArray;
        this.rumors = ko.observableArray([]);
    }

    activate(day) {
        this.getRumors = ko.computed(() => {
            let tmpArray = this.rumors();
            let array = [];
            if (tmpArray.length > 0) {
                array = tmpArray.sort((a, b) => {
                    return Helper.numericSort(a, b, "day");
                });
            }
            
            return array;
        });
        this.updateRumors(day);
    }

    dispose() {
        this.getRumors.dispose();
    }

    updateRumors(currentDay) {
        let tmpArray = [];
        //remove old rumors (only new and current go in new array...)
        for (let i = 0, itemRumor; itemRumor = this.rumors()[i]; ++i) {
            if (itemRumor.day >= currentDay) {
                tmpArray.push(itemRumor);
            }
        }
        this.rumors(tmpArray);
        //We always have 3 rumors. If we not then we must add new rumors
        while (this.rumors().length < 3) {
            this.addRandomRumor(currentDay);
        }
    }

    addRandomRumor(currentDay) {
        let doWhile = true;
        while (doWhile) {
            let dayRandom = currentDay == 1 ? Helper.randomMinMaxGenerator(0, 2) : Helper.randomMinMaxGenerator(1, 3);
            let day = currentDay + dayRandom;
            
            let inventoryIndex = Helper.randomMinMaxGenerator(0, this.inverntoryArray.length - 1);
            let inventory = this.inverntoryArray[inventoryIndex];

            let find = this.rumors().find((item) => {
                if (item.day == day && item.inventoryName == inventory.inventoryName()) return true;
            });

            if (find) continue; //still exists, try again....

            let percentRandom = Helper.randomMinMaxGenerator(0, 300);
            let pricePercent = 0;
            if (percentRandom < 100) {
                pricePercent = -Math.floor(percentRandom);
            } else {
                pricePercent = Math.floor((percentRandom - 100)); //
            }
    
            let reminder = pricePercent % 10;

            pricePercent = pricePercent - reminder;
            if (Math.abs(pricePercent) < 50) continue; //only significant prices change...

            let item = new Rumor(day, inventory.inventoryName(), pricePercent, inventory.spanClass);
            this.rumors.push(item);
            doWhile = false;
        }
    }
    clear() {
        this.rumors.removeAll();
    }

    load(inverntoryArray, rumors) {
        this.inverntoryArray = inverntoryArray;
        let tmpArray = [];
        rumors.forEach((itemRumor) => {
            let newItem = new Rumor(itemRumor.day, itemRumor.inventoryName, itemRumor.pricePercent, itemRumor.className);
            tmpArray.push(newItem);
        });
        this.rumors(tmpArray);
    }
}

class Rumor {
    constructor(day, inventoryName, pricePercent, className) {
        this.day = day;
        this.inventoryName = inventoryName;
        this.pricePercent = pricePercent;
        this.className = className
    }
}

class ResidentalNeeds {
    constructor(inventoryArray) {
        this.inventoryArray = inventoryArray;
        this.needsArray = ko.observableArray([]);
    }


    activate(day) {
        this.getNeedsArray = ko.computed(() => {
            let tmpArray = this.needsArray();
            return tmpArray;
        });

        this.activeCount = ko.computed(() => {
            let tmpArray = this.needsArray().filter((itemNeed) => {
                if (itemNeed.active()) return true;
            });
            return tmpArray.length;
        });


        let tmpAllNeedsArray = [];
        let needItem = null;
        this.inventoryArray.forEach((inventoryItem) => {
            needItem = new Need(0, inventoryItem.inventoryName(), 0, inventoryItem.spanClass(), false);
            tmpAllNeedsArray.push(needItem);
        })

        this.needsArray(tmpAllNeedsArray);

        this.updateNeeds(day);
    }

    updateNeeds(day) {

        let decreaseResilience = 0;
        
        //first get todays needs
        let todaysNeeds = this.needsArray().filter((itemNeed) => {
            if (itemNeed.day() == day) return true;
        });

        //then proccess and remove today needs...
        todaysNeeds.forEach((itemNeed) => {

            let inventory = this.inventoryArray.find((itemInventory) => {
                if (itemInventory.inventoryName() == itemNeed.inventoryName()) return true;
            });

            if (inventory) {

                let razlika = inventory.current() - itemNeed.itemAmount();
                if (razlika < 0) {
                    decreaseResilience = decreaseResilience + Math.abs(razlika);
                    razlika = 0;
                }
                inventory.current(razlika);
            } else {
                //TODO: ERROR - Why inverntoryItem not found ???
            }
            itemNeed.day(0);
            itemNeed.itemAmount(0);
            itemNeed.active(false); //hide neactive needs
        });



        //then add new needs if its suitable (their numbers depends of current day: 1-9 day = 1 needs, 10-19 days = 2 needs, and so on...)
        let needCount = Math.floor(day/10) + 1;
        let currentCount = this.activeCount();

        while (needCount > currentCount) {
            let nextDayNeed = day + Helper.randomMinMaxGenerator(2, 4);
            let inventoryIndex = Helper.randomMinMaxGenerator(0, this.inventoryArray.length - 1);
            let inventory = this.inventoryArray[inventoryIndex];
            let inventoryName = inventory.inventoryName();
            let inventoryTotal = inventory.total();
            let findNeed = this.needsArray().find((itemNeed) => {
                if (itemNeed.inventoryName() == inventoryName) return true;
            });
            if (findNeed.active()) continue; //need is alredy active, so continue

            let needQuantityMin = needCount;
            let needQuantityMax = Math.floor(needCount + inventoryTotal * (needCount / 10));
            let needAmount = Helper.randomMinMaxGenerator(needQuantityMin, needQuantityMax);

            findNeed.day(nextDayNeed);
            findNeed.itemAmount(needAmount);
            findNeed.active(true);

            currentCount = this.activeCount();
        }

        return decreaseResilience;
    }

    clear() {
        this.needsArray().forEach((itemNeed) => {
            itemNeed.day(0);
            itemNeed.itemAmount(0);
            itemNeed.active(false); 
        });
    }

    load(inverntoryArray, needs) {
        this.inventoryArray = inverntoryArray;
        this.needsArray.removeAll(); 
        let tmpArray = [];
        needs.forEach((itemNeed) => {
            let newItem = new Need(itemNeed.day, itemNeed.inventoryName, itemNeed.itemAmount, itemNeed.className, itemNeed.active);
            tmpArray.push(newItem);
        });
        this.needsArray(tmpArray);
    }

    dispose() {
        this.getNeedsArray.dispose();
    }
}

class Need {
    constructor(day, inventoryName, itemAmount, className, active) {
        this.day = ko.observable(day);
        this.inventoryName = ko.observable(inventoryName);
        this.itemAmount = ko.observable(itemAmount);
        this.className = ko.observable(className);
        this.active = ko.observable(active);
    }
}

class Helper {
    static randomMinMaxGenerator(minValue, maxValue) {
        /*
            Because Math.floor round off to lower value, it is very low chance to max Value be chosen. 
            Because of that we have work around..
        */
        let tmpMax = maxValue + 1; 
        let rez = Math.floor((Math.random() * (tmpMax - minValue)) + minValue);
        if (rez > maxValue) rez = maxValue;
        return rez;
    }
    static getDateForNewDay(startDate, days) {
        let newDate = new Date(startDate.getTime() + (days * 24*60*60*1000));
        return newDate;
    }
    static getDayName(dayNumber) {
        switch (dayNumber) {
            case 0:
                return "Nedjelja";          
            case 1:
                return "Ponedjeljak";
            case 2:
                return "Utorak";
            case 3:
                return "Srijeda";
            case 4:
                return "Četvrtak";
            case 5:
                return "Petak";
            case 6:
                return "Subota";
            default:
                break;
        }
    }

    static standardSort(a, b, sortProperty) {
        if (!a && !b) return 0;
        if (a && !b) return 1;
        if (!a && b) return -1;

        var propA = this.deepFind(a, sortProperty);
        var propB = this.deepFind(b, sortProperty);

        if ((propA === null || propA === undefined) && (propB === null || propB === undefined)) return 0;
        if (propA === null || propA === undefined) return -1;
        if (propB === null || propB === undefined) return 1;


        if (!propA) propA = '';
        if (!propB) propB = '';

        if (propA == propB)
            return 0;
        return propA < propB ? -1 : 1;
    }

    static numericSort(a, b, sortProperty) {
        if (!a && !b) return 0;
        if (a && !b) return 1;
        if (!a && b) return -1;

        var propA = Helper.deepFind(a, sortProperty);
        var propB = Helper.deepFind(b, sortProperty);

        propA = propA ? propA : 0;
        propB = propB ? propB : 0;

        propA = parseInt(propA);
        propB = parseInt(propB);
        if (propA == propB)
            return 0;
        return propA < propB ? -1 : 1;
    }

    static deepFind = (obj, path) => {
        var paths = path.split('.'), current = obj, i;

        for (i = 0; i < paths.length; ++i) {
            if (ko.unwrap(current[paths[i]]) == undefined) {
                return undefined;
            } else {
                current = ko.unwrap(current[paths[i]]);
            }
        }
        return current;
    }
}


class SaveGame {

    constructor(day, resilience, totalResilience, inventory, rumors, tradeItems, tradeItemsCount, needs, user) {
        this.user = user;
        this.day = day
        this.resilience = resilience;
        this.totalResilience = totalResilience;
        this.inventory = inventory;
        this.rumors = rumors;
        this.tradeItems = tradeItems;
        this.tradeItemsCount = tradeItemsCount
        this.needs = needs;
    }


}

export {Trader};
