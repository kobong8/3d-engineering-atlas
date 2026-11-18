import { readFileSync, writeFileSync } from "node:fs";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true });
const escape = md.utils.escapeHtml;
const renderFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, index, options, env, renderer) => {
  const token = tokens[index];
  if (token.info === "atlas-flow") {
    const [caption, ...steps] = token.content.trim().split("\n");
    return `<figure class="lesson-figure"><figcaption>${escape(caption)}</figcaption><ol class="lesson-flow">${steps.map(step => `<li>${escape(step)}</li>`).join("")}</ol></figure>\n`;
  }
  if (token.info === "atlas-sketch") {
    const [caption, ...rows] = token.content.trimEnd().split("\n");
    return `<figure class="lesson-figure"><figcaption>${escape(caption)}</figcaption><pre class="lesson-sketch">${escape(rows.join("\n"))}</pre></figure>\n`;
  }
  return renderFence(tokens, index, options, env, renderer);
};
const source = readFileSync(new URL("../content/LECTURES.md", import.meta.url), "utf8");
const tokens = md.parse(source, {});
const headings = tokens.filter(token => token.type === "heading_open" && token.tag === "h2" && token.level === 0);
const lines = source.split("\n");
function renderLesson(markdown) {
  const html = md.render(markdown);
  return html.replace(
    /<p><strong>확인 문제\.<\/strong> ([^\n]*?)(?:<\/p>\n<p>| )<strong>해설\.<\/strong> ([^\n]+)<\/p>/g,
    (_, question, solution) => `<div class="self-check"><p><strong>확인 문제.</strong> ${question}</p><details><summary>해설 보기</summary><p>${solution}</p></details></div>`,
  );
}
const sections = headings.map((heading, index) => {
  const [start] = heading.map;
  const end = headings[index + 1]?.map[0];
  const title = lines[start].slice(3);
  const number = title.match(/^(\d{2})\./)?.[1];
  return {
    title, number, id: number ? `track-${number}` : start === headings[0].map[0] ? "principles" : "map",
    body: renderLesson(lines.slice(start + 1, end).join("\n")),
  };
});
const tracks = sections.filter(section => Number(section.number) <= 20);
if (tracks.length !== 20 || sections.length !== 28) throw new Error("Unexpected curriculum structure");

const labs = {
  "02": [["coordinates", "좌표계와 변환"]],
  "03": [["mesh", "Vertex와 Index"]],
  "05": [["bounds", "AABB와 회전"]],
  "06": [["collision", "AABB 교차"]],
  "07": [["camera", "카메라 FOV"]],
  "08": [["light", "빛과 재질"]],
  "10": [["instances", "Thin Instance 비교"]],
  "11": [["path", "격자 경로 탐색"]],
  "12": [["path", "A*와 Dijkstra"]],
  "13": [["layout", "블록 배치"]],
  "17": [["coordinates", "Ray Picking"]],
  "21": [["path", "A*와 Dijkstra"]],
  "22": [["layout", "블록 배치"]],
};
const references = {
  "01": "https://doc.babylonjs.com/typedoc/classes/BABYLON.Vector3",
  "02": "https://doc.babylonjs.com/typedoc/classes/BABYLON.Matrix",
  "03": "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html",
  "04": "https://doc.babylonjs.com/typedoc/classes/BABYLON.VertexData",
  "05": "https://doc.babylonjs.com/typedoc/classes/BABYLON.BoundingBox",
  "06": "https://doc.babylonjs.com/typedoc/classes/BABYLON.AbstractMesh#intersectsMesh",
  "07": "https://doc.babylonjs.com/typedoc/classes/BABYLON.Camera",
  "08": "https://doc.babylonjs.com/typedoc/classes/BABYLON.PBRMaterial",
  "09": "https://www.w3.org/TR/webgpu/",
  "10": "https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances",
  "11": "https://recastnav.com/",
  "12": "https://recastnav.com/",
  "13": "https://lavalle.pl/planning/",
  "14": "https://doc.babylonjs.com/typedoc/classes/BABYLON.PhysicsBody",
  "15": "https://www.buildingsmart.org/standards/bsi-standards/industry-foundation-classes/",
  "16": "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html",
  "17": "https://doc.babylonjs.com/typedoc/classes/BABYLON.PickingInfo",
  "18": "https://www.ogc.org/standard/3dtiles/",
  "19": "https://www.ogc.org/standard/3dtiles/",
  "20": "https://www.w3.org/TR/WCAG22/",
};
const link = section => `<a href="#${section.id}">${escape(section.title)}</a>`;
const lessons = sections.map(section => {
  const demos = (labs[section.number] ?? []).map(([id, title]) => `<a class="button" href="./labs.html#${id}">${title} 실습</a>`).join("");
  const reference = references[section.number];
  return `<article class="chapter course" id="${section.id}" tabindex="-1">
    <h2>${escape(section.title)}</h2>
    ${demos ? `<div class="course-tools">${demos}</div>\n    ` : ""}<div class="body-blocks">${section.body}</div>${reference ? `\n    <p class="source-link"><a href="${reference}">공식 문서 및 기술 자료</a></p>` : ""}
  </article>`;
}).join("\n");
const template = readFileSync(new URL("./index.template.html", import.meta.url), "utf8");
writeFileSync(new URL("../index.html", import.meta.url), template
  .replace("<!-- TRACKS -->", () => tracks.map(track => `<li data-track="${track.id}">${link(track)}</li>`).join("\n"))
  .replace("<!-- OUTLINE -->", () => sections.map(section => `<li>${link(section)}</li>`).join("\n"))
  .replace("<!-- OPTIONS -->", () => sections.map(section => `<option value="${section.id}">${escape(section.title)}</option>`).join("\n"))
  .replace("<!-- LESSONS -->", () => lessons));
