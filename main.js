const { shell, session, dialog, app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater")
const fs = require('fs');
const DownloadService = require('./download');

const BASE_URL = 'https://animedownloader.cf';

autoUpdater.autoDownload = false;
autoUpdater.on('update-downloaded', (event) => {
    autoUpdater.quitAndInstall();
});
autoUpdater.on('error', message => {
    console.error('There was a problem updating the application');
    console.error(message);
});

if (!fs.existsSync('./config.json')) {
    var id = "";
    var letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRstUVWXYZ1234567890";
    for (let i = 0; i < 20; i++) {
        id += letters[Math.floor(Math.random() * (letters.length - 1))];
    }
    fs.writeFileSync('./config.json', '{ "id": "' + id + '" }');
}
const config = JSON.parse(fs.readFileSync('./config.json'));

const createWindow = async () => {
    await session.defaultSession.cookies.set({ url: BASE_URL, name: 'application', value: 'true' });
    await session.defaultSession.cookies.set({ url: BASE_URL, name: 'id', value: config.id });
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
    win.loadURL(BASE_URL);
    win.maximize();
    ipcEvents(win);
}
function ipcEvents(win) {
    function callback() {
        if (download.downloads[0].progress) {
            win.setProgressBar(download.downloads[0].progress);
        }
        win.webContents.send("downloads", download.downloads);
    }
    function downloaded(episode) {
        win.setProgressBar(-1);
        win.webContents.send("downloaded", episode);
    }
    const download = new DownloadService(BrowserWindow, callback, downloaded, BASE_URL);

    autoUpdater.on('update-available', (event) => {
        win.webContents.send("newVersion");
    });

    ipcMain.on("downloadNewVersion", (event) => {
        autoUpdater.downloadUpdate();
    });

    ipcMain.on("getdownload", (event) => {
        win.webContents.send("downloads", download.downloads);
    });
    
    ipcMain.on("downloaded", (event) => {
        shell.openPath(app.getAppPath() + "/Downloads/");
        autoUpdater.checkForUpdates();
        setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 60000);
    });

    ipcMain.on("episodeClick", (event, path) => {
        shell.openPath(path);
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