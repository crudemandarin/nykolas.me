import { useState } from "react";
import Button from "./Button";

/**
 * experiences = string[]
 */

function TableNav({ experiences, selectIndex, setSelectIndex }) {
	return (
		<>
			{experiences.map((experience, index) => (
				<div
					key={`${experience.company}-container`}
					className={"mb-4"}
					onClick={() => setSelectIndex(index)}
				>
					<Button
						key={`${experience.company}`}
						label={experience.company}
						active={index === selectIndex}
					/>
				</div>
			))}
		</>
	);
}

/**
 * positions = position[]
 * position = {
 * 		title: string,
 * 		range: string,
 * 		bullets: string[]
 * }
 */

function TableContent({ positions }) {
	return (
		<>
			{positions.map((position) => (
				<div key={position.title}>
					<div className="text-xl font-bold">{position.title}</div>
					<div className="mb-1 text-slate-500	font-semibold">
						{position.range}
					</div>
					<ul className="list-disc pl-6 mb-8">
						{position.bullets.map((bullet) => (
							<li key={`${position.title}.${bullet}`}>
								{bullet}
							</li>
						))}
					</ul>
				</div>
			))}
		</>
	);
}

/**
 * experiences = [ experience ]
 * experience = {
 * 	company: string,
 * 	positions: position[]
 * }
 */

function ExperienceTable({ experiences }) {
	const [selectIndex, setSelectIndex] = useState(0);

	return (
		<>
			<div className="w-1/4 min-w-[240px] pr-16 flex flex-col items-end">
				<TableNav
					experiences={experiences}
					selectIndex={selectIndex}
					setSelectIndex={setSelectIndex}
				/>
			</div>
			<div className="max-w-3/4 pl-16 border-l-4 border-slate-200 border-solid">
				<img
					className="h-[80px] my-10"
					src={experiences[selectIndex].logo}
					alt="logo"
				/>
				<TableContent positions={experiences[selectIndex].positions} />
			</div>
		</>
	);
}

export default ExperienceTable;
