import fs = require("fs");
import path = require("path");

var actionsFolder = path.dirname(require.resolve("raml-language-server/node_modules/raml-actions"));

var completeBodyUI = fs.readFileSync(path.resolve(actionsFolder, "./actions/remoteUI/completeBody/ui.js")).toString();
var newMethodUI = fs.readFileSync(path.resolve(actionsFolder, "./actions/remoteUI/newMethod/ui.js")).toString();
var simpleActionUi = fs.readFileSync(path.resolve(actionsFolder, "./actions/remoteUI/simpleAction/ui.js")).toString();

export function getUICode(actionID: string): string {
    if(actionID == "completeBody") {
        return completeBodyUI;
    }

    if(actionID == "newMethod") {
        return newMethodUI;
    }

    if(actionID == "Create new Response") {
        return simpleActionUi;
    }

    if(actionID == "Create new URI Parameter") {
        return simpleActionUi;
    }

    if(actionID == "Create new Query Parameter") {
        return simpleActionUi;
    }

    if(actionID == "Create new Header") {
        return simpleActionUi;
    }

    if(actionID == "Create new Response Header") {
        return simpleActionUi;
    }

    if(actionID == "Create new Response Body") {
        return simpleActionUi;
    }

    if(actionID == "Create new Property") {
        return simpleActionUi;
    }

    if(actionID == "Create new Body") {
        return simpleActionUi;
    }

    return null;
}