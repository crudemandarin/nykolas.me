function NavLink({ label, targetId, offset = 75 }) {
	function onClick(e) {
		e.preventDefault();
		const section = document.getElementById(targetId);
		const top = section.getBoundingClientRect().top - offset;
		window.scrollTo({ top, behavior: "smooth" });
	}

	return (
		<a
			href={`/#${targetId}`}
			onClick={onClick}
			className="group relative ml-8"
		>
			<div className="px-5 py-1.5 rounded-md bg-green-500 group-hover:bg-purple-300 click: transition-colors absolute bottom-[-5px] right-[-8px] z-0">
				{label}
			</div>
			<div className="px-5 py-1.5 rounded-md bg-slate-400">{label}</div>
		</a>
	);
}

export default NavLink;
