import {PublishSubscriber} from "./pubSub.js"
import {AppMessage} from "./appMessage.js";

class App {
    constructor() {
        let self = this;
        this.menuClick = function (nesto) {
            if (self.loading()) return;
            if (nesto.name == "Home") {
                self.componentName(null);
                self.routeName(nesto.name);
                return;
            }

            self.routeName(nesto.name);

            if (!ko.components.isRegistered(nesto.name)) {
                self.loading(true);
                self.componentName(null);
                jQuery.get(nesto.link, function (htmlTemplate) {
                    let module = null;
                    import(nesto.module).then((module) => {
                        module = new module.GameModule();
                        let activator = module.activate(self.pubSub);
                        //If activator is Promise, let it finish....
                        if (activator && activator.then && typeof activator.then === "function") {
                            activator.then(rez => {
                                ko.components.register(nesto.name, {
                                    viewModel: { instance: module },
                                    template: htmlTemplate
                                });
                                self.componentName(nesto.name);
                                self.loading(false);
                            });
                        } else {
                            ko.components.register(nesto.name, {
                                viewModel: { instance: module },
                                template: htmlTemplate
                            });
                            self.componentName(nesto.name);
                            self.loading(false);
                        }
                    });
                });
            } else {
                ko.components.get(nesto.name, (retComponent) => {
                    
                    if (retComponent) {
                        let module = retComponent.createViewModel();
                        //Call activate() method again. 
                        let activator = module.activate(self.pubSub);
                        if (activator && activator.then && typeof activator.then === "function") {
                            activator.then(rez => {
                                self.componentName(nesto.name);
                                self.loading(false);
                            });
                        } else {
                            self.componentName(nesto.name);
                            self.loading(false);
                        }
                    } else {
                        self.componentName(nesto.name);
                        self.loading(false);
                    }
                });
            }
        }
        this.removeAppMessage = function(msg) {
            self.appMessages.remove(msg);
        }
    };

    main() {
        let self = this;
        this.loading = ko.observable(false);
        this.componentName = ko.observable();
        this.routeName = ko.observable("Home");
        let version = new Date().getTime()
        this.pubSub = new PublishSubscriber();
        this.appMessages = ko.observableArray([]);
        this.pubSub.subscribe("GameMessage",(data) => {
            this.appMessages.unshift(data);
        });

        this.menus = [
            { name: "Home", link: "", module: "", description: "Home" },
            { name: "Trader", link: `src/templates/trader.html?v=${version}`, module: `./trader.js?v=${version}`, description: "Spasi selo trgujući" },
            { name: "Svemirski trgovac", link: `src/templates/spaceTrader.html?v=${version}`, module: `./spaceTrader.js?v=${version}`, description: "Trgujte putujući od planete do planete" },
            { name: "Jura", link: `src/templates/jura.html?v=${version}`, module: `./jura.js?v=${version}`, description: "Još ništa..."  },
            { name: "Štef", link: `src/templates/stef.html?v=${version}`, module: `./stef.js?v=${version}`, description: "Još ništa..."  },
        ]
        
    }  
}

let app = new App();
app.main();
ko.applyBindings(app);

export {app as App};
