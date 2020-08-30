import { IonCol, IonContent, IonGrid, IonRow } from '@ionic/react';
import React, { useEffect, useRef, useState } from 'react';
import { currTime, db } from '../services/firebase';
import './Messages.css';

type MessagesProps = {
  ownerId: string;
  roomId: string;
  userId: string;
};

type Message = {
  id: string;
  senderId: string;
  sender: string;
  content: string;
};

const Messages: React.FC<MessagesProps> = ({ ownerId, roomId, userId }) => {
  const [chats, setChats] = useState<Message[]>([
    { id: '', senderId: userId, sender: '', content: 'You have joined the room.' },
  ]); // All received messages
  const [prevMessages, setPrevMessages] = useState<Message[]>([]); // Track previous messages
  const [newMessages, setNewMessages] = useState<Message[]>([]); // Newly retrieved messages
  const contentRef = useRef<HTMLIonContentElement>(null);

  // Only update array containing all messages ('chats') when there are new messages
  useEffect(() => {
    if (prevMessages !== newMessages) {
      setPrevMessages(newMessages);
      setChats([...chats, ...newMessages]);
    }
  }, [prevMessages, newMessages, chats]);

  // Listen for new messages
  useEffect(() => {
    const chatUnsubscribe = db
      .collection('rooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt')
      .where('createdAt', '>', currTime)
      .onSnapshot(async (querySnapshot) => {
        let newMsgs: Message[] = [];
        const changes = querySnapshot.docChanges();
        for (const change of changes) {
          if (change.type === 'added') {
            const data = change.doc.data();
            const user = await db.collection('users').doc(data.senderId).get();
            if (data.type !== 'updateState') {
              let displayName = user.data()?.name;
              if (data.senderId === ownerId) {
                displayName = displayName + ' 👑';
              }

              newMsgs.push({
                id: change.doc.id,
                senderId: data.senderId,
                sender: displayName,
                content: data.content,
              });
            }
          }
        }

        if (newMsgs.length !== 0) {
          setNewMessages(newMsgs);
        }
      });

    return () => {
      chatUnsubscribe();
    };
  }, [roomId, ownerId]);

  // Always scroll to most recent chat message (bottom)
  useEffect(() => {
    let content = contentRef.current;
    console.log(content);

    // Set timeout because DOM doesn't update immediately after 'chats' state is updated
    setTimeout(() => {
      content?.scrollToBottom(200);
    }, 100);
  }, [chats]);

  return (
    <IonContent class="message-card" ref={contentRef}>
      <IonGrid class="message-grid">
        {chats.map((chat) => {
          return (
            <IonRow key={chat.id} class={chat.senderId === userId ? 'right-align' : ''}>
              <IonCol size="auto" class={chat.senderId === userId ? 'my-msg' : 'other-msg'}>
                {chat.sender !== '' ? <b>{chat.sender}: </b> : <></>}
                <span>{chat.content}</span>
              </IonCol>
            </IonRow>
          );
        })}
      </IonGrid>
    </IonContent>
  );
};

export default Messages;
