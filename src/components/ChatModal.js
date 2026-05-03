import React, { useEffect, useMemo, useRef, useState } from 'react';
import { chatRequest, chatWebSocketUrl } from '../api';
import { getDownloadUrl, uploadFileAsset } from '../fileService';
import { buildUserFullName, shortId } from '../shared/lib/user';
import { UserAvatar } from '../shared/ui/UserAvatar';

function formatTime(value) {
  if (!value) {
    return '';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function mergeConversation(current, nextConversation) {
  const withoutCurrent = current.filter((item) => item.id !== nextConversation.id);
  return [nextConversation, ...withoutCurrent];
}

function appendUniqueMessage(current, nextMessage) {
  if (current.some((item) => item.id === nextMessage.id)) {
    return current;
  }
  return [...current, nextMessage];
}

function getConversationUser(conversation, currentUser, userMap, myMentorId) {
  if (!conversation) {
    return null;
  }

  if (currentUser?.role === 'intern' && myMentorId) {
    return userMap?.[myMentorId] || { id: myMentorId };
  }

  const otherParticipantId = (conversation.participant_ids || []).find(
    (participantId) => participantId !== currentUser?.id
  );

  return otherParticipantId
    ? userMap?.[otherParticipantId] || { id: otherParticipantId }
    : null;
}

function buildConversationLabel(conversation, currentUser, userMap, myMentorId) {
  if (conversation.title) {
    return conversation.title;
  }

  if (conversation.type === 'group') {
    const participants = (conversation.intern_ids || [])
      .map((participantId) =>
        buildUserFullName(userMap?.[participantId] || { id: participantId })
      )
      .filter(Boolean);

    return participants.length > 0 ? participants.join(', ') : 'Групповой чат';
  }

  return (
    buildUserFullName(
      getConversationUser(conversation, currentUser, userMap, myMentorId)
    ) || 'Личный чат'
  );
}

function encodeTaskReference(task) {
  if (!task?.id) {
    return '';
  }

  return `[[TASK:${task.id}|${task.title || 'Задача'}]]`;
}

function parseTaskReferences(content) {
  const value = content || '';
  const regex = /\[\[TASK:([^|\]]+)\|([^\]]+)\]\]/g;
  const parts = [];
  let lastIndex = 0;
  let match = regex.exec(value);

  while (match) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: value.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: 'task',
      taskId: match[1],
      label: match[2],
    });

    lastIndex = regex.lastIndex;
    match = regex.exec(value);
  }

  if (lastIndex < value.length) {
    parts.push({
      type: 'text',
      value: value.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value }];
}

function MessageContent({ content, onOpenTask }) {
  return (
    <div className="chat-message-content">
      {parseTaskReferences(content).map((part, index) =>
        part.type === 'task' ? (
          <button
            className="chat-task-reference"
            key={`${part.taskId}-${index}`}
            onClick={() => onOpenTask(part.taskId)}
            type="button"
          >
            {part.label}
          </button>
        ) : (
          <p key={`${index}-${part.value.slice(0, 12)}`}>{part.value}</p>
        )
      )}
    </div>
  );
}

export function ChatModal({
  currentUser,
  myMentorId,
  userMap,
  userNameMap,
  mentorInternOptions,
  taskOptions,
  onOpenTask,
  open,
  onClose,
  token,
}) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messageFiles, setMessageFiles] = useState([]);
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [directInternId, setDirectInternId] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [groupInternIds, setGroupInternIds] = useState([]);
  const [chatError, setChatError] = useState('');
  const userSocketRef = useRef(null);
  const conversationSocketRef = useRef(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!open || !token) {
      return undefined;
    }

    let cancelled = false;

    async function loadConversations() {
      try {
        setChatLoading(true);
        const data = await chatRequest('/conversations', { token });
        if (cancelled) {
          return;
        }

        const nextConversations = Array.isArray(data) ? data : [];
        setConversations(nextConversations);
        setSelectedConversationId((current) => {
          if (current && nextConversations.some((item) => item.id === current)) {
            return current;
          }
          return nextConversations[0]?.id || '';
        });
        setChatError('');
      } catch (error) {
        if (!cancelled) {
          setChatError(error.message || 'Не удалось загрузить чаты');
        }
      } finally {
        if (!cancelled) {
          setChatLoading(false);
        }
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  useEffect(() => {
    if (!open || !selectedConversationId || !token) {
      setMessages([]);
      return undefined;
    }

    let cancelled = false;

    async function loadMessages() {
      try {
        const data = await chatRequest(
          `/conversations/${selectedConversationId}/messages`,
          { token }
        );
        if (!cancelled) {
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setChatError(error.message || 'Не удалось загрузить сообщения');
        }
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [open, selectedConversationId, token]);

  useEffect(() => {
    if (!open || !token) {
      return undefined;
    }

    const socket = new WebSocket(chatWebSocketUrl('/ws/updates', token));
    userSocketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'conversation.updated' && payload.data) {
          setConversations((current) => mergeConversation(current, payload.data));
        }
      } catch {
        setChatError('Не удалось обработать событие списка чатов');
      }
    };

    socket.onerror = () => {
      setChatError('WebSocket списка чатов недоступен');
    };

    return () => {
      socket.close();
      userSocketRef.current = null;
    };
  }, [open, token]);

  useEffect(() => {
    if (!open || !selectedConversationId || !token) {
      return undefined;
    }

    const socket = new WebSocket(
      chatWebSocketUrl(`/ws/conversations/${selectedConversationId}`, token)
    );
    conversationSocketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'message.created' && payload.data) {
          setMessages((current) => appendUniqueMessage(current, payload.data));
        }

        if (payload.type === 'conversation.updated' && payload.data) {
          setConversations((current) => mergeConversation(current, payload.data));
        }

        if (payload.type === 'error') {
          setChatError(payload.detail || 'Ошибка websocket чата');
        }
      } catch {
        setChatError('Не удалось обработать сообщение чата');
      }
    };

    socket.onerror = () => {
      setChatError('WebSocket сообщений недоступен');
    };

    return () => {
      socket.close();
      conversationSocketRef.current = null;
    };
  }, [open, selectedConversationId, token]);

  function toggleGroupIntern(internId) {
    setGroupInternIds((current) =>
      current.includes(internId)
        ? current.filter((item) => item !== internId)
        : [...current, internId]
    );
  }

  async function handleCreateDirectChat() {
    const targetInternId =
      currentUser?.role === 'intern' ? currentUser.id : directInternId;

    if (!targetInternId) {
      return;
    }

    try {
      const conversation = await chatRequest('/conversations/direct', {
        method: 'POST',
        token,
        body: { intern_id: targetInternId },
      });
      setConversations((current) => mergeConversation(current, conversation));
      setSelectedConversationId(conversation.id);
      setDirectInternId('');
      setChatError('');
    } catch (error) {
      setChatError(error.message || 'Не удалось открыть личный чат');
    }
  }

  async function handleCreateGroupChat() {
    if (!groupTitle.trim() || groupInternIds.length === 0) {
      return;
    }

    try {
      const conversation = await chatRequest('/conversations/group', {
        method: 'POST',
        token,
        body: {
          title: groupTitle.trim(),
          intern_ids: groupInternIds,
        },
      });
      setConversations((current) => mergeConversation(current, conversation));
      setSelectedConversationId(conversation.id);
      setGroupTitle('');
      setGroupInternIds([]);
      setChatError('');
    } catch (error) {
      setChatError(error.message || 'Не удалось создать групповой чат');
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    if (!selectedConversationId) {
      return;
    }

    try {
      setSending(true);
      const uploadedAttachments = [];
      for (const file of messageFiles) {
        const uploaded = await uploadFileAsset(token, file, 'chat');
        uploadedAttachments.push({
          file_id: uploaded.id,
          file_name: uploaded.file_name,
          mime_type: uploaded.content_type,
          size: uploaded.size,
        });
      }

      const taskReference = linkedTaskId
        ? encodeTaskReference(
            taskOptions.find((task) => task.id === linkedTaskId) || {
              id: linkedTaskId,
              title: 'Задача',
            }
          )
        : '';
      const finalContent = [taskReference, chatMessage].filter(Boolean).join('\n');

      const payload = {
        action: 'message.send',
        content: finalContent,
        attachments: uploadedAttachments,
      };

      const socket = conversationSocketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
      } else {
        const message = await chatRequest(
          `/conversations/${selectedConversationId}/messages`,
          {
            method: 'POST',
            token,
            body: {
              content: finalContent,
              attachments: uploadedAttachments,
            },
          }
        );
        setMessages((current) => appendUniqueMessage(current, message));
      }

      setChatMessage('');
      setMessageFiles([]);
      setLinkedTaskId('');
      setChatError('');
    } catch (error) {
      setChatError(error.message || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="chat-modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        className="chat-modal jira-chat-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="chat-modal-head">
          <div>
            <p className="auth-kicker">TEAM CHAT</p>
            <h3>Чаты</h3>
            <p className="auth-subtitle">
              Рабочие обсуждения по задачам, мгновенные сообщения и вложения в
              одном коммуникационном центре.
            </p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            Закрыть
          </button>
        </div>

        <div className="chat-layout">
          <aside className="chat-sidebar jira-chat-sidebar">
            {(currentUser?.role === 'mentor' || currentUser?.role === 'intern') && (
              <div className="chat-creator jira-chat-creator">
                <div className="section-head">
                  <div>
                    <p className="auth-kicker">NEW CHAT</p>
                    <h4>Новый диалог</h4>
                  </div>
                </div>

                <div className="compact-form">
                  {currentUser?.role === 'mentor' ? (
                    <label>
                      Личный чат
                      <select
                        onChange={(event) => setDirectInternId(event.target.value)}
                        value={directInternId}
                      >
                        <option value="">Выберите стажёра</option>
                        {mentorInternOptions.map((intern) => (
                          <option key={intern.value} value={intern.value}>
                            {intern.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="auth-subtitle">
                      Откройте личный диалог с наставником, если чат ещё не создан.
                    </p>
                  )}
                  <button
                    className="secondary-button"
                    onClick={handleCreateDirectChat}
                    type="button"
                  >
                    {currentUser?.role === 'mentor'
                      ? 'Открыть личный чат'
                      : 'Написать наставнику'}
                  </button>

                  {currentUser?.role === 'mentor' && (
                    <>
                      <label>
                        Название группы
                        <input
                          onChange={(event) => setGroupTitle(event.target.value)}
                          placeholder="Общие обновления"
                          value={groupTitle}
                        />
                      </label>
                      <div className="chat-checkboxes">
                        {mentorInternOptions.map((intern) => (
                          <label className="chat-checkbox" key={intern.value}>
                            <input
                              checked={groupInternIds.includes(intern.value)}
                              onChange={() => toggleGroupIntern(intern.value)}
                              type="checkbox"
                            />
                            <UserAvatar size="xs" user={intern.user} />
                            <span>{intern.label}</span>
                          </label>
                        ))}
                      </div>
                      <button
                        className="primary-button"
                        onClick={handleCreateGroupChat}
                        type="button"
                      >
                        Создать группу
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="chat-conversation-list">
              {chatLoading && <div className="inline-note">Загрузка чатов...</div>}
              {conversations.map((conversation) => {
                const conversationUser = getConversationUser(
                  conversation,
                  currentUser,
                  userMap,
                  myMentorId
                );

                return (
                  <button
                    className={`chat-conversation-item ${
                      selectedConversationId === conversation.id ? 'active' : ''
                    }`}
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    type="button"
                  >
                    <div className="chat-conversation-top">
                      <UserAvatar size="sm" user={conversationUser || { id: conversation.id }} />
                      <div>
                        <strong>
                          {buildConversationLabel(
                            conversation,
                            currentUser,
                            userMap,
                            myMentorId
                          )}
                        </strong>
                        <span>
                          {conversation.type === 'group'
                            ? 'Групповой чат'
                            : 'Личный чат'}
                        </span>
                      </div>
                    </div>
                    <p className="chat-preview">
                      {conversation.last_message_preview || 'Сообщений пока нет'}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="chat-main jira-chat-main">
            {selectedConversation ? (
              <>
                <div className="chat-main-head">
                  <div>
                    <h4>
                      {buildConversationLabel(
                        selectedConversation,
                        currentUser,
                        userMap,
                        myMentorId
                      )}
                    </h4>
                    <p className="auth-subtitle">
                      {selectedConversation.type === 'group'
                        ? 'Общий поток обсуждения'
                        : 'Приватный диалог'}
                    </p>
                  </div>
                </div>

                <div className="chat-messages">
                  {messages.map((message) => {
                    const author = userMap?.[message.sender_id] || { id: message.sender_id };
                    const authorName =
                      message.sender_id === currentUser?.id
                        ? 'Вы'
                        : userNameMap?.[message.sender_id] ||
                          buildUserFullName(author) ||
                          shortId(message.sender_id);

                    return (
                      <article
                        className={`chat-message ${
                          message.sender_id === currentUser?.id ? 'own' : ''
                        }`}
                        key={message.id}
                      >
                        <div className="chat-message-head">
                          <div className="chat-author">
                            <UserAvatar size="xs" user={author} />
                            <strong>{authorName}</strong>
                          </div>
                          <span>{formatTime(message.created_at)}</span>
                        </div>

                        {message.content && (
                          <MessageContent content={message.content} onOpenTask={onOpenTask} />
                        )}

                        {message.attachments?.length > 0 && (
                          <div className="chat-attachments">
                            {message.attachments.map((attachment) => (
                              <button
                                className="detail-badge subtle attachment-badge"
                                key={attachment.id}
                                onClick={async () => {
                                  const response = await getDownloadUrl(
                                    token,
                                    attachment.file_id
                                  );
                                  window.open(
                                    response.download_url,
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                }}
                                type="button"
                              >
                                {attachment.file_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                <form className="chat-composer" onSubmit={handleSendMessage}>
                  <select
                    onChange={(event) => setLinkedTaskId(event.target.value)}
                    value={linkedTaskId}
                  >
                    <option value="">Сослаться на задачу</option>
                    {taskOptions.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                  <textarea
                    onChange={(event) => setChatMessage(event.target.value)}
                    placeholder="Напишите сообщение"
                    value={chatMessage}
                  />
                  <div className="chat-composer-actions">
                    <input
                      multiple
                      onChange={(event) =>
                        setMessageFiles(Array.from(event.target.files || []))
                      }
                      type="file"
                    />
                    <button className="primary-button" disabled={sending} type="submit">
                      Отправить
                    </button>
                  </div>
                  {messageFiles.length > 0 && (
                    <div className="chat-attachments">
                      {messageFiles.map((file) => (
                        <span className="detail-badge subtle" key={`${file.name}-${file.size}`}>
                          {file.name}
                        </span>
                      ))}
                    </div>
                  )}
                </form>
              </>
            ) : (
              <div className="chat-empty-state">
                <h4>Выберите чат</h4>
                <p className="auth-subtitle">
                  Откройте личный или групповой диалог и продолжайте обсуждение
                  задач в реальном времени.
                </p>
              </div>
            )}
          </section>
        </div>

        {chatError && <p className="auth-message">{chatError}</p>}
      </section>
    </div>
  );
}
