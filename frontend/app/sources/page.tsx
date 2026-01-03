'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sourcesApi, authApi } from '@/lib/api'
import Navbar from '@/components/Navbar'

interface Source {
    id: number
    name: string
    type: string
    base_url: string
    enabled: boolean
    collect_interval: number
    last_collected_at: string | null
    crawl_policy: string | null
}

export default function SourcesPage() {
    const router = useRouter()
    const [sources, setSources] = useState<Source[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [notification, setNotification] = useState('')
    const [user, setUser] = useState<any>(null)
    const [collectingIds, setCollectingIds] = useState<Set<number>>(new Set())
    const [confirmingCollect, setConfirmingCollect] = useState<Source | null>(null)

    // Add source form
    const [showAddForm, setShowAddForm] = useState(false)
    const [newSourceName, setNewSourceName] = useState('')
    const [newSourceType, setNewSourceType] = useState('generic_board')
    const [newSourceUrl, setNewSourceUrl] = useState('')
    const [newSourceInterval, setNewSourceInterval] = useState(60)
    const [newSourceConfig, setNewSourceConfig] = useState('')

    // Edit source
    const [editingSource, setEditingSource] = useState<Source | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        const loadUser = async () => {
            try {
                const userRes = await authApi.me()
                setUser(userRes.data)
            } catch (err) {
                console.error('Failed to load user info', err)
            }
        }
        loadUser()
        fetchSources(true)
    }, [])

    const fetchSources = async (initial = false) => {
        // Only show global loading if we have no sources yet
        if (initial && sources.length === 0) setLoading(true)
        else setRefreshing(true)

        try {
            const response = await sourcesApi.list()
            setSources(response.data)
            setError('')
        } catch (err: any) {
            setError(err.response?.data?.detail || '데이터를 불러오는데 실패했습니다')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleToggle = async (id: number, currentEnabled: boolean) => {
        try {
            await sourcesApi.toggle(id, !currentEnabled)
            fetchSources()
        } catch (err: any) {
            alert(err.response?.data?.detail || '상태 변경에 실패했습니다')
        }
    }

    const handleCollect = (source: Source) => {
        setConfirmingCollect(source)
    }

    const executeCollect = async () => {
        if (!confirmingCollect) return
        const source = confirmingCollect
        const id = source.id
        const name = source.name

        setConfirmingCollect(null)
        setCollectingIds(prev => new Set(prev).add(id))
        console.log(`Starting collection for source ${id}: ${name}`)

        try {
            const resp = await sourcesApi.collect(id)
            console.log(`Collection triggered for ${id}:`, resp.data)
            // Call refresh immediately
            fetchSources()
            setNotification(`"${name}" 수집이 시작되었습니다.`)
            setTimeout(() => setNotification(''), 3000)
        } catch (err: any) {
            console.error(`Collection failed for ${id}:`, err)
            const detail = err.response?.data?.detail
            if (err.response?.status === 503) {
                setError(`[서비스 점검 필요] ${detail || '서버 내부 서비스(Redis)와 연결할 수 없습니다.'}`)
            } else {
                setError(detail || '수집 시작에 실패했습니다. 서버 상태를 확인해주세요.')
            }
            setTimeout(() => setError(''), 5000)
        } finally {
            setCollectingIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        }
    }

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`"${name}" 출처를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return

        try {
            await sourcesApi.delete(id)
            fetchSources()
            alert('출처가 삭제되었습니다')
        } catch (err: any) {
            alert(err.response?.data?.detail || '출처 삭제에 실패했습니다')
        }
    }

    const handleAddSource = async () => {
        if (!newSourceName || !newSourceUrl) {
            alert('이름과 URL은 필수입니다')
            return
        }

        try {
            await sourcesApi.create({
                name: newSourceName,
                type: newSourceType,
                base_url: newSourceUrl,
                collect_interval: isNaN(newSourceInterval) ? 60 : newSourceInterval,
                crawl_policy: newSourceConfig || null
            })

            setShowAddForm(false)
            setNewSourceName('')
            setNewSourceType('generic_board')
            setNewSourceUrl('')
            setNewSourceInterval(60)
            setNewSourceConfig('')
            fetchSources()
            alert('출처가 추가되었습니다')
        } catch (err: any) {
            alert(err.response?.data?.detail || '출처 추가에 실패했습니다')
        }
    }

    const handleUpdateSource = async () => {
        if (!editingSource) return
        if (!editingSource.name || !editingSource.base_url) {
            alert('이름과 URL은 필수입니다')
            return
        }

        try {
            await sourcesApi.update(editingSource.id, {
                name: editingSource.name,
                type: editingSource.type,
                base_url: editingSource.base_url,
                collect_interval: isNaN(editingSource.collect_interval) ? 60 : editingSource.collect_interval,
                crawl_policy: editingSource.crawl_policy,
                enabled: editingSource.enabled
            })

            setEditingSource(null)
            fetchSources()
            alert('출처 정보가 수정되었습니다')
        } catch (err: any) {
            console.error('Update error:', err)
            alert(err.response?.data?.detail || '출처 수정에 실패했습니다')
        }
    }


    const getTimeAgo = (dateString: string | null) => {
        if (!dateString) return '수집 기록 없음';
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}시간 전`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}일 전`;
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 font-sans transition-colors duration-300">
            <Navbar user={user} />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">출처 관리</h2>
                            {refreshing && (
                                <span className="text-sm text-blue-500 animate-pulse">업데이트 중...</span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600 transition font-semibold"
                        >
                            {showAddForm ? '취소' : '+ 출처 추가'}
                        </button>
                    </div>

                    {/* Add Source Form */}
                    {showAddForm && (
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">새 출처 추가</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">이름</label>
                                    <input
                                        type="text"
                                        value={newSourceName}
                                        onChange={(e) => setNewSourceName(e.target.value)}
                                        placeholder="예: 울산시청 공지사항"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">타입</label>
                                    <select
                                        value={newSourceType}
                                        onChange={(e) => setNewSourceType(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                    >
                                        <option value="generic_board">사이트 (기관/뉴스)</option>
                                        <option value="naver_blog">네이버 블로그</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="threads">Threads</option>
                                        <option value="x">X (Twitter)</option>
                                        <option value="rss">RSS</option>
                                        <option value="api">API</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">기본 URL</label>
                                    <input
                                        type="url"
                                        value={newSourceUrl}
                                        onChange={(e) => setNewSourceUrl(e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">수집 주기 (분)</label>
                                    <input
                                        type="number"
                                        value={newSourceInterval}
                                        onChange={(e) => setNewSourceInterval(parseInt(e.target.value))}
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        크롤링 설정 (JSON, 선택사항)
                                    </label>
                                    <textarea
                                        value={newSourceConfig}
                                        onChange={(e) => setNewSourceConfig(e.target.value)}
                                        rows={2}
                                        placeholder='{"list_url": "...", "selectors": {"row": "tr", "title": "a"}}'
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 font-mono text-sm"
                                    />
                                </div>

                                <button
                                    onClick={handleAddSource}
                                    className="md:col-span-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold transition"
                                >
                                    추가하기
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Edit Source Modal */}
                    {editingSource && (
                        <div className="fixed inset-0 bg-gray-600/50 dark:bg-black/70 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                            <div className="relative p-8 border w-[600px] shadow-lg rounded-md bg-white dark:bg-slate-900 dark:border-slate-700">
                                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">출처 정보 수정</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">이름</label>
                                        <input
                                            type="text"
                                            value={editingSource.name}
                                            onChange={(e) => setEditingSource({ ...editingSource, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">타입</label>
                                            <select
                                                value={editingSource.type}
                                                onChange={(e) => setEditingSource({ ...editingSource, type: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                            >
                                                <option value="generic_board">사이트 (기관/뉴스)</option>
                                                <option value="naver_blog">네이버 블로그</option>
                                                <option value="instagram">Instagram</option>
                                                <option value="threads">Threads</option>
                                                <option value="x">X (Twitter)</option>
                                                <option value="rss">RSS</option>
                                                <option value="api">API</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">수집 주기 (분)</label>
                                            <input
                                                type="number"
                                                value={editingSource.collect_interval}
                                                onChange={(e) => setEditingSource({ ...editingSource, collect_interval: parseInt(e.target.value) })}
                                                min="1"
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">기본 URL</label>
                                        <input
                                            type="url"
                                            value={editingSource.base_url}
                                            onChange={(e) => setEditingSource({ ...editingSource, base_url: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">크롤링 설정 (JSON)</label>
                                        <textarea
                                            value={editingSource.crawl_policy || ''}
                                            onChange={(e) => setEditingSource({ ...editingSource, crawl_policy: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-800 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="flex space-x-3 pt-4">
                                        <button
                                            onClick={handleUpdateSource}
                                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-bold transition"
                                        >
                                            저장
                                        </button>
                                        <button
                                            onClick={() => setEditingSource(null)}
                                            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-slate-600 font-bold transition"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {notification && (
                        <div className="bg-blue-100 dark:bg-blue-900/40 border border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded mb-4 animate-fade-in shadow-sm">
                            {notification}
                        </div>
                    )}

                    {/* Collection Confirmation Modal */}
                    {confirmingCollect && (
                        <div className="fixed inset-0 bg-gray-600/50 dark:bg-black/70 overflow-y-auto h-full w-full z-[60] flex items-center justify-center p-4">
                            <div className="relative p-6 border w-full max-w-md shadow-2xl rounded-xl bg-white dark:bg-slate-900 dark:border-slate-800 transition-all transform scale-100">
                                <div className="flex items-center space-x-3 mb-4 text-blue-600 dark:text-blue-400">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-xl font-bold">수집 시작 안내</h3>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <p className="text-gray-700 dark:text-gray-300">
                                        <span className="font-semibold text-gray-900 dark:text-white">"{confirmingCollect.name}"</span> 출처에서 지금 즉시 수집을 시작하시겠습니까?
                                    </p>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm space-y-2 border border-blue-100 dark:border-blue-900/30">
                                        <div className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            <p className="text-gray-600 dark:text-gray-400"><strong className="text-gray-800 dark:text-gray-200">10일 이내:</strong> 최근 10일 이내의 새 게시물만 가져옵니다.</p>
                                        </div>
                                        <div className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            <p className="text-gray-600 dark:text-gray-400"><strong className="text-gray-800 dark:text-gray-200">중복 방지:</strong> 이미 가져온 글은 중복해서 저장하지 않습니다.</p>
                                        </div>
                                        <div className="flex items-start">
                                            <span className="text-blue-500 mr-2">•</span>
                                            <p className="text-gray-600 dark:text-gray-400"><strong className="text-gray-800 dark:text-gray-200">최신 위주:</strong> 사이트의 최신 목록을 우선적으로 대조합니다.</p>
                                        </div>
                                        {!confirmingCollect.enabled && (
                                            <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/30 flex items-start">
                                                <span className="text-orange-500 mr-2">⚡</span>
                                                <p className="text-orange-700 dark:text-orange-400 font-medium italic">현재 'Off' 상태입니다. 수집 시작 시 자동으로 'On'으로 전환됩니다.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={executeCollect}
                                        className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition"
                                    >
                                        지금 시작하기
                                    </button>
                                    <button
                                        onClick={() => setConfirmingCollect(null)}
                                        className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 font-bold transition"
                                    >
                                        나중에
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Sources List */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800">
                        {loading && sources.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800">출처 목록을 로딩 중...</div>
                        ) : sources.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800">
                                등록된 출처가 없습니다.
                                <br />
                                출처를 추가하여 콘텐츠 수집을 시작하세요.
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4 mb-6">
                                    {sources.map((source) => (
                                        <div key={`mobile-${source.id}`} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800 shadow-sm transition-all hover:border-gray-200 dark:hover:border-slate-700">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-base font-bold text-gray-900 dark:text-gray-100">{source.name}</div>
                                                    <div className="text-xs text-blue-500 dark:text-blue-400 truncate max-w-[200px] mt-0.5">{source.base_url}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleToggle(source.id, source.enabled)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm transition ${source.enabled
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-red-500 text-white'
                                                        }`}
                                                >
                                                    {source.enabled ? 'ON' : 'OFF'}
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3 mb-4">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${source.type === 'naver_blog'
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : source.type === 'threads'
                                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                                        : source.type === 'instagram'
                                                            ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400'
                                                            : source.type === 'x'
                                                                ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                    }`}>
                                                    {source.type === 'generic_board' ? '사이트' :
                                                        source.type === 'naver_blog' ? '블로그' :
                                                            source.type === 'threads' ? 'Threads' :
                                                                source.type === 'instagram' ? 'Instagram' :
                                                                    source.type === 'x' ? 'X' : source.type}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    주기: {source.collect_interval}분
                                                </span>
                                                {source.last_collected_at && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        수집: {getTimeAgo(source.last_collected_at)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-slate-700/50">
                                                <button
                                                    onClick={() => handleCollect(source)}
                                                    disabled={collectingIds.has(source.id)}
                                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                                                >
                                                    {collectingIds.has(source.id) && (
                                                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    )}
                                                    <span>수집 실행</span>
                                                </button>
                                                <button
                                                    onClick={() => setEditingSource(source)}
                                                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-bold"
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(source.id, source.name)}
                                                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                                            <thead className="bg-gray-50 dark:bg-slate-900">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">출처 정보</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">구분</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">수집 주기</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">상태</th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">관리</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                                {sources.map((source) => (
                                                    <tr key={`desktop-${source.id}`} className="hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{source.name}</div>
                                                            <a href={source.base_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 dark:text-blue-400 hover:underline">
                                                                {source.base_url}
                                                            </a>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${source.type === 'naver_blog'
                                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                                : source.type === 'threads'
                                                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                                                    : source.type === 'instagram'
                                                                        ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300'
                                                                        : source.type === 'x'
                                                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300'
                                                                            : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-300'
                                                                }`}>
                                                                {source.type === 'generic_board' ? '사이트' :
                                                                    source.type === 'naver_blog' ? '블로그' :
                                                                        source.type === 'threads' ? 'Threads' :
                                                                            source.type === 'instagram' ? 'Instagram' :
                                                                                source.type === 'x' ? 'X' : source.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">{source.collect_interval}분</div>
                                                            {source.last_collected_at && (
                                                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                                                    {new Date(source.last_collected_at).toLocaleString('ko-KR', { hour12: false, month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="relative group inline-block">
                                                                <button
                                                                    onClick={() => handleToggle(source.id, source.enabled)}
                                                                    className={`px-3 py-1 rounded text-xs font-bold transition ${source.enabled
                                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                                                                        }`}
                                                                >
                                                                    {source.enabled ? 'ON' : 'OFF'}
                                                                </button>
                                                                {source.enabled && (
                                                                    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-slate-700 text-white text-[10px] rounded whitespace-nowrap z-10 shadow-lg pointer-events-none">
                                                                        마지막 수집: {getTimeAgo(source.last_collected_at)}
                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-slate-700"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                                            <div className="flex justify-end items-center space-x-2 whitespace-nowrap">
                                                                <button
                                                                    onClick={() => handleCollect(source)}
                                                                    disabled={collectingIds.has(source.id)}
                                                                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 flex items-center space-x-1"
                                                                >
                                                                    {collectingIds.has(source.id) && (
                                                                        <svg className="animate-spin h-3 w-3 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                    )}
                                                                    <span>{collectingIds.has(source.id) ? '요청중...' : '수집'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingSource(source)}
                                                                    className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                                                                >
                                                                    수정
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(source.id, source.name)}
                                                                    className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                                                                >
                                                                    삭제
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-500 flex justify-between">
                        <span>총 {sources.length}개의 출처 관리 중</span>
                        <span>백그라운드 체크 주기: 5분</span>
                    </div>
                </div>
            </main>
        </div>
    )
}
