// Copied from https://github.com/ejrbuss/markdown-to-txt/tree/main
import { marked } from "marked";
import pkg from "lodash";
const { unescape } = pkg;

import Mustache from "mustache";

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

/**
 * Converts markdown text to plain text
 * @param {string} markdown - The markdown text to convert
 * @param {Object} options - Options to pass to the markdown parser
 * @returns {string} The converted plain text
 */
export function markdownToText(markdown, options) {
  const unmarked = marked(markdown, { ...options, renderer: TxtRenderer });
  const unescaped = unescape(unmarked);
  const trimmed = unescaped.trim();

  return trimmed;
}

/**
 * Removes redundant newlines from text by replacing double newlines with single newlines
 * @param {string} input - The text to process
 * @returns {string} Text with redundant newlines removed
 */
export function removeRedundantNewlines(input) {
  return input.replaceAll("\n\n", "\n");
}

/**
 * Extracts content between XML/HTML-style tags
 * @param {string} content - The text containing tagged content
 * @param {string} tag - The tag name to search for
 * @returns {string[]} Array of extracted content between tags
 */
export function extractContentBetweenTags(content, tag) {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "gs"); // Use 's' flag for multiline matching
  const matches = content.matchAll(regex);
  const extractedContent = [];

  for (const match of matches) {
    extractedContent.push(match[1]);
  }

  return extractedContent;
}

/**
 * Renders a list of chat messages using Mustache templating
 * @param {Array<Object>} messages - Array of message objects with role and content properties
 * @param {Object} context - Context object containing values to interpolate into message content
 * @returns {Array<Object>} Array of rendered message objects with interpolated content
 */
export function renderChatMessages(messages, context) {
  return messages.map((message) => {
    const role = message["role"];
    const content = message["content"];

    return {
      role: role,
      content: Mustache.render(content, context),
    };
  });
}
