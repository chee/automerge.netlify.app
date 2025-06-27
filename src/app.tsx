import {isValidAutomergeUrl, type DocHandle} from "@automerge/vanillajs"
import {createSignal, For} from "solid-js"
import {makeDocumentProjection} from "solid-automerge"
import repo from "./automerge/repo.ts"

interface Action {
	title: string
	complete?: Date | null
}

interface Project {
	title: string
	actions: Action[]
}

const hash = location.hash.slice(1)

let handle: DocHandle<Project>
if (isValidAutomergeUrl(hash)) {
	handle = await repo.find<Project>(hash)
} else {
	handle = repo.create<Project>({
		title: "My project",
		actions: [
			{
				title: "eat cheese",
			},
			{
				title: "buy cheese",
				complete: new Date(),
			},
		],
	})
	location.hash = handle.url
}

export default function App() {
	const doc = makeDocumentProjection(handle)
	const [newAction, setNewAction] = createSignal("")
	return (
		<article class="project" data-automerge-url={handle.url}>
			<h1>{doc.title}</h1>
			<form
				class="new-action"
				onsubmit={event => {
					event.preventDefault()
					if (!newAction()) return
					handle.change(doc => {
						doc.actions.push({title: newAction()})
					})
					setNewAction("")
				}}
			>
				<input
					class="new-action__text"
					placeholder="new action"
					value={newAction()}
					oninput={event => setNewAction(event.target.value)}
				/>
				<button class="new-action__submit" type="submit">
					add
				</button>
			</form>

			<ul>
				<For each={doc.actions}>
					{(action, index) => {
						return (
							<li>
								<input
									type="checkbox"
									checked={!!action.complete}
									onclick={() => {
										handle.change(doc => {
											const action = doc.actions[index()]
											if (action.complete) {
												action.complete = null
											} else {
												action.complete = new Date()
											}
										})
									}}
								/>{" "}
								{action.title}
							</li>
						)
					}}
				</For>
			</ul>
		</article>
	)
}
