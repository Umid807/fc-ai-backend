import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Make sure this points to your initialized Firestore instance

// Helper to get a random question from an array
function getRandomQuestionFromGroup(groupArray) {
  const randomIndex = Math.floor(Math.random() * groupArray.length);
  return groupArray[randomIndex];
}

// Helper to process question data and include followUp questions
function processQuestionData(questionData, languageData) {
  if (!questionData || !questionData.answers) {
    return questionData;
  }

  // Process each answer to include followUp question details
  const processedAnswers = questionData.answers.map(answer => {
    if (answer.followUp && languageData.followUps) {
      // Find the corresponding followUp question
      const followUpQuestion = languageData.followUps.find(fu => fu.id === answer.followUp);
      if (followUpQuestion) {
        return {
          ...answer,
          followUpQuestion: followUpQuestion
        };
      }
    }
    return answer;
  });

  return {
    ...questionData,
    answers: processedAnswers
  };
}

// ✅ Updated function to accept language parameter and handle new structure
export async function fetchQuestionsFromCloud(language = 'eng') {
  try {
    console.log(`🔍 Fetching quiz questions for language: ${language}`);
    
    const docRef = doc(db, 'dna_quiz', language);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const languageData = docSnap.data();
      console.log(`✅ Document exists for language: ${language}`);
      console.log(`📊 Available groups: ${Object.keys(languageData).filter(key => key.startsWith('group')).join(', ')}`);
      
      // Check if we have the required groups
      if (!languageData.group1 || !Array.isArray(languageData.group1)) {
        console.warn(`⚠️ Invalid quiz data structure for language: ${language}, falling back to English`);
        console.warn(`📋 Group1 exists: ${!!languageData.group1}, is array: ${Array.isArray(languageData.group1)}`);
        
        // Try fallback to English
        const fallbackDocRef = doc(db, 'dna_quiz', 'eng');
        const fallbackDocSnap = await getDoc(fallbackDocRef);
        
        if (!fallbackDocSnap.exists()) {
          console.error("❌ No English fallback data available");
          return null;
        }
        
        const fallbackData = fallbackDocSnap.data();
        console.log(`🔄 Using English fallback data`);
        
        const questions = [
          processQuestionData(getRandomQuestionFromGroup(fallbackData.group1), fallbackData),
          processQuestionData(getRandomQuestionFromGroup(fallbackData.group2), fallbackData),
          processQuestionData(getRandomQuestionFromGroup(fallbackData.group3), fallbackData),
          processQuestionData(getRandomQuestionFromGroup(fallbackData.group4), fallbackData),
          processQuestionData(getRandomQuestionFromGroup(fallbackData.group5), fallbackData),
          processQuestionData(getRandomQuestionFromGroup(fallbackData.group6), fallbackData),
          processQuestionData(getRandomQuestionFromGroup(fallbackData.group7), fallbackData),
        ];
        return questions.filter(q => q !== null && q !== undefined);
      }
      
      // ✅ Get questions from the specified language with new structure
      console.log(`🎯 Processing questions for language: ${language}`);
      
      // Dynamically check which groups exist and have data
      const questions = [];
      for (let i = 1; i <= 7; i++) {
        const groupKey = `group${i}`;
        const groupData = languageData[groupKey];
        
        if (groupData && Array.isArray(groupData) && groupData.length > 0) {
          console.log(`✅ ${groupKey} exists with ${groupData.length} questions`);
          const selectedQuestion = processQuestionData(getRandomQuestionFromGroup(groupData), languageData);
          if (selectedQuestion) {
            questions.push(selectedQuestion);
          }
        } else {
          console.log(`⚠️ ${groupKey} missing or empty for language: ${language}`);
          
          // If we have fewer than 7 groups, try to get from English as fallback for missing groups
          if (language !== 'eng') {
            try {
              const fallbackDocRef = doc(db, 'dna_quiz', 'eng');
              const fallbackDocSnap = await getDoc(fallbackDocRef);
              
              if (fallbackDocSnap.exists()) {
                const fallbackData = fallbackDocSnap.data();
                const fallbackGroupData = fallbackData[groupKey];
                
                if (fallbackGroupData && Array.isArray(fallbackGroupData) && fallbackGroupData.length > 0) {
                  console.log(`🔄 Using English fallback for ${groupKey}`);
                  const fallbackQuestion = processQuestionData(getRandomQuestionFromGroup(fallbackGroupData), fallbackData);
                  if (fallbackQuestion) {
                    questions.push(fallbackQuestion);
                  }
                }
              }
            } catch (fallbackError) {
              console.warn(`❌ Failed to get English fallback for ${groupKey}:`, fallbackError.message);
            }
          }
        }
      }
      
      console.log(`🎉 Successfully fetched ${questions.length} questions for language: ${language}`);
      
      // Enhanced debug logging for Turkish specifically
      if (language === 'tk') {
        console.log('🇹🇷 Turkish data debug:');
        console.log('- Questions fetched:', questions.length);
        console.log('- Group1 length:', languageData.group1?.length);
        console.log('- Sample question:', questions[0]?.question);
        console.log('- Has followUps:', !!languageData.followUps);
        console.log('- FollowUps count:', languageData.followUps?.length);
      }
      
      // Return at least some questions, even if we don't have all 7 groups
      if (questions.length === 0) {
        console.warn(`⚠️ No valid questions found for language: ${language}, falling back to English`);
        if (language !== 'eng') {
          return await fetchQuestionsFromCloud('eng');
        }
        return null;
      }
      
      return questions;
    } else {
      console.warn(`❌ No DNA quiz document found for language: ${language}`);
      
      // Special handling for Turkish debugging
      if (language === 'tk') {
        console.error('🇹🇷 Turkish document does not exist in Firestore!');
        console.error('🔍 Check if document "dna_quiz/tk" exists in your Firestore database');
        
        // List what documents DO exist
        console.log('💡 Trying to fallback to English...');
      }
      
      // Try fallback to English
      if (language !== 'eng') {
        console.log('🔄 Attempting fallback to English...');
        return await fetchQuestionsFromCloud('eng');
      }
      
      console.error("❌ No DNA quiz data found in Firestore.");
      return null;
    }
  } catch (error) {
    console.error("🚨 Error fetching quiz questions from Firestore:", error);
    
    // Enhanced error logging for Turkish
    if (language === 'tk') {
      console.error('🇹🇷 Turkish fetch failed with error:', error.message);
      console.error('🔧 Check Firestore rules and document existence');
    }
    
    // If the requested language fails and it's not English, try English fallback
    if (language !== 'eng') {
      console.log('🔄 Attempting fallback to English due to error...');
      try {
        return await fetchQuestionsFromCloud('eng');
      } catch (fallbackError) {
        console.error("❌ Fallback to English also failed:", fallbackError);
        return null;
      }
    }
    
    return null;
  }
}