import { useState, useRef, useEffect } from 'react'
import { uploadApi, aiApi, authApi } from '@/lib/api'

interface BlogExportModalProps {
    isOpen: boolean
    onClose: () => void
    item: {
        title: string
        raw_text: string | null
        image_urls: string[] | null
    }
}

export default function BlogExportModal({ isOpen, onClose, item }: BlogExportModalProps) {
    const [content, setContent] = useState('')
    const [rewrittenContent, setRewrittenContent] = useState('')
    const [activeEditor, setActiveEditor] = useState<'original' | 'rewritten'>('original')
    const [images, setImages] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)

    // AI Settings
    const [provider, setProvider] = useState('openai')
    const [style, setStyle] = useState('event') // Default style
    const [customPrompt, setCustomPrompt] = useState('') // For 'custom' style

    // apiKey manual entry removed by user request
    const [apiKeys, setApiKeys] = useState({
        openai_api_key: false,
        gemini_api_key: false,
        perplexity_api_key: false
    })

    const [rewriting, setRewriting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const rewrittenTextareaRef = useRef<HTMLTextAreaElement>(null)

    const buildEventImagePrompt = (sourceTitle: string, sourceText: string) => {
        const cleanedText = sourceText
            .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
            .replace(/<img[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        const summary = cleanedText.slice(0, 280)

        return [
            '지역 가족 단위 방문객과 커뮤니티 이용자를 위한 한국어 행사 안내 이미지를 만들어줘.',
            '형식은 블로그와 SNS에 올리기 좋은 세로형 포스터 스타일로, 밝고 친근하며 한눈에 읽기 쉽게 구성해줘.',
            `메인 제목: ${sourceTitle || '행사 안내'}`,
            '제목, 날짜, 시간, 장소, 참여 안내가 잘 보이도록 정보 우선순위를 분명하게 배치해줘.',
            '전체 분위기는 따뜻하고 생동감 있으며, 부모와 지역 주민이 신뢰하고 보기 편한 홍보물 느낌으로 만들어줘.',
            '색감은 부드럽지만 또렷하게 쓰고, 아이콘이나 포인트 장식을 적절히 넣되 너무 복잡하지 않게 해줘.',
            '이미지 안의 문구는 한국어 중심으로 넣고, 장식보다 가독성을 우선해줘.',
            `반영할 행사 정보: ${summary || sourceTitle || '행사 정보 요약'}`,
            '세부 일정, 부스 안내, 참여 유의사항 같은 핵심 안내 문구가 자연스럽게 들어갈 공간도 고려해줘.',
            '결과물은 문서 캡처처럼 보이지 않게 하고, 실제 홍보용 안내 이미지처럼 완성도 있게 디자인해줘.'
        ].join('\n')
    }

    const eventImagePrompt = buildEventImagePrompt(item.title, content)

    useEffect(() => {
        if (isOpen) {
            // Initial content population
            let initialContent = item.title + '\n\n'
            if (item.raw_text) initialContent += item.raw_text + '\n\n'
            setContent(initialContent)

            // Initial images
            if (item.image_urls) {
                setImages(item.image_urls)
            }

            // Check for user settings (API Key)
            checkUserApiKeys()
        }
    }, [isOpen, item])

    const checkUserApiKeys = async () => {
        try {
            const response = await authApi.me()
            const user = response.data
            setApiKeys({
                openai_api_key: !!user.openai_api_key,
                gemini_api_key: !!user.gemini_api_key,
                perplexity_api_key: !!user.perplexity_api_key
            })
            // Reset manual key input when opening - Removed
        } catch (e) {
            console.error('Failed to fetch user settings', e)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]
        try {
            const response = await uploadApi.image(file)
            // Backend returns relative URL. Prefix with API URL if needed, 
            // but usually <img src="/static/..." /> works if proxied or same domain.
            // If separate domains, we might need full URL.
            // Assuming Next.js rewrites or direct backend access.
            // For now, let's assume the backend URL is needed if on different port.
            // But `uploadApi` returns what backend sent. 
            // Let's prepend API_URL env if strictly needed, but for now use result.
            // Actually, we should probably form a full URL or absolute path.
            // Let's rely on backend returning a usable path or full URL.
            // The backend returns `/static/uploads/...`
            // If frontend is 3000 and backend 8000, we need http://localhost:8000
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const fullUrl = `${apiUrl}${response.data.url}`

            setImages(prev => [...prev, fullUrl])
        } catch (error) {
            alert('이미지 업로드 실패')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const insertImage = (url: string) => {
        const textarea = activeEditor === 'original' ? textareaRef.current : rewrittenTextareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value

        // Markdown image syntax
        const insertText = `\n![이미지](${url})\n`

        const newText = text.substring(0, start) + insertText + text.substring(end)

        if (activeEditor === 'original') {
            setContent(newText)
        } else {
            setRewrittenContent(newText)
        }

        // Restore focus and cursor (approximate)
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + insertText.length, start + insertText.length)
        }, 0)
    }

    const handleRewrite = async () => {
        if (!content.trim()) return

        setRewriting(true)
        try {
            // Construct instruction based on style
            let instruction = "Rewrite this text for a blog post."
            switch (style) {
                case 'news': instruction = "Rewrite this as a formal News Article (뉴스 기사). Use objective tone, inverted pyramid structure, and professional vocabulary."; break;
                case 'review': instruction = "Rewrite this as a detailed Review (리뷰). Include personal pros/cons, rating-like checks, and helpful advice for potential users."; break;
                case 'guide': instruction = "Rewrite this as a How-to Guide (가이드). Use step-by-step numbering, clear headings, and instructive tone."; break;
                case 'story': instruction = "Rewrite this as a Story (스토리텔링). Use emotional, narrative driver tone, anecdotes, and first-person perspective."; break;
                case 'interview': instruction = "Rewrite this as an Interview (인터뷰). Format it as Q&A, with dialogue style and engaging conversational tone."; break;
                case 'event': instruction = "Rewrite this as a Korean local event announcement post for a Naver Blog. Match the feel of a moms-community or neighborhood info share: a short headline on the first line, plenty of blank lines, and 3 to 5 short emoji-led lines using symbols like '✨️' or '❤️'. Include date, time, place, and attendee notes in very scannable Korean. Keep each line concise, warm, lively, and practical. Prefer simple sentence fragments over long paragraphs. Avoid formal news tone, avoid markdown bullets, and do not add sections like introduction or conclusion unless the source clearly needs them."; break;
                case 'custom':
                    if (!customPrompt.trim()) {
                        alert('리라이팅 지침을 입력해주세요.')
                        setRewriting(false)
                        return
                    }
                    instruction = customPrompt;
                    break;
            }

            const response = await aiApi.rewrite(content, undefined, provider, undefined, instruction)
            setRewrittenContent(response.data.text)
            setActiveEditor('rewritten') // Focus to right side
        } catch (error: any) {
            alert(error.response?.data?.detail || '리라이팅 실패')
        } finally {
            setRewriting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">블로그 글 작성</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Area: AI Tools + Split Editors */}
                    <div className="flex-1 flex flex-col border-r overflow-hidden">

                        {/* AI Tools Header (Fixed) */}
                        <div className="p-4 border-b bg-gray-50 flex flex-col gap-3 z-10 shadow-sm">
                            {/* Top Row: Providers & Action Button */}
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold">AI 모델:</span>
                                    {[
                                        { id: 'openai', name: 'CheckGPT', key: 'openai_api_key' },
                                        { id: 'gemini', name: 'Gemini', key: 'gemini_api_key' },
                                        { id: 'perplexity', name: 'Perplexity', key: 'perplexity_api_key' }
                                    ]
                                        .map((p) => (
                                            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="ai-provider"
                                                    value={p.id}
                                                    checked={provider === p.id}
                                                    onChange={(e) => setProvider(e.target.value)}
                                                    className="accent-purple-600"
                                                />
                                                <span className="text-sm">{p.name}</span>
                                                <span
                                                    className={`w-2 h-2 rounded-full ${apiKeys[p.key as keyof typeof apiKeys] ? 'bg-green-500' : 'bg-red-500'}`}
                                                    title={apiKeys[p.key as keyof typeof apiKeys] ? '준비됨' : '키 필요'}
                                                />
                                            </label>
                                        ))}
                                </div>

                                <button
                                    onClick={handleRewrite}
                                    disabled={rewriting || !apiKeys[`${provider}_api_key` as keyof typeof apiKeys]}
                                    className="px-6 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                                >
                                    {rewriting ? '작성 중...' :
                                        !apiKeys[`${provider}_api_key` as keyof typeof apiKeys] ?
                                            '키 필요' :
                                            'AI 다시 쓰기'}
                                </button>
                            </div>

                            {/* Middle Row: Style Selection */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <span className="text-sm font-semibold whitespace-nowrap mr-2">스타일:</span>
                                {[
                                    { id: 'news', name: '뉴스 기사' },
                                    { id: 'review', name: '리뷰' },
                                    { id: 'guide', name: '가이드' },
                                    { id: 'story', name: '스토리' },
                                    { id: 'interview', name: '인터뷰' },
                                    { id: 'event', name: '행사 안내' },
                                    { id: 'custom', name: '직접 입력' }
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStyle(s.id)}
                                        className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${style === s.id
                                            ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>

                            {/* Bottom Row: Custom Prompt Input */}
                            {style === 'custom' && (
                                <div className="mt-1">
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="AI에게 요청할 리라이팅 지침을 상세히 적어주세요..."
                                        className="w-full p-2 text-sm border rounded bg-white h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Scrollable Editor Area */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
                            {/* Split Editor View */}
                            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                                {/* Original Column */}
                                <div className="flex-1 flex flex-col">
                                    <label className="text-sm font-medium mb-1 text-gray-700">원본 (Source)</label>
                                    <textarea
                                        ref={textareaRef}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        onFocus={() => setActiveEditor('original')}
                                        className={`flex-1 w-full p-4 border rounded-lg resize-none font-sans leading-relaxed focus:outline-none ${activeEditor === 'original' ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-300'}`}
                                        placeholder="여기에 원본 글을 작성하세요..."
                                    />
                                </div>

                                {/* Arrow Icon center (optional) */}
                                <div className="flex flex-col justify-center text-gray-400">
                                    ➔
                                </div>

                                {/* Rewritten Column */}
                                <div className="flex-1 flex flex-col">
                                    <label className="text-sm font-medium mb-1 text-purple-700">리라이팅 (Rewritten)</label>
                                    <textarea
                                        ref={rewrittenTextareaRef}
                                        value={rewrittenContent}
                                        onChange={(e) => setRewrittenContent(e.target.value)}
                                        onFocus={() => setActiveEditor('rewritten')}
                                        className={`flex-1 w-full p-4 border rounded-lg resize-none font-sans leading-relaxed focus:outline-none ${activeEditor === 'rewritten' ? 'ring-2 ring-purple-500 border-transparent' : 'border-gray-300 bg-gray-50'}`}
                                        placeholder="AI가 다시 쓴 글이 여기에 표시됩니다..."
                                    />
                                </div>
                            </div>

                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-amber-900">행사 안내 이미지 프롬프트</h3>
                                        <p className="text-xs text-amber-800">AI 리라이팅 결과와 별도로 행사 홍보 이미지를 만들 때 사용할 프롬프트입니다.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                                        onClick={() => {
                                            navigator.clipboard.writeText(eventImagePrompt)
                                            alert('행사 안내 이미지 프롬프트가 복사되었습니다!')
                                        }}
                                    >
                                        프롬프트 복사
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    value={eventImagePrompt}
                                    className="h-40 w-full resize-none rounded-lg border border-amber-200 bg-white p-3 text-sm leading-relaxed text-gray-700 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Image Gallery */}
                    <div className="w-80 bg-gray-50 p-4 border-l overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">이미지 ({images.length})</h3>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            >
                                + 추가
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>

                        <div className="space-y-3">
                            {images.map((url, idx) => {
                                // Calculate usage count
                                const usageCount = (content.split(url).length - 1) + (rewrittenContent.split(url).length - 1)

                                return (
                                    <div key={idx} className="group relative bg-white p-2 rounded border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="aspect-video bg-gray-100 mb-2 overflow-hidden rounded relative">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt={`Image ${idx}`} className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => insertImage(url)}
                                                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                                            >
                                                {activeEditor === 'original' ? '원본에 삽입' : '리라이팅에 삽입'}
                                            </button>

                                            {/* Usage badge */}
                                            {usageCount > 0 && (
                                                <div className="absolute top-1 right-1 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-sm border border-white">
                                                    {usageCount}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate">{url.split('/').pop()}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                        닫기
                    </button>
                    <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300"
                        onClick={() => {
                            navigator.clipboard.writeText(content)
                            alert('원본이 복사되었습니다!')
                        }}
                    >
                        원본 복사
                    </button>
                    <button
                        className={`px-6 py-2 text-white rounded font-medium ${rewrittenContent ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        onClick={() => {
                            if (!rewrittenContent) return
                            navigator.clipboard.writeText(rewrittenContent)
                            alert('리라이팅된 글이 복사되었습니다!')
                        }}
                        disabled={!rewrittenContent}
                    >
                        리라이팅 복사
                    </button>
                </div>
            </div>
        </div>
    )
}
