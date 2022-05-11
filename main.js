import { shell, session, autoUpdater, dialog, app, BrowserWindow, ipcMain } from 'electron';
import { existsSync, writeFileSync } from 'fs';
import DownloadService from './download';

const server = 'https://animedownloader.cf';
const url = `${server}/update/${process.platform}/${app.getVersion()}`;
autoUpdater.setFeedURL({ url });
setInterval(() => {
    autoUpdater.checkForUpdates();
}, 60000);

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Redémarer', 'Plus tard'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: "Une nouvelle version à été télécharger. Redémarer l'application pour appliquer la mise à jour."
    }

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
});

autoUpdater.on('error', message => {
    console.error('There was a problem updating the application');
    console.error(message);
});

if (!existsSync('./config.json')) {
    var id = "";
    var letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRstUVWXYZ1234567890";
    for (let i = 0; i < 20; i++) {
        id += letters[Math.floor(Math.random() * (letters.length - 1))];
    }
    writeFileSync('./config.json', '{ "id": "' + id + '" }');
}
import { id as _id } from './config.json';

const createWindow = async () => {
    await session.defaultSession.cookies.set({ url: 'http://animedownloader.cf', name: 'application', value: 'true' });
    await session.defaultSession.cookies.set({ url: 'http://animedownloader.cf', name: 'id', value: _id });
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
    win.loadURL('https://animedownloader.cf/');
    win.maximize();
    
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

    ipcMain.on("getdownload", (event) => {
        win.webContents.send("downloads", download.downloads);
    });
    
    ipcMain.on("downloaded", (event) => {
        shell.openPath(app.getAppPath() + "/Downloads/");
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