import htmlView = require("./htmlView");
import utils = require("./utils");

import { window, Uri, commands, workspace, ViewColumn, TextEditor, WorkspaceEdit} from "vscode";
import {LanguageClient} from "vscode-languageclient/lib/main";

import {AbstractClientConnection, textEditProcessor} from "raml-language-server";

import { RequestType, ResponseType, EditorInfo, EditorPosition } from "./htmlEvents";

import uiActions = require("./uiActions");

export class RAMLMessageManager extends AbstractClientConnection {
    constructor(private vsClient: LanguageClient) {
        super("VSClientConnection");

        vsClient.onRequest("CUSTOM_REQUEST", (message) => {
            this.handleRecievedMessage(message);
        });
    }

    public stop(): void {

    }

    public sendMessage(message: any): void {
        this.vsClient.sendRequest("CUSTOM_REQUEST", message).then(response => {
			
		}, reject => {
			console.log(reject);
		});
    }
}

export function listen(vsClient: LanguageClient): RAMLMessageManager {
    var ramlClient = new RAMLMessageManager(vsClient);

    ramlClient.setLoggerConfiguration({
        allowedComponents: [
            "server",
            "DetailsManager",
            "MessageDispatcher:NodeProcessClientConnection",
            "MessageDispatcher:NodeProcessServerConnection",
            "CustomActionsManager",
            "CompleteBodyStateCalculator",
            "contextActions"
        ],
        maxSeverity: 0,
        maxMessageLength: 5000
    });
    
    htmlView.createView('Editor Tools', 3, (view: htmlView.IHtmlView) => {
        registerHandlers(view, ramlClient);

        view.sendData(ResponseType.EDITOR_OPENED, utils.getEditorInfo(null, null));
    });

    ramlClient.setServerConfiguration({
        actionsConfiguration: {
            enableUIActions: true
        },

        modulesConfiguration: {
            enableDetailsModule: true,

            enableEditorManagerModule: true,
            
            enableCustomActionsModule: true
        }
    });

    return ramlClient;
}

function registerHandlers(view: htmlView.IHtmlView, ramlClient: RAMLMessageManager) {
    view.onData(RequestType.CHANGE_DETAIL_VALUE, (payload: any) => ramlClient.changeDetailValue(payload.data.uri, payload.data.position, payload.data.itemID, payload.data.value).then(response => { 
           return view.sendData(ResponseType.REQUESTED_DETAIL_VALUE, {requestId: payload.requestId, payload: response});
        }
    ));

    view.onData(RequestType.DOCUMENT_CHANGED, (data: any) => {
        return ramlClient.documentChanged(data);
    });

    view.onData(RequestType.POSITION_CHANGED, (data: any) => {
        ramlClient.positionChanged(data.uri, data.position);
    });

    view.onData(RequestType.SET_CONTENT, (data: any) => {
        utils.setText(data);
    });

    view.onData(RequestType.SET_SELECTION_RANGE, (data) => {
        utils.setSelectionRange(data);
    });

    view.onData(RequestType.SET_CONTENT_AND_OFFSET, (payload) => {
        utils.setText(payload.data.content);
        utils.setPosition(payload.data.offset);

        view.sendData(ResponseType.REQUESTED_OFFSET_UPDATE, {requestId: payload.requestId, payload: utils.getSelectionPosition()});
    });
    
    view.onData(RequestType.GET_DETAILS, (payload) => ramlClient.getDetails(payload.data.uri, payload.data.position).then(response => view.sendData(ResponseType.REQUESTED_DETAILS_REPORT, {requestId: payload.requestId, payload: response})));
    view.onData(RequestType.GET_LATEST_VERSION, (payload) => ramlClient.getLatestVersion(payload.data.uri).then(response => view.sendData(ResponseType.REQUESTED_LATEST_VERSION, {requestId: payload.requestId, payload: response})));
    view.onData(RequestType.GET_STRUCTURE, (payload) => ramlClient.getStructure(payload.data.uri).then(response => view.sendData(ResponseType.REQUESTED_STRUCTURE, {requestId: payload.requestId, payload: response})));

    var uiPromiseResolve: any;

    view.onData(RequestType.UI_RESPONSE, (data) => {
        uiPromiseResolve(data);
    });

    ramlClient.onDetailsReport(report => view.sendData(ResponseType.DETAILS_REPORT, report));
    
    ramlClient.onStructureReport(report => view.sendData(ResponseType.STRUCTURE_REPORT, report));

    ramlClient.onDisplayActionUI(uiData => {
        uiData.uiCode = uiActions.getUICode(uiData.action.id);

        view.sendData(ResponseType.UI_DATA, uiData);

        return new Promise(resolve => {
            uiPromiseResolve = resolve;
        });
    });

    workspace.onDidChangeTextDocument(event => {
        if(!event.document.fileName.endsWith('.raml')) {
            return;
        }

        if(event.document.getText() === event.contentChanges[0].text) {
            return;
        }

        view.sendData(ResponseType.DID_CHANGE_CONTENT, utils.getEditorInfo(null, event.document));

        ramlClient.documentChanged({
            text: event.document.getText(),
            uri: event.document.uri.path
        })
    });

    workspace.onDidOpenTextDocument(event => {
        view.sendData(ResponseType.EDITOR_OPENED, utils.getEditorInfo(null, event));

        ramlClient.documentOpened({
            text: event.getText(),
            uri: event.uri.path
        });
    });

    window.onDidChangeActiveTextEditor(event => {
        if(!event.document.fileName.endsWith('.raml')) {
            return;
        }

        view.sendData(ResponseType.EDITOR_OPENED, utils.getEditorInfo(event, event.document));
    });

    window.onDidChangeTextEditorSelection(event => {
        if(!event.textEditor.document.fileName.endsWith('.raml')) {
            return;
        }

        var offset = event.textEditor.document.offsetAt(event.textEditor.selection.active);

        ramlClient.positionChanged(event.textEditor.document.uri.path, offset);
    })
}
