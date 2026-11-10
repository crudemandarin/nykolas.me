import { ReactComponent as BottomBorder } from "../resources/svg/bottom-border.svg";

/**
 * project = {
 *  id: string,
 *  title: string,
 *  img: Image,
 *  shortDesc: string,
 *  tags: string[]
 * }
 */
function ProjectPanel({ project }) {
	return (
		<>
			<section
				id={project.id}
				className="flex justify-center bg-violet-600 h-[500px]"
				style={{
					"box-shadow": "inset 0 7px 9px -7px rgba(0,0,0,0.6)",
				}}
			></section>
			<BottomBorder />
		</>
	);
}

export default ProjectPanel;
