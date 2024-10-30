// Copied from https://github.com/ejrbuss/markdown-to-txt/tree/main
const { marked } = require("marked");
const { unescape } = require("lodash");

function block({ tokens }) {
  const text = this.parser.parseInline(tokens);
  return `${text}\n\n`;
};
function escapeBlock(token) {
  // const text = this.parser.parseInline(tokens);
  return `${token.text}\n\n`;
}
const newline = () => "\n";
const empty = () => "";

const renderer = {
  code({ text }) {
    // TODO: ASCII 0x11
    // const text = this.parser.parseInline(ctx.tokens);
    return `${text}\n\n`;
  },

  codespan(token) {
    // TODO: ASCII 0x11
    return `\`${token.text}\``;
  },

  strong(token) {
    // TODO: ASCII 0x02
    return `${this.parser.parseInline(token.tokens)}`;
  },

  em(token) {
    // TODO: ASCII 0x1D
    return `${this.parser.parseInline(token.tokens)}`;
  },

  blockquote(token) {
    console.log({ blockquote: token.tokens });

    return `${this.parser.parseInline(token.tokens)}`;
  },

  table(token) {
    let header = '|';

    // header
    for (let j = 0; j < token.header.length; j++) {
      let cell = this.tablecell(token.header[j]);
      header += ` ${cell} |`;
    }

    header += "\n";

    for (let j = 0; j < token.header.length; j++) {
      let cell = this.tablecell(token.header[j]);

      header += `|${'-'.repeat(cell.length + 2)}`;
    }

    header += "|";

    let body = '';
    let cell = '';
    for (let j = 0; j < token.rows.length; j++) {
      const row = token.rows[j];

      cell = '|';
      for (let k = 0; k < row.length; k++) {
        cell += ` ${this.tablecell(row[k])} |`;
      }

      body += cell + "\n";
    }

    return header + "\n" + body;
  },

  tablerow(ctx) {
    console.log({ tablerow: ctx });

    return `| ${ctx.text} |`;
  },

  tablecell({ tokens }) {
    return `${this.parser.parseInline(tokens)}`;
  },

  list(token) {
    let body = '';
    let buffer = '';

    for (let j = 0; j < token.items.length; j++) {
      buffer = '';
      const item = token.items[j];

      if (token.ordered) {
        buffer += `${token.start + j}. `;
      } else {
        buffer += '- ';
      }

      if (item.task) {
        buffer += this.checkbox(item);
      } else {
        buffer += this.listitem(item);
      }

      body += buffer;
    }

    return body;
  },

  checkbox({ checked, tokens }) {
    const checkbox = checked ? '[x]' : '[ ]';
    const text = this.parser.parseInline(tokens);

    return `${checkbox} ${text}\n`;
  },

  listitem({ text }) {
    return `${text}\n`;
  },

  paragraph({ tokens }) {
    return `${this.parser.parseInline(tokens)}\n`;
  },
};

//     // Block elements
//     code: escapeBlock,
//     blockquote: block,
//     html: empty,
//     heading: block,
//     hr: newline,
//     list: list,
//     listitem: line,
//     checkbox: empty,
//     paragraph: block,
//     table: (header, body) => line(header + body),
//     tablerow: (text) => line(text.trim()),
//     tablecell: (text) => text + " ",
//     // Inline elements
//     strong: inline,
//     em: inline,
//     codespan: codespan,
//     br: newline,
//     del: inline,
//     link: (_0, _1, text) => text,
//     image: (_0, _1, text) => text,
//     text: inline,
//     space: empty,
//     // etc.
//     options: {},
//   },
// };

marked.use({ renderer });

function markdownToText(markdown, options) {
  const unmarked = marked.parse(markdown);
  const unescaped = unescape(unmarked);
  const trimmed = unescaped.trim();

  return trimmed;
}

function removeRedundantNewlines(input) {
  return input.replaceAll("\n\n", "\n");
}

module.exports = { markdownToText, removeRedundantNewlines };
