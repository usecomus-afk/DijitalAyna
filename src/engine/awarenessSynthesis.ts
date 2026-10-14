import { Insight, AnomalyResult } from '../types/engine';
import { DailyState, applyDailyStateToInsight } from './dailyState';
import { ClinicalInsightAlert } from '../types/phenotyping';

/**
 * Pool of distinct, non-repetitive, context-specific awareness suggestions
 * ("KÜÇÜK BİR FARKINDALIK ÖNERİSİ") per biomarker/phenotype category.
 * Every variant uses distinct phrasing, vocabulary, and actionable advice so
 * two cards on the same page never repeat the same words or recommendation.
 */
const AWARENESS_SUGGESTION_POOLS: Record<string, string[]> = {
  'burnout-alert': [
    'Klavye basılı tutma ve düzeltme ritminiz zihinsel yorgunluğa işaret ediyor; bugün ekran başındaki çalışma bloklarınızı 25 dakikalık kısa dilimlere bölüp omuzlarınızı gevşetecek 3 dakikalık göz dinlendirme araları verebilirsiniz.',
    'Yazım akışınızdaki duraksamalar bilişsel yükünüzün yükseldiğini gösteriyor; acil olmayan bildirimleri birkaç saatliğine sessize alarak tek bir işe odaklanmayı ve gün ortasında kısa bir temiz hava molası vermeyi deneyebilirsiniz.',
    'Zihinsel enerjinizi korumak adına bugün yapılacaklar listenizden en az bir görevi yarına devredip akşam saatlerinde ekranlardan uzak, sakinleştirici bir geçiş rutini oluşturabilirsiniz.',
  ],
  'depression-isolation-alert': [
    'Ev içi sürenizin uzadığı bu günlerde kendinizi zorlamadan, yalnızca gün ışığı alabileceğiniz 10 dakikalık kısa bir yürüyüş veya pencere önünde açık hava teması sinir sisteminize iyi gelebilir.',
    'Sosyal enerjinizin azaldığını hissediyorsanız uzun buluşmalar yerine güvendiğiniz bir yakınınıza kısa bir sesli not veya mesaj göndererek nazik bir bağ kurmayı deneyebilirsiniz.',
    'Hareket alanınızın daraldığı dönemlerde bedensel durağanlığı kırmak için sabah saatlerinde çalışma köşenizi değiştirmek veya açık havada 15 dakika yavaş tempoda yürümek ritminizi tazeleyebilir.',
  ],
  'anxiety-sleep-alert': [
    'Gece 02:00–04:00 arasındaki uyanıklık döngüsünü yatıştırmak için yatmadan 45 dakika önce ekran parlaklığını minimuma indirip Nefes Egzersizi sekmesindeki 4-7-8 ritmini uygulayabilirsiniz.',
    'Uykuya dalma süreniz uzadığında yatakta ekran kaydırmak yerine loş ışıkta birkaç dakika yavaş diyafram nefesi almak parasempatik sinir sisteminizi uykuya hazırlayacaktır.',
    'Sirkadiyen saatinizi yeniden dengelemek için sabah uyandığınız ilk yarım saat içinde doğal gün ışığıyla temas etmeye ve akşam 22:00 sonrasında bildirimleri sessize almaya özen gösterebilirsiniz.',
  ],
  'neurodiversity-alert': [
    'Uygulamalar arası hızlı geçişler dikkatinizin bölündüğünü gösteriyor; önümüzdeki 20 dakika boyunca yalnızca tek bir pencereyi açık bırakıp telefonu görüş alanınızın dışına koyarak zihninizi tek bir çıpaya sabitleyebilirsiniz.',
    'Mikro-oturum parçalanmasını azaltmak için aklınıza gelen anlık düşünceleri küçük bir kağıda not edip mevcut işiniz tamamlanana kadar diğer uygulamalara geçişi ertelemeyi deneyebilirsiniz.',
    'Odak dağınıklığını dengelemek için gün içinde 15 dakikalık kısa odak sprintleri belirleyip her sprint sonunda 2 dakika ayağa kalkarak bedensel esneme yapabilirsiniz.',
  ],
  'cognitive-decline-alert': [
    'Bilişsel işlem temponuzun ve uyku düzeninizin dalgalandığı bu süreçte, günlük rutinlerinizi sabit saatlere oturtmak ve yoğun kararları zihnin daha dinç olduğu sabah saatlerine bırakmak rahatlatıcı olacaktır.',
    'Kelime bulma ve yazım akışındaki yavaşlamayı desteklemek için aynı anda birden fazla işle uğraşmak yerine adım adım ilerlemeyi seçebilir, bu nesnel ritim verilerini kontrol görüşmenizde hekiminizle paylaşabilirsiniz.',
    'Zihinsel berraklığı desteklemek adına gün içi su tüketiminizi artırabilir, akşam uyku saatlerinizi sabitleyerek beynin gece dinlenme penceresini güçlendirebilirsiniz.',
  ],
  'ptsd-hypervigilance-alert': [
    'Ekranı sık sık açıp kontrol etme eğilimi sinir sisteminizin tetikte olduğunu gösteriyor; şu an bulunduğunuz ortamda gördüğünüz 3 nesneye ve duyduğunuz 2 sese odaklanarak bedeninize güvende olduğunuzu hatırlatabilirsiniz.',
    'Mikro-kontrol döngüsünü yavaşlatmak için telefonu yarım saatliğine başka bir odaya bırakıp ayak tabanlarınızın yerle temasını hissederek derin nefesler alabilirsiniz.',
    'Zihinsel alarm halini yatıştırmak adına gün içinde ekran kilidini açmadan önce bir kez derin nefes alıp "Şu an neye bakmak istiyorum?" diye farkındalıkla duraklayabilirsiniz.',
  ],
  'low-self-esteem-passive-social-alert': [
    'Sosyal medyada pasif kaydırma süresi uzadığında zihinsel kıyaslama artabilir; ekranı kapatıp bugün kendiniz için yaptığınız küçük ama anlamlı bir adımı fark etmeye odaklanabilirsiniz.',
    'Gece geç saatlerdeki pasif ekran tüketimini sonlandırıp size gerçekten iyi hissettiren bir müzik, kitap veya dingin bir dinlenme alanına geçiş yapabilirsiniz.',
    'İzleyici modundan çıkıp kendi iç sesinizle bağ kurmak için bugün sosyal medya akışlarına kısa bir mola vererek düşüncelerinizi birkaç cümleyle not etmeyi deneyebilirsiniz.',
  ],
  'cognitive-pattern-memory-executive': [
    'Günlük görev ve ilaç takibini kolaylaştırmak için hatırlatıcılarınızı sabah kahvaltısı veya akşam yemeği gibi sabit alışkanlıklarla eşleştirerek zihinsel yükünüzü azaltabilirsiniz.',
    'Unutkanlık veya erteleme eğilimi arttığında görevleri tek bir görünür kontrol listesinde toplayıp her adımda yalnızca tek bir maddeyi tamamlamaya odaklanabilirsiniz.',
  ],
  'cognitive-pattern-spatial-circadian': [
    'Gün içi yönelim ve sirkadiyen ritmi desteklemek için gündüz saatlerinde doğal ışık alan ortamlarda bulunmaya, akşamları ise ev içi aydınlatmayı kademeli olarak azaltmaya özen gösterebilirsiniz.',
    'Gece-gündüz döngünüzü güçlendirmek adına her sabah aynı saatte uyanıp kısa bir pencere önü veya yürüyüş rutiniyle biyolojik saatinizi sabitleyebilirsiniz.',
  ],
  'cognitive-pattern-rest-activity': [
    'Gün içi dinlenme ve hareket bloklarınızın bölünmesini azaltmak için 30 dakikalık kesintisiz dinlenme pencereleri ve hafif tempolu kısa yürüyüş aralıkları belirleyebilirsiniz.',
    'Uygulama içi işlemleri tamamlarken acele etmeden, adımları sadeleştirerek ve aralarda derin nefes alarak zihinsel akışınızı destekleyebilirsiniz.',
  ],
  'cognitive-pattern-lexical-latency': [
    'Yazım sırasındaki kelime bulma duraksamalarında kendinize zaman tanıyıp cümlelerinizi acele etmeden, kısa ve sade ifadelerle kurmayı tercih edebilirsiniz.',
    'Dilsel akıcılığınızı dinlendirmek için yoğun mesajlaşma trafiğine kısa aralar verip sesli not kullanmayı veya zihninizi sessiz bir molayla tazelemeyi deneyebilirsiniz.',
  ],
  'cognitive-pattern-apathy-withdrawal': [
    'İçe çekilme eğiliminin arttığı günlerde büyük hedefler koymak yerine yalnızca 5 dakikalık bir balkon/pencere molası veya sevdiğiniz bir müziği dinlemekle güne başlayabilirsiniz.',
    'Dış dünyayla teması yumuşakça canlandırmak için bugün kendinizi yormayan, küçük ve tanıdık bir günlük rutini adım adım uygulamayı seçebilirsiniz.',
  ],
  strained: [
    'Bugün performans baskısı hissetmeden kendine şefkatli bir mola alanı açabilir, rutinlerini sadeleştirebilirsin.',
    'Zihinsel yükünün arttığı bu günde beklentilerini biraz aşağı çekip akşam saatlerini yalnızca dinlenmeye ve sessizliğe ayırabilirsin.',
    'İçsel enerjinin hassaslaştığı anlarda her şeye yetişmeye çalışmak yerine derin bir nefes alıp bedeninin yavaşlama ihtiyacına izin verebilirsin.',
    'Duygusal ritminin dalgalandığı bugün, yoğun ekran etkileşimlerini azaltarak kendine ılık bir içecek ve sakin bir dinlenme köşesi armağan edebilirsin.',
  ],
  learning: [
    'Cihazınızı her zamanki gibi doğal akışında kullanmaya devam ederek 14 günlük kişisel baz hattınızın güvenle oluşmasını sağlayabilirsiniz.',
    'Öğrenme sürecinde sabah ve akşam "Nasıl Hissediyorsun?" sekmesinden kısa duygu durumu bildirimleri paylaşarak dijital ikizinizin kalibrasyonunu zenginleştirebilirsiniz.',
    'Baz hattınız şekillenirken günlük uyku, hareket ve yazım ritminizin doğal seyrini korumak en sağlıklı referans noktasını oluşturacaktır.',
    'Kalibrasyon günlerinde nefes egzersizi ve farkındalık araçlarını dilediğiniz zaman deneyimleyerek kendi içsel ritminizi gözlemleyebilirsiniz.',
  ],
  healthy_balance: [
    'Bu dingin ve sürdürülebilir ritmini korumak için günün keyfini çıkarabilir, kısa nefes molalarıyla dengeni destekleyebilirsin.',
    'Yazım akıcılığın ve günlük hareketliliğin uyumlu seyrediyor; bu dengeli enerjiyi bugün seni besleyen yaratıcı veya sosyal bir aktiviteye yönlendirebilirsin.',
    'Sirkadiyen düzenin ve ekran etkileşimlerin dengede; akşam saatlerinde de aynı sakin tempoyu koruyarak uyku kaliteni güçlendirebilirsin.',
    'Biyobelirteçlerin referans aralığında ilerlerken gün içinde kısa su ve esneme molalarıyla bu zihinsel berraklığı sürdürebilirsin.',
  ],
};

const GENERIC_DISCLAIMER_PATTERNS = [
  /Bu bir tıbbi teşhis değildir/i,
  /Bu veriler kesin bir teşhis değildir/i,
  /Bu analiz kesin bir teşhis niteliği taşımaz/i,
  /Cihazınızı her zamanki gibi doğal akışında kullanmaya devam edebilirsiniz/i,
  /Bu dingin ve sürdürülebilir ritmini korumak için günün keyfini çıkarabilirsin/i,
  /Doğal ritminizi korumak için gününüze dengeli molalar eklemeye devam edebilirsiniz/i,
];

function isGenericOrRepeatedSuggestion(text: string): boolean {
  if (!text || !text.trim()) return true;
  return GENERIC_DISCLAIMER_PATTERNS.some((re) => re.test(text));
}

const RULE_KEY_TO_POOL_KEY: Record<string, string> = {
  burnout: 'burnout-alert',
  emotional_burnout: 'burnout-alert',
  depressionIsolation: 'depression-isolation-alert',
  social_withdrawal: 'depression-isolation-alert',
  anxietySleep: 'anxiety-sleep-alert',
  circadian_disruption: 'anxiety-sleep-alert',
  neurodiversity: 'neurodiversity-alert',
  cognitiveDecline: 'cognitive-decline-alert',
  ptsdHypervigilance: 'ptsd-hypervigilance-alert',
  lowSelfEsteemPassiveSocial: 'low-self-esteem-passive-social-alert',
};

/**
 * Returns a specific, actionable awareness suggestion for a given biomarker/rule type and variant index.
 */
export function getDistinctSuggestedAction(
  biomarkerType: string,
  options: { isLearning?: boolean; isStrained?: boolean; variantIndex?: number } = {}
): string {
  const { isLearning = false, isStrained = false, variantIndex = 0 } = options;

  let poolKey = RULE_KEY_TO_POOL_KEY[biomarkerType] || biomarkerType;
  if (biomarkerType === 'healthy_balance') {
    if (isStrained) {
      poolKey = 'strained';
    } else if (isLearning) {
      poolKey = 'learning';
    } else {
      poolKey = 'healthy_balance';
    }
  }

  const pool =
    AWARENESS_SUGGESTION_POOLS[poolKey] ||
    AWARENESS_SUGGESTION_POOLS.healthy_balance;

  return pool[Math.abs(variantIndex) % pool.length];
}

const STRAINED_BODY_VARIANTS = [
  'Aktif bildiriminde zihinsel yük ve içe çekilme hissettiğini belirttin. Pasif hareket sensörlerin olağan seyrinde olsa da, duygu durumundaki bu dalgalanma zihninin yavaşlamaya ihtiyaç duyduğunu gösteriyor.',
  'Son duygu durumu kayıtların içsel enerjinin düştüğüne işaret ediyor. Cihaz içi sensör ritmin stabil görünse de zihinsel yorgunluk sinyallerini önceliklendirerek bugün tempoyu düşürmek faydalı olacaktır.',
  'Paylaştığın hissiyat verileri bugün duygusal olarak hassas bir eşikte olduğunu yansıtıyor. Günlük akışında kendine daha fazla dinlenme alanı bırakmak dengeyi yeniden kurmana yardımcı olabilir.',
];

/**
 * Applies DailyState and guarantees that every Insight in the list has a distinct,
 * non-repetitive "KÜÇÜK BİR FARKINDALIK ÖNERİSİ" (`suggestedAction`) and body text.
 */
export function deduplicateAndEnrichInsights(
  insights: Insight[],
  dailyState: DailyState,
  isLearning: boolean = false
): Insight[] {
  const usedSuggestions = new Set<string>();
  const usedBodies = new Set<string>();
  const categoryCounters: Record<string, number> = {};

  return insights.map((rawInsight, idx) => {
    const baseInsight = applyDailyStateToInsight(rawInsight, dailyState);
    const isStrainedBalance =
      dailyState.isStrained && rawInsight.biomarkerType === 'healthy_balance';

    const catKey = isStrainedBalance
      ? 'strained'
      : RULE_KEY_TO_POOL_KEY[baseInsight.biomarkerType] || baseInsight.biomarkerType;

    const currentCount = categoryCounters[catKey] ?? 0;
    categoryCounters[catKey] = currentCount + 1;

    let candidateSuggestion = baseInsight.suggestedAction;

    // Replace generic disclaimer text or duplicate suggestions with a unique, actionable suggestion
    if (
      isGenericOrRepeatedSuggestion(candidateSuggestion) ||
      usedSuggestions.has(candidateSuggestion)
    ) {
      let attempt = currentCount;
      let picked = getDistinctSuggestedAction(baseInsight.biomarkerType, {
        isLearning,
        isStrained: dailyState.isStrained,
        variantIndex: attempt,
      });

      // If still colliding (e.g. many cards of the same category across many days), cycle across all pools or add date context
      let safety = 0;
      while (usedSuggestions.has(picked) && safety < 12) {
        attempt += 1;
        picked = getDistinctSuggestedAction(baseInsight.biomarkerType, {
          isLearning,
          isStrained: dailyState.isStrained,
          variantIndex: attempt,
        });
        safety += 1;
      }

      if (usedSuggestions.has(picked) && baseInsight.date) {
        picked = `${picked.replace(/\.$/, '')} (${baseInsight.date} tarihli ritim gözlemi için öneri).`;
      }

      candidateSuggestion = picked;
    }

    usedSuggestions.add(candidateSuggestion);

    let candidateBody = baseInsight.body;
    if (isStrainedBalance && currentCount > 0 && usedBodies.has(candidateBody)) {
      candidateBody =
        STRAINED_BODY_VARIANTS[currentCount % STRAINED_BODY_VARIANTS.length];
    }
    usedBodies.add(candidateBody);

    return {
      ...baseInsight,
      body: candidateBody,
      suggestedAction: candidateSuggestion || getDistinctSuggestedAction('healthy_balance', { variantIndex: idx }),
    };
  });
}

export interface HolisticAwarenessSummary {
  heading: string;
  subtitle: string;
  summaryText: string;
  pillars: { label: string; detail: string }[];
  totalSynthesizedCount: number;
  shareText: string;
}

export interface SynthesizeHolisticOptions {
  insights: Insight[];
  anomalies?: AnomalyResult[];
  earlyAwarenessAlerts?: ClinicalInsightAlert[];
  dailyState: DailyState;
  affectiveIndex?: number;
  hasIndex?: boolean;
  effectiveDayCount: number;
  userName?: string;
  topTags?: string[];
}

/**
 * Interprets the totality of all "KÜÇÜK BİR FARKINDALIK ÖNERİSİ" messages listed on the page
 * and produces a single cohesive, non-repetitive summary under the heading
 * "KÜÇÜK BİR FARKINDALIK ÖNERİSİ".
 */
export function synthesizeHolisticAwarenessSummary({
  insights,
  anomalies = [],
  earlyAwarenessAlerts = [],
  dailyState,
  affectiveIndex = 75,
  hasIndex = false,
  effectiveDayCount,
  userName,
  topTags = [],
}: SynthesizeHolisticOptions): HolisticAwarenessSummary {
  const isLearning = effectiveDayCount < 14;
  const enriched = deduplicateAndEnrichInsights(insights, dailyState, isLearning);
  const safeName = userName && userName.trim() ? userName.trim() : '';
  const nameGreeting = safeName ? `${safeName}, ` : '';

  const hasBurnoutOrCognitive =
    enriched.some((i) =>
      ['burnout-alert', 'emotional_burnout', 'cognitive-decline-alert', 'neurodiversity-alert'].includes(i.biomarkerType) ||
      i.biomarkerType.startsWith('cognitive-pattern')
    ) ||
    earlyAwarenessAlerts.some((a) =>
      ['burnout', 'cognitiveDecline', 'neurodiversity', 'CognitivePattern'].includes(a.insightType)
    ) ||
    anomalies.some((a) => a.isAnomaly && a.metricKey.startsWith('typing_'));

  const hasSleepOrCircadian =
    enriched.some((i) =>
      ['anxiety-sleep-alert', 'circadian_disruption'].includes(i.biomarkerType)
    ) ||
    earlyAwarenessAlerts.some((a) => a.insightType === 'anxietySleep') ||
    anomalies.some((a) => a.isAnomaly && (a.metricKey.startsWith('sleep_') || a.metricKey === 'night_usage_minutes'));

  const hasIsolationOrMobility =
    enriched.some((i) =>
      ['depression-isolation-alert', 'social_withdrawal'].includes(i.biomarkerType)
    ) ||
    earlyAwarenessAlerts.some((a) =>
      ['depressionIsolation'].includes(a.insightType)
    ) ||
    anomalies.some((a) => a.isAnomaly && (a.metricKey === 'mobility_index' || a.metricKey === 'homestay_ratio' || a.metricKey === 'mobility_radius'));

  const hasHypervigilanceOrSocial =
    enriched.some((i) =>
      ['ptsd-hypervigilance-alert', 'low-self-esteem-passive-social-alert'].includes(i.biomarkerType)
    ) ||
    earlyAwarenessAlerts.some((a) =>
      ['ptsdHypervigilance', 'lowSelfEsteemPassiveSocial'].includes(a.insightType)
    );

  const totalSignals = Math.max(
    1,
    enriched.length +
      earlyAwarenessAlerts.filter(
        (a) => !enriched.some((i) => i.biomarkerType === a.id)
      ).length
  );

  const pillars: { label: string; detail: string }[] = [];
  const synthesisParts: string[] = [];

  if (hasBurnoutOrCognitive) {
    synthesisParts.push(
      'bilişsel yükünü hafifletmek için ekran başındaki odak sürelerini kısa dinlenme molalarıyla bölmek ve aynı anda tek bir işe odaklanmak'
    );
    pillars.push({
      label: 'Zihinsel Tempo',
      detail: 'Çalışma bloklarını sadeleştirip kısa göz ve omuz dinlendirme molaları ekleyin.',
    });
  }

  if (hasSleepOrCircadian) {
    synthesisParts.push(
      'gece uyanıklığını ve sirkadiyen ritmi dengelemek adına uyumadan önce ekran temasını azaltıp 4-7-8 nefes egzersiziyle sinir sistemini yatıştırmak'
    );
    pillars.push({
      label: 'Uyku & Sirkadiyen Ritim',
      detail: 'Gece 02:00–04:00 dinlenme penceresini korumak için yatmadan önce ekranları kapatın.',
    });
  }

  if (hasIsolationOrMobility) {
    synthesisParts.push(
      'bedensel durağanlığı ve içe çekilmeyi kırmak için gün ışığında 10–15 dakikalık hafif bir yürüyüş veya sevdiğin biriyle kısa bir iletişim kurmak'
    );
    pillars.push({
      label: 'Hareket & Bağlantı',
      detail: 'Gün ışığında kısa bir açık hava adımı veya tanıdık bir sesle temas enerjinizi tazeler.',
    });
  }

  if (hasHypervigilanceOrSocial) {
    synthesisParts.push(
      'tekrarlayıcı ekran kontrollerini ve pasif kaydırma döngüsünü fark ettiğinde telefonu görüş alanından uzaklaştırıp duyusal olarak bulunduğun ana dönmek'
    );
    pillars.push({
      label: 'Ekran & Öz-Şefkat',
      detail: 'Mikro-kontrol dürtüsü geldiğinde cihazı bırakıp 3 derin nefesle ana odaklanın.',
    });
  }

  let summaryText = '';

  if (synthesisParts.length > 0) {
    const tagMention =
      topTags.length > 0
        ? ` Son kayıtlarındaki (${topTags.slice(0, 3).join(', ')}) etkileri de göz önüne alındığında;`
        : '';
    summaryText = `${nameGreeting}sayfadaki tüm farkındalık önerilerinin bütüncül yorumu, bugün zihinsel ve bedensel ritmini korumak için küçük ama bilinçli yavaşlama alanlarına ihtiyaç duyduğunu gösteriyor.${tagMention} Önerilerin ortak noktası olarak; ${synthesisParts.join(', ')} bugün kendine verebileceğin en destekleyici karşılık olacaktır.`;
  } else if (dailyState.isStrained) {
    const tagMention =
      topTags.length > 0 ? ` (${topTags.slice(0, 3).join(', ')})` : '';
    summaryText = `${nameGreeting}tüm farkındalık notlarının birleşik yorumuna göre, aktif bildirimlerin${tagMention} bugün zihinsel yükünün yüksek ve enerjinin hassas olduğunu yansıtıyor. Üzerindeki performans beklentisini bir kenara bırakıp rutinlerini sadeleştirmek, bildirim yoğunluğunu azaltmak ve akşam saatlerini yalnızca dinlenmeye ayırmak içsel dengeni hızla destekleyecektir.`;
    pillars.push(
      {
        label: 'Duygusal Şefkat',
        detail: 'Bugün kendinize yüksek hedefler koymadan dinlenme ihtiyacınıza alan açın.',
      },
      {
        label: 'Sadeleştirilmiş Rutin',
        detail: 'Acil olmayan işleri erteleyip kısa nefes ve sessizlik molaları verin.',
      }
    );
  } else if (isLearning) {
    summaryText = `${nameGreeting}sayfadaki farkındalık mesajlarının genel özeti; kişisel baz hattın oluşturulurken (${effectiveDayCount}/14 gün) cihaz kullanım, uyku ve hareket ritminin doğal akışında öğrenildiğini gösteriyor. Bu süreçte telefonunu her zamanki doğal düzeninde kullanmaya devam edebilir, sabah ve akşam "Nasıl Hissediyorsun?" sekmesinden kısa duygu bildirimleri girerek dijital ikizinin seni daha yakından tanımasına katkı sağlayabilirsin.`;
    pillars.push(
      {
        label: 'Doğal Ritim (${effectiveDayCount}/14 Gün)'.replace('${effectiveDayCount}', String(effectiveDayCount)),
        detail: '14 günlük referans hattınız tamamlanana kadar doğal kullanım düzeninizi koruyun.',
      },
      {
        label: 'Aktif Hissiyat Kaydı',
        detail: 'Gün içi duygu bildirimleriniz kalibrasyon doğruluğunu doğrudan güçlendirir.',
      }
    );
  } else {
    summaryText = `${nameGreeting}listelenen tüm farkındalık önerilerinin ortak yorumu; yazım akıcılığının, günlük hareketliliğinin ve sirkadiyen dinlenme düzeninin kişisel baz hattınla dengeli bir uyum içinde olduğunu gösteriyor${hasIndex ? ` (Duygusal Denge İndeksi: ${affectiveIndex}/100)` : ''}. Bu sürdürülebilir ritmi korumak için gün içinde kısa su ve nefes molaları vermeye, akşam saatlerinde ise uyku öncesi sakin geçiş rutinini sürdürmeye devam edebilirsin.`;
    pillars.push(
      {
        label: 'Sürdürülebilir Denge',
        detail: 'Mevcut uyku, hareket ve ekran etkileşim temponuz baz hattınızla uyumlu.',
      },
      {
        label: 'Koruyucu Molalar',
        detail: 'Kısa nefes ve esneme aralarıyla gün boyu zihinsel berraklığınızı koruyun.',
      }
    );
  }

  const subtitle =
    totalSignals > 1
      ? `${totalSignals} Farkındalık Notunun Bütüncül Yorumu`
      : 'Günün Bütüncül Farkındalık Yorumu';

  const shareText = [
    `KÜÇÜK BİR FARKINDALIK ÖNERİSİ (${subtitle})`,
    '',
    summaryText,
    '',
    ...pillars.map((p) => `• ${p.label}: ${p.detail}`),
    '',
    '— Dijital Mental İkizim Farkındalık Sistemi',
  ].join('\n');

  return {
    heading: 'KÜÇÜK BİR FARKINDALIK ÖNERİSİ',
    subtitle,
    summaryText,
    pillars,
    totalSynthesizedCount: totalSignals,
    shareText,
  };
}
