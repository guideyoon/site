'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'

export default function DashboardPage() {
    const router = useRouter()
    const [stats, setStats] = useState({
        collected_today: 0,
        pending_approval: 0,
        failed: 0
    })
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [aiKeys, setAiKeys] = useState({
        openai_api_key: '',
        gemini_api_key: '',
        perplexity_api_key: ''
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        const loadData = async () => {
            try {
                const userRes = await authApi.me()
                setUser(userRes.data)
                setAiKeys({
                    openai_api_key: userRes.data.openai_api_key || '',
                    gemini_api_key: userRes.data.gemini_api_key || '',
                    perplexity_api_key: userRes.data.perplexity_api_key || ''
                })
                setLoading(false)
            } catch (err) {
                console.error('Failed to load user info', err)
                router.push('/login')
            }
        }
        loadData()
    }, [])

    const handleSaveAiKeys = async () => {
        setSaving(true)
        try {
            await authApi.updateSettings({
                ...aiKeys
            })
            alert('설정이 저장되었습니다.')
        } catch (err) {
            console.error('Failed to save settings', err)
            alert('저장에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <h1 className="text-xl font-bold">사이트 수집기</h1>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                <Link href="/dashboard" className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    대시보드
                                </Link>
                                <Link href="/items" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    수집함
                                </Link>
                                <Link href="/sources" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                    출처 관리
                                </Link>
                                {user?.role === 'admin' && (
                                    <Link href="/admin" className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                                        관리자
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {user && (
                                <span className="text-sm text-gray-700 font-medium">
                                    {user.username} 님
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    localStorage.removeItem('token')
                                    router.push('/login')
                                }}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                로그아웃
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <h2 className="text-2xl font-bold mb-6">대시보드</h2>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">오늘 수집</dt>
                                            <dd className="text-3xl font-semibold text-gray-900">{stats.collected_today}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">승인 대기</dt>
                                            <dd className="text-3xl font-semibold text-gray-900">{stats.pending_approval}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">실패</dt>
                                            <dd className="text-3xl font-semibold text-gray-900">{stats.failed}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* AI API Settings */}
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-medium mb-4 flex items-center">
                                <span className="bg-purple-100 p-2 rounded-md mr-3">
                                    <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </span>
                                AI API 설정
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ChatGPT API Key</label>
                                    <input
                                        type="password"
                                        value={aiKeys.openai_api_key}
                                        onChange={(e) => setAiKeys({ ...aiKeys, openai_api_key: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
                                    <input
                                        type="password"
                                        value={aiKeys.gemini_api_key}
                                        onChange={(e) => setAiKeys({ ...aiKeys, gemini_api_key: e.target.value })}
                                        placeholder="AIza..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Perplexity API Key</label>
                                    <input
                                        type="password"
                                        value={aiKeys.perplexity_api_key}
                                        onChange={(e) => setAiKeys({ ...aiKeys, perplexity_api_key: e.target.value })}
                                        placeholder="pplx-..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <button
                                    onClick={handleSaveAiKeys}
                                    disabled={saving}
                                    className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium transition disabled:opacity-50"
                                >
                                    {saving ? '저장 중...' : '설정 저장'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white shadow rounded-lg p-6">
                        <h3 className="text-lg font-medium mb-4">빠른 시작 가이드</h3>
                        <div className="space-y-3">
                            <div className="flex items-start">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 mr-3">1</span>
                                <div>
                                    <p className="font-medium">출처 추가</p>
                                    <p className="text-sm text-gray-500">출처 관리 페이지에서 수집할 사이트를 추가하세요.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 mr-3">2</span>
                                <div>
                                    <p className="font-medium">네이버 계정 연동</p>
                                    <p className="text-sm text-gray-500">대시보드에서 네이버 Cafe API 권한을 연동하여 글쓰기를 자동화하세요.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 mr-3">3</span>
                                <div>
                                    <p className="font-medium">리라이팅 및 게시</p>
                                    <p className="text-sm text-gray-500">수집된 항목을 다시 작성하여 클릭 한 번으로 카페에 게시하세요.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <strong>주의:</strong> 수집 전 각 출처 사이트의 이용약관과 robots.txt를 반드시 확인하세요.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
