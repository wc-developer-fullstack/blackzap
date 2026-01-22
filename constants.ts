
import { Contact, UserProfile, StatusUpdate } from './types';

export const CURRENT_USER_ID = 'me';

export const MY_PROFILE: UserProfile = {
  name: 'Você',
  about: 'Dormindo ou codando 🚀',
  phone: '+55 11 99999-8888',
  avatar: 'https://picsum.photos/seed/me/200'
};

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Rodrigo Silva',
    avatar: 'https://picsum.photos/seed/rodrigo/200',
    lastMessage: 'Bora marcar aquele café?',
    lastMessageTime: new Date(Date.now() - 3600000),
    online: true
  },
  {
    id: '2',
    name: 'Mariana Oliveira',
    avatar: 'https://picsum.photos/seed/mariana/200',
    lastMessage: 'O relatório já está pronto.',
    lastMessageTime: new Date(Date.now() - 86400000),
    online: false
  },
  {
    id: '3',
    name: 'Grupo de Devs',
    avatar: 'https://picsum.photos/seed/devs/200',
    lastMessage: 'Alguém viu o erro no deploy?',
    lastMessageTime: new Date(Date.now() - 172800000),
    online: true
  }
];

// Corrigido para seguir a interface StatusUpdate: 'userId' em vez de 'contactId', 'content' em vez de 'imageUrl', e adicionado 'type'.
export const MOCK_STATUS: StatusUpdate[] = [
  {
    id: 's1',
    userId: '1',
    type: 'image',
    content: 'https://picsum.photos/seed/s1/400/800',
    timestamp: new Date(Date.now() - 1200000)
  },
  {
    id: 's2',
    userId: '2',
    type: 'image',
    content: 'https://picsum.photos/seed/s2/400/800',
    timestamp: new Date(Date.now() - 3600000)
  }
];
