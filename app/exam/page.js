'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'tailwindcss/tailwind.css';

export default function ExamPage() {
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examSections, setExamSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('ar');
  const router = useRouter();

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
    const storedUserName = localStorage.getItem('userName');
    const storedUserId = localStorage.getItem('userId');
    const storedPhoneNumber = localStorage.getItem('phoneNumber');

    if (!storedUserName || !storedUserId || !storedPhoneNumber) {
      router.push('/');
    } else {
      setUserName(storedUserName);
      setUserId(storedUserId);
      setPhoneNumber(storedPhoneNumber);
      fetchExamQuestions();
    }
  }, [router]);

  const fetchExamQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .order('id', { ascending: true });
  
      if (error) throw error;
  
      const groupedQuestions = data.reduce((acc, question) => {
        if (!acc[question.section_name]) {
          acc[question.section_name] = [];
        }
        acc[question.section_name].push(question);
        return acc;
      }, {});
  
      const formattedSections = Object.entries(groupedQuestions).map(([name, questions]) => ({
        name,
        questions: questions.map(q => ({
          id: q.id,
          type: q.question_type,
          question: q.question_text,
          options: q.options,
          correctAnswers: Array.isArray(q.correct_answers) ? q.correct_answers : [],
          acceptedAnswers: Array.isArray(q.accepted_answers) ? q.accepted_answers : []
        }))
      }));
  
      setExamSections(formattedSections);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exam questions:', error.message);
      toast.error(language === 'ar' ? `خطأ في جلب أسئلة الاختبار: ${error.message}` : `Error fetching exam questions: ${error.message}`);
      setLoading(false);
    }
  };

  const handleAnswerChange = (sectionIndex, questionIndex, answer, questionType) => {
    setAnswers((prev) => ({
      ...prev,
      [`${sectionIndex}-${questionIndex}`]: questionType === 'multiple' 
        ? answer.toString()
        : answer,
    }));
  };

  const handleSubmit = async () => {
    let totalScore = 0;
  
    examSections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        const userAnswer = answers[`${sectionIndex}-${questionIndex}`];
  
        if (question.type === 'multiple') {
          if (question.correctAnswers && question.correctAnswers.includes(userAnswer)) {
            totalScore += 1;
          }
        } else if (question.type === 'truefalse') {
          if (userAnswer !== undefined && question.correctAnswers && question.correctAnswers.includes(userAnswer.toString())) {
            totalScore += 1;
          }
        } else if (question.type === 'written') {
          const lowerCaseAnswer = userAnswer ? userAnswer.toLowerCase().trim() : '';
          if (question.acceptedAnswers && question.acceptedAnswers.some((answer) => lowerCaseAnswer.includes(answer.toLowerCase()))) {
            totalScore += 1;
          }
        }
      });
    });
  
    setScore(totalScore);
    setExamSubmitted(true);
  
    try {
      const { error } = await supabase.from('exam_results').insert({
        user_name: userName,
        id_number: userId,
        phone_number: phoneNumber,
        score: totalScore,
        answers: answers,
        created_at: new Date(),
      });
      if (error) throw error;
      toast.success(language === 'ar' ? 'تم تسليم الاختبار بنجاح' : 'Exam submitted successfully');
    } catch (error) {
      console.error('Error submitting exam:', error.message);
      toast.error(language === 'ar' ? `خطأ في تسليم الاختبار: ${error.message}` : `Error submitting exam: ${error.message}`);
    }
  };
  
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-r from-green-50 to-blue-50 ${language === 'ar' ? 'rtl' : ''}`}>
        <p className="text-xl font-semibold text-green-800">
          {language === 'ar' ? 'جاري تحميل أسئلة الاختبار...' : 'Loading exam questions...'}
        </p>
      </div>
    );
  }

  if (examSubmitted) {
    return (
      <div className={`min-h-screen bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-center p-4 ${language === 'ar' ? 'rtl' : ''}`}>
        <div className="bg-white shadow-lg rounded-lg p-8 text-right max-w-md w-full border-t-4 border-green-600">
          <h1 className="text-3xl font-bold text-center text-green-800 mb-6">
            {language === 'ar' ? 'تم إكمال الاختبار' : 'Exam Completed'}
          </h1>
          <p className="text-xl text-center mb-4">
            {language === 'ar' ? `شكراً لك، ${userName}!` : `Thank you, ${userName}!`}
          </p>
          <p className="text-lg text-center mb-6">
            {language === 'ar' ? `درجتك النهائية هي: ${score} من ${examSections.reduce((total, section) => total + section.questions.length, 0)}` : `Your final score is: ${score} out of ${examSections.reduce((total, section) => total + section.questions.length, 0)}`}
          </p>
          <button
            className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
            onClick={() => {
              localStorage.removeItem('userName');
              localStorage.removeItem('userId');
              localStorage.removeItem('phoneNumber');
              router.push('/');
            }}
          >
            {language === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Return to Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-r from-green-50 to-blue-50 p-8 ${language === 'ar' ? 'rtl' : ''}`}>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 text-right border-t-4 border-green-600">
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">
          {language === 'ar' ? 'الاختبار' : 'The Exam'}
        </h1>
        <div className="space-y-8">
          {examSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border border-gray-300 p-6 rounded-lg shadow-sm bg-gray-50">
              <h2 className="text-xl font-semibold text-green-700 mb-4">
                {section.name}
              </h2>
              {section.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="mb-6">
                  <p className="font-medium text-gray-700 mb-2">
                    {question.question}
                  </p>
                  {question.type === 'multiple' && (
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex}>
                          <input
                            type="radio"
                            id={`${sectionIndex}-${questionIndex}-${optionIndex}`}
                            name={`${sectionIndex}-${questionIndex}`}
                            checked={answers[`${sectionIndex}-${questionIndex}`] === option}
                            onChange={() => handleAnswerChange(sectionIndex, questionIndex, option, 'multiple')}
                            className="mr-2"
                          />
                          <label htmlFor={`${sectionIndex}-${questionIndex}-${optionIndex}`} className="text-gray-600">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  {question.type === 'truefalse' && (
                    <div className="space-y-2">
                      <div>
                        <input
                          type="radio"
                          id={`${sectionIndex}-${questionIndex}-true`}
                          name={`${sectionIndex}-${questionIndex}`}
                          checked={answers[`${sectionIndex}-${questionIndex}`] === 'true'}
                          onChange={() => handleAnswerChange(sectionIndex, questionIndex, 'true', 'truefalse')}
                          className="mr-2"
                        />
                        <label htmlFor={`${sectionIndex}-${questionIndex}-true`} className="text-gray-600">
                          {language === 'ar' ? 'صحيح' : 'True'}
                        </label>
                      </div>
                      <div>
                        <input
                          type="radio"
                          id={`${sectionIndex}-${questionIndex}-false`}
                          name={`${sectionIndex}-${questionIndex}`}
                          checked={answers[`${sectionIndex}-${questionIndex}`] === 'false'}
                          onChange={() => handleAnswerChange(sectionIndex, questionIndex, 'false', 'truefalse')}
                          className="mr-2"
                        />
                        <label htmlFor={`${sectionIndex}-${questionIndex}-false`} className="text-gray-600">
                          {language === 'ar' ? 'خطأ' : 'False'}
                        </label>
                      </div>
                    </div>
                  )}
                  {question.type === 'written' && (
                    <textarea
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-600"
                      rows={3}
                      value={answers[`${sectionIndex}-${questionIndex}`] || ''}
                      onChange={(e) => handleAnswerChange(sectionIndex, questionIndex, e.target.value, 'written')}
                      placeholder={language === 'ar' ? 'اكتب إجابتك هنا' : 'Write your answer here'}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <button
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all mt-8"
          onClick={handleSubmit}
        >
          {language === 'ar' ? 'تسليم الاختبار' : 'Submit Exam'}
        </button>
      </div>
      <ToastContainer />
    </div>
  );
}
