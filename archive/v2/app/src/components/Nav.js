import NavLink from "./NavLink";

function Nav() {
	return (
		<nav className="flex text-2xl">
			<NavLink label={"Bio"} targetId={"bio"} offset={200} />
			<NavLink label={"Experience"} targetId={"experience"} />
			<NavLink label={"Skills"} targetId={"skills"} />
			<NavLink label={"Projects"} targetId={"projects"} />
		</nav>
	);
}

export default Nav;
