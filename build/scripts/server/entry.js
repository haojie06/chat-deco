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
        db.exec("CREATE TABLE IF NOT EXISTS regiondeco (id, sposition TEXT NOT NULL, eposition TEXT NOT NULL, minx INT NOT NULL, miny INT NOT NULL, minz INT NOT NULL, maxx INT NOT NULL, maxy INT NOT NULL, maxz INT NOT NULL , prefix TEXT NOT NULL, dim INT NOT NULL);");
        system_1.system.initialize = function () {
            server.log("聊天装饰 Loaded");
            this.muteChat();
            this.listenForEvent("stoneserver:chat_received", ({ sender, content }) => {
                const info = this.actorInfo(sender);
                var regionprefix = "";
                if (utils_1.isPlayerInfo(info)) {
                    let ix = info.pos[0].toFixed(0);
                    let iy = info.pos[1].toFixed(0);
                    let iz = info.pos[2].toFixed(0);
                    let decoarr = Array.from(db.query(`SELECT * FROM regiondeco WHERE $ix >= minx AND $ix <= maxx AND $iy >= miny AND $iy <= maxy AND $iz >= minz AND $iz <= maxz AND dim = $dim`, {
                        $ix: ix,
                        $iy: iy,
                        $iz: iz,
                        $dim: info.dim
                    }));
                    //server.log("玩家没有在区域内说话");
                    if (info.dim == 0) {
                        regionprefix += "§2§l[主世界]§r";
                    }
                    else if (info.dim == 1) {
                        regionprefix += "§4§l[下界]§r";
                    }
                    else if (info.dim == 2) {
                        regionprefix += "§5§l[末界]§r";
                    }
                    if (decoarr.length > 0) {
                        //server.log("玩家在区域内说话");
                        for (let dec of decoarr) {
                            regionprefix += dec.prefix;
                        }
                    }
                    const arr = db.query("SELECT * FROM deco WHERE target = $uuid", {
                        $uuid: info.uuid
                    });
                    if (arr[0]) {
                        const { prefix, suffix } = arr[0];
                        this.broadcastMessage(`${regionprefix}${prefix || ""}${info.name}${suffix || ": "}${content}`);
                        return;
                    }
                    this.broadcastMessage(`${regionprefix}${info.name}: ${content}`);
                }
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
            //添加区域装饰
            this.registerCommand("setregiondeco", {
                description: "添加区域装饰",
                permission: 1,
                overloads: [{
                        parameters: [{
                                name: "regionstart",
                                type: "position"
                            },
                            {
                                name: "regionend",
                                type: "position"
                            },
                            {
                                name: "deco",
                                type: "string"
                            }],
                        handler(origin, [regionstart, regionend, deco]) {
                            let info = this.actorInfo(origin.entity);
                            server.log(`from ${regionstart[0]} ${regionstart[1]} ${regionstart[2]} to ${regionend[0]} ${regionend[1]} ${regionend[2]}`);
                            if (getByName(deco).length == 0) {
                                db.update(`INSERT INTO regiondeco (sposition, eposition, minx, miny, minz, maxx, maxy, maxz, prefix,dim) VALUES ($sposition, $eposition , $sx, $sy, $sz, $ex, $ey, $ez, $prefix, $dim)`, {
                                    $sposition: Math.floor(regionstart[0]) + " " + Math.floor(regionstart[1]) + " " + Math.floor(regionstart[2]),
                                    $eposition: Math.floor(regionend[0]) + " " + Math.floor(regionend[1]) + " " + Math.floor(regionend[2]),
                                    $sx: Math.floor(Math.min(regionstart[0], regionend[0])),
                                    $sy: Math.floor(Math.min(regionstart[1], regionend[1])),
                                    $sz: Math.floor(Math.min(regionstart[2], regionend[2])),
                                    $ex: Math.floor(Math.max(regionstart[0], regionend[0])),
                                    $ey: Math.floor(Math.max(regionstart[1], regionend[1])),
                                    $ez: Math.floor(Math.max(regionstart[2], regionend[2])),
                                    $prefix: deco,
                                    $dim: info.dim
                                });
                                this.invokeConsoleCommand("chat deco", `tell "${info.name}" 成功设置区域聊天前缀`);
                            }
                            else
                                throw "已存在同名前缀";
                        }
                    }]
            });
            this.registerCommand("decolist", {
                description: "显示所有区域装饰前缀",
                permission: 1,
                overloads: [{
                        parameters: [],
                        handler(original) {
                            const entity = original.entity;
                            if (!entity)
                                throw "Designed for player usage";
                            const info = this.actorInfo(entity);
                            const datas = Array.from(db.query(`SELECT * FROM regiondeco`, {}));
                            let show = "区域装饰列表：\n";
                            for (var data of datas) {
                                if (data != undefined) {
                                    show += `${data.prefix}: from (${data.sposition}) to (${data.eposition}) DIM:${data.dim}\n`;
                                }
                            }
                            this.invokeConsoleCommand("chat-deco", `tell "${info.name}" ${show}`);
                        }
                    }]
            });
            this.registerCommand("delregiondeco", {
                description: "删除区域装饰前缀",
                permission: 1,
                overloads: [{
                        parameters: [{
                                name: "deco",
                                type: "string"
                            }],
                        handler(original, [deco]) {
                            const entity = original.entity;
                            const info = this.actorInfo(entity);
                            if (!entity)
                                throw "Designed for player usage";
                            let number = db.update(`DELETE FROM regiondeco WHERE prefix=$prefix`, { $prefix: deco });
                            if (number == 1) {
                                this.invokeConsoleCommand("chat-deco", `tell "${info.name}" 成功删除装饰：${deco}`);
                            }
                            else
                                throw "删除失败";
                        }
                    }]
            });
        };
        function getByName(name) {
            const arr = db.query("SELECT * FROM regiondeco WHERE prefix = $prefix", {
                $prefix: name
            });
            return Array.from(arr);
        }
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