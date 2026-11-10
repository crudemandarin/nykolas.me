/**
 * skillGroup = { title: string, skills: string[] || { logo: string, label: string }[], bgColor: string }
 */
function SkillBlock({ skillGroup }) {
	function renderSkills() {
		const skills = skillGroup.skills;
		if (!skills.length) return undefined;

		if (typeof skills[0] === "string") {
			return skills.map((skill) => (
				<div
					key={`${skillGroup.title}.${skill}`}
					className="bg-white tracking-wide w-fit h-fit px-2 py-1 m-1 rounded-md"
				>
					{skill}
				</div>
			));
		}

		return skills.map((skill) => (
			<a
				href={skill.link}
				target="_blank"
				rel="noreferrer"
				className="rounded-md hover:bg-slate-200 mr-3 mb-2"
			>
				<img
					className="h-[160px] p-1"
					src={skill.logo}
					alt={skill.label}
				/>
			</a>
		));
	}

	return (
		<div className={`w-fit flex p-3 rounded-lg ${skillGroup.bgColor}`}>
			<div className="max-w-[200px]">
				<p className="pr-10 text-2xl font-bold text-white">
					{skillGroup.title}
				</p>
			</div>
			<div className="flex flex-wrap">{renderSkills()}</div>
		</div>
	);
}

export default SkillBlock;
