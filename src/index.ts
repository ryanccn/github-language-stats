import "@total-typescript/ts-reset";

import { languageQuery } from "./graphql";
import { optimize } from "svgo";
import { mkdir, rm, writeFile } from "fs/promises";

const css = (mode: "light" | "dark") => {
	const color1 = mode === "dark" ? "#171717" : "white";
	const color2 = mode === "dark" ? "white" : "#171717";
	const color3 = mode === "dark" ? "#f5f5f5" : "#171717";
	const color4 = mode === "dark" ? "#262626" : "#e5e5e5";

	return `
	svg {
		font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
		font-size: 14px;
		line-height: 150%;
		border-radius: 6px;
	}
	
	#background {
		width: calc(100% - 10px);
		height: calc(100% - 10px);
		fill: ${color1};
		stroke: #737373;
		stroke-width: 0.5px;
		rx: 6px;
		ry: 6px;
	}
	
	foreignObject {
		width: calc(100% - 10px - 32px);
		height: calc(100% - 10px - 24px);
	}
	
	h2 {
		margin-top: 0;
		margin-bottom: 0.75em;
		line-height: 24px;
		font-size: 16px;
		font-weight: 600;
		color: ${color3};
		fill: ${color3};
	}
	
	div.root {
		height: 100%;
		overflow-x: hidden;
		text-overflow: ellipsis;
	}
	
	.bar {
		display: flex;
		height: 8px;
		margin-bottom: 1rem;
		overflow: hidden;
		background-color: ${color4};
		border-radius: 6px;
		outline: 1px solid transparent;
	}
	
	.bar-item {
		outline: 2px solid ${color4};
		border-collapse: collapse;
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		column-gap: 0.5rem;
		row-gap: 0.35rem;

		font-size: 0.85rem;
		list-style: none;

		padding-left: 0;
		margin-top: 0;
		margin-bottom: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.dot {
		display: block;
		width: 8px;
		height: 8px;
		border-radius: 9999px;
	}
	
	.language {
		font-weight: 600;
		color: ${color2};
	}
	
	.percentage {
		color: ${color2};
	}
	`.trim();
};

const main = async () => {
	const res = await languageQuery({});
	if (!res.success) {
		throw res.response;
	}

	const {
		data: { data },
	} = res;

	const processedData = data.viewer.repositories.nodes
		?.filter((n) => n?.owner.login === data.viewer.login)
		.flatMap(
			(n) =>
				n?.languages?.edges?.flatMap((l) => ({
					size: l?.size,
					name: l?.node.name,
					color: l?.node.color,
				})),
		)
		.filter(Boolean);

	if (!processedData) {
		throw new Error("Could not find any language data!");
	}

	const languages: { [language: string]: { size: number; color: string } } = {};

	for (const { name, color, size } of processedData) {
		if (!name || !color || !size) return;
		languages[name] ??= { color, size: 0 };
		languages[name].size += size;
	}

	const sorted = Object.entries(languages).sort((a, b) => b[1].size - a[1].size);
	const totalSize = sorted.map((l) => l[1].size).reduce((prev, cur) => prev + cur);

	const svg = (mode: "light" | "dark") =>
		`
<svg width="360" height="264" xmlns="http://www.w3.org/2000/svg">
	<style>${css(mode)}</style>
	<g>
		<rect x="5" y="5" id="background" />
		<g>
			<foreignObject x="21" y="17" width="318" height="240">
				<div xmlns="http://www.w3.org/1999/xhtml" class="root">
					<h2>Languages Used</h2>
					<div>
						<span class="bar">${sorted
							.map((lang) =>
								`
								<span
									style="background-color: ${lang[1].color}; width: ${((lang[1].size / totalSize) * 100).toFixed(10)}%;"
									class="bar-item">
								</span>`.trim(),
							)
							.join("\n")}</span>
					</div>
					<ul>
					${sorted
						.map((lang) =>
							`
						<li>
							<span class="dot" style="background-color: ${lang[1].color};"></span>
							<span class="language">${lang[0]}</span>
							<span class="percentage">${((lang[1].size / totalSize) * 100).toFixed(1)}%</span>
						</li>
						`.trim(),
						)
						.join("\n")}
					</ul>
				</div>
			</foreignObject>
		</g>
	</g>
</svg>
	`.trim();

	await rm("dist", { recursive: true, force: true });
	await mkdir("dist");
	await writeFile("dist/light.svg", optimize(svg("light")).data + "\n");
	await writeFile("dist/dark.svg", optimize(svg("dark")).data + "\n");
};

main();
