import http = require("http");

import fs = require("fs");
import path = require("path");

import { window, Uri, commands, workspace, ViewColumn } from "vscode";

import socketIo = require("socket.io");

var ports: any = {};

registerHtmlProvider();

export interface IHtmlView {
    sendData(eventName: string, data: any): void;

    onData(eventName, handler: (data: any) => void): void;
}

class HtmlView implements IHtmlView {
    constructor(private socket) {

    }
    
    sendData(eventName: string, data: any): void {
        this.socket.emit(eventName, data);
    }
    
    onData(eventName, handler: (data: any) => void): void {
        this.socket.on(eventName, data => {
            handler(data);
        });
    }
}

var port;

export function createView(viewId: string, column: number, callback: (view: IHtmlView) => void): void {
    var server = http.createServer(requestHandler);

    var socketBus = socketIo(server);

    server.listen(63423);

    port = server.address().port;

    ports[viewId] = port;

    socketBus.on('connection', function(socket) {
        socket.on('clientIsReady', () => callback(new HtmlView(socket)));
    });

    console.log("port: " + port);

    openPage(viewId, port, column, () => {

    });
}

function openPage(id: string, port: number, column: number, onDidOpen: () => void) {
    //commands.executeCommand('vscode.previewHtml', 'htmlview:' + id, 3).then(status => onDidOpen());
}

function registerHtmlProvider() {
    workspace.registerTextDocumentContentProvider('htmlview', {
        provideTextDocumentContent(uri: Uri, token): Promise<string> {
            var fileName = uri.path;

            var port = ports[fileName];

            fileName = fileName.toLowerCase().replace(new RegExp(' ', 'g'), '_');

            console.log("htmlview:" + fileName + " opened with port: " + port);

            var content = fs.readFileSync(path.resolve(__dirname, '../../static/', fileName + '.html')).toString();

            return Promise.resolve(content.replace(new RegExp('PORTNUMBER', 'g'), port));
        }
    });
}

function requestHandler(req, res) {
    console.log("URL: " + req.url);

    if(req.url.indexOf('js.map') !== -1) {
        res.end();

        return;
    }

    if(req.url.indexOf('/scripts/') === 0) {
        var content = fs.readFileSync(path.resolve(__dirname, '../../static/', '.' + req.url)).toString();

        res.writeHead(200, {'Content-Type': 'text/javascript'});

        res.write(content);
    }

    if(req.url.indexOf('/index.html') === 0) {
        var content = fs.readFileSync(path.resolve(__dirname, '../../static/editor_tools.html')).toString();

        res.writeHead(200, {'Content-Type': 'text/html'});

        res.write(content.replace(new RegExp('PORTNUMBER', 'g'), port));
    }

    res.end();
}