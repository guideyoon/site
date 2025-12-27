export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
                <h1 className="text-4xl font-bold mb-8 text-center">
                    사이트 수집기
                </h1>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
                    <h2 className="text-2xl font-semibold mb-4">환영합니다!</h2>
                    <p className="mb-4">
                        지역 정보를 수집하고 관리하는 플랫폼입니다.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <a
                            href="/login"
                            className="block p-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                        >
                            <h3 className="text-xl font-semibold mb-2">🔐 로그인</h3>
                            <p className="text-sm">시스템에 접속하기</p>
                        </a>

                        <a
                            href={`${process.env.NEXT_PUBLIC_API_URL}/docs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-6 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                            <h3 className="text-xl font-semibold mb-2">📚 API 문서</h3>
                            <p className="text-sm">API 문서 보기</p>
                        </a>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                    <h3 className="text-xl font-semibold mb-4">주요 기능</h3>
                    <ul className="space-y-2">
                        <li>✅ 지역 관련 정보 자동 수집</li>
                        <li>✅ 중복 제거 및 자동 분류</li>
                        <li>✅ AI 요약 생성</li>
                        <li>✅ 리라이팅 및 게시</li>
                    </ul>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Backend API: {process.env.NEXT_PUBLIC_API_URL}</p>
                </div>
            </div>
        </main>
    )
}
