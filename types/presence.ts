export interface UserPresence {
  user: {
    id: string;
    email: string;
    username: string;
  };
  cursor: {
    x: number;
    y: number;
  } | null;
  lastSeen: number;
}

export interface DocumentPresence {
  [key: string]: UserPresence;
}
