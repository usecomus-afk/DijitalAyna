import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { db } from '../../db';
import { 
  GAD7_QUESTIONS, 
  PHQ9_QUESTIONS, 
  SURVEY_OPTIONS,
  calculateGAD7Risk,
  calculatePHQ9Risk,
  ClinicalSurveyResult
} from '../../data/clinicalSurveys';

interface ClinicalAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ClinicalSurveyResult) => void;
}

export function ClinicalAssessmentModal({ isOpen, onClose, onComplete }: ClinicalAssessmentModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<number[]>(new Array(16).fill(-1));

  if (!isOpen) return null;

  const allQuestions = [...GAD7_QUESTIONS, ...PHQ9_QUESTIONS];
  const isFinished = currentStep >= allQuestions.length;
  
  const handleSelect = (val: number) => {
    const newResponses = [...responses];
    newResponses[currentStep] = val;
    setResponses(newResponses);
    
    // Auto advance
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 300);
  };

  const handleFinish = async () => {
    const gad7Score = responses.slice(0, 7).reduce((a, b) => a + b, 0);
    const phq9Score = responses.slice(7, 16).reduce((a, b) => a + b, 0);
    
    // Question 16 is responses[15]
    const crisisRisk = responses[15] > 0;
    
    const now = new Date();
    
    const result: ClinicalSurveyResult = {
      timestamp: now.getTime(),
      date: now.toISOString().split('T')[0],
      gad7Score,
      gad7Risk: calculateGAD7Risk(gad7Score),
      phq9Score,
      phq9Risk: calculatePHQ9Risk(phq9Score),
      crisisRisk,
      responses
    };
    
    const id = await db.clinicalSurveyResults.add(result);
    result.id = id;
    
    onComplete(result);
  };

  if (isFinished) {
    handleFinish();
    return null; // The parent will render the SurveyResultView or similar
  }

  const currentQuestion = allQuestions[currentStep];
  const progressPercent = ((currentStep) / 16) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X className="w-6 h-6" />
        </button>
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Soru {currentStep + 1} / 16
        </div>
        <div className="w-10"></div>
      </div>
      
      <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800">
        <div 
          className="h-full bg-blue-600 transition-all duration-300" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col max-w-2xl mx-auto w-full">
        <div className="mb-8 mt-4 text-center">
          <h2 className="text-2xl font-semibold leading-tight">
            {currentQuestion}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">
            Son 2 hafta içerisinde bu durumu ne sıklıkla yaşadınız?
          </p>
        </div>

        <div className="space-y-3">
          {SURVEY_OPTIONS.map((opt) => {
            const isSelected = responses[currentStep] === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full p-4 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-700'
                }`}
              >
                <span className={`font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                  {opt.label}
                </span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-blue-600 bg-blue-600' : 'border-zinc-300 dark:border-zinc-700'
                }`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
