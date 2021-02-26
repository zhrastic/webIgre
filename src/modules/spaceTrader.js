import { Helper } from "./helper.js";
import { App } from "./main.js";
import {AppMessage} from "./appMessage.js";

class SpaceTrader {
    constructor() {
        this.moduleName = ko.observable("Trgujte u svemiru...");
        this.pubSub = null;
        this.indexDB = ko.observable(null);
        this.savedGame = null;
        this.hasSavedGames = ko.observable(false);

        this.user = "Anonymous";
    }

    static getObject() {
        return new SpaceTrader();
    }

    activate(pubSub) {
        this.pubSub = pubSub;
    }

    afterBinding(nodes) {
        let divCanvas = document.getElementById("divCanvas").getBoundingClientRect();
        let canvas = document.getElementById("canvas");
        let divText = document.getElementById("divText");
        canvas.style.width = `${divCanvas.width - 100}px`;
        canvas.style.height = `400px`;
        //divText.style.width = canvas.style.width;
    }

    newGame() {
        let number = Helper.randomMinMaxGenerator(1, 1000)
        let msg = new AppMessage("Pero", `Poruka broj: ${number}`, null);
        this.pubSub.publish("GameMessage", msg);
    }
    saveGame() {

    }
    loadGame() {

    }
    deleteGame() {

    }
}

export { SpaceTrader as GameModule };