import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text as RNText } from 'react-native';

import { MessageText } from '@/features/chat/components/MessageText';
import { ThemeProvider } from '@/ui';

// Node built-ins, typed locally (the app's tsconfig has no Node types).
declare const __dirname: string;
interface DirEntry {
  name: string;
  isDirectory(): boolean;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readdirSync(dir: string, options: { withFileTypes: true }): DirEntry[];
  readFileSync(file: string, encoding: 'utf8'): string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as {
  resolve(...parts: string[]): string;
  join(...parts: string[]): string;
  basename(file: string): string;
};

// The shared Reanimated mock has no `useReducedMotion` (used by ThemeProvider).
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual<object>('react-native-reanimated/mock'),
  useReducedMotion: () => false,
}));

/**
 * Family chat safety (non-negotiable): message text is plain text in React Native `<Text>`,
 * nothing in it is ever interpreted as HTML / Markdown / a link, and the chat feature can't
 * reach an HTML renderer or open URLs.
 */

const HOSTILE = [
  '<script>alert("x")</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(document.cookie)',
  '[click me](javascript:alert(1)) **bold** <b>bold</b>',
  'https://evil.example/phish?x=<svg/onload=alert(1)>',
  '&lt;script&gt; &amp; ‮evil',
];

function render(body: unknown): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = create(
      <ThemeProvider themeKey="playful">
        <MessageText body={body as string} color="#000000" />
      </ThemeProvider>,
    );
  });
  return tree!;
}

describe('MessageText renders bodies as literal text', () => {
  it.each(HOSTILE)('%s', (body) => {
    const tree = render(body);
    const texts = tree.root.findAllByType(RNText);
    expect(texts).toHaveLength(1);
    // Exactly one string child, identical to the body: no parsing, no extra elements.
    expect(texts[0].props.children).toBe(body);
    expect(tree.toJSON()).toMatchObject({ type: 'Text', children: [body] });
    // No link handling or HTML injection props.
    expect(texts[0].props.onPress).toBeUndefined();
    expect(texts[0].props.dangerouslySetInnerHTML).toBeUndefined();
    expect(texts[0].props.dataDetectorType).toBe('none');
  });

  it('renders nothing (instead of crashing) for a non-string body', () => {
    const tree = render({ __html: '<b>x</b>' });
    expect(tree.root.findByType(RNText).props.children).toBe('');
  });

  it('lets long unbroken strings shrink and wrap inside the bubble', () => {
    const tree = render('a'.repeat(1000));
    const style = [tree.root.findByType(RNText).props.style].flat(Infinity);
    expect(style).toEqual(expect.arrayContaining([expect.objectContaining({ flexShrink: 1 })]));
  });
});

/** Source without comments (the safety notes there name the forbidden things on purpose). */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Every source file of the chat feature (tests excluded) and its route, comments removed. */
function chatSources(): { file: string; source: string }[] {
  const root = path.resolve(__dirname, '..');
  const out: { file: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push({ file: full, source: code(fs.readFileSync(full, 'utf8')) });
      }
    }
  };
  walk(root);
  const route = path.resolve(root, '../../../app/(tabs)/chat.tsx');
  out.push({ file: route, source: code(fs.readFileSync(route, 'utf8')) });
  return out;
}

describe('chat feature never reaches an HTML renderer, a link opener or the console', () => {
  const FORBIDDEN: [string, RegExp][] = [
    ['WebView', /WebView|react-native-webview/],
    ['innerHTML', /dangerouslySetInnerHTML|innerHTML|outerHTML/],
    ['HTML/Markdown renderers', /render-?html|markdown|marked|remark|rehype|html-react-parser/i],
    ['Linking / openURL', /\bLinking\b|openURL|openBrowserAsync|expo-web-browser/],
    ['autolinks', /dataDetectorTypes="(all|link)"|Autolink|hyperlink/i],
    ['eval', /\beval\(|new Function\(/],
    ['console', /\bconsole\./],
  ];

  const sources = chatSources();

  it('finds the chat sources', () => {
    expect(sources.length).toBeGreaterThanOrEqual(8);
  });

  it.each(FORBIDDEN)('no %s', (_label, pattern) => {
    const hits = sources.filter(({ source }) => pattern.test(source)).map(({ file }) => file);
    expect(hits).toEqual([]);
  });

  it('renders message bodies only through MessageText', () => {
    const renderers = sources
      .filter(({ source }) => /<MessageText\b/.test(source))
      .map(({ file }) => path.basename(file));
    expect(renderers.sort()).toEqual(['MessageBubble.tsx']);
  });
});
