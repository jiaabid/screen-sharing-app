const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron')
const { v4: uuidv4 } = require('uuid');
const screenshot = require('screenshot-desktop');
const prompt = require("electron-prompt")
const fs = require("fs")
const sizeOf = require("buffer-image-size")
// var socket = require('socket.io-client')('http://45.79.28.137:3000');
//digital ocean
var socket = require('socket.io-client')('http://139.59.168.162:80');

//localhost
// var socket = require('socket.io-client')('http://192.168.18.16:5000');

var interval;


function createWindow() {
    // console.log(screen.getPrimaryDisplay())
    let { workArea ,scaleFactor } = screen.getPrimaryDisplay()
    let boundHeight = screen.getPrimaryDisplay().bounds.height
    let boundWidth = screen.getPrimaryDisplay().bounds.width
    let { width, height } = screen.getPrimaryDisplay().workAreaSize
console.log(scaleFactor)

    const win = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    })
   
    win.removeMenu();
    win.loadFile('index.html')
    // win.webContents.openDevTools()
    // require("./controller/ui.controller")

    win.on("close", () => {
        socket.emit("end-communication", JSON.stringify({ hello: "fhwhfwu" }))
        app.quit()
    })
    //popup the prompt to set the password
    ipcMain.on("setPassword", (e, arg) => {
        console.log(arg)
        prompt({
            title: 'Set password',
            label: 'Password:',
            value: 'example123',
            inputAttrs: {
                type: 'text'
            },
            type: 'input',
            height: 200
        })
            .then((r) => {
                e.reply("password-to-set", { r })
            })
            .catch(console.error);
    })

    //prompt to ask for password if they already know it 
    ipcMain.on("ask-for-pass", (e, arg) => {
        prompt({
            title: 'Remote Access Password',
            label: 'Do You Know The Password?',
            value: 'example123',
            inputAttrs: {
                type: 'text'
            },
            type: 'input',
            height: 200,
            buttonLabels: {
                ok: "I know",
                cancel: "Dont know"
            }
        })
            .then((r) => {
                // let res;

                e.reply("password-given", { r })
            })
            .catch(console.error);
    })

    
    require("./controller/screen.controller")



}
app.commandLine.appendSwitch('force-device-scale-factor', 1)
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        socket.emit("end-communication", JSON.stringify({ hello: "fhwhfwu" }))

        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
        // if(scaleFactor !== 1){
        //     scaleFactor = 1
        // }
    }
})

