'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
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
  const [allDragDropOptions, setAllDragDropOptions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
  const [language, setLanguage] = useState('ar');
  const router = useRouter();
  const dragItem = useRef(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isRefreshDialogOpen, setIsRefreshDialogOpen] = useState(false);
  const refreshAttempted = useRef(false);

  useEffect(() => {
    const storedUserName = localStorage.getItem('userName');
    const storedUserId = localStorage.getItem('userId');
    const storedPhoneNumber = localStorage.getItem('phoneNumber');
    const storedLanguage = localStorage.getItem('language');
    const storedAnswers = JSON.parse(localStorage.getItem('answers') || '{}');
    const storedTimeLeft = parseInt(localStorage.getItem('timeLeft') || '3600', 10);
    const storedExamStarted = localStorage.getItem('examStarted') === 'true';

    if (!storedUserName || !storedUserId || !storedPhoneNumber) {
      router.push('/');
    } else {
      setUserName(storedUserName);
      setUserId(storedUserId);
      setPhoneNumber(storedPhoneNumber);
      setLanguage(storedLanguage || 'ar');
      
      if (storedExamStarted) {
        setAnswers(storedAnswers);
        setTimeLeft(storedTimeLeft);
      } else {
        setIsResetDialogOpen(true);
      }
      
      fetchExamQuestions();
    }

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        const newTime = prevTime - 1;
        localStorage.setItem('timeLeft', newTime.toString());
        return newTime;
      });
    }, 1000);

    const handleBeforeUnload = (e) => {
      if (!refreshAttempted.current) {
        e.preventDefault();
        e.returnValue = '';
        setIsRefreshDialogOpen(true);
        refreshAttempted.current = true;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    const handlePopState = (e) => {
      e.preventDefault();
      setIsLeaveDialogOpen(true);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
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
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          correctAnswers: q.correct_answers,
          points: q.points || 1
        }))
      }));

      setExamSections(formattedSections);
      
      const allOptions = formattedSections.map(section => 
        section.questions
          .filter(q => q.type === 'written')
          .flatMap(q => q.options)
      );
      setAllDragDropOptions(allOptions);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exam questions:', error.message);
      toast.error(language === 'ar' ? `خطأ في جلب أسئلة الاختبار: ${error.message}` : `Error fetching exam questions: ${error.message}`);
      setLoading(false);
    }
  };

  const onDragStart = (e, sectionIndex, questionIndex, optionIndex) => {
    dragItem.current = { sectionIndex, questionIndex, optionIndex };
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e, targetSectionIndex, targetQuestionIndex) => {
    e.preventDefault();
    const draggedItem = dragItem.current;
    if (!draggedItem) return;

    const { sectionIndex, questionIndex, optionIndex } = draggedItem;

    let draggedOption;
    if (questionIndex === -1) {
      draggedOption = allDragDropOptions[sectionIndex][optionIndex];
    } else {
      const sourceAnswer = answers[`${sectionIndex}-${questionIndex}`] || [];
      draggedOption = sourceAnswer[optionIndex];
      const updatedSourceAnswer = sourceAnswer.filter((_, index) => index !== optionIndex);
      handleAnswerChange(sectionIndex, questionIndex, updatedSourceAnswer, 'written');
    }

    if (targetQuestionIndex === -1) {
      if (!allDragDropOptions[targetSectionIndex].includes(draggedOption)) {
        const updatedAllOptions = [...allDragDropOptions];
        updatedAllOptions[targetSectionIndex] = [...(updatedAllOptions[targetSectionIndex] || []), draggedOption];
        setAllDragDropOptions(updatedAllOptions);
      }
    } else {
      const currentAnswer = answers[`${targetSectionIndex}-${targetQuestionIndex}`] || [];
      if (!currentAnswer.includes(draggedOption)) {
        handleAnswerChange(targetSectionIndex, targetQuestionIndex, [...currentAnswer, draggedOption], 'written');
      }
    }

    dragItem.current = null;
  };

  const handleSubmit = async () => {
    setIsSubmitDialogOpen(true);
  };

  const confirmSubmit = async () => {
    setIsSubmitDialogOpen(false);
    
    let totalScore = 0;
    let allAnswered = true;

    examSections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        const userAnswer = answers[`${sectionIndex}-${questionIndex}`];

        if (userAnswer === undefined) {
          allAnswered = false;
        }

        if (question.type === 'multiple') {
          if (question.correctAnswers && question.correctAnswers.includes(userAnswer)) {
            totalScore += question.points;
          }
        } else if (question.type === 'truefalse') {
          if (userAnswer !== undefined && question.correctAnswers && question.correctAnswers.includes(userAnswer.toString())) {
            totalScore += question.points;
          }
        } else if (question.type === 'written') {
          if (Array.isArray(userAnswer) && question.correctAnswers) {
            const isCorrect = question.correctAnswers.every(correctAnswer => 
              userAnswer.includes(correctAnswer)
            );
            if (isCorrect) {
              totalScore += question.points;
            }
          }
        }
      });
    });

    if (!allAnswered && timeLeft > 0) {
      toast.error(language === 'ar' ? 'يجب الإجابة على جميع الأسئلة قبل تسليم الاختبار' : 'Please answer all questions before submitting the exam');
      return;
    }

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
      
      localStorage.removeItem('answers');
      localStorage.removeItem('timeLeft');
      localStorage.removeItem('examStarted');
    } catch (error) {
      console.error('Error submitting exam:', error.message);
      toast.error(language === 'ar' ? `خطأ في تسليم الاختبار: ${error.message}` : `Error submitting exam: ${error.message}`);
    }
  };

  const handleAnswerChange = (sectionIndex, questionIndex, answer, questionType) => {
    const newAnswers = {
      ...answers,
      [`${sectionIndex}-${questionIndex}`]: questionType === 'multiple' 
        ? answer.toString()
        : answer,
    };
    setAnswers(newAnswers);
    localStorage.setItem('answers', JSON.stringify(newAnswers));
    localStorage.setItem('examStarted', 'true');
  };

  const resetExam = () => {
    setAnswers({});
    setTimeLeft(60 * 60);
    localStorage.removeItem('answers');
    localStorage.setItem('timeLeft', (60 * 60).toString());
    localStorage.setItem('examStarted', 'true');
    setIsResetDialogOpen(false);
  };

  const continueExam = () => {
    localStorage.setItem('examStarted', 'true');
    setIsResetDialogOpen(false);
  };

  const handleLeavePage = () => {
    localStorage.removeItem('answers');
    localStorage.removeItem('timeLeft');
    localStorage.removeItem('examStarted');
    router.push('/');
  };

  const handleStayOnPage = () => {
    setIsLeaveDialogOpen(false);
    setIsRefreshDialogOpen(false);
    refreshAttempted.current = false;
    window.history.pushState(null, '', window.location.href);
  };

  const handleRefresh = () => {
    setIsRefreshDialogOpen(false);
    refreshAttempted.current = false;
    window.location.reload();
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-r from-green-50 to-blue-50 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <p className="text-xl font-semibold text-green-800">
          {language === 'ar' ? 'جاري تحميل أسئلة الاختبار...' : 'Loading exam questions...'}
        </p>
      </div>
    );
  }

  if (examSubmitted) {
    return (
      <div className={`min-h-screen bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-center p-4 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="bg-white shadow-lg rounded-lg p-8 text-right max-w-md w-full border-t-4 border-green-600">
          <h1 className="text-3xl font-bold text-center text-green-800 mb-6">
            {language === 'ar' ? 'تم إكمال الاختبار' : 'Exam Completed'}
          </h1>
          <p className={`text-xl text-center mb-4 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
            {language === 'ar' ? `شكراً لك، ${userName}!` : `Thank you, ${userName}!`}
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
            {language === 'ar' ? 'العودة إلى الصفحة الرئيسية' : 'Return to Home Page'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-r from-green-50 to-blue-50 p-8 `}>
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 text-right border-t-4 border-green-600">
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">
          {language === 'ar' ? 'الاختبار' : 'Exam'}
        </h1>
        
        <div className="mb-4 text-center">
          <p className="text-xl font-semibold">
            {language === 'ar' 
              ? `الوقت المتبقي: ${Math.floor(timeLeft / 60)}:${timeLeft % 60 < 10 ? '0' : ''}${timeLeft % 60}`
              : `Time Remaining: ${Math.floor(timeLeft / 60)}:${timeLeft % 60 < 10 ? '0' : ''}${timeLeft % 60}`}
          </p>
        </div>

        <div className="mb-6 p-4 bg-yellow-100 rounded-lg">
          <h2 className={`text-lg font-semibold mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'تعليمات:' : 'Instructions:'}</h2>
          <ul className={`list-none list-inside ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <li>{language === 'ar' ? 'لديك 60 دقيقة لإكمال الاختبار' : 'You have 60 minutes to complete the exam.'}</li>
            <li>{language === 'ar' ? 'يجب الإجابة على جميع الأسئلة قبل التسليم' : 'All questions must be answered before submission.'}</li>
            <li>{language === 'ar' ? 'للأسئلة المكتوبة، اسحب الإجابات وأفلتها في المربع المخصص' : 'For written questions, drag and drop answers into the designated box.'}</li>
            <li>{language === 'ar' ? 'يمكنك سحب الإجابات مرة أخرى إلى مجموعة الخيارات إذا غيرت رأيك' : 'You can drag answers back to the option pool if you change your mind.'}</li>
          </ul>
        </div>

        <div className="space-y-8 ">
          {examSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border border-gray-300 p-6 rounded-lg shadow-sm bg-gray-50">
              <h2 className="text-xl font-semibold text-green-700 mb-4">
                {section.name}
              </h2>

              {section.questions.some(q => q.type === 'written') && (
                <div 
                  className="flex flex-wrap gap-2 mb-4 p-4 bg-gray-100 rounded-lg"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, sectionIndex, -1)}
                >
                  {allDragDropOptions[sectionIndex] && allDragDropOptions[sectionIndex].map((option, index) => (
                    <div
                      key={`option-${sectionIndex}-${index}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, sectionIndex, -1, index)}
                      className="bg-white border border-gray-300 rounded px-2 py-1 cursor-move"
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}

              {section.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="mb-6">
                  <p className="font-medium text-gray-700 mb-2">
                    {question.question}
                  </p>
                  {question.type === 'multiple' && (
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className={`flex items-center flex-row-reverse`}>
                          <input
                            type="radio"
                            id={`${sectionIndex}-${questionIndex}-${optionIndex}`}
                            name={`${sectionIndex}-${questionIndex}`}
                            checked={answers[`${sectionIndex}-${questionIndex}`] === (option.text || option)}
                            onChange={() => handleAnswerChange(sectionIndex, questionIndex, option.text || option, 'multiple')}
                            className='ml-2'
                          />
                          <label htmlFor={`${sectionIndex}-${questionIndex}-${optionIndex}`} className="text-gray-600 flex items-center">
                            {option.image && (
                              <Image 
                                src={`/images/option${optionIndex + 1}.png`} 
                                alt={`Option ${optionIndex + 1}`}
                                width={300} 
                                height={300} 
                                className="object-cover mr-2" 
                              />
                            )}
                            {option.text || option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === 'truefalse' && (
                    <div className="space-y-2">
                      <div className={`flex items-center flex-row-reverse`}>
                        <input
                          type="radio"
                          id={`${sectionIndex}-${questionIndex}-true`}
                          name={`${sectionIndex}-${questionIndex}`}
                          checked={answers[`${sectionIndex}-${questionIndex}`] === 'true'}
                          onChange={() => handleAnswerChange(sectionIndex, questionIndex, 'true', 'truefalse')}
                          className='ml-2'
                        />
                        <label htmlFor={`${sectionIndex}-${questionIndex}-true`} className="text-gray-600">
                          {language === 'ar' ? 'صح' : 'True'}
                        </label>
                      </div>
                      <div className={`flex items-center flex-row-reverse`}>
                        <input
                          type="radio"
                          id={`${sectionIndex}-${questionIndex}-false`}
                          name={`${sectionIndex}-${questionIndex}`}
                          checked={answers[`${sectionIndex}-${questionIndex}`] === 'false'}
                          onChange={() => handleAnswerChange(sectionIndex, questionIndex, 'false', 'truefalse')}
                          className='ml-2'
                        />
                        <label htmlFor={`${sectionIndex}-${questionIndex}-false`} className="text-gray-600">
                          {language === 'ar' ? 'خطأ' : 'False'}
                        </label>
                      </div>
                    </div>
                  )}

                  {question.type === 'written' && (
                    <div
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, sectionIndex, questionIndex)}
                      className="min-h-[50px] p-2 bg-gray-100 rounded flex flex-wrap gap-2"
                    >
                      {(answers[`${sectionIndex}-${questionIndex}`] || []).map((answer, index) => (
                        <div
                          key={`answer-${sectionIndex}-${questionIndex}-${index}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, sectionIndex, questionIndex, index)}
                          className="bg-white border border-gray-300 rounded px-2 py-1 cursor-move"
                        >
                          {answer}
                        </div>
                      ))}
                    </div>
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
        <ToastContainer rtl={language === 'ar'} position="top-right" />

        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'تأكيد تسليم الاختبار' : 'Confirm Exam Submission'}</DialogTitle>
            </DialogHeader>
            <p>
              {language === 'ar' 
                ? 'هل أنت متأكد من أنك تريد تسليم الاختبار؟ لن تتمكن من تغيير إجاباتك بعد التسليم.'
                : 'Are you sure you want to submit the exam? You won\'t be able to change your answers after submission.'}
            </p>
            <DialogFooter>
              <Button onClick={() => setIsSubmitDialogOpen(false)} variant="outline">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={confirmSubmit} className="bg-green-500 hover:bg-green-600 text-white">
                {language === 'ar' ? 'تأكيد التسليم' : 'Confirm Submission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'تحذير' : 'Warning'}</DialogTitle>
            </DialogHeader>
            <p>
              {language === 'ar'
                ? 'هل أنت متأكد أنك تريد مغادرة الصفحة؟ سيتم فقدان جميع إجاباتك.'
                : 'Are you sure you want to leave the page? All your answers will be lost.'}
            </p>
            <DialogFooter>
              <Button onClick={handleStayOnPage} className="bg-green-500 hover:bg-green-600 text-white">
                {language === 'ar' ? 'البقاء في الصفحة' : 'Stay on Page'}
              </Button>
              <Button onClick={handleLeavePage} variant="outline">
                {language === 'ar' ? 'مغادرة الصفحة' : 'Leave Page'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* <Dialog open={isRefreshDialogOpen} onOpenChange={setIsRefreshDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'ar' ? 'تحذير' : 'Warning'}</DialogTitle>
            </DialogHeader>
            <p>
              {language === 'ar'
                ? 'هل أنت متأكد أنك تريد تحديث الصفحة؟ سيتم حفظ إجاباتك ولكن قد تفقد بعض التقدم.'
                : 'Are you sure you want to refresh the page? Your answers will be saved but you may lose some progress.'}
            </p>
            <DialogFooter>
              <Button onClick={handleStayOnPage} className="bg-green-500 hover:bg-green-600 text-white">
                {language === 'ar' ? 'البقاء في الصفحة' : 'Stay on Page'}
              </Button>
              <Button onClick={handleRefresh} variant="outline">
                {language === 'ar' ? 'تحديث الصفحة' : 'Refresh Page'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog> */}
      </div>
    </div>
  );
}