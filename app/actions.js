'use server'

import { supabase } from '../utils/supabase';

export async function fetchExamQuestions() {
  try {
    const { data, error } = await supabase
      .from('exam_questions')
      .select('id, section_name, question_type, question_text, options')
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
  const userName = formData.get('userName') ;
  const userId = formData.get('userId');
  const phoneNumber = formData.get('phoneNumber') ;
  const answers = JSON.parse(formData.get('answers'));

  try {
    // Fetch exam questions with correct answers from the database
    const { data: examQuestions, error: fetchError } = await supabase
      .from('exam_questions')
      .select('*')
      .order('id', { ascending: true });

    if (fetchError) throw fetchError;

    let totalScore = 0;

    // Calculate the score
    examQuestions.forEach((question) => {
      const userAnswer = answers[`${question.section_name}-${question.id}`];

      if (question.question_type === 'multiple' || question.question_type === 'truefalse') {
        if (question.correct_answers && question.correct_answers.includes(userAnswer)) {
          totalScore += question.points || 1;
        }
      } else if (question.question_type === 'written') {
        if (Array.isArray(userAnswer) && Array.isArray(question.correct_answers)) {
          const correctCount = userAnswer.filter(answer => question.correct_answers.includes(answer)).length;
          totalScore += correctCount;
        }
      }
    });

    // Insert the exam result into the database
    const { error: insertError } = await supabase.from('exam_results').insert({
      user_name: userName,
      id_number: userId,
      phone_number: phoneNumber,
      score: totalScore,
      answers: answers,
      created_at: new Date(),
    });

    if (insertError) throw insertError;

    return { success: true, score: totalScore };
  } catch (error) {
    console.error('Error submitting exam:', error.message);
    return { success: false, error: error.message };
  }
}