function Button({ label, active }) {
	const background = active
		? "bg-violet-600 text-white"
		: "bg-green-500 group-hover:bg-purple-300";
	const primary =
		background +
		" px-5 py-1.5 rounded-md transition-colors absolute bottom-[-5px] right-[-8px] z-0";

	const secondary = "px-5 py-1.5 rounded-md bg-slate-400";

	return (
		<div className="group relative w-fit">
			<div className={primary}>{label}</div>
			<div className={secondary}>{label}</div>
		</div>
	);
}

export default Button;
