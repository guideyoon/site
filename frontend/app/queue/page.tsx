'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { queueApi, authApi } from '@/lib/api'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

interface QueueItem {
    id: number
    item_id: number
    item_title: string
    item_category: string | null
    scheduled_at: string | null
    approved_at: string | null
    note_editor: string | null
}

export default function QueuePage() {
    const router = useRouter()
    const [queueItems, setQueueItems] = useState<QueueItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [selectedItem, setSelectedItem] = useState<number | null>(null)
    const [note, setNote] = useState('')
    const [showNoteModal, setShowNoteModal] = useState(false)
    const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve')
    const [user, setUser] = useState<any>(null)

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
        fetchQueue(true)
    }, [router])

    const fetchQueue = async (initial = false) => {
        // Only show global loading if we have no items yet
        if (initial && queueItems.length === 0) setLoading(true)
        else setRefreshing(true)

        try {
            const response = await queueApi.list()
            setQueueItems(response.data)
            setError('')
        } catch (err: any) {
            setError(err.response?.data?.detail || '데이터를 불러오는데 실패했습니다')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const openNoteModal = (itemId: number, action: 'approve' | 'reject') => {
        setSelectedItem(itemId)
        setModalAction(action)
        setNote('')
        setShowNoteModal(true)
    }

    const handleApprove = async () => {
        if (!selectedItem) return

        try {
            await queueApi.approve(selectedItem, note || undefined)
            alert('승인되었습니다')
            setShowNoteModal(false)
            fetchQueue()
        } catch (err: any) {
            alert(err.response?.data?.detail || '승인에 실패했습니다')
        }
    }

    const handleReject = async () => {
        if (!selectedItem) return

        try {
            await queueApi.reject(selectedItem, note || undefined)
            alert('반려되었습니다')
            setShowNoteModal(false)
            fetchQueue()
        } catch (err: any) {
            alert(err.response?.data?.detail || '반려에 실패했습니다')
        }
    }

    const viewExport = async (queueId: number) => {
        try {
            const response = await queueApi.export(queueId)
            const exportData = response.data

            // Open in new window or show modal
            const newWindow = window.open('', '_blank', 'width=600,height=800')
            if (newWindow) {
                newWindow.document.write(`
          <html>
            <head>
              <title>내보내기</title>
              <style>
                body { font-family: sans-serif; padding: 20px; }
                pre { white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px; }
                button { padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer; }
                button:hover { background: #2563eb; }
              </style>
            </head>
            <body>
              <h2>카페 게시글</h2>
              <button onclick="navigator.clipboard.writeText(document.getElementById('content').textContent); alert('클립보드에 복사되었습니다!')">
                클립보드에 복사
              </button>
              <pre id="content">${exportData.payload_text}</pre>
            </body>
          </html>
        `)
            }
        } catch (err: any) {
            alert(err.response?.data?.detail || '내보내기에 실패했습니다')
        }
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar user={user} />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex items-center space-x-4 mb-6">
                        <h2 className="text-2xl font-bold">승인 대기열</h2>
                        {refreshing && (
                            <span className="text-sm text-blue-500 animate-pulse">업데이트 중...</span>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow">
                        {loading && queueItems.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 bg-white rounded-lg shadow border border-gray-200">대기열을 불러오는 중...</div>
                        ) : queueItems.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow border border-gray-200">
                                대기 중인 항목이 없습니다.
                                <br />
                                <a href="/items" className="text-blue-500 hover:underline mt-2 inline-block">
                                    수집함에서 항목을 추가하세요
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4 mb-6">
                                    {queueItems.map((item) => (
                                        <div key={`mobile-${item.id}`} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="text-base font-bold text-gray-900 truncate">
                                                        <a href={`/items/${item.item_id}`} className="hover:text-blue-500 transition-colors">
                                                            {item.item_title}
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                                                            {item.item_category || '미분류'}
                                                        </span>
                                                        {item.approved_at ? (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-800">
                                                                승인됨
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-800">
                                                                대기중
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {item.note_editor && (
                                                <div className="text-sm text-gray-600 bg-gray-50 rounded p-2 mb-3 mt-2 border-l-2 border-blue-400">
                                                    <span className="font-semibold text-xs text-gray-400 block mb-1">EDITOR NOTE</span>
                                                    {item.note_editor}
                                                </div>
                                            )}

                                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                                {!item.approved_at ? (
                                                    <>
                                                        <button
                                                            onClick={() => openNoteModal(item.id, 'approve')}
                                                            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-transform"
                                                        >
                                                            승인
                                                        </button>
                                                        <button
                                                            onClick={() => openNoteModal(item.id, 'reject')}
                                                            className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-bold active:scale-95 transition-transform"
                                                        >
                                                            반려
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => viewExport(item.id)}
                                                        className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm"
                                                    >
                                                        내보내기 정보 보기
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block bg-white rounded-lg shadow border border-gray-200">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-16 bg-gray-50 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                                                        제목
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-16 bg-gray-50 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                                                        카테고리
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-16 bg-gray-50 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                                                        상태
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-16 bg-gray-50 z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                                                        작업
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {queueItems.map((item) => (
                                                    <tr key={`desktop-${item.id}`} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                <a href={`/items/${item.item_id}`} className="text-blue-600 hover:underline">
                                                                    {item.item_title}
                                                                </a>
                                                            </div>
                                                            {item.note_editor && (
                                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                    <span className="font-bold text-blue-500 bg-blue-50 px-1 rounded">NOTE</span>
                                                                    {item.note_editor}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700">
                                                                {item.item_category || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {item.approved_at ? (
                                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-50 text-green-700">
                                                                    승인됨
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-50 text-yellow-700">
                                                                    대기중
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                                                            {!item.approved_at && (
                                                                <>
                                                                    <button
                                                                        onClick={() => openNoteModal(item.id, 'approve')}
                                                                        className="text-green-600 hover:text-green-800 font-bold transition-colors"
                                                                    >
                                                                        승인
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openNoteModal(item.id, 'reject')}
                                                                        className="text-red-500 hover:text-red-700 font-medium transition-colors"
                                                                    >
                                                                        반려
                                                                    </button>
                                                                </>
                                                            )}
                                                            {item.approved_at && (
                                                                <button
                                                                    onClick={() => viewExport(item.id)}
                                                                    className="text-blue-600 hover:text-blue-800 font-bold transition-colors"
                                                                >
                                                                    내보내기
                                                                </button>
                                                            )}
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

                    <div className="mt-4 text-sm text-gray-500">
                        총 {queueItems.length}개의 항목
                    </div>
                </div>
            </main>

            {/* Note Modal */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">
                            {modalAction === 'approve' ? '승인' : '반려'}
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                메모 (선택사항)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                                placeholder="메모를 입력하세요..."
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setShowNoteModal(false)}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                취소
                            </button>
                            <button
                                onClick={modalAction === 'approve' ? handleApprove : handleReject}
                                className={`px-4 py-2 text-white rounded ${modalAction === 'approve'
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                    }`}
                            >
                                {modalAction === 'approve' ? '승인' : '반려'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
