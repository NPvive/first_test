import { useState, useEffect, useRef } from 'react';
import { 
  Gavel, 
  BookOpen, 
  Calculator, 
  HelpCircle, 
  ChevronRight, 
  MessageSquare, 
  Send, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Plus, 
  Trash2, 
  FileText, 
  Search, 
  User, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download
} from 'lucide-react';

// ==========================================
// Types
// ==========================================
interface RegisteredRight {
  id: string;
  type: '근저당' | '가압류' | '압류' | '가등기' | '전세권' | '임차인전입';
  name: string;
  date: string;
  amount: number;
  // 임차인 전용 필드
  hasFixedDate?: boolean;
  fixedDate?: string;
  hasClaimedDividend?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ==========================================
// Korean Currency & Number Utils
// ==========================================
function formatKoreanCurrency(value: number): string {
  if (!value || isNaN(value)) return "0원";
  const hundredMillion = Math.floor(value / 100000000);
  const remaining = value % 100000000;
  const tenThousand = Math.floor(remaining / 10000);
  const rest = remaining % 10000;

  let result = "";
  if (hundredMillion > 0) {
    result += `${hundredMillion}억 `;
  }
  if (tenThousand > 0) {
    result += `${tenThousand.toLocaleString()}만 `;
  }
  if (rest > 0 || result === "") {
    result += `${rest.toLocaleString()}`;
  }
  return result.trim() + "원";
}

function convertNumberToKoreanLetters(value: number): string {
  if (!value || isNaN(value)) return "영";
  
  const units = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const smallUnits = ["", "십", "백", "천"];
  const largeUnits = ["", "만", "억", "조"];
  
  let result = "";
  let numStr = Math.floor(value).toString();
  const len = numStr.length;
  
  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr[len - 1 - i]);
    const largeUnitIndex = Math.floor(i / 4);
    const smallUnitIndex = i % 4;
    
    let part = "";
    if (digit > 0) {
      part = units[digit] + smallUnits[smallUnitIndex];
      // 10, 100, 1000 일 때 '일십', '일백' 대신 '십', '백'으로 자연스럽게 처리하는 규칙
      if (digit === 1 && smallUnitIndex > 0) {
        part = smallUnits[smallUnitIndex];
      }
    }
    
    if (i % 4 === 0) {
      const chunk = numStr.substring(Math.max(0, len - 1 - i - 3), len - i);
      if (parseInt(chunk) > 0) {
        part += largeUnits[largeUnitIndex];
      }
    }
    result = part + result;
  }
  
  return result;
}

// ==========================================
// Const Data (Glossary)
// ==========================================
const GLOSSARY = [
  {
    term: "말소기준권리",
    category: "권리분석",
    definition: "부동산 경매에서 매각(낙찰)으로 인해 그 부동산에 설정된 권리들이 소멸하는지, 아니면 낙찰자에게 인수되는지 판단하는 '기준'선이 되는 권리입니다.",
    details: "말소기준권리보다 시간적으로 앞서 설정된 권리(선순위 권리)는 낙찰자가 인수하여 책임져야 하며, 뒤에 설정된 권리(후순위 권리)는 매각으로 모두 소멸합니다. 말소기준권리가 되는 권리는 ①근저당권, ②저당권, ③압류, ④가압류, ⑤담보가등기, ⑥경매개시결정등기 중 등기부등본 상 접수일자가 가장 빠른 권리입니다."
  },
  {
    term: "대항력",
    category: "임차인 보호",
    definition: "임차인이 제3자(새로운 소유자나 낙찰자)에게 임대차 계약의 효력을 주장하며 보증금을 돌려받을 때까지 계속 거주할 수 있는 법적 권리입니다.",
    details: "주택경매에서 임차인이 대항력을 가지려면 '주택의 인도(열쇠 수령/거주)'와 '주민등록(전입신고)'을 마쳐야 합니다. 이 두 가지 요건을 충족한 '다음 날 오전 0시'부터 대항력이 발생합니다. 등기부 상 말소기준권리보다 대항력 발생일이 빨라야 '낙찰자에게 대항할 수 있는 대항력'이 인정됩니다."
  },
  {
    term: "우선변제권",
    category: "임차인 보호",
    definition: "경매 절차에서 매각 대금 중 후순위 권리자나 기타 채권자보다 우선하여 임차 보증금을 변제(배당)받을 수 있는 권리입니다.",
    details: "대항력 요건(전입 + 인도)을 갖추고, 주민센터나 인터넷등기소 등에서 임대차계약서에 '확정일자'를 받으면 성립합니다. 확정일자를 받은 날과 전입신고 다음 날 중 늦은 시점을 기준으로 배당 순위가 결정됩니다. 법원이 정한 '배당요구종기일'까지 공식적으로 배당을 요구해야 대금을 나누어 받을 수 있습니다."
  },
  {
    term: "최우선변제권 (소액임차인)",
    category: "임차인 보호",
    definition: "보증금 규모가 비교적 적은 서민 임차인을 보호하기 위해, 다른 담보물권자(은행 근저당 등)보다 먼저 보증금 중 일정 금액을 가장 최우선으로 돌려주는 제도입니다.",
    details: "비록 전입신고가 근저당 등 말소기준권리보다 늦어 대항력이 없더라도(소액 임차인 요건 충족 시), 경매개시결정등기 전까지 전입신고를 마쳤다면 적용됩니다. 지역별로 기준 보증금 범위와 최우선으로 변제받는 금액이 주택임대차보호법에 의해 정해져 있습니다."
  },
  {
    term: "인도명령",
    category: "명도/인도",
    definition: "낙찰대금을 완납한 매수인이 부동산의 점유자(소유자, 채무자, 대항력 없는 임차인 등)로부터 점유를 강제로 넘겨받기 위해 법원에 신청하는 간이 구제 제도입니다.",
    details: "일반 명도소송은 6개월에서 1년 이상의 오랜 시일이 걸리지만, 인도명령은 매각대금 완납 후 6개월 이내에 신청하면 보통 수 주 내에 법원의 결정이 납니다. 인도명령 결정문과 송달증명원이 나오면 강제집행을 실시할 수 있습니다. 단, 대항력 있는 임차인처럼 낙찰자에게 대항할 수 있는 적법한 권원을 가진 점유자에게는 신청할 수 없습니다."
  },
  {
    term: "명도",
    category: "명도/인도",
    definition: "경매 낙찰자가 대금을 모두 납부한 후, 해당 부동산을 점유하고 있는 소유자, 채무자, 또는 임차인 등의 점유자로부터 부동산의 지배권을 안전하게 넘겨받는 일련의 과정입니다.",
    details: "경매 초보자들이 가장 부담스러워하는 단계입니다. 대부분 점유자와의 원만한 이사비 협의(대화와 타협)를 통해 해결하며, 합의가 되지 않을 경우 법적인 '인도명령' 및 '강제집행' 절차를 병행하여 심리적인 압박과 실질적인 인도를 동시에 진행합니다."
  },
  {
    term: "배당요구종기일",
    category: "경매 절차",
    definition: "법원이 경매 매각 대금에서 돈을 배당받을 채권자들과 임차인들에게 '이 날짜까지 배당을 요구하라'고 지정해 놓은 마지막 기한입니다.",
    details: "특히 대항력 있는 임차인이 배당금에서 보증금을 회수하고자 할 때, 이 배당요구종기일까지 배당요구를 반드시 해야 합니다. 만약 임차인이 대항력이 있음에도 배당요구를 하지 않았다면, 법원은 낙찰대금에서 보증금을 한 푼도 배당하지 않으므로 낙찰자가 임차인의 보증금 전액을 생돈으로 인수하여 돌려주어야 합니다."
  },
  {
    term: "최저매각가격",
    category: "경매 절차",
    definition: "법원이 해당 입찰 기일에 입찰할 수 있는 가장 낮은 금액의 하한선입니다. 이 가격 미만으로 적어낸 입찰표는 모두 무효 처리가 됩니다.",
    details: "첫 매각 기일에는 감정평가액이 최저매각가격이 됩니다. 만약 아무도 입찰하지 않아 유찰되면, 법원에 따라 다음 기일에 최저매각가격을 보통 20% 또는 30% 낮추어(저감) 다시 경매를 진행합니다."
  }
];

// ==========================================
// Predefined Demo Cases for Rights Analysis
// ==========================================
const DEMO_CASES = [
  {
    id: "case-safe",
    title: "🟢 안전한 국민 아파트 (임차인 대항력 없음)",
    appraisalValue: 500000000,
    minBidPrice: 400000000,
    rights: [
      { id: "r1", type: "근저당", name: "국민은행 (말소기준)", date: "2024-01-10", amount: 250000000 },
      { id: "r2", type: "가압류", name: "신한카드", date: "2024-03-15", amount: 45000000 },
      { id: "r3", type: "임차인전입", name: "홍길동 (임차인)", date: "2024-06-01", amount: 150000000, hasFixedDate: true, fixedDate: "2024-06-01", hasClaimedDividend: true }
    ] as RegisteredRight[]
  },
  {
    id: "case-danger",
    title: "🔴 보증금 인수 위험 빌라 (선순위 대항력 임차인)",
    appraisalValue: 200000000,
    minBidPrice: 140000000,
    rights: [
      { id: "r1", type: "임차인전입", name: "김철수 (임차인)", date: "2023-05-11", amount: 180000000, hasFixedDate: true, fixedDate: "2023-05-11", hasClaimedDividend: false },
      { id: "r2", type: "근저당", name: "신한저축은행", date: "2023-11-20", amount: 50000000 }
    ] as RegisteredRight[]
  },
  {
    id: "case-caution",
    title: "🟡 주의 요망 오피스텔 (선순위 임차인 배당요구)",
    appraisalValue: 300000000,
    minBidPrice: 240000000,
    rights: [
      { id: "r1", type: "임차인전입", name: "이영희 (임차인)", date: "2023-02-16", amount: 200000000, hasFixedDate: true, fixedDate: "2023-02-16", hasClaimedDividend: true },
      { id: "r2", type: "근저당", name: "우리은행", date: "2023-08-10", amount: 120000000 }
    ] as RegisteredRight[]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'bid_sheet' | 'glossary'>('calculator');
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  // ==========================================
  // Chat State
  // ==========================================
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `반갑습니다! ⚖️ **경매이지 AI 멘토**입니다.\n\n부동산 경매가 아직 낯설고 두려우신가요? 등기부 분석부터 가처분, 대항력, 그리고 법정에서 직접 작성해야 하는 '기일입찰표'까지 초보자 맞춤형으로 아주 친절하게 안내해 드리겠습니다.\n\n왼쪽의 **권리분석 시뮬레이터**나 **모의 기일입찰표**를 작성해 보시다가 궁금한 점이 생기면 바로 질문해 주세요! "이 결과분석을 검토해 줘" 버튼을 누르시면 실시간 피드백도 해 드립니다.`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoadingChat) return;

    if (!customText) {
      setInputMessage('');
    }

    const newMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setIsLoadingChat(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newMsg].map(m => ({ role: m.role, content: m.content })),
          systemInstruction: `당신은 부동산 경매 업계에서 20년 경력을 가진 국내 최고의 부동산 경매 전문 변호사이자 수석 컨설턴트 '경매이지 AI 멘토'입니다.
경매를 이제 시작하는 왕초보들이 대상이므로 다음 규칙을 엄격히 준수하여 상담하세요.
1. 쉽고 친절한 용어로 풀어서 설명합니다. 법률 한자어나 경매 은어(예: 명도, 대항력, 인수, 말소기준권리 등)가 나올 때는 언제나 괄호나 한 줄 설명을 덧붙여 주어 이해를 돕습니다.
2. 답변은 마크다운 형식을 사용하여 소제목, 불릿 포인트, 굵은 글씨 등으로 가독성 높게 구성합니다.
3. 무조건 낙찰을 부추기지 말고, '초보자일수록 권리상의 하자(위험 요소)가 없는 안전한 물건부터 시작해야 보증금을 떼이지 않는다'는 안전 중심의 조언을 일관되게 제공합니다.
4. 낙찰가 외에 명도 비용, 세금, 체납 관리비, 수리 비용 등 추가적인 지출이 발생함을 항상 상기시킵니다.
5. 법률 자문은 참고용이며 최종 입찰 결정 전에 대법원 경매정보 사이트, 등기부등본, 매각물건명세서를 철저히 크로스체크하라는 주의사항을 정중하게 안내합니다.`
        })
      });

      if (!response.ok) {
        throw new Error('API 응답에 오류가 발생했습니다.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text,
        timestamp: new Date()
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `죄송합니다. 서버 통신 중 오류가 발생했습니다. (${error.message || '네트워크 상태 확인 요망'})`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Quick prompt questions
  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  // ==========================================
  // Rights Analyzer State & Logic
  // ==========================================
  const [appraisalValue, setAppraisalValue] = useState<number>(300000000);
  const [minBidPrice, setMinBidPrice] = useState<number>(240000000);
  const [rights, setRights] = useState<RegisteredRight[]>([
    { id: "1", type: "근저당", name: "하나은행", date: "2023-04-12", amount: 120000000 },
    { id: "2", type: "임차인전입", name: "김보라 (임차인)", date: "2023-06-15", amount: 150000000, hasFixedDate: true, fixedDate: "2023-06-15", hasClaimedDividend: true }
  ]);

  // Right input fields
  const [newRightType, setNewRightType] = useState<RegisteredRight['type']>('근저당');
  const [newRightName, setNewRightName] = useState('');
  const [newRightDate, setNewRightDate] = useState('');
  const [newRightAmount, setNewRightAmount] = useState<number>(0);
  const [newRightHasFixed, setNewRightHasFixed] = useState(true);
  const [newRightFixedDate, setNewRightFixedDate] = useState('');
  const [newRightHasClaimed, setNewRightHasClaimed] = useState(true);

  // Results State
  const [analysisResult, setAnalysisResult] = useState<{
    status: 'safe' | 'caution' | 'danger';
    malsoGijun: RegisteredRight | null;
    unsafeRights: RegisteredRight[];
    transferredAmount: number;
    points: string[];
  } | null>(null);

  const loadDemoCase = (demo: typeof DEMO_CASES[0]) => {
    setAppraisalValue(demo.appraisalValue);
    setMinBidPrice(demo.minBidPrice);
    setRights(JSON.parse(JSON.stringify(demo.rights))); // Deep clone
    setAnalysisResult(null);
  };

  const addRight = () => {
    if (!newRightName || !newRightDate) {
      alert('권리자명(이름)과 설정일자를 입력해주세요.');
      return;
    }
    const right: RegisteredRight = {
      id: Math.random().toString(),
      type: newRightType,
      name: newRightName,
      date: newRightDate,
      amount: newRightAmount,
      hasFixedDate: newRightType === '임차인전입' ? newRightHasFixed : undefined,
      fixedDate: newRightType === '임차인전입' && newRightHasFixed ? newRightFixedDate : undefined,
      hasClaimedDividend: newRightType === '임차인전입' ? newRightHasClaimed : undefined,
    };

    setRights(prev => [...prev, right].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    // Reset inputs
    setNewRightName('');
    setNewRightDate('');
    setNewRightAmount(0);
    setNewRightFixedDate('');
  };

  const removeRight = (id: string) => {
    setRights(prev => prev.filter(r => r.id !== id));
  };

  const runRightsAnalysis = () => {
    if (rights.length === 0) {
      alert('분석할 등기부 및 권리 내역을 최소 1개 이상 등록해주세요.');
      return;
    }

    // Sort rights by date
    const sortedRights = [...rights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. 말소기준권리 찾기
    // 말소기준권리 대상: 근저당, 압류, 가압류
    // (초보자 교육용으로 전세권 등 특수예외는 제외하여 직관적으로 구성)
    const malsoCandidates = sortedRights.filter(r => r.type === '근저당' || r.type === '가압류' || r.type === '압류');
    const malsoGijun = malsoCandidates.length > 0 ? malsoCandidates[0] : null;

    let status: 'safe' | 'caution' | 'danger' = 'safe';
    const points: string[] = [];
    const unsafeRights: RegisteredRight[] = [];
    let transferredAmount = 0;

    if (!malsoGijun) {
      // 말소기준권리가 없는 경우
      status = 'caution';
      points.push("⚠️ 등기부 상 말소기준권리(저당, 압류 등)가 전혀 존재하지 않습니다. 이 경우 선순위 임차인이나 다른 청구권리가 소멸되지 않고 고스란히 인수될 수 있어 극도로 주의해야 합니다.");
    } else {
      points.push(`📌 **말소기준권리**: **${malsoGijun.name}의 ${malsoGijun.type}** (설정일자: ${malsoGijun.date})`);
      points.push(`ℹ️ 이 날짜(${malsoGijun.date})보다 먼저 설정된 권리는 낙찰자가 인수(인계받아 책임져야 함)하고, 이후의 등기부 상 권리는 낙찰 시 자동으로 소멸합니다.`);
    }

    // 2. 임차인 대항력 및 인수 금액 분석
    const tenants = sortedRights.filter(r => r.type === '임차인전입');
    
    tenants.forEach(tenant => {
      if (!malsoGijun) {
        // 말소기준권리가 없으면 임차인 전입은 모두 주의/위험 대상
        status = 'danger';
        unsafeRights.push(tenant);
        transferredAmount += tenant.amount;
        points.push(`🚨 **대항력 위협**: 말소기준권리가 없어 임차인 [${tenant.name}]의 보증금 ${formatKoreanCurrency(tenant.amount)}이 전액 인수될 위험이 큽니다.`);
        return;
      }

      const tenantDate = new Date(tenant.date);
      const malsoDate = new Date(malsoGijun.date);

      // 전입신고 다음날 오전 0시 효력이므로, 날짜 비교
      if (tenantDate < malsoDate) {
        // 대항력 있음 (선순위 임차인)
        if (!tenant.hasClaimedDividend) {
          // 배당요구 안함 -> 보증금 전액 인수
          status = 'danger';
          unsafeRights.push(tenant);
          transferredAmount += tenant.amount;
          points.push(`🚨 **임차인 보증금 전액 인수 위험**: 대항력이 있는 임차인 [${tenant.name}]이 배당요구를 하지 않았습니다. 낙찰자가 보증금 **${formatKoreanCurrency(tenant.amount)}**을 별도로 지급해야 거주시킬 수 있으며, 이 금액만큼 사실상 실구매가가 증가합니다.`);
        } else {
          // 배당요구 함 -> 배당 재원에서 보증금을 먼저 회수함. 
          // 만약 낙찰금액이 충분치 않아 다 돌려받지 못하면 남은 보증금은 인수됨.
          status = 'caution';
          unsafeRights.push(tenant);
          points.push(`🟡 **대항력 있는 배당 임차인**: 임차인 [${tenant.name}]은 선순위 대항력이 있어 우선 변제받지만, 만약 입찰가(낙찰가)가 보증금 ${formatKoreanCurrency(tenant.amount)}보다 터무니없이 낮아 전액 배당되지 않을 시 **배당되지 못한 잔액은 낙찰자가 인수**해야 합니다. 철저한 시세 파악과 적정 낙찰가 계산이 필수적입니다.`);
        }
      } else {
        // 대항력 없음 (후순위 임차인)
        points.push(`✅ **소멸 대상 임차인**: 임차인 [${tenant.name}]은 말소기준권리보다 전입일이 늦어 대항력이 없습니다. 낙찰 후 보증금 반환 책임은 소멸하므로 권리분석 상 안전합니다. (인도명령 대상자)`);
      }
    });

    // 3. 등기부 상 선순위 권리 분석 (임차인 외)
    if (malsoGijun) {
      const priorRights = sortedRights.filter(r => r.id !== malsoGijun.id && new Date(r.date) < new Date(malsoGijun.date));
      priorRights.forEach(r => {
        if (r.type === '가등기') {
          status = 'danger';
          unsafeRights.push(r);
          points.push(`🚨 **선순위 가등기 발견**: 말소기준권리보다 빠른 가등기 [${r.name}]가 있습니다. 추후 본등기가 실행될 경우 낙찰자는 소유권을 박탈당할 수 있어 절대 입찰하면 안 되는 위험 물건입니다.`);
        }
      });
    }

    // 소멸되는 후순위 권리 요약
    const extinguishableCount = sortedRights.filter(r => {
      if (!malsoGijun) return false;
      if (r.id === malsoGijun.id) return false;
      return new Date(r.date) >= new Date(malsoGijun.date) && r.type !== '임차인전입';
    }).length;

    if (extinguishableCount > 0) {
      points.push(`✅ **소멸권리 확인**: 말소기준권리보다 늦은 후순위 등기 권리 ${extinguishableCount}건은 매각과 동시에 말끔하게 소멸되어 인수되지 않습니다.`);
    }

    // 최종 요약 정리
    if (status === 'safe') {
      points.push("🎉 **안전 진단 결과**: 분석된 등기 내역 상 낙찰자가 별도로 변제하거나 인수해야 하는 부채가 전혀 없습니다. 안심하고 시세 조사와 입찰 가격 설계에 집중하세요!");
    } else if (status === 'caution') {
      points.push("💡 **입찰 가이드**: 임차인이 배당금에서 보증금을 전액 수령할 수 있도록 적절한 입찰가 하한선을 정해야 합니다. 입찰 전 매각물건명세서를 꼭 재확인하세요.");
    } else {
      points.push("🚫 **입찰 위험 경고**: 이 물건은 현 상태로 입찰할 시 예상치 못한 추가 채무 인수나 소유권 상실의 법적 리스크가 동반됩니다. 철저한 보정이 필요합니다.");
    }

    setAnalysisResult({
      status,
      malsoGijun,
      unsafeRights,
      transferredAmount,
      points
    });
  };

  const sendAnalysisToAI = () => {
    if (!analysisResult) return;
    
    let prompt = `[권리분석 결과 검토 요청]\n`;
    prompt += `* 감정가: ${formatKoreanCurrency(appraisalValue)} / 최저입찰가: ${formatKoreanCurrency(minBidPrice)}\n`;
    prompt += `* 등록된 권리 내역:\n`;
    rights.forEach((r, idx) => {
      prompt += `  ${idx + 1}. [${r.type}] ${r.name} (설정일: ${r.date}, 금액: ${formatKoreanCurrency(r.amount)}${r.type === '임차인전입' ? `, 배당요구: ${r.hasClaimedDividend ? 'O' : 'X'}` : ''})\n`;
    });
    prompt += `\n* 현재 시스템 권리분석 결과:\n`;
    prompt += `  - 안전도 등급: ${analysisResult.status === 'safe' ? '안전 🟢' : analysisResult.status === 'caution' ? '주의 🟡' : '위험 🔴'}\n`;
    prompt += `  - 말소기준권리: ${analysisResult.malsoGijun ? `${analysisResult.malsoGijun.name}의 ${analysisResult.malsoGijun.type}` : '없음'}\n`;
    prompt += `  - 낙찰자 인수금액: ${formatKoreanCurrency(analysisResult.transferredAmount)}\n\n`;
    prompt += `이 분석 결과를 바탕으로, 이 물건에 초보자가 입찰할 때 알아야 할 핵심 법률 리스크와 명도(이사 협상) 난이도, 실제 출구 전략을 멘토님의 관점에서 정밀하게 조언해 주세요.`;

    setActiveTab('calculator');
    handleSendMessage(prompt);
  };

  // ==========================================
  // Mock Bid Form State
  // ==========================================
  const [bidCaseNo, setBidCaseNo] = useState('2026 타경 10254');
  const [bidItemNo, setBidItemNo] = useState('1');
  const [bidderName, setBidderName] = useState('홍길동');
  const [bidderPhone, setBidderPhone] = useState('010-1234-5678');
  const [bidderId, setBidderId] = useState('950101-1******');
  const [bidderAddress, setBidderAddress] = useState('서울특별시 서초구 서초대로 123');
  const [bidMinPrice, setBidMinPrice] = useState(250000000);
  const [bidPrice, setBidPrice] = useState(275000000);
  const [bidDeposit, setBidDeposit] = useState(25000000); // Usually 10% of min bid
  const [isDepositChecked, setIsDepositChecked] = useState(true);

  // Automatically recalculate standard 10% deposit
  useEffect(() => {
    if (isDepositChecked) {
      setBidDeposit(Math.floor(bidMinPrice * 0.1));
    }
  }, [bidMinPrice, isDepositChecked]);

  // Bid Warnings
  const getBidWarnings = () => {
    const warnings: string[] = [];
    if (bidPrice < bidMinPrice) {
      warnings.push("❌ 입찰가격이 최저매각가격보다 낮습니다! 법원에서 즉시 무효 처리 및 탈락됩니다.");
    }
    const standardDeposit = Math.floor(bidMinPrice * 0.1);
    if (bidDeposit < standardDeposit) {
      warnings.push(`❌ 보증금이 최저매각가격의 10%(${formatKoreanCurrency(standardDeposit)})보다 적습니다! 보증금 부족은 경매 무효 처리 1순위 사유입니다.`);
    }
    if (bidPrice >= bidMinPrice * 2) {
      warnings.push("⚠️ 입찰가격이 최저가격의 2배 이상입니다. '0'을 하나 더 붙이는 치명적인 오기입(typo)이 아닌지 확인하세요!");
    }
    return warnings;
  };

  const sendBidToAI = () => {
    let prompt = `[모의 기일입찰표 피드백 요청]\n`;
    prompt += `* 사건번호: 법원 경매 ${bidCaseNo} (물건번호: ${bidItemNo})\n`;
    prompt += `* 최저매각가격: ${formatKoreanCurrency(bidMinPrice)}\n`;
    prompt += `* 본인 입찰가격: ${formatKoreanCurrency(bidPrice)} (최저가 대비 약 ${((bidPrice/bidMinPrice)*100).toFixed(1)}%)\n`;
    prompt += `* 입찰보증금액: ${formatKoreanCurrency(bidDeposit)}\n`;
    prompt += `* 입찰자: ${bidderName}\n\n`;
    prompt += `이 모의 입찰서 기재 내용이 올바르게 적혔는지 검증해 주시고, 낙찰 확률을 높이거나 입찰 법정에서 초보자가 당일 반드시 챙겨야 할 필수 체크리스트(준비물, 시간 관리, 수표 준비 요령 등)를 상세하게 설명해 주세요.`;

    handleSendMessage(prompt);
  };

  // ==========================================
  // Glossary Search State
  // ==========================================
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryCategory, setGlossaryCategory] = useState<string>('전체');

  const filteredGlossary = GLOSSARY.filter(item => {
    const matchesSearch = item.term.includes(glossarySearch) || item.definition.includes(glossarySearch) || item.details.includes(glossarySearch);
    const matchesCategory = glossaryCategory === '전체' || item.category === glossaryCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['전체', '권리분석', '임차인 보호', '명도/인도', '경매 절차'];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-md shadow-amber-500/20">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                경매이지 <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">초보 상담소</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">부동산 경매 초심자를 위한 권리분석, 모의 입찰 및 AI 실시간 멘토링 서비스</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                isChatOpen 
                  ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/15' 
                  : 'bg-slate-850 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>AI 멘토 상담 {isChatOpen ? '닫기' : '열기'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: INTERACTIVE TOOLS (8 Columns) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          
          {/* TAB NAVIGATION */}
          <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex gap-1">
            <button
              id="tab-calculator"
              onClick={() => setActiveTab('calculator')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'calculator'
                  ? 'bg-slate-800 text-white shadow-sm border-t border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>권리분석 시뮬레이터</span>
            </button>

            <button
              id="tab-bid-sheet"
              onClick={() => setActiveTab('bid_sheet')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'bid_sheet'
                  ? 'bg-slate-800 text-white shadow-sm border-t border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>모의 기일입찰표 작성</span>
            </button>

            <button
              id="tab-glossary"
              onClick={() => setActiveTab('glossary')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'glossary'
                  ? 'bg-slate-800 text-white shadow-sm border-t border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>경매 필수 용어사전</span>
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl overflow-y-auto max-h-[calc(100vh-230px)]">
            
            {/* 1. CALCULATOR (RIGHTS ANALYZER) */}
            {activeTab === 'calculator' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-amber-400" />
                    권리분석 시뮬레이터
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    인수되는 선순위 권리나 대항력 있는 임차인의 보증금이 있는지 가상으로 입력해보고 위험도를 자동 계산합니다.
                  </p>
                </div>

                {/* Demo Presets */}
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    초보자 추천 학습용 예제 물건 로드
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {DEMO_CASES.map((demo) => (
                      <button
                        key={demo.id}
                        onClick={() => loadDemoCase(demo)}
                        className="p-3 bg-slate-950 hover:bg-slate-800 rounded-lg text-left text-xs border border-slate-800 hover:border-slate-700 transition-all group flex flex-col gap-1 justify-between"
                      >
                        <span className="font-semibold text-slate-200 group-hover:text-white">{demo.title}</span>
                        <span className="text-[10px] text-slate-500">최저가: {formatKoreanCurrency(demo.minBidPrice)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Basic Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">물건 감정평가액 (원)</label>
                    <input
                      type="number"
                      value={appraisalValue}
                      onChange={(e) => setAppraisalValue(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <span className="text-xs text-slate-500 block text-right">
                      {formatKoreanCurrency(appraisalValue)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">최저매각가격 (원)</label>
                    <input
                      type="number"
                      value={minBidPrice}
                      onChange={(e) => setMinBidPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <span className="text-xs text-slate-500 block text-right">
                      {formatKoreanCurrency(minBidPrice)}
                    </span>
                  </div>
                </div>

                {/* Rights Registry Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      등기부 현황 및 대항력 등록 목록
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">설정 일자 순 정렬됨</span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-3">순위/유형</th>
                          <th className="p-3">권리자 명</th>
                          <th className="p-3">설정 일자</th>
                          <th className="p-3">금액 / 보증금</th>
                          <th className="p-3">임차정보</th>
                          <th className="p-3 text-center">삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-medium">
                        {rights.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500">
                              등록된 등기부 권리 내역이 없습니다. 아래 폼에서 권리를 등록해 주세요.
                            </td>
                          </tr>
                        ) : (
                          rights.map((item, index) => (
                            <tr key={item.id} className="hover:bg-slate-850 transition-colors">
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  item.type === '근저당' || item.type === '가압류' || item.type === '압류'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25'
                                    : item.type === '임차인전입'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {index + 1}. {item.type}
                                </span>
                              </td>
                              <td className="p-3 text-slate-200 font-semibold">{item.name}</td>
                              <td className="p-3 text-slate-400 font-mono">{item.date}</td>
                              <td className="p-3 text-slate-200 font-mono">{formatKoreanCurrency(item.amount)}</td>
                              <td className="p-3">
                                {item.type === '임차인전입' ? (
                                  <div className="text-[10px] space-y-0.5 text-slate-400">
                                    <div className="flex items-center gap-1">
                                      <span>확정일자:</span>
                                      <span className="text-slate-300">{item.hasFixedDate ? item.fixedDate : '없음'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>배당요구:</span>
                                      <span className={item.hasClaimedDividend ? 'text-green-400' : 'text-red-400'}>
                                        {item.hasClaimedDividend ? '제출(O)' : '미제출(X)'}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => removeRight(item.id)}
                                  className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-md transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add Right Form */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                  <span className="text-xs font-bold text-slate-300 block">➕ 권리/임차인 정보 직접 등록</span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">권리 종류</label>
                      <select
                        value={newRightType}
                        onChange={(e) => setNewRightType(e.target.value as RegisteredRight['type'])}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      >
                        <option value="근저당">근저당 (대출 Mortgage)</option>
                        <option value="가압류">가압류 (Provisional Seizure)</option>
                        <option value="압류">압류 (Seizure)</option>
                        <option value="임차인전입">임차인 전입신고</option>
                        <option value="가등기">가등기 (Provisional Register)</option>
                        <option value="전세권">전세권 (Jeonse Right)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">권리자 명 / 이름</label>
                      <input
                        type="text"
                        placeholder="예: 국민은행, 김임차"
                        value={newRightName}
                        onChange={(e) => setNewRightName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">설정일 / 전입일</label>
                      <input
                        type="date"
                        value={newRightDate}
                        onChange={(e) => setNewRightDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">채권금액 / 보증금 (원)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newRightAmount || ''}
                        onChange={(e) => setNewRightAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Tenant Special Fields */}
                  {newRightType === '임차인전입' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] text-purple-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          확정일자 여부
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="radio"
                              checked={newRightHasFixed}
                              onChange={() => setNewRightHasFixed(true)}
                              className="accent-amber-500"
                            />
                            있음
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="radio"
                              checked={!newRightHasFixed}
                              onChange={() => setNewRightHasFixed(false)}
                              className="accent-amber-500"
                            />
                            없음
                          </label>
                        </div>
                        {newRightHasFixed && (
                          <input
                            type="date"
                            value={newRightFixedDate}
                            onChange={(e) => setNewRightFixedDate(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white mt-1"
                          />
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] text-purple-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          배당요구 신청 여부
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="radio"
                              checked={newRightHasClaimed}
                              onChange={() => setNewRightHasClaimed(true)}
                              className="accent-amber-500"
                            />
                            배당요구 함 (O)
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="radio"
                              checked={!newRightHasClaimed}
                              onChange={() => setNewRightHasClaimed(false)}
                              className="accent-amber-500"
                            />
                            배당요구 안함 (X)
                          </label>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          대항력 있는 임차인이 배당요구를 하지 않으면, 보증금 전액을 낙찰자가 별도로 인수하여 돌려줘야 합니다.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={addRight}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      목록에 추가
                    </button>
                  </div>
                </div>

                {/* Analysis Action Button */}
                <button
                  onClick={runRightsAnalysis}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 py-3.5 px-4 rounded-xl font-bold hover:from-amber-400 hover:to-amber-500 transition-all shadow-md shadow-amber-500/10 flex items-center justify-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  <span>실시간 권리분석 실행</span>
                </button>

                {/* Analysis Results Display */}
                {analysisResult && (
                  <div className={`p-5 rounded-2xl border transition-all ${
                    analysisResult.status === 'safe'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : analysisResult.status === 'caution'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-red-950/20 border-red-500/30'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl ${
                        analysisResult.status === 'safe'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : analysisResult.status === 'caution'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {analysisResult.status === 'safe' && <CheckCircle2 className="w-6 h-6" />}
                        {analysisResult.status === 'caution' && <Info className="w-6 h-6" />}
                        {analysisResult.status === 'danger' && <AlertTriangle className="w-6 h-6" />}
                      </div>

                      <div className="space-y-3 flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-base font-bold text-white flex items-center gap-2">
                              분석 등급 :{' '}
                              <span className={
                                analysisResult.status === 'safe' ? 'text-emerald-400' :
                                analysisResult.status === 'caution' ? 'text-amber-400' : 'text-red-400'
                              }>
                                {analysisResult.status === 'safe' ? '권리분석 안전 🟢' :
                                 analysisResult.status === 'caution' ? '주의 요망 🟡' : '위험 등급 🔴'}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400">말소기준권리와 대항력 비교 결과</p>
                          </div>
                          
                          {analysisResult.transferredAmount > 0 && (
                            <div className="bg-red-500/15 border border-red-500/25 px-3 py-1.5 rounded-lg text-right">
                              <span className="text-[10px] text-red-300 block">인수 예상 채무액</span>
                              <span className="text-xs font-bold text-red-400 font-mono">{formatKoreanCurrency(analysisResult.transferredAmount)}</span>
                            </div>
                          )}
                        </div>

                        {/* Analysis Points */}
                        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs text-slate-300 leading-relaxed">
                          {analysisResult.points.map((pt, idx) => {
                            // Formatting inline bold markers
                            const formatted = pt.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            return (
                              <p 
                                key={idx} 
                                className="flex items-start gap-1.5"
                                dangerouslySetInnerHTML={{ __html: `• ${formatted}` }}
                              />
                            );
                          })}
                        </div>

                        {/* Integration Action */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-850">
                          <span className="text-xs text-slate-400">
                            이 권리 관계를 바탕으로 입찰가 산정 멘토링이 필요하신가요?
                          </span>
                          <button
                            onClick={sendAnalysisToAI}
                            className="flex items-center gap-1 bg-amber-500 text-slate-950 font-bold text-xs px-3.5 py-2.5 rounded-lg hover:bg-amber-400 transition-all shadow-md"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>AI 멘토 정밀 상담하기</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. MOCK BID SHEET */}
            {activeTab === 'bid_sheet' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    모의 기일입찰표 작성기
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    법정에서 실제 제출하는 입찰표를 작성해보고, 0을 더 붙이는 등의 치명적인 실수를 자가 진단합니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Inputs */}
                  <div className="space-y-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3.5">
                      <span className="text-xs font-bold text-amber-400 block border-b border-slate-800 pb-1.5">🏢 경매 물건 및 인적 정보</span>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">사건 번호</label>
                          <input
                            type="text"
                            placeholder="예: 2026 타경 12345"
                            value={bidCaseNo}
                            onChange={(e) => setBidCaseNo(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">물건 번호</label>
                          <input
                            type="text"
                            value={bidItemNo}
                            onChange={(e) => setBidItemNo(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">입찰자 성명</label>
                          <input
                            type="text"
                            value={bidderName}
                            onChange={(e) => setBidderName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400">연락처</label>
                          <input
                            type="text"
                            value={bidderPhone}
                            onChange={(e) => setBidderPhone(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">주민등록번호</label>
                        <input
                          type="text"
                          value={bidderId}
                          onChange={(e) => setBidderId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">송달 주소</label>
                        <input
                          type="text"
                          value={bidderAddress}
                          onChange={(e) => setBidderAddress(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3.5">
                      <span className="text-xs font-bold text-amber-400 block border-b border-slate-800 pb-1.5">💰 입찰가 및 보증금 입력</span>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] text-slate-400">법원 최저매각가격 (원)</label>
                          <span className="text-[10px] text-slate-500">이 금액 이상 적어야 유효</span>
                        </div>
                        <input
                          type="number"
                          value={bidMinPrice}
                          onChange={(e) => setBidMinPrice(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                        />
                        <span className="text-xs text-slate-500 block text-right font-semibold">
                          {formatKoreanCurrency(bidMinPrice)}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] text-slate-400">나의 입찰 가격 (원)</label>
                          <span className="text-[10px] text-amber-500 font-semibold font-mono">실제 쓸 금액</span>
                        </div>
                        <input
                          type="number"
                          value={bidPrice}
                          onChange={(e) => setBidPrice(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:border-amber-500"
                        />
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-amber-400 font-medium">{convertNumberToKoreanLetters(bidPrice)}</span>
                          <span className="text-slate-400">{formatKoreanCurrency(bidPrice)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] text-slate-400">입찰보증금 (원)</label>
                          <label className="flex items-center gap-1 text-[11px] text-slate-400 select-none">
                            <input
                              type="checkbox"
                              checked={isDepositChecked}
                              onChange={(e) => setIsDepositChecked(e.target.checked)}
                              className="accent-amber-500 rounded"
                            />
                            최저가 10% 자동 계산
                          </label>
                        </div>
                        <input
                          type="number"
                          value={bidDeposit}
                          disabled={isDepositChecked}
                          onChange={(e) => setBidDeposit(Number(e.target.value))}
                          className="w-full bg-slate-950 disabled:bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                        />
                        <span className="text-xs text-slate-500 block text-right">
                          {formatKoreanCurrency(bidDeposit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Document Preview & Instructions */}
                  <div className="flex flex-col gap-4">
                    {/* Real-time Validation Warnings */}
                    {getBidWarnings().length > 0 && (
                      <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-1.5">
                        <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          기일입찰표 무효화/주의 경고
                        </span>
                        {getBidWarnings().map((warn, i) => (
                          <p key={i} className="text-[11px] text-slate-300 leading-normal">• {warn}</p>
                        ))}
                      </div>
                    )}

                    {/* Paper Preview */}
                    <div className="flex-1 bg-amber-50/5 text-amber-100 border border-amber-900/40 p-4 rounded-xl font-serif space-y-3 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-amber-900/10 border-l border-b border-amber-900/20 px-2 py-1 text-[8px] text-amber-500 font-sans tracking-widest uppercase select-none">
                        MOCK DOCUMENT
                      </div>

                      <div className="text-center border-b border-amber-950/20 pb-3">
                        <h3 className="text-sm font-bold tracking-widest text-white">기 일 입 찰 표</h3>
                        <p className="text-[10px] text-amber-500 font-sans mt-0.5">서부지방법원 매각기일 입찰 전용</p>
                      </div>

                      <div className="text-[11px] grid grid-cols-12 gap-1.5 border border-amber-950/25 p-2 bg-amber-50/[0.02]">
                        <div className="col-span-4 border-r border-amber-950/20 pr-1.5 py-0.5">
                          <span className="text-amber-500 block text-[9px]">사건번호</span>
                          <span className="font-bold font-mono text-white text-xs">{bidCaseNo || '미기재'}</span>
                        </div>
                        <div className="col-span-3 border-r border-amber-950/20 px-1.5 py-0.5">
                          <span className="text-amber-500 block text-[9px]">물건번호</span>
                          <span className="font-bold font-mono text-white text-xs">{bidItemNo || '1'}</span>
                        </div>
                        <div className="col-span-5 px-1.5 py-0.5">
                          <span className="text-amber-500 block text-[9px]">입찰자 성명</span>
                          <span className="font-bold text-white text-xs">{bidderName || '미기재'} <span className="text-[8px] text-amber-500 font-sans">(인) ⭕</span></span>
                        </div>
                      </div>

                      <div className="text-[11px] border border-amber-950/25 p-2 space-y-1.5">
                        <div>
                          <span className="text-amber-500 text-[9px] block">입찰가격 (원)</span>
                          <div className="bg-slate-900/40 border border-amber-950/20 p-1.5 rounded text-center text-xs font-mono font-bold text-amber-300">
                            {bidPrice ? `${bidPrice.toLocaleString()} 원` : '금액 미입력'}
                          </div>
                          <span className="text-[9px] text-amber-400 block mt-1 font-sans text-right">
                            한글 표기: {convertNumberToKoreanLetters(bidPrice)}
                          </span>
                        </div>

                        <div>
                          <span className="text-amber-500 text-[9px] block">보증금액 (원)</span>
                          <div className="bg-slate-900/40 border border-amber-950/20 p-1.5 rounded text-center text-xs font-mono font-bold text-amber-300">
                            {bidDeposit ? `${bidDeposit.toLocaleString()} 원` : '금액 미입력'}
                          </div>
                        </div>
                      </div>

                      <div className="text-[9px] text-slate-400 space-y-1 font-sans leading-relaxed">
                        <p className="font-semibold text-amber-400 flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          기일입찰표 초보자 자가 검수 요령
                        </p>
                        <p>1. **입찰가격은 절대 지우거나 수정액으로 고쳐 쓰지 마세요.** 금액 기재 중 실수가 발생하면 반드시 새 봉투와 입찰표에 다시 기재하여 제출해야 합니다.</p>
                        <p>2. 이름 옆의 **(인)** 란에는 본인의 도장 또는 서명(날인)을 꼭 남기셔야 인정됩니다.</p>
                        <p>3. 입찰보증금은 주로 **법원 입구 내 신한은행 등에서 미리 1장의 수표**로 끊어 준비하여 보증금 봉투에 넣는 것이 실수를 대폭 예방하는 비결입니다.</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={sendBidToAI}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>이 입찰 가격으로 AI 컨설팅 받기</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. GLOSSARY */}
            {activeTab === 'glossary' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-amber-400" />
                      부동산 경매 핵심 용어사전
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      부동산 경매 법원 서류에 빈번히 나타나는 필수 용어를 초보자의 눈높이로 해설합니다.
                    </p>
                  </div>

                  {/* Search bar */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="용어 또는 키워드 검색..."
                      value={glossarySearch}
                      onChange={(e) => setGlossarySearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Category filters */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-4">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setGlossaryCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        glossaryCategory === cat
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Term Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredGlossary.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2.5 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-white">{item.term}</span>
                          <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {item.definition}
                        </p>
                        <p className="text-[11px] text-slate-400 leading-normal bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
                          {item.details}
                        </p>
                      </div>

                      <button
                        onClick={() => handleQuickQuestion(`[용어 사전] '${item.term}'에 대해 더 자세한 예시와 판례, 실제 실무에서 적용할 때 초보자가 유의할 점을 알기 쉽게 설명해주세요.`)}
                        className="text-[10px] text-amber-400 font-bold hover:text-amber-300 flex items-center gap-0.5 mt-2 transition-colors self-end"
                      >
                        <span>이 용어 AI 멘토에게 질문하기</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {filteredGlossary.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
                      검색어에 매칭되는 경매 용어가 없습니다. 검색창에 다른 단어를 입력해 보세요.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: AI MENTOR CHAT (4 or 5 Columns) */}
        {isChatOpen && (
          <div className="lg:col-span-5 xl:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl h-[calc(100vh-120px)] lg:h-[calc(100vh-130px)]">
            
            {/* CHAT HEADER */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    경매이지 AI 멘토
                  </h3>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-sans">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    상담 가능 (Gemini 3.5 Flash)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMessages([
                  {
                    role: 'assistant',
                    content: `반갑습니다! ⚖️ **경매이지 AI 멘토**입니다.\n\n부동산 경매가 아직 낯설고 두려우신가요? 등기부 분석부터 가처분, 대항력, 그리고 법정에서 직접 작성해야 하는 '기일입찰표'까지 초보자 맞춤형으로 아주 친절하게 안내해 드리겠습니다.\n\n왼쪽의 **권리분석 시뮬레이터**나 **모의 기일입찰표**를 작성해 보시다가 궁금한 점이 생기면 바로 질문해 주세요! "이 결과분석을 검토해 줘" 버튼을 누르시면 실시간 피드백도 해 드립니다.`,
                    timestamp: new Date()
                  }
                ])}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="대화 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* CHAT MSG LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center text-xs shrink-0 font-serif">
                      이지
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'bg-slate-900 text-slate-200 border border-slate-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoadingChat && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center text-xs shrink-0 font-serif">
                    이지
                  </div>
                  <div className="bg-slate-900 text-slate-400 rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 border border-slate-800">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
                    <span>경매 멘토가 생각 중입니다...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* QUICK SUGGESTIONS CHIPS */}
            <div className="px-4 py-2 border-t border-slate-850 bg-slate-900/40 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none">
              <button
                onClick={() => handleQuickQuestion('대항력 있는 임차인이 있는 물건은 무조건 입찰하면 안 되나요?')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-full text-[10px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                대항력 임차인 입찰 팁 💡
              </button>
              <button
                onClick={() => handleQuickQuestion('기일입찰표를 작성할 때 초보자가 가장 흔히 범하는 실수가 뭔가요?')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-full text-[10px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                입찰표 단골 실수 ✍️
              </button>
              <button
                onClick={() => handleQuickQuestion('명도(점유자 이사 유도)를 원만하게 끝내는 대화 비결이 있나요?')}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-full text-[10px] font-medium text-slate-300 hover:text-white transition-colors"
              >
                쉬운 명도 대화 비결 💬
              </button>
            </div>

            {/* CHAT INPUT FORM */}
            <div className="p-3 bg-slate-900 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="경매에 대해 물어보세요..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isLoadingChat}
                  className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold hover:bg-amber-400 transition-colors shrink-0 disabled:bg-slate-800 disabled:text-slate-500 shadow-md shadow-amber-500/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
