'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi, itemsApi } from '@/lib/api'
import Navbar from '@/components/Navbar'

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
    const [recentItems, setRecentItems] = useState<any[]>([])

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
                const keys = {
                    openai_api_key: userRes.data.openai_api_key || '',
                    gemini_api_key: userRes.data.gemini_api_key || '',
                    perplexity_api_key: userRes.data.perplexity_api_key || ''
                }
                setAiKeys(keys)

                // Fetch stats
                const statsRes = await itemsApi.getStats()
                setStats(statsRes.data)

                // Fetch recent items (top 5)
                const itemsRes = await itemsApi.list({ limit: 5 })
                setRecentItems(itemsRes.data)

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

    const renderBalanceInfo = (provider: 'openai' | 'gemini' | 'perplexity') => {
        const hasKey = aiKeys[`${provider}_api_key` as keyof typeof aiKeys]
        if (!hasKey) return null

        const billingUrls = {
            openai: "https://platform.openai.com/settings/organization/billing/overview",
            gemini: "https://aistudio.google.com/app/billing",
            perplexity: "https://www.perplexity.ai/settings/api"
        }

        return (
            <div className="mt-2 flex justify-end">
                <a
                    href={billingUrls[provider]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline flex items-center gap-1 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    빌링 대시보드에서 잔액 확인 ↗
                </a>
            </div>
        )
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors duration-300">
            <Navbar user={user} />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">대시보드</h2>

                        {user && (
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">이용 기간</span>
                                <div className="flex items-center gap-2">
                                    {user.role === 'admin' ? (
                                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">무제한 (관리자)</span>
                                    ) : (
                                        <>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                {user.expires_at ? new Date(user.expires_at).toLocaleDateString('ko-KR') : '제한 없음'} 까지
                                            </span>
                                            {user.expires_at && (
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${Math.ceil((new Date(user.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) <= 7
                                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                        : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                    }`}>
                                                    {Math.ceil((new Date(user.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24))}일 남음
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
                        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow rounded-lg border border-transparent dark:border-slate-800 transition-colors">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">오늘 수집</dt>
                                            <dd className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.collected_today}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow rounded-lg border border-transparent dark:border-slate-800 transition-colors">
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">실패</dt>
                                            <dd className="text-3xl font-semibold text-gray-900 dark:text-white">{stats.failed}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* AI API Settings */}
                        <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 border border-transparent dark:border-slate-800 transition-colors">
                            <h3 className="text-lg font-medium mb-4 flex items-center text-gray-900 dark:text-white">
                                <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-md mr-3 transition-colors">
                                    <svg className="h-5 w-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </span>
                                AI API 설정
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ChatGPT API Key</label>
                                    <input
                                        type="password"
                                        value={aiKeys.openai_api_key}
                                        onChange={(e) => setAiKeys({ ...aiKeys, openai_api_key: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white transition-colors"
                                    />
                                    {renderBalanceInfo('openai')}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gemini API Key</label>
                                    <input
                                        type="password"
                                        value={aiKeys.gemini_api_key}
                                        onChange={(e) => setAiKeys({ ...aiKeys, gemini_api_key: e.target.value })}
                                        placeholder="AIza..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white transition-colors"
                                    />
                                    {renderBalanceInfo('gemini')}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Perplexity API Key</label>
                                    <input
                                        type="password"
                                        value={aiKeys.perplexity_api_key}
                                        onChange={(e) => setAiKeys({ ...aiKeys, perplexity_api_key: e.target.value })}
                                        placeholder="pplx-..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white transition-colors"
                                    />
                                    {renderBalanceInfo('perplexity')}
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

                        {/* Recent Collected Items */}
                        <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 border border-transparent dark:border-slate-800 transition-colors flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium flex items-center text-gray-900 dark:text-white">
                                    <span className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md mr-3 transition-colors">
                                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </span>
                                    최근 수집 내역
                                </h3>
                                <Link href="/items" className="text-xs text-blue-500 hover:text-blue-600 font-bold">
                                    전체보기 →
                                </Link>
                            </div>
                            <div className="flex-1 space-y-3">
                                {recentItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 py-10">
                                        <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p className="text-sm">수집된 데이터가 없습니다.</p>
                                    </div>
                                ) : (
                                    recentItems.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={`/items/${item.id}`}
                                            className="block p-3 rounded-lg border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all group"
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-500 transition-colors">
                                                        {item.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded font-medium">
                                                            {item.source_name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(item.collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-shrink-0 text-gray-300 dark:text-gray-700 group-hover:text-blue-400 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 shadow rounded-lg p-6 border border-transparent dark:border-slate-800 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">빠른 시작 가이드</h3>
                            <Link
                                href="/guide"
                                className="inline-flex items-center px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-full transition-all shadow-md active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                전체 사용 방법 보기
                            </Link>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 mr-3 transition-colors">1</span>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">출처 추가</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">출처 관리 페이지에서 수집할 사이트를 추가하세요.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 mr-3 transition-colors">2</span>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">네이버 계정 연동</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">대시보드에서 네이버 Cafe API 권한을 연동하여 글쓰기를 자동화하세요.</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 mr-3 transition-colors">3</span>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">리라이팅 및 게시</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">수집된 항목을 다시 작성하여 클릭 한 번으로 카페에 게시하세요.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 transition-colors">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 dark:text-yellow-400">
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
