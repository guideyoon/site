'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { itemsApi } from '@/lib/api'
import AIWriterModal from '@/components/AIWriterModal'

interface Item {
    id: number
    title: string
    url: string
    raw_text: string | null
    summary_text: string | null
    category: string | null
    region: string | null
    tags: string[] | null
    status: string
    published_at: string | null
    collected_at: string
    image_urls: string[] | null
    duplicates: Array<{
        id: number
        title: string
        url: string
        similarity: number
    }>
}

export default function ItemDetailPage() {
    const router = useRouter()
    const params = useParams()
    const itemId = parseInt(params.id as string)

    const [item, setItem] = useState<Item | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState(false)

    // Edit fields
    const [editTitle, setEditTitle] = useState('')
    const [editSummary, setEditSummary] = useState('')
    const [editCategory, setEditCategory] = useState('')
    const [editRegion, setEditRegion] = useState('')
    const [editTags, setEditTags] = useState('')

    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<'blog' | 'cafe'>('blog')

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        fetchItem()
    }, [itemId, router])

    const fetchItem = async () => {
        setLoading(true)
        try {
            const response = await itemsApi.get(itemId)
            const data = response.data
            setItem(data)
            setEditTitle(data.title)
            setEditSummary(data.summary_text || '')
            setEditCategory(data.category || '')
            setEditRegion(data.region || '')
            setEditTags(data.tags?.join(', ') || '')
            setError('')
        } catch (err: any) {
            setError(err.response?.data?.detail || '항목을 불러오는데 실패했습니다')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            await itemsApi.update(itemId, {
                title: editTitle,
                summary_text: editSummary,
                category: editCategory,
                region: editRegion,
                tags: editTags.split(',').map(t => t.trim()).filter(t => t)
            })
            setEditing(false)
            fetchItem()
            alert('저장되었습니다')
        } catch (err: any) {
            alert(err.response?.data?.detail || '저장에 실패했습니다')
        }
    }

    const handleAddToQueue = async () => {
        try {
            await itemsApi.addToQueue(itemId)
            alert('대기열에 추가되었습니다')
            router.push('/queue')
        } catch (err: any) {
            alert(err.response?.data?.detail || '대기열 추가에 실패했습니다')
        }
    }

    const handleDeleteItem = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return
        try {
            await itemsApi.delete(itemId)
            alert('삭제되었습니다')
            router.push('/items')
        } catch (err: any) {
            alert(err.response?.data?.detail || '삭제에 실패했습니다')
        }
    }

    const handleExport = () => {
        const text = `제목: ${item?.title}\n\n요약: ${item?.summary_text}\n\n본문:\n${item?.raw_text}\n\n출처: ${item?.url}`
        navigator.clipboard.writeText(text)
            .then(() => alert('내용이 클립보드에 복사되었습니다'))
            .catch(err => alert('복사에 실패했습니다: ' + err))
    }

    const categories = ['행사', '공지', '채용', '지원사업', '안전', '교통', '문화', '축제', '복지', '교육', '환경', '산업']
    const regions = ['울산 전체', '중구', '남구', '동구', '북구', '울주군']

    const getProxyUrl = (url: string) => {
        if (!url) return '';
        // If it's a Threads image, use the backend proxy
        if (url.includes('cdninstagram.com')) {
            // Use relative path for Next.js rewrite support in browser
            return `/api/items/download-proxy?url=${encodeURIComponent(url)}&referer=https://www.threads.net/`;
        }
        // If it's a Naver image, use the backend proxy
        if (url.includes('pstatic.net') || url.includes('naver.com')) {
            return `/api/items/download-proxy?url=${encodeURIComponent(url)}&referer=https://m.blog.naver.com/`;
        }
        return url;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center transition-colors">
                <div className="text-gray-500 dark:text-gray-400">로딩 중...</div>
            </div>
        )
    }

    if (error || !item) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center transition-colors">
                <div className="text-center">
                    <div className="text-red-500 dark:text-red-400 mb-4">{error || '항목을 찾을 수 없습니다'}</div>
                    <Link href="/items" className="text-blue-500 dark:text-blue-400 hover:underline">목록으로 돌아가기</Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors duration-300">
            <nav className="bg-white dark:bg-slate-900 shadow-sm border-b border-transparent dark:border-slate-800 mb-4 sm:mb-6 sticky top-16 z-50 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-14 sm:h-16">
                        <div className="flex items-center">
                            <a href="/items" className="text-blue-500 hover:underline text-sm sm:text-base font-medium">← 목록으로 돌아가기</a>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 sm:p-6 mb-6 border border-transparent dark:border-slate-800 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">항목 상세 정보</h1>
                        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                            {!editing ? (
                                <>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 font-medium text-xs sm:text-sm"
                                    >
                                        수정
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalMode('blog')
                                            setShowModal(true)
                                        }}
                                        className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm shadow-md shadow-blue-500/20"
                                    >
                                        <span>📝</span> <span>글 편집</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="px-3 sm:px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-medium text-xs sm:text-sm"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-bold text-xs sm:text-sm"
                                    >
                                        저장
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleExport}
                                className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                            >
                                본문 복사
                            </button>
                            <button
                                onClick={handleDeleteItem}
                                className="px-3 sm:px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap"
                            >
                                삭제
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg overflow-hidden border border-transparent dark:border-slate-800 transition-colors">
                        <div className="p-4 sm:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                                <div className="flex-1 min-w-0">
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    ) : (
                                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight">{item.title}</h1>
                                    )}
                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1.5">출처:</span> {item.url.split('/')[2]}
                                        </span>
                                        <span className="hidden sm:inline text-gray-300 dark:text-slate-700">|</span>
                                        <span className="flex items-center">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1.5">수집일:</span> {new Date(item.collected_at).toLocaleDateString('ko-KR')}
                                        </span>
                                    </div>
                                </div>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-bold transition-all text-center border border-blue-100 dark:border-blue-900/30 shadow-sm"
                                >
                                    원문 링크로 이동
                                </a>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-slate-800 pb-2">수집 상세 정보</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <span className="w-24 text-gray-500 dark:text-gray-400 text-sm font-medium">게시일시</span>
                                            <span className="text-gray-900 dark:text-gray-200">
                                                {item.published_at ? new Date(item.published_at).toLocaleString('ko-KR') : '알 수 없음'}
                                            </span>
                                        </div>
                                        <div className="flex items-start">
                                            <span className="w-24 text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">원문 URL</span>
                                            <span className="text-blue-500 dark:text-blue-400 break-all text-sm hover:underline cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
                                                {item.url}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-slate-800 pb-2">요약 및 키워드</h2>
                                    {editing ? (
                                        <textarea
                                            value={editSummary}
                                            onChange={(e) => setEditSummary(e.target.value)}
                                            rows={4}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600"
                                        />
                                    ) : (
                                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 transition-colors">
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed italic">
                                                {item.summary_text || '요약 정보가 없습니다.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-slate-800 pb-2">본문 내용</h2>
                                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-6 max-h-[500px] overflow-y-auto transition-colors">
                                    <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-4">{item.title}</h3>
                                    <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                                        {item.raw_text || '본문 내용이 없습니다.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Images & Videos Gallery & Download */}
                {(item.image_urls && item.image_urls.length > 0) && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 mb-6 border border-transparent dark:border-slate-800 transition-colors mt-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white underline decoration-blue-500 decoration-2 underline-offset-4">수집된 미디어 ({(item.image_urls?.length || 0) + ((item as any).meta_json?.video_urls?.length || 0)})</h2>
                            <button
                                onClick={() => {
                                    item.image_urls?.forEach((url, index) => {
                                        setTimeout(() => {
                                            const filename = `image_${item.id}_${index + 1}.jpg`;
                                            const downloadUrl = `/api/items/download-proxy?url=${encodeURIComponent(url)}&filename=${filename}`;

                                            const link = document.createElement('a');
                                            link.href = downloadUrl;
                                            link.setAttribute('download', filename);
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }, index * 500);
                                    });
                                }}
                                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                            >
                                <span>📥</span> 전체 미디어 다운로드
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {item.image_urls.map((url, idx) => {
                                const video_urls = (item as any).meta_json?.video_urls || [];
                                const video_url = video_urls[idx]; // Try to match by index if it's a carousel

                                return (
                                    <div key={idx} className="group relative bg-gray-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                        <div className="aspect-video relative flex items-center justify-center bg-white dark:bg-slate-900 overflow-hidden">
                                            {video_url ? (
                                                <video
                                                    src={getProxyUrl(video_url)}
                                                    controls
                                                    className="w-full h-full object-contain"
                                                    poster={getProxyUrl(url)}
                                                >
                                                    해당 브라우저는 비디오 태그를 지원하지 않습니다.
                                                </video>
                                            ) : (
                                                <img
                                                    src={getProxyUrl(url)}
                                                    alt={`수집 미디어 ${idx + 1}`}
                                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                                    onError={(e) => {
                                                        (e.target as any).src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div className="p-3 flex justify-between items-center bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                                            <span className="text-[10px] text-gray-500 font-medium">{video_url ? '🎥 VIDEO' : '📷 IMAGE'}</span>
                                            <button
                                                onClick={() => {
                                                    const isVideo = !!video_url;
                                                    const targetUrl = video_url || url;
                                                    const extension = isVideo ? 'mp4' : 'jpg';
                                                    const filename = `${isVideo ? 'video' : 'image'}_${item.id}_${idx + 1}.${extension}`;
                                                    const downloadUrl = `/api/items/download-proxy?url=${encodeURIComponent(targetUrl)}&filename=${filename}`;

                                                    const link = document.createElement('a');
                                                    link.href = downloadUrl;
                                                    link.setAttribute('download', filename);
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }}
                                                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline py-1.5 px-4 rounded-full bg-blue-50 dark:bg-blue-900/30 transition-colors"
                                            >
                                                다운로드
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Duplicates */}
                {item.duplicates && item.duplicates.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 mb-12 border border-transparent dark:border-slate-800 transition-colors">
                        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">중복 후보 ({item.duplicates.length})</h2>
                        <div className="space-y-2">
                            {item.duplicates.map((dup) => (
                                <div key={dup.id} className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded">
                                    <div>
                                        <a href={`/items/${dup.id}`} className="text-blue-500 hover:underline">
                                            {dup.title}
                                        </a>
                                        <div className="text-sm text-gray-500">유사도: {(dup.similarity * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {item && (
                <AIWriterModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    mode={modalMode}
                    item={item}
                />
            )}
        </div>
    )
}
