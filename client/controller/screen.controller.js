const { app, BrowserWindow, ipcMain, dialog, screen, ipcRenderer } = require('electron')
const { v4: uuidv4 } = require('uuid');
const screenshot = require('screenshot-desktop');
// const { dialog } = require("electron").remote
const fs = require("fs");
const path = require("path")
var robot = require("robotjs");
const sizeOf = require("buffer-image-size")
var ID = require("nodejs-unique-numeric-id-generator")
const rootPath = require("electron-root-path").rootPath
const os = require("os")
let platform = os.platform()
let uname = os.userInfo().username

//remote id file path for windows
let fpath = `C:\\Users\\${uname}\\AppData\\Local\\Creds.txt`

//remote id file path for mac
if (platform == "darwin") {
    fpath = path.join(rootPath, "Creds.txt")
    // fpath = `${uname}\\Library\\Application Support\\Creds.txt`
}

//initialization
let connectionWin = ""
let screenWin = ""
let to;
let from;
var interval;
let Creds = ""
let myPass = ""
let status;
let accept = 0;
let remote = 0;
let roomID = ""

//connecting to nodejs socket server 
var socket = require('socket.io-client')(process.env.SOCKET_IP);

let boundHeight = screen.getPrimaryDisplay().bounds.height
let boundWidth = screen.getPrimaryDisplay().bounds.width
let { width, height } = screen.getPrimaryDisplay().workAreaSize

try {

    socket.on("connect", _ => {
        if (roomID !== "") {
            socket.emit("join-message", roomID)
        }
    })


    //save the room
    ipcMain.on("save-roomId", (e, arg) => {
        roomID = arg
    })

    //as we the app opens send the uuid
    ipcMain.on("get-uuid", (e, arg) => {

        arg = JSON.parse(arg)
        myPass = arg.password
        // var uuid = uuidv4();//"test";//
        let d = new Date()
        var uuid = `${ID.generate(new Date().toJSON())}-${d.getMilliseconds()}`;
        roomID = uuid
        socket.emit("join-message", uuid);
        e.reply("uuid", uuid);
    })

    //to join the room
    ipcMain.on("join-room", (e, arg) => {
        arg = JSON.parse(arg)
        myPass = arg.password
        socket.emit("join-message", arg.id);
    })


    //show the password dialog
    ipcMain.on("trigger-password", (e, arg) => {

        let modalWin = new BrowserWindow({
            width: 500,
            height: 300
        })
        dialog.showMessageBox(modalWin)
    })


    //check the password and proceed
    socket.on("check-pass", (data) => {
        data = JSON.parse(data)

        //if not connect to the remote
        if (accept == 0 && remote == 0) {
            if (data.password == myPass) {
                Creds = data
                accept = 1
                status = true
                socket.emit("proceed-sharing", JSON.stringify(data))
            } else {
                console.log("invalid password");
            }
        }
        //already connected with other user 
        else {
            socket.emit("busy", JSON.stringify(Creds))

        }

    })

    //when you get connection window request
    socket.on("connection-window", (data) => {
        Creds = JSON.parse(data);

        //if not busy with other connection
        if (accept == 0 && remote == 0) {

            connectionWin = new BrowserWindow({
                width: 500,
                height: 200,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                },
                alwaysOnTop: true,
                resizable: false

            })

            //load the accept/reject file 
            connectionWin.loadFile("connection.html")
            connectionWin.removeMenu();


        }
        //busy with other connection 
        else {

            socket.emit("busy", JSON.stringify(Creds))
        }

    })




    //if the password is correct then proceed screen sharing
    ipcMain.on("check-pass", (e, arg) => {
        arg = JSON.parse(arg)
        if (Creds.password == arg.pass) {
            remote = 1
            status = true
            //proceed screen sharing
            socket.emit("proceed-sharing", JSON.stringify(Creds))
        } else {
            // e.reply("wrong-pass", {})
            dialog.showMessageBox({
                title: "Warning",
                message: `Wrong Password`,
                type: "warning"
            }).then(res => {
                console.log(res)
            })
        }
    })

    

    //ask to connect to the remote window
    ipcMain.on("request-to-connect", (e, arg) => {

        //holds the orginal screen id and id of connecting screen
        Creds = JSON.parse(arg)
        // remote = 1
        if (Creds.password) {
            //check the password is same or not
            socket.emit("check-pass", arg)
            // socket.emit("proceed-sharing", JSON.stringify(Creds))

        } else {

            //send request for poping window to accept or reject
            socket.emit("connection-request", JSON.stringify(Creds))

        }
    })

    //as the id get accepted
    //the user accept the request
    ipcMain.on("accept-the-request", (e, arg) => {

        //request accepted so mark the accept flag 1
        accept = 1

        //send socket to server that request is accepted so it could broadcast to original screen
        socket.emit("proceed-sharing", JSON.stringify(Creds))
        ipcMain.on("listen-to-status", (e, arg) => {
            e.reply("status", true)
        })
        connectionWin.minimize();
    })


    //if the remote is already taken then send busy notification
    socket.on("busy", data => {
        dialog.showMessageBox({
            title: "Warning",
            message: `You cant take its access ,remote computer is already engaged in other connection!`,
            type: "warning"
        }).then(res => {
            console.log(res)
        })
    })

    //if no remote id exist then send notification
    socket.on("no-id", (arg) => {
        dialog.showMessageBox({
            title: "Error",
            message: `No such remote ID exist!`,
            type: "error"
        }).then(res => {
            console.log(res)
        })
    })




    //listen to the saving id

    socket.on("remote-id", d => {
        let idd = d
        fs.readFile(fpath, 'utf8', (err, data) => {
            if (err) {

                if (err.code === 'ENOENT') {

                    fs.writeFile(fpath, `${idd}`, (er) => {
                        if (er) {
                            socket.emit("errors", JSON.stringify(er))
                        } else {
                            socket.emit("errors", JSON.stringify({ "write": data }))

                        }
                    })

                } else {

                    writeID(data, idd)

                }

            } else {
                writeID(data, idd)
            }

        })

        //write id on specified path
        function writeID(data, idd) {

            let arr = data.split(",")
            if (arr.length > 0 && arr.length < 7) {
                if (!arr.includes(idd)) {
                    if (arr[0] == "") {
                        arr.length = 0
                    }
                    arr.push(`${idd}`)
                    let res = arr.join(",")
                    fs.writeFile(fpath, `${res}`, (err) => {
                        if (err) {
                            dialog.showMessageBox({
                                title: "Remote",

                                message: `${err}`,
                                type: "info"
                            }).then(res => {
                                console.log(res)
                            })
                        }
                    })
                }

            }
        }

    })
    //take screen shots and send the data to original screen
    socket.on("ready-for-data", data => {
      

        data = JSON.parse(data)
        data.status = true
        status = true
        interval = setInterval(function () {
            screenshot().then((img) => {

                let dimension = sizeOf(img)

                var imgStr = new Buffer.from(img).toString('base64');

                var obj = {};

                obj.room = data.myID;
                obj.image = imgStr;
                obj.dimension = dimension
                socket.emit("screen-data", JSON.stringify(obj));
            })
        }, 500)
    })

    //as the request get acceppted by remote screen tell the original screen to start sending image packets
    socket.on("proceed-sharing", data => {
        if (accept == 0 && remote == 0) {
            screenWin = new BrowserWindow({
                width: 1920,
                height: 1080,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            })

            //load the the original screen
            screenWin.loadFile("screen.html")
            screenWin.removeMenu();


            //if the shared screen closes
            screenWin.on("close", () => {
                socket.emit("screen", {})

                socket.emit("end-communication", JSON.stringify({ direct: true }))
                endCommunication()
                // socket.emit("join-message",roomID)

                //send notification to other screen
                socket.emit("session-end-notification", Creds.remoteID)

                //show message on same screen
                dialog.showMessageBox({
                    title: "Message",
                    message: `Session Ended Successfully!`,
                    type: "info"
                }).then(res => {
                    console.log(res)
                })
            })

            remote = 1; // remote is busy for others
            status = JSON.parse(data).status
            socket.emit("ready-for-data", JSON.stringify(Creds))

        } else {
            dialog.showMessageBox({
                title: "Error",
                message: `${accept} ${remote}`,
                type: "info"
            }).then(res => {
                console.log(res)
            })
        }

    })

    //listening to the screen packets
    ipcMain.on("screen-packets", (e, arg) => {
        socket.on('connected-screen-data', data => {
            if (data.imgStr) {
                e.reply("screen-packets-reply", data)
            } else {

            }
        })
    })

    //send the event to server for keytap so server could redirect to original screen
    ipcMain.on("type", (e, arg) => {
        arg = JSON.parse(arg)
        arg.room = Creds.remoteID
        socket.emit("type", JSON.stringify(arg))
    })

    //listen to server and press the key
    socket.on("type", function (data) {
        var obj = JSON.parse(data);
        let key = obj.key;
        // console.log(key.slice(5).toLowerCase())
        // console.log(key.includes("Arrow"))
        if (key.includes("Arrow")) {
            key = key.slice(5).toLowerCase()

        }

        console.log(key)
        try {
            if (obj.modifier && obj.modifier.length > 0) {
                robot.keyTap(key, obj.modifier);

            } else {
                robot.keyTap(key.toLowerCase());
                // robot.keyTap("command");

            }
        } catch (err) {
            dialog.showMessageBox({
                title: "Error",
                message: `${err}`,
                type: "info"
            }).then(res => {
                console.log(res)
            })
        }


    })

    //remote screen will send the server event to emit click event to original screen
    ipcMain.on("mouse-click", (e, arg) => {
        socket.emit("mouse-click", { remoteID: Creds.remoteID, direction: arg.direction, double: arg.double })
    })

    //click the original screen
    socket.on("mouse-click", function (data) {
        let direction = "left"
        switch (data.direction) {
            case 1:
                direction = "left"
                break;
            case 2:
                direction = "middle"
                break;
            case 3:
                direction = "right"
                break;
            default:
                break;
        }

        robot.mouseClick(direction, data.double);
    })


    //tell server mouse is moving on remote screen
    ipcMain.on("mouse-move", (e, arg) => {
        let data = JSON.parse(arg)
        data.room = Creds.remoteID
        socket.emit("mouse-move", JSON.stringify(data))
    })

    //move the mouse on original screen
    socket.on("mouse-move", function (data) {
        var obj = JSON.parse(data);
        let x = obj.x;
        let y = obj.y;
        // let currentDimension = robot.getMousePos()
        const { remoteDimension } = obj
        let { width, height } = screen.getPrimaryDisplay().workAreaSize
        // let c = height
        let c = boundHeight
        let d = boundWidth
        let a = remoteDimension.height
        let b = remoteDimension.width
        let m = 0
        let n = 0

        let cur = screen.getCursorScreenPoint()


        // console.log(x,y,"after calculations")
        let X = (x * width) / remoteDimension.width
        let Y = (y * height) / remoteDimension.height
        n = (y * c) / a
        m = (x * d) / b
        let diffX = Math.abs(cur.x - m)
        let diffY = Math.abs(cur.y - n)
        robot.moveMouse(m, n);


    })


    //when the original user scroll on shared screen : not it use
    ipcMain.on("scroll", (e, arg) => {
        arg = JSON.parse(arg)
        socket.emit("scroll", JSON.stringify({
            ...arg,
            ...Creds
        }))
    })

    //not in use
    socket.on("scroll", (data) => {
        data = JSON.parse(data)
        // setTimeout(()=>{
        //     robot.scrollMouse(data.x, data.y);
        // },2000)
        robot.scrollMouse(data.x, data.y);

        socket.emit("check", JSON.stringify(data))

    })
    ipcMain.on("stop-share", function (event, arg) {

        clearInterval(interval);
    })


    //as we click on share file pop up a window to select the  file
    ipcMain.on("file-share-dialog", (e, arg) => {
        if (status) {
            if (Creds) {
                arg = JSON.parse(arg)
                if (arg.requester == Creds.remoteID) {
                    to = Creds.myID
                    from = Creds.remoteID
                } else {
                    to = Creds.remoteID
                    from = Creds.myID
                }
                dialog.showOpenDialog({
                    buttonLabel: "transfer",
                    properties: ["openFile", "multiSelections"]
                }).then(result => {
                    console.log(result)
                    if (!result.canceled) {
                        result.filePaths.forEach(filepath => {
                            // let name = path.extname(filepath)
                            socket.emit("file-transfer-request", JSON.stringify({ to, from, filepath }))
                        })

                    }
                })
            } else {
                e.reply("cant-share", {})
            }
        } else {
            dialog.showMessageBox({
                title: "File Transfer Request",
                buttons: ["Cancel"],
                cancelId: 1,
                message: `Kindly connect with remote computer for file sharing.`,
                type: "warning"
            }).then((res) => {
                if (res.response == 0) {
                    // data.myID = Creds.myID
                    // socket.emit("confirm-transfer", JSON.stringify(data))
                }
            })

        }


    })


    //file transfer request to the remote screen
    socket.on("file-transfer-request", data => {
        data = JSON.parse(data)
        to = data.to
        from = data.from
        let filename = data.filepath.slice(data.filepath.lastIndexOf('\\') + 1);
        if (platform == "darwin") {
            filename = data.filepath.slice(data.filepath.lastIndexOf('/') + 1);
        }
        // let BoxWin = new BrowserWindow({
        //     width: '800',
        //     height: "300"
        // })
        dialog.showMessageBox({
            title: "File Transfer Request",
            buttons: ["Confirm", "Cancel"],
            cancelId: 1,
            message: `${filename} Do you want this file?`,
            type: "question"
        }).then((res) => {
            if (res.response == 0) {
                // data.myID = Creds.myID
                socket.emit("confirm-transfer", JSON.stringify(data))
            }
        })
    })

    //as the transfer is confirmed start reading the file data and send to server
    socket.on("confirm-transfer", data => {
        let parseddata = JSON.parse(data)
        fs.readFile(parseddata.filepath, (err, data) => {
            if (err)
                return console.log(err)
            // console.log(data)

            //send data to server
            socket.emit("file-data", JSON.stringify({
                fileData: data,
                to: parseddata.to,
                from: parseddata.from,
                filepath: parseddata.filepath
            }))
        })
    })

    //this will take the path where to save file 
    socket.on("file-transfer", data => {
        data = JSON.parse(data)
        let filename = data.filepath.slice(data.filepath.lastIndexOf('\\') + 1);

        if (platform == "darwin") {
            filename = data.filepath.slice(data.filepath.lastIndexOf('/') + 1);
        }
        dialog.showSaveDialog({
            defaultPath: `${filename}`
        }).then((res) => {
            if (!res.canceled) {
                let buff = Buffer.from(data.fileData.data)
                fs.writeFile(res.filePath, buff, (err) => {
                    if (err) {
                        dialog.showMessageBox({
                            title: "File Transfered",


                            message: `${err}`,
                            type: "info"
                        }).then(res => {
                            console.log(res)
                        })
                    } else {
                        dialog.showMessageBox({
                            title: "File Transfered",


                            message: `File Saved Successfully!`,
                            type: "info"
                        }).then(res => {
                            console.log(res)
                        })
                    }
                    // return alert(err)


                })
            }
        })
    })

    //if the session end send the notification
    socket.on("session-end-notification", data => {
        dialog.showMessageBox({
            title: "Message",
            message: `Session Ended Successfully!`,
            type: "info"
        }).then(res => {
            console.log(res)
        })
    })

    //on ipc ends
    ipcMain.on("end-communication", (e, data) => {
        let a = data
        if (typeof Creds !== "string" && a.reject && accept == 1) {
            status = false
            socket.emit("end-communication", JSON.stringify(Creds))
            connectionWin.close()
            connectionWin = ""
            accept = 0;
            remote = 0
        } else if (typeof Creds !== "string" && a.reject && accept == 0) {
            socket.emit("reject-request", JSON.stringify(Creds))
            status = false
            connectionWin.close()
            connectionWin = ""
            accept = 0;
            remote = 0

        }
    })




    //rejecting the request from remote 
    socket.on("reject-request", data => {
        dialog.showMessageBox({
            title: "Message",
            message: `Remote computer rejects your request!`,
            type: "warning"
        }).then(res => {
            console.log(res)
        })
    })


    
//reset all flags
const endCommunication = () => {
    socket.emit("join-message", roomID)
    screenWin = ""
    status = false
    clearInterval(interval)
    remote = 0
    accept = 0
}
socket.on("connection-lost", data => {
    screenWin.close()
})

socket.on("disconnect", _ => {

})
ipcMain.on("uuid", (event, arg) => {
    // console.log(arg)
    // console.log(Creds)
    event.reply("uuid", Creds.myID)

})

//check is the remote busy or not
ipcMain.once("check-remote-status", (e, arg) => {
    socket.emit("check-remote-status", JSON.stringify(arg))
    socket.on("remote-status", data => {
        e.reply("remote-status-array", data)
    })

})
//when the connection drops
socket.on("end-communication", async data => {
    if (typeof screenWin !== "string" && remote == 1) {
        // screenWin.close()
        await screenWin.close()
        endCommunication()
    }
    else {
        endCommunication()

    }
})


} catch (err) {
    dialog.showMessageBox({
        title: "Error",


        message: `${err}`,
        type: "error"
    }).then(res => {
        console.log(res)
    })
}

