var http = require("http");
var fs = require("fs");
var express = require("express");

//Read settings
var colors = fs.readFileSync("./config/colors.txt").toString().replace(/\r/,"").split("\n");
var blacklist = fs.readFileSync("./config/blacklist.txt").toString().replace(/\r/,"").split("\n");
var colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
var config = JSON.parse(fs.readFileSync("./config/config.json"));
if(blacklist.includes("")) blacklist = []; //If the blacklist has a blank line, ignore the whole list.

var markup = require("./markup.js");

//Variables
var rooms = {};
var userips = {}; //It's just for the alt limit
var guidcounter = 0;
var app = new express();
app.use(express.static("./frontend"));
var server = require("http").createServer(app)
//Socket.io Server
var io = require("socket.io")(server, {
    allowEIO3: true
}
);
server.listen(config.port, () => {
    rooms["default"] = new room("default");
    rooms["desanitize"] = new room("desanitize");
    console.log("running at http://bonzi.localhost:" + config.port);
});
io.on("connection", (socket) => {
  //First, verify this user fits the alt limit
  if(true || typeof userips[socket.request.connection.remoteAddress] == 'undefined') userips[socket.request.connection.remoteAddress] = 0;
  userips[socket.request.connection.remoteAddress]++; //remoce true || to turn on alt limit
  
  if(userips[socket.request.connection.remoteAddress] > config.altlimit){
    //If we have more than the altlimit, don't accept this connection and decrement the counter.
    userips[socket.request.connection.remoteAddress]--;
    socket.emit("errr", {code:104});
    socket.disconnect();
    return;
  }
  
  //Set up a new user on connection
    new user(socket);
});

//Now for the fun!

//Command list
var commands = {

  name:(victim,param)=>{
    if (param == "" || (param == "Fune" && victim.level<2) || param.length > config.namelimit) return;
    if (victim.markup) {
      victim.public.name = markup(param, true);
      victim.public.dispname = markup(param);
    }
    else {
      victim.public.name = param;
      victim.public.dispname = param;
    }
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },
  
  asshole:(victim,param)=>{
  victim.room.emit("asshole",{
    guid:victim.public.guid,
    target:param,
  })
  },

  hail:(victim, param)=>{
    victim.room.emit("hail",{guid:victim.public.guid,user:param});
  },

  color:(victim, param)=>{
    if (victim.statlocked)
      return;
    if (!param.startsWith("http"))
    param = param.toLowerCase();
    if(!colors.includes(param) && (!param.startsWith("http"))) param = colors[Math.floor(Math.random() * colors.length)];
    victim.public.color = param;
    victim.public.tagged = false;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  }, 
  
  pitch:(victim, param)=>{
    param = parseInt(param);
    if(isNaN(param)) return;
    victim.public.pitch = param;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  speed:(victim, param)=>{
    param = parseInt(param);
    if(isNaN(param) || param>400|| param<100) return;
    victim.public.speed = param;
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  announce:(victim, param)=>{
    if (victim.level < 1 && victim.public.color != "blessed") return;
    victim.room.emit("announcement", {from:victim.public.name,msg:param});
  },

  poll:(victim, param)=>{
    if (victim.level < 1 && victim.public.color != "blessed") return;
    victim.room.emit("pollshow", param);
    victim.room.pollvotes = {};
    victim.room.emit("pollupdate", {yes: 0, no: 0, votecount: 0});
  },
  
  godmode:(victim, param)=>{
    if(param == config.godword){
	victim.level = 3;
	victim.socket.emit("authed", 3);
    }
  },

  kingmode:(victim, param)=>{
    if(param == config.kingword){
  victim.level = 2;
  victim.socket.emit("authed", 2);
    }
  },

  pope:(victim, param)=>{
    if(victim.level<3) return;
    victim.public.tagged = true;
    victim.public.tag = "Owner";
    victim.public.color = "pope";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  king:(victim, param)=>{
    if(victim.level<1) return;
    victim.public.tagged = true;
    victim.public.tag = "King";
    victim.public.color = "king";
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
  },

  jewify:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].color = "jew";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Jew";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  bless:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param]) return;
    victim.room.usersPublic[param].color = "blessed";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].tag = "Blessed";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },

  statlock:(victim, param)=>{
    if(victim.level<1 || !victim.room.usersPublic[param]) return;
    users[param].statlocked = !users[param].statlocked;
  },

  floyd:(victim, param)=>{
    if(victim.level<2) return;
     if(victim.niggered) return;
   toniggery = victim.room.users.find(useregg=>{
  return useregg.public.guid == param;
   })
     if(toniggery == undefined) return;
    toniggery.public.color = "floyd";
     toniggery.public.name = "DIRTY NIGGER";
     victim.niggered = true;
      toniggery.socket.emit("nuke");
    toniggery.room.emit("update",{guid:victim.public.guid,userPublic:victim.public})
     setTimeout(()=>{victim.niggered = false},10000);
  },

  deporn:(victim, param)=>{
    if(victim.level<2 || !victim.room.usersPublic[param] || !victim.room.usersPublic[param].color.startsWith("http")) return;
    var newBlacklist = "";
    for (var i = 0; i < colorBlacklist.length; ++i)
      newBlacklist += colorBlacklist[i] + "\n";
    newBlacklist += victim.room.usersPublic[param].color;
    fs.writeFileSync("./config/colorBlacklist.txt", newBlacklist);
    colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
    victim.room.usersPublic[param].name = "I love men";
    victim.room.usersPublic[param].dispname = "I love men";
    victim.room.usersPublic[param].tag = "men lover";
    victim.room.usersPublic[param].tagged = true;
    victim.room.usersPublic[param].color = "jew";
    victim.room.emit("update",{guid:param,userPublic:victim.room.usersPublic[param]});
  },
  
  image:(victim, param)=>{
    victim.room.emit("talk",{
      text: "<img class='userimage' src='"+param+"' />",
      guid:victim.public.guid
    })
  },

  video:(victim, param)=>{
    victim.room.emit("talk",{
      text: "<video class='uservideo' src='"+param+"' />",
      guid:victim.public.guid
    })
  },

  markup:(victim, param)=>{
    switch (param.toLowerCase()) {
      case "off":
      case "false":
      case "no":
      case "n":
      case "0":
        victim.markup = false;
      break;
      default:
        victim.markup = true;
      break;
    }
  },

  emote:(victim, param)=>{
    victim.room.emit("emote", {guid:victim.public.guid,type:param});
  },

  update:(victim, param)=>{
    if(victim.level<3) return;
    //Just re-read the settings.
    colors = fs.readFileSync("./config/colors.txt").toString().replace(/\r/,"").split("\n");
blacklist = fs.readFileSync("./config/blacklist.txt").toString().replace(/\r/,"").split("\n");
colorBlacklist = fs.readFileSync("./config/colorBlacklist.txt").toString().replace(/\r/,"").split("\n");
config = JSON.parse(fs.readFileSync("./config/config.json"));
if(blacklist.includes("")) blacklist = []; 
  },
  
  joke:(victim, param)=>{
    victim.room.emit("joke", {guid:victim.public.guid, rng:Math.random()})
  },
  
  fact:(victim, param)=>{
    victim.room.emit("fact", {guid:victim.public.guid, rng:Math.random()})
  },
  
  backflip:(victim, param)=>{
    victim.room.emit("backflip", {guid:victim.public.guid, swag:(param.toLowerCase() == "swag")})
  },
  
  owo:(victim, param)=>{
  victim.room.emit("owo",{
    guid:victim.public.guid,
    target:param,
  })
  },
  freepope:(victim, param)=>{
    victim.room.emit("freepope",{
      guid:victim.public.guid,
      target:param,
    })
    },
  nigger:(victim, param)=>{
    victim.room.emit("talk",{
      guid:victim.public.guid,
      text:"Seamus is a nigger!"
    })
  },
  
  sanitize:(victim, param)=>{
    if(victim.level<2) return;
    if(victim.sanitize) victim.sanitize = false;
    else victim.sanitize = true;
  },

  tag:(victim, param)=>{
    if(victim.level<1) return;
    if (!param || param == "")
      victim.public.tagged = false;
    else {
      victim.public.tagged = true;
      victim.public.tag = param;
    }
    victim.room.emit("update",{guid:victim.public.guid,userPublic:victim.public});
  },

  triggered:(victim, param)=>{
    victim.room.emit("triggered", {guid:victim.public.guid})
  },

  linux:(victim, param)=>{
    victim.room.emit("linux", {guid:victim.public.guid})
  },
  
  youtube:(victim, param)=>{
    victim.room.emit("youtube",{guid:victim.public.guid, vid:param.replace(/"/g, "&quot;")})
  },

  background:(victim, param)=>{
    victim.socket.emit("background", {bg:param});
  },

  theme:(victim, param)=>{
    victim.socket.emit("theme", param);
  },

  kick:(victim, param)=>{
    if(victim.level < 2) return;
    if(victim.kickslow) return;
    tokick = victim.room.users.find(useregg=>{
	return useregg.public.guid == param;
    })
    if(tokick == undefined) return;
    tokick.socket.disconnect();
    victim.kickslow = true;
    setTimeout(()=>{victim.kickslow = false},10000);
  },
  
  tagsom:(victim, param)=>{
    var id = param.split(" ", 1), tag = param.substring(id.length + 1);
    if(victim.level<3 || !victim.room.usersPublic[id]) return;
    if (!tag || tag == "")
      victim.room.usersPublic[id].tagged = false;
    else {
      victim.room.usersPublic[id].tagged = true;
      victim.room.usersPublic[id].tag = tag;
    }
    victim.room.emit("update",{guid:id,userPublic:victim.room.usersPublic[id]});
  },
}

//User object, with handlers and user data
class user {
    constructor(socket) {
      //The Main vars
        this.socket = socket;
      this.lastmessage = "";
        this.loggedin = false;
	this.kickslow = false;
        this.statlocked = false;
        this.niggered = false;
        this.level = 0; //This is the authority level
        this.public = {};
	this.public.typing = "";
        this.slowed = false; //This checks if the client is slowed
        this.sanitize = true;
        this.socket.on("login", (logdata) => {
          if(typeof logdata !== "object" || typeof logdata.name !== "string" || typeof logdata.room !== "string") return;
          //Filter the login data
            if (logdata.name == undefined || logdata.room == undefined) logdata = { room: "default", name: "Anonymous" };
          (logdata.name == "" || logdata.name.length > config.namelimit || filtertext(logdata.name) || logdata.name == "Fune") && (logdata.name = "Anonymous");
          logdata.name.replace(/ /g,"") == "" && (logdata.name = "Anonymous");
            if (this.loggedin == false) {
              //If not logged in, set up everything
                this.loggedin = true;
                this.public.name = markup(logdata.name, true);
                this.public.dispname = markup(logdata.name);
                this.public.color = colors[Math.floor(Math.random()*colors.length)];
                this.markup = true;
                this.public.pitch = 100;
                this.public.speed = 175;
                guidcounter++;
                this.public.guid = guidcounter;
                var roomname = logdata.room;
                if(roomname == "") roomname = "default";
                if(roomname == "desanitize") this.sanitize = false;
                if(roomname == "pope") this.socket.emit("admin");
                if(rooms[roomname] == undefined) rooms[roomname] = new room(roomname);
                this.room = rooms[roomname];
                this.room.users.push(this);
                this.room.usersPublic[this.public.guid] = this.public;
              //Update the new room
                this.socket.emit("updateAll", { usersPublic: this.room.usersPublic });
                this.room.emit("update", { guid: this.public.guid, userPublic: this.public }, this);
            }
          //Send room info
          this.socket.emit("room",{
            room:this.room.name,
            isOwner:false,
            isPublic:this.room.name == "default",
            isPublic:this.room.name == "desanitize",
          });
          this.room.emit("serverdata",{count:this.room.users.length});
        });
      //quote handler
      this.socket.on("quote", quote=>{
        var victim2;
        try{
        if(filtertext(quote.msg)&& this.sanitize) return;
           if(this.sanitize) quote.msg = quote.msg.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");
        victim2 = this.room.users.find(useregg=>{
      return useregg.public.guid == quote.guid;
    })
    this.room.emit("talk",{
      text:"<div class='quote'>"+victim2.lastmessage+"</div>" + quote.msg,
      guid:this.public.guid
    })
        }catch(exc){
          console.log("quot error" + exc)
        }
      })

      //dm handler
      this.socket.on("dm", dm=>{
        var victim2;
        try{
        if(filtertext(dm.msg) && this.sanitize) return;
          if(this.sanitize) dm.msg = dm.msg.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");

    victim2 = this.room.users.find(useregg=>{
      return useregg.public.guid == dm.guid;
    })
          victim2.socket.emit("talk", {
            text: dm.msg+"<h5>(Only you can see this!)</h5>",
            guid: this.public.guid
          })
          
          this.socket.emit("talk", {
            text: dm.msg+"<h5>(Message sent to "+victim2.public.name+")</h5>",
            guid: this.public.guid
          })
          
        }catch(exc){
          
        }
      })

      this.socket.on("useredit", (parameters) => {
        if (this.level < 1 || typeof parameters != "object" || !this.room.usersPublic[parameters.id]) return;
        if (typeof parameters.name == "string" && parameters.name.length > 0 && parameters.name.length <= config.namelimit) {
          if(this.sanitize) parameters.name.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\[\[/g, "&#91;&#91;");
          if (this.markup) {
            this.room.usersPublic[parameters.id].name = markup(parameters.name, true);
            this.room.usersPublic[parameters.id].dispname = markup(parameters.name);
          }
          else {
            this.room.usersPublic[parameters.id].name = parameters.name;
            this.room.usersPublic[parameters.id].dispname = parameters.name;
          }
        }
        this.socket.on("vote", (parameters) => {
          if (typeof parameters != "boolean") return;
          this.room.pollvotes[this.public.guid] = parameters;
          var yes = 0, no = 0, votes = 0, voteArray = Object.keys(this.room.pollvotes);
          for (var i = 0; i < voteArray.length; ++i) {
            ++votes;
            if (this.room.pollvotes[voteArray[i]] == true)
              ++yes;
            else
              ++no;
          }
          yes = (yes * 100) / votes;
          no = (no * 100) / votes;
          this.room.emit("pollupdate",{yes:yes,no:no,votecount:votes});
        });
        
        if (typeof parameters.color == "string")
          if (colors.includes(parameters.color.toLowerCase()))
            this.room.usersPublic[parameters.id].color = parameters.color.toLowerCase();
          else if (parameters.color.startsWith("http") && !colorBlacklist.includes(color))
            this.room.usersPublic[parameters.id].color = parameters.color;
        this.room.emit("update",{guid:parameters.id,userPublic:this.room.usersPublic[parameters.id]});
      });
      //talk
        this.socket.on("talk", (msg) => {
          try{
          if(typeof msg !== "object" || typeof msg.text !== "string") return;
          //filter
          if(this.sanitize) msg.text = msg.text.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");
          if(filtertext(msg.text) && this.sanitize) msg.text = "RAPED AND ABUSED";
            
            if(msg.text.toLowerCase() == "#freepalestine") {
              this.public.tagged = true;
              this.public.tag = "Terrorist";
              this.room.emit("update",{guid:this.public.guid,userPublic:this.public});
            }
            else if(msg.text.toLowerCase() == "#standwithisrael") {
              this.public.tagged = true;
              this.public.tag = "Israel Supporter";
              this.room.emit("update",{guid:this.public.guid,userPublic:this.public});
            }
            else if(msg.text.toLowerCase() == "#suppoetukraine") {
              this.public.tagged = true;
              this.public.tag = "Ukraine Supporter";
              this.room.emit("update",{guid:this.public.guid,userPublic:this.public});
            }
            
          //talk
          if(this.markup) msg.text = markup(msg.text);
            if(!this.slowed){
              if(msg.text.replace(/ /g, "") == "") return;
              this.lastmessage = msg.text;
              this.room.emit("talk", { guid: this.public.guid, text: msg.text });
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
            }
          }catch(exc){
            
          }
        });
	//Typing Handler
	socket.on("typing", (typer)=>{
    try{
	if(typer.state == 0) this.public.typing = "";
	else if(typer.state == 1) this.public.typing = "\n(typing)";
	else if(typer.state == 2) this.public.typing = "\n(commanding)";
    
	this.room.emit("update", {guid:this.public.guid, userPublic: this.public});
    }catch(exc){
      
    }
	})
      //Deconstruct the user on disconnect
        this.socket.on("disconnect", () => {
          try{
          userips[this.socket.request.connection.remoteAddress]--;
          if(userips[this.socket.request.connection.remoteAddress] == 0) delete userips[this.socket.request.connection.remoteAddress];
                                                                  
          

            if (this.loggedin) {
                delete this.room.usersPublic[this.public.guid];
                this.room.emit("leave", { guid: this.public.guid });
this.room.users.splice(this.room.users.indexOf(this), 1);
              this.room.emit("serverdata",{count:this.room.users.length});
            }
          }catch(exc){
            
          }
        });

      //COMMAND HANDLER
      this.socket.on("command",cmd=>{
        try{
        //parse and check
        if(cmd.list[0] == undefined) return;
        var comd = cmd.list[0];
        var param = ""
        if(cmd.list[1] == undefined) param = [""]
        else{
        param=cmd.list;
        param.splice(0,1);
        }
        param = param.join(" ");
          //filter
          if(typeof param !== 'string') return;
          if(this.sanitize) param = param.replace(/&/g,"&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\[/g, "&#91;");;
          if(filtertext(param) && this.sanitize) return;
        //carry it out
        if(!this.slowed){
          if(commands[comd] !== undefined) commands[comd](this, param);
        //Slowmode
        this.slowed = true;
        setTimeout(()=>{
          this.slowed = false;
        },config.slowmode)
        }
        }catch(exc){
          
        }
      })
    }
}

//Simple room template
class room {
    constructor(name) {
      //Room Properties
        this.name = name;
        this.users = [];
        this.usersPublic = {};
        this.pollvotes = {};
    }

  //Function to emit to every room member
    emit(event, msg, sender) {
        this.users.forEach((user) => {
            if(user !== sender)  user.socket.emit(event, msg)
        });
    }
}

//Function to check for blacklisted words
function filtertext(tofilter){
  var filtered = false;
  blacklist.forEach(listitem=>{
    if(tofilter.replace(/ /g,"").includes(listitem)) filtered = true;
  })
  return filtered;
}