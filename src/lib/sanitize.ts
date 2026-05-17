import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'strong',
  'em',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'br',
  'hr',
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href'],
  img: ['src', 'alt', 'title'],
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

export function sanitize(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
}
