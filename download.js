const fs = require('fs');
const fetch = require('node-fetch');

class DownloadService {
    players = {
        "hqq": [
            "hqq.tv",
            "hqq.to",
            "vizplay.icu",
            "ddl-francais.com",
            "player.universanimevf.com",
            "veepl.online",
            "waaw.tv",
            "waaw.to",
            "py.universanime.co",
        ],
        "mavplay": [
            "mavplay.com",
            "mavplayer.xyz",
            "www.mavplayer.xyz",
            "mavlecteur.com",
            "mavplay.xyz",
            "mavavid.com",
        ],
        "streamtape": [
            "streamtape.com",
            "adblockstreamtape.art",
            "streamadblockplus.com",
            "streamtapeadblock.art",
        ],
        "dood": [
            "dood.la",
            "dood.so",
            "doodstream.com",
            "dood.watch",
            "dood.pm",
        ],
        "streamz": [
            "streamz.cc",
            "streamz.ws",
            "streamz.vg",
        ],
        "ok": ["ok.ru", "www.ok.ru"],
        "sendvid": ["sendvid.com"],
        "youtube": ["www.youtube.com"],
        "gdriveplayer": ["gdriveplayer.me"],
    }

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
        for (const [name, hostList] of Object.entries(this.players)) {
            if (hostList.includes(new URL(episode.link).hostname)) {
                try {
                    if (!fs.existsSync(episode.directory)) {
                        fs.mkdirSync(episode.directory, { recursive: true });
                    }
                    switch (name) {
                        case "hqq":
                            console.log("test");
                            var path = `${episode.directory}/${episode.name.replace(/[\/\\:?*<>|"]/g, " ")}.mp4`;
                            var response = await fetch(episode.download_link, {
                                "headers": { "Origin": "https://www.google.com" }
                            });
                            if (response.status !== 200) {
                                throw "error on download code: " + response.status;
                            }
                            var text = await response.text();
                            var lines = text.split("\n").filter((line) => !line.startsWith("#") && line !== "");
                            for (var i in lines) {
                                episode.progress = (parseInt(i) + 1) / lines.length;
                                this.callback();
                                var response = await fetch(episode.download_link.slice(0, episode.download_link.lastIndexOf("/") + 1) + lines[i], {
                                    "headers": {
                                        "Origin": "https://www.google.com"
                                    }
                                });
                                if (response.status !== 200) {
                                    if (fs.existsSync(path)) {
                                        fs.rmSync(path);
                                    }
                                    throw "error on download code: " + response.status;
                                }
                                var bytes = await response.arrayBuffer();
                                fs.appendFileSync(path, Buffer.from(bytes));
                            }
                            break;
                        case "mavplay":
                            var response = await fetch(episode.link.replace("/v/", "/api/source/"), { "method": "POST" });
                            if (response.status !== 200) {
                                throw "error on download code: " + response.status;
                            }
                            var data = await response.json();
                            data = data["data"][data["data"].length - 1];
                            if (data["file"]) {
                                var path = `${episode.directory}/${episode.name.replaceAll("/", "_")} ${data["label"]}.${data["type"]}`;
                                var response = await fetch(data["file"]);
                                if (response.status !== 200) {
                                    if (fs.existsSync(path)) {
                                        fs.rmSync(path);
                                    }
                                    throw "error on download code: " + response.status;
                                }
                                const contentLength = response.headers.get('Content-Length') || 0;
                                let receivedLength = 0;
                                response.body.on('data', (chunk) => {
                                    receivedLength += chunk.length;
                                });
                                var x = setInterval(() => {
                                    episode.progress = receivedLength / contentLength;
                                    this.callback();
                                }, 1000);
                                var bytes = await response.arrayBuffer();
                                fs.writeFileSync(path, Buffer.from(bytes));
                                clearInterval(x);
                            } else {
                                throw "error on download no file";
                            }
                            break;
                        case "streamtape":

                            break;
                        case "dood":

                            break;
                        case "streamz":

                            break;
                        case "ok":
                            var response = await fetch(episode.link);
                            if (response.status !== 200) {
                                throw "error on download code: " + response.status;
                            }
                            var json = /<div data-module="OKVideo" data-options="(.*)" data-player-container-id="embedVideoC" data-player-element-id="embedVideoE" data-visible-part="1" data-use-events-for-showing="true" class="vid-card_cnt h-mod">/.exec(await response.text())[1];
                            var data = JSON.parse(json.replaceAll("&quot;", "\""));
                            data = metadata.videos[metadata.videos.length - 1];
                            if (data.link) {
                                var path = `${episode.directory}/${episode.name.replaceAll("/", "_")} ${data.name}.mp4`;
                                var response = await fetch(data.link);
                                if (response.status !== 200) {
                                    if (fs.existsSync(path)) {
                                        fs.rmSync(path);
                                    }
                                    throw "error on download code: " + response.status;
                                }
                                const contentLength = response.headers.get('Content-Length') || 0;
                                let receivedLength = 0;
                                response.body.on('data', (chunk) => {
                                    receivedLength += chunk.length;
                                });
                                var x = setInterval(() => {
                                    episode.progress = receivedLength / contentLength;
                                    this.callback();
                                }, 1000);
                                var bytes = await response.arrayBuffer();
                                fs.writeFileSync(path, Buffer.from(bytes));
                                clearInterval(x);
                            } else {
                                throw "error on download no file";
                            }
                            break;
                        case "sendvid":
                            var path = `${episode.directory}/${episode.name.replace(/[\/\\:?*<>|"]/g, " ")}.mp4`;
                            var response = await fetch(episode.link);
                            if (response.status !== 200) {
                                throw "error on download code: " + response.status;
                            }
                            var link = /<div id="robotlink" style="display:none;">(.*)<\/div>/.exec(await response.text())[1];
                            response = await fetch(link);
                            if (response.status !== 200) {
                                throw "error on download code: " + response.status;
                            }
                            var text = await response.text();
                            var lines = text.split("\n").filter((line) => !line.startsWith("#") && line !== "");
                            for (var i in lines) {
                                response = await fetch(link.slice(0, link.lastIndexOf("/") + 1) + lines[i]);
                                if (response.status !== 200) {
                                    throw "error on download code: " + response.status;
                                }
                                var text = await response.text();
                                var lines = text.split("\n").filter((line) => !line.startsWith("#") && line !== "");
                                for (var i in lines) {
                                    console.log(lines[i]);
                                    var response = await fetch(link.slice(0, link.lastIndexOf("/") + 1) + lines[i], {
                                        "headers": {
                                            "Origin": "https://www.google.com"
                                        }
                                    });
                                    if (response.status !== 200) {
                                        if (fs.existsSync(path)) {
                                            fs.rmSync(path);
                                        }
                                        throw "error on download code: " + response.status;
                                    }
                                    var bytes = await response.arrayBuffer();
                                    fs.appendFileSync(path, Buffer.from(bytes));
                                }
                            }
                            break;
                        case "youtube":
                            // A refaire youtube a changer
                            // var end = episode.link.includes("&") ? episode.link.indexOf("&") : episode.link.length
                            // var response = await fetch("https://www.youtube.com/get_video_info?video_id=" + episode.link.substring(episode.link.indexOf("v=") + 2, end) + "&cpn=CouQulsSRICzWn5E&eurl&el=adunit");
                            // if (response.status !== 200) {
                            //     throw "error on download code: " + response.status;
                            // }
                            // var text = await response.text();
                            // if (text.includes("status=fail")) {
                            //     throw "error on download";
                            // } 
                            // var url = new URL("https://www.youtube.com?" + body);
                            // var player_response = JSON.parse(url.searchParams.get("player_response"));
                            // var videoTitle = player_response.videoDetails.title;
                            // for (const format of player_response.streamingData.formats) {
                            //     var path = `${episode.directory}/${videoTitle} ${format.qualityLabel}.${format.mimeType.substring(format.mimeType.indexOf("video/") + 6, format.mimeType.indexOf(";"))}`;

                            // }
                            // var data = await response.json();
                            // data = data["data"][data["data"].length - 1];
                            // if (data["file"]) {
                            //     var path = `${episode.directory}/${episode.name.replaceAll("/", "_")} ${data["label"]}.${data["type"]}`;
                            //     var response = await fetch(data["file"]);
                            //     if (response.status !== 200) {
                            //         if (fs.existsSync(path)) {
                            //             fs.rmSync(path);
                            //         }
                            //         throw "error on download code: " + response.status;
                            //     }
                            //     const contentLength = response.headers.get('Content-Length') || 0;
                            //     let receivedLength = 0;
                            //     response.body.on('data', (chunk) => {
                            //         receivedLength += chunk.length;
                            //     });
                            //     var x = setInterval(() => {
                            //         episode.progress = receivedLength / contentLength;
                            //         this.callback();
                            //     }, 1000);
                            //     var bytes = await response.arrayBuffer();
                            //     fs.writeFileSync(path, Buffer.from(bytes));
                            //     clearInterval(x);
                            // } else {
                            //     throw "error on download no file";
                            // }
                            break;
                        default:
                            break;
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }
        episode.progress = 1;
        episode.path = path;
        this.downloaded(episode);
        this.downloads.splice(0, 1);
        if (this.downloads.length > 0) {
            this.download();
        } else {
            this.isDownloading = false;
        }
    }
    
    getUniversLink() {
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
            // Solve error
            win.webContents.executeJavaScript(`new Promise((resolve, reject) => {
                var clickx = 0;
                var clicky = 0;
                async function main() {
                    var response = await fetch("/player/get_player_image.php", {
                        method: 'POST',
                        headers: new Headers({ 'content-type': 'application/json' }),
                        body: JSON.stringify({
                            height: document.body.clientHeight,
                            width: document.body.clientWidth,
                            videokey: videokeyorig
                        })
                    });
                    var json = await response.json();
                    var img = document.createElement("img");
                    document.body.style.background = "black";
                    document.body.style.height = "100%";
                    img.style.width = "100%";
                    img.src = json.image;
                    document.body.innerHTML = "";
                    document.body.appendChild(img);
                    img.addEventListener("click", e => {
                        clickx = e.clientX;
                        clicky = e.clientY;
                        go_next();
                    });
                    var wasmcheck = 0;
                    function go_next() {
                        \$.ajax({
                            url: '/player/get_md5.php',
                            type: 'POST',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                'htoken': "",
                                'sh': shh,
                                'ver': '4',
                                'secure': "0",
                                'adb': adbn,
                                'v': encodeURIComponent(videokeyorig),
                                'token': "",
                                'gt': "",
                                'embed_from': "0",
                                'wasmcheck': wasmcheck,
                                'adscore': "",
                                'click_hash': encodeURIComponent(json.hash_image),
                                'clickx': clickx,
                                'clicky': clicky
                            }),
                            success: function (data) {
                                if (data.try_again !== "1") {
                                    var src = 'https:' + un(data.obf_link) + ".mp4.m3u8";
                                    resolve(src);
                                } else {
                                    main();
                                }
                            },
                            error: function (xhr, ajaxOptions, thrownError) {
                                wasmcheck++;
                                if (typeof (xhr.status) !== "undefined") {
                                    if (xhr.status >= 500 && xhr.status < 600) {
                                        if (xhr.responseText.toLowerCase().indexOf("cloudflare") === -1 && xhr.responseText.toLowerCase() !== '') {
                                            if (xhr.responseText != '') {
                                                fetch("/ajax.php", {
                                                    method: 'POST',
                                                    body: JSON.stringify({
                                                        mode: "ban_cf",
                                                        code: xhr.status + "/" + xhr.responseText
                                                    })
                                                });
                                                var date = new Date();
                                                date.setTime(date.getTime() + 50 * 365 * 24 * 60 * 60 * 1000);
                                                try {
                                                    \$.cookie("cfb_ghu", 1, {
                                                        expires: date,
                                                        secure: true,
                                                        path: "/;SameSite=None"
                                                    });
                                                } catch (e) { }
                                            }
                                            return true;
                                        }
                                    }
                                }
                                if (wasmcheck < 10) {
                                    go_next();
                                } else {
                                    console.log(xhr.responseJSON);
                                }
                                return true;
                            }
                        });
                    }
                }
                main();
                window.open = () => { }; 
            });`).then((link) => {
                console.log("then");
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
            console.log("close");
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