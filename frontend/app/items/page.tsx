'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { itemsApi, sourcesApi, authApi } from '@/lib/api'
import Navbar from '@/components/Navbar'

interface Item {
    id: number
    title: string
    source_id: number
    source_name: string
    category: string | null
    source_type: string
    region: string | null
    status: string
    published_at: string | null
    collected_at: string
    url: string
    image_urls: string[] | null
    thumbnail_url: string | null
}

interface ItemDetail extends Item {
    source_url: string
    raw_text: string | null
    summary_text: string | null
    meta_json: object | null
}

interface Source {
    id: number
    name: string
}

export default function ItemsPage() {
    const router = useRouter()
    const [items, setItems] = useState<Item[]>([])
    const [sources, setSources] = useState<Source[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    // Filters
    const [typeFilter, setTypeFilter] = useState('')
    const [sourceFilter, setSourceFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    const [isInitialLoad, setIsInitialLoad] = useState(true)

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
        fetchSources()

        if (isInitialLoad) {
            fetchItems(true)
            setIsInitialLoad(false)
        } else {
            fetchItems(false)
        }
    }, [typeFilter, sourceFilter, searchQuery])

    const fetchSources = async () => {
        try {
            const response = await sourcesApi.list()
            setSources(response.data)
        } catch (err) {
            console.error('Failed to fetch sources:', err)
        }
    }

    const fetchItems = async (initial = false) => {
        // Only show global loading if we have no items yet
        if (initial && items.length === 0) setLoading(true)
        else setRefreshing(true)

        try {
            const params: any = {}
            if (typeFilter) params.type = typeFilter
            if (sourceFilter) params.source_id = sourceFilter
            if (searchQuery) params.q = searchQuery

            const response = await itemsApi.list(params)
            console.log("[DEBUG] API Response Count:", response.data.length);
            if (response.data.length > 0) {
                console.log("[DEBUG] First item ID:", response.data[0].id);
                console.log("[DEBUG] First item Title:", response.data[0].title);
            }
            setItems(response.data)
            setError('')
        } catch (err: any) {
            setError(err.response?.data?.detail || '데이터를 불러오는데 실패했습니다')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleViewDetail = async (itemId: number) => {
        try {
            const response = await itemsApi.get(itemId)
            setSelectedItem(response.data)
            setShowModal(true)
        } catch (err) {
            console.error('Failed to fetch item detail:', err)
        }
    }

    const handleDeleteItem = async (id: number) => {
        if (!confirm('정말 이 게시글을 삭제하시겠습니까?')) return

        try {
            await itemsApi.delete(id)
            setShowModal(false)
            fetchItems()
            setSelectedIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        } catch (err: any) {
            alert(err.response?.data?.detail || '삭제에 실패했습니다')
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        if (!confirm(`선택한 ${selectedIds.size}개의 게시글을 정말 삭제하시겠습니까?`)) return

        setIsDeleting(true)
        try {
            await itemsApi.bulkDelete(Array.from(selectedIds))
            setSelectedIds(new Set())
            fetchItems()
            alert('성공적으로 삭제되었습니다')
        } catch (err: any) {
            alert(err.response?.data?.detail || '일괄 삭제에 실패했습니다')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeleteAll = async () => {
        if (!confirm('수집함의 모든 게시글을 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return

        setIsDeleting(true)
        try {
            await itemsApi.deleteAll()
            setSelectedIds(new Set())
            fetchItems()
            alert('모든 게시글이 삭제되었습니다')
        } catch (err: any) {
            alert(err.response?.data?.detail || '전체 삭제에 실패했습니다')
        } finally {
            setIsDeleting(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(items.map(i => i.id)))
        }
    }

    const toggleSelectItem = (id: number) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const handleExport = () => {
        if (!selectedItem) return

        const content = `제목: ${selectedItem.title}
출처: ${selectedItem.source_name} (${selectedItem.source_url})
게시일: ${selectedItem.published_at ? new Date(selectedItem.published_at).toLocaleDateString('ko-KR') : '알 수 없음'}
URL: ${selectedItem.url}

${selectedItem.raw_text || selectedItem.summary_text || '내용 없음'}

${selectedItem.image_urls && selectedItem.image_urls.length > 0 ? '이미지:\n' + selectedItem.image_urls.join('\n') : ''}`

        navigator.clipboard.writeText(content)
        alert('내용이 클립보드에 복사되었습니다!')
    }

    const handleDownload = async (url: string, filename?: string) => {
        try {
            const token = localStorage.getItem('token')
            const response = await fetch(`/api/items/download-proxy?url=${encodeURIComponent(url)}${filename ? `&filename=${encodeURIComponent(filename)}` : ''}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl

            // Try to get filename from response headers if not provided
            const contentDisposition = response.headers.get('Content-Disposition')
            let finalFilename = filename || 'download'
            if (contentDisposition && contentDisposition.includes('filename=')) {
                const match = contentDisposition.match(/filename="?([^";]+)"?/)
                if (match) finalFilename = match[1]
            }

            link.setAttribute('download', finalFilename)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(downloadUrl)
        } catch (err) {
            console.error('Download error:', err)
            alert('다운로드에 실패했습니다.')
        }
    }

    const categories = ['행사', '공지', '채용', '지원사업', '안전', '교통', '문화', '축제', '복지', '교육', '환경', '산업']

    const getProxyUrl = (url: string, source_type: string) => {
        if (!url) return '';
        if (source_type === 'naver_blog' || url.includes('pstatic.net') || url.includes('naver.com')) {
            return `/api/items/download-proxy?url=${encodeURIComponent(url)}&referer=https://m.blog.naver.com/`;
        }
        if (source_type === 'threads' || url.includes('cdninstagram.com')) {
            return `/api/items/download-proxy?url=${encodeURIComponent(url)}&referer=https://www.threads.net/`;
        }
        return url;
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors duration-300">
            <Navbar user={user} />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center space-x-4">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">수집함</h2>
                            <button
                                onClick={() => fetchItems(false)}
                                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                                title="새로고침"
                            >
                                <svg className={`w-5 h-5 ${refreshing ? 'animate-spin text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            {refreshing ? (
                                <span className="text-sm text-blue-500 animate-pulse">업데이트 중...</span>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400">
                                        {new Date().toLocaleTimeString()} 기준
                                    </span>
                                    <div className="bg-yellow-100 dark:bg-yellow-900/30 text-[10px] px-2 py-1 rounded mt-1 border border-yellow-200 dark:border-yellow-800 font-mono">
                                        <div>DEBUG: Count={items.length} | TopItem=#{items[0]?.id || 'N/A'}</div>
                                        <div className="text-[9px] mt-1 text-blue-600 dark:text-blue-400">
                                            Top 5: {items.slice(0, 5).map(i => `#${i.id}:${i.title.substring(0, 10)}`).join(' | ')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex space-x-2 w-full sm:w-auto">
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.size === 0 || isDeleting}
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-semibold disabled:opacity-50 transition-colors"
                            >
                                {selectedIds.size > 0 ? `선택 삭제 (${selectedIds.size})` : '선택 삭제'}
                            </button>
                            <button
                                onClick={handleDeleteAll}
                                disabled={items.length === 0 || isDeleting}
                                className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-semibold disabled:opacity-50 transition-colors"
                            >
                                전체 삭제
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <nav className="bg-white dark:bg-slate-900 shadow-sm border-b border-transparent dark:border-slate-800 mb-4 sm:mb-6 transition-colors">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex justify-between h-14 sm:h-16">
                                <div className="flex items-center">
                                    <a href="/items" className="text-blue-500 hover:underline text-sm sm:text-base font-medium">← 목록으로 돌아가기</a>
                                </div>
                            </div>
                        </div>
                    </nav>
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 mb-6 border border-transparent dark:border-slate-800 transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">구분</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white bg-white dark:bg-slate-800 transition-colors"
                                >
                                    <option value="">전체</option>
                                    <option value="generic_board">사이트</option>
                                    <option value="naver_blog">블로그</option>
                                    <option value="threads">Threads</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">출처</label>
                                <select
                                    value={sourceFilter}
                                    onChange={(e) => setSourceFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white bg-white dark:bg-slate-800 transition-colors"
                                >
                                    <option value="">전체</option>
                                    {sources.map(source => (
                                        <option key={source.id} value={source.id}>{source.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">검색</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="제목 검색..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-gray-900 dark:text-white bg-white dark:bg-slate-800 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {/* Items Table */}

                    {loading && items.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-8 text-center text-gray-400 dark:text-gray-500">항목을 불러오는 중...</div>
                    ) : items.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-8 text-center text-gray-500 dark:text-gray-400">
                            수집된 항목이 없습니다.
                            <br />
                            <Link href="/sources" className="text-blue-500 hover:underline mt-2 inline-block">
                                출처를 추가하고 수집을 시작하세요
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4 mb-6">
                                {items.map((item) => (
                                    <div key={`mobile-${item.id}`} className={`p-4 rounded-xl border ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'} transition-all shadow-sm`}>
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 text-blue-600 rounded bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 mt-1"
                                                    checked={selectedIds.has(item.id)}
                                                    onChange={() => toggleSelectItem(item.id)}
                                                />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex gap-3 mb-3">
                                                    <div className="relative w-20 h-16 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 flex-shrink-0">
                                                        {item.thumbnail_url ? (
                                                            <img
                                                                src={getProxyUrl(item.thumbnail_url, item.source_type)}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x64?text=No+Img';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
                                                                No Img
                                                            </div>
                                                        )}
                                                        {item.image_urls && item.image_urls.length > 0 && (
                                                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded flex items-center">
                                                                📷 {item.image_urls.length}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1">
                                                            [{item.id}] {item.title}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                            <span className="truncate max-w-[100px]">{item.source_name}</span>
                                                            <span>•</span>
                                                            <span>{item.published_at ? new Date(item.published_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-slate-700/50 mt-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${item.source_type === 'naver_blog'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : item.source_type === 'threads'
                                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                        }`}>
                                                        {item.source_type === 'naver_blog' ? '블로그' :
                                                            item.source_type === 'threads' ? 'Threads' : '사이트'}
                                                    </span>
                                                    <div className="flex gap-4">
                                                        <Link
                                                            href={`/items/${item.id}`}
                                                            className="text-sm font-bold text-blue-600 dark:text-blue-400"
                                                        >
                                                            상세보기
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className="text-sm font-bold text-red-600 dark:text-red-400"
                                                        >
                                                            삭제
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-lg shadow border border-transparent dark:border-slate-800 transition-colors">
                                <div className="overflow-x-auto rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                                        <thead className="bg-gray-50 dark:bg-slate-900 z-40">
                                            <tr>
                                                <th className="px-6 py-3 text-left sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-blue-600 rounded bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                                                        checked={items.length > 0 && selectedIds.size === items.length}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    게시일
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    썸네일
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    제목
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    출처
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    구분
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky top-16 bg-gray-50 dark:bg-slate-900 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                    작업
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                            {items.map((item) => (
                                                <tr key={`desktop-${item.id}`} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-blue-600 rounded bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                                                            checked={selectedIds.has(item.id)}
                                                            onChange={() => toggleSelectItem(item.id)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                                                        {item.published_at ? new Date(item.published_at).toLocaleDateString('ko-KR') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="relative w-16 h-12 bg-gray-100 dark:bg-slate-800 rounded overflow-hidden border border-gray-200 dark:border-slate-700">
                                                                {item.thumbnail_url ? (
                                                                    <img
                                                                        src={getProxyUrl(item.thumbnail_url, item.source_type)}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x48?text=No+Img';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
                                                                        No Img
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {item.image_urls && item.image_urls.length > 0 && (
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full" title={`이미지 ${item.image_urls.length}개`}>
                                                                    📷 {item.image_urls.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                                            [{item.id}] {item.title}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                                        {item.source_name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.source_type === 'naver_blog'
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                            : item.source_type === 'threads'
                                                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                                                            }`}>
                                                            {item.source_type === 'naver_blog' ? '블로그' :
                                                                item.source_type === 'threads' ? 'Threads' : '사이트'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                        <Link
                                                            href={`/items/${item.id}`}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                                                        >
                                                            상세보기
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                                                        >
                                                            삭제
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        총 {items.length}개의 항목
                    </div>
                </div >
            </main >
        </div >
    )
}
