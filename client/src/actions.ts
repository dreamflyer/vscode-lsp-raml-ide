import { RAMLMessageManager } from "./messages";
import { window, commands } from "vscode";

class ContextKey {
    constructor(private id: string) {

    }

    set(value: boolean) {
        commands.executeCommand('setContext', this.id + ".enabled", value);
    }
}

var contextKeys: {[id: string]: ContextKey} = {};

class ActionsManager {
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
        })
    }

    registerActions(): void {
        this.ramlClient.allAvailableActions().then(ramlActions => {
            ramlActions.forEach(action => {
                var id = getCommandId(action.id);

                contextKeys[id] = new ContextKey(id);
            });
        })
    }
}

function resetAllKeys() {
    Object.keys(contextKeys).forEach(keyId => contextKeys[keyId].set(false));
}

function enableAction(id: string): void {
    var commandId = getCommandId(id);

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