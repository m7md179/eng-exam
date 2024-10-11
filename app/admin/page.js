'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { ToastContainer, toast } from 'react-toastify'
import { X, Search, Trash2 } from 'lucide-react'
import 'react-toastify/dist/ReactToastify.css'
import 'tailwindcss/tailwind.css'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminPage() {
  const [results, setResults] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedResult, setSelectedResult] = useState(null)
  const [examQuestions, setExamQuestions] = useState([])
  const [showLoginPopup, setShowLoginPopup] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [language, setLanguage] = useState('ar')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [resultToDelete, setResultToDelete] = useState(null)
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState('')
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const router = useRouter()
  const reviewSectionRef = useRef(null)

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }
    const checkAdminAccess = async () => {
      const storedAdminEmail = localStorage.getItem('adminEmail')
      if (!storedAdminEmail) {
        router.push('/')
      } else {
        setAdminEmail(storedAdminEmail)
        await verifyAdmin(storedAdminEmail)
      }
    }

    checkAdminAccess()

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [router])

  const toggleLanguage = () => {
    const newLanguage = language === 'ar' ? 'en' : 'ar'
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
  }

  const verifyAdmin = async (email) => {
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)

      if (error) throw error
      if (data.length > 0) {
        setIsAdmin(true)
        fetchResults()
        fetchExamQuestions()
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error checking admin access:', error.message)
      toast.error(
        language === 'ar'
          ? `خطأ في التحقق من صلاحيات المسؤول: ${error.message}`
          : `Error checking admin access: ${error.message}`
      )
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setResults(data)
    } catch (error) {
      console.error('Error fetching results:', error.message)
      toast.error(
        language === 'ar'
          ? `خطأ في جلب النتائج: ${error.message}`
          : `Error fetching results: ${error.message}`
      )
    }
  }

  const fetchExamQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error

      const groupedQuestions = data.reduce((acc, question) => {
        if (!acc[question.section_name]) {
          acc[question.section_name] = []
        }
        acc[question.section_name].push(question)
        return acc
      }, {})

      setExamQuestions(
        Object.entries(groupedQuestions).map(([name, questions]) => ({
          name,
          questions,
        }))
      )
    } catch (error) {
      console.error('Error fetching exam questions:', error.message)
      toast.error(
        language === 'ar'
          ? `خطأ في جلب أسئلة الاختبار: ${error.message}`
          : `Error fetching exam questions: ${error.message}`
      )
    }
  }

  const handleResultClick = (result) => {
    setSelectedResult(result)
    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const filteredResults = results.filter(
    (result) =>
      result.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.id_number.includes(searchTerm) ||
      result.phone_number.includes(searchTerm)
  )

  const handleDeleteClick = (result) => {
    setResultToDelete(result)
    setShowDeleteConfirmation(true)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmationEmail !== adminEmail) {
      toast.error(
        language === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email'
      )
      return
    }

    try {
      const { error } = await supabase
        .from('exam_results')
        .delete()
        .eq('id', resultToDelete.id)

      if (error) throw error

      toast.success(
        language === 'ar'
          ? 'تم حذف النتيجة بنجاح'
          : 'Result deleted successfully'
      )
      setShowDeleteConfirmation(false)
      setResultToDelete(null)
      setDeleteConfirmationEmail('')
      fetchResults()
    } catch (error) {
      console.error('Error deleting result:', error.message)
      toast.error(
        language === 'ar'
          ? `خطأ في حذف النتيجة: ${error.message}`
          : `Error deleting result: ${error.message}`
      )
    }
  }

  const handleLogout = () => {
    window.removeEventListener('beforeunload', () => {})
    localStorage.removeItem('adminEmail')
    router.push('/')
  }

  const handleLeavePage = () => {
    setShowLeaveConfirmation(true)
  }

  const confirmLeavePage = () => {
    handleLogout()
  }

  const cancelLeavePage = () => {
    setShowLeaveConfirmation(false)
  }

  const renderAnswerReview = () => {
    if (!selectedResult) return null

    return (
      <div
        ref={reviewSectionRef}
        className={`mt-8 bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl border-t-4 border-green-600 ${
          language === 'ar' ? 'text-right' : 'text-left'
        } `}
        style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
      >
        <h3 className="text-2xl font-semibold mb-4 text-green-800">
          {language === 'ar'
            ? `مراجعة الإجابات لـ ${selectedResult.user_name}`
            : `Answer Review for ${selectedResult.user_name}`}
        </h3>
        <p className="mb-2">
          {language === 'ar'
            ? `رقم الهوية: ${selectedResult.id_number}`
            : `ID Number: ${selectedResult.id_number}`}
        </p>
        <p className="mb-4">
          {language === 'ar'
            ? `رقم الهاتف: ${selectedResult.phone_number}`
            : `Phone Number: ${selectedResult.phone_number}`}
        </p>
        {examQuestions.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h4 className="text-lg font-medium mb-2 text-green-700">
              {section.name}
            </h4>
            {section.questions.map((question) => {
              const answer = selectedResult.answers[question.id]
              if (!answer) return null

              let isCorrect = false
              let correctAnswerDisplay = ''
              let pointsEarned = answer.score

              if (question.question_type === 'multiple') {
                isCorrect = answer.score === answer.maxScore
                correctAnswerDisplay = Array.isArray(answer.correctAnswer)
                  ? answer.correctAnswer.join(', ')
                  : answer.correctAnswer
              } else if (question.question_type === 'truefalse') {
                isCorrect = answer.score === answer.maxScore
                correctAnswerDisplay =
                  answer.correctAnswer === 'true'
                    ? language === 'ar'
                      ? 'صح'
                      : 'True'
                    : language === 'ar'
                    ? 'خطأ'
                    : 'False'
              } else if (question.question_type === 'written') {
                isCorrect = answer.score === answer.maxScore
                correctAnswerDisplay = Array.isArray(answer.correctAnswer)
                  ? answer.correctAnswer.join(', ')
                  : answer.correctAnswer
              }

              return (
                <div
                  key={question.id}
                  className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-700">
                    {question.question_text}
                  </p>
                  <p className="mt-2">
                    {language === 'ar' ? 'إجابة المستخدم: ' : 'User Answer: '}
                    {answer.userAnswer !== null
                      ? Array.isArray(answer.userAnswer)
                        ? answer.userAnswer.join(', ')
                        : answer.userAnswer.toString()
                      : language === 'ar'
                      ? 'لم تتم الإجابة'
                      : 'Not answered'}
                  </p>
                  <p className="mt-1">
                    {language === 'ar'
                      ? 'الإجابة الصحيحة: '
                      : 'Correct Answer: '}
                    {correctAnswerDisplay}
                  </p>
                  {question.question_type === 'written' &&
                    Array.isArray(answer.userAnswer) &&
                    Array.isArray(answer.correctAnswer) && (
                      <div className="mt-1">
                        {answer.userAnswer.map((userAns, index) => (
                          <p
                            key={index}
                            className={
                              answer.correctAnswer.includes(userAns)
                                ? 'text-green-600'
                                : 'text-red-600'
                            }
                          >
                            {language === 'ar'
                              ? `الخيار ${index + 1}: `
                              : `Option ${index + 1}: `}
                            {answer.correctAnswer.includes(userAns)
                              ? language === 'ar'
                                ? 'صحيح'
                                : 'Correct'
                              : language === 'ar'
                              ? 'خاطئ'
                              : 'Incorrect'}
                          </p>
                        ))}
                      </div>
                    )}
                  <p
                    className={`mt-1 font-semibold ${
                      isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {isCorrect
                      ? language === 'ar'
                        ? 'صحيح'
                        : 'Correct'
                      : language === 'ar'
                      ? 'خاطئ'
                      : 'Incorrect'}
                  </p>
                  <p className="mt-1">
                    {language === 'ar'
                      ? `النقاط المكتسبة: ${pointsEarned} من ${answer.maxScore}`
                      : `Points earned: ${pointsEarned} out of ${answer.maxScore}`}
                  </p>
                </div>
              )
            })}
          </div>
        ))}
        <Button
          onClick={() => {
            setSelectedResult(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all"
        >
          {language === 'ar' ? 'العودة إلى النتائج' : 'Back to Results'}
        </Button>
      </div>
    )
  }

  if (language === 'ar') {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-r from-green-50 to-blue-50 rtl">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleLeavePage}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
              >
                تسجيل الخروج
              </Button>
              <div className="flex items-center space-x-2">
                <Label
                  htmlFor="language-toggle"
                  className="text-sm font-medium"
                >
                  العربية
                </Label>
                <Switch
                  id="language-toggle"
                  checked={true}
                  onCheckedChange={toggleLanguage}
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-green-800">صفحة الإدارة</h1>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-green-600 mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <Search className="text-gray-400 ml-2" />
                <Input
                  type="text"
                  placeholder="بحث بالاسم أو رقم الهوية أو رقم الهاتف"
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-64"
                />
              </div>
              <h2 className="text-2xl font-semibol text-green-700">
                نتائج الاختبار
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full bg-white border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {[
                      'الإجراءات',
                      'تاريخ الإكمال',
                      'الدرجة',
                      'رقم الهاتف',
                      'رقم الهوية',
                      'الاسم',
                    ].map((header, index) => (
                      <th
                        key={index}
                        className="py-2 px-4 border-b text-center"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-center">
                        <div className="flex justify-center space-x-2">
                          <Button
                            onClick={() => handleResultClick(result)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-all"
                          >
                            مراجعة
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(result)}
                            className="bg-white text-red-500 p-1 rounded hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={20} />
                          </Button>
                        </div>
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {new Date(result.created_at).toLocaleString('ar-SA')}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {result.score}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {result.phone_number}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {result.id_number}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {result.user_name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {renderAnswerReview()}
        </div>
        <Dialog
          open={showDeleteConfirmation}
          onOpenChange={setShowDeleteConfirmation}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                هل أنت متأكد أنك تريد حذف نتيجة {resultToDelete?.user_name}؟
              </p>
              <Input
                type="email"
                value={deleteConfirmationEmail}
                onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني للتأكيد"
                className="mt-4"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setShowDeleteConfirmation(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                حذف
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={showLeaveConfirmation}
          onOpenChange={setShowLeaveConfirmation}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الخروج</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>هل أنت متأكد أنك تريد تسجيل الخروج؟</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={cancelLeavePage}>إلغاء</Button>
              <Button
                onClick={confirmLeavePage}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                تأكيد
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <ToastContainer rtl position="top-right" />
      </div>
    )
  } else {
    return (
      <div className="min-h-screen p-8 bg-gradient-to-r from-green-50 to-blue-50 ltr">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-green-800">Admin Page</h1>
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleLeavePage}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all"
              >
                Logout
              </Button>
              <div className="flex items-center space-x-2">
                <Label
                  htmlFor="language-toggle"
                  className="text-sm font-medium"
                >
                  English
                </Label>
                <Switch
                  id="language-toggle"
                  checked={false}
                  onCheckedChange={toggleLanguage}
                />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-green-600 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-green-700">
                Exam Results
              </h2>
              <div className="flex items-center">
                <Search className="text-gray-400 mr-2" />
                <Input
                  type="text"
                  placeholder="Search by name, ID, or phone"
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full bg-white border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {[
                      'Name',
                      'ID Number',
                      'Phone Number',
                      'Score',
                      'Completion Date',
                      'Actions',
                    ].map((header, index) => (
                      <th
                        key={index}
                        className="py-2 px-4 border-b text-center"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b text-center">
                        {result.user_name}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {result.id_number}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {result.phone_number}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {result.score}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        {new Date(result.created_at).toLocaleString('en-US')}
                      </td>
                      <td className="py-2 px-4 border-b text-center">
                        <div className="flex justify-center space-x-2">
                          <Button
                            onClick={() => handleResultClick(result)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition-all"
                          >
                            Review
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(result)}
                            className="bg-white text-red-500 p-1 rounded hover:bg-red-100 transition-all"
                          >
                            <Trash2 size={20} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {renderAnswerReview()}
        </div>
        <Dialog
          open={showDeleteConfirmation}
          onOpenChange={setShowDeleteConfirmation}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                Are you sure you want to delete {resultToDelete?.user_name}'s
                result?
              </p>
              <Input
                type="email"
                value={deleteConfirmationEmail}
                onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
                placeholder="Enter your email to confirm"
                className="mt-4"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setShowDeleteConfirmation(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
          open={showLeaveConfirmation}
          onOpenChange={setShowLeaveConfirmation}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Are you sure you want to log out?</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={cancelLeavePage}>Cancel</Button>
              <Button
                onClick={confirmLeavePage}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <ToastContainer position="top-right" />
      </div>
    )
  }
}
