
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { AuthForms } from './components/AuthForms';
import { supabase } from './services/supabaseClient';
import { Contact, Message, AppView, UserProfile, DEFAULT_AVATAR, StatusUpdate } from './types';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [status, setStatus] = useState<StatusUpdate[]>([]);
  const [globalSearchResults, setGlobalSearchResults] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(localStorage.getItem('activeChatId'));
  const [view, setView] = useState<AppView>('chats');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const fetchRecentChats = useCallback(async (userId: string) => {
    setContactsLoading(true);
    try {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},contact_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (msgError) throw msgError;
      if (!messages || messages.length === 0) { setContacts([]); return; }

      const chatIds = new Set<string>();
      const lastMsgs = new Map<string, any>();
      const unreadCounts = new Map<string, number>();

      messages.forEach(m => {
        const isMeSender = m.sender_id === userId;
        const otherId = isMeSender ? m.contact_id : m.sender_id;
        
        chatIds.add(otherId);
        
        if (!lastMsgs.has(otherId)) {
          let text = m.text;
          if (text.startsWith('[IMAGEM]')) text = '📷 Imagem';
          else if (text.startsWith('[AUDIO]')) text = '🎤 Áudio';
          else if (text.startsWith('[ARQUIVO]')) text = '📄 Arquivo';
          lastMsgs.set(otherId, { text, time: new Date(m.created_at) });
        }

        if (!isMeSender && m.status !== 'read') {
          unreadCounts.set(otherId, (unreadCounts.get(otherId) || 0) + 1);
        }
      });

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(chatIds));
      
      if (profError) throw profError;

      if (profiles) {
        const formatted = profiles.map(p => ({
          id: p.id,
          name: p.full_name,
          username: p.username,
          avatar: p.avatar_url || DEFAULT_AVATAR,
          online: false,
          about: p.about,
          lastMessage: lastMsgs.get(p.id)?.text,
          lastMessageTime: lastMsgs.get(p.id)?.time,
          isVerified: p.is_verified,
          verifiedSubtitle: p.verified_subtitle,
          unreadCount: unreadCounts.get(p.id) || 0
        })).sort((a, b) => (b.lastMessageTime?.getTime() || 0) - (a.lastMessageTime?.getTime() || 0));
        setContacts(formatted);
      }
    } catch (err) {
      console.error('Erro ao carregar conversas recentes:', err);
    } finally { 
      setContactsLoading(false); 
    }
  }, []);

  const markAsRead = useCallback(async (contactId: string, userId: string) => {
    // 1. Limpeza otimista instantânea no estado local para feedback imediato
    setContacts(prev => prev.map(c => 
      c.id === contactId ? { ...c, unreadCount: 0 } : c
    ));

    // 2. Persistência no banco de dados
    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('sender_id', contactId)
      .eq('contact_id', userId)
      .neq('status', 'read');
    
    if (error) console.error('Erro ao marcar como lido:', error);
  }, []);

  const showNotification = useCallback((msg: any, sender: any) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      if (document.hidden || activeIdRef.current !== msg.sender_id) {
        let content = msg.text;
        if (content.startsWith('[IMAGEM]')) content = '📷 Imagem';
        else if (content.startsWith('[AUDIO]')) content = '🎤 Áudio';
        else if (content.startsWith('[ARQUIVO]')) content = '📄 Arquivo';

        const notification = new Notification(sender.full_name || 'Nova mensagem', {
          body: content,
          icon: sender.avatar_url || 'https://i.ibb.co/1fQLFct0/blackzap.png',
          tag: msg.sender_id,
        });

        notification.onclick = () => {
          window.focus();
          setActiveId(msg.sender_id);
          notification.close();
        };
      }
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('status')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .gt('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setStatus(data.map(s => ({
          id: s.id,
          userId: s.user_id,
          type: s.type as any,
          content: s.content,
          caption: s.caption,
          backgroundColor: s.background_color,
          timestamp: new Date(s.created_at),
          user: {
            name: (s as any).profiles?.full_name || 'Usuário',
            avatar: (s as any).profiles?.avatar_url || DEFAULT_AVATAR,
            isVerified: (s as any).profiles?.is_verified
          }
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar status:', err);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      if (data) {
        setUserProfile({ 
          name: data.full_name, 
          about: data.about || 'Disponível', 
          phone: data.phone, 
          avatar: data.avatar_url || DEFAULT_AVATAR, 
          username: data.username,
          isVerified: data.is_verified,
          verifiedSubtitle: data.verified_subtitle
        });
        fetchRecentChats(userId);
        fetchStatus();
      }
    } catch (err) { 
      console.error('Erro ao carregar perfil:', err); 
    }
  }, [fetchRecentChats, fetchStatus]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(currentSession);
          if (currentSession) {
            await fetchProfile(currentSession.user.id);
            if ('Notification' in window && Notification.permission !== 'granted') {
              Notification.requestPermission();
            }
          }
        }
      } catch (err) {
        console.error("Erro ao iniciar sessão:", err);
      } finally {
        if (mounted) {
          setTimeout(() => setLoading(false), 800);
        }
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        if (session) {
          fetchProfile(session.user.id);
        } else { 
          setUserProfile(null); 
          setContacts([]); 
          setStatus([]); 
          localStorage.removeItem('activeChatId'); 
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status' }, () => {
        fetchStatus();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.contact_id === session.user.id) {
          const { data: senderData } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', newMsg.sender_id).single();
          showNotification(newMsg, senderData || {});
          
          if (activeIdRef.current === newMsg.sender_id) {
            markAsRead(newMsg.sender_id, session.user.id);
          }
        }
        fetchRecentChats(session.user.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        // Quando uma mensagem é marcada como lida pelo outro usuário, atualizamos a sidebar para refletir os checks
        fetchRecentChats(session.user.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, fetchStatus, fetchRecentChats, showNotification, markAsRead]);

  useEffect(() => {
    if (activeId) {
      localStorage.setItem('activeChatId', activeId);
      if (session?.user?.id) {
        markAsRead(activeId, session.user.id);
      }
    }
    else localStorage.removeItem('activeChatId');
  }, [activeId, session, markAsRead]);

  const handleSendMessage = async (text: string) => {
    if (!activeId || !session?.user?.id) return;
    await supabase.from('messages').insert([{ text, sender_id: session.user.id, contact_id: activeId, status: 'sent' }]);
  };

  if (loading) return (
    <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center animate-in fade-in duration-700">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full animate-pulse"></div>
        <img src="https://i.ibb.co/1fQLFct0/blackzap.png" className="w-20 h-20 relative z-10" alt="Loading" />
      </div>
      <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden shadow-2xl">
        <div className="h-full bg-gradient-to-r from-red-800 to-red-600 animate-loading-bar shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
      </div>
    </div>
  );

  if (!session) return <AuthForms />;

  return (
    <div className="flex h-[100dvh] bg-black overflow-hidden w-full selection:bg-red-900/40">
      <div className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[420px] h-full border-r border-zinc-900 flex-shrink-0 transition-all duration-300`}>
        <Sidebar 
          contacts={contacts} 
          globalSearchResults={globalSearchResults}
          status={status}
          activeId={activeId} 
          currentUserId={session.user.id}
          onSelectContact={setActiveId} 
          onSelectGlobal={(c) => { if (!contacts.find(x => x.id === c.id)) setContacts(p => [c, ...p]); setActiveId(c.id); }}
          view={view} setView={setView}
          onGlobalSearch={async (term) => {
            if (!session?.user?.id || !term.trim()) { setGlobalSearchResults([]); return; }
            const st = term.startsWith('@') ? term.slice(1) : term;
            const { data } = await supabase.from('profiles').select('*').neq('id', session.user.id).or(`username.ilike.%${st}%,full_name.ilike.%${st}%`).limit(10);
            if (data) setGlobalSearchResults(data.map(p => ({ 
              id: p.id, 
              name: p.full_name, 
              username: p.username, 
              avatar: p.avatar_url || DEFAULT_AVATAR, 
              online: false, 
              about: p.about, 
              lastMessage: 'Nova conversa',
              isVerified: p.is_verified,
              verifiedSubtitle: p.verified_subtitle,
              unreadCount: 0
            })));
          }}
          userProfile={userProfile}
          loading={contactsLoading}
          onUpdateProfile={async (u) => {
            if (!session?.user?.id) return;
            const up: any = {};
            if (u.name) up.full_name = u.name;
            if (u.about) up.about = u.about;
            if (u.avatar) up.avatar_url = u.avatar;
            await supabase.from('profiles').update(up).eq('id', session.user.id);
            fetchProfile(session.user.id);
          }}
          onPostStatus={async (s) => {
            if (!session?.user?.id) return;
            const { error } = await supabase.from('status').insert([{
              user_id: session.user.id,
              type: s.type,
              content: s.content,
              caption: s.caption,
              background_color: s.backgroundColor
            }]);
            if (error) throw error;
            fetchStatus();
          }}
          onLogout={async () => { 
            await supabase.auth.signOut(); 
            setActiveId(null); 
            localStorage.removeItem('activeChatId'); 
          }}
        />
      </div>
      <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 h-full bg-zinc-950 transition-all duration-300`}>
        <ChatWindow contact={[...contacts, ...globalSearchResults].find(c => c.id === activeId) || null} onSendMessage={handleSendMessage} onBack={() => setActiveId(null)} currentUserId={session.user.id} />
      </div>
    </div>
  );
};

export default App;
