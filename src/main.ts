import { system, MySystem } from "./system";
import { isPlayerInfo } from "./utils";

const db = new SQLite3("chat-deco.db");
db.exec(
  "CREATE TABLE IF NOT EXISTS deco (target TEXT PRIMARY KEY, prefix TEXT, suffix TEXT);"
);

db.exec("CREATE TABLE IF NOT EXISTS regiondeco (id, sx INT NOT NULL, sy INT NOT NULL, sz INT NOT NULL, ex INT NOT NULL, ey INT NOT NULL, ez INT NOT NULL , prefix TEXT NOT NULL);")

system.initialize = function() {
  server.log("Chat Decorator Addon Loaded");
  this.muteChat();
  this.listenForEvent(
    "stoneserver:chat_received",
    ({ sender, content }: { sender: IEntity; content: string }) => {
      const info = this.actorInfo(sender);
      if (isPlayerInfo(info)) {
        const arr = db.query("SELECT * FROM deco WHERE target = $uuid", {
          $uuid: info.uuid
        }) as { target: string; prefix: string; suffix: string }[];
        if (arr[0]) {
          const { prefix, suffix } = arr[0];
          this.broadcastMessage(
            `${prefix || ""}${info.name}${suffix || ": "}${content}`
          );
          return;
        }
      }
      this.broadcastMessage(`${info.name}: ${content}`);
    }
  );

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
            if (!isPlayerInfo(info)) throw "error.target.not.player";
            if (type === "prefix" || type === "suffix") {
              db.update(
                `INSERT INTO deco (target, ${type}) VALUES ($target, $value) ON CONFLICT(target) DO UPDATE SET ${type}=$value`,
                {
                  $target: info.uuid,
                  $value
                }
              );
            } else throw "error.param.enum";
          });
        }
      } as CommandOverload<MySystem, ["player-selector", "soft-enum", "string"]>
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
            if (!isPlayerInfo(info)) throw "error.target.not.player";
            if (type === "prefix") {
              db.update(
                `UPDATE deco SET prefix="" WHERE target=$target`,
                {
                  $target: info.uuid,
                }
              );
            }
            else if(type === "suffix"){
              db.update(
                `UPDATE deco SET suffix="" WHERE target=$target`,
                {
                  $target: info.uuid,
                }
              );
            }
            else throw "error.param.enum";
          });
        }
      } as CommandOverload<MySystem, ["player-selector", "soft-enum"]>
    ]
  });

};
