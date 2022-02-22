var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const sizeOf = require("buffer-image-size")
const path = require("path")
const fs = require("fs")
const cors = require("cors")
app.use(cors({ origin: true }))
// app.get('/view', (req, res) => {
//     res.sendFile(__dirname + '/display.html');
// })
let to;
let from;
io.on('connection', (socket) => {
    let roomMap = io.sockets.adapter.rooms

    const throwOthersFromRoom = (roomID) => {
        if (roomMap.has(roomID)) {
            let myRoom = roomMap.get(roomID)
            if (myRoom.size > 1) {
                myRoom.size = 0
            }
        }
    }

    const leaveOtherRooms = (socketID) => {
        if (roomMap.has(socketID)) {
            roomMap.forEach((value, key) => {
                // console.log("kk",value)
                if (value.size > 1) {
                    console.log("i m val", key, value)
                    let setVal = value
                    setVal.forEach((value, key) => {

                        // console.log("i m inside val",setVal)
                        if (value == socketID) {
                            setVal.delete(value)
                        }
                    })
                }
            })
        }
    }

    const notifyToClose = (socketID, soc) => {
        console.log("in notify to close")
        if (roomMap.has(socketID)) {
            roomMap.forEach((value, key) => {
                // console.log("kk",value)
                if (value.size > 1) {
                    console.log("i m val", key, value)
                    let setVal = value
                    if (setVal.has(socketID)) {
                        soc.broadcast.to(key).emit("closed-unexpectedly", {})
                    }

                }
            })
        }
    }

    const connectToOtherRoom = (soc, id) => {
        if (roomMap.has(id)) {
            soc.join(id)
        } else {
            soc.emit("no-id", {})
        }
    }
    const joinRoom = (soc, roomId) => {
        if (!roomMap.has(roomId)) {
            soc.join(roomId);
            soc.data.roomID = roomId
            console.log("directly join the room : " + soc.id, roomId);
        }
        //if room exist
        else {

            //leave the room
            soc.leave(roomId)

            //come out of other rooms
            leaveOtherRooms(soc.id)

            //if anybody connected to you throw them out
            throwOthersFromRoom(roomId)

            //join the room again
            soc.join(roomId)
            soc.data.roomID = roomId
            console.log("my room already exist , please wait")
        }
    }


    socket.on("check-remote-status", data => {
        // console.log(data)
        data = JSON.parse(data)
        console.log(typeof data)
        data = JSON.parse(data)
        let idObj = {}
        let ids = data.remoteArray
        console.log(ids)
        ids.forEach(el => {
            if (roomMap.has(el)) {
                idObj[el] = true
            } else {
                idObj[el] = false
            }
        })
        socket.emit("remote-status", JSON.stringify(idObj))
    })

    socket.on("join-message", (roomId) => {

        joinRoom(socket, roomId)
        //if the room doesnot exist , connect it directly

    })


    //broadcast it to the original screen
    socket.on("connection-request", data => {
        data = JSON.parse(data)

        console.log(io.sockets.adapter.rooms)


        if (roomMap.has(data.remoteID)) {

            socket.broadcast.to(data.remoteID).emit("connection-window", JSON.stringify(data))

        } else {
            console.log("in no section")
            socket.emit("no-id", "no")
        }

    })
    // 
    socket.on("check-pass", data => {
        data = JSON.parse(data);
        socket.broadcast.to(data.remoteID).emit("check-pass", JSON.stringify(data))
    })


    socket.on("busy", data => {
        data = JSON.parse(data)
        socket.broadcast.to(data.myID).emit("busy", JSON.stringify(data))

    })

    socket.on("proceed-sharing", data => {


        console.log("in proceed sharing", data)
        data = JSON.parse(data)
        // socket.join(data.myID)
        connectToOtherRoom(socket, data.myID)
        // console.log("after", io.sockets.adapter.rooms)
        console.log(roomMap)
        to = data.remoteID
        from = data.myID
        data.status = "true"
        socket.broadcast.to(data.myID).emit("remote-id", to)
        socket.broadcast.to(data.myID).emit("proceed-sharing", JSON.stringify(data))

    })


    socket.on("ready-for-data", data => {
        console.log(data)
        data = JSON.parse(data)
        data.status = true
        socket.broadcast.to(data.remoteID).emit("ready-for-data", JSON.stringify(data))
    })
    socket.on("screen-data", function (data) {
        // console.log("hello broadcasting data")
        data = JSON.parse(data);
        var room = data.room;
        var imgStr = data.image;
        // n)
        // let buff =  Buffer.from(JSON.stringify(data.buffer))
        // console.log(ybuff)
        // console.log(typeof data.buffer)
        // let dimension = sizeOf(data.buffer)

        // console.log(data.dimension)

        if (roomMap.has(room)) {
            socket.broadcast.to(room).emit('connected-screen-data', {
                imgStr,
                dimension: data.dimension
            });
        }

    })

    socket.on("mouse-move", function (data) {
        // console.log(data)
        var room = JSON.parse(data).room;
        socket.broadcast.to(room).emit("mouse-move", data);
    })

    //on the click of the mouse
    socket.on("mouse-click", function (data) {
        // var room = JSON.parse(data).room;
        // socket.broadcast.to(room).emit("mouse-click", data);
        socket.broadcast.to(data.remoteID).emit("mouse-click", data);
    })

    //on the tap of any key
    socket.on("type", function (data) {
        var room = JSON.parse(data).room;
        socket.broadcast.to(room).emit("type", data);
    })
    //on the tap of down keys
    socket.on("down", function (data) {
        var room = JSON.parse(data).room;
        socket.broadcast.to(room).emit("down", data);
    })

    //n scroll
    socket.on("scroll", data => {
        data = JSON.parse(data)
        console.log(data, "in server scroll")
        socket.broadcast.to(data.remoteID).emit("scroll", JSON.stringify(data))
    })

    socket.on("check", (data) => {
        data = JSON.parse(data)
        console.log(data.x, data.y)
        console.log(typeof data.x, typeof data.y)
    })
    //on recieving file
    socket.on("file-data", data => {
        console.log("transfering data")
        let parsedData = JSON.parse(data)
        // console.log(parsedData)
        console.log(typeof parsedData.fileData)
        console.log("to", parsedData.to)
        console.log("from", parsedData.from)
        // let buff = Buffer.from(parsedData.fileData.data)
        // fs.writeFile("hello.css",buff,(err)=>{
        //     if(err)
        //     console.log(err)
        // })
        socket.broadcast.to(parsedData.to).emit("file-transfer", data)

    })



    socket.on("file-transfer-request", data => {
        let p = JSON.parse(data)
        // console.log(p.filepath)
        // console.log(path.extname(p.filepath))
        // console.log("file-transfer-request",JSON.parse(data).room)
        socket.broadcast.to(p.to).emit("file-transfer-request", data)
    })

    socket.on("confirm-transfer", (data) => {
        console.log("in confirm request")
        data = JSON.parse(data)
        socket.broadcast.to(data.from).emit("confirm-transfer", JSON.stringify(data))
    })

    //the remote will send event to original screen to end communication
    socket.on("end-communication", (data) => {
        data = JSON.parse(data)
        console.log(data)
        socket.broadcast.to(from).emit("end-communication", JSON.stringify(data))
        socket.broadcast.to(to).emit("end-communication", JSON.stringify(data))
        if (data.direct) {
            socket.leave(to)
        } else {
            socket.leave(from)
        }

        // socket.broadcast.to(to).emit("hey", to)
        // leaveOtherRooms(socket.id)
        console.log(to, "to")
        console.log(from, "from")
        // io.sockets.adapter.rooms.delete(from)
        //      io.sockets.adapter.rooms.delete(to)

    })

    socket.on("disconnect", async () => {
        console.log("i m disconnecting..")
        inOtherRoom(socket.id)
        // io.to(socket.data.roomID).emit("connection-lost",{})
        //tell others to close the screen
        // socket.broadcast.to(socket.id).emit("close-other-window", {})
        // notifyToClose(socket.id,socket)
        //leave other rooms
        // leaveOtherRooms(socket.id)
        console.log(roomMap)
        //delete my room
        let myRoomId = socket.data.roomID
        roomMap.delete(myRoomId)
        console.log("in disconnect", roomMap)


    })
    function inOtherRoom(socketID) {
        if (roomMap.has(socketID)) {
            roomMap.forEach((value, key) => {
                // console.log("kk",value)
                if (value.size > 1) {
                    console.log("i m val", key, value)
                    let setVal = value
                    setVal.forEach((value, key) => {

                        // console.log("i m inside val",setVal)
                        if (value == socketID) {
                            io.to(key).emit("connection-lost", {})
                        }
                    })
                }
            })
        }
    }
    socket.on("bye", data => {
        console.log("in bye", data)
    })


    socket.on("errors", data => {
        console.log(data)
    })


    socket.on("screen", (data) => console.log("screen close event"))
    // socket.on("channel:awesome-event",(data)=>{
    //     socket.emit("reply","hello")
    // })


    socket.on("reject-request", (data) => {
        let parsed = JSON.parse(data)
        socket.broadcast.to(parsed.myID).emit("reject-request", {})
    })
    socket.on("session-end-notification", id => {
        socket.broadcast.to(id).emit("session-end-notification", {})
    })


})

var server_port = process.env.YOUR_PORT || process.env.PORT || 5000;
http.listen(server_port, () => {
    console.log("Started on : " + server_port);
})