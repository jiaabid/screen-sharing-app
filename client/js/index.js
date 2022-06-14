// const prompt = require('electron-prompt');
const ipcRenderer = require('electron').ipcRenderer;
const electron = require("electron")
const { dialog } = electron.remote
// const remote = electron.remote
// console.log(remote,BrowserWindow,ipcRenderer)
// const dialog = remote.require("dialog")
let id = ""
let myID = document.getElementById("myID");
let remoteID = document.getElementById("yourID")
let connectBtn = document.getElementById("connect")
const setPass = document.getElementById("setPass")
let obj = {}
let remoteConn = []
const fs = require("fs")
const os = require("os")
const rootPath = require("electron-root-path").rootPath
const path = require("path")
let uname = os.userInfo().username
let platform = os.platform()


//remote id file path for windows
let fpath = `C:\\Users\\${uname}\\AppData\\Local\\Creds.txt`
//remote id file path for mac
if (platform == "darwin") {
    fpath = path.join(rootPath, "Creds.txt")

    // fpath = `${uname}\\Library\\Application Support\\Creds.txt`
}
// onlineFlag = true
// //if it gets offline
// if (!window.navigator.onLine) {
//     onlineFlag = false
//     window.location.reload()
// } else if (window.navigator.onLine) {
//     onlineFlag = true
// }


// function connectMe (){
    
// }
// if (onlineFlag) {
    window.onload = function () {


        // window.addEventListener("mousedown",e=>{
        //     console.log("right")
        //     console.log(e)
        // })

        // window.addEventListener("dblclick",e=>{
        //     // console.log("left")
        //     console.log(e)
        // })
        //to fetch the uuid for yourself
        let pass = localStorage.getItem("password")
        // console.log(pass)
        if (pass) {
            obj.password = typeof pass !== "string" ? "" : pass
        }
        if (localStorage.getItem("id")) {
            myID.value = localStorage.getItem("id");
            console.log("hello connecting")
            ipcRenderer.send("save-roomId", myID.value)
            connect(myID.value, pass)

        } else {
            ipcRenderer.send("get-uuid", JSON.stringify(obj))
        }

        createCards()
        //on getting uuid put it in input
        ipcRenderer.on("uuid", (event, data) => {
            myID.value = data
            localStorage.setItem("id", data)
            // document.getElementById("code").innerHTML = data;
        })

        ipcRenderer.on("cant-share", (e, arg) => {
            alert("You cant share the file!")
        })


        //connect with remote screen on clicking thw connect button
        connectBtn.addEventListener("click", e => {
            e.preventDefault()

            let valid = validator("remoteID", remoteID.value)
            // document.getElementById("error").innerHTML = `${valid.msg}`
            if (valid.res) {
                document.getElementById("error").style.display = "inline"
                // document.getElementById("error").innerHTML = `${valid.msg}`

                bindValues(remoteID.value, myID.value)

            } else {
                // document.getElementById("error").style.display = "block"
                // document.getElementById("error").innerHTML = `${valid.msg}`
                // alert(valid.msg)
                dialog.showMessageBox({
                    title: "warning",


                    message: `${valid.msg}`,
                    type: "warning"
                }).then(res => {
                    console.log(res)
                })
            }



        })


        //when the password of remote screen is entered , if you know then connected directly otherwise send a acception screen
        ipcRenderer.on("password-given", (e, arg) => {
            console.log(arg)
            if (arg.r === "cancel") {
                ipcRenderer.send("request-to-connect", JSON.stringify(obj))
            } else if (arg.r !== null) {
                obj.password = arg.r
                ipcRenderer.send("request-to-connect", JSON.stringify(obj))
            }
        })



        //ask to share file to main process on pressing the share file button
        document.getElementById("shareFile").addEventListener("click", e => {
            e.preventDefault()
            // if (localStorage.getItem("status")) {
            ipcRenderer.send("file-share-dialog", JSON.stringify({ requester: myID.value }))
            // } else {
            // alert("Not connected to share files")
            // }
        })


        //send request to open the dialog of taking password
        setPass.addEventListener("click", e => {
            e.preventDefault()
            // let pass = document.getElementById("pass").value
            // localStorage.setItem("password", pass)
            ipcRenderer.send("setPassword", {})

            // ipcRenderer.send("trigger-password",{})
        })

        //recive the password and save it in localstorage
        ipcRenderer.on("password-to-set", (e, arg) => {
            console.log(arg)
            if (arg.r !== null) {
                localStorage.setItem("password", arg.r)
                connect(myID.value, arg.r)
            }
        })




    }
// } else {
//     dialog.showMessageBox({
//         title: "warning",


//         message: `No internet connection!`,
//         type: "warning"
//     }).then(res => {
//         console.log(res)
//     })
// }


//copy the id by clicking on icon
const copyIt = () => {
    myID.select()
    document.execCommand("copy");
}

//making up the object
const bindValues = (remote, my) => {
    console.log(remote, my)
    obj = { remoteID: remote, myID: my }
    ipcRenderer.send("ask-for-pass", {})

}

//connect to own room
const connect = (ID, pass) => {
    // alert(id)
    console.log(id)
    let payload = {}
    if (pass !== null) {
        if (pass.length > 0) {
            payload.password = pass
        }
    }

    if (ID.trim().length > 0) {
        payload.id = ID
    }
    ipcRenderer.send("join-room", JSON.stringify(payload))
}


//send request to file share
const shareFile = () => {
    if (id.trim().length < 1) {
        return alert("start sharing first")
    }
    ipcRenderer.send("file-share-dialog", { id })
}



//read the ids from file and make cards 
const createCards = () => {

    fs.open(fpath, 'r', (err, fd) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log('myfile does not exist');
                switcher(true)
            }
            // throw err;
        } else {
            console.log(fd, "file data")
            fs.readFile(fpath, 'utf8', (err, data) => {
                if (err) {
                    console.log(err)

                } else {
                    console.log(data)
                    let arr = data.split(",")
                    if (arr.length > 0 && arr[0] !== "") {
                        console.log(arr)
                        switcher(false)
                        ipcRenderer.send("check-remote-status", JSON.stringify({ remoteArray: arr }))
                        ipcRenderer.on("remote-status-array", (e, arg) => {
                            console.log(arg)
                            document.getElementById("up-cards").innerHTML = ""
                            console.log(typeof arg)
                            arg = JSON.parse(arg)
                            Object.keys(arg).forEach((item, i) => {
                                document.getElementById("up-cards").innerHTML += `<div id=${item} ondblclick="bindValues('${item}','${myID.value}')"   style="display: flex; flex-direction: column; width: 200px;height: 220px; margin:0px 30px 30px 0px; border:1px solid #321633
                                ;">
                                                            <div style="height:78%; background-color: white;">
                                    
                                                            </div>
                                                            <div style="display: flex; height:22%; background-color: #321633; padding: 10px 2px 0 5px; align-content: space-around;">
                                                                <div>
                                                                    <i class="fas fa-square-full ${arg[item] ? 'iconactive' : 'iconinactive'}" style="size: 2px;font-size:10px; }"></i>
                                    
                                                                </div>
                                                                <div style="margin-left: 10px; " class="text-color">
                                                                    <h6 style="top:0;line-height:90%;margin:0;">Remote ${i + 1}</h6>
                                                                    <small style="text-overflow:ellipsis;">id-${item.slice(0, 15)}...</small>
                                                                </div>
                                                                <div style="margin-left: 35px; margin-top: 5px; color:white">
                                                                
                                                                <a class = "dropdown-trigger "  data-target='dropdown${i}' href="#">  <i class="fas fa-ellipsis-v "   ></i></a>
                
                
                
                                                                <ul id='dropdown${i}' class='dropdown-content'>
                                                                <li><a href="#!" onclick="bindValues('${item}','${myID.value}')">Connect</a></li>
                                                                <li><a href="#!" onclick="remove('${item}')">Remove</a></li>
                                                              
                                                              </ul>
                                                                                                  </div>
                                                                                                  
                                                               
                                                            </div>
                                                        </div>
                                                      `
                            })
                            var elems = document.querySelectorAll('.dropdown-trigger');
                            var instances = M.Dropdown.init(elems);
                        })


                        //     arr.forEach((el, i) => {
                        //         document.getElementById("up-cards").innerHTML += `<div id=${el} ondblclick="bindValues('${el}','${myID.value}')"   style="display: flex; flex-direction: column; width: 200px;height: 220px; margin:0px 30px 30px 0px; border:1px solid #321633
                        // ;">
                        //                             <div style="height:78%; background-color: white;">

                        //                             </div>
                        //                             <div style="display: flex; height:22%; background-color: #321633; padding: 10px 2px 0 5px; align-content: space-around;">
                        //                                 <div>
                        //                                     <i class="fas fa-square-full " style="size: 2px;font-size:10px; color:#c9344c"></i>

                        //                                 </div>
                        //                                 <div style="margin-left: 10px; " class="text-color">
                        //                                     <h6 style="top:0;line-height:90%;margin:0;">Remote ${i + 1}</h6>
                        //                                     <small style="text-overflow:ellipsis;">id-${el.slice(0, 15)}...</small>
                        //                                 </div>
                        //                                 <div style="margin-left: 35px; margin-top: 5px; color:white">

                        //                                 <a class = "dropdown-trigger "  data-target='dropdown1' href="#">  <i class="fas fa-ellipsis-v "   ></i></a>



                        //                                 <ul id='dropdown1' class='dropdown-content'>
                        //                                 <li><a href="#!" onclick="bindValues('${el}','${myID.value}')">Connect</a></li>
                        //                                 <li><a href="#!" onclick="remove('${el}')">Remove</a></li>

                        //                               </ul>
                        //                                                                   </div>


                        //                             </div>
                        //                         </div>
                        //                       `
                        //     })

                    } else {

                        switcher(true)


                    }
                }

            })
        }

    });



}


//to validate the remote id
let re = new RegExp('^[0-9+]{4,6}-[0-9+]{2,3}$');
const validator = (type, val) => {
    let res;
    switch (type) {
        case "remoteID":
            if (val.length == 0) {
                return {
                    msg: "You havent entered any id , please enter the remote id",
                    res: false
                }
            }
            else if (val.length > 0 && val.length <= 10) {
                res = re.test(val)

                return res ? {
                    msg: "",
                    res
                } : {
                    msg: "Invalid Remote Id",
                    res
                };
            } else {
                return {
                    msg: "Not a valid length of id",
                    res: false
                }
            }

    }

}

const switcher = (s) => {
    console.log(s)
    if (s) {
        document.getElementById("content").style.display = "none"
        document.getElementById("banner").style.display = "block";
        document.getElementById("right-div").style.marginLeft = '0px'

    } else {
        document.getElementById("content").style.display = "block"
        document.getElementById("banner").style.display = "none";
        document.getElementById("right-div").style.marginLeft = '20px'
    }
}

const remove = (id) => {
    console.log(id)

    fs.open(fpath, 'r', (err, fd) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log('myfile does not exist');
                switcher(true)
            }
            // throw err;
        } else {
            console.log(fd, "file data")
            fs.readFile(fpath, 'utf8', (err, data) => {
                if (err) {
                    console.log(err)

                } else {
                    console.log(data)
                    let arr = data.split(",")
                    let newArr = arr.filter(el => el !== id)
                    if (arr.length > 0) {
                        switcher(false)
                        fs.writeFile(fpath, newArr.join(","), (err) => {
                            if (err) {
                                console.log(err)
                            }
                        })
                        createCards()
                    } else {

                        switcher(true)


                    }
                }

            })
        }
    })

}

// let exist = localStorage.getItem("remotes") ? JSON.parse(localStorage.getItem("remotes")).remotes : undefined
// if (exist) {
//     if (exist.length > 0) {
//         let filtered = exist.filter(el => el !== id)
//         console.log(filtered)
//         if (filtered.length > 0) {
//             localStorage.setItem("remotes", JSON.stringify({
//                 "remotes": filtered
//             }))
//             createCards()

//         } else {
//             localStorage.setItem("remotes", JSON.stringify({
//                 "remotes": []
//             }))
//             switcher(true)
//         }
//     }

// }




const extractID = (e) => {
    console.log(e.parentElement.parentElement.parentElement.id)
    remoteID.value = e.parentElement.parentElement.parentElement.id
}

const closeDropDown = (e) => {
    console.log(e.classList)
    if (!e.classList.contains('.dropbtn')) {
        var myDropdown = document.getElementById("myDropdown");
        if (myDropdown.classList.contains('show')) {
            myDropdown.classList.remove('show');
        }
    }
}

function show() {
    console.log(document.getElementById("myDropdown").classList)
    document.getElementById("myDropdown").classList.toggle("show");
}



// ipcRenderer.send("listen-for-status", {})
    // ipcRenderer.on("status", (e, arg) => {
    //     console.log(arg)
    //     localStorage.setItem("status", arg.status)
    // })


    // ipcRenderer.send("listen-to-error", {})
    // ipcRenderer.on("connection-error", (e, arg) => {
    //     console.log(arg)
    //     alert("Unable to build connection , check the remote id")
    // }
    // )



    // ipcRenderer.send("remote-id", {})
    // ipcRenderer.on("save-id", (e, arg) => {
    //     console.log(arg, "remote id arai hai")
    //     if (localStorage.getItem("remotes")) {
    //         let existing = JSON.parse(localStorage.getItem("remotes")).remotes
    //         let duplicate = existing.find(el => el == arg)
    //         if (!duplicate && existing.length < 6) {
    //             existing.push(arg)
    //             localStorage.setItem("remotes", JSON.stringify({ 'remotes': existing }))
    //         }


    //     } else {
    //         remoteConn.push(arg)
    //         localStorage.setItem("remotes", JSON.stringify({ "remotes": arg }))
    //     }
    // })

    //open alert to view the password
    // document.getElementById("viewPass").addEventListener("click", e => {
    //     e.preventDefault()
    //     let pass = localStorage.getItem("password")
    //     pass ? alert(`Password: ${pass}`) : alert(`No password is set!`)

    // })

// function startShare() {
//     ipcRenderer.send("start-share", { id: remoteID.value });
//     document.getElementById("start").style.display = "none";
//     document.getElementById("stop").style.display = "block";
// }

// function stopShare() {
//     ipcRenderer.send("stop-share", {});
//     document.getElementById("stop").style.display = "none";
    //     document.getElementById("start").style.display = "block";
    // }
// passForm.addEventListener("submit", e => {
    //     let pass = passForm.pass.value
    //     if (pass.trim().length > 0) {
    //         obj.password = pass
    //         ipcRenderer.send("request-to-connect", JSON.stringify(obj))

    //     } else {
    //         ipcRenderer.send("request-to-connect", JSON.stringify(obj))

    //     }
    // })

      // document.addEventListener("wheel", e => {
    //     // alert("hello from scroll")
    //     console.log(typeof e.wheelDeltaX,e.wheelDeltaY)
    //     console.log(e)
    //     var obj = {
    //         x: e.wheelDeltaX,
    //         y: e.wheelDeltaY,
    //         room
    //     }
    //     // socket.emit("scroll", JSON.stringify(obj))
    // })
