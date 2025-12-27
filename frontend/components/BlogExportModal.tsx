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
    const [style, setStyle] = useState('review') // Default style
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
                            <div className="flex-1 flex gap-4 overflow-hidden">
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
