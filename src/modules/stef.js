
class Stef {
    constructor() {
        this.moduleName = ko.observable("Štef modul")
    }

    static getObject() {
        return new Stef();
    }

    activate() {
        return true;
    }
}

export {Stef as GameModule};
