const { shell, session, dialog, app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const DownloadService = require('./download');
if (!fs.existsSync('./config.json')) {
    var id = "";
    var letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRstUVWXYZ1234567890";
    for (let i = 0; i < 20; i++) {
        id += letters[Math.floor(Math.random() * (letters.length - 1))];
    }
    fs.writeFileSync('./config.json', '{ "id": "' + id + '" }');
}
const config = require('./config.json');

const createWindow = () => {
    const win = new BrowserWindow({
        title: "Anime Downloader",
        icon: __dirname + "/images/icon.jpg",
        autoHideMenuBar: true,
        width: 800,
        height: 600,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        }
    });
    win.maximize();
    session.defaultSession.cookies.set({ url: 'http://animedownloader.cf', name: 'application', value: 'true' }).then(() => {
        session.defaultSession.cookies.set({ url: 'http://animedownloader.cf', name: 'id', value: config.id }).then(() => {
            win.loadURL('https://animedownloader.cf/');
        });
    });
    ipcEvents(win);
}
function ipcEvents(win) {
    function callback() {
        win.setProgressBar(download.downloads[0].progress);
        win.webContents.send("downloads", download.downloads);
    }
    function downloaded(episode) {
        win.setProgressBar(0);
        win.webContents.send("downloaded", episode);
    }
    const download = new DownloadService(BrowserWindow, callback, downloaded);
    
    ipcMain.on("getdownload", async (event) => {
        win.webContents.send("downloads", download.downloads);
    });
    
    ipcMain.on("downloaded", async (event) => {
        win.webContents.send("downloads", downloads);
        shell.openPath(app.getAppPath() + "/Downloads/")
    });

    ipcMain.on("animeClick", async (event, path) => {
        shell.openPath(path)
    });

    ipcMain.on("download", async (event, episodes, animeName, selectPath) => {
        var path = app.getAppPath() + "/Downloads/" + animeName.split("/").join("_") + "/";
        if (selectPath) {
            const result = await dialog.showOpenDialog(win, {
                properties: ['openDirectory']
            });
            if (result.filePaths[0]) {
                path = result.filePaths[0];
            }
        }
        download.addDownloads(episodes, path);
        win.webContents.send("downloads", download.downloads);
    });
}
app.whenReady().then(() => {
    createWindow();
});
app.on('window-all-closed', () => {
    app.quit();
});