'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ToastContainer, toast } from 'react-toastify'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { fetchExamQuestions, submitExam } from '@/app/actions'
import Image from 'next/image'
import 'react-toastify/dist/ReactToastify.css'
import { Flag } from 'lucide-react'

export default function ExamPage() {
  const [answers, setAnswers] = useState({})
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [examSections, setExamSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [allDragDropOptions, setAllDragDropOptions] = useState([])
  const [unansweredQuestions, setUnansweredQuestions] = useState([])
  const [language, setLanguage] = useState('ar')
  const router = useRouter()
  const dragItem = useRef(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isRefreshDialogOpen, setIsRefreshDialogOpen] = useState(false)
  const refreshAttempted = useRef(false)
  const optionsAreaRef = useRef(null)
  const [isSticky, setIsSticky] = useState(false)

  // New state variables for flagging and timer
  const [flaggedQuestions, setFlaggedQuestions] = useState({})
  const [timeRemaining, setTimeRemaining] = useState(60 * 60) // 60 minutes in seconds
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false)

  useEffect(() => {
    const storedUserName = localStorage.getItem('userName')
    const storedUserId = localStorage.getItem('userId')
    const storedPhoneNumber = localStorage.getItem('phoneNumber')
    const storedLanguage = localStorage.getItem('language')
    const storedAnswers = JSON.parse(localStorage.getItem('answers') || '{}')
    const storedExamStarted = localStorage.getItem('examStarted') === 'true'
    const storedFlaggedQuestions = JSON.parse(
      localStorage.getItem('flaggedQuestions') || '{}'
    )
    const storedTimeRemaining = parseInt(
      localStorage.getItem('timeRemaining') || '3600',
      10
    )

    if (!storedUserName || !storedUserId || !storedPhoneNumber) {
      router.push('/')
    } else {
      setUserName(storedUserName)
      setUserId(storedUserId)
      setPhoneNumber(storedPhoneNumber)
      setLanguage(storedLanguage || 'ar')
      setFlaggedQuestions(storedFlaggedQuestions)
      setTimeRemaining(storedTimeRemaining)

      if (storedExamStarted) {
        setAnswers(storedAnswers)
      } else {
        setIsResetDialogOpen(true)
      }

      fetchExamQuestionsData()
    }

    const handleScroll = () => {
      if (optionsAreaRef.current) {
        const rect = optionsAreaRef.current.getBoundingClientRect()
        setIsSticky(rect.top <= 0)
      }
    }

    window.addEventListener('scroll', handleScroll)

    // Start the timer
    const timer = setInterval(() => {
      setTimeRemaining((prevTime) => {
        const newTime = prevTime - 1
        localStorage.setItem('timeRemaining', newTime.toString())
        if (newTime <= 0) {
          clearInterval(timer)
          setIsTimerDialogOpen(true)
        }
        return newTime
      })
    }, 1000)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(timer)
    }
  }, [router])

  const fetchExamQuestionsData = async () => {
    try {
      const result = await fetchExamQuestions()
      if (result.success) {
        setExamSections(result.examSections)

        const allOptions = result.examSections.map((section) =>
          section.questions
            .filter((q) => q.type === 'written')
            .flatMap((q) => q.options)
        )
        setAllDragDropOptions(
          allOptions.map((options) => shuffleArray([...options]))
        )
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error fetching exam questions:', error.message)
      toast.error(
        language === 'ar'
          ? `خطأ في جلب أسئلة الاختبار: ${error.message}`
          : `Error fetching exam questions: ${error.message}`
      )
    } finally {
      setLoading(false)
    }
  }

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  const onDragStart = (e, sectionIndex, questionIndex, optionIndex) => {
    dragItem.current = { sectionIndex, questionIndex, optionIndex }
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e, targetSectionIndex, targetQuestionIndex) => {
    e.preventDefault()
    const draggedItem = dragItem.current
    if (!draggedItem) return

    const { sectionIndex, questionIndex, optionIndex } = draggedItem

    let draggedOption
    if (questionIndex === -1) {
      draggedOption = allDragDropOptions[sectionIndex][optionIndex]
    } else {
      const sourceAnswer = answers[`${sectionIndex}-${questionIndex}`] || []
      draggedOption = sourceAnswer[optionIndex]
      const updatedSourceAnswer = sourceAnswer.filter(
        (_, index) => index !== optionIndex
      )
      handleAnswerChange(
        sectionIndex,
        questionIndex,
        updatedSourceAnswer,
        'written'
      )
    }

    if (targetQuestionIndex === -1) {
      if (!allDragDropOptions[targetSectionIndex].includes(draggedOption)) {
        const updatedAllOptions = [...allDragDropOptions]
        updatedAllOptions[targetSectionIndex] = [
          ...(updatedAllOptions[targetSectionIndex] || []),
          draggedOption,
        ]
        setAllDragDropOptions(updatedAllOptions)
      }
    } else {
      const currentAnswer =
        answers[`${targetSectionIndex}-${targetQuestionIndex}`] || []
      if (currentAnswer.length < 2) {
        handleAnswerChange(
          targetSectionIndex,
          targetQuestionIndex,
          [...currentAnswer, draggedOption],
          'written'
        )
      }
    }

    dragItem.current = null
  }

  // const handleSubmit = async () => {
  //   const unanswered = checkAllQuestionsAnswered()
  //   if (unanswered.length > 0) {
  //     setUnansweredQuestions(unanswered)
  //     toast.error(
  //       language === 'ar'
  //         ? 'يرجى الإجابة على جميع الأسئلة قبل التسليم'
  //         : 'Please answer all questions before submitting'
  //     )
  //   } else {
  //     setIsSubmitDialogOpen(true)
  //   }
  // }

  // const confirmSubmit = async () => {
  //   setIsSubmitDialogOpen(false)

  //   const formData = new FormData()
  //   formData.append('userName', userName)
  //   formData.append('userId', userId)
  //   formData.append('phoneNumber', phoneNumber)
  //   formData.append('answers', JSON.stringify(answers))

  //   try {
  //     const result = await submitExam(formData)
  //     if (result.success) {
  //       setExamSubmitted(true)
  //       setScore(result.score) // This will be the non-rounded score
  //       toast.success(
  //         language === 'ar'
  //           ? `تم تسليم الاختبار بنجاح. النتيجة: ${result.score.toFixed(
  //               2
  //             )} من ${result.maxScore.toFixed(2)}`
  //           : `Exam submitted successfully. Score: ${result.score.toFixed(
  //               2
  //             )} out of ${result.maxScore.toFixed(2)}`
  //       )

  //       localStorage.removeItem('answers')
  //       localStorage.removeItem('examStarted')
  //     } else {
  //       throw new Error(result.error)
  //     }
  //   } catch (error) {
  //     console.error('Error submitting exam:', error.message)
  //     toast.error(
  //       language === 'ar'
  //         ? `خطأ في تسليم الاختبار: ${error.message}`
  //         : `Error submitting exam: ${error.message}`
  //     )
  //   }
  // }

  const checkAllQuestionsAnswered = () => {
    const unanswered = []
    examSections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        const key = `${section.name}-${question.id}`
        if (
          !answers[key] ||
          (Array.isArray(answers[key]) && answers[key].length === 0)
        ) {
          unanswered.push({
            section: section.name,
            question: questionIndex + 1,
          })
        }
      })
    })
    return unanswered
  }

  const resetExam = () => {
    setAnswers({})
    localStorage.removeItem('answers')
    localStorage.setItem('examStarted', 'true')
    setIsResetDialogOpen(false)
  }

  const continueExam = () => {
    localStorage.setItem('examStarted', 'true')
    setIsResetDialogOpen(false)
  }

  const handleAnswerChange = (
    sectionName,
    questionId,
    answer,
    questionType
  ) => {
    const newAnswers = { ...answers }
    const key = `${sectionName}-${questionId}`

    if (questionType === 'written') {
      newAnswers[key] = answer.slice(0, 2)
    } else if (questionType === 'multiple' && questionId === 37) {
      // Special handling for question 37 (multiple correct answers)
      const currentAnswer = newAnswers[key] || []
      if (currentAnswer.includes(answer)) {
        newAnswers[key] = currentAnswer.filter((a) => a !== answer)
      } else {
        newAnswers[key] = [...currentAnswer, answer]
      }
    } else {
      newAnswers[key] = answer
    }

    setAnswers(newAnswers)
    localStorage.setItem('answers', JSON.stringify(newAnswers))
    localStorage.setItem('examStarted', 'true')
  }

  const handleLeavePage = () => {
    localStorage.removeItem('answers')
    localStorage.removeItem('examStarted')
    router.push('/')
  }

  const handleStayOnPage = () => {
    setIsLeaveDialogOpen(false)
    setIsRefreshDialogOpen(false)
    refreshAttempted.current = false
    window.history.pushState(null, '', window.location.href)
  }

  const handleRefresh = () => {
    setIsRefreshDialogOpen(false)
    refreshAttempted.current = false
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-50 to-blue-50">
        <p className="text-xl font-semibold text-green-800">
          {language === 'ar'
            ? 'جاري تحميل أسئلة الاختبار...'
            : 'Loading exam questions...'}
        </p>
      </div>
    )
  }
  const handleFlagQuestion = (sectionName, questionId) => {
    setFlaggedQuestions((prev) => {
      const newFlaggedQuestions = {
        ...prev,
        [`${sectionName}-${questionId}`]: !prev[`${sectionName}-${questionId}`],
      }
      localStorage.setItem(
        'flaggedQuestions',
        JSON.stringify(newFlaggedQuestions)
      )
      return newFlaggedQuestions
    })
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    const unanswered = checkAllQuestionsAnswered()
    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered)
      toast.error(
        language === 'ar'
          ? 'يرجى الإجابة على جميع الأسئلة قبل التسليم'
          : 'Please answer all questions before submitting'
      )
    } else {
      setIsSubmitDialogOpen(true)
    }
  }

  const confirmSubmit = async () => {
    setIsSubmitDialogOpen(false)

    const formData = new FormData()
    formData.append('userName', userName)
    formData.append('userId', userId)
    formData.append('phoneNumber', phoneNumber)
    formData.append('answers', JSON.stringify(answers))

    try {
      const result = await submitExam(formData)
      if (result.success) {
        setExamSubmitted(true)
        setScore(result.score)
        toast.success(
          language === 'ar'
            ? `تم تسليم الاختبار بنجاح. النتيجة: ${result.score.toFixed(
                2
              )} من ${result.maxScore.toFixed(2)}`
            : `Exam submitted successfully. Score: ${result.score.toFixed(
                2
              )} out of ${result.maxScore.toFixed(2)}`
        )

        localStorage.removeItem('answers')
        localStorage.removeItem('examStarted')
        localStorage.removeItem('flaggedQuestions')
        localStorage.removeItem('timeRemaining')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error submitting exam:', error.message)
      toast.error(
        language === 'ar'
          ? `خطأ في تسليم الاختبار: ${error.message}`
          : `Error submitting exam: ${error.message}`
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-green-50 to-blue-50">
        <p className="text-xl font-semibold text-green-800">
          {language === 'ar'
            ? 'جاري تحميل أسئلة الاختبار...'
            : 'Loading exam questions...'}
        </p>
      </div>
    )
  }

  if (examSubmitted) {
    return (
      <div
        className="min-h-screen bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-center p-4"
        style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
      >
        <div className="bg-white shadow-lg rounded-lg p-8 text-center max-w-md w-full border-t-4 border-green-600">
          <h1 className="text-3xl font-bold text-green-800 mb-6">
            {language === 'ar' ? 'تم إكمال الاختبار' : 'Exam Completed'}
          </h1>
          <p className="text-xl mb-4">
            {language === 'ar'
              ? `شكراً لك، ${userName}!`
              : `Thank you, ${userName}!`}
          </p>
          <Button
            className="w-full"
            onClick={() => {
              localStorage.removeItem('userName')
              localStorage.removeItem('userId')
              localStorage.removeItem('phoneNumber')
              router.push('/')
            }}
          >
            {language === 'ar'
              ? 'العودة إلى الصفحة الرئيسية'
              : 'Return to Home Page'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-r from-green-50 to-blue-50 p-8"
      style={{ direction: 'rtl' }}
    >
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 border-t-4 border-green-600">
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">
          {language === 'ar' ? 'الاختبار' : 'Exam'}
        </h1>

        <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">
            {language === 'ar' ? 'تعليمات:' : 'Instructions:'}
          </h2>
          <ul className="list-disc list-inside">
            <li>
              {language === 'ar'
                ? 'يجب الإجابة على جميع الأسئلة قبل التسليم'
                : 'All questions must be answered before submission.'}
            </li>
            <li>
              {language === 'ar'
                ? 'للأسئلة المكتوبة، اسحب الإجابات وأفلتها في المربع المخصص'
                : 'For written questions, drag and drop answers into the designated box.'}
            </li>
            <li>
              {language === 'ar'
                ? 'يمكنك سحب الإجابات مرة أخرى إلى مجموعة الخيارات إذا غيرت رأيك'
                : 'You can drag answers back to the option pool if you change your mind.'}
            </li>
            <li>
              {language === 'ar'
                ? 'يمكنك وضع علامة على الأسئلة للعودة إليها لاحقًا'
                : 'You can flag questions to return to them later.'}
            </li>
            <li>
              {language === 'ar'
                ? 'لديك 60 دقيقة لإكمال الاختبار'
                : 'You have 60 minutes to complete the exam.'}
            </li>
          </ul>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-xl font-bold">
            {language === 'ar' ? 'الوقت المتبقي:' : 'Time Remaining:'}{' '}
            {formatTime(timeRemaining)}
          </div>
        </div>

        <div className="space-y-8">
          {examSections.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className="border border-gray-300 p-6 rounded-lg shadow-sm bg-gray-50"
            >
              <h2 className="text-xl font-semibold text-green-700 mb-4">
                {section.name}
              </h2>

              {section.questions.some((q) => q.type === 'written') && (
                <div
                  ref={optionsAreaRef}
                  className={`flex flex-wrap gap-2 mb-4 p-4 bg-blue-100 rounded-lg ${
                    isSticky ? 'sticky top-0 z-10 shadow-md' : ''
                  }`}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, sectionIndex, -1)}
                >
                  <div className="w-full mb-2 text-blue-800 font-semibold">
                    {language === 'ar'
                      ? 'خيارات الإجابة (اسحب وأفلت في المربعات أدناه):'
                      : 'Answer Options (Drag and drop into boxes below):'}
                  </div>
                  {allDragDropOptions[sectionIndex] &&
                    allDragDropOptions[sectionIndex].map((option, index) => (
                      <div
                        key={`option-${sectionIndex}-${index}`}
                        draggable
                        onDragStart={(e) =>
                          onDragStart(e, sectionIndex, -1, index)
                        }
                        className="bg-white border border-blue-300 rounded px-2 py-1 cursor-move"
                      >
                        {option}
                      </div>
                    ))}
                </div>
              )}

              {section.questions.map((question, questionIndex) => (
                <div
                  key={questionIndex}
                  className={`mb-6 ${
                    unansweredQuestions.some(
                      (q) =>
                        q.section === section.name &&
                        q.question === questionIndex + 1
                    )
                      ? 'border-2 border-red-500 p-4 rounded-lg'
                      : flaggedQuestions[`${section.name}-${question.id}`]
                      ? 'border-2 border-yellow-500 p-4 rounded-lg'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-gray-700">
                      {`${questionIndex + 1}. ${question.question}`}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleFlagQuestion(section.name, question.id)
                      }
                      className={
                        flaggedQuestions[`${section.name}-${question.id}`]
                          ? 'text-yellow-500'
                          : 'text-gray-500'
                      }
                    >
                      <Flag size={20} />
                    </Button>
                  </div>
                  {question.type === 'multiple' && question.id !== 37 && (
                    <RadioGroup
                      onValueChange={(value) =>
                        handleAnswerChange(
                          section.name,
                          question.id,
                          value,
                          'multiple'
                        )
                      }
                      value={answers[`${section.name}-${question.id}`]}
                      className="space-y-2"
                    >
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center justify-start space-x-2"
                          style={{ direction: 'rtl' }}
                        >
                          <RadioGroupItem
                            value={option.text || option}
                            id={`${sectionIndex}-${questionIndex}-${optionIndex}`}
                            className={
                              language === 'ar' ? 'order-1' : 'order-1'
                            }
                          />
                          <Label
                            htmlFor={`${sectionIndex}-${questionIndex}-${optionIndex}`}
                            className="order-2 mx-2 pr-2"
                          >
                            {sectionIndex === 0 && questionIndex === 2
                              ? ''
                              : option.text || option}
                          </Label>
                          {sectionIndex === 0 &&
                            questionIndex === 2 &&
                            option.image && (
                              <Image
                                src={`/images/option${optionIndex + 1}.png`}
                                alt={`Option ${optionIndex + 1}`}
                                width={300}
                                height={300}
                                className={
                                  language === 'ar' ? 'order-3 pr-2' : 'order-3'
                                }
                              />
                            )}
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {question.type === 'multiple' && question.id === 37 && (
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center justify-start space-x-2"
                          style={{ direction: 'rtl' }}
                        >
                          <Checkbox
                            id={`${section.name}-${question.id}-${optionIndex}`}
                            checked={(
                              answers[`${section.name}-${question.id}`] || []
                            ).includes(option.text || option)}
                            onCheckedChange={(checked) => {
                              handleAnswerChange(
                                section.name,
                                question.id,
                                option.text || option,
                                'multiple'
                              )
                            }}
                            className={
                              language === 'ar' ? 'order-1' : 'order-1'
                            }
                          />
                          <Label
                            htmlFor={`${section.name}-${question.id}-${optionIndex}`}
                            className="order-2 mx-2 pr-2"
                          >
                            {option.text || option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === 'truefalse' && (
                    <RadioGroup
                      onValueChange={(value) =>
                        handleAnswerChange(
                          section.name,
                          question.id,
                          value,
                          'truefalse'
                        )
                      }
                      value={answers[`${section.name}-${question.id}`]}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-end space-x-2">
                        <RadioGroupItem
                          value="true"
                          id={`${sectionIndex}-${questionIndex}-true`}
                          className={language === 'ar' ? 'order-3' : 'order-1'}
                        />
                        <Label
                          htmlFor={`${sectionIndex}-${questionIndex}-true`}
                          className="order-2 mx-2 pr-2"
                        >
                          {language === 'ar' ? 'صح' : 'True'}
                        </Label>
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <RadioGroupItem
                          value="false"
                          id={`${sectionIndex}-${questionIndex}-false`}
                          className={language === 'ar' ? 'order-3' : 'order-1'}
                        />
                        <Label
                          htmlFor={`${sectionIndex}-${questionIndex}-false`}
                          className="order-2 mx-2 pr-2"
                        >
                          {language === 'ar' ? 'خطأ' : 'False'}
                        </Label>
                      </div>
                    </RadioGroup>
                  )}

                  {question.type === 'written' && (
                    <div
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, section.name, question.id)}
                      className="min-h-[50px] p-2 bg-gray-100 rounded flex flex-wrap gap-2"
                    >
                      {(answers[`${section.name}-${question.id}`] || []).map(
                        (answer, index) => (
                          <div
                            key={`answer-${section.name}-${question.id}-${index}`}
                            draggable
                            onDragStart={(e) =>
                              onDragStart(e, section.name, question.id, index)
                            }
                            className="bg-white border border-gray-300 rounded px-2 py-1 cursor-move"
                          >
                            {answer}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <Button className="w-full mt-8" onClick={handleSubmit}>
          {language === 'ar' ? 'تسليم الاختبار' : 'Submit Exam'}
        </Button>
        <ToastContainer rtl={language === 'ar'} position="top-right" />

        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar'
                  ? 'تأكيد تسليم الاختبار'
                  : 'Confirm Exam Submission'}
              </DialogTitle>
            </DialogHeader>
            <p>
              {language === 'ar'
                ? 'هل أنت متأكد من أنك تريد تسليم الاختبار؟ لن تتمكن من تغيير إجاباتك بعد التسليم.'
                : "Are you sure you want to submit the exam? You won't be able to change your answers after submission."}
            </p>
            <DialogFooter>
              <Button
                onClick={() => setIsSubmitDialogOpen(false)}
                variant="outline"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                onClick={confirmSubmit}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {language === 'ar' ? 'تأكيد التسليم' : 'Confirm Submission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'تحذير' : 'Warning'}
              </DialogTitle>
            </DialogHeader>
            <p>
              {language === 'ar'
                ? 'هل أنت متأكد أنك تريد مغادرة الصفحة؟ سيتم فقدان جميع إجاباتك.'
                : 'Are you sure you want to leave the page? All your answers will be lost.'}
            </p>
            <DialogFooter>
              <Button
                onClick={handleStayOnPage}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {language === 'ar' ? 'البقاء في الصفحة' : 'Stay on Page'}
              </Button>
              <Button onClick={handleLeavePage} variant="outline">
                {language === 'ar' ? 'مغادرة الصفحة' : 'Leave Page'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isRefreshDialogOpen}
          onOpenChange={setIsRefreshDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'تحذير' : 'Warning'}
              </DialogTitle>
            </DialogHeader>
            <p>
              {language === 'ar'
                ? 'هل أنت متأكد أنك تريد تحديث الصفحة؟ سيتم حفظ إجاباتك ولكن قد تفقد بعض التقدم.'
                : 'Are you sure you want to refresh the page? Your answers will be saved but you may lose some progress.'}
            </p>
            <DialogFooter>
              <Button
                onClick={handleStayOnPage}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {language === 'ar' ? 'البقاء في الصفحة' : 'Stay on Page'}
              </Button>
              <Button onClick={handleRefresh} variant="outline">
                {language === 'ar' ? 'تحديث الصفحة' : 'Refresh Page'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isTimerDialogOpen} onOpenChange={setIsTimerDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'ar' ? 'انتهى الوقت' : "Time's Up"}
              </DialogTitle>
            </DialogHeader>
            <p>
              {language === 'ar'
                ? 'انتهى الوقت المخصص للاختبار. سيتم تسليم إجاباتك الآن.'
                : 'The exam time has ended. Your answers will be submitted now.'}
            </p>
            <DialogFooter>
              <Button
                onClick={confirmSubmit}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {language === 'ar' ? 'تسليم الاختبار' : 'Submit Exam'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
