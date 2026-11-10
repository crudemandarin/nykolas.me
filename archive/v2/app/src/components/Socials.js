import githubIcon from "../resources/logos/github-icon.png";
import linkedInIcon from "../resources/logos/linkedin-icon.png";
import resumeIcon from "../resources/logos/resume-icon.png";

function Socials() {
	return (
		<div className="flex py-2">
			<a
				href="https://github.com/crudemandarin"
				target="_blank"
				rel="noreferrer"
			>
				<img className="h-8 pr-3" src={githubIcon} alt="GitHub" />
			</a>
			<a
				href="https://www.linkedin.com/in/nykolasfarhangi/"
				target="_blank"
				rel="noreferrer"
			>
				<img className="h-8 px-3" src={linkedInIcon} alt="LinkedIn" />
			</a>
			<a
				href="https://s3.amazonaws.com/nykolas.me/Nykolas+Farhangi+Resume.pdf"
				target="_blank"
				rel="noreferrer"
			>
				<img className="h-8 pl-3" src={resumeIcon} alt="Resume" />
			</a>
		</div>
	);
}

export default Socials;
