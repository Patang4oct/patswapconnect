export interface Profile {
  id?: string;
  isLoading?: boolean;
  name: string;
  bio: string;
  socials: {
    instagram: string;
    linkedin: string;
  };
  sources?: {
    uri: string;
    title:string;
  }[];
  persona: PersonaType | 'Celebrity';
}

export enum PersonaType {
  SOCIALITE = 'Socialite',
  ARTIST = 'Artist',
  TECHIE = 'Techie',
  ORGANIZER = 'Organizer',
  CELEBRITY = 'Celebrity',
}

export interface User {
  username: string;
  password?: string; // In a real app, this would be a hash
  profile: Profile | null;
  connections: Profile[];
  selectedPersona: PersonaType;
}
