/**
 * project = {
 *  title: string,
 *  img: Image,
 *  shortDesc: string,
 *  tags: string[]
 * }
 */
function ProjectPreview({ project }) {
	return (
		<div className="flex flex-col w-[280px] h-[220px] p-3 bg-slate-200 rounded-md">
			<div>
				<img
					className="h-[55px] mb-1"
					src={project.img}
					alt={`${project.title} Icon`}
				/>
			</div>
			<p className="mb-1 text-2xl font-bold">{project.title}</p>
			<p>{project.shortDesc}</p>
			<div className="flex-grow" />
			<div className="flex">
				{project.tags.map((tag) => (
					<p
						key={`${project.title}.${tag}`}
						className="mr-3 text-green-500 font-semibold"
					>
						{tag}
					</p>
				))}
			</div>
		</div>
	);
}

export default ProjectPreview;
