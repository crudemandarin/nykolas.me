import nykolasPhoto from "../resources/nykolas-photo.jpeg";

import { ReactComponent as TopBorder } from "../resources/svg/top-border.svg";
import { ReactComponent as BottomBorder } from "../resources/svg/bottom-border.svg";

function Bio() {
	return (
		<>
			<TopBorder />
			<section id="bio" className="flex justify-center bg-violet-600">
				<div className="w-4/5 max-w-[1000px] flex py-20">
					<div className="w-full flex items-center">
						<div className="bg-white py-5 px-10 rounded-lg">
							<h2 className="text-3xl">About Me</h2>

							<div className="py-3 text-slate-500 font-semibold">
								<p>Cloud @ Google ⚡</p>

								<p>
									BS, Computer Science @ University of Houston
									🎓
								</p>
							</div>

							<p>
								I’m a vibrant, ambitious, and growth-driven
								tech-junkie. I enjoy solving problems and
								building things.
							</p>

							<p className="py-3">
								Over several years of profession, student
								involvement, and personal endeavors, I have
								designed useful software and cloud
								infrastructure, led and mentored peers, and
								worked collaboratively to drive team success.
							</p>
						</div>
					</div>
					<div className="w-full flex justify-end">
						<div className="w-2/3 max-w-[275px]">
							<img
								className="rounded-lg"
								src={nykolasPhoto}
								alt="Nykolas"
							></img>
						</div>
					</div>
				</div>
			</section>
			<BottomBorder />
		</>
	);
}

export default Bio;
