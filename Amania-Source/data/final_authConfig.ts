/** Add the initial owner USN here when supplied by the app owner. */
export const INITIAL_OWNER_USNS: string[] = ['1MS26IS160'];

export const CLUBS_FOR_ADMIN = [
  { id: 'inara', name: 'Inara' },
  { id: 'coderit', name: 'CodeRIT' },
  { id: 'debsoc', name: 'DebSoc' },
] as const;

export type AdminClubId = (typeof CLUBS_FOR_ADMIN)[number]['id'];
