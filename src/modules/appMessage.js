import { App } from "./main.js";

class AppMessage {
    constructor(title, message, image, autoclose = true ) {
        this.title = title;
        this.message = message;
        this.image = image;
        if (autoclose) {
            setTimeout(() => {
                App.removeAppMessage(this);
            }, 3000);
        }
        
    }
}

export {AppMessage}