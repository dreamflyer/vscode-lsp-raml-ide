import { window, commands, TextEditor } from "vscode";

import { RAMLMessageManager } from "./messages";

import utils = require("./utils");
import { Change } from "./utils";

class ContextKey {
    constructor(private id: string) {

    }

    set(value: boolean) {
        commands.executeCommand('setContext', this.id + ".enabled", value);
    }
}

var contextKeys: {[id: string]: ContextKey} = {};

class ActionsManager {
    private lastUri: string;
    private lastOffset: number;

    private lastEditor: TextEditor;

    constructor(private ramlClient: RAMLMessageManager) {
        window.onDidChangeTextEditorSelection(event => {
            if(!event.textEditor.document.fileName.endsWith('.raml')) {
                return;
            }

            resetAllKeys();
    
            var offset = event.textEditor.document.offsetAt(event.textEditor.selection.active);

            ramlClient.documentChanged({
                uri: event.textEditor.document.uri.path,
                text: event.textEditor.document.getText()
            });
    
            ramlClient.calculateEditorContextActions(event.textEditor.document.uri.path, offset).then(actions => enableActions(actions));

            this.lastUri = event.textEditor.document.uri.path;
            this.lastOffset = offset;

            this.lastEditor = event.textEditor;
        })
    }

    registerActions(): void {
        this.ramlClient.allAvailableActions().then(ramlActions => {
            ramlActions.forEach(action => {
                var id = getCommandId(action.id);

                contextKeys[id] = new ContextKey(id);

                this.listenAction(action);
            });
        })
    }

    listenAction(action: any): void {
        var commandId = getCommandId(action.id);

        commands.registerCommand(commandId, () => {
            var response = this.ramlClient.executeContextAction(this.lastUri, action, this.lastOffset);
    
            response.then((changedDocuments: any[]) => {
                if(!changedDocuments) {
                    return;
                }
                
                var changes = [];
                
                changedDocuments.forEach(changedDocument => {
                    changes = changes.concat(getChanges(changedDocument));
                });

                utils.applyChanges(changes).then(() => {
                    this.ramlClient.documentChanged({
                        text: this.lastEditor.document.getText(),
                        uri: this.lastEditor.document.uri.path
                    })
                });
            })
        });
    }
}

function getChanges(changedDocument: any): Change[] {
    if(!changedDocument.textEdits) {
        utils.setText(changedDocument.text);
        
        return [
            {
                uri: changedDocument.uri,

                value: changedDocument.text
        }];
    }
    
    return changedDocument.textEdits.map(textEdit => getChange(textEdit, changedDocument.uri));
}

function getChange(textEdit: any, uri: string): Change {
    return {
        uri,
        
        range: {
            start: textEdit.range.start,
            end: textEdit.range.end
        },
        
        value: textEdit.text
    }
}

function resetAllKeys() {
    Object.keys(contextKeys).forEach(keyId => contextKeys[keyId].set(false));
}

function enableAction(id: string): void {
    var commandId = getCommandId(id);

    console.log("ACTION ENABLED: " + commandId);

    if(!contextKeys[commandId]) {
        return;
    }

    contextKeys[commandId].set(true);
}

function enableActions(ramlActions: any[]): void {
    if(!ramlActions) {
        return;
    }

    ramlActions.forEach(action => enableAction(action.id));
}

function getCommandId(id: string): string {
    return "raml.action." + id.replace(new RegExp(' ', 'g'), '_').toLowerCase();
}

export function init(ramlClient: RAMLMessageManager) {
    new ActionsManager(ramlClient).registerActions();
}