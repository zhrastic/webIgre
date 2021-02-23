
class Jura {
    constructor() {
        this.moduleName = ko.observable("Jura modul")
    }

    static getObject() {
        return new Jura();
    }

    activate() {
        

        return true;
    }
}

export {Jura};