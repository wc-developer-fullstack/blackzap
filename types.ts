
export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export interface Contact {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  online: boolean;
  lastSeen?: Date;
  isTyping?: boolean;
  about?: string;
  isVerified?: boolean;
  verifiedSubtitle?: string;
  unreadCount?: number;
}

export interface UserProfile {
  name: string;
  about: string;
  phone: string;
  avatar: string;
  username?: string;
  isVerified?: boolean;
  verifiedSubtitle?: string;
}

export interface StatusUpdate {
  id: string;
  userId: string;
  type: 'image' | 'video' | 'text';
  content: string;
  caption?: string;
  backgroundColor?: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar: string;
    isVerified?: boolean;
  };
}

export type AppView = 'chats' | 'status' | 'settings' | 'profile';

export const DEFAULT_AVATAR = 'https://i.ibb.co/zVwpKj5w/perfil.jpg';