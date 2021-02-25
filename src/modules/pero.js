
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

            let promise1 = new Promise((resolve, reject) => {
                import("./helper.js").then((module) => {
                    let helper = module.Helper;
                    resolve("imported!")  // this is resolve of import statment
                });
            })
            

            Promise.all([promise1]).then(values => {
                resolve("Success!")  // this is resolve of activate method
            })

        });
    }

    clickBrojac() {
        this.brojKlikova(this.brojKlikova() + 1);
    }
}

export {Pero};