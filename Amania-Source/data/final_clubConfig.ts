import { ClubProfile } from './final_types';

// Social URLs live in this single file so the invites can be rotated without editing screens.
export const CLUB_LINKS = {
  inara: {
    instagram: 'https://www.instagram.com/msrit.inara/',
    whatsapp: 'https://chat.whatsapp.com/HGlyx28pN1DBeoi3wSD9Qj?s=sw&p=a&ilr=4&iam=2',
  },
  coderit: {
    instagram: 'https://www.instagram.com/code_rit/',
    whatsapp: '',
  },
  debsoc: {
    instagram: 'https://www.instagram.com/msrit.debsoc/',
    whatsapp: 'https://chat.whatsapp.com/BLSE9aTCtG98Rfm3cbXpak?mode=wwt',
  },
} as const;

export const DEFAULT_CLUBS: ClubProfile[] = [
  {
    id: 'inara', name: 'Inara', category: 'FASHION TEAM',
    tagline: 'Find your place in the spotlight—or bring the whole show to life.',
    about: 'Inara is MSRIT’s fashion team, creating shows and collaborations where students explore fashion onstage and behind the scenes.',
    whyJoin: 'Models, designers, photographers, videographers and editors are welcome. Auditions and creative roles let you contribute, learn, and make a show together.',
    achievements: ['First place at Saptharang ’22', 'Second place at Cultura ’22'],
    joiningInfo: 'Auditions and creative roles are available for models, designers, photographers, videographers, and editors.',
    instagramUrl: CLUB_LINKS.inara.instagram, whatsappUrl: CLUB_LINKS.inara.whatsapp,
    president: 'Jane Doe', email: 'janedoe@gmail.com', bannerUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'coderit', name: 'CodeRIT', category: 'CODING COMMUNITY',
    tagline: 'Build things, solve problems, and find your people in tech.',
    about: 'CodeRIT is MSRIT’s coding community, where students share technical interests, build projects, solve problems, and learn from peers.',
    whyJoin: 'Open to students of every branch, whether you are curious or experienced. Explore coding, peer learning, projects, competitions, and hackathons together.',
    achievements: ['Winning team at Smart India Hackathon 2023', 'Members achieved AIR 41 at the ICPC Regionals'],
    joiningInfo: 'CodeRIT is open to students of all branches.',
    instagramUrl: CLUB_LINKS.coderit.instagram, whatsappUrl: CLUB_LINKS.coderit.whatsapp,
    president: 'Jane Doe', email: 'janedoe@gmail.com', bannerUri: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'debsoc', name: 'DebSoc', category: 'DEBATING SOCIETY',
    tagline: 'Bring your curiosity. Speaking is optional; good questions are welcome.',
    about: 'DebSoc is MSRIT’s debating society, where students explore ideas, exchange perspectives, and learn through debates and campus conversations.',
    whyJoin: 'Listening is welcome and speaking is optional. Explore perspectives while building public speaking, clear thinking, communication, and analytical skills at your own pace.',
    achievements: ['Participation at Pre-ABP ’26', 'Participation at Tarkash BPD ’26'],
    joiningInfo: 'Listening is welcome. You can take part without speaking.',
    instagramUrl: CLUB_LINKS.debsoc.instagram, whatsappUrl: CLUB_LINKS.debsoc.whatsapp,
    president: 'Jane Doe', email: 'janedoe@gmail.com', bannerUri: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85',
  },
];

export const CLUB_STORAGE_KEY = 'amania.phase1.clubs.v1';
// In this offline role preview, Admin represents the demo editors for these club pages.
export const DEMO_ADMIN_CLUB_IDS = ['inara', 'coderit', 'debsoc'] as const;
