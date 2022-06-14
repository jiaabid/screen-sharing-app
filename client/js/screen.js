const { ipcRenderer, ipcMain } = require("electron")
window.onload = function () {

    socket = io.connect(process.env.SOCKET_IP);
  
    let room = ""
    ipcRenderer.send("uuid", {})
    ipcRenderer.on("uuid", (e, arg) => {
        console.log(arg)
        room = arg;

        ipcRenderer.on("screen-data", (e, data) => {
            console.log(data)
            data = JSON.parse(data)
            $("img").attr("src", "data:image/png;base64," + data.imgStr);

        })

        ipcRenderer.send("screen-packets", {})
        ipcRenderer.on("screen-packets-reply", (e, arg) => {
            console.log(arg.imgStr)
            $("img").attr("src", "data:image/png;base64," + arg.imgStr);
        })
   
    })
    console.log(room)
    let imgElement = document.querySelector("img")

    //user move the mouse on screen
    document.querySelector("img").addEventListener("mousemove", e => {
        var posX = imgElement.offsetLeft
        var posY = imgElement.offsetTop;

        var x = e.pageX - posX;
        var y = e.pageY - posY;
        let remoteDimension = {
            width: window.innerWidth,
            height: window.innerHeight
            
        }
        var obj = { "x": x, "y": y, remoteDimension }
        // socket.emit("mouse-move", JSON.stringify(obj));
        ipcRenderer.send("mouse-move", JSON.stringify(obj));
    })



    //when user click on the screen
    imgElement.addEventListener("mouseup", e => {
        console.log(e.which)
        ipcRenderer.send("mouse-click", {direction:e.which , double:false})
    })
    //when user click on the screen
    imgElement.addEventListener("dblclick", e => {
        ipcRenderer.send("mouse-click", {direction:e.which , double:true})
    })

    //when any key being pressed on window
    window.addEventListener("keyup", e => {
        let modifier = []

        //for combination keys
        if (e.altKey) {
            modifier.push("alt")
        }
        if (e.shiftKey) {
            modifier.push("shift")
        } if (e.ctrlKey) {
            modifier.push("control")
        } if (e.metaKey) {
            modifier.push("meta")
        } if(e.key == "Meta"){
              e.key = "command"
        }
        var obj = { "key": e.key == "Meta" ? "command":e.key, modifier };
        ipcRenderer.send("type", JSON.stringify(obj))
    })





    document.addEventListener("wheel", e => {
        // alert("hello from scroll")
        console.log( e.wheelDeltaX,e.wheelDeltaY)
        let sign = Math.sign(e.wheelDeltaY)
        if(sign == -1){
           
           
            ipcRenderer.send("type", JSON.stringify({"key":"pagedown"}))
        }else{
            ipcRenderer.send("type", JSON.stringify({"key":"pageup"}))

        }
        // console.log(e)
        
    })

  
 }
