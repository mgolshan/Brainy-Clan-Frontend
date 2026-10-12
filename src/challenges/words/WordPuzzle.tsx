import type {
  AnagramPayload,
  MissingLetterPayload,
  WordPuzzlePayload,
  WordResponse,
  WordSearchPayload,
  WordSearchResponse,
} from '@/api/types';
import type { ChallengeComponentProps } from '@/challenges/registry';
import { Anagram } from '@/challenges/words/Anagram';
import { readWord } from '@/challenges/words/logic';
import { MissingLetter } from '@/challenges/words/MissingLetter';
import { WordSearch } from '@/challenges/words/WordSearch';

type Props = ChallengeComponentProps<WordPuzzlePayload, WordResponse | WordSearchResponse>;

/** `word_puzzle`: renders the variant (`anagram`, `missing_letter`, `word_search`). */
export function WordPuzzle(props: Props) {
  const { item } = props;
  switch (item.payload.variant) {
    case 'anagram':
      return (
        <Anagram {...(props as unknown as ChallengeComponentProps<AnagramPayload, WordResponse>)} />
      );
    case 'missing_letter':
      return (
        <MissingLetter
          {...(props as unknown as ChallengeComponentProps<MissingLetterPayload, WordResponse>)}
        />
      );
    case 'word_search':
      return (
        <WordSearch
          {...(props as unknown as ChallengeComponentProps<WordSearchPayload, WordSearchResponse>)}
        />
      );
  }
}

/** Feedback text: the word for anagram / missing letter; word searches show it in the grid. */
export function describeWordPuzzle(payload: WordPuzzlePayload, correct: unknown): string | null {
  if (payload.variant === 'word_search') return null;
  return readWord(correct)?.toLocaleUpperCase() ?? null;
}
