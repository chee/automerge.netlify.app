/** @jsxImportSource solid-js */
import {drawSelection, keymap, placeholder} from "@codemirror/view"
import {automergeSyncPlugin} from "@automerge/automerge-codemirror"
import {EditorView} from "@codemirror/view"
import {Compartment, EditorState, type Extension} from "@codemirror/state"
import {defaultKeymap, history, historyKeymap} from "@codemirror/commands"

import {HighlightStyle, syntaxHighlighting} from "@codemirror/language"
import {tags} from "@lezer/highlight"
import {createEffect} from "solid-js"

import {DocHandle, Prop} from "@automerge/vanillajs"

export default function TitleEditor(props: {
	handle: DocHandle<{title: string}>
	path: Prop[]
	blur(): void
	submit(): void
	placeholder?: string
	syncExtension?: Extension
	readonly?(): boolean
}) {
	const parent = (<div style={{height: "100%"}} />) as HTMLDivElement
	const readonly = new Compartment()
	const themeCompartment = new Compartment()
	const placeholderCompartment = new Compartment()
	const editable = new Compartment()
	const isReadonly = () => props.readonly?.() || false
	const isEditable = () => !isReadonly()
	const view: EditorView = new EditorView({
		parent: parent,
		doc: props.handle.doc().title,
		extensions: [
			history(),
			drawSelection(),
			EditorState.transactionFilter.of(tr => (tr.newDoc.lines > 1 ? [] : tr)),
			placeholderCompartment.of(placeholder(props.placeholder || "")),
			themeCompartment.of(EditorView.theme(theme)),
			syntaxHighlighting(plain),
			keymap.of([
				...defaultKeymap,
				...historyKeymap,
				{
					key: "Escape",
					run(view: EditorView) {
						view.contentDOM.blur()
						props.blur()
						return true
					},
				},
				{
					key: "Enter",
					run(view: EditorView) {
						view.contentDOM.blur()
						props.blur()
						props.submit()
						return true
					},
				},
			]),
			EditorView.contentAttributes.of({
				autocorrect: "true",
				spellcheck: "true",
				autocapitalize: "true",
			}),
			readonly.of(EditorState.readOnly.of(isReadonly())),
			editable.of(EditorView.editable.of(isEditable())),
			EditorView.lineWrapping,
			automergeSyncPlugin({handle: props.handle, path: props.path}),
		],
	})

	createEffect(() => {
		view.dispatch({
			effects: [
				readonly.reconfigure(EditorState.readOnly.of(isReadonly())),
				editable.reconfigure(EditorView.editable.of(isEditable())),
			],
		})
	})

	createEffect(() => {
		view.dispatch({
			effects: themeCompartment.reconfigure(EditorView.theme(theme)),
		})
	})

	createEffect(() => {
		view.dispatch({
			effects: placeholderCompartment.reconfigure(
				placeholder(props.placeholder || "")
			),
		})
	})

	parent.addEventListener("keydown", event => event.stopImmediatePropagation())
	return parent
}

const plain = HighlightStyle.define([
	{
		tag: tags.content,
		fontFamily: "system-ui, sans-serif",
	},
])

export const theme = {
	".cm-placeholder": {
		color: "#666",
	},
	"&.cm-focused": {
		outline: "none",
	},
	"&.cm-editor": {
		width: "100%",
	},
	"&.cm-editor .cm-line": {
		padding: 0,
	},
}
