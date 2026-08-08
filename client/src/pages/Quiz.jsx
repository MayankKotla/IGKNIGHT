import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Target, Zap, Trophy, BookOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { SkeletonLine } from '../components/Skeleton'

export default function Quiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [phase, setPhase] = useState('loading') // loading | quiz | results | error
  const [quiz, setQuiz] = useState(null)
  const [existingResult, setExistingResult] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState(null) // index of selected option for current question
  const [answers, setAnswers] = useState([]) // submitted answer indices
  const [aiTip, setAiTip] = useState(null)
  const [loadingTip, setLoadingTip] = useState(false)

  useEffect(() => {
    if (!user || !quizId) return
    async function init() {
      const [{ data: quizData, error }, { data: resultData }] = await Promise.all([
        supabase.from('quizzes').select('*, sessions(title, group_id, groups(name, courses(code, name)))').eq('id', quizId).single(),
        supabase.from('quiz_results').select('*').eq('quiz_id', quizId).eq('user_id', user.id).maybeSingle(),
      ])

      if (error || !quizData) { setPhase('error'); return }

      setQuiz(quizData)

      if (resultData) {
        setExistingResult(resultData)
        setAnswers(resultData.answers || [])
        fetchAiTip(quizData, resultData.answers || [], resultData.score)
        setPhase('results')
      } else {
        setPhase('quiz')
      }
    }
    init()
  }, [user, quizId])

  const fetchAiTip = async (quizData, submittedAnswers, score) => {
    setLoadingTip(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token
      const questions = quizData.questions || []
      const wrongTopics = []
      for (let i = 0; i < questions.length; i++) {
        if (submittedAnswers[i] !== questions[i].correct) {
          const topic = questions[i].topic || quizData.topics[0]
          if (topic && !wrongTopics.includes(topic)) wrongTopics.push(topic)
        }
      }
      const courseName = quizData.sessions?.groups?.courses?.name || quizData.sessions?.groups?.courses?.code || 'the course'
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quiz/study-tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score, wrong_topics: wrongTopics, course_name: courseName }),
      })
      const data = await res.json()
      if (data.tip) setAiTip(data.tip)
    } catch (err) {
      console.error('Study tip error:', err)
    }
    setLoadingTip(false)
  }

  const handleSelect = (optionIndex) => {
    if (selected !== null) return // already answered
    setSelected(optionIndex)
  }

  const handleNext = async () => {
    const newAnswers = [...answers, selected]
    setAnswers(newAnswers)
    setSelected(null)

    if (currentQ + 1 < quiz.questions.length) {
      setCurrentQ((q) => q + 1)
    } else {
      // Quiz done — compute score and save
      const score = newAnswers.reduce((sum, ans, i) => sum + (ans === quiz.questions[i].correct ? 1 : 0), 0)
      setPhase('results')
      fetchAiTip(quiz, newAnswers, score)

      const { error } = await supabase.from('quiz_results').insert({
        quiz_id: quizId,
        user_id: user.id,
        answers: newAnswers,
        score,
      })
      if (!error) setExistingResult({ score, answers: newAnswers })
    }
  }

  if (phase === 'loading') return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <header className="relative z-10 px-6 py-4 border-b border-app-border flex items-center gap-4 shrink-0">
        <ArrowLeft className="w-5 h-5 text-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-3.5 w-24" />
            <SkeletonLine className="h-2.5 w-20" />
          </div>
          <SkeletonLine className="h-1.5 w-full rounded-full" />
        </div>
      </header>
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg">
          <SkeletonLine className="h-5 w-24 rounded-full mb-5" />
          <SkeletonLine className="h-5 w-full mb-2" />
          <SkeletonLine className="h-5 w-2/3 mb-7" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonLine key={i} className="h-[52px] w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )

  if (phase === 'error') return (
    <div className="h-screen bg-app-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-white font-semibold mb-2">Quiz not found.</p>
        <button onClick={() => navigate('/dashboard')} className="text-ucf-gold text-sm hover:underline">Back to dashboard</button>
      </div>
    </div>
  )

  if (phase === 'results') {
    const score = existingResult?.score ?? answers.reduce((sum, ans, i) => sum + (ans === quiz.questions[i].correct ? 1 : 0), 0)
    const questions = quiz.questions || []

    // Topic breakdown
    const topicResults = {}
    for (let i = 0; i < questions.length; i++) {
      const topic = questions[i].topic || quiz.topics[i % quiz.topics.length] || 'Unknown'
      if (!topicResults[topic]) topicResults[topic] = { correct: 0, total: 0 }
      topicResults[topic].total++
      if (answers[i] === questions[i].correct) topicResults[topic].correct++
    }
    const strongTopics = Object.entries(topicResults).filter(([, v]) => v.correct === v.total).map(([t]) => t)
    const weakTopics = Object.entries(topicResults).filter(([, v]) => v.correct < v.total).map(([t]) => t)
    const pct = Math.round((score / 5) * 100)

    return (
      <div className="min-h-screen bg-app-bg flex flex-col">
        <div
          className="fixed top-0 left-0 w-full pointer-events-none"
          style={{ height: '400px', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,201,4,0.07) 0%, transparent 70%)', zIndex: 0 }}
        />
        <header className="relative z-10 px-6 py-4 border-b border-app-border flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-app-input transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-ucf-gold" />
            <span className="font-semibold text-white text-sm">KnightCheck Results</span>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-10">
          <div className="w-full max-w-lg">
            {/* Score card */}
            <div className="card border border-app-border rounded-3xl p-8 text-center mb-6">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 ${score >= 3 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <span className={`text-4xl font-bold ${score >= 3 ? 'text-green-400' : 'text-red-400'}`}>{score}/5</span>
              </div>
              <p className="text-xl font-bold text-white mb-1">
                {score === 5 ? 'Perfect Score! 🎉' : score >= 4 ? 'Excellent! 🔥' : score >= 3 ? 'Good Work! 👍' : score >= 2 ? 'Keep Studying 📚' : 'Needs Work 💪'}
              </p>
              <p className="text-gray-500 text-sm">{pct}% — {quiz.sessions?.title || 'Study Session'}</p>
            </div>

            {/* Topic breakdown */}
            {(strongTopics.length > 0 || weakTopics.length > 0) && (
              <div className="card border border-app-border rounded-2xl p-5 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Topic Breakdown</p>
                <div className="space-y-2">
                  {strongTopics.map((t) => (
                    <div key={t} className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-sm text-white">{t}</span>
                      <span className="ml-auto text-xs text-green-400 font-medium">Strong</span>
                    </div>
                  ))}
                  {weakTopics.map((t) => (
                    <div key={t} className="flex items-center gap-2.5">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-sm text-white">{t}</span>
                      <span className="ml-auto text-xs text-red-400 font-medium">Review</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI study tip */}
            <div className="card border border-ucf-gold/20 rounded-2xl p-5 mb-6 bg-ucf-gold/5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-ucf-gold/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-ucf-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-ucf-gold uppercase tracking-widest mb-1.5">Study Tip</p>
                  {loadingTip ? (
                    <div className="flex gap-1 items-center">
                      {[0, 150, 300].map((delay) => (
                        <span key={delay} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 leading-relaxed">{aiTip || 'Reviewing your notes and practicing similar problems is the best way to reinforce these concepts.'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Review answers */}
            <div className="space-y-3 mb-6">
              {questions.map((q, i) => {
                const isCorrect = answers[i] === q.correct
                return (
                  <div key={i} className="card border border-app-border rounded-2xl p-4">
                    <div className="flex items-start gap-2 mb-3">
                      {isCorrect
                        ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                      <p className="text-sm text-white leading-snug">{q.question}</p>
                    </div>
                    {!isCorrect && (
                      <div className="ml-6 space-y-1">
                        <p className="text-xs text-red-400">Your answer: {q.options[answers[i]]}</p>
                        <p className="text-xs text-green-400">Correct: {q.options[q.correct]}</p>
                      </div>
                    )}
                    <p className="ml-6 mt-2 text-xs text-gray-500 leading-relaxed">{q.explanation}</p>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-ucf-gold text-black font-bold rounded-2xl hover:bg-yellow-400 transition-colors duration-200"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Quiz phase
  const question = quiz.questions[currentQ]
  const total = quiz.questions.length
  const isAnswered = selected !== null
  const isCorrect = selected === question.correct

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <div
        className="fixed top-0 left-0 w-full pointer-events-none"
        style={{ height: '400px', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,201,4,0.06) 0%, transparent 70%)', zIndex: 0 }}
      />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 border-b border-app-border flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-app-input transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-ucf-gold" />
              <span className="text-sm font-semibold text-white">KnightCheck</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">Question {currentQ + 1} of {total}</span>
          </div>
          <div className="h-1.5 bg-app-input rounded-full overflow-hidden">
            <div
              className="h-full bg-ucf-gold rounded-full transition-all duration-300"
              style={{ width: `${((currentQ + (isAnswered ? 1 : 0)) / total) * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* Question */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* Topic tag */}
          {question.topic && (
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 text-xs bg-ucf-gold/10 text-ucf-gold border border-ucf-gold/20 px-3 py-1 rounded-full font-medium">
                <Zap className="w-3 h-3" /> {question.topic}
              </span>
            </div>
          )}

          <p className="text-lg font-semibold text-white leading-snug mb-7">{question.question}</p>

          <div className="space-y-3 mb-6">
            {question.options.map((option, i) => {
              let cls = 'w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-all duration-200 '
              if (!isAnswered) {
                cls += 'border-app-border text-gray-200 bg-app-input hover:border-ucf-gold/50 hover:bg-ucf-gold/5 cursor-pointer'
              } else if (i === question.correct) {
                cls += 'border-green-500/50 bg-green-500/10 text-green-300'
              } else if (i === selected) {
                cls += 'border-red-500/50 bg-red-500/10 text-red-300'
              } else {
                cls += 'border-app-border text-gray-600 bg-app-input opacity-50'
              }

              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={isAnswered} className={cls}>
                  <span className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                      !isAnswered ? 'bg-app-surface-raised text-gray-400'
                      : i === question.correct ? 'bg-green-500/20 text-green-400'
                      : i === selected ? 'bg-red-500/20 text-red-400'
                      : 'bg-app-surface-raised text-gray-600'
                    }`}>
                      {['A', 'B', 'C', 'D'][i]}
                    </span>
                    {option}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {isAnswered && (
            <div className={`rounded-2xl p-4 mb-6 border ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isCorrect
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />}
                <p className={`text-sm font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? 'Correct!' : 'Not quite'}
                </p>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{question.explanation}</p>
            </div>
          )}

          {isAnswered && (
            <button
              onClick={handleNext}
              className="w-full py-3 bg-ucf-gold text-black font-bold rounded-2xl hover:bg-yellow-400 transition-colors duration-200"
            >
              {currentQ + 1 < total ? 'Next Question →' : 'See Results'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
