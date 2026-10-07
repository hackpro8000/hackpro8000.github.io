// Copy-to-clipboard for Discord, reveal on scroll.

// Copy Discord handle
async function copyText(text) {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const field = document.createElement("textarea");
		field.value = text;
		field.style.position = "fixed";
		field.style.opacity = "0";
		document.body.appendChild(field);
		field.select();
		let ok = false;
		try { ok = document.execCommand("copy"); } catch { ok = false; }
		field.remove();
		return ok;
	}
}

const timers = new WeakMap();
for (const button of document.querySelectorAll("[data-copy]")) {
	button.addEventListener("click", async () => {
		const state = button.querySelector(".discord-state");
		const ok = await copyText(button.dataset.copy);
		if (!state) return;
		const idle = state.dataset.idle ?? state.textContent;
		state.dataset.idle = idle;
		state.textContent = ok ? "Copied!" : "Copy failed";
		clearTimeout(timers.get(button));
		timers.set(button, setTimeout(() => { state.textContent = idle; }, 1800));
	});
}

// Reveal on scroll
const revealTargets = document.querySelectorAll(".path, .grid > div, .rules li, .qa details, .contact, .about");
if ("IntersectionObserver" in window) {
	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				entry.target.classList.add("in");
				observer.unobserve(entry.target);
			}
		}
	}, { threshold: 0.12 });
	for (const el of revealTargets) {
		el.classList.add("reveal");
		observer.observe(el);
	}
}


// Hero visual: a real A* search over random cave terrain, drawn step by step.
(function () {
	const canvas = document.getElementById("viz");
	if (!canvas || !canvas.getContext) return;
	const ctx = canvas.getContext("2d");
	const COLS = 28, ROWS = 16;
	const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const css = getComputedStyle(document.documentElement);
	const accent = css.getPropertyValue("--accent").trim() || "#e8a33d";
	const cool = css.getPropertyValue("--fn").trim() || "#8fb4c9";

	let cell = 20, offsetX = 0, offsetY = 0;
	function fit() {
		const ratio = window.devicePixelRatio || 1;
		const width = canvas.clientWidth, height = canvas.clientHeight;
		canvas.width = Math.round(width * ratio);
		canvas.height = Math.round(height * ratio);
		ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		cell = Math.floor(Math.min(width / COLS, height / ROWS));
		offsetX = (width - cell * COLS) / 2;
		offsetY = (height - cell * ROWS) / 2;
	}

	let walls, start, goal, open, cameFrom, cost, closed, path, phase, hold;
	const key = (x, y) => y * COLS + x;
	const NEIGHBORS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

	function heuristic(x, y) { return Math.abs(x - goal.x) + Math.abs(y - goal.y); }

	function solvable(grid) {
		const seen = new Set([key(start.x, start.y)]);
		const queue = [start];
		while (queue.length) {
			const current = queue.pop();
			if (current.x === goal.x && current.y === goal.y) return true;
			for (const [dx, dy] of NEIGHBORS) {
				const x = current.x + dx, y = current.y + dy;
				if (x < 0 || y < 0 || x >= COLS || y >= ROWS || grid[key(x, y)] || seen.has(key(x, y))) continue;
				seen.add(key(x, y));
				queue.push({ x, y });
			}
		}
		return false;
	}

	function reset() {
		start = { x: 1, y: 1 + Math.floor(Math.random() * (ROWS - 2)) };
		goal = { x: COLS - 2, y: 1 + Math.floor(Math.random() * (ROWS - 2)) };
		do {
			walls = new Array(COLS * ROWS).fill(false);
			for (let i = 0; i < walls.length; i++) walls[i] = Math.random() < 0.3;
			walls[key(start.x, start.y)] = false;
			walls[key(goal.x, goal.y)] = false;
		} while (!solvable(walls));
		open = [{ x: start.x, y: start.y, g: 0, f: heuristic(start.x, start.y) }];
		cameFrom = new Map();
		cost = new Map([[key(start.x, start.y), 0]]);
		closed = new Set();
		path = null;
		phase = "search";
		hold = 0;
	}

	function step() {
		if (phase !== "search") return;
		if (!open.length) { phase = "done"; return; }
		let best = 0;
		for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
		const current = open.splice(best, 1)[0];
		if (closed.has(key(current.x, current.y))) return;
		closed.add(key(current.x, current.y));
		if (current.x === goal.x && current.y === goal.y) {
			path = [];
			let at = key(goal.x, goal.y);
			while (at !== undefined) { path.push({ x: at % COLS, y: Math.floor(at / COLS) }); at = cameFrom.get(at); }
			path.reverse();
			phase = "done";
			return;
		}
		for (const [dx, dy] of NEIGHBORS) {
			const x = current.x + dx, y = current.y + dy;
			if (x < 0 || y < 0 || x >= COLS || y >= ROWS || walls[key(x, y)] || closed.has(key(x, y))) continue;
			const g = current.g + 1;
			const previous = cost.get(key(x, y));
			if (previous === undefined || g < previous) {
				cost.set(key(x, y), g);
				cameFrom.set(key(x, y), key(current.x, current.y));
				open.push({ x, y, g, f: g + heuristic(x, y) });
			}
		}
	}

	function draw() {
		const w = canvas.clientWidth, h = canvas.clientHeight;
		ctx.clearRect(0, 0, w, h);
		const pad = Math.max(1, cell * 0.08);
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				const px = offsetX + x * cell, py = offsetY + y * cell, id = key(x, y);
				if (walls[id]) { ctx.fillStyle = "#3b3023"; }
				else if (closed.has(id)) ctx.fillStyle = "rgba(232,163,61,0.22)";
				else ctx.fillStyle = "rgba(255,255,255,0.012)";
				ctx.fillRect(px + pad, py + pad, cell - pad * 2, cell - pad * 2);
			}
		}
		for (const node of open) {
			ctx.fillStyle = "rgba(232,163,61,0.55)";
			ctx.fillRect(offsetX + node.x * cell + cell * 0.3, offsetY + node.y * cell + cell * 0.3, cell * 0.4, cell * 0.4);
		}
		if (path) {
			ctx.save();
			ctx.strokeStyle = accent; ctx.lineWidth = Math.max(2, cell * 0.22); ctx.lineJoin = "round"; ctx.lineCap = "round";
			ctx.shadowColor = accent; ctx.shadowBlur = 12;
			ctx.beginPath();
			path.forEach((p, i) => {
				const px = offsetX + (p.x + 0.5) * cell, py = offsetY + (p.y + 0.5) * cell;
				if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
			});
			ctx.stroke();
			ctx.restore();
		}
		for (const [point, color] of [[start, cool], [goal, accent]]) {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(offsetX + (point.x + 0.5) * cell, offsetY + (point.y + 0.5) * cell, cell * 0.36, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function finishInstantly() { let guard = 0; while (phase === "search" && guard++ < 5000) step(); }

	fit();
	reset();
	window.addEventListener("resize", () => { fit(); draw(); });

	if (reduced) { finishInstantly(); draw(); return; }

	let last = 0, running = true;
	document.addEventListener("visibilitychange", () => { running = !document.hidden; });
	function frame(now) {
		requestAnimationFrame(frame);
		if (!running || now - last < 45) return;
		last = now;
		if (phase === "search") { step(); step(); }
		else if (++hold > 40) reset();
		draw();
	}
	requestAnimationFrame(frame);
})();

document.getElementById("year").textContent = new Date().getFullYear();
