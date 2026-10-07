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

document.getElementById("year").textContent = new Date().getFullYear();
