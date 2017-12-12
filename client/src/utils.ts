'use strict';

import { window, TextEditor, Range, Position, Selection, TextDocument, workspace, WorkspaceEdit} from 'vscode';
import { EditorRange, EditorInfo, EditorPosition } from './htmlEvents';
import { fail } from 'assert';

export class Change {
    uri: string;

    range?: {
        start: number,
        end: number
    };

    value: string;
}

export function setText(text: string, editor?: TextEditor, document?: TextDocument): Thenable<void> {
    editor = findEditor(editor, document);
    
	if (!editor) {
		return Promise.resolve();
	}

	return new Promise<void>(resolve => {
        var edit = new WorkspaceEdit();
        
        var document = editor.document;
        var lastLine = document.lineAt(document.lineCount - 2);
        
        const start = new Position(0, 0);
		const end = new Position(document.lineCount - 1, lastLine.text.length);

        edit.replace(editor.document.uri, new Range(start, end), text);

        workspace.applyEdit(edit).then(success => {
            resolve();
        }, fail => {
            resolve();
        });
	});
}

export function applyChanges(changes: Change[], editor?: TextEditor): Thenable<any> {
    editor = findEditor(editor);
    
    return applyChange(findEditor(editor), 0, changes);
}

function applyChange(editor: TextEditor, index: number, changes: Change[]): Thenable<any> {
    if(index > changes.length - 1) {
        return;
    }

    var change = changes[index];

    if(!change.range) {
        return setText(change.value, editor).then(success => applyChange(editor, index + 1, changes));
    }

    var edit = new WorkspaceEdit();

    var startPosition = editor.document.positionAt(change.range.start);
    var endPosition = editor.document.positionAt(change.range.end);

    edit.replace(editor.document.uri, new Range(startPosition, endPosition), change.value);

    return workspace.applyEdit(edit).then(success => applyChange(editor, index + 1, changes));
}

function findEditor(editor?: TextEditor, document?: TextDocument) {
    editor = editor || window.activeTextEditor;
    
    if(!editor) {
        window.visibleTextEditors.forEach(visibleEditor => {
            if(!document) {
                if(visibleEditor.document.uri.path.endsWith('.raml')) {
                    editor = visibleEditor;
    
                    document = editor.document;
                }
            }
    
            if(visibleEditor.document === document) {
                editor = visibleEditor;
            }
        });
    }

    return editor;
}

export function setPosition(offset, editor?: TextEditor, document?: TextDocument): void {
    editor = findEditor(editor, document);

    var position = editor.document.positionAt(offset);

    var selection = new Selection(position, position);

    editor.selection = selection;
}

export function getSelectionPosition(): {position: EditorPosition, offset: number} {
    var editor = findEditor(null, null);

    var position = editor.selection.active;

    var offset = editor.document.offsetAt(position);

    return {
        offset,
        position: {
            column: position.character,
            
            lineNumber: position.line
        }
    }
}

export function setSelectionRange(range: EditorRange, editor?: TextEditor, document?: TextDocument): {uri: string, position: number} {
    editor = findEditor(editor, document);

    var selection = new Selection(new Position(range.start.lineNumber, range.start.column), new Position(range.end.lineNumber, range.end.column));

    editor.selection = selection;

    return {
        position : editor.document.offsetAt(selection.active),
        uri: editor.document.uri.path
    };
}

export function getEditorInfo(editor?: TextEditor, document?: TextDocument): EditorInfo {
    editor = findEditor(editor, document);

    document = document || (editor && editor.document);
    
    var selection = editor && editor.selection && editor.selection.active;
    
    return {
        uri: document.uri.path,
        offset: selection ? document.offsetAt(editor.selection.active): 0,
        value: document.getText(),
        position: {
            lineNumber: selection ? selection.line: 0,
            column: selection ? selection.character: 0
        }
    }
}