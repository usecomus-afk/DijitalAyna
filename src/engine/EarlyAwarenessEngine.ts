export interface EarlyAwarenessSignal {
  patternId: string;
  isTriggered: boolean;
  severity: 'low' | 'medium' | 'high';
}

export interface EarlyAwarenessResult {
  hasWarning: boolean;
  triggeredCount: number;
  signals: EarlyAwarenessSignal[];
  warningMessage?: string;
  disclaimer: string;
}

export class EarlyAwarenessEngine {
  /**
   * Evaluates the 5 cognitive and rhythmic patterns based on 14-day statistical deviations.
   * If at least 3 out of 5 patterns show deviations simultaneously, a warning is triggered.
   * STRICT RULE: Never use terms like 'Alzheimer' or 'Demans' (Dementia).
   * It must be referred to as "Bilişsel İcra ve Sirkadiyen Ritim Dalgalanması" based on scientific literature.
   */
  public evaluateCognitiveAndRhythmicPatterns(signals: EarlyAwarenessSignal[]): EarlyAwarenessResult {
    const triggeredSignals = signals.filter(s => s.isTriggered);
    const triggeredCount = triggeredSignals.length;

    const hasWarning = triggeredCount >= 3;

    return {
      hasWarning,
      triggeredCount,
      signals: triggeredSignals,
      warningMessage: hasWarning
        ? "Son 14 günlük biyobelirteç verilerinizde, akademik literatürde (McKenna et al., 2025; Moon et al., 2025) tanımlanan 'Bilişsel İcra ve Sirkadiyen Ritim Dalgalanması' ile uyumlu olarak eşzamanlı bazal sapmalar tespit edilmiştir."
        : undefined,
      disclaimer: "Modern dijital fenotipleme literatüründe bu göstergeler zihinsel yorgunluk, metabolik etkenler veya bilişsel icra yavaşlaması ihtimaline işaret edebilir. Bu analiz kesin bir teşhis niteliği taşımaz; nesnel verilerinizi uzman bir hekimle değerlendirmeniz önerilir."
    };
  }
}
