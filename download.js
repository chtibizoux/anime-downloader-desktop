const fs = require('fs');
const fetch = require('node-fetch');

class DownloadService {
    captchas = []
    downloads = []

    inCaptcha = false
    isDownloading = false

    constructor(BrowserWindow, callback, downloaded) {
        this.BrowserWindow = BrowserWindow;
        this.callback = callback;
        this.downloaded = downloaded;
    }

    addDownloads(episodes, path) {
        for (const episode of episodes) {
            episode.directory = path;
            if (this.players.hqq.includes(new URL(episode.link).hostname)) {
                this.captchas.push(episode);
            } else {
                this.downloads.push(episode);
            }
        }
        if (!this.inCaptcha && this.captchas.length > 0) {
            this.inCaptcha = true;
            this.getUniversLink();
        }
        if (!this.isDownloading && this.downloads.length > 0) {
            this.isDownloading = true;
            this.download();
        }
    }

    async download() {
        var episode = this.downloads[0];
        
        var path = `${episode.directory}/${episode.name.replace(/[\/\\:?*<>|"]/g, " ")}.mp4`;
        var url = `https://animedownloader.cf/api/download/?url=${episode.link}`;
        if (episode.download_link) {
            url = `https://animedownloader.cf/api/download/?url=${episode.download_link}&name=hqq`;
        }
        if (!fs.existsSync(episode.directory)) {
            fs.mkdirSync(episode.directory, { recursive: true });
        }
        var response = await fetch(url);
        if (response.status !== 200) {
            throw "error on download code: " + response.status;
        }
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
            let receivedLength = 0;
            response.body.on('data', (chunk) => {
                receivedLength += chunk.length;
            });
            var x = setInterval(() => {
                episode.progress = receivedLength / contentLength;
                this.callback();
            }, 1000);
            response.body.on('end', () => {
                clearInterval(x);
            });
        }
        response.body.pipe(fs.createWriteStream(path));
        response.body.on('error', () => {
            episode.progress = 1;
            episode.path = path;
            if (fs.existsSync(path)) {
                fs.rmSync(path);
            }
            this.downloads.splice(0, 1);
            if (this.downloads.length > 0) {
                this.download();
            } else {
                this.isDownloading = false;
            }
        });
        response.body.on('end', () => {
            episode.progress = 1;
            episode.path = path;
            this.downloaded(episode);
            this.downloads.splice(0, 1);
            if (this.downloads.length > 0) {
                this.download();
            } else {
                this.isDownloading = false;
            }
        });
        // var bytes = await response.arrayBuffer();
        // fs.writeFileSync(path, Buffer.from(bytes));
    }
    
    async getUniversLink() {
        var response = await fetch("https://animedownloader.cf/captcha/electron.js");
        var javascript = await response.text();
        var episode = this.captchas[0];
        const win = new this.BrowserWindow({
            title: "Captcha",
            icon: __dirname + "/images/icon.jpg",
            autoHideMenuBar: true,
            width: 960,
            height: 540,
            frame: false
        });
        win.loadURL(episode.link);
        win.webContents.on('dom-ready', () => {
            win.webContents.executeJavaScript(javascript).then((link) => {
                episode.download_link = link;
                this.downloads.push(episode);
                if (!this.isDownloading) {
                    this.isDownloading = true;
                    this.download();
                }
                this.callback();
                win.close();
            }).catch((e) => {
                console.log(e);
                win.close();
            });
        });
        win.on('close', () => {
            this.captchas.splice(0, 1);
            if (this.captchas.length > 0) {
                this.getUniversLink();
            } else {
                this.inCaptcha = false;
            }
        });
    }
}
module.exports = DownloadService;