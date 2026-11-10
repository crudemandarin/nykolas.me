import Socials from "../components/Socials";

import { ReactComponent as NykolasLogo } from "../resources/svg/nykolas-logo-animated.svg";

import NavLink from "../components/NavLink";

function Footer() {
	return (
		<section id="footer" className="w-full mt-[100px]">
			<div className="flex justify-center mb-14">
				<NavLink label={"Back To Top"} targetId={"hero"} offset={0} />
				<div className="p-4" />
			</div>
			<div className="flex justify-center">
				<NykolasLogo className="w-[100px] h-[100px]" />
			</div>
			<div className="text-center">
				<p className="text-xl py-2">nykolasfarhangi@protonmail.com</p>
				<div className="flex justify-center mb-10">
					<Socials />
				</div>
				<p className="text-2xl">
					Designed and Built by{" "}
					<span className="font-bold">Nykolas Farhangi</span>
				</p>
				<div className="h-10"></div>
			</div>
		</section>
	);
}

export default Footer;
