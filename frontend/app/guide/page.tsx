'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { authApi } from '@/lib/api'

export default function GuidePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await authApi.me()
                setUser(res.data)
            } catch (err) {
                console.error('Failed to load user', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
            <Navbar user={user} />

            <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">서비스 사용 가이드</h1>
                        <p className="text-gray-500 dark:text-gray-400">플랫폼의 주요 기능을 익히고 효율적으로 사용해 보세요.</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        ← 뒤로가기
                    </button>
                </div>

                <div className="space-y-12">
                    {/* Step 1 */}
                    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 transition-colors">
                        <div className="flex items-center mb-6">
                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold mr-4">1</span>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI API 설정 (필수)</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                            콘텐츠 리라이팅을 위해 AI 서비스의 API 키가 필요합니다. 대시보드에서 키를 등록해 주세요.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                                <h3 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">ChatGPT (OpenAI)</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">가장 표준적인 성능과 속도를 보장합니다.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                                <h3 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">Gemini (Google)</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">무료 티어 활용이 가능하며 가성비가 좋습니다.</p>
                            </div>
                            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                                <h3 className="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">Perplexity</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">최신 정보 검색과 인용에 특화되어 있습니다.</p>
                            </div>
                        </div>
                    </section>

                    {/* Step 2 */}
                    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 transition-colors">
                        <div className="flex items-center mb-6">
                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 font-bold mr-4">2</span>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">수집 출처 관리</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                            <strong>'출처 관리'</strong> 메뉴에서 정보를 수집할 웹사이트를 등록할 수 있습니다. 이미 등록된 공공기관 게시판이나 블로그 외에도 새로운 RSS 주소나 게시판 URL을 추가할 수 있습니다.
                        </p>
                        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                            <li>수집 주기(분 단위)를 설정할 수 있습니다.</li>
                            <li>특정 키워드가 포함된 글만 필터링하도록 설정 가능합니다.</li>
                            <li>출처별로 활성화/비활성화 토글이 가능합니다.</li>
                        </ul>
                    </section>

                    {/* Step 3 */}
                    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-8 transition-colors">
                        <div className="flex items-center mb-6">
                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 font-bold mr-4">3</span>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">콘텐츠 리라이팅 및 게시</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                            수집된 목록에서 항목을 클릭하면 상세 내용을 볼 수 있습니다. <strong>'AI 리라이팅'</strong> 버튼을 클릭하여 원문을 원하는 스타일로 다시 작성하세요.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                <span className="text-lg">🔒</span>
                                <div>
                                    <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300">원본 잠금 기능</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">리라이팅 시 실수로 원본이 수정되지 않도록 잠금 설정이 기본 활성화되어 있습니다.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                                <span className="text-lg">📝</span>
                                <div>
                                    <h4 className="font-bold text-sm text-purple-900 dark:text-purple-300">실시간 글자수 확인</h4>
                                    <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">작성 중인 내용의 글자수가 하단에 실시간으로 표시됩니다.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-purple-500/20">
                    <h3 className="text-2xl font-bold mb-4">준비되셨나요?</h3>
                    <p className="opacity-90 mb-6">지금 바로 대시보드로 이동하여 첫 번째 콘텐츠를 수집해 보세요.</p>
                    <Link
                        href="/sources"
                        className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-full font-bold hover:bg-opacity-90 transition-all shadow-lg"
                    >
                        출처 관리하러 가기
                    </Link>
                </div>
            </main>
        </div>
    )
}
