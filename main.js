const { shell, session, dialog, app, BrowserWindow, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater")
const fs = require('fs');
const DownloadService = require('./download');

const BASE_URL = 'https://animedownloader.cf';

autoUpdater.autoDownload = false;
var x = setInterval(() => {
    autoUpdater.checkForUpdates();
}, 60000);

autoUpdater.on('update-downloaded', (event) => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('error', message => {
    console.error('There was a problem updating the application');
    console.error(message);
});

if (!fs.existsSync(app.getPath("userData") + '/config.json')) {
    var id = "";
    var letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRstUVWXYZ1234567890";
    for (let i = 0; i < 20; i++) {
        id += letters[Math.floor(Math.random() * (letters.length - 1))];
    }
    fs.writeFileSync(app.getPath("userData") + '/config.json', '{ "id": "' + id + '" }');
}
const config = JSON.parse(fs.readFileSync(app.getPath("userData") + '/config.json'));

const createWindow = async () => {
    if (config.adminToken) {
        await session.defaultSession.cookies.set({ url: BASE_URL, name: 'admin_token', value: config.adminToken });
    }
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

    autoUpdater.on('download-progress', (progressObj) => {
        win.setProgressBar(progressObj.percent / 100);
    });

    ipcMain.on("downloadNewVersion", (event) => {
        autoUpdater.downloadUpdate();
    });

    ipcMain.handle("getthumbnail", async (event, link) => {
        var win = new BrowserWindow({
            title: "Get thumbnail",
            icon: __dirname + "/images/icon.jpg",
            autoHideMenuBar: true,
            width: 960,
            height: 540,
            frame: false
        });
        win.loadURL(link);
        var thumbnail = "";
        try {
            var thumbnail = await new Promise((resolve, reject) => {
                win.webContents.on('dom-ready', () => {
                    win.webContents.executeJavaScript(`document.querySelector("video") ? document.querySelector("video").poster : document.querySelector('meta[property="og:image"]').content`).then((url) => {
                        resolve(url);
                        win.close();
                    }).catch((e) => {
                        console.log(e);
                        win.close();
                    });
                });
                win.on('close', () => {
                    reject("Page Closed");
                });
            });
        } catch (e) {
            console.log(e);
        }
        return thumbnail;
    });

    ipcMain.on("getdownload", (event) => {
        win.webContents.send("downloads", download.downloads);
        autoUpdater.checkForUpdates();
    });
    
    ipcMain.on("downloaded", (event) => {
        if (!fs.existsSync(app.getPath("documents") + "/Anime Downloader/")) {
            fs.mkdirSync(app.getPath("documents") + "/Anime Downloader/", { recursive: true });
        }
        shell.openPath(app.getPath("documents") + "/Anime Downloader/");
    });

    ipcMain.on("episodeClick", (event, path) => {
        shell.openPath(path);
    });
    ipcMain.on("download", async (event, episodes, animeName, selectPath) => {
        var path = app.getPath("documents") + "/Anime Downloader/" + download.parseFileName(animeName) + "/";
        if (selectPath) {
            const result = await dialog.showOpenDialog(win, {
                // title: "Dossier de téléchargement",
                // defaultPath: app.getPath("documents"),
                // buttonLabel: "Télécharger",
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
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        clearInterval(x);
        app.quit();
    }
});
