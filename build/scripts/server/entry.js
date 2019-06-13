(() => {
    const defines = {};
    const entry = [null];
    function define(name, dependencies, factory) {
        defines[name] = { dependencies, factory };
        entry[0] = name;
    }
    define("require", ["exports"], (exports) => {
        Object.defineProperty(exports, "__cjsModule", { value: true });
        Object.defineProperty(exports, "default", { value: (name) => resolve(name) });
    });
    define("system", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.system = server.registerSystem(0, 0);
        checkApiLevel(1);
    });
    define("utils", ["require", "exports"], function (require, exports) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        function isPlayerInfo(info) {
            return info.identifier === "minecraft:player";
        }
        exports.isPlayerInfo = isPlayerInfo;
    });
    define("main", ["require", "exports", "system", "utils"], function (require, exports, system_1, utils_1) {
        "use strict";
        Object.defineProperty(exports, "__esModule", { value: true });
        const db = new SQLite3("chat-deco.db");
        db.exec("CREATE TABLE IF NOT EXISTS deco (target TEXT PRIMARY KEY, prefix TEXT, suffix TEXT);");
        db.exec("CREATE TABLE IF NOT EXISTS regiondeco (id, sx INT NOT NULL, sy INT NOT NULL, sz INT NOT NULL, ex INT NOT NULL, ey INT NOT NULL, ez INT NOT NULL , prefix TEXT NOT NULL);");
        system_1.system.initialize = function () {
            server.log("Chat Decorator Addon Loaded");
            this.muteChat();
            this.listenForEvent("stoneserver:chat_received", ({ sender, content }) => {
                const info = this.actorInfo(sender);
                if (utils_1.isPlayerInfo(info)) {
                    const arr = db.query("SELECT * FROM deco WHERE target = $uuid", {
                        $uuid: info.uuid
                    });
                    if (arr[0]) {
                        const { prefix, suffix } = arr[0];
                        this.broadcastMessage(`${prefix || ""}${info.name}${suffix || ": "}${content}`);
                        return;
                    }
                }
                this.broadcastMessage(`${info.name}: ${content}`);
            });
            this.registerSoftEnum("prefix-or-suffix", ["prefix", "suffix"]);
            this.registerCommand("setchatdeco", {
                description: "commands.custom.setchatdeco",
                permission: 1,
                overloads: [
                    {
                        parameters: [
                            {
                                name: "target",
                                type: "player-selector"
                            },
                            {
                                name: "type",
                                type: "soft-enum",
                                enum: "prefix-or-suffix"
                            },
                            {
                                name: "value",
                                type: "string"
                            }
                        ],
                        handler(_origin, [target, type, $value]) {
                            target.forEach(e => {
                                const info = this.actorInfo(e);
                                if (!utils_1.isPlayerInfo(info))
                                    throw "error.target.not.player";
                                if (type === "prefix" || type === "suffix") {
                                    db.update(`INSERT INTO deco (target, ${type}) VALUES ($target, $value) ON CONFLICT(target) DO UPDATE SET ${type}=$value`, {
                                        $target: info.uuid,
                                        $value
                                    });
                                }
                                else
                                    throw "error.param.enum";
                            });
                        }
                    }
                ]
            });
            this.registerCommand("delchatdeco", {
                description: "commands.custom.delchatdeco",
                permission: 1,
                overloads: [
                    {
                        parameters: [
                            {
                                name: "target",
                                type: "player-selector"
                            },
                            {
                                name: "type",
                                type: "soft-enum",
                                enum: "prefix-or-suffix"
                            }
                        ],
                        handler(_origin, [target, type]) {
                            target.forEach(e => {
                                const info = this.actorInfo(e);
                                if (!utils_1.isPlayerInfo(info))
                                    throw "error.target.not.player";
                                if (type === "prefix") {
                                    db.update(`UPDATE deco SET prefix="" WHERE target=$target`, {
                                        $target: info.uuid,
                                    });
                                }
                                else if (type === "suffix") {
                                    db.update(`UPDATE deco SET suffix="" WHERE target=$target`, {
                                        $target: info.uuid,
                                    });
                                }
                                else
                                    throw "error.param.enum";
                            });
                        }
                    }
                ]
            });
        };
    });
    
    'marker:resolver';

    function get_define(name) {
        if (defines[name]) {
            return defines[name];
        }
        else if (defines[name + '/index']) {
            return defines[name + '/index'];
        }
        else {
            const dependencies = ['exports'];
            const factory = (exports) => {
                try {
                    Object.defineProperty(exports, "__cjsModule", { value: true });
                    Object.defineProperty(exports, "default", { value: require(name) });
                }
                catch (_a) {
                    throw Error(['module "', name, '" not found.'].join(''));
                }
            };
            return { dependencies, factory };
        }
    }
    const instances = {};
    function resolve(name) {
        if (instances[name]) {
            return instances[name];
        }
        if (name === 'exports') {
            return {};
        }
        const define = get_define(name);
        instances[name] = {};
        const dependencies = define.dependencies.map(name => resolve(name));
        define.factory(...dependencies);
        const exports = dependencies[define.dependencies.indexOf('exports')];
        instances[name] = (exports['__cjsModule']) ? exports.default : exports;
        return instances[name];
    }
    if (entry[0] !== null) {
        return resolve("main");
    }
})();