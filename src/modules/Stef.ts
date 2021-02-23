
class Stef {

    constructor() {

    }

    static getObject() {
        return new Stef();
    }

    activate() {
        return new Promise((resolve, reject) => {
            setTimeout( function() {
                resolve("Success!")  // Yay! Everything went well!
            }, 1000);
        });
    }
}
