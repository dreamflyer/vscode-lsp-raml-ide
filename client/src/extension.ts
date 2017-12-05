'use strict';
import * as path from 'path';

import { workspace, Disposable, ExtensionContext, window } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

import messages = require("./messages");

export function activate(context: ExtensionContext) {
	let serverModule = context.asAbsolutePath(path.join('node_modules', 'raml-language-server', 'dist', 'entryPoints', 'vscode', 'server.js'));
	let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };
	
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
		messages.listen(client)
	});

	let disposable = client.start();

	context.subscriptions.push(disposable);
}
