
class PublishSubscriber {

    constructor() {
        this.subscribers = {};
    }

    publish(eventName, data) {
        if (!Array.isArray(this.subscribers[eventName])) {
            return;
        }
        this.subscribers[eventName].forEach((callback) => {
            callback(data);
        })
    }

    subscribe(eventName, callback) {
        if (!Array.isArray(this.subscribers[eventName])) {
            this.subscribers[eventName] = [];
        }
        this.subscribers[eventName].push(callback);
        
        return {
            unsubscribe() {
                subscribers[eventName] = subscribers[eventName].filter((cb) => {
                    // Does not include the callback in the new array
                    if (cb === callback) {
                        return false;
                    }
                    return true;
                })
            },
        }
    }
}

export {PublishSubscriber};