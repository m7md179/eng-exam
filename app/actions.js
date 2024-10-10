'use server'

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function fetchExamQuestions() {
  const supabase = createServerComponentClient({ cookies })
  try {
    const { data, error } = await supabase
      .from('exam_questions')
      .select('id, section_name, question_type, question_text, options, correct_answers, points')
      .order('id', { ascending: true });
    if (error) throw error;

    const groupedQuestions = data.reduce((acc, question) => {
      if (!acc[question.section_name]) {
        acc[question.section_name] = [];
      }
      acc[question.section_name].push({
        id: question.id,
        type: question.question_type,
        question: question.question_text,
        options: question.options ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options) : [],
        points: question.points,
      });
      return acc;
    }, {});

    return { success: true, examSections: Object.entries(groupedQuestions).map(([name, questions]) => ({ name, questions })) };
  } catch (error) {
    console.error('Error fetching exam questions:', error.message);
    return { success: false, error: error.message };
  }
}

export async function submitExam(formData) {
  const supabase = createServerComponentClient({ cookies })
  const userName = formData.get('userName');
  const userId = formData.get('userId');
  const phoneNumber = formData.get('phoneNumber');
  const answers = JSON.parse(formData.get('answers'));

  try {
    // Fetch exam questions with correct answers from the database
    const { data: examQuestions, error: fetchError } = await supabase
      .from('exam_questions')
      .select('*')
      .order('id', { ascending: true });
    if (fetchError) throw fetchError;
    
    let totalScore = 0;
    let maxScore = 0;
    const scoredAnswers = {};

    // Calculate the score
    examQuestions.forEach((question) => {
      const userAnswer = answers[`${question.section_name}-${question.id}`];
      let questionPoints = parseFloat(question.points) || 1; // Use let instead of const
      maxScore += questionPoints;
      let questionScore = 0;
    
      if (question.question_type === 'written') {
        const correctAnswers = Array.isArray(question.correct_answers) ? question.correct_answers : JSON.parse(question.correct_answers || '[]');
        if (Array.isArray(userAnswer)) {
          questionScore = userAnswer.reduce((score, answer) => {
            if (correctAnswers.includes(answer)) {
              return score + 1;
            }
            return score;
          }, 0);
        }
      } else if (question.question_type === 'multiple' && question.id === 37) {
        const correctAnswers = Array.isArray(question.correct_answers) ? question.correct_answers : JSON.parse(question.correct_answers || '[]');
        const maxPointsForQuestion14 = 4; // Set the max score to 4 for question 14
        const correctCount = userAnswer.filter(answer => correctAnswers.includes(answer)).length;
        const incorrectCount = userAnswer.filter(answer => !correctAnswers.includes(answer)).length;
        questionScore = Math.max(0, correctCount - incorrectCount);
        questionPoints = maxPointsForQuestion14; // Reassign the maximum points to 4 for question 14
      } else if (question.question_type === 'multiple') {
        const correctAnswers = Array.isArray(question.correct_answers) ? question.correct_answers : JSON.parse(question.correct_answers || '[]');
        if (userAnswer && correctAnswers.includes(userAnswer)) {
          questionScore = questionPoints;
        }
      } else if (question.question_type === 'truefalse') {
        const correctAnswer = Array.isArray(question.correct_answers) ? question.correct_answers[0] : JSON.parse(question.correct_answers || '[]')[0];
        if (userAnswer !== null && userAnswer !== undefined) {
          const normalizedUserAnswer = userAnswer === 'true' ? 'صح' : 'خطأ';
          if (normalizedUserAnswer === correctAnswer) {
            questionScore = questionPoints;
          }
        }
      }

      // Cap the score at the maximum points for the question
      questionScore = Math.min(questionScore, questionPoints);

      totalScore += questionScore;
      scoredAnswers[question.id] = {
        userAnswer: userAnswer !== null && userAnswer !== undefined ? 
          (question.question_type === 'truefalse' ? (userAnswer === 'true' ? 'صح' : 'خطأ') : userAnswer) 
          : null,
        correctAnswer: question.correct_answers,
        score: questionScore,
        maxScore: questionPoints
      };
    });

    // Insert the exam result into the database
    const { error: insertError } = await supabase.from('exam_results').insert({
      user_name: userName,
      id_number: userId,
      phone_number: phoneNumber,
      score: Math.round(totalScore),
      max_score: Math.round(maxScore),
      answers: scoredAnswers,
      created_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;
    
    return { success: true, score: totalScore, maxScore, scoredAnswers };
  } catch (error) {
    console.error('Error submitting exam:', error.message);
    return { success: false, error: error.message };
  }
}