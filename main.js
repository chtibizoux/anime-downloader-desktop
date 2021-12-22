const { shell, session, dialog, app, BrowserWindow, ipcMain } = require('electron');
const fetch = require('node-fetch');
const fs = require('fs');
const download = require('./download');

if (!fs.existsSync('./config.json')) {
    var id = "";
    var letters = "1234567890";
    for (let i = 0; i < 20; i++) {
        id += letters[Math.floor(Math.random() * (letters.length - 1))];
    }
    fs.writeFileSync('./config.json', '{ "id": "' + id + '" }');
}
const config = require('./config.json');
var downloads = [];

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
    session.defaultSession.cookies.set({ url: 'http://anime.clementsongis.cf', name: 'application', value: 'true' }).then(() => {
        session.defaultSession.cookies.set({ url: 'http://anime.clementsongis.cf', name: 'id', value: config.id }).then(() => {
            win.loadURL('https://anime.clementsongis.cf/');
        });
    });
    ipcEvents(win);
}
function ipcEvents(win) {
    ipcMain.on("getdownload", async (event) => {
        win.webContents.send("downloads", downloads);
    });
    ipcMain.on("downloaded", async (event) => {
        win.webContents.send("downloads", downloads);
        shell.openPath(app.getAppPath() + "/Downloads/")
    });
    ipcMain.on("download", async (event, episodes, animeName, selectPath) => {
        downloads.push({
            name: animeName,
            episodes: episodes,
            active: episodes[0],
            progress: 0,
        });
        win.webContents.send("downloads", downloads);
        var path = app.getAppPath() + "/Downloads/" + animeName.split("/").join("_") + "/";
        if (selectPath) {
            const result = await dialog.showOpenDialog(win, {
                properties: ['openDirectory']
            });
            if (result.filePaths[0]) {
                path = result.filePaths[0];
            }
        }
        for (const i in episodes) {
            if (episodes[i]["url"]) {
                if (episodes[i]["url"].includes("player/embed_player.php")) {
                    try {
                        episodes[i]["file"] = await download.getUniversLink(episodes[i]["url"], BrowserWindow);
                        console.log(episodes[i]["file"]);
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        }
        for (const episode of episodes) {
            if (episode["url"]) {
                for (const i in downloads) {
                    if (downloads[i].name === animeName) {
                        downloads[i].active = episode;
                    }
                }
                if (episode["url"].includes("/v/")) {
                    try {
                        await download.downloadMav(episode["url"], episode["name"], path, (total, position) => {
                            win.setProgressBar(position / total);
                            for (const i in downloads) {
                                if (downloads[i].name === animeName) {
                                    downloads[i].progress = position / total;
                                    win.webContents.send("downloads", downloads);
                                }
                            }
                        });
                    } catch (e) {
                        console.log(e);
                    }
                    win.setProgressBar(0);
                    console.log(path);
                } else if (episode["url"].includes("player/embed_player.php") && episode["file"]) {
                    try {
                        await download.downloadUnivers(episode["file"], episode["name"], path, (total, position) => {
                            win.setProgressBar(position / total);
                            for (const i in downloads) {
                                if (downloads[i].name === animeName) {
                                    downloads[i].progress = position / total;
                                    win.webContents.send("downloads", downloads);
                                }
                            }
                        });
                    } catch (e) {
                        console.log(e);
                    }
                    win.setProgressBar(0);
                    console.log(path);
                } else {
                    console.log("no url: " + episode.name);
                }
                for (const i in downloads) {
                    if (downloads[i].name === animeName) {
                        for (const y in downloads[i].episodes) {
                            if (episode.id === downloads[i].episodes[y].id) {
                                downloads[i].episodes.splice(y, 1);
                                win.webContents.send("downloads", downloads);
                            }
                        }
                    }
                }
            } else {
                console.log("no url: " + episode.name);
            }
        }
        for (const i in downloads) {
            if (downloads[i].name === animeName) {
                downloads.splice(i, 1);
                win.webContents.send("downloads", downloads);
            }
        }
    });
}
app.whenReady().then(() => {
    createWindow();
});
app.on('window-all-closed', () => {
    app.quit();
});