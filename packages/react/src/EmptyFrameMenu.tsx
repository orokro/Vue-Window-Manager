/*
	EmptyFrameMenu.tsx
	------------------

	What an empty docked frame shows instead of nothing.

	Two affordances, both from the Vue original:

	  - a picker grid of every available window kind, so an empty frame is a place to
	    put something rather than a dead end
	  - merge arrows on each edge that has an exactly-adjacent neighbour, because in a
	    no-overlap tiling system "close this frame" really means "let a neighbour have
	    the space", and that isn't obvious to anyone arriving from a tabbed editor

	Only relevant to SINGLE and TABBED frames. An empty floating desktop is a perfectly
	reasonable thing to have, so MWI has its own hint instead.
*/

import { EDGE, EDGE_NEIGHBOR_STATUS, WindowFrame, type Edge } from '@win-mgr/core';
import { useWindowManager, type ReactWindowFrame } from './context';
import { useReactive } from './useReactive';


export function EmptyFrameMenu({ frame }: { frame: ReactWindowFrame }): JSX.Element {

	const mgr = useWindowManager();

	// re-read when the layout shifts, so the arrows appear and vanish with adjacency
	const edgeKey = useReactive(() => (
		`${frame.neighborStatus.t}|${frame.neighborStatus.b}|${frame.neighborStatus.l}|${frame.neighborStatus.r}`
	));

	const showMergeButtons = useReactive(() => mgr.showMergeButtons.value);
	const kinds = mgr.availableWindowList.getWindows();

	const canMerge = (edge: Edge): boolean =>
		frame.neighborStatus[edge] === EDGE_NEIGHBOR_STATUS.ADJACENT;

	/**
	 * Lets the neighbour on an edge expand over this frame.
	 *
	 * @param edge - the edge whose neighbour should take the space
	 */
	const mergeAway = (edge: Edge): void => {

		const neighbor = frame.neighbors[edge];
		if (neighbor === null)
			return;

		// keep the NEIGHBOUR and merge across its facing edge, which is us
		mgr.mergeWindowFrames(neighbor, WindowFrame.getOppositeEdge(edge));
	};

	const arrows: ReadonlyArray<{ edge: Edge; cls: string; glyph: string }> = [
		{ edge: EDGE.TOP, cls: 'up', glyph: '▲' },
		{ edge: EDGE.BOTTOM, cls: 'down', glyph: '▼' },
		{ edge: EDGE.LEFT, cls: 'left', glyph: '◀' },
		{ edge: EDGE.RIGHT, cls: 'right', glyph: '▶' },
	];

	return (
		<div className="emptyFrameMenu" data-edges={edgeKey}>

			<div className="pickerGrid">
				{kinds.map(kind => (
					<button
						type="button"
						key={kind.slug}
						className="pickerItem"
						onClick={() => frame.addWindow(mgr.createWindow(kind.slug))}
					>
						{kind.icon !== ''
							? <img className="pickerIcon" src={kind.icon} alt="" />
							: <span className="pickerIcon placeholder">▢</span>}
						<span className="pickerLabel">{kind.title}</span>
					</button>
				))}

				{kinds.length === 0 && (
					<div className="pickerEmpty">No window kinds registered</div>
				)}
			</div>

			{showMergeButtons && arrows.filter(a => canMerge(a.edge)).map(a => (
				<button
					type="button"
					key={a.cls}
					className={`mergeArrow ${a.cls}`}
					title="Merge this space into the neighbouring frame"
					onClick={() => mergeAway(a.edge)}
				>
					{a.glyph}
				</button>
			))}
		</div>
	);
}
