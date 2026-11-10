import Typewriter from "typewriter-effect";

import Nav from "../components/Nav";
import Socials from "../components/Socials";

import { ReactComponent as NykolasLogo } from "../resources/svg/nykolas-logo-animated.svg";
import { ReactComponent as DownDown } from "../resources/svg/down down.svg";

function Hero() {
	return (
		<section
			id="hero"
			className="flex justify-center"
			style={{ height: "75vh" }}
		>
			<div className="w-4/5 h-full flex flex-col">
				<div className="flex flex-grow items-center">
					<div className="w-full">
						<p className="text-2xl tracking-wider">
							Hello, World! My name is
						</p>

						<div className="my-1" />

						<h1 className="text-7xl py-3">Nykolas Farhangi</h1>

						<div className="my-2" />

						<div className="flex text-2xl tracking-wider">
							<div>I'm a multi-talented</div>
							<div className="mx-1" />
							<span className="text-green-500">
								<Typewriter
									onInit={(typewriter) => {
										typewriter
											.typeString("software engineer")
											.pauseFor(4000)
											.deleteAll()
											.typeString("cloud architect")
											.pauseFor(4000)
											.deleteAll()
											.typeString("human being")
											.start();
									}}
								/>
							</span>
						</div>

						<div className="my-6" />

						<Socials />
					</div>
					<div className="w-full flex justify-end">
						<NykolasLogo />
					</div>
				</div>
				<div className="flex items-center">
					<div className="w-full flex justify-between items-center">
						<div className="flex items-center">
							<div className="text-2xl tracking-wider">
								<p>Scroll to learn more</p>
							</div>
							<div className="mx-3" />
							<div
								className="rounded-xl bg-slate-400 flex justify-center items-center"
								style={{ width: "24px", height: "40px" }}
							>
								<DownDown width="16px" height="30px" />
							</div>
						</div>
						<Nav />
					</div>
				</div>
			</div>
		</section>
	);
}

export default Hero;
