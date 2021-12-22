const fs = require('fs');
const fetch = require('node-fetch');
module.exports = {
    downloadMav: async function (url, name, directory, callback) {
        var response = await fetch(url.replace("/v/", "/api/source/"), { "method": "POST" });
        if (response.status !== 200) {
            throw "error on download code: " + response.status;
        }
        var data = await response.json();
        data = data["data"][data["data"].length - 1];
        if (data["file"]) {
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            path = `${directory}/${name.replaceAll("/", "_")} ${data["label"]}.${data["type"]}`;
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
                callback(contentLength, receivedLength);
            }, 1000);
            var bytes = await response.arrayBuffer();
            fs.writeFileSync(path, Buffer.from(bytes));
            clearInterval(x);
            return path;
        } else {
            throw "error on download no file";
        }
    },
    downloadUnivers: async function (src, name, directory, callback) {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
        var path = `${directory}/${name.replace(/[\/\\:?*<>|"]/g, " ")}.mp4`;
        var response = await fetch(src, {
            "headers": { "Origin": "https://www.google.com" }
        });
        if (response.status !== 200) {
            throw "error on download code: " + response.status;
        }
        var text = await response.text();
        var lines = text.split("\n").filter((line) => !line.startsWith("#") && line !== "");
        for (var i in lines) {
            callback(lines.length, parseInt(i) + 1);
            var response = await fetch(src.slice(0, src.lastIndexOf("/") + 1) + lines[i], {
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
        return path;
    },
    getUniversLink: async function (url, BrowserWindow) {
        const win = new BrowserWindow({
            title: "Captcha",
            icon: __dirname + "/images/icon.jpg",
            autoHideMenuBar: true,
            width: 960,
            height: 540,
            frame: false
        });
        win.loadURL(url);
        return new Promise((resolve, reject) => {
            win.webContents.on('dom-ready', () => {
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
        });`).then((url) => {
                    resolve(url);
                    win.close();
                }).catch((e) => {
                    reject(e);
                });
            });
            win.on('close', () => {
                reject("Page Closed");
            });
        });
    }
};