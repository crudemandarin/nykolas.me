import { useEffect, useState } from "react";
import ApiManager from "../api/ApiManager";
import SkillBlock from "../components/SkillBlock";

function Skills() {
	const [skills, setSkills] = useState([]);

	useEffect(() => {
		async function fetchSkills() {
			const data = await ApiManager.getSkills();
			setSkills(data);
		}
		fetchSkills();
	}, []);

	return (
		<section id="skills" className="flex justify-center mb-[200px]">
			<div className="w-3/5 max-w-[1000px]">
				<h2 className="text-3xl mb-5">Skills</h2>
				{skills.length === 0 ? (
					<>Nothing to show!</>
				) : (
					skills.map((skillGroup, i) => {
						let offset = "";
						if ((i + 1) % 2 === 0) offset = "ml-auto";
						return (
							<div
								key={skillGroup.title}
								className={`w-4/5 my-4 ${offset}`}
							>
								<SkillBlock skillGroup={skillGroup} />
							</div>
						);
					})
				)}
			</div>
		</section>
	);
}

export default Skills;
