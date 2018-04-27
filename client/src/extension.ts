'use strict';
import path = require("path");
import fs = require("fs");

import { workspace, Disposable, ExtensionContext, window, commands } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

import messages = require("./messages");
import actions = require("./actions");

import { Client } from '_debugger';

var swaggerJsonColorsMap: any[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../static/sjsonMap.json")).toString());
var swaggerYamlColorsMap: any[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../static/syamlMap.json")).toString());

export function activate(context: ExtensionContext) {
	let serverModule = context.asAbsolutePath(path.join('node_modules', 'raml-language-server', 'dist', 'entryPoints', 'vscode', 'server.js'));
	let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

	var editorSettings = workspace.getConfiguration("editor");

	editorSettings.update("tokenColorCustomizations", {
		textMateRules: swaggerJsonColorsMap.concat(swaggerYamlColorsMap)
	});
	  	
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}
	
	let clientOptions: LanguageClientOptions = {
		documentSelector: ['raml'],

		synchronize: {
			configurationSection: 'languageServerExample',
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	}

	var client = new LanguageClient('languageServerExample', 'Language Server Example', serverOptions, clientOptions);

	client.onReady().then(ready => {
		var ramlClient = messages.listen(client);

		actions.init(ramlClient);
	});

	let disposable = client.start();

	context.subscriptions.push(disposable);
}
