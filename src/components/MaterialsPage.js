import React, { useCallback, useEffect, useState } from 'react';
import { fileRequest } from '../api';
import { getDownloadUrl, uploadFileAsset } from '../fileService';

export function MaterialsPage({
  currentUser,
  mentorInternOptions,
  onBack,
  token,
}) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audienceScope, setAudienceScope] = useState('all_interns');
  const [targetInternIds, setTargetInternIds] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fileRequest('/materials', { token });
      setMaterials(Array.isArray(data) ? data : []);
      setMessage('');
    } catch (error) {
      setMessage(error.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    loadMaterials();
  }, [loadMaterials, token]);

  function toggleIntern(internId) {
    setTargetInternIds((current) =>
      current.includes(internId)
        ? current.filter((item) => item !== internId)
        : [...current, internId]
    );
  }

  async function handleCreateMaterial(event) {
    event.preventDefault();
    if (!selectedFile || !token) {
      return;
    }

    try {
      setLoading(true);
      const uploaded = await uploadFileAsset(token, selectedFile, 'material');
      await fileRequest('/materials', {
        method: 'POST',
        token,
        body: {
          title,
          description,
          file_id: uploaded.id,
          audience_scope: audienceScope,
          target_intern_ids:
            audienceScope === 'selected_interns' ? targetInternIds : [],
        },
      });
      setTitle('');
      setDescription('');
      setAudienceScope('all_interns');
      setTargetInternIds([]);
      setSelectedFile(null);
      await loadMaterials();
    } catch (error) {
      setMessage(error.message || 'Failed to create material');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="dashboard-layout">
      <section className="materials-shell jira-materials-shell">
        <header className="materials-hero jira-materials-hero">
          <div className="materials-hero-copy">
            <p className="auth-kicker">KNOWLEDGE BASE</p>
            <h1>Материалы</h1>
            <p className="auth-subtitle">
              Библиотека ссылок, файлов и методичек в духе Jira Confluence:
              быстрый доступ, понятная аудитория и единое место для обучения.
            </p>
          </div>
          <div className="materials-hero-actions">
            <button className="secondary-button" onClick={loadMaterials} type="button">
              Обновить
            </button>
            <button className="ghost-button" onClick={onBack} type="button">
              Назад к доске
            </button>
          </div>
        </header>

        <section className="materials-grid">
          {currentUser?.role === 'mentor' && (
            <section className="dashboard-card materials-publish-card jira-materials-publish">
              <div className="section-head">
                <div>
                  <p className="auth-kicker">PUBLISH</p>
                  <h3>Новый материал</h3>
                </div>
              </div>

              <form className="compact-form" onSubmit={handleCreateMaterial}>
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Название материала"
                  value={title}
                />
                <textarea
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Краткое описание"
                  value={description}
                />
                <select
                  onChange={(event) => setAudienceScope(event.target.value)}
                  value={audienceScope}
                >
                  <option value="all_interns">Все стажёры</option>
                  <option value="own_interns">Мои стажёры</option>
                  <option value="selected_interns">Выбранные стажёры</option>
                </select>
                {audienceScope === 'selected_interns' && (
                  <div className="chat-checkboxes">
                    {mentorInternOptions.map((intern) => (
                      <label className="chat-checkbox" key={intern.value}>
                        <input
                          checked={targetInternIds.includes(intern.value)}
                          onChange={() => toggleIntern(intern.value)}
                          type="checkbox"
                        />
                        <span>{intern.label}</span>
                      </label>
                    ))}
                  </div>
                )}
                <input
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  type="file"
                />
                <button className="primary-button" disabled={loading} type="submit">
                  Опубликовать
                </button>
              </form>
            </section>
          )}

          <section className="dashboard-card materials-library-card jira-materials-library">
            <div className="section-head">
              <div>
                <p className="auth-kicker">LIBRARY</p>
                <h3>Доступные материалы</h3>
              </div>
              {loading && <span className="inline-note">Загрузка...</span>}
            </div>

            <div className="materials-list">
              {materials.map((material) => (
                <article className="materials-item jira-material-item" key={material.id}>
                  <div className="materials-item-top">
                    <span className="detail-badge subtle">
                      {material.audience_scope || 'material'}
                    </span>
                  </div>
                  <strong>{material.title}</strong>
                  <p>{material.description}</p>
                  <button
                    className="secondary-button"
                    onClick={async () => {
                      const response = await getDownloadUrl(token, material.file_id);
                      window.open(response.download_url, '_blank', 'noopener,noreferrer');
                    }}
                    type="button"
                  >
                    Открыть файл
                  </button>
                </article>
              ))}
            </div>
            {message && <p className="auth-message">{message}</p>}
          </section>
        </section>
      </section>
    </main>
  );
}
