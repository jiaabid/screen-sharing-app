const { app, BrowserWindow, ipcMain, dialog, screen } = require('electron')
const { v4: uuidv4 } = require('uuid');
const prompt = require("electron-prompt")
var socket = require('socket.io-client')(process.env.SOCKET_IP);
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
    
    require("./controller/screen.controller") //all the socket and intercommunication


}
app.commandLine.appendSwitch('force-device-scale-factor', 1) //set the scale factor default to 100%

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
    }
})

