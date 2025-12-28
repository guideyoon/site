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
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm mb-6 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <a href="/items" className="text-blue-500 hover:underline">← 목록으로</a>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-2xl font-bold">항목 상세</h1>
                        <div className="space-x-2 flex">
                            {!editing ? (
                                <>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                                    >
                                        수정
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalMode('blog')
                                            setShowModal(true)
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium flex items-center gap-2"
                                    >
                                        <span>📝</span> 블로그로 내보내기
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setEditing(false)}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                                    >
                                        저장
                                    </button>
                                </>
                            )}
                            {/* New buttons from snippet, keeping them but they are not part of original functionality */}
                            <button
                                onClick={handleExport}
                                className="px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                            >
                                내용 복사
                            </button>
                            <button
                                onClick={handleDeleteItem}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium transition-colors"
                            >
                                삭제
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg overflow-hidden border border-transparent dark:border-slate-800 transition-colors">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1">
                                    {/* Original title and summary editing logic */}
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-black dark:bg-slate-700 dark:text-gray-100 dark:border-slate-600"
                                        />
                                    ) : (
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{item.title}</h1>
                                    )}
                                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                        {/* Assuming source_name is not available, using item.url for source */}
                                        <span className="flex items-center">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1">출처:</span> {item.url.split('/')[2]}
                                        </span>
                                        <span className="flex items-center">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 mr-1">수집일:</span> {new Date(item.collected_at).toLocaleDateString('ko-KR')}
                                        </span>
                                    </div>
                                </div>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm font-bold transition-colors"
                                >
                                    원문 보기
                                </a>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white border-b dark:border-slate-800 pb-2">수집 상세 정보</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <span className="w-24 text-gray-500 dark:text-gray-400 text-sm font-medium">유형</span>
                                            {/* Assuming source_type is not available, using a generic type */}
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400`}>
                                                웹 게시물
                                            </span>
                                        </div>
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
                                    <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                                        {item.raw_text || '본문 내용이 없습니다.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Images Gallery & Download */}
                {item.image_urls && item.image_urls.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-6 mb-6 border border-transparent dark:border-slate-800 transition-colors mt-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white underline decoration-blue-500 decoration-2 underline-offset-4">수집된 이미지 ({item.image_urls.length})</h2>
                            <button
                                onClick={() => {
                                    item.image_urls?.forEach((url, index) => {
                                        setTimeout(() => {
                                            const apiUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:8001` : 'http://localhost:8001';
                                            const filename = `image_${item.id}_${index + 1}.jpg`;
                                            const downloadUrl = `${apiUrl}/api/items/download-proxy?url=${encodeURIComponent(url)}&filename=${filename}`;

                                            const link = document.createElement('a');
                                            link.href = downloadUrl;
                                            link.setAttribute('download', filename);
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }, index * 500);
                                    });
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center gap-2 shadow-md transition-all active:scale-95"
                            >
                                <span>📥</span> 전체 이미지 다운로드
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {item.image_urls.map((url, idx) => (
                                <div key={idx} className="group relative bg-gray-50 dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                                    <div className="aspect-square relative flex items-center justify-center bg-white dark:bg-slate-900 overflow-hidden">
                                        <img
                                            src={url}
                                            alt={`수집 이미지 ${idx + 1}`}
                                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                                (e.target as any).src = 'https://via.placeholder.com/400?text=Image+Not+Found';
                                            }}
                                        />
                                    </div>
                                    <div className="p-3 flex justify-center bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
                                        <button
                                            onClick={() => {
                                                const apiUrl = typeof window !== 'undefined' ? `http://${window.location.hostname}:8001` : 'http://localhost:8001';
                                                const filename = `image_${item.id}_${idx + 1}.jpg`;
                                                const downloadUrl = `${apiUrl}/api/items/download-proxy?url=${encodeURIComponent(url)}&filename=${filename}`;

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
                            ))}
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
