'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

    const categories = ['행사', '공지', '채용', '지원사업', '안전', '교통', '문화', '축제', '복지', '교육', '환경', '산업']
    const regions = ['울산 전체', '중구', '남구', '동구', '북구', '울주군']

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-gray-500">로딩 중...</div>
            </div>
        )
    }

    if (error || !item) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 mb-4">{error || '항목을 찾을 수 없습니다'}</div>
                    <a href="/items" className="text-blue-500 hover:underline">목록으로 돌아가기</a>
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
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
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
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
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
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                            {editing ? (
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                                />
                            ) : (
                                <div className="text-lg font-semibold">{item.title}</div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                                {editing ? (
                                    <select
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                                    >
                                        <option value="">선택</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded">{item.category || '-'}</div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
                                {editing ? (
                                    <select
                                        value={editRegion}
                                        onChange={(e) => setEditRegion(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                                    >
                                        <option value="">선택</option>
                                        {regions.map(reg => (
                                            <option key={reg} value={reg}>{reg}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="px-3 py-2 bg-gray-50 rounded">{item.region || '-'}</div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">요약</label>
                            {editing ? (
                                <textarea
                                    value={editSummary}
                                    onChange={(e) => setEditSummary(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                                />
                            ) : (
                                <div className="px-3 py-2 bg-gray-50 rounded whitespace-pre-wrap">
                                    {item.summary_text || '요약 없음'}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
                            {editing ? (
                                <input
                                    type="text"
                                    value={editTags}
                                    onChange={(e) => setEditTags(e.target.value)}
                                    placeholder="태그1, 태그2, 태그3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                                />
                            ) : (
                                <div className="px-3 py-2 bg-gray-50 rounded">
                                    {item.tags && item.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {item.tags.map((tag, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : '-'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Original Content */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">원본 정보</h2>
                    <div className="space-y-3">
                        <div>
                            <span className="font-medium">URL:</span>{' '}
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                {item.url}
                            </a>
                        </div>
                        <div>
                            <span className="font-medium">상태:</span> {item.status}
                        </div>
                        <div>
                            <span className="font-medium">수집일:</span> {new Date(item.collected_at).toLocaleString('ko-KR')}
                        </div>
                        {item.published_at && (
                            <div>
                                <span className="font-medium">게시일:</span> {new Date(item.published_at).toLocaleString('ko-KR')}
                            </div>
                        )}
                    </div>

                    {item.raw_text && (
                        <div className="mt-4">
                            <h3 className="font-medium mb-2">원문 발췌</h3>
                            <div className="px-3 py-2 bg-gray-50 rounded max-h-60 overflow-y-auto text-sm whitespace-pre-wrap">
                                {item.raw_text}
                            </div>
                        </div>
                    )}
                </div>

                {/* Duplicates */}
                {item.duplicates && item.duplicates.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold mb-4">중복 후보 ({item.duplicates.length})</h2>
                        <div className="space-y-2">
                            {item.duplicates.map((dup) => (
                                <div key={dup.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded">
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
