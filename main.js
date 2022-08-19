const { shell, session, Notification, dialog, app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const { autoUpdater } = require("electron-updater")
const fs = require('fs');
const { register, listen } = require('push-receiver');

const DownloadService = require('./download');

const BASE_URL = 'https://animedownloader.cf';
const senderId = '432941368518';

if (!fs.existsSync(app.getPath("userData") + '/config.json')) {
    fs.writeFileSync(app.getPath("userData") + '/config.json', '{}');
}
var config = JSON.parse(fs.readFileSync(app.getPath("userData") + '/config.json'));

var mainWindow = null;

app.setAppUserModelId(process.execPath);

var isDownloading = false;

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

autoUpdater.on('update-available', (event) => {
    const notification = new Notification({
        title: "Nouvelle version",
        body: "Une nouvelle version de l'application est disponible !",
    });
    notification.on("click", () => {
        notification.close();
        if (!isDownloading) {
            isDownloading = true;
            autoUpdater.downloadUpdate();
        }
    });
    notification.show();
    if (mainWindow) {
        mainWindow.webContents.send("newVersion");
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
        mainWindow.setProgressBar(progressObj.percent / 100);
    }
});

(async () => {
    if (!config.credentials) {
        config.credentials = await register(senderId);
        config.credentials.persistentIds = [];
        fs.writeFileSync(app.getPath("userData") + '/config.json', JSON.stringify(config));
    }
    await listen(config.credentials, onNotification);
    console.log("Notification manager listening...");
})();

function onNotification({ notification: payload, persistentId }) {
    config.credentials.persistentIds.push(persistentId);
    fs.writeFileSync(app.getPath("userData") + '/config.json', JSON.stringify(config));
    if (payload.notification.body) {
        console.log('display notification');
        const notification = new Notification({
            title: payload.notification.title,
            body: payload.notification.body,
        });
        notification.on("click", () => {
            notification.close();
            console.log('Notification clicked');
            if (mainWindow) {
                mainWindow.loadURL(BASE_URL + payload.notification.click_action);
                mainWindow.focus();
            } else {
                createWindow(payload.notification.click_action);
            }
        });
        notification.show();
    }
}

function callback() {
    if (mainWindow) {
        if (download.downloads[0].progress) {
            mainWindow.setProgressBar(download.downloads[0].progress);
        }
        mainWindow.webContents.send("downloads", download.downloads);
    }
}

function downloaded(episode) {
    if (mainWindow) {
        mainWindow.setProgressBar(-1);
        mainWindow.webContents.send("downloaded", episode);
    }
}

const download = new DownloadService(BrowserWindow, callback, downloaded, BASE_URL);

var backgroundColor = nativeTheme.shouldUseDarkColors ? "#121212" : "#fafafa";
if (config.theme === "light") {
    backgroundColor = "#fafafa";
} else if (config.theme === "dark") {
    backgroundColor = "#121212";
}

async function initCookies() {
    await session.defaultSession.cookies.set({ url: BASE_URL, name: 'admin_token', value: config.adminToken });
    await session.defaultSession.cookies.set({ url: BASE_URL, name: 'application', value: 'true' });
    await session.defaultSession.cookies.set({ url: BASE_URL, name: 'id', value: config.id });
    await session.defaultSession.cookies.set({ url: BASE_URL, name: 'theme', value: config.theme });

    session.defaultSession.cookies.addListener("changed", (event, cookie) => {
        if (cookie.name === "id") {
            config.id = cookie.value;
            fs.writeFileSync(app.getPath("userData") + '/config.json', JSON.stringify(config));
        }
    });
    createWindow("");
}

function createWindow(path) {
    mainWindow = new BrowserWindow({
        title: "Anime Downloader",
        icon: __dirname + "/images/icon.jpg",
        autoHideMenuBar: true,
        width: 800,
        height: 600,
        frame: false,
        backgroundColor,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });
    mainWindow.on("maximize", () => {
        mainWindow.webContents.send("maximize");
    });

    mainWindow.on("unmaximize", () => {
        mainWindow.webContents.send("unmaximize");
    });

    mainWindow.on('close', () => {
        mainWindow = null;
    });

    mainWindow.maximize();
    mainWindow.loadURL(BASE_URL + path);
}

ipcMain.on("getdownloads", () => {
    if (mainWindow) {
        mainWindow.webContents.send("downloads", download.downloads);
    }
    autoUpdater.checkForUpdates();
});

ipcMain.on("downloadNewVersion", () => {
    if (!isDownloading) {
        isDownloading = true;
        autoUpdater.downloadUpdate();
    }
});

ipcMain.on("theme", (_, theme) => {
    config.theme = theme;
    fs.writeFileSync(app.getPath("userData") + '/config.json', JSON.stringify(config));
    var backgroundColor = nativeTheme.shouldUseDarkColors ? "#121212" : "#fafafa";
    if (config.theme === "light") {
        backgroundColor = "#fafafa";
    } else if (config.theme === "dark") {
        backgroundColor = "#121212";
    }
    if (mainWindow) {
        mainWindow.setBackgroundColor(backgroundColor);
    }
});

ipcMain.on("minimize", () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on("maximize", () => {
    if (mainWindow) {
        mainWindow.maximize();
    }
});

ipcMain.on("unmaximize", () => {
    if (mainWindow) {
        mainWindow.unmaximize();
    }
});

ipcMain.on("downloaded", () => {
    if (!fs.existsSync(app.getPath("documents") + "/Anime Downloader/")) {
        fs.mkdirSync(app.getPath("documents") + "/Anime Downloader/", { recursive: true });
    }
    shell.openPath(app.getPath("documents") + "/Anime Downloader/");
});

ipcMain.on("episodeClick", (_, path) => {
    shell.openPath(path);
});

ipcMain.on("download", async (_, episodes, animeName, selectPath) => {
    var path = app.getPath("documents") + "/Anime Downloader/" + download.parseFileName(animeName) + "/";
    if (selectPath && mainWindow) {
        const result = await dialog.showOpenDialog(mainWindow, {
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
    if (mainWindow) {
        mainWindow.webContents.send("downloads", download.downloads);
    }
});

ipcMain.handle("getthumbnail", async (_, link) => {
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

ipcMain.handle("getToken", () => {
    if (config.credentials) {
        return config.credentials.fcm.token;
    } else {
        return null;
    }
});

app.whenReady().then(() => {
    initCookies();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            initCookies();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        clearInterval(x);
        // app.quit();
    }
});
