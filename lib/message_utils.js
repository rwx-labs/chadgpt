// Copied from https://github.com/ejrbuss/markdown-to-txt/tree/main
const { marked } = require("marked");
const { unescape } = require("lodash");

const block = (text) => text + "\n\n";
const escapeBlock = (text) => text + "\n\n";
const line = (text) => text + "\n";
const inline = (text) => text;
const codespan = (text) => `\`${text}\``;
const newline = () => "\n";
const empty = () => "";

const TxtRenderer = {
  // Block elements
  code: escapeBlock,
  blockquote: block,
  html: empty,
  heading: block,
  hr: newline,
  list: (text) => block(text.trim()),
  listitem: line,
  checkbox: empty,
  paragraph: block,
  table: (header, body) => line(header + body),
  tablerow: (text) => line(text.trim()),
  tablecell: (text) => text + " ",
  // Inline elements
  strong: inline,
  em: inline,
  codespan: codespan,
  br: newline,
  del: inline,
  link: (_0, _1, text) => text,
  image: (_0, _1, text) => text,
  text: inline,
  // etc.
  options: {},
};

function markdownToText(markdown, options) {
  const unmarked = marked(markdown, { ...options, renderer: TxtRenderer });
  const unescaped = unescape(unmarked);
  const trimmed = unescaped.trim();

  return trimmed;
}

function removeRedundantNewlines(input) {
  return input.replaceAll("\n\n", "\n");
}

module.exports = { markdownToText, removeRedundantNewlines };
