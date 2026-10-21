import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "strict",
  theme: "neutral",
  fontFamily: '"Bricolage Grotesque", sans-serif',
});

await document.fonts.ready;
await mermaid.run({ querySelector: ".mermaid" });

document.querySelectorAll(".mermaid svg").forEach((diagram) => {
  diagram.style.minWidth = `${Math.ceil(diagram.viewBox.baseVal.width)}px`;
});