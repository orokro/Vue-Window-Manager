/*
	windows.tsx
	-----------

	Sample window components for the demo.

	These are deliberately stateful in different ways, because that's what makes the
	stable-host-div portal worth proving: NotesWindow holds uncontrolled DOM state
	(a textarea), CounterWindow holds React state, and CanvasWindow holds state that
	only exists inside a DOM node's internal buffer. If a re-dock ever regresses to a
	remount, all three break visibly.
*/

import { useEffect, useRef, useState } from 'react';


export function NotesWindow(): JSX.Element {
	return (
		<div className="demoWindow">
			<h3>Notes</h3>
			<p className="hint">
				Uncontrolled textarea. Type here, then split or resize &mdash; the text must survive.
			</p>
			<textarea
				className="notes"
				defaultValue=""
				placeholder="type something..."
			/>
		</div>
	);
}


export function CounterWindow(): JSX.Element {

	const [count, setCount] = useState(0);
	const mounts = useRef(0);

	useEffect(() => {
		mounts.current += 1;
	}, []);

	return (
		<div className="demoWindow">
			<h3>Counter</h3>
			<p className="hint">React state. Should not reset when the layout changes.</p>
			<div className="counterRow">
				<button type="button" onClick={() => setCount(c => c - 1)}>&minus;</button>
				<span className="count" data-testid="count">{count}</span>
				<button type="button" onClick={() => setCount(c => c + 1)}>+</button>
			</div>
		</div>
	);
}


export function CanvasWindow(): JSX.Element {

	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	// draw once, on mount. if the component ever remounts, the drawing is lost -
	// which makes this a very loud canary for portal behaviour
	useEffect(() => {

		const canvas = canvasRef.current;
		if (canvas === null)
			return;

		const ctx = canvas.getContext('2d');
		if (ctx === null)
			return;

		const stamp = Math.floor(Math.random() * 360);

		ctx.fillStyle = `hsl(${stamp} 70% 45%)`;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		ctx.fillStyle = 'rgba(255,255,255,0.9)';
		ctx.font = '16px system-ui, sans-serif';
		ctx.fillText(`drawn once @ hue ${stamp}`, 12, 30);

	}, []);

	return (
		<div className="demoWindow">
			<h3>Canvas</h3>
			<p className="hint">Painted once on mount. A remount would repaint it a different colour.</p>
			<canvas ref={canvasRef} width={320} height={120} className="canvas" />
		</div>
	);
}


export function ReadmeWindow(): JSX.Element {
	return (
		<div className="demoWindow">
			<h3>How to drive this</h3>
			<ul className="readme">
				<li><strong>Resize:</strong> drag any border between two frames. Everything colinear moves together.</li>
				<li><strong>Split:</strong> drag <em>inward</em> from a corner handle, then click to place the cut.</li>
				<li><strong>Merge:</strong> drag <em>outward</em> from a corner handle toward the neighbour you want to absorb.</li>
				<li>Reverse direction mid-drag to swap between split and merge.</li>
			</ul>
		</div>
	);
}
