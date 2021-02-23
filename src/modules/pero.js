
class Pero {
    constructor() {
        this.moduleName = ko.observable("Pero modul");
        this.brojKlikova = ko.observable(0);
    }

    static getObject() {
        return new Pero();
    }

    activate() {
        return new Promise((resolve, reject) => {
            setTimeout( function() {
                resolve("Success!")  // Yay! Everything went well!
            }, 1000);
        });
    }

    clickBrojac() {
        this.brojKlikova(this.brojKlikova() + 1);
    }
}

export {Pero};